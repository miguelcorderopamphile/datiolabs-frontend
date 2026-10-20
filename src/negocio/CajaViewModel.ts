import {
    api,
    CAP_CUENTA_ABIERTA,
    CAP_PESABLE,
    CAP_SERIE,
    CAP_VARIANTES,
    CuentaAbierta,
    PagoTicket,
    ProductoInfo,
    ResolucionVuelto,
    Ticket,
} from './api';
import { NegocioModel } from './NegocioModel';

interface LineaCarrito {
    sku: string;
    nombre: string;
    precioUsd: number;
    cantidad: number;
    pesable: boolean;
    conSerie: boolean;
    conVariantes: boolean;
    serie?: string;
    variante?: string;
    modoVenta: string;
}

export class CajaViewModel {
    private modelo: NegocioModel;
    private productos: ProductoInfo[] = [];
    private carrito: LineaCarrito[] = [];
    private busqueda = '';
    private cuentaSeleccionada: CuentaAbierta | null = null;
    private cuentas: CuentaAbierta[] = [];
    private oyentes: (() => void)[] = [];

    constructor(modelo: NegocioModel) {
        this.modelo = modelo;
    }

    suscribir(fn: () => void): () => void {
        this.oyentes.push(fn);
        fn();
        return () => this.desuscribir(fn);
    }

    desuscribir(fn: () => void): void {
        this.oyentes = this.oyentes.filter((f) => f !== fn);
    }

    private notificar(): void {
        this.oyentes.forEach((f) => f());
    }

    async cargar(): Promise<void> {
        this.productos = await api.productos();
        if (this.modelo.tieneCapacidad(CAP_CUENTA_ABIERTA)) {
            this.cuentas = await api.cuentas();
        }
        this.notificar();
    }

    private paginaProd: number = 1;
    readonly POR_PAGINA_PROD: number = 24;

    get paginaActual(): number {
        return this.paginaProd;
    }

    get totalPaginas(): number {
        return Math.max(1, Math.ceil(this.productosFiltrados.length / this.POR_PAGINA_PROD));
    }

    get totalProductosFiltrados(): number {
        return this.productosFiltrados.length;
    }

