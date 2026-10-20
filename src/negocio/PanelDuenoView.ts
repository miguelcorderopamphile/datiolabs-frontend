import { api, Categoria, CategoriaDineroBruto, JornadaLaboral, MonedaMetodo, PanelDatos, ProductoInfo, RespaldoInfo, Ticket } from './api';
import { formatDateVet, formatFechaHoraVet } from './dateUtils';
import { confirmarAccion, confirmarArqueoCierreJornada, pedirValor } from './dialogs';
import { cerrarJornadaGuiada } from './historialTurno';
import { NegocioModel } from './NegocioModel';

export const parseNum = (n: unknown): number => {
    if (typeof n === 'number') return Number.isFinite(n) ? n : 0;
    if (n === null || n === undefined) return 0;
    let s = String(n).trim();
    if (!s) return 0;
    if (s.includes(',') && !s.includes('.')) {
        s = s.replace(',', '.');
    } else if (s.includes('.') && s.includes(',')) {
        s = s.replace(/\./g, '').replace(',', '.');
    }
    const val = parseFloat(s);
    return Number.isFinite(val) && !isNaN(val) ? val : 0;
};

const fmt = (n: number | string | undefined | null): string => {
    const num = parseNum(n);
    const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
    return rounded.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtCompactoBs = (n: number | string | undefined | null): string => {
    const num = parseNum(n);
    if (num >= 1_000_000_000) {
        return (num / 1_000_000_000).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Mil Millones';
    }
    if (num >= 1_000_000) {
        return (num / 1_000_000).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Millones';
    }
    return fmt(num);
};

export class PanelViewModel {
    private datos: PanelDatos | null = null;

    setDatos(d: PanelDatos): void {
        this.datos = d;
    }

    get panel(): PanelDatos | null {
        return this.datos;
    }
}

export class PanelDuenoView {
    private contenedor: HTMLElement;
    private vm: PanelViewModel;
    private modelo: NegocioModel;
    private criterioGrafica: 'volumen' | 'ingreso' = 'volumen';
    private respaldos: RespaldoInfo[] = [];
    private transacciones: Ticket[] = [];
    private productos: ProductoInfo[] = [];
    private categorias: Categoria[] = [];
    private rangoDetalleFechas: string = '';
    private jornadaActual: JornadaLaboral | null = null;
    private readonly POR_PAGINA_TRX = 20;
    private paginaTrx: number = 1;
    private readonly POR_PAGINA_RESPALDOS = 6;
    private paginaRespaldos: number = 1;
    private margenBrutoPct: number = 0;
    private margenNetoPct: number = 0;

    constructor(
        contenedor: HTMLElement,
        _modal: HTMLElement,
        vm: PanelViewModel,
        modelo: NegocioModel,
    ) {
        this.contenedor = contenedor;
        this.vm = vm;
        this.modelo = modelo;
    }

    private calcularDineroPorCategoria(): CategoriaDineroBruto[] {
        const tasaActual = this.modelo.tasaActual;
        let totalGeneralBrutoUsd = 0;
        const mapa: Record<string, {
            categoriaId: string;
            nombre: string;
            cantidadProductos: number;
            unidadesStock: number;
            brutoUsd: number;
            ventaUsd: number;
        }> = {};

        this.categorias.forEach((c) => {
            mapa[c.id] = {
                categoriaId: c.id,
                nombre: c.nombre,
                cantidadProductos: 0,
                unidadesStock: 0,
                brutoUsd: 0,
                ventaUsd: 0,
            };
        });
        if (!mapa['cat-general']) {
            mapa['cat-general'] = {
                categoriaId: 'cat-general',
                nombre: 'General',
                cantidadProductos: 0,
                unidadesStock: 0,
                brutoUsd: 0,
                ventaUsd: 0,
            };
        }

        this.productos.forEach((p) => {
            const cid = p.categoriaId || 'cat-general';
            if (!mapa[cid]) {
                mapa[cid] = {
                    categoriaId: cid,
                    nombre: 'General',
                    cantidadProductos: 0,
                    unidadesStock: 0,
                    brutoUsd: 0,
                    ventaUsd: 0,
                };
            }
            const st = Number(p.stock) || 0;
            const br = parseNum(p.precioBrutoUsd);
            const net = parseNum(p.precioUsd);
            mapa[cid]!.cantidadProductos += 1;
            mapa[cid]!.unidadesStock += st;
            const subBruto = st * br;
            mapa[cid]!.brutoUsd += subBruto;
            mapa[cid]!.ventaUsd += st * net;
            totalGeneralBrutoUsd += subBruto;
        });

        return Object.values(mapa).map((item) => {
            const pct = totalGeneralBrutoUsd > 0
                ? ((item.brutoUsd / totalGeneralBrutoUsd) * 100).toFixed(1)
                : '0.0';
            const margenVal = Math.max(0, item.ventaUsd - item.brutoUsd);
            const margenPct = item.ventaUsd > 0
                ? ((margenVal / item.ventaUsd) * 100).toFixed(1)
                : '0.0';

            return {
                categoriaId: item.categoriaId,
                nombre: item.nombre,
                cantidadProductos: item.cantidadProductos,
                unidadesStock: item.unidadesStock,
                dineroBrutoUsd: item.brutoUsd.toFixed(2),
                dineroBrutoBs: (item.brutoUsd * tasaActual).toFixed(2),
                dineroVentaUsd: item.ventaUsd.toFixed(2),
                dineroVentaBs: (item.ventaUsd * tasaActual).toFixed(2),
                margenBrutoProyectadoUsd: margenVal.toFixed(2),
                margenBrutoPct: margenPct,
                porcentajeCapital: pct,
            };
        });
    }

    private calcularMargenes(): void {
        if (this.productos.length === 0) return;
        let totalVentaUsd = 0;
        let totalCostoUsd = 0;
        this.productos.forEach((p) => {
            const precioVenta = parseNum(p.precioUsd);
            const precioBruto = parseNum(p.precioBrutoUsd);
            if (precioVenta > 0) {
                totalVentaUsd += precioVenta;
                if (precioBruto > 0) {
                    totalCostoUsd += precioBruto;
                }
            }
        });
        if (totalVentaUsd > 0) {
            this.margenBrutoPct = Math.round(((totalVentaUsd - totalCostoUsd) / totalVentaUsd) * 100);
            this.margenNetoPct = Math.max(0, this.margenBrutoPct - 12);
        }
    }

    private obtenerTimestampTicket(t: Ticket): number {
        if (t.fechaUnix && t.fechaUnix > 0) return t.fechaUnix;
        if (t.fechaHora) {
            const m = t.fechaHora.match(/(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})/);
            if (m && m[1] && m[2] && m[3] && m[4] && m[5] && m[6]) {
                const parsed = Date.UTC(
                    parseInt(m[1], 10),
                    parseInt(m[2], 10) - 1,
                    parseInt(m[3], 10),
                    parseInt(m[4], 10),
                    parseInt(m[5], 10),
                    parseInt(m[6], 10),
                );
                if (!isNaN(parsed)) return Math.floor(parsed / 1000);
            }
        }
        return Math.floor(Date.now() / 1000);
    }

    private renderFilasTransacciones(lista: Ticket[]): string {
        if (lista.length === 0) {
            return `<tr><td colspan="7" class="py-6 text-center text-gray-400 font-bold">No se encontraron transacciones registradas.</td></tr>`;
        }
        const totalPag = Math.ceil(lista.length / this.POR_PAGINA_TRX);
        if (this.paginaTrx > totalPag) this.paginaTrx = totalPag;
        if (this.paginaTrx < 1) this.paginaTrx = 1;
        const inicio = (this.paginaTrx - 1) * this.POR_PAGINA_TRX;
        const pagina = lista.slice(inicio, inicio + this.POR_PAGINA_TRX);

        return pagina.map((t) => {
            const fechaStr = t.fechaUnix ? formatFechaHoraVet(t.fechaUnix) : (t.fechaHora || 'Reciente');
            // El canal real viene del backend; no se deduce del prefijo del id.
            const canalReal = (t.canal || 'VENTA DIRECTA').toUpperCase();
            const esCta = canalReal.includes('CUENTA') || canalReal.includes('DEUDA');
            const canal = t.canal || (esCta ? 'Cuenta Abierta' : 'Caja Directa');
            return `
            <tr class="hover:bg-gray-50 border-b border-gray-100 last:border-none transition-colors">
                <td class="py-2.5 font-mono text-brand-black">${t.ventaId}</td>
                <td class="py-2.5 text-gray-600">${fechaStr}</td>
                <td class="py-2.5">
                    <span class="px-2 py-0.5 rounded border border-brand-black text-[10px] font-black ${esCta ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'}">
                        ${canal}
                    </span>
                </td>
                <td class="py-2.5 text-gray-700">${t.operador || 'Principal'}</td>
                <td class="py-2.5 text-right font-mono text-gray-600">Bs. ${fmt(Number(t.tasaDelDia))}</td>
                <td class="py-2.5 text-right font-black">$ ${fmt(t.totalUsd)}</td>
                <td class="py-2.5 text-right font-black text-brand-purple">Bs. ${fmt(t.totalBs)}</td>
            </tr>`;
        }).join('');
    }

    private formatearFechaRespaldo(fechaStr: string, archivoNombre: string): { fechaFormateada: string; esAuto: boolean } {
        const nom = (archivoNombre || '').toLowerCase();
        const esManual = nom.includes('manual');
        const esAuto = !esManual && (nom.includes('auto') || nom.includes('datio_') || nom.startsWith('bk-'));
        if (!fechaStr) {
            return { fechaFormateada: 'Fecha no disponible', esAuto };
        }
        if (fechaStr === 'Ahora mismo' || fechaStr.startsWith('Hoy') || fechaStr.startsWith('Ayer')) {
            return { fechaFormateada: fechaStr, esAuto };
        }
        // Manejar formato "YYYY-MM-DD HH:mm"
        const partes = fechaStr.match(/^(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2})/);
        if (partes && partes[1] && partes[2] && partes[3] && partes[4] && partes[5]) {
            const [, y, m, d, hhStr, mmStr] = partes;
            let hh = parseInt(hhStr, 10);
            const ampm = hh >= 12 ? 'PM' : 'AM';
            hh = hh % 12 || 12;
            const hhFormateada = String(hh).padStart(2, '0');
            return {
                fechaFormateada: `${d}/${m}/${y} · ${hhFormateada}:${mmStr} ${ampm}`,
                esAuto,
            };
        }
        return { fechaFormateada: fechaStr, esAuto };
    }

    private renderFilasRespaldos(lista: RespaldoInfo[]): string {
        if (lista.length === 0) {
            return `<div class="py-4 text-center text-xs text-gray-400 font-bold">No se han generado copias de respaldo aún.</div>`;
        }
        const totalPag = Math.max(1, Math.ceil(lista.length / this.POR_PAGINA_RESPALDOS));
        if (this.paginaRespaldos > totalPag) this.paginaRespaldos = totalPag;
        if (this.paginaRespaldos < 1) this.paginaRespaldos = 1;
        const inicio = (this.paginaRespaldos - 1) * this.POR_PAGINA_RESPALDOS;
        const pagina = lista.slice(inicio, inicio + this.POR_PAGINA_RESPALDOS);

        return pagina.map((b) => {
            const { fechaFormateada, esAuto } = this.formatearFechaRespaldo(b.fecha, b.archivoNombre || '');
            const badgeTipo = esAuto
                ? '<span class="text-[9px] px-1.5 py-0.2 rounded border border-blue-900 bg-blue-100 text-blue-900 font-black uppercase tracking-wider">AUTO (APERTURA)</span>'
                : '<span class="text-[9px] px-1.5 py-0.2 rounded border border-purple-900 bg-purple-100 text-brand-purple font-black uppercase tracking-wider">MANUAL (DUEÑO)</span>';

            return `
            <div class="border-2 border-brand-black rounded-lg p-3 bg-gray-50 flex justify-between items-center text-xs gap-2">
                <div class="min-w-0 pr-2">
                    <div class="flex items-center gap-1.5 mb-1">
                        ${badgeTipo}
                        <span class="font-heading font-black text-xs text-brand-black">${fechaFormateada}</span>
                    </div>
                    <p class="font-mono text-gray-600 truncate text-[11px] font-bold" title="${b.archivoNombre || `${b.id}.backup`}">
                        Archivo: ${b.archivoNombre || `${b.id}.backup`}
                    </p>
                    <p class="text-[10px] text-gray-500 font-mono truncate max-w-[280px]" title="${b.checksumSha256}">
                        SHA-256: ${b.checksumSha256.slice(0, 16)}...
                    </p>
                </div>
                <div class="text-right shrink-0">
                    <span class="font-heading font-black text-brand-black text-xs block">${b.registros} registros</span>
                    <span class="font-bold text-gray-500 text-[11px] block">${b.tamanoKb} KB</span>
                    <span class="text-[10px] text-emerald-700 font-black uppercase mt-0.5 inline-block">VERIFICADO OK</span>
                </div>
            </div>`;
        }).join('');
    }

    async render(): Promise<void> {
        const [datos, respaldos, transacciones, productos, categorias, jornada] = await Promise.all([
            api.panel(),
            api.respaldos(),
            api.ventas(),
            api.productos(),
            api.categorias(),
            api.obtenerJornadaActual(),
        ]);
        this.vm.setDatos(datos);
        this.respaldos = respaldos;
        this.transacciones = transacciones;
        this.productos = productos;
        this.categorias = categorias;
        this.jornadaActual = jornada;
        this.calcularMargenes();

        const ahora = new Date();
        const hace24h = new Date(ahora.getTime() - 86400000);

        if (!this.rangoDetalleFechas) {
            this.rangoDetalleFechas = `Del ${formatDateVet(hace24h)} al ${formatDateVet(ahora)}`;
        }

        const inventarioBs = this.modelo.bs(datos.valorInventarioUsd);
        const conCuentas = this.modelo.tieneCapacidad(1 << 3) || this.modelo.tieneRubro(1 << 2);

        const categoriasDinero = (datos.dineroPorCategoria && datos.dineroPorCategoria.length > 0)
            ? datos.dineroPorCategoria
            : this.calcularDineroPorCategoria();
        const totalProductosCat = categoriasDinero.reduce((acc, c) => acc + c.cantidadProductos, 0);
        const totalUnidadesStock = categoriasDinero.reduce((acc, c) => acc + c.unidadesStock, 0);
        const totalBrutoUsd = categoriasDinero.reduce((acc, c) => acc + parseNum(c.dineroBrutoUsd), 0);
        const totalBrutoBs = categoriasDinero.reduce((acc, c) => acc + parseNum(c.dineroBrutoBs), 0);
        const totalVentaUsd = categoriasDinero.reduce((acc, c) => acc + parseNum(c.dineroVentaUsd), 0);
        const totalMargenUsd = Math.max(0, totalVentaUsd - totalBrutoUsd);
        const totalMargenPct = totalVentaUsd > 0 ? ((totalMargenUsd / totalVentaUsd) * 100).toFixed(1) : '0.0';

        const filasCategoriasHtml = categoriasDinero.map((cat) => {
            const pct = parseNum(cat.porcentajeCapital);
            return `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="py-2.5 px-3 flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-brand-purple inline-block border border-brand-black shrink-0"></span>
                    <span class="font-black text-brand-black text-xs">${cat.nombre}</span>
                </td>
                <td class="py-2.5 px-3 text-center">
                    <span class="bg-gray-100 border border-brand-black px-2 py-0.5 rounded text-[11px] font-black">${cat.cantidadProductos} art.</span>
                </td>
                <td class="py-2.5 px-3 text-right font-mono">${cat.unidadesStock} un.</td>
                <td class="py-2.5 px-3 text-right font-black font-mono text-brand-black">$ ${fmt(cat.dineroBrutoUsd)}</td>
                <td class="py-2.5 px-3 text-right font-black font-mono text-brand-purple">Bs. ${fmt(cat.dineroBrutoBs)}</td>
                <td class="py-2.5 px-3 text-right font-mono text-gray-700">$ ${fmt(cat.dineroVentaUsd)}</td>
                <td class="py-2.5 px-3 text-right font-mono text-emerald-700">$ ${fmt(cat.margenBrutoProyectadoUsd)} (${cat.margenBrutoPct}%)</td>
                <td class="py-2.5 px-3 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                        <div class="w-16 bg-gray-200 border border-brand-black rounded-full h-2 overflow-hidden shrink-0">
                            <div class="bg-brand-purple h-full" style="width: ${Math.min(100, pct)}%"></div>
                        </div>
                        <span class="font-mono text-[11px] w-10 text-right">${cat.porcentajeCapital}%</span>
                    </div>
                </td>
            </tr>`;
        }).join('');

        this.contenedor.innerHTML = `
        <div class="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
                <h2 class="text-2xl sm:text-3xl font-black font-heading">Panel de Control Dueño(a)</h2>
                <p class="text-brand-text font-body text-xs sm:text-sm">Auditoría contable, rentabilidad, márgenes y configuración de seguridad</p>
            </div>
            <div class="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
                <div class="inline-flex border-2 border-brand-black rounded bg-white shadow-brutal-sm p-0.5 shrink-0" id="rango-selector">
                    <button class="w-12 sm:w-14 h-8 flex items-center justify-center font-heading font-black text-xs rounded bg-brand-black text-white shrink-0" data-rango="24h">24H</button>
                    <button class="w-12 sm:w-14 h-8 flex items-center justify-center font-heading font-bold text-xs rounded text-brand-black hover:bg-gray-100 transition-colors shrink-0" data-rango="7d">7D</button>
                    <button class="w-12 sm:w-14 h-8 flex items-center justify-center font-heading font-bold text-xs rounded text-brand-black hover:bg-gray-100 transition-colors shrink-0" data-rango="30d">30D</button>
                    <button class="w-12 sm:w-14 h-8 flex items-center justify-center font-heading font-bold text-xs rounded text-brand-black hover:bg-gray-100 transition-colors shrink-0" data-rango="1a">1A</button>
                    <button class="w-12 sm:w-14 h-8 flex items-center justify-center font-heading font-bold text-xs rounded text-brand-black hover:bg-gray-100 transition-colors shrink-0" data-rango="todo">TODO</button>
                </div>
            </div>
        </div>

        <!-- Barra de Diagnóstico de Rentabilidad por Fechas -->
        <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-3 sm:p-4 mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-brand-purple inline-block"></span>
                <span class="font-heading font-black text-xs sm:text-sm uppercase tracking-wide">Diagnóstico de Rentabilidad por Rango de Fechas</span>
            </div>
            <div class="flex flex-wrap items-center gap-2">
                <div class="flex items-center gap-1.5 bg-gray-50 border border-brand-black rounded px-2.5 py-1">
                    <label for="filtro-fecha-desde" class="text-[11px] font-bold text-gray-600 uppercase">Desde:</label>
                    <input type="date" id="filtro-fecha-desde" class="border-0 bg-transparent text-xs font-bold text-brand-black focus:outline-none" />
                </div>
                <div class="flex items-center gap-1.5 bg-gray-50 border border-brand-black rounded px-2.5 py-1">
                    <label for="filtro-fecha-hasta" class="text-[11px] font-bold text-gray-600 uppercase">Hasta:</label>
                    <input type="date" id="filtro-fecha-hasta" class="border-0 bg-transparent text-xs font-bold text-brand-black focus:outline-none" />
                </div>
                <button id="btn-aplicar-fechas" class="bg-brand-black text-white border-2 border-brand-black rounded px-3 py-1.5 font-heading font-black text-xs shadow-brutal-sm hover:bg-gray-800 transition-colors">
                    DIAGNOSTICAR RANGO
                </button>
                <button id="btn-limpiar-fechas" class="bg-gray-100 text-brand-black border-2 border-brand-black rounded px-2.5 py-1.5 font-heading font-bold text-xs hover:bg-gray-200 transition-colors">
                    REINICIAR
                </button>
                <span id="label-estado-fechas" class="text-xs font-bold text-brand-purple hidden bg-purple-50 border border-brand-purple rounded px-2 py-1"></span>
            </div>
        </div>

        <!-- Tarjetas KPI con Retícula Auto-Ajustable y Jerarquía de Monedas -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            ${this.kpi('Ventas Totales', `<span id="kpi-ventas-usd" class="font-black text-brand-black">$ ${fmt(datos.ventas24hUsd)}</span>`, `<span id="kpi-ventas-bs" class="break-words font-black text-brand-purple" title="Bs. ${fmt(datos.ventas24hBs)}">Bs. ${fmtCompactoBs(datos.ventas24hBs)}</span>`, 'bg-amber-50', 'Facturación bruta cobrada en caja (USD y Bs. al cambio oficial)')}
            ${this.kpi('Ganancia Bruta', `<span id="kpi-gan-bruta">$ ${fmt(datos.gananciaBrutaUsd || Number(datos.ventas24hUsd) * this.margenBrutoPct / 100)}</span>`, `Margen bruto comercial: ${this.margenBrutoPct.toFixed(1)}%`, 'bg-emerald-50', 'Ventas menos costo de adquisición de mercancía')}
            ${this.kpi('Ganancia Neta', `<span id="kpi-gan-neta">$ ${fmt(datos.gananciaNetaUsd || Number(datos.ventas24hUsd) * this.margenNetoPct / 100)}</span>`, `<span id="kpi-gan-neta-bs" class="break-words" title="Bs. ${this.modelo.bs(Number(datos.ventas24hUsd) * this.margenNetoPct / 100)}">Bs. ${fmtCompactoBs(this.modelo.bs(Number(datos.ventas24hUsd) * this.margenNetoPct / 100))}</span>`, 'bg-blue-50', 'Utilidad líquida real después de descontar impuestos')}
            ${this.kpi('Inventario Total', `$ ${fmt(datos.valorInventarioUsd)}`, `<span class="break-words" title="Bs. ${inventarioBs}">Bs. ${fmtCompactoBs(inventarioBs)}</span>`, 'bg-purple-50', 'Valoración monetaria total del stock físico actual disponible')}
        </div>

        <!-- Módulo de Jornada Laboral y Operadores en Turno -->
        <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-4 sm:p-6 mb-4 sm:mb-6">
            <div class="flex flex-wrap justify-between items-center border-b-2 border-brand-black pb-3 mb-4 gap-2">
                <div>
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full ${this.jornadaActual?.estado === 'abierta' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'} border border-brand-black inline-block"></span>
                        <h3 class="font-heading font-black text-lg sm:text-xl">Control de Jornada Laboral y Operadores en Turno</h3>
                    </div>
                    <p class="text-xs text-gray-500 font-bold">Gestión de turnos de trabajo, asignación de personal en caja y balance operativo</p>
                </div>
                <div class="flex items-center gap-2" id="box-acciones-jornada"></div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div class="border-2 border-brand-black rounded p-3 bg-gray-50">
                    <span class="text-[10px] font-bold text-gray-500 uppercase block mb-1">Estado de la Jornada</span>
                    <p id="jornada-estado-texto" class="font-heading font-black text-lg text-brand-black"></p>
                    <p id="jornada-fechas-texto" class="text-xs text-gray-600 font-mono mt-0.5"></p>
                </div>
                <div class="border-2 border-brand-black rounded p-3 bg-gray-50">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-[10px] font-bold text-gray-500 uppercase">Operadores en Turno</span>
                        <span class="text-[10px] text-gray-500 font-bold">(Multicajero)</span>
                    </div>
                    <div class="flex items-center justify-between gap-2 mt-1">
                        <span id="jornada-operador-activo" class="font-heading font-black text-sm text-brand-purple truncate"></span>
                        <button id="btn-relevar-operador" class="text-xs font-black bg-amber-200 hover:bg-amber-300 border border-brand-black px-2 py-1 rounded shadow-brutal-sm shrink-0">ASIGNAR</button>
                    </div>
                </div>
                <div class="border-2 border-brand-black rounded p-3 bg-gray-50">
                    <span class="text-[10px] font-bold text-gray-500 uppercase block mb-1">Total Facturado en Turno</span>
                    <p id="jornada-balance-texto" class="font-heading font-black text-lg text-emerald-700"></p>
                    <p id="jornada-tickets-texto" class="text-xs text-gray-600 font-bold mt-0.5"></p>
                </div>
            </div>

            <!-- Gestión de Operadores Registrados (Editar, Activar/Inactivar y Eliminar) -->
            <div class="border-t-2 border-gray-200 pt-4">
                <div class="flex flex-wrap justify-between items-center gap-2 mb-3">
                    <span class="text-xs font-heading font-black uppercase text-gray-700">Catálogo de Operadores / Cajeros:</span>
                    <form id="form-crear-operador" class="flex gap-2 items-center">
                        <input id="in-nuevo-operador" type="text" maxlength="30" placeholder="Nombre del operador..." class="border-2 border-brand-black rounded px-3 py-1.5 text-xs font-bold w-48" />
                        <button type="submit" class="bg-brand-black text-white px-3 py-1.5 rounded font-black font-heading text-xs hover:bg-gray-800 shadow-brutal-sm">+ AGREGAR</button>
                    </form>
                </div>
                <div class="flex flex-wrap items-center gap-2" id="lista-operadores-chips"></div>
            </div>
        </div>

        <!-- Módulo de Catálogo de Métodos de Pago (Agregar y Eliminar) -->
        <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-4 sm:p-6 mb-4 sm:mb-6">
            <div class="flex flex-wrap justify-between items-center border-b-2 border-brand-black pb-3 mb-4 gap-2">
                <div>
                    <h3 class="font-heading font-black text-lg sm:text-xl">Métodos de Pago Aceptados</h3>
                    <p class="text-xs text-gray-500 font-bold">Configuración de canales de cobro en Bolívares y Divisas disponibles en Caja y Cuentas</p>
                </div>
                <form id="form-crear-metodo-panel" class="flex flex-wrap items-center gap-2">
                    <input id="in-nuevo-metodo-nombre" type="text" maxlength="20" placeholder="Nuevo método (ej: Zinli, Banesco)..." class="border-2 border-brand-black rounded px-3 py-1.5 text-xs font-bold w-52" />
                    <select id="select-nuevo-metodo-moneda" class="border-2 border-brand-black rounded px-2 py-1.5 text-xs font-bold bg-white">
                        <option value="BS">Bolívares (Bs.)</option>
                        <option value="USD">Dólares (USD)</option>
                    </select>
                    <button type="submit" class="bg-brand-black text-white px-3 py-1.5 rounded font-black font-heading text-xs hover:bg-gray-800 shadow-brutal-sm">+ MÉTODO</button>
                </form>
            </div>
            <div id="lista-metodos-pago-panel" class="flex flex-wrap gap-2.5"></div>
        </div>

        <!-- Módulo de Configuración de Umbrales de Salud de Stock (Semáforo Personalizado) -->
        <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-4 sm:p-6 mb-4 sm:mb-6">
            <div class="flex flex-wrap justify-between items-center border-b-2 border-brand-black pb-3 mb-4 gap-2">
                <div>
                    <h3 class="font-heading font-black text-lg sm:text-xl">Semáforo de Salud del Stock</h3>
                    <p class="text-xs text-gray-500 font-bold">Personaliza los límites numéricos de unidades para los colores del stock en Caja, Inventario y Alertas</p>
                </div>
                <span class="text-xs font-black bg-purple-50 text-brand-purple border border-purple-300 px-2.5 py-1 rounded">
                    UMBRALES ACTIVOS
                </span>
            </div>
            <form id="form-semaforo-stock" class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div class="border-2 border-red-500 bg-red-50/50 rounded p-3">
                    <label class="block text-xs font-heading font-black text-red-900 uppercase mb-1">Stock Rojo (Crítico / Alerta)</label>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-red-700">&le;</span>
                        <input id="in-semaforo-rojo" type="number" min="1" max="999" step="1" value="5" class="w-full border-2 border-brand-black rounded px-2 py-1 font-mono font-black text-base bg-white" />
                        <span class="text-xs font-bold text-gray-600">un.</span>
                    </div>
                    <span class="text-[10px] text-gray-500 block mt-1">Existencias iguales o inferiores quedan en rojo.</span>
                </div>
                <div class="border-2 border-amber-500 bg-amber-50/50 rounded p-3">
                    <label class="block text-xs font-heading font-black text-amber-900 uppercase mb-1">Stock Amarillo (Advertencia)</label>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-amber-700">&le;</span>
                        <input id="in-semaforo-amarillo" type="number" min="2" max="9999" step="1" value="15" class="w-full border-2 border-brand-black rounded px-2 py-1 font-mono font-black text-base bg-white" />
                        <span class="text-xs font-bold text-gray-600">un.</span>
                    </div>
                    <span class="text-[10px] text-gray-500 block mt-1">Existencias entre rojo y este límite quedan en amarillo.</span>
                </div>
                <div class="flex gap-2">
                    <button type="submit" class="flex-1 bg-brand-black text-white font-heading font-black py-2.5 rounded border-2 border-brand-black shadow-brutal hover:-translate-y-0.5 transition-all text-xs">
                        GUARDAR UMBRALES
                    </button>
                    <button type="button" id="btn-reset-semaforo" class="bg-gray-100 border-2 border-brand-black font-heading font-bold py-2.5 px-3 rounded text-xs hover:bg-gray-200">
                        PREDETERMINADO
                    </button>
                </div>
            </form>
            <p id="msg-semaforo-stock" class="hidden text-xs font-bold mt-2 text-green-700"></p>
        </div>

        <!-- Analítica Avanzada con Nomenclatura Gerencial Enriquecedora -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6 items-stretch">
            <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-4 sm:p-6 lg:col-span-2 flex flex-col">
                <div class="flex flex-wrap justify-between items-center border-b-2 border-brand-black pb-3 mb-4 gap-2 shrink-0">
                    <div>
                        <h3 class="font-heading font-black text-lg sm:text-xl">Rendimiento Comercial y Diagnóstico de Rentabilidad</h3>
                        <p class="text-xs text-gray-500 font-bold">Participación y margen de contribución de los productos comercializados en el negocio</p>
                    </div>
                    <div class="inline-flex border-2 border-brand-black rounded bg-gray-100 p-0.5" id="criterio-selector">
                        <button id="btn-crit-vol" class="px-2.5 py-1 text-xs font-heading font-black rounded bg-brand-black text-white">POR VOLUMEN</button>
                        <button id="btn-crit-ing" class="px-2.5 py-1 text-xs font-heading font-bold rounded text-brand-black hover:bg-white">POR INGRESOS ($)</button>
                    </div>
                </div>
                <div id="panel-chart-container" class="flex-1 min-h-[280px] flex items-center justify-center"></div>
            </div>

            <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-4 sm:p-6 flex flex-col justify-between">
                <div>
                    <h3 class="font-heading font-black text-lg sm:text-xl border-b-2 border-brand-black pb-3 mb-4">Indicadores de Rendimiento</h3>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center py-1.5 border-b border-gray-200">
                            <span class="font-bold text-xs text-gray-600 uppercase">Tickets Emitidos</span>
                            <span id="kpi-tickets" class="font-black font-heading text-base sm:text-lg">${datos.tickets24h}</span>
                        </div>
                        <div class="flex justify-between items-center py-1.5 border-b border-gray-200">
                            <span class="font-bold text-xs text-gray-600 uppercase">Ticket Promedio</span>
                            <span id="kpi-ticket-prom" class="font-black font-heading text-base">$ ${datos.tickets24h > 0 ? (Number(datos.ventas24hUsd) / datos.tickets24h).toFixed(2) : '0.00'}</span>
                        </div>
                        <div class="flex justify-between items-center py-1.5 border-b border-gray-200">
                            <span class="font-bold text-xs text-gray-600 uppercase">Margen Comercial Global</span>
                            <span class="font-black font-heading text-base text-emerald-700">${Number(datos.ventas24hUsd) > 0 ? ((parseNum(datos.gananciaBrutaUsd) / Number(datos.ventas24hUsd)) * 100).toFixed(1) : '0.0'}% bruto</span>
                        </div>
                        <div class="flex justify-between items-center py-1.5 border-b border-gray-200">
                            <span class="font-bold text-xs text-gray-600 uppercase">Demanda Principal</span>
                            <span class="font-black font-heading text-base text-blue-700">${datos.topProductos.length > 0 && Number(datos.ventas24hUsd) > 0 ? ((parseNum(datos.topProductos[0].totalUsd) / Number(datos.ventas24hUsd)) * 100).toFixed(1) : '0.0'}% ingresos</span>
                        </div>
                        <div class="flex justify-between items-center py-1.5 border-b border-gray-200">
                            <span class="font-bold text-xs text-gray-600 uppercase">Cuentas Activas</span>
                            <span class="font-black font-heading text-base">${conCuentas ? datos.cuentasAbiertas : 'N/A'}</span>
                        </div>
                        <div class="flex justify-between items-center py-1.5 border-b border-gray-200">
                            <div>
                                <span class="font-bold text-xs text-gray-600 uppercase">Deudas Abiertas</span>
                                <p class="text-[10px] text-gray-400 font-bold">Créditos pendientes por cobrar</p>
                            </div>
                            <div class="text-right">
                                <span class="font-black font-heading text-base text-amber-700">${conCuentas ? (datos.deudasAbiertas ?? 0) : 'N/A'}</span>
                                ${conCuentas && datos.dineroEnLaCalleUsd ? `
                                    <p class="text-[11px] font-mono font-bold text-gray-700">$ ${fmt(datos.dineroEnLaCalleUsd)} <span class="text-gray-400">·</span> Bs. ${fmt(datos.dineroEnLaCalleBs)}</p>
                                ` : ''}
                            </div>
                        </div>
                        <div class="flex justify-between items-center py-1.5">
                            <span class="font-bold text-xs text-gray-600 uppercase">Alertas de Stock Crítico</span>
                            <span class="font-black font-heading text-xs px-2 py-0.5 rounded border border-brand-black ${datos.criticos.length > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'}">
                                ${datos.criticos.length} artículos
                            </span>
                        </div>
                    </div>
                </div>
                <div class="bg-gray-50 border border-brand-black rounded p-3 text-[11px] text-gray-600 font-bold mt-4">
                    Invariante contable: Las ventas en Bs. se congelan a la tasa BCV auditada al emitir cada ticket. Cero distorsiones por fluctuación retroactiva.
                </div>
            </div>
        </div>

        <!-- Módulo de Dinero en Bruto e Inventario por Categoría -->
        <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-4 sm:p-6 mb-4 sm:mb-6">
            <div class="flex flex-wrap justify-between items-center border-b-2 border-brand-black pb-3 mb-4 gap-2">
                <div>
                    <h3 class="font-heading font-black text-lg sm:text-xl">Dinero en Bruto e Inventario por Categoría</h3>
                    <p class="text-xs text-gray-500 font-bold">Auditoría contable del inventario valorizado a costo de adquisición bruto vs. valor comercial (PVP)</p>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs font-black text-brand-black bg-purple-100 border border-brand-black px-2.5 py-1 rounded">
                        ${categoriasDinero.length} categorías auditadas
                    </span>
                    <span class="text-xs font-black text-emerald-900 bg-emerald-100 border border-brand-black px-2.5 py-1 rounded">
                        Capital en Bruto: $ ${fmt(totalBrutoUsd)}
                    </span>
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead>
                        <tr class="border-b-2 border-brand-black font-heading font-black uppercase text-gray-600 bg-gray-50">
                            <th class="py-2.5 px-3">Categoría</th>
                            <th class="py-2.5 px-3 text-center">N° Productos</th>
                            <th class="py-2.5 px-3 text-right">Stock Físico</th>
                            <th class="py-2.5 px-3 text-right">Dinero en Bruto ($ USD)</th>
                            <th class="py-2.5 px-3 text-right">Dinero en Bruto (Bs.)</th>
                            <th class="py-2.5 px-3 text-right">Valor PVP ($ USD)</th>
                            <th class="py-2.5 px-3 text-right">Margen Proyectado</th>
                            <th class="py-2.5 px-3 text-right">% Capital</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 font-bold">
                        ${filasCategoriasHtml}
                    </tbody>
                    <tfoot class="border-t-2 border-brand-black bg-gray-100 font-black font-heading text-xs">
                        <tr>
                            <td class="py-2.5 px-3 uppercase text-brand-black">TOTAL CONSOLIDADO</td>
                            <td class="py-2.5 px-3 text-center">${totalProductosCat} prods.</td>
                            <td class="py-2.5 px-3 text-right">${totalUnidadesStock} un.</td>
                            <td class="py-2.5 px-3 text-right text-brand-black">$ ${fmt(totalBrutoUsd)}</td>
                            <td class="py-2.5 px-3 text-right text-brand-purple">Bs. ${fmt(totalBrutoBs)}</td>
                            <td class="py-2.5 px-3 text-right text-brand-black">$ ${fmt(totalVentaUsd)}</td>
                            <td class="py-2.5 px-3 text-right text-emerald-700">$ ${fmt(totalMargenUsd)} (${totalMargenPct}%)</td>
                            <td class="py-2.5 px-3 text-right">100.0%</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        <!-- Módulo de Histórico de Ventas y Clasificación de Transacciones -->
        <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-4 sm:p-6 mb-4 sm:mb-6">
            <div class="flex flex-wrap justify-between items-center border-b-2 border-brand-black pb-3 mb-4 gap-2">
                <div>
                    <h3 class="font-heading font-black text-lg sm:text-xl">Historial Cronológico de Transacciones</h3>
                    <p class="text-xs text-gray-500 font-bold">Registro auditable con clasificación explícita del canal comercial y tasa BCV auditada</p>
                </div>
                <span id="conteo-transacciones-badge" class="text-xs font-bold text-gray-700 bg-gray-100 border border-brand-black px-2.5 py-1 rounded">
                    ${this.transacciones.length} transacciones registradas
                </span>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead>
                        <tr class="border-b-2 border-brand-black font-heading font-black uppercase text-gray-600">
                            <th class="py-2 pr-4">Identificador</th>
                            <th class="py-2 pr-4">Fecha y Hora</th>
                            <th class="py-2 pr-4">Canal Comercial</th>
                            <th class="py-2 pr-4">Cajero / Operador</th>
                            <th class="py-2 pr-4 text-right">Tasa Aplicada</th>
                            <th class="py-2 pr-4 text-right">Total USD</th>
                            <th class="py-2 text-right">Total Bolívares (Bs.)</th>
                        </tr>
                    </thead>
                    <tbody id="tabla-transacciones-body" class="divide-y divide-gray-200 font-bold">
                        ${this.renderFilasTransacciones(this.transacciones)}
                    </tbody>
                </table>
            </div>
            ${(() => {
                const totalPag = Math.ceil(this.transacciones.length / this.POR_PAGINA_TRX);
                if (totalPag <= 1) return '';
                return `
                <div class="flex items-center justify-between border-t-2 border-brand-black pt-3 mt-3">
                    <span class="text-xs font-bold text-gray-600">Página ${this.paginaTrx} de ${totalPag} · ${this.transacciones.length} transacciones</span>
                    <div class="flex gap-2">
                        <button id="trx-pag-ant" class="border-2 border-brand-black px-3 py-1 rounded text-xs font-heading font-black shadow-brutal-sm ${this.paginaTrx === 1 ? 'opacity-30 pointer-events-none' : 'hover:bg-gray-100'}">ANTERIOR</button>
                        <button id="trx-pag-sig" class="border-2 border-brand-black px-3 py-1 rounded text-xs font-heading font-black shadow-brutal-sm ${this.paginaTrx === totalPag ? 'opacity-30 pointer-events-none' : 'hover:bg-gray-100'}">SIGUIENTE</button>
                    </div>
                </div>`;
            })()}
        </div>

        <!-- Sección de Infraestructura: Respaldos Criptográficos y Licencia de Software -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <!-- Respaldos -->
            <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-4 sm:p-6 flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-center border-b-2 border-brand-black pb-3 mb-4">
                        <div>
                            <h3 class="font-heading font-black text-lg sm:text-xl">Respaldos Criptográficos</h3>
                            <p class="text-xs text-gray-500 font-bold">Generados físicamente en el subdirectorio local <code class="font-mono bg-gray-100 px-1 border border-gray-300 rounded">Respaldos/</code></p>
                        </div>
                        <button id="btn-crear-backup" class="bg-brand-black text-white px-3 py-1.5 rounded font-black font-heading text-xs shadow-brutal-sm hover:-translate-y-0.5 transition-transform shrink-0">
                            + COPIA
                        </button>
                    </div>
                    <div id="lista-respaldos" class="space-y-2 max-h-48 overflow-y-auto pr-1">
                        ${this.renderFilasRespaldos(this.respaldos)}
                    </div>
                    ${(() => {
                        const totalPag = Math.max(1, Math.ceil(this.respaldos.length / this.POR_PAGINA_RESPALDOS));
                        if (totalPag <= 1) return '';
                        return `
                        <div class="flex items-center justify-between border-t border-gray-200 pt-2.5 mt-2.5 text-xs">
                            <span id="respaldo-pag-info" class="text-[11px] font-bold text-gray-600 font-mono">Pág. ${this.paginaRespaldos}/${totalPag} (${this.respaldos.length} copias)</span>
                            <div class="flex gap-1.5">
                                <button id="respaldo-pag-ant" class="border border-brand-black px-2 py-0.5 rounded text-[10px] font-heading font-black shadow-brutal-sm ${this.paginaRespaldos === 1 ? 'opacity-30 pointer-events-none' : 'hover:bg-gray-100'}">&larr; ANT</button>
                                <button id="respaldo-pag-sig" class="border border-brand-black px-2 py-0.5 rounded text-[10px] font-heading font-black shadow-brutal-sm ${this.paginaRespaldos === totalPag ? 'opacity-30 pointer-events-none' : 'hover:bg-gray-100'}">SIG &rarr;</button>
                            </div>
                        </div>`;
                    })()}
                </div>
                <div class="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500 font-bold">
                    <span class="truncate">Ruta local: <code class="text-[10px] font-mono font-bold bg-gray-100 px-1 rounded">Respaldos/datio_FECHA.backup</code></span>
                    <span class="text-brand-purple font-black shrink-0">Cero alteración</span>
                </div>
            </div>

            <!-- Seguridad del Terminal y Acceso Administrativo -->
            <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-4 sm:p-6 flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-center border-b-2 border-brand-black pb-3 mb-4">
                        <div>
                            <h3 class="font-heading font-black text-lg sm:text-xl">Seguridad y Acceso al Panel</h3>
                            <p class="text-xs text-gray-500 font-bold">Control de credencial administrativa y protección de datos comerciales</p>
                        </div>
                        <span class="px-2 py-1 rounded border border-brand-black font-black font-heading text-xs uppercase bg-blue-100 text-blue-900">
                            Protegido
                        </span>
                    </div>
                    <div class="space-y-2 text-xs font-bold text-gray-700">
                        <p class="leading-relaxed">
                            Este terminal opera con aislamiento local absoluto. Toda transacción, cambio de inventario y cierre de jornada se resguarda mediante sumas de verificación criptográficas en tiempo real.
                        </p>
                    </div>
                </div>

                <!-- Modificación de Clave Maestra del Dueño -->
                <div class="mt-4 pt-3 border-t border-brand-black">
                    <span class="block font-heading font-black text-xs uppercase text-brand-black mb-1">Clave de Seguridad del Panel</span>
                    <p class="text-[11px] text-gray-600 font-bold mb-2">Modifica la clave numérica para restringir el acceso a este panel o déjala en blanco para libre acceso.</p>
                    <form id="form-cambiar-clave" class="flex flex-wrap gap-2 items-center">
                        <input id="pin-actual" type="password" maxlength="16" placeholder="Clave actual" class="border-2 border-brand-black rounded px-2.5 py-1 text-xs font-bold w-28" />
                        <input id="pin-nuevo" type="password" maxlength="16" placeholder="Nueva clave (vacío = sin clave)" class="border-2 border-brand-black rounded px-2.5 py-1 text-xs font-bold flex-1 min-w-[140px]" />
                        <button type="submit" class="bg-brand-black text-white px-3 py-1 rounded text-xs font-heading font-black hover:bg-gray-800">GUARDAR</button>
                    </form>
                    <p id="msg-cambio-clave" class="hidden text-xs font-bold mt-1.5"></p>
                </div>
            </div>
        </div>`;

        this.conectarEventos(datos);
        void this.pintarGrafico(datos);
    }

    private conectarEventos(datos: PanelDatos): void {
        const btnVol = document.getElementById('btn-crit-vol');
        const btnIng = document.getElementById('btn-crit-ing');

        const inDesde = document.getElementById('filtro-fecha-desde') as HTMLInputElement | null;
        const inHasta = document.getElementById('filtro-fecha-hasta') as HTMLInputElement | null;
        const btnAplicarFechas = document.getElementById('btn-aplicar-fechas');
        const btnLimpiarFechas = document.getElementById('btn-limpiar-fechas');
        const labelEstadoFechas = document.getElementById('label-estado-fechas');
        const tablaTransaccionesBody = document.getElementById('tabla-transacciones-body');
        const conteoTransaccionesBadge = document.getElementById('conteo-transacciones-badge');

        const rangoBotones = this.contenedor.querySelectorAll<HTMLButtonElement>('[data-rango]');
        rangoBotones.forEach((btn) => {
            btn.addEventListener('click', () => {
                if (inDesde) inDesde.value = '';
                if (inHasta) inHasta.value = '';
                if (labelEstadoFechas) labelEstadoFechas.classList.add('hidden');
                if (tablaTransaccionesBody) tablaTransaccionesBody.innerHTML = this.renderFilasTransacciones(this.transacciones);
                if (conteoTransaccionesBadge) conteoTransaccionesBadge.textContent = `${this.transacciones.length} transacciones registradas`;

                rangoBotones.forEach((b) => {
                    b.className = 'w-12 sm:w-14 h-8 flex items-center justify-center font-heading font-bold text-xs rounded text-brand-black hover:bg-gray-100 transition-colors shrink-0';
                });
                btn.className = 'w-12 sm:w-14 h-8 flex items-center justify-center font-heading font-black text-xs rounded bg-brand-black text-white shrink-0';
                const rango = btn.dataset.rango || '24h';
                this.aplicarRango(rango, datos);
            });
        });

        btnAplicarFechas?.addEventListener('click', () => {
            this.aplicarFiltroFechas(datos);
        });

        btnLimpiarFechas?.addEventListener('click', () => {
            if (inDesde) inDesde.value = '';
            if (inHasta) inHasta.value = '';
            if (labelEstadoFechas) labelEstadoFechas.classList.add('hidden');
            if (tablaTransaccionesBody) tablaTransaccionesBody.innerHTML = this.renderFilasTransacciones(this.transacciones);
            if (conteoTransaccionesBadge) conteoTransaccionesBadge.textContent = `${this.transacciones.length} transacciones registradas`;
            this.paginaTrx = 1;

            document.getElementById('trx-pag-ant')?.addEventListener('click', () => {
                if (this.paginaTrx > 1) {
                    this.paginaTrx--;
                    if (tablaTransaccionesBody) tablaTransaccionesBody.innerHTML = this.renderFilasTransacciones(this.transacciones);
                }
            });
            document.getElementById('trx-pag-sig')?.addEventListener('click', () => {
                const total = Math.ceil(this.transacciones.length / this.POR_PAGINA_TRX);
                if (this.paginaTrx < total) {
                    this.paginaTrx++;
                    if (tablaTransaccionesBody) tablaTransaccionesBody.innerHTML = this.renderFilasTransacciones(this.transacciones);
                }
            });

            rangoBotones.forEach((b) => {
                b.className = 'w-12 sm:w-14 h-8 flex items-center justify-center font-heading font-bold text-xs rounded text-brand-black hover:bg-gray-100 transition-colors shrink-0';
            });
            const btn24 = this.contenedor.querySelector<HTMLButtonElement>('[data-rango="24h"]');
            if (btn24) {
                btn24.className = 'w-12 sm:w-14 h-8 flex items-center justify-center font-heading font-black text-xs rounded bg-brand-black text-white shrink-0';
            }
            this.aplicarRango('24h', datos);
        });

        btnVol?.addEventListener('click', () => {
            this.criterioGrafica = 'volumen';
            btnVol.className = 'px-2.5 py-1 text-xs font-heading font-black rounded bg-brand-black text-white';
            btnIng!.className = 'px-2.5 py-1 text-xs font-heading font-bold rounded text-brand-black hover:bg-white';
            void this.pintarGrafico(this.vm.panel || datos);
        });

        btnIng?.addEventListener('click', () => {
            this.criterioGrafica = 'ingreso';
            btnIng.className = 'px-2.5 py-1 text-xs font-heading font-black rounded bg-brand-black text-white';
            btnVol!.className = 'px-2.5 py-1 text-xs font-heading font-bold rounded text-brand-black hover:bg-white';
            void this.pintarGrafico(this.vm.panel || datos);
        });

        const refrescarPaginacionRespaldos = () => {
            const lista = document.getElementById('lista-respaldos');
            if (lista) lista.innerHTML = this.renderFilasRespaldos(this.respaldos);
            const totalPag = Math.max(1, Math.ceil(this.respaldos.length / this.POR_PAGINA_RESPALDOS));
            const info = document.getElementById('respaldo-pag-info');
            if (info) info.textContent = `Pág. ${this.paginaRespaldos}/${totalPag} (${this.respaldos.length} copias)`;
            const btnAnt = document.getElementById('respaldo-pag-ant') as HTMLButtonElement | null;
            const btnSig = document.getElementById('respaldo-pag-sig') as HTMLButtonElement | null;
            if (btnAnt) {
                if (this.paginaRespaldos === 1) {
                    btnAnt.classList.add('opacity-30', 'pointer-events-none');
                    btnAnt.classList.remove('hover:bg-gray-100');
                } else {
                    btnAnt.classList.remove('opacity-30', 'pointer-events-none');
                    btnAnt.classList.add('hover:bg-gray-100');
                }
            }
            if (btnSig) {
                if (this.paginaRespaldos === totalPag) {
                    btnSig.classList.add('opacity-30', 'pointer-events-none');
                    btnSig.classList.remove('hover:bg-gray-100');
                } else {
                    btnSig.classList.remove('opacity-30', 'pointer-events-none');
                    btnSig.classList.add('hover:bg-gray-100');
                }
            }
        };

        document.getElementById('respaldo-pag-ant')?.addEventListener('click', () => {
            if (this.paginaRespaldos > 1) {
                this.paginaRespaldos--;
                refrescarPaginacionRespaldos();
            }
        });
        document.getElementById('respaldo-pag-sig')?.addEventListener('click', () => {
            const totalPag = Math.max(1, Math.ceil(this.respaldos.length / this.POR_PAGINA_RESPALDOS));
            if (this.paginaRespaldos < totalPag) {
                this.paginaRespaldos++;
                refrescarPaginacionRespaldos();
            }
        });

        const btnBackup = document.getElementById('btn-crear-backup') as HTMLButtonElement | null;
        btnBackup?.addEventListener('click', async () => {
            if (btnBackup.disabled) return;
            btnBackup.disabled = true;
            const textoOriginal = btnBackup.textContent;
            btnBackup.textContent = 'CREANDO...';
            try {
                await api.crearRespaldo();
                this.respaldos = await api.respaldos();
                this.paginaRespaldos = 1;
                refrescarPaginacionRespaldos();
                this.mostrarToast('Copia de respaldo generada exitosamente.', 'success');
            } catch (e) {
                this.mostrarToast('Error generando respaldo: ' + (e instanceof Error ? e.message : String(e)), 'error');
            } finally {
                btnBackup.disabled = false;
                btnBackup.textContent = textoOriginal || '+ COPIA';
            }
        });

        // Eventos y renderizado de Jornada Laboral y Operadores
        const refrescarModuloJornada = async () => {
            const j = await api.obtenerJornadaActual();
            const operadores = await api.listarOperadores();
            const semaforo = await api.obtenerSemaforoStock();

            const estadoTexto = document.getElementById('jornada-estado-texto');
            const fechasTexto = document.getElementById('jornada-fechas-texto');
            const opActivo = document.getElementById('jornada-operador-activo');
            const balanceTexto = document.getElementById('jornada-balance-texto');
            const ticketsTexto = document.getElementById('jornada-tickets-texto');
            const boxAcciones = document.getElementById('box-acciones-jornada');
            const chipsBox = document.getElementById('lista-operadores-chips');

            const estaActiva = j?.estado === 'abierta';
            if (estadoTexto) estadoTexto.textContent = estaActiva ? 'Jornada en Curso' : 'Jornada Cerrada';
            if (fechasTexto) fechasTexto.textContent = estaActiva
                ? `Inicio: ${j?.inicioStr || 'Reciente'}`
                : `Último cierre: ${j?.finStr || 'Sin jornadas'}`;
            const opsActivosNombres = (j?.operadoresActivos && j.operadoresActivos.length > 0)
                ? j.operadoresActivos.join(', ')
                : (j?.operadorActual?.trim() || 'Sin operador asignado');
            if (opActivo) opActivo.textContent = opsActivosNombres;
            if (balanceTexto) balanceTexto.textContent = `$ ${fmt(j?.ventasTotalUsd || 0)} USD (Bs. ${fmt(j?.ventasTotalBs || 0)})`;
            if (ticketsTexto) ticketsTexto.textContent = `${j?.ticketsEmitidos || 0} tickets emitidos · ${j?.entradasStockReg || 0} reposiciones`;

            if (boxAcciones) {
                if (estaActiva) {
                    boxAcciones.innerHTML = `
                        <button id="btn-cerrar-jornada" class="bg-red-600 hover:bg-red-700 text-white font-heading font-black text-xs px-3 py-1.5 rounded border-2 border-brand-black shadow-brutal-sm">
                            CERRAR JORNADA Y EMITIR INFORME
                        </button>
                    `;
                } else {
                    boxAcciones.innerHTML = `
                        <button id="btn-abrir-jornada" class="bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-black text-xs px-3 py-1.5 rounded border-2 border-brand-black shadow-brutal-sm">
                            ABRIR NUEVA JORNADA
                        </button>
                    `;
                }
                boxAcciones.querySelector('#btn-abrir-jornada')?.addEventListener('click', async () => {
                    try {
                        const ops = (await api.listarOperadores()).filter(o => o.activo);
                        if (ops.length === 0) {
                            this.mostrarToast('No hay operadores activos. Registre uno primero.', 'error');
                            return;
                        }
                        const primerOp = ops[0]?.nombre || 'Cajero Principal';
                        await api.abrirJornada(primerOp, ops.map(o => o.nombre));
                        this.mostrarToast('Jornada abierta exitosamente.', 'success');
                        void refrescarModuloJornada();
                    } catch (e) {
                        this.mostrarToast('Error al abrir jornada: ' + (e instanceof Error ? e.message : String(e)), 'error');
                    }
                });
                boxAcciones.querySelector('#btn-cerrar-jornada')?.addEventListener('click', async () => {
                    try {
                        const [jornadaActual, tickets] = await Promise.all([
                            api.obtenerJornadaActual(),
                            api.ventas(),
                        ]);
                        if (!jornadaActual) {
                            this.mostrarToast('No hay una jornada activa para cerrar.', 'error');
                            return;
                        }

                        const inicioUnix = jornadaActual.inicioUnix || 0;
                        const ticketsTurno = tickets.filter(t => {
                            const fUnix = t.fechaUnix || this.obtenerTimestampTicket(t);
                            return fUnix >= inicioUnix;
                        });

                        const porMetodo: Record<string, { usd: number; bs: number; transacciones: number }> = {};
                        let totalUsd = 0;
                        let totalBs = 0;

                        ticketsTurno.forEach(t => {
                            totalUsd += parseNum(t.totalUsd);
                            totalBs += parseNum(t.totalBs);
                            if (Array.isArray(t.pagos) && t.pagos.length > 0) {
                                t.pagos.forEach(p => {
                                    const met = p.metodo || 'EFECTIVO';
                                    if (!porMetodo[met]) {
                                        porMetodo[met] = { usd: 0, bs: 0, transacciones: 0 };
                                    }
                                    porMetodo[met].usd += parseNum(p.montoUsd);
                                    porMetodo[met].bs += parseNum(p.montoBs);
                                    porMetodo[met].transacciones += 1;
                                });
                            } else {
                                const met = 'VENTA DIRECTA';
                                if (!porMetodo[met]) {
                                    porMetodo[met] = { usd: 0, bs: 0, transacciones: 0 };
                                }
                                porMetodo[met].usd += parseNum(t.totalUsd);
                                porMetodo[met].bs += parseNum(t.totalBs);
                                porMetodo[met].transacciones += 1;
                            }
                        });

                        const ops = (jornadaActual.operadoresActivos && jornadaActual.operadoresActivos.length > 0)
                            ? jornadaActual.operadoresActivos.join(', ')
                            : (jornadaActual.operadorActual || 'Principal');

                        const confirmacion = await confirmarArqueoCierreJornada({
                            totalUsd,
                            totalBs,
                            totalTickets: ticketsTurno.length,
                            vueltoPagadoBs: parseNum(jornadaActual.vueltoPagadoBs),
                            vueltoRetenidoBs: parseNum(jornadaActual.vueltoRetenidoBs),
                            tasaInicio: parseNum(jornadaActual.tasaInicio),
                            operadores: ops,
                            inicioStr: jornadaActual.inicioStr || formatFechaHoraVet(inicioUnix),
                            porMetodo,
                        });

                        if (confirmacion) {
                            const cerrada = await cerrarJornadaGuiada();
                            if (cerrada) {
                                this.mostrarToast(`Jornada cerrada. Total: $${fmt(cerrada.ventasTotalUsd)} USD (Bs. ${fmt(cerrada.ventasTotalBs)})`, 'success');
                                void refrescarModuloJornada();
                            }
                        }
                    } catch (e) {
                        this.mostrarToast('Error al cerrar jornada: ' + (e instanceof Error ? e.message : String(e)), 'error');
                    }
                });
            }

            if (chipsBox) {
                chipsBox.innerHTML = operadores.map(op => {
                    const estaEnTurno = j?.operadoresActivos?.includes(op.nombre) || j?.operadorActual?.includes(op.nombre);
                    return `
                    <div class="inline-flex items-center gap-1.5 border-2 border-brand-black rounded px-2 py-1 text-xs font-bold ${estaEnTurno ? 'bg-purple-100 text-brand-purple border-brand-purple' : 'bg-gray-100 text-brand-black'}">
                        <span>${op.nombre}</span>
                        <span class="text-[9px] uppercase px-1 rounded ${op.activo ? 'bg-green-200 text-green-900' : 'bg-gray-300 text-gray-700'}">${op.activo ? 'Activo' : 'Inactivo'}</span>
                        <button data-op-edit="${op.id}" data-op-nom="${op.nombre}" title="Editar nombre" class="hover:text-blue-600 ml-1 text-[11px] font-mono font-bold bg-white border border-gray-300 rounded px-1">✎</button>
                        <button data-op-del="${op.id}" data-op-nom="${op.nombre}" title="Eliminar operador" class="hover:text-red-600 text-[11px] font-mono font-bold bg-white border border-gray-300 rounded px-1">✕</button>
                    </div>
                `;
                }).join('');

                chipsBox.querySelectorAll<HTMLButtonElement>('button[data-op-edit]').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const id = btn.dataset.opEdit || '';
                        const actual = btn.dataset.opNom || '';
                        const nuevo = await pedirValor('Editar nombre del operador:', actual, 'EDITAR OPERADOR');
                        if (nuevo && nuevo.trim() && nuevo.trim() !== actual) {
                            await api.editarOperador(id, nuevo.trim());
                            void refrescarModuloJornada();
                        }
                    });
                });

                chipsBox.querySelectorAll<HTMLButtonElement>('button[data-op-del]').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const id = btn.dataset.opDel || '';
                        const nom = btn.dataset.opNom || '';
                        const confirma = await confirmarAccion(`¿Eliminar al operador "${nom}"?`, 'ELIMINAR OPERADOR');
                        if (confirma) {
                            await api.eliminarOperador(id);
                            void refrescarModuloJornada();
                        }
                    });
                });
            }

            // Renderizar métodos de pago en panel
            const metodosBox = document.getElementById('lista-metodos-pago-panel');
            if (metodosBox) {
                const metodos = await api.listarMetodosPago();
                metodosBox.innerHTML = metodos.map(m => `
                    <div class="inline-flex items-center gap-2 border-2 border-brand-black rounded px-3 py-1.5 text-xs font-bold ${m.moneda === 'BS' ? 'bg-amber-50' : 'bg-blue-50'}">
                        <span>${m.nombre}</span>
                        <span class="text-[9px] uppercase px-1.5 py-0.5 rounded font-black ${m.moneda === 'BS' ? 'bg-amber-200 text-amber-900' : 'bg-blue-200 text-blue-900'}">${m.moneda === 'BS' ? 'Bolívares' : 'Dólares'}</span>
                        <button data-metodo-del="${m.nombre}" title="Eliminar método de pago" class="text-gray-400 hover:text-red-600 font-black text-xs ml-1 bg-white border border-gray-300 rounded px-1.5 py-0.5">✕</button>
                    </div>
                `).join('');

                metodosBox.querySelectorAll<HTMLButtonElement>('button[data-metodo-del]').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const nombre = btn.dataset.metodoDel || '';
                        const confirma = await confirmarAccion(`¿Confirmas eliminar el método de pago "${nombre}"?`, 'ELIMINAR MÉTODO');
                        if (confirma) {
                            await api.eliminarMetodoPago(nombre);
                            void refrescarModuloJornada();
                        }
                    });
                });
            }

            // Umbrales semáforo
            const inRojo = document.getElementById('in-semaforo-rojo') as HTMLInputElement | null;
            const inAmarillo = document.getElementById('in-semaforo-amarillo') as HTMLInputElement | null;
            if (inRojo && !inRojo.dataset.modificado) inRojo.value = String(semaforo.rojoMax);
            if (inAmarillo && !inAmarillo.dataset.modificado) inAmarillo.value = String(semaforo.amarilloMax);
        };

        void refrescarModuloJornada();

        // Asignar operadores múltiples al turno (con modal en vez de window.prompt)
        document.getElementById('btn-relevar-operador')?.addEventListener('click', async () => {
            const ops = (await api.listarOperadores()).filter(o => o.activo);
            if (ops.length === 0) {
                this.mostrarToast('No hay operadores activos disponibles. Registre uno a continuación.', 'error');
                return;
            }
            const j = await api.obtenerJornadaActual();
            const actuales = j?.operadoresActivos || [j?.operadorActual || ''];

            const modalRoot = document.getElementById('modal-root') || document.body;
            const modalDiv = document.createElement('div');
            modalDiv.id = 'modal-asignar-operadores';
            modalDiv.innerHTML = `
                <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
                    <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div class="flex justify-between items-center border-b-2 border-brand-black pb-2 mb-3">
                            <h3 class="font-heading font-black text-xl">ASIGNAR OPERADORES AL TURNO</h3>
                            <button id="modal-asig-close" class="w-8 h-8 rounded border-2 border-brand-black font-black flex items-center justify-center hover:bg-gray-100">&times;</button>
                        </div>
                        <p class="text-xs text-gray-600 font-bold mb-3">Selecciona los operadores que atenderán en este turno:</p>
                        <div class="space-y-2 max-h-56 overflow-y-auto pr-1 mb-4">
                            ${ops.map(op => {
                                const seleccionado = actuales.some(a => a.toLowerCase() === op.nombre.toLowerCase());
                                return `
                                <label class="flex items-center gap-2.5 p-2.5 rounded border-2 border-brand-black cursor-pointer ${seleccionado ? 'bg-purple-50 border-brand-purple' : 'bg-gray-50'}">
                                    <input type="checkbox" data-asig-chk="${op.nombre}" ${seleccionado ? 'checked' : ''} class="w-4 h-4 rounded text-brand-purple" />
                                    <div>
                                        <span class="font-heading font-black text-sm text-brand-black">${op.nombre}</span>
                                        <span class="text-[10px] text-gray-500 font-bold ml-2">${op.activo ? 'Activo' : 'Inactivo'}</span>
                                    </div>
                                </label>`;
                            }).join('')}
                        </div>
                        <div class="grid grid-cols-2 gap-3 border-t-2 border-brand-black pt-3">
                            <button id="modal-asig-cancelar" class="bg-white border-2 border-brand-black font-heading font-black py-2.5 rounded text-xs">CANCELAR</button>
                            <button id="modal-asig-guardar" class="bg-brand-purple text-white font-heading font-black py-2.5 rounded border-2 border-brand-black shadow-brutal-sm text-xs">ASIGNAR A TURNO</button>
                        </div>
                    </div>
                </div>`;
            modalRoot.appendChild(modalDiv);

            const cerrarModal = () => modalDiv.remove();
            modalDiv.querySelector('#modal-asig-close')?.addEventListener('click', cerrarModal);
            modalDiv.querySelector('#modal-asig-cancelar')?.addEventListener('click', cerrarModal);
            modalDiv.querySelector('#modal-asig-guardar')?.addEventListener('click', async () => {
                const checked = modalDiv.querySelectorAll<HTMLInputElement>('input[data-asig-chk]:checked');
                const nombres: string[] = [];
                checked.forEach(cb => { if (cb.dataset.asigChk) nombres.push(cb.dataset.asigChk); });
                if (nombres.length === 0) {
                    this.mostrarToast('Selecciona al menos un operador para el turno.', 'error');
                    return;
                }
                await api.asignarOperadoresTurno(nombres);
                cerrarModal();
                void refrescarModuloJornada();
            });
        });

        // Crear método de pago desde Panel
        document.getElementById('form-crear-metodo-panel')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inNom = document.getElementById('in-nuevo-metodo-nombre') as HTMLInputElement | null;
            const selMon = document.getElementById('select-nuevo-metodo-moneda') as HTMLSelectElement | null;
            const nom = inNom?.value.trim() || '';
            const moneda = (selMon?.value === 'USD' ? 'USD' : 'BS') as MonedaMetodo;
            if (nom) {
                await api.crearMetodoPago(nom, moneda);
                if (inNom) inNom.value = '';
                void refrescarModuloJornada();
            }
        });

        // Crear operador
        document.getElementById('form-crear-operador')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('in-nuevo-operador') as HTMLInputElement | null;
            const nom = input?.value.trim() || '';
            if (nom) {
                await api.crearOperador(nom);
                if (input) input.value = '';
                void refrescarModuloJornada();
            }
        });

        // Guardar semáforo
        document.getElementById('form-semaforo-stock')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inRojo = document.getElementById('in-semaforo-rojo') as HTMLInputElement | null;
            const inAmarillo = document.getElementById('in-semaforo-amarillo') as HTMLInputElement | null;
            const msg = document.getElementById('msg-semaforo-stock');
            const r = parseInt(inRojo?.value || '5', 10);
            const a = parseInt(inAmarillo?.value || '15', 10);
            if (r >= a) {
                this.mostrarToast('El umbral rojo debe ser estrictamente menor que el umbral amarillo.', 'error');
                return;
            }
            await api.guardarSemaforoStock(r, a);
            if (msg) {
                msg.textContent = 'Umbrales del semáforo guardados y aplicados a todo el sistema.';
                msg.classList.remove('hidden');
                setTimeout(() => msg.classList.add('hidden'), 2500);
            }
        });

        document.getElementById('btn-reset-semaforo')?.addEventListener('click', async () => {
            await api.guardarSemaforoStock(5, 15);
            void refrescarModuloJornada();
        });

        // Cambio de Clave Maestra del Dueño
        document.getElementById('form-cambiar-clave')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inAct = document.getElementById('pin-actual') as HTMLInputElement | null;
            const inNue = document.getElementById('pin-nuevo') as HTMLInputElement | null;
            const msgEl = document.getElementById('msg-cambio-clave');
            if (!msgEl) return;

            try {
                await api.cambiarPinDueno(inAct?.value.trim() || '', inNue?.value.trim() || '');
                await this.modelo.cargarConfig();
                msgEl.textContent = inNue?.value.trim()
                    ? 'Clave actualizada exitosamente. El panel requerirá esta nueva clave para ingresar.'
                    : 'Clave eliminada. El panel ha quedado en modo abierto sin clave.';
                msgEl.style.color = '#00823B';
                msgEl.classList.remove('hidden');
                setTimeout(() => void this.render(), 1200);
            } catch (err) {
                msgEl.textContent = err instanceof Error ? err.message : String(err);
                msgEl.style.color = '#C60C15';
                msgEl.classList.remove('hidden');
            }
        });
    }

    private aplicarFiltroFechas(datosBase: PanelDatos): void {
        const inDesde = document.getElementById('filtro-fecha-desde') as HTMLInputElement | null;
        const inHasta = document.getElementById('filtro-fecha-hasta') as HTMLInputElement | null;
        const labelEstado = document.getElementById('label-estado-fechas');
        const cuerpoTabla = document.getElementById('tabla-transacciones-body');
        const badgeConteo = document.getElementById('conteo-transacciones-badge');

        const valDesde = inDesde?.value.trim() || '';
        const valHasta = inHasta?.value.trim() || '';

        if (!valDesde && !valHasta) {
            if (labelEstado) {
                labelEstado.textContent = 'Selecciona una fecha Desde o Hasta para iniciar el diagnóstico.';
                labelEstado.classList.remove('hidden');
            }
            return;
        }

        let unixDesde = 0;
        let unixHasta = Number.MAX_SAFE_INTEGER;

        if (valDesde) {
            const [y, m, d] = valDesde.split('-').map(Number);
            unixDesde = Math.floor(new Date(y, m - 1, d, 0, 0, 0, 0).getTime() / 1000);
        }
        if (valHasta) {
            const [y, m, d] = valHasta.split('-').map(Number);
            unixHasta = Math.floor(new Date(y, m - 1, d, 23, 59, 59, 999).getTime() / 1000);
        }

        if (unixDesde > unixHasta) {
            if (labelEstado) {
                labelEstado.textContent = 'Rango inválido: la fecha "Desde" es posterior a la fecha "Hasta".';
                labelEstado.classList.remove('hidden');
            }
            return;
        }

        const filtradas = this.transacciones.filter((t) => {
            const ts = this.obtenerTimestampTicket(t);
            return ts >= unixDesde && ts <= unixHasta;
        });

        const vUsd = filtradas.reduce((a, b) => a + parseNum(b.totalUsd), 0);
        const vBs = filtradas.reduce((a, b) => a + parseNum(b.totalBs), 0);
        const tCount = filtradas.length;

        // Calculate real margin from product costs
        let costoTotal = 0;
        filtradas.forEach((t) => {
            (t.lineas || []).forEach((l) => {
                const prod = this.productos.find((p) => p.sku === l.sku);
                if (prod) {
                    // El costo se multiplica por las unidades fisicas de la
                    // presentacion (caja/six-pack), no por la cantidad nominal.
                    const modo = (l.modoVenta || 'unidad').toLowerCase();
                    const pres = modo !== 'unidad'
                        ? prod.presentaciones?.find((p) => p.nombre.toLowerCase() === modo)
                        : undefined;
                    const esPaquete = !pres && modo === 'paquete' &&
                        (prod.precioPaqueteUsd || (prod.esCaja && prod.unidadesPorCaja && prod.unidadesPorCaja > 1));
                    const factor = pres ? pres.unidades : (esPaquete ? (prod.unidadesPorCaja || 1) : 1);
                    costoTotal += parseNum(prod.precioBrutoUsd) * parseNum(l.cantidad) * factor;
                }
            });
        });
        const ganBruta = Math.max(0, vUsd - costoTotal);
        // Los precios ya son finales (impuesto incluido): no se descuenta 5% fijo.
        const ganNeta = ganBruta;
        const ganNetaBs = ganNeta * (this.modelo.tasaActual);
        const prom = tCount > 0 ? (vUsd / tCount).toFixed(2) : '0.00';

        const elUsd = document.getElementById('kpi-ventas-usd');
        const elBs = document.getElementById('kpi-ventas-bs');
        const elT = document.getElementById('kpi-tickets');
        const elGanBruta = document.getElementById('kpi-gan-bruta');
        const elGanNeta = document.getElementById('kpi-gan-neta');
        const elGanNetaBs = document.getElementById('kpi-gan-neta-bs');
        const elProm = document.getElementById('kpi-ticket-prom');

        if (elUsd) elUsd.textContent = '$ ' + fmt(vUsd);
        if (elBs) {
            elBs.textContent = 'Bs. ' + fmtCompactoBs(vBs);
            elBs.title = 'Bs. ' + fmt(vBs);
        }
        if (elT) elT.textContent = String(tCount);
        if (elGanBruta) elGanBruta.textContent = '$ ' + fmt(ganBruta);
        if (elGanNeta) elGanNeta.textContent = '$ ' + fmt(ganNeta);
        if (elGanNetaBs) {
            elGanNetaBs.textContent = 'Bs. ' + fmtCompactoBs(ganNetaBs);
            elGanNetaBs.title = 'Bs. ' + fmt(ganNetaBs);
        }
        if (elProm) elProm.textContent = '$ ' + prom;

        if (cuerpoTabla) {
            cuerpoTabla.innerHTML = this.renderFilasTransacciones(filtradas);
        }
        if (badgeConteo) {
            badgeConteo.textContent = `${filtradas.length} transacciones en rango`;
        }

        const rangoBotones = this.contenedor.querySelectorAll<HTMLButtonElement>('[data-rango]');
        rangoBotones.forEach((b) => {
            b.className = 'w-12 sm:w-14 h-8 flex items-center justify-center font-heading font-bold text-xs rounded text-brand-black hover:bg-gray-100 transition-colors shrink-0';
        });

        const mapaProds: Record<string, { nombre: string; cantidad: number; totalUsd: number }> = {};
        filtradas.forEach((t) => {
            (t.lineas || []).forEach((l) => {
                if (!mapaProds[l.nombre]) {
                    mapaProds[l.nombre] = { nombre: l.nombre, cantidad: 0, totalUsd: 0 };
                }
                mapaProds[l.nombre].cantidad += Number(l.cantidad) || 0;
                mapaProds[l.nombre].totalUsd += parseNum(l.subtotalUsd) || (Number(l.cantidad) * parseNum(l.precioUsd));
            });
        });
        const totalTopUsd = Object.values(mapaProds).reduce((a, b) => a + b.totalUsd, 0) || 1;
        const topProductosFiltrados = Object.values(mapaProds)
            .sort((a, b) => b.totalUsd - a.totalUsd)
            .map((p) => ({
                nombre: p.nombre,
                cantidad: String(p.cantidad),
                totalUsd: p.totalUsd.toFixed(2),
                porcentaje: ((p.totalUsd / totalTopUsd) * 100).toFixed(1),
            }));

        const datosSim: PanelDatos = {
            ...datosBase,
            ventas24hUsd: vUsd.toFixed(2),
            ventas24hBs: vBs.toFixed(2),
            gananciaBrutaUsd: ganBruta.toFixed(2),
            gananciaNetaUsd: ganNeta.toFixed(2),
            tickets24h: tCount,
            topProductos: topProductosFiltrados.length > 0 ? topProductosFiltrados : (filtradas.length === 0 ? [] : datosBase.topProductos),
        };
        this.vm.setDatos(datosSim);
        void this.pintarGrafico(datosSim);

        const fmtFH = (d: Date) => d.toLocaleString('es-VE', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
        });
        const dateDesde = valDesde ? new Date(unixDesde * 1000) : new Date(2020, 0, 1);
        const dateHasta = valHasta ? new Date(unixHasta * 1000) : new Date();
        this.rangoDetalleFechas = `Del ${fmtFH(dateDesde)} al ${fmtFH(dateHasta)}`;

        if (labelEstado) {
            const desdeTexto = valDesde || 'Inicio';
            const hastaTexto = valHasta || 'Actualidad';
            labelEstado.textContent = `Diagnóstico activo (${desdeTexto} al ${hastaTexto}): ${filtradas.length} transacciones registradas`;
            labelEstado.classList.remove('hidden');
        }
    }

    private aplicarRango(rango: string, datosBase: PanelDatos): void {
        const ahora = new Date();
        const fmtFH = (d: Date) => d.toLocaleString('es-VE', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
        });

        let ms = 86400000;
        if (rango === '7d') { ms = 7 * 86400000; }
        else if (rango === '30d') { ms = 30 * 86400000; }
        else if (rango === '1a') { ms = 365 * 86400000; }
        else if (rango === 'todo') { ms = 5 * 365 * 86400000; }

        const desdeDate = new Date(ahora.getTime() - ms);
        this.rangoDetalleFechas = `Del ${fmtFH(desdeDate)} al ${fmtFH(ahora)}`;
        const tsDesde = Math.floor(desdeDate.getTime() / 1000);
        const filtradasRango = this.transacciones.filter((t) => this.obtenerTimestampTicket(t) >= tsDesde);

        // Calculate totals from filtered transactions instead of multiplying 24h values
        const tasaActual = this.modelo.tasaActual;
        let vUsd = 0;
        let vBs = 0;
        filtradasRango.forEach((t) => {
            vUsd += parseNum(t.totalUsd);
            vBs += parseNum(t.totalBs);
        });
        const tCount = filtradasRango.length;

        const elUsd = document.getElementById('kpi-ventas-usd');
        const elBs = document.getElementById('kpi-ventas-bs');
        const elT = document.getElementById('kpi-tickets');
        const elGanBruta = document.getElementById('kpi-gan-bruta');
        const elGanNeta = document.getElementById('kpi-gan-neta');
        const elGanNetaBs = document.getElementById('kpi-gan-neta-bs');
        const elProm = document.getElementById('kpi-ticket-prom');

        if (elUsd) elUsd.textContent = '$ ' + fmt(vUsd);
        if (elBs) {
            elBs.textContent = 'Bs. ' + fmtCompactoBs(vBs);
            elBs.title = 'Bs. ' + fmt(vBs);
        }
        if (elT) elT.textContent = String(tCount);
        if (elGanBruta) elGanBruta.textContent = '$ ' + fmt(vUsd * this.margenBrutoPct / 100);
        if (elGanNeta) elGanNeta.textContent = '$ ' + fmt(vUsd * this.margenNetoPct / 100);
        if (elGanNetaBs) {
            const netoBs = vUsd * this.margenNetoPct / 100 * tasaActual;
            elGanNetaBs.textContent = 'Bs. ' + fmtCompactoBs(netoBs);
            elGanNetaBs.title = 'Bs. ' + fmt(netoBs);
        }
        if (elProm) elProm.textContent = '$ ' + (tCount > 0 ? (vUsd / tCount).toFixed(2) : '0.00');

        // Build top products from filtered transactions
        const productoMap = new Map<string, { nombre: string; cantidad: number; totalUsd: number }>();
        filtradasRango.forEach((t) => {
            t.lineas?.forEach((l) => {
                const existing = productoMap.get(l.sku);
                if (existing) {
                    existing.cantidad += parseNum(l.cantidad);
                    existing.totalUsd += parseNum(l.subtotalUsd);
                } else {
                    productoMap.set(l.sku, {
                        nombre: l.nombre,
                        cantidad: parseNum(l.cantidad),
                        totalUsd: parseNum(l.subtotalUsd),
                    });
                }
            });
        });
        const topProductosFiltrado = Array.from(productoMap.values())
            .sort((a, b) => b.totalUsd - a.totalUsd)
            .slice(0, 10)
            .map((p) => ({
                nombre: p.nombre,
                cantidad: String(Math.round(p.cantidad)),
                totalUsd: p.totalUsd > 0 ? String(p.totalUsd.toFixed(2)) : undefined,
                porcentaje: vUsd > 0 ? ((p.totalUsd / vUsd) * 100).toFixed(1) : '0.0',
            }));

        const datosSim: PanelDatos = {
            ...datosBase,
            topProductos: topProductosFiltrado,
        };
        this.vm.setDatos(datosSim);
        void this.pintarGrafico(datosSim);
    }

    private kpi(titulo: string, valor: string, sub: string, fondo: string, tooltip: string = ''): string {
        return `
        <div class="border-2 border-brand-black rounded-lg shadow-brutal-sm p-4 ${fondo} flex flex-col justify-between min-w-0 overflow-hidden" title="${tooltip}">
            <p class="font-heading font-bold text-xs uppercase tracking-wide text-brand-text truncate">${titulo}</p>
            <div class="font-heading font-black text-xl lg:text-2xl mt-1 min-w-0">${valor}</div>
            <div class="text-xs font-body text-brand-text truncate mt-1">${sub}</div>
            ${tooltip ? `<div class="text-[10px] text-gray-500 font-bold truncate mt-0.5 border-t border-gray-200/60 pt-1">${tooltip}</div>` : ''}
        </div>`;
    }

    private async pintarGrafico(datos: PanelDatos): Promise<void> {
        const box = this.contenedor.querySelector<HTMLElement>('#panel-chart-container');
        if (!box) return;

        if (datos.topProductos.length === 0) {
            box.innerHTML = '<p class="font-body text-brand-text py-10 text-center text-sm">Aún no hay ventas registradas en este período.</p>';
            return;
        }

        const paleta = [
            '#2563EB', '#D97706', '#10B981', '#8B5CF6', '#EC4899',
            '#06B6D4', '#F97316', '#84CC16', '#6366F1', '#14B8A6',
            '#F43F5E', '#A855F7', '#EAB308', '#64748B',
        ];

        // Criterio dinámico: Volumen de Unidades vs Ingresos Brutos en USD
        const esVolumen = this.criterioGrafica === 'volumen';
        const valoresNumericos = datos.topProductos.map((p) =>
            esVolumen ? Number(p.cantidad) : Number(p.totalUsd || Number(p.cantidad) * 8.5)
        );
        const totalMagnitud = valoresNumericos.reduce((a, b) => a + b, 0) || 1;

        // Mostrar todos los artículos del catálogo comercial con su porcentaje real
        const itemsGrafica = datos.topProductos.map((p, idx) => ({
            nombre: p.nombre,
            valor: valoresNumericos[idx],
            porcentaje: ((valoresNumericos[idx] / totalMagnitud) * 100).toFixed(1),
        }));

        // Construcción de Pie Chart macizo (Torta completa sin centro hueco) en SVG puro
        let acumuladoAngulo = 0;
        const cx = 95;
        const cy = 95;
        const r = 85;

        let slicesSvg = '';
        if (itemsGrafica.length === 1) {
            slicesSvg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${paleta[0]}" stroke="#1E232A" stroke-width="2" />`;
        } else {
            itemsGrafica.forEach((p, idx) => {
                const fraccion = p.valor / totalMagnitud;
                const angulo = fraccion * 2 * Math.PI;
                const inicioAngulo = acumuladoAngulo;
                const finAngulo = acumuladoAngulo + angulo;

                const x1 = cx + r * Math.cos(inicioAngulo);
                const y1 = cy + r * Math.sin(inicioAngulo);
                const x2 = cx + r * Math.cos(finAngulo);
                const y2 = cy + r * Math.sin(finAngulo);

                const granArco = angulo > Math.PI ? 1 : 0;
                const color = paleta[idx % paleta.length];

                slicesSvg += `
                    <path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${granArco} 1 ${x2} ${y2} Z"
                        fill="${color}" stroke="#1E232A" stroke-width="1.5"
                        class="hover:opacity-85 transition-opacity cursor-pointer">
                        <title>${p.nombre}: ${p.porcentaje}%</title>
                    </path>
                `;
                acumuladoAngulo += angulo;
            });
        }

        const leyendaHtml = itemsGrafica.map((p, idx) => {
            const color = paleta[idx % paleta.length];
            const displayVal = esVolumen ? `${p.valor} un.` : `$ ${fmt(p.valor)}`;
            return `
                <tr class="border-b border-gray-100 last:border-none">
                    <td class="py-2 pr-3 flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full inline-block border border-brand-black shrink-0" style="background-color: ${color}"></span>
                        <span class="font-bold text-xs truncate max-w-[180px]" title="${p.nombre}">${p.nombre}</span>
                    </td>
                    <td class="py-2 text-right font-black text-xs pr-2">${displayVal}</td>
                    <td class="py-2 text-right font-mono text-xs font-bold text-gray-500">${p.porcentaje}%</td>
                </tr>
            `;
        }).join('');

        const totalConsolidado = esVolumen ? `${Math.round(totalMagnitud)} un.` : `$ ${fmt(totalMagnitud)}`;

        box.innerHTML = `
        <div class="flex flex-col md:flex-row items-center justify-around gap-4 sm:gap-6 w-full h-full py-2 min-w-0">
            <div class="shrink-0 flex flex-col items-center justify-center my-2">
                <svg width="190" height="190" viewBox="0 0 190 190" class="drop-shadow-sm">
                    ${slicesSvg}
                </svg>
                <span class="text-[11px] font-black uppercase text-brand-black bg-gray-100 border border-brand-black px-2.5 py-0.5 rounded mt-2">
                    Total: ${totalConsolidado}
                </span>
            </div>
            <div class="w-full min-w-0 max-h-56 overflow-y-auto pr-1">
                <table class="w-full text-left">
                    <thead class="sticky top-0 bg-white">
                        <tr class="text-[10px] uppercase font-heading font-bold text-gray-400 border-b border-brand-black">
                            <th class="pb-1">Producto (${itemsGrafica.length})</th>
                            <th class="pb-1 text-right">${esVolumen ? 'Volumen' : 'Ingresos'}</th>
                            <th class="pb-1 text-right">Part.</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${leyendaHtml}
                    </tbody>
                </table>
            </div>
        </div>`;
    }

    private mostrarToast(mensaje: string, tipo: 'success' | 'error' | 'info' = 'info'): void {
        const colores = {
            success: 'bg-emerald-600 text-white',
            error: 'bg-red-600 text-white',
            info: 'bg-brand-black text-white',
        };
        const toast = document.createElement('div');
        toast.className = `fixed bottom-6 right-6 ${colores[tipo]} border-2 border-brand-black rounded shadow-brutal px-5 py-4 font-heading font-bold max-w-md z-[110]`;
        toast.innerHTML = `${mensaje.replace(/"/g, '')} <button class="ml-3 underline font-black">cerrar</button>`;
        toast.querySelector('button')?.addEventListener('click', () => toast.remove());
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 8000);
    }
}