    private get productosFiltrados(): ProductoInfo[] {
        const q = this.busqueda.trim().toLowerCase();
        if (!q) return this.productos;
        return this.productos.filter((p) => p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }

    get visibles(): ProductoInfo[] {
        const filtrados = this.productosFiltrados;
        const totalPag = this.totalPaginas;
        if (this.paginaProd > totalPag) this.paginaProd = totalPag;
        if (this.paginaProd < 1) this.paginaProd = 1;
        const inicio = (this.paginaProd - 1) * this.POR_PAGINA_PROD;
        return filtrados.slice(inicio, inicio + this.POR_PAGINA_PROD);
    }

    paginaSiguiente(): void {
        if (this.paginaProd < this.totalPaginas) {
            this.paginaProd++;
            this.notificar();
        }
    }

    paginaAnterior(): void {
        if (this.paginaProd > 1) {
            this.paginaProd--;
            this.notificar();
        }
    }

    irAPagina(p: number): void {
        this.paginaProd = Math.max(1, Math.min(p, this.totalPaginas));
        this.notificar();
    }

    setBusqueda(q: string): void {
        this.busqueda = q;
        this.paginaProd = 1;
        this.notificar();
    }

    get lineasCarrito(): LineaCarrito[] {
        return this.carrito;
    }

    get tasaTicket(): number {
        return this.tasaBloqueadaTicket ?? this.modelo.tasaActual;
    }

    private tasaBloqueadaTicket: number | null = null;

    get totalUsd(): number {
        return this.carrito.reduce((acc, l) => acc + l.precioUsd * l.cantidad, 0);
    }

    get totalBs(): number {
        return this.totalUsd * this.tasaTicket;
    }

    get cuentasAbiertasListado(): CuentaAbierta[] {
        return this.cuentas;
    }

    get cuentaActiva(): CuentaAbierta | null {
        return this.cuentaSeleccionada;
    }

    get modoCuentaAbierta(): boolean {
        return this.cuentaSeleccionada !== null;
    }

    seleccionarCuenta(c: CuentaAbierta | null): void {
        this.cuentaSeleccionada = c;
        this.notificar();
    }

    async agregar(sku: string, modoVenta: string = 'unidad'): Promise<string | null> {
        const p = this.productos.find((x) => x.sku === sku);
        if (!p) return 'Producto no encontrado';
        return this.empujar(p, undefined, undefined, modoVenta);
    }

    empujar(p: ProductoInfo, serie?: string, variante?: string, modoVenta: string = 'unidad'): string | null {
        const pres = modoVenta && modoVenta !== 'unidad' && p.presentaciones
            ? p.presentaciones.find((x) => x.nombre.toLowerCase() === modoVenta.toLowerCase())
            : undefined;

        const esPaquete = !pres && modoVenta === 'paquete' && (p.precioPaqueteUsd || (p.esCaja && p.unidadesPorCaja && p.unidadesPorCaja > 1));
        const unidadesMultiples = pres
            ? pres.unidades
            : (esPaquete ? (p.unidadesPorCaja || 1) : 1);

        const precioEfectivo = pres
            ? Number(pres.precioUsd)
            : (esPaquete
                ? (p.precioPaqueteUsd ? Number(p.precioPaqueteUsd) : Number(p.precioUsd) * unidadesMultiples)
                : Number(p.precioUsd));

        const pesable = !pres && !esPaquete && ((p.capacidades & CAP_PESABLE) !== 0 || p.unidad === 'kg' || p.unidad === 'ml');
        const paso = pesable ? 0.25 : 1;
        const existente = this.carrito.find((l) => l.sku === p.sku && l.serie === serie && l.variante === variante && l.modoVenta === modoVenta);
        const cantActual = existente ? existente.cantidad : 0;
        const cantDeseada = cantActual + paso;

        // Validación de stock acumulado para este SKU en el carrito
        if (!p.sinStock) {
            const stockDisponible = Number(p.stock);
            // Sumar lo que ya tienen otras líneas de este mismo SKU en el carrito
            let otrasUnidades = 0;
            for (const l of this.carrito) {
                if (l.sku === p.sku && !(l.serie === serie && l.variante === variante && l.modoVenta === modoVenta)) {
                    otrasUnidades += l.cantidad * this.obtenerFactorPresentacion(p, l.modoVenta);
                }
            }
            const totalRequerido = otrasUnidades + (cantDeseada * unidadesMultiples);
            if (stockDisponible < totalRequerido) {
                return `Stock insuficiente para ${p.nombre}. Disponible: ${stockDisponible}, Solicitado: ${totalRequerido}`;
            }
        }

        if (this.tasaBloqueadaTicket === null) {
            this.tasaBloqueadaTicket = this.modelo.tasaActual;
        }

        if (existente) {
            existente.cantidad = pesable ? Math.round(cantDeseada * 1000) / 1000 : Math.round(cantDeseada);
        } else {
            this.carrito.push({
                sku: p.sku,
                nombre: p.nombre,
                precioUsd: precioEfectivo,
                cantidad: pesable ? paso : Math.round(paso),
                pesable,
                conSerie: (p.capacidades & CAP_SERIE) !== 0,
                conVariantes: (p.capacidades & CAP_VARIANTES) !== 0,
                serie,
                variante,
                modoVenta,
            });
        }
        this.notificar();
        return null;
    }

    asignarSerie(sku: string, serie: string): void {
        const linea = this.carrito.find((l) => l.sku === sku);
        if (linea) {
            linea.serie = serie.trim().toUpperCase();
            this.notificar();
        }
    }

    asignarVariante(sku: string, variante: string): void {
        const linea = this.carrito.find((l) => l.sku === sku);
        if (linea) {
            linea.variante = variante.trim();
            this.notificar();
        }
    }

    private obtenerFactorPresentacion(prod: ProductoInfo | undefined, modoVenta: string): number {
        if (!prod) return 1;
        if (modoVenta && modoVenta !== 'unidad' && prod.presentaciones) {
            const pres = prod.presentaciones.find((x) => x.nombre.toLowerCase() === modoVenta.toLowerCase());
            if (pres) return pres.unidades;
        }
        if (modoVenta === 'paquete' && prod.esCaja && prod.unidadesPorCaja) {
            return prod.unidadesPorCaja;
        }
        return 1;
    }

    cambiarCantidad(sku: string, valor: number, modoVenta?: string): string | null {
        const linea = this.carrito.find((l) => l.sku === sku && (modoVenta === undefined || l.modoVenta === modoVenta));
        if (!linea) return null;
        const prod = this.productos.find((p) => p.sku === sku);
        
        let limpia = Math.max(0, valor);
        if (!linea.pesable) {
            limpia = Math.round(limpia);
        } else {
            limpia = Math.round(limpia * 1000) / 1000;
        }

        const factor = this.obtenerFactorPresentacion(prod, linea.modoVenta);
        if (prod && !prod.sinStock && limpia > linea.cantidad) {
            let otrasUnidades = 0;
            for (const l of this.carrito) {
                if (l.sku === sku && l !== linea) {
                    otrasUnidades += l.cantidad * this.obtenerFactorPresentacion(prod, l.modoVenta);
                }
            }
            const totalRequerido = otrasUnidades + (limpia * factor);
            if (totalRequerido > Number(prod.stock)) {
                return `Stock insuficiente para ${linea.nombre}. Disponible: ${prod.stock} un., Solicitado: ${totalRequerido} un.`;
            }
        }

        linea.cantidad = limpia;
        if (linea.cantidad === 0) this.quitar(sku, linea.modoVenta);
        else this.notificar();
        return null;
    }

    quitar(sku: string, modoVenta?: string): void {
        this.carrito = this.carrito.filter((l) => !(l.sku === sku && (modoVenta === undefined || l.modoVenta === modoVenta)));
        if (this.carrito.length === 0) this.tasaBloqueadaTicket = null;
        this.notificar();
    }

    vaciar(): void {
        this.carrito = [];
        this.tasaBloqueadaTicket = null;
        this.notificar();
    }

    async cobrar(recibidoBs: string, pagos?: PagoTicket[], resolucionVuelto?: ResolucionVuelto, tasaCobro?: number): Promise<Ticket> {
        if (this.modoCuentaAbierta && this.cuentaSeleccionada) {
            throw new Error('Hay una cuenta abierta seleccionada. Usa su boton de cobro.');
        }
        if (this.carrito.length === 0) throw new Error('Carrito vacio');
        
        // Verificación previa de existencias acumulada por SKU
        const consumoPorSku = new Map<string, number>();
        for (const l of this.carrito) {
            const p = this.productos.find((x) => x.sku === l.sku);
            const factor = this.obtenerFactorPresentacion(p, l.modoVenta);
            const actual = consumoPorSku.get(l.sku) || 0;
            consumoPorSku.set(l.sku, actual + (l.cantidad * factor));
        }

        for (const [sku, req] of consumoPorSku.entries()) {
            const p = this.productos.find((x) => x.sku === sku);
            if (p && !p.sinStock && req > Number(p.stock)) {
                throw new Error(`Stock insuficiente para ${p.nombre}. Disponible: ${p.stock} un., En carrito: ${req} un.`);
            }
        }

        const ticket = await api.registrarVenta(
            this.carrito.map((l) => ({ sku: l.sku, cantidad: String(l.cantidad), modo_venta: l.modoVenta })),
            recibidoBs || '0',
            pagos,
            resolucionVuelto,
            `sale-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            tasaCobro && tasaCobro > 0 ? tasaCobro.toFixed(2) : undefined,
        );
        this.vaciar();
        await this.refrescarInventario();
        return ticket;
    }

    async crearCuenta(etiqueta: string): Promise<void> {
        const c = await api.abrirCuenta(etiqueta);
        if (!this.cuentas.some((x) => x.ventaId === c.ventaId)) {
            this.cuentas.push(c);
        }
        this.cuentaSeleccionada = c;
        this.notificar();
    }

    async agregarACuenta(sku: string, modoVenta: string = 'unidad'): Promise<string | null> {
        if (!this.cuentaSeleccionada) return 'Selecciona una cuenta primero';
        const p = this.productos.find((x) => x.sku === sku);
        if (!p) return 'Producto no encontrado';
        const actualizada = await api.agregarConsumo(
            this.cuentaSeleccionada.ventaId,
            p.sku,
            '1',
            modoVenta,
        );
        this.cuentaSeleccionada = actualizada;
        this.cuentas = this.cuentas.map((c) => (c.ventaId === actualizada.ventaId ? actualizada : c));
        await this.refrescarInventario();
        return null;
    }

    async cerrarCuentaActual(recibidoBs: string, pagos?: PagoTicket[]): Promise<Ticket> {
        if (!this.cuentaSeleccionada) throw new Error('Ninguna cuenta seleccionada');
        const ticket = await api.cerrarCuenta(this.cuentaSeleccionada.ventaId, recibidoBs || '0', undefined, pagos);
        this.cuentas = this.cuentas.filter((c) => c.ventaId !== ticket.ventaId);
        this.cuentaSeleccionada = null;
        await this.refrescarInventario();
        return ticket;
    }

    private async refrescarInventario(): Promise<void> {
        this.productos = await api.productos();
        this.notificar();
    }
}
