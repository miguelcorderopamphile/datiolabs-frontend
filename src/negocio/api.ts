import { horaActualVet, fechaHoraActualVet } from './dateUtils';

export const RUBRO_ABASTO = 1 << 0;
export const RUBRO_PANADERIA = 1 << 1;
export const RUBRO_LICORERIA = 1 << 2;
export const RUBRO_RETAIL = 1 << 3;
export const RUBRO_UNIVERSAL = RUBRO_ABASTO | RUBRO_PANADERIA | RUBRO_LICORERIA | RUBRO_RETAIL;

export const CAP_UNITARIA = 1 << 0;
export const CAP_PESABLE = 1 << 1;
export const CAP_PERECEDERO = 1 << 2;
export const CAP_CUENTA_ABIERTA = 1 << 3;
export const CAP_SERIE = 1 << 4;
export const CAP_VARIANTES = 1 << 5;
export const CAP_GARANTIA = 1 << 6;
export const CAP_COMISION = 1 << 7;
export const TODAS_LAS_CAPACIDADES = CAP_UNITARIA | CAP_PESABLE | CAP_PERECEDERO | CAP_CUENTA_ABIERTA | CAP_SERIE | CAP_VARIANTES | CAP_GARANTIA | CAP_COMISION;

/**
 * Lista canónica de las 10 licencias universales oficiales de DatioLabs.
 *
 * Es la única fuente de verdad en el frontend y espejo exacto de
 * `CLAVES_UNIVERSALES` en Rust. La validación es por igualdad exacta:
 * sin checksums ni generadores derivados.
 */
export const CLAVES_UNIVERSALES: readonly string[] = [
    '0000000000000000',
    '0000000000000001',
    '0000000000000002',
    '0000000000000003',
    '0000000000000004',
    '0000000000000005',
    '0000000000000006',
    '0000000000000007',
    '0000000000000008',
    '0000000000000009',
];

/**
 * Total de licencias universales oficiales admitidas.
 */
export const TOTAL_LICENCIAS_UNIVERSALES = CLAVES_UNIVERSALES.length;

/**
 * Normaliza una clave quitando todo lo que no sea dígito (guiones, espacios).
 */
export function normalizarLicencia(clave: string): string {
    return (clave || '').replace(/[^0-9]/g, '');
}

/**
 * Valida una clave universal por igualdad exacta contra la lista canónica.
 */
export function validarLicenciaUniversal(clave: string): boolean {
    return CLAVES_UNIVERSALES.includes(normalizarLicencia(clave));
}

/**
 * Retorna la clave de una ranura específica (0..9) desde la lista canónica.
 */
export function generarLicenciaSlot(slot: number): string {
    return CLAVES_UNIVERSALES[Math.abs(slot) % TOTAL_LICENCIAS_UNIVERSALES];
}

/**
 * Retorna la lista inmutable de las 10 licencias universales oficiales de DatioLabs.
 */
export function generar10LicenciasUniversales(): string[] {
    return [...CLAVES_UNIVERSALES];
}

/**
 * Genera una licencia universal eligiendo una de las 10 ranuras invariantes oficiales.
 */
export function generarLicenciaUniversal(): string {
    const slot = Math.floor(Math.random() * TOTAL_LICENCIAS_UNIVERSALES);
    return generarLicenciaSlot(slot);
}

interface TauriBridge {
    core?: {
        invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
    };
}

declare global {
    interface Window {
        __TAURI__?: TauriBridge;
    }
}

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

export interface ConfigInfo {
    nombre: string;
    rubros: number;
    capacidades: number;
    tienePin: boolean;
    licenciaEstado?: string;
    licenciaTitular?: string;
    privacidadInventario?: boolean;
}

export interface TasaImpuesto {
    id: string;
    nombre: string;
    porcentaje: string;
}

export interface Categoria {
    id: string;
    nombre: string;
}


export interface RespaldoInfo {
    id: string;
    fecha: string;
    archivoNombre: string;
    registros: number;
    tamanoKb: number;
    checksumSha256: string;
}

export interface BackupMetadata {
    version: number;
    timestampUnix: number;
    arboles: string[];
    totalRegistros: number;
    checksumSha256: string;
}

export interface LicenciaInfo {
    estado: 'activa' | 'vencida' | 'demo';
    tipo: 'Enterprise Standalone Local' | 'Demo Cloud';
    claveLicencia: string;
    titular: string;
    validez: string;
}

export interface RegistroHistoricoTasa {
    id: string;
    valor: string;
    fechaHora: string;
    tipo: 'automático' | 'manual';
    motivo?: string;
}

export interface OperadorInfo {
    id: string;
    nombre: string;
    activo: boolean;
    creadoUnix: number;
}

export interface JornadaLaboral {
    id: string;
    estado: 'abierta' | 'cerrada';
    inicioUnix: number;
    finUnix?: number;
    inicioStr?: string;
    finStr?: string;
    operadorInicial: string;
    operadorActual: string;
    operadoresActivos?: string[];
    operadoresRelevo: string[];
    tasaInicio: string;
    tasaFin?: string;
    ventasTotalUsd: string;
    ventasTotalBs: string;
    ticketsEmitidos: number;
    vueltoPagadoBs: string;
    vueltoRetenidoBs: string;
    deudasLiquidadasUsd: string;
    entradasStockReg: number;
    mermasStockReg: number;
    cambiosPrecioReg: number;
    checksumSha256?: string;
}

export interface ConfigSemaforoStock {
    rojoMax: number;
    amarilloMax: number;
}

export interface ProductoInfo {
    sku: string;
    nombre: string;
    precioBrutoUsd?: string;
    margenPct?: string;
    precioUsd: string; // Precio neto final
    impuestoPct: string;
    stock: string;
    capacidades: number;
    categoriaId?: string;
    sinStock?: boolean;
    unidad?: 'un' | 'kg' | 'ml';
    esCaja?: boolean;
    unidadesPorCaja?: number;
    precioPaqueteUsd?: string;
    nombrePaquete?: string;
    presentaciones?: { nombre: string; precioUsd: string; unidades: number }[];
}

export interface LineaTicket {
    sku: string;
    nombre: string;
    cantidad: string;
    precioUsd: string;
    tasaBloqueada: string;
    subtotalUsd: string;
    subtotalBs: string;
    modoVenta?: string;
}

export type MonedaMetodo = 'USD' | 'BS';

export interface MetodoPagoConfig {
    nombre: string;
    moneda: MonedaMetodo;
}

export interface PagoTicket {
    metodo: string;
    moneda?: MonedaMetodo;
    montoUsd: string;
    montoBs: string;
    tasaCambio?: string;
    referencia?: string;
}

export type EstadoVuelto = 'PAGADO' | 'RETENIDO' | 'SIN_VUELTO';

export interface ResolucionVuelto {
    estado: EstadoVuelto;
    metodo?: string;
    montoBs?: string;
    montoUsd?: string;
    tasa?: string;
}

export interface Ticket {
    ventaId: string;
    lineas: LineaTicket[];
    totalUsd: string;
    totalBs: string;
    montoRecibidoBs: string;
    vueltoBs: string;
    tasaDelDia: string;
    fechaHora?: string;
    canal?: 'VENTA DIRECTA' | 'CONSUMO EN CUENTA' | 'LIQUIDACION DE DEUDA' | 'SALDO A FAVOR';
    operador?: string;
    etiqueta?: string;
    saldoAFavorConsolidadoUsd?: string;
    fechaUnix?: number;
    pagos?: PagoTicket[];
    estadoVuelto?: EstadoVuelto;
    metodoVuelto?: string;
    montoVueltoBs?: string;
    montoVueltoUsd?: string;
    tasaVuelto?: string;
}

export interface DeudaItem {
    id: string;
    nombre: string;
    abierta: boolean;
    aperturaUnix: number;
    cierreUnix?: number;
    totalUsd: string;
    abonosUsd: string;
    saldoUsd: string;
}

export interface DeudorGrupo {
    nombre: string;
    abiertas: number;
    saldoUsd: string;
    historicoUsd: string;
    totalDeudas: number;
    ultimaUnix: number;
    deudas: DeudaItem[];
}

export interface DeudaLinea {
    sku: string;
    nombre: string;
    cantidad: string;
    precioUsd: string;
    subtotalUsd: string;
}

export interface DeudaDetalle {
    id: string;
    nombre: string;
    abierta: boolean;
    aperturaUnix: number;
    cierreUnix?: number;
    totalUsd: string;
    abonosUsd: string;
    abonosBs: string;
    saldoUsd: string;
    nota?: string;
    lineas: DeudaLinea[];
    pagos?: PagoTicket[];
    estadoVuelto?: EstadoVuelto;
}

export interface HistorialItem {
    id: string;
    canal: string;
    etiqueta?: string;
    operador?: string;
    abierta: boolean;
    aperturaUnix: number;
    cierreUnix?: number;
    totalUsd: string;
    totalBs: string;
    metodos: string[];
}

export interface ResumenDeudor {
    abiertas: number;
    saldoUsd: string;
    historicoUsd: string;
    totalDeudas: number;
}

export interface BusquedaHistorial {
    total: number;
    pagina: number;
    porPagina: number;
    limiteAlcanzado: boolean;
    resumenDeudor?: ResumenDeudor;
    items: HistorialItem[];
}

export interface BusquedaDeudas {
    totalGrupos: number;
    totalDeudas: number;
    pagina: number;
    porPagina: number;
    grupos: DeudorGrupo[];
}

export interface ConsumoCuenta {
    id: string;
    sku: string;
    nombre: string;
    cantidad: number;
    precioUsd: string;
    subtotalUsd: string;
    modoVenta?: string;
}

export interface CuentaAbierta {
    ventaId: string;
    etiqueta: string;
    lineas: number;
    totalParcialUsd: string;
    totalParcialBs: string;
    abonosUsd?: string;
    abonosBs?: string;
    consumos?: ConsumoCuenta[];
    tipo?: 'activa' | 'deuda';
    cliente?: string;
    nota?: string;
    fechaCreacionUnix?: number;
    fechaCreacionStr?: string;
    tasaPersonalizadaCobro?: string;
}

export interface Critico {
    sku: string;
    nombre: string;
    stock: string;
}

export interface TopProducto {
    nombre: string;
    cantidad: string;
    totalUsd?: string;
    porcentaje?: string;
}

export interface CategoriaDineroBruto {
    categoriaId: string;
    nombre: string;
    cantidadProductos: number;
    unidadesStock: number;
    dineroBrutoUsd: string;
    dineroBrutoBs: string;
    dineroVentaUsd: string;
    dineroVentaBs: string;
    margenBrutoProyectadoUsd: string;
    margenBrutoPct: string;
    porcentajeCapital: string;
}

export interface PanelDatos {
    ventas24hUsd: string;
    ventas24hBs: string;
    tickets24h: number;
    valorInventarioUsd: string;
    costoTotalUsd?: string;
    gananciaBrutaUsd?: string;
    gananciaNetaUsd?: string;
    gananciaNetaSinImpUsd?: string;
    gananciaNetaBs?: string;
    criticos: Critico[];
    cuentasAbiertas: number;
    deudasAbiertas?: number;
    dineroEnLaCalleUsd?: string;
    dineroEnLaCalleBs?: string;
    topProductos: TopProducto[];
    dineroPorCategoria?: CategoriaDineroBruto[];
}

export interface TasaActual {
    valor: string;
    fechaUnix: number;
    fluctuacionPct: string | null;
    direccion: 'subio' | 'bajo' | 'estable' | null;
    fuente?: string;
}

export class ApiError extends Error {
    constructor(message: string) {
        super(message);
    }
}

import { obtenerPerfilUniversal } from './perfilUniversal';

function obtenerPerfilInicial(): { config: ConfigInfo; productos: ProductoInfo[]; key: string; claveLicencia: string; titular: string } {
    return obtenerPerfilUniversal();
}

export interface LoteRegistro {
    id: string;
    sku: string;
    cantidadInicial: string;
    disponible: string;
    horneadoUnix: number;
    caduceUnix: number;
}

export interface RedondeoRegistro {
    id: string;
    ventaId: string;
    montoBs: string;
    montoUsd?: string | null;
    tasa: string;
    fechaUnix: number;
    jornadaId?: string | null;
    operador?: string | null;
    metodo?: string | null;
    firmaSha256?: string;
}

export interface AnulacionRegistro {
    id: string;
    ventaId: string;
    etiqueta: string;
    totalUsd: string;
    totalBs: string;
    fechaAnulacionUnix: number;
    jornadaId?: string;
    operador?: string;
    motivo?: string;
    firmaSha256?: string;
}

class MockDemoStorage {
    config: ConfigInfo | null;
    productos: ProductoInfo[];
    cuentas: CuentaAbierta[] = [
        {
            ventaId: 'CTA-88210',
            etiqueta: 'Mesa 4 (Terraza)',
            tipo: 'activa',
            fechaCreacionUnix: Math.floor(Date.now() / 1000) - 7200,
            fechaCreacionStr: 'Hoy, 02:00 PM',
            lineas: 2,
            totalParcialUsd: '10.00',
            totalParcialBs: '8073.90',
            abonosUsd: '5.00',
            abonosBs: '4036.95',
            consumos: [
                {
                    id: 'con-m4-1',
                    sku: 'CERVEZA-POLAR-6P',
                    nombre: 'Six Pack Cerveza Pilsen 330ml',
                    cantidad: 2,
                    precioUsd: '4.50',
                    subtotalUsd: '9.00',
                },
                {
                    id: 'con-m4-2',
                    sku: 'HIELO-BOLSA',
                    nombre: 'Bolsa de Hielo 3Kg',
                    cantidad: 1,
                    precioUsd: '1.00',
                    subtotalUsd: '1.00',
                },
            ],
        },
        {
            ventaId: 'CTA-88211',
            etiqueta: 'Barra Principal (Carlos)',
            tipo: 'activa',
            fechaCreacionUnix: Math.floor(Date.now() / 1000) - 3600,
            fechaCreacionStr: 'Hoy, 03:00 PM',
            lineas: 2,
            totalParcialUsd: '19.80',
            totalParcialBs: '15986.32',
            abonosUsd: '25.00',
            abonosBs: '20184.75',
            consumos: [
                {
                    id: 'con-bp-1',
                    sku: 'RON-DIPLOMATICO',
                    nombre: 'Ron Reserva Exclusiva 750ml',
                    cantidad: 1,
                    precioUsd: '18.00',
                    subtotalUsd: '18.00',
                },
                {
                    id: 'con-bp-2',
                    sku: 'REFRESCO-COLA',
                    nombre: 'Refresco Cola 2L (Mezclador)',
                    cantidad: 1,
                    precioUsd: '1.80',
                    subtotalUsd: '1.80',
                },
            ],
        },
        {
            ventaId: 'CTA-88212',
            etiqueta: 'Mesa 1 (VIP)',
            tipo: 'activa',
            fechaCreacionUnix: Math.floor(Date.now() / 1000) - 1800,
            fechaCreacionStr: 'Hoy, 03:30 PM',
            lineas: 1,
            totalParcialUsd: '22.00',
            totalParcialBs: '17762.58',
            abonosUsd: '0.00',
            abonosBs: '0.00',
            consumos: [
                {
                    id: 'con-m1-1',
                    sku: 'WHISKY-12A',
                    nombre: 'Whisky Escocés 12 Años 750ml',
                    cantidad: 1,
                    precioUsd: '22.00',
                    subtotalUsd: '22.00',
                },
            ],
        },
        {
            ventaId: 'DEU-99042',
            etiqueta: 'Taller Hermanos Gómez',
            cliente: 'Carlos Gómez (Taller)',
            nota: 'Crédito comercial acordado a cobrar en días',
            tipo: 'deuda',
            fechaCreacionUnix: Math.floor(Date.now() / 1000) - 86400 * 3,
            fechaCreacionStr: '01/09/2026 10:30',
            lineas: 3,
            totalParcialUsd: '34.00',
            totalParcialBs: '27451.26',
            abonosUsd: '10.00',
            abonosBs: '8073.90',
            consumos: [
                {
                    id: 'con-d1',
                    sku: 'RON-SANTA-TERESA',
                    nombre: 'Ron Santa Teresa Gran Reserva 750ml',
                    cantidad: 2,
                    precioUsd: '12.00',
                    subtotalUsd: '24.00',
                },
                {
                    id: 'con-d2',
                    sku: 'CERVEZA-POLAR-6P',
                    nombre: 'Six Pack Cerveza Pilsen 330ml',
                    cantidad: 2,
                    precioUsd: '4.50',
                    subtotalUsd: '9.00',
                },
                {
                    id: 'con-d3',
                    sku: 'HIELO-BOLSA',
                    nombre: 'Bolsa de Hielo 3Kg',
                    cantidad: 1,
                    precioUsd: '1.00',
                    subtotalUsd: '1.00',
                },
            ],
        },
    ];
    categorias: Categoria[] = [
        { id: 'cat-general', nombre: 'General' },
        { id: 'cat-viveres', nombre: 'Víveres' },
        { id: 'cat-bebidas', nombre: 'Bebidas y Licores' },
        { id: 'cat-panes', nombre: 'Panes y Horneados' },
    ];
    tasasImpuestos: TasaImpuesto[] = [
        { id: 'iva-16', nombre: 'IVA General (16%)', porcentaje: '16' },
        { id: 'iva-8', nombre: 'IVA Reducido (8%)', porcentaje: '8' },
        { id: 'iva-0', nombre: 'Exento (0%)', porcentaje: '0' },
    ];
    anulaciones: AnulacionRegistro[] = [];
    redondeos: RedondeoRegistro[] = [];
    lotes: LoteRegistro[] = [];
    tasaActual: TasaActual = { valor: '807.39', fechaUnix: Math.floor(Date.now() / 1000), fluctuacionPct: null, direccion: null };
    tickets: Ticket[] = [
        {
            ventaId: 'TRX-94812',
            totalUsd: '23.80',
            totalBs: '19215.88',
            tasaDelDia: '807.39',
            montoRecibidoBs: '20000.00',
            vueltoBs: '784.12',
            fechaHora: 'Hoy, 01:24 PM',
            fechaUnix: Math.floor(Date.now() / 1000) - 3600,
            canal: 'VENTA DIRECTA',
            operador: 'Caja Principal',
            pagos: [
                { metodo: 'PAGO MOVIL', montoUsd: '23.80', montoBs: '19215.88', referencia: 'REF-7892' },
            ],
            lineas: [
                { sku: 'RON-SANTA-TERESA', nombre: 'Ron Santa Teresa Gran Reserva 750ml', cantidad: '1', precioUsd: '12.00', tasaBloqueada: '807.39', subtotalUsd: '12.00', subtotalBs: '9688.68' },
                { sku: 'CERVEZA-POLAR-6P', nombre: 'Six Pack Cerveza Pilsen 330ml', cantidad: '2', precioUsd: '4.50', tasaBloqueada: '807.39', subtotalUsd: '9.00', subtotalBs: '7266.51' },
                { sku: 'HIELO-BOLSA', nombre: 'Bolsa de Hielo 3Kg', cantidad: '1', precioUsd: '1.00', tasaBloqueada: '807.39', subtotalUsd: '1.00', subtotalBs: '807.39' },
                { sku: 'REFRESCO-COLA', nombre: 'Refresco Cola 2L (Mezclador)', cantidad: '1', precioUsd: '1.80', tasaBloqueada: '807.39', subtotalUsd: '1.80', subtotalBs: '1453.30' },
            ],
        },
        {
            ventaId: 'CTA-78104',
            totalUsd: '40.00',
            totalBs: '32295.60',
            tasaDelDia: '807.39',
            montoRecibidoBs: '35000.00',
            vueltoBs: '2704.40',
            fechaHora: 'Hoy, 12:50 PM',
            fechaUnix: Math.floor(Date.now() / 1000) - 7200,
            canal: 'CONSUMO EN CUENTA',
            operador: 'Mesa 4 / Mostrador',
            pagos: [
                { metodo: 'DOL.CASH', moneda: 'USD', montoUsd: '20.00', montoBs: '16147.80', tasaCambio: '807.39' },
                { metodo: 'PUNTOD.VENTA', moneda: 'BS', montoUsd: '20.00', montoBs: '16147.80', referencia: 'LOTE-112' },
            ],
            lineas: [
                { sku: 'RON-DIPLOMATICO', nombre: 'Ron Reserva Exclusiva 750ml', cantidad: '1', precioUsd: '18.00', tasaBloqueada: '807.39', subtotalUsd: '18.00', subtotalBs: '14533.02' },
                { sku: 'WHISKY-12A', nombre: 'Whisky Escocés 12 Años 750ml', cantidad: '1', precioUsd: '22.00', tasaBloqueada: '807.39', subtotalUsd: '22.00', subtotalBs: '17762.58' },
            ],
        },
        {
            ventaId: 'TRX-94811',
            totalUsd: '13.60',
            totalBs: '10980.50',
            tasaDelDia: '807.39',
            montoRecibidoBs: '11000.00',
            vueltoBs: '19.50',
            fechaHora: 'Hoy, 11:35 AM',
            fechaUnix: Math.floor(Date.now() / 1000) - 10800,
            canal: 'VENTA DIRECTA',
            operador: 'Caja Principal',
            pagos: [
                { metodo: 'BS.EFEC.', moneda: 'BS', montoUsd: '13.60', montoBs: '10980.50' },
            ],
            lineas: [
                { sku: 'CERVEZA-POLAR-6P', nombre: 'Six Pack Cerveza Pilsen 330ml', cantidad: '2', precioUsd: '4.50', tasaBloqueada: '807.39', subtotalUsd: '9.00', subtotalBs: '7266.51' },
                { sku: 'REFRESCO-COLA', nombre: 'Refresco Cola 2L (Mezclador)', cantidad: '2', precioUsd: '1.80', tasaBloqueada: '807.39', subtotalUsd: '3.60', subtotalBs: '2906.60' },
                { sku: 'HIELO-BOLSA', nombre: 'Bolsa de Hielo 3Kg', cantidad: '1', precioUsd: '1.00', tasaBloqueada: '807.39', subtotalUsd: '1.00', subtotalBs: '807.39' },
            ],
        },
        {
            ventaId: 'CTA-78103',
            totalUsd: '18.00',
            totalBs: '14533.02',
            tasaDelDia: '807.39',
            montoRecibidoBs: '15000.00',
            vueltoBs: '466.98',
            fechaHora: 'Hoy, 10:15 AM',
            fechaUnix: Math.floor(Date.now() / 1000) - 14400,
            canal: 'CONSUMO EN CUENTA',
            operador: 'Barra Principal',
            pagos: [
                { metodo: 'ZELLE', moneda: 'USD', montoUsd: '18.00', montoBs: '14533.02', tasaCambio: '807.39', referencia: 'ZEL-5501' },
            ],
            lineas: [
                { sku: 'RON-DIPLOMATICO', nombre: 'Ron Reserva Exclusiva 750ml', cantidad: '1', precioUsd: '18.00', tasaBloqueada: '807.39', subtotalUsd: '18.00', subtotalBs: '14533.02' },
            ],
        },
    ];
    ventasTotalUsd = 95.40;
    ventasTotalBs = 77025.00;
    // Jerarquía estricta obligatoria: Bolívares arriba (alta frecuencia), Divisas abajo
    metodosPago: MetodoPagoConfig[] = [
        { nombre: 'BIOPAGO', moneda: 'BS' },
        { nombre: 'PAGO MOVIL', moneda: 'BS' },
        { nombre: 'TRANSF.BS.', moneda: 'BS' },
        { nombre: 'BS.EFEC.', moneda: 'BS' },
        { nombre: 'PUNTOD.VENTA', moneda: 'BS' },
        { nombre: 'DOL.CASH', moneda: 'USD' },
        { nombre: 'ZELLE', moneda: 'USD' },
        { nombre: 'BINAN.USDT', moneda: 'USD' },
    ];
    respaldos: RespaldoInfo[] = [
        { id: 'bk-1', fecha: 'Hoy, 06:00 PM', archivoNombre: 'DATO-DEMO-20260903-180000.backup', registros: 412, tamanoKb: 124, checksumSha256: '9f83a21b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f' },
        { id: 'bk-2', fecha: 'Ayer, 11:30 PM', archivoNombre: 'DATO-DEMO-20260902-233000.backup', registros: 395, tamanoKb: 118, checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
    ];
    licencia: LicenciaInfo = {
        estado: 'activa',
        tipo: 'Enterprise Standalone Local',
        claveLicencia: '0000888811110000',
        titular: 'Empresa DatioLabs Cliente Comercial',
        validez: 'Perpetua (Sin caducidad / Portabilidad Total)',
    };
    operadores: OperadorInfo[] = [
        { id: 'op-1', nombre: 'Carlos Mendoza', activo: true, creadoUnix: Math.floor(Date.now() / 1000) - 86400 * 30 },
        { id: 'op-2', nombre: 'María Andrea Silva', activo: true, creadoUnix: Math.floor(Date.now() / 1000) - 86400 * 15 },
        { id: 'op-3', nombre: 'José Gregorio Páez', activo: true, creadoUnix: Math.floor(Date.now() / 1000) - 86400 * 5 },
    ];
    jornadaActual: JornadaLaboral | null = {
        id: 'JOR-20260908-01',
        estado: 'abierta',
        inicioUnix: Math.floor(Date.now() / 1000) - 14400,
        inicioStr: 'Hoy, 08:30 AM',
        operadorInicial: 'Carlos Mendoza',
        operadorActual: 'Carlos Mendoza',
        operadoresActivos: ['Carlos Mendoza'],
        operadoresRelevo: ['Carlos Mendoza'],
        tasaInicio: '807.39',
        ventasTotalUsd: '95.40',
        ventasTotalBs: '77025.00',
        ticketsEmitidos: 6,
        vueltoPagadoBs: '1450.00',
        vueltoRetenidoBs: '784.12',
        deudasLiquidadasUsd: '34.00',
        entradasStockReg: 2,
        mermasStockReg: 0,
        cambiosPrecioReg: 0,
    };
    historicoJornadas: JornadaLaboral[] = [
        {
            id: 'JOR-20260907-01',
            estado: 'cerrada',
            inicioUnix: Math.floor(Date.now() / 1000) - 86400 - 28800,
            finUnix: Math.floor(Date.now() / 1000) - 86400,
            inicioStr: 'Ayer, 08:00 AM',
            finStr: 'Ayer, 09:30 PM',
            operadorInicial: 'María Andrea Silva',
            operadorActual: 'Carlos Mendoza',
            operadoresRelevo: ['María Andrea Silva', 'Carlos Mendoza'],
            tasaInicio: '805.20',
            tasaFin: '807.39',
            ventasTotalUsd: '340.50',
            ventasTotalBs: '274889.70',
            ticketsEmitidos: 24,
            vueltoPagadoBs: '4520.00',
            vueltoRetenidoBs: '1200.00',
            deudasLiquidadasUsd: '68.00',
            entradasStockReg: 4,
            mermasStockReg: 1,
            cambiosPrecioReg: 1,
            checksumSha256: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
        },
    ];
    semaforoStock: ConfigSemaforoStock = {
        rojoMax: 5,
        amarilloMax: 15,
    };
    dedupVentas: Record<string, string> = {};
    historicoTasas: RegistroHistoricoTasa[] = [
        { id: 'tx-1', valor: '807.3900', fechaHora: 'Hoy, 04:00 PM', tipo: 'automático', motivo: 'Sondeo oficial BCV' },
        { id: 'tx-2', valor: '805.2000', fechaHora: 'Hoy, 09:00 AM', tipo: 'automático', motivo: 'Apertura de jornada' },
        { id: 'tx-3', valor: '802.1500', fechaHora: 'Ayer, 05:00 PM', tipo: 'automático', motivo: 'Cierre BCV' },
    ];
    pinDueno: string = '';
    private storageKey: string;

    constructor() {
        const perfil = obtenerPerfilInicial();
        this.storageKey = perfil.key;
        this.config = perfil.config;
        this.productos = perfil.productos;
        this.licencia.claveLicencia = perfil.claveLicencia;
        this.licencia.titular = perfil.titular;

        try {
            // Purgar versiones obsoletas de almacenamiento en demo
            ['datiolabs_demo_licoreria_db', 'datiolabs_demo_panaderia_db', 'datiolabs_demo_retail_db', 'datiolabs_demo_licoreria_v2'].forEach((k) => {
                try { localStorage.removeItem(k); } catch (_) {}
            });
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.productos && Array.isArray(parsed.productos)) {
                    this.productos = parsed.productos.map((p: ProductoInfo) => {
                        const original = perfil.productos.find((x) => x.sku === p.sku);
                        const raw = String(p.unidad || (original?.unidad) || '').toLowerCase();
                        const un: 'un' | 'kg' | 'ml' = raw === 'kg' ? 'kg' : raw === 'ml' ? 'ml' : 'un';
                        const catId = p.categoriaId && p.categoriaId.trim()
                            ? p.categoriaId
                            : (original?.categoriaId || 'cat-general');
                        const pUsd = Number(p.precioUsd) || 0;
                        const pBruto = p.precioBrutoUsd && Number(p.precioBrutoUsd) > 0
                            ? p.precioBrutoUsd
                            : (original?.precioBrutoUsd || (pUsd * 0.65).toFixed(2));
                        return {
                            ...p,
                            unidad: un,
                            categoriaId: catId,
                            precioBrutoUsd: pBruto,
                        };
                    });
                }
                if (parsed.cuentas && Array.isArray(parsed.cuentas) && parsed.cuentas.length > 0) {
                    this.cuentas = parsed.cuentas.map((c: CuentaAbierta) => {
                        if (!Array.isArray(c.consumos)) c.consumos = [];
                        if (c.abonosUsd === undefined) c.abonosUsd = '0.00';
                        if (c.abonosBs === undefined) c.abonosBs = '0.00';
                        if (!c.tipo) {
                            c.tipo = (c.etiqueta.toLowerCase().includes('taller') || c.etiqueta.toLowerCase().includes('deuda'))
                                ? 'deuda'
                                : 'activa';
                        }
                        if (!c.fechaCreacionUnix) {
                            c.fechaCreacionUnix = c.tipo === 'deuda'
                                ? Math.floor(Date.now() / 1000) - 86400 * 3
                                : Math.floor(Date.now() / 1000) - 3600;
                        }
                        if (!c.fechaCreacionStr) {
                            c.fechaCreacionStr = c.tipo === 'deuda' ? '01/09/2026 10:30' : 'Hoy';
                        }
                        if (c.consumos.length === 0 && parseNum(c.totalParcialUsd) > 0) {
                            c.consumos.push({
                                id: 'con-' + Math.random().toString(36).slice(2, 8),
                                sku: 'CONSUMO-PREV',
                                nombre: 'Consumos acumulados',
                                cantidad: 1,
                                precioUsd: String(c.totalParcialUsd),
                                subtotalUsd: String(c.totalParcialUsd),
                            });
                        }
                        c.lineas = c.consumos.length;
                        return c;
                    });
                    if (!this.cuentas.some((c) => c.tipo === 'deuda')) {
                        this.cuentas.push({
                            ventaId: 'DEU-99042',
                            etiqueta: 'Taller Hermanos Gómez',
                            cliente: 'Carlos Gómez (Taller)',
                            nota: 'Crédito comercial convenido a pagar en días',
                            tipo: 'deuda',
                            fechaCreacionUnix: Math.floor(Date.now() / 1000) - 86400 * 3,
                            fechaCreacionStr: '01/09/2026 10:30',
                            lineas: 3,
                            totalParcialUsd: '34.00',
                            totalParcialBs: (34 * parseNum(this.tasaActual.valor)).toFixed(2),
                            abonosUsd: '10.00',
                            abonosBs: (10 * parseNum(this.tasaActual.valor)).toFixed(2),
                            consumos: [
                                { id: 'con-d1', sku: 'RON-SANTA-TERESA', nombre: 'Ron Santa Teresa Gran Reserva 750ml', cantidad: 2, precioUsd: '12.00', subtotalUsd: '24.00' },
                                { id: 'con-d2', sku: 'CERVEZA-POLAR-6P', nombre: 'Six Pack Cerveza Pilsen 330ml', cantidad: 2, precioUsd: '4.50', subtotalUsd: '9.00' },
                                { id: 'con-d3', sku: 'HIELO-BOLSA', nombre: 'Bolsa de Hielo 3Kg', cantidad: 1, precioUsd: '1.00', subtotalUsd: '1.00' },
                            ],
                        });
                    }
                }
                if (parsed.metodosPago && Array.isArray(parsed.metodosPago)) {
                    const defaultMetodos: MetodoPagoConfig[] = [
                        { nombre: 'PUNTOD.VENTA', moneda: 'BS' },
                        { nombre: 'BIOPAGO', moneda: 'BS' },
                        { nombre: 'PAGO MOVIL', moneda: 'BS' },
                        { nombre: 'TRANSF.BS.', moneda: 'BS' },
                        { nombre: 'BS.EFEC.', moneda: 'BS' },
                        { nombre: 'DOL.CASH', moneda: 'USD' },
                        { nombre: 'ZELLE', moneda: 'USD' },
                        { nombre: 'BINAN.USDT', moneda: 'USD' },
                    ];
                    const normalizados: MetodoPagoConfig[] = [];
                    const nombresVistos = new Set<string>();

                    const procesarMetodo = (m: unknown) => {
                        let nombre = '';
                        let moneda: MonedaMetodo = 'BS';
                        if (typeof m === 'string') {
                            nombre = m.trim().toUpperCase();
                            if (nombre === 'DOLAR.EFEC.') nombre = 'DOL.CASH';
                            if (nombre === 'USDT BINAN.') nombre = 'BINAN.USDT';
                            if (['DOL.CASH', 'ZELLE', 'BINAN.USDT'].includes(nombre)) {
                                moneda = 'USD';
                            }
                        } else if (m && typeof m === 'object' && 'nombre' in m) {
                            const obj = m as { nombre: string; moneda?: string };
                            nombre = String(obj.nombre || '').trim().toUpperCase();
                            if (nombre === 'DOLAR.EFEC.') nombre = 'DOL.CASH';
                            if (nombre === 'USDT BINAN.') nombre = 'BINAN.USDT';
                            moneda = obj.moneda === 'USD' || ['DOL.CASH', 'ZELLE', 'BINAN.USDT'].includes(nombre) ? 'USD' : 'BS';
                        }
                        if (nombre && !nombresVistos.has(nombre)) {
                            nombresVistos.add(nombre);
                            normalizados.push({ nombre, moneda });
                        }
                    };

                    defaultMetodos.forEach(procesarMetodo);
                    parsed.metodosPago.forEach(procesarMetodo);
                    // Jerarquía estricta obligatoria: Bolívares primero, divisas al final
                    normalizados.sort((a, b) => (a.moneda === b.moneda ? 0 : a.moneda === 'BS' ? -1 : 1));
                    this.metodosPago = normalizados;
                } else {
                    this.metodosPago.sort((a, b) => (a.moneda === b.moneda ? 0 : a.moneda === 'BS' ? -1 : 1));
                }
                if (parsed.operadores && Array.isArray(parsed.operadores)) this.operadores = parsed.operadores;
                if (parsed.jornadaActual !== undefined) this.jornadaActual = parsed.jornadaActual;
                if (parsed.historicoJornadas && Array.isArray(parsed.historicoJornadas)) this.historicoJornadas = parsed.historicoJornadas;
                if (parsed.semaforoStock) this.semaforoStock = parsed.semaforoStock;
                if (parsed.categorias) this.categorias = parsed.categorias;
                if (parsed.tasasImpuestos) this.tasasImpuestos = parsed.tasasImpuestos;
                if (parsed.tasaActual) this.tasaActual = parsed.tasaActual;
                if (parsed.respaldos) this.respaldos = parsed.respaldos;
                if (parsed.historicoTasas) this.historicoTasas = parsed.historicoTasas;
                if (parsed.tickets && Array.isArray(parsed.tickets) && parsed.tickets.length > 0) this.tickets = parsed.tickets;
                if (parsed.ventasTotalUsd !== undefined) this.ventasTotalUsd = Number(parsed.ventasTotalUsd);
                if (parsed.ventasTotalBs !== undefined) this.ventasTotalBs = Number(parsed.ventasTotalBs);
                if (parsed.pinDueno !== undefined) this.pinDueno = parsed.pinDueno;
                if (this.config && this.pinDueno) {
                    this.config.tienePin = true;
                }
            }
        } catch (_) {}
        void this.refrescarTasaEnVivo();
    }

    async refrescarTasaEnVivo(): Promise<void> {
        try {
            const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
            if (res.ok) {
                const data = await res.json();
                const prom = Number(data.promedio);
                if (Number.isFinite(prom) && prom > 0) {
                    const ant = Number(this.tasaActual.valor);
                    let diffPct: string | null = null;
                    let dir: 'subio' | 'bajo' | 'estable' | null = null;
                    if (Number.isFinite(ant) && ant > 0 && ant !== prom) {
                        const pct = ((prom - ant) / ant) * 100;
                        diffPct = Math.abs(pct).toFixed(2);
                        dir = pct > 0 ? 'subio' : 'bajo';
                    }
                    this.tasaActual = {
                        valor: prom.toFixed(4),
                        fechaUnix: Math.floor(Date.now() / 1000),
                        fluctuacionPct: diffPct,
                        direccion: dir,
                    };

                    const ahora = new Date();
                    const horaStr = horaActualVet(ahora);
                    this.historicoTasas.unshift({
                        id: 'tx-' + Math.random().toString(36).slice(2, 7),
                        valor: prom.toFixed(4),
                        fechaHora: `Hoy, ${horaStr}`,
                        tipo: 'automático',
                        motivo: 'Sincronización BCV en vivo',
                    });
                    if (this.historicoTasas.length > 50) this.historicoTasas.pop();

                    this.persist();

                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('tasa_actualizada', { detail: prom }));
                    }
                }
            }
        } catch (_) {}
    }

    persist() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify({
                productos: this.productos,
                cuentas: this.cuentas,
                categorias: this.categorias,
                tasasImpuestos: this.tasasImpuestos,
                tasaActual: this.tasaActual,
                respaldos: this.respaldos,
                historicoTasas: this.historicoTasas,
                tickets: this.tickets,
                ventasTotalUsd: this.ventasTotalUsd,
                ventasTotalBs: this.ventasTotalBs,
                pinDueno: this.pinDueno,
                metodosPago: this.metodosPago,
                operadores: this.operadores,
                jornadaActual: this.jornadaActual,
                historicoJornadas: this.historicoJornadas,
                semaforoStock: this.semaforoStock,
            }));
        } catch (_) {}
    }
}

const demoStore = new MockDemoStorage();

/**
 * Dos caminos y nada mas: Tauri (app de escritorio) y mock (demo web).
 * El panel HTTP local fue purgado junto con el modulo movil.
 */
export async function invocar<T>(comando: string, args?: Record<string, unknown>): Promise<T> {
    const puente = window.__TAURI__;
    const invocador = puente?.core?.invoke;
    if (invocador) {
        try {
            return (await invocador(comando, args)) as T;
        } catch (e) {
            throw new ApiError(typeof e === 'string' ? e : JSON.stringify(e));
        }
    }
    return mockInvocar<T>(comando, args);
}

function mockInvocar<T>(comando: string, args?: Record<string, unknown>): Promise<T> {
    switch (comando) {
        case 'obtener_config':
            return Promise.resolve(demoStore.config as unknown as T);
        case 'inicializar_negocio': {
            const pin = args?.pinDueno ? String(args.pinDueno).trim() : '';
            const licClave = args?.licenciaClave ? String(args.licenciaClave).trim() : '';
            demoStore.pinDueno = pin;
            demoStore.config = {
                nombre: String(args?.nombre || 'Mi Negocio Demo'),
                rubros: Number(args?.rubros || 15),
                capacidades: CAP_UNITARIA | CAP_PESABLE | CAP_CUENTA_ABIERTA | CAP_SERIE | CAP_VARIANTES,
                tienePin: pin.length > 0,
                licenciaEstado: licClave ? 'activa' : 'demo',
                licenciaTitular: licClave ? 'Empresa DatioLabs' : '',
                privacidadInventario: Boolean(args?.privacidadInventario),
            };
            demoStore.licencia.claveLicencia = licClave || '0000888811110000';
            demoStore.licencia.estado = licClave ? 'activa' : 'demo';
            demoStore.licencia.titular = licClave ? 'Empresa DatioLabs' : 'DatioLabs Demo';
            demoStore.persist();
            return Promise.resolve(undefined as unknown as T);
        }
        case 'validar_pin_dueno': {
            const ingresado = String(args?.pin || '').trim();
            // Si no tiene PIN configurado, siempre entra
            if (!demoStore.pinDueno) return Promise.resolve(true as unknown as T);
            return Promise.resolve((ingresado === demoStore.pinDueno) as unknown as T);
        }
        case 'cambiar_pin_dueno': {
            const anterior = String(args?.pinAnterior || '').trim();
            const nuevo = String(args?.pinNuevo || '').trim();
            // Validar clave anterior si existía
            if (demoStore.pinDueno && anterior !== demoStore.pinDueno) {
                return Promise.reject(new Error('La clave anterior no coincide.'));
            }
            demoStore.pinDueno = nuevo;
            if (demoStore.config) {
                demoStore.config.tienePin = nuevo.length > 0;
            }
            demoStore.persist();
            return Promise.resolve(true as unknown as T);
        }
        case 'listar_productos':
            return Promise.resolve(demoStore.productos as unknown as T);
        case 'crear_producto': {
            const input = args?.input as Record<string, unknown>;
            const rawUnidad = String(input?.unidad || '').toLowerCase();
            const unidad: 'un' | 'kg' | 'ml' = rawUnidad === 'kg' ? 'kg' : rawUnidad === 'ml' ? 'ml' : (input?.pesable ? 'kg' : 'un');
            const esCaja = Boolean(input?.esCaja);
            const unidadesPorCaja = Number(input?.unidadesPorCaja) > 1 ? Math.floor(Number(input.unidadesPorCaja)) : undefined;
            const stockFinal = String(input?.stockInicial || '0');
            const nuevo: ProductoInfo = {
                sku: String(input?.sku || '').toUpperCase(),
                nombre: String(input?.nombre || ''),
                precioBrutoUsd: String(input?.precioBrutoUsd || '0'),
                margenPct: String(input?.margenPct || '0'),
                precioUsd: String(input?.precioUsd || '0'),
                impuestoPct: String(input?.impuestoPct || '0'),
                stock: stockFinal,
                capacidades: CAP_UNITARIA | (unidad === 'kg' || unidad === 'ml' || input?.pesable ? CAP_PESABLE : 0),
                categoriaId: String(input?.categoriaId || ''),
                sinStock: Boolean(input?.sinStock),
                unidad,
                esCaja,
                unidadesPorCaja,
                precioPaqueteUsd: input?.precioPaqueteUsd ? String(input.precioPaqueteUsd) : undefined,
                nombrePaquete: input?.nombrePaquete ? String(input.nombrePaquete) : undefined,
                presentaciones: Array.isArray(input?.presentaciones)
                    ? (input.presentaciones as { nombre: string; precioUsd: string; unidades: number }[])
                    : [],
            };
            demoStore.productos.push(nuevo);
            demoStore.persist();
            return Promise.resolve(undefined as unknown as T);
        }
        case 'actualizar_producto': {
            const input = args?.input as Record<string, unknown>;
            const sku = String(input?.sku || '').toUpperCase();
            const idx = demoStore.productos.findIndex((p) => p.sku === sku);
            if (idx >= 0) {
                const p = demoStore.productos[idx];
                if (input?.nombre) p.nombre = String(input.nombre);
                if (input?.precioUsd) p.precioUsd = String(input.precioUsd);
                if (input?.impuestoPct) p.impuestoPct = String(input.impuestoPct);
                if (input?.precioBrutoUsd !== undefined) p.precioBrutoUsd = String(input.precioBrutoUsd);
                if (input?.margenPct !== undefined) p.margenPct = String(input.margenPct);
                if (input?.categoriaId !== undefined) p.categoriaId = String(input.categoriaId);
                if (input?.sinStock !== undefined) p.sinStock = Boolean(input.sinStock);
                if (input?.unidad !== undefined) p.unidad = input.unidad as 'un' | 'kg' | 'ml';
                if (input?.esCaja !== undefined) p.esCaja = Boolean(input.esCaja);
                if (input?.unidadesPorCaja !== undefined) p.unidadesPorCaja = Number(input.unidadesPorCaja);
                if (input?.precioPaqueteUsd !== undefined) p.precioPaqueteUsd = String(input.precioPaqueteUsd);
                if (input?.nombrePaquete !== undefined) p.nombrePaquete = String(input.nombrePaquete);
                if (Array.isArray(input?.presentaciones)) {
                    p.presentaciones = input.presentaciones as { nombre: string; precioUsd: string; unidades: number }[];
                }
                demoStore.persist();
            }
            return Promise.resolve(undefined as unknown as T);
        }
        case 'eliminar_producto': {
            const sku = String(args?.sku || '').toUpperCase();
            demoStore.productos = demoStore.productos.filter((p) => p.sku !== sku);
            demoStore.persist();
            return Promise.resolve(undefined as unknown as T);
        }
        case 'previsualizar_cobro': {
            const items = (args?.items as { sku: string; cantidad: string; modo_venta?: string; modoVenta?: string }[]) || [];
            const tasa = parseNum(args?.tasaCobro) || Number(demoStore.tasaActual.valor);
            let totalUsd = 0;
            for (const item of items) {
                const prod = demoStore.productos.find((p) => p.sku === item.sku);
                if (!prod) continue;
                const cant = parseNum(item.cantidad);
                const modo = item.modoVenta || item.modo_venta || 'unidad';
                const pres = modo !== 'unidad'
                    ? prod.presentaciones?.find((p) => p.nombre.toLowerCase() === modo.toLowerCase())
                    : undefined;
                const esPaquete = !pres && modo === 'paquete' && (prod.precioPaqueteUsd || (prod.esCaja && prod.unidadesPorCaja && prod.unidadesPorCaja > 1));
                const precio = pres
                    ? Number(pres.precioUsd)
                    : (esPaquete
                        ? (prod.precioPaqueteUsd ? Number(prod.precioPaqueteUsd) : Number(prod.precioUsd) * (prod.unidadesPorCaja || 1))
                        : Number(prod.precioUsd));
                totalUsd += precio * cant;
            }
            return Promise.resolve({
                totalUsd: totalUsd.toFixed(2),
                totalBs: (totalUsd * tasa).toFixed(2),
                tasaAplicada: tasa.toFixed(4),
            } as unknown as T);
        }
        case 'registrar_venta': {
            const items = args?.items as { sku: string; cantidad: string; modo_venta?: string; modoVenta?: string }[];
            const idempotencyKey = args?.idempotencyKey as string | undefined;
            const recibido = Number(args?.montoRecibidoBs || '0');
            
            // Idempotency check for demo store
            if (idempotencyKey && demoStore.dedupVentas?.[idempotencyKey]) {
                const existing = demoStore.dedupVentas[idempotencyKey];
                const ticket = demoStore.tickets.find(t => t.ventaId === existing);
                if (ticket) return Promise.resolve(ticket as unknown as T);
            }
            let totalUsd = 0;
            const tasa = parseNum(args?.tasaCobro) || Number(demoStore.tasaActual.valor);
            items.forEach((item) => {
                const prod = demoStore.productos.find((p) => p.sku === item.sku);
                if (prod) {
                    const cant = Number(item.cantidad);
                    const modo = item.modoVenta || item.modo_venta || 'unidad';
                    const pres = modo !== 'unidad'
                        ? prod.presentaciones?.find((p) => p.nombre.toLowerCase() === modo.toLowerCase())
                        : undefined;
                    const esPaquete = !pres && modo === 'paquete' && (prod.precioPaqueteUsd || (prod.esCaja && prod.unidadesPorCaja && prod.unidadesPorCaja > 1));
                    const unidadesDesc = pres
                        ? pres.unidades
                        : (esPaquete ? (prod.unidadesPorCaja || 1) : 1);
                    const precioEfectivo = pres
                        ? Number(pres.precioUsd)
                        : (esPaquete
                            ? (prod.precioPaqueteUsd ? Number(prod.precioPaqueteUsd) : Number(prod.precioUsd) * (prod.unidadesPorCaja || 1))
                            : Number(prod.precioUsd));
                    totalUsd += precioEfectivo * cant;
                    prod.stock = String(Math.max(0, Number(prod.stock) - unidadesDesc * cant));
                }
            });
            const totalBs = totalUsd * tasa;
            const vueltoBs = Math.max(0, recibido - totalBs);
            demoStore.ventasTotalUsd += totalUsd;
            demoStore.ventasTotalBs += totalBs;
            const ahora = new Date();
            const horaStr = horaActualVet(ahora);
            const pagosRecibidos: PagoTicket[] = Array.isArray(args?.pagos) && args.pagos.length > 0
                ? (args.pagos as PagoTicket[])
                : [
                    {
                        metodo: recibido > 0 ? 'BS.EFEC.' : 'DOL.CASH',
                        moneda: recibido > 0 ? 'BS' : 'USD',
                        montoUsd: totalUsd.toFixed(2),
                        montoBs: totalBs.toFixed(2),
                    },
                ];
            const resVuelto = args?.resolucionVuelto as ResolucionVuelto | undefined;
            const estadoVuelto: EstadoVuelto = vueltoBs > 0.009 ? (resVuelto?.estado || 'PAGADO') : 'SIN_VUELTO';
            const metodoVuelto = estadoVuelto === 'PAGADO' ? (resVuelto?.metodo || 'BS.EFEC.') : undefined;
            const montoVueltoBs = vueltoBs > 0.009 ? (resVuelto?.montoBs || vueltoBs.toFixed(2)) : undefined;
            const montoVueltoUsd = vueltoBs > 0.009 ? (resVuelto?.montoUsd || (tasa > 0 ? (vueltoBs / tasa).toFixed(2) : '0.00')) : undefined;
            const tasaVuelto = estadoVuelto === 'PAGADO' ? resVuelto?.tasa : undefined;

            const opActual = (demoStore.jornadaActual?.operadoresActivos && demoStore.jornadaActual.operadoresActivos.length > 0)
                ? demoStore.jornadaActual.operadoresActivos.join(', ')
                : (demoStore.jornadaActual?.operadorActual || 'Caja Principal');
            const ticket: Ticket = {
                ventaId: 'TRX-' + Math.floor(10000 + Math.random() * 90000),
                totalUsd: totalUsd.toFixed(2),
                totalBs: totalBs.toFixed(2),
                tasaDelDia: tasa.toFixed(2),
                montoRecibidoBs: recibido.toFixed(2),
                vueltoBs: vueltoBs.toFixed(2),
                fechaHora: `Hoy, ${horaStr}`,
                fechaUnix: Math.floor(ahora.getTime() / 1000),
                canal: 'VENTA DIRECTA',
                operador: opActual,
                pagos: pagosRecibidos,
                estadoVuelto,
                metodoVuelto,
                montoVueltoBs,
                montoVueltoUsd,
                tasaVuelto,
                lineas: items.map((i) => {
                    const p = demoStore.productos.find((x) => x.sku === i.sku);
                    const modo = (i as { modoVenta?: string }).modoVenta || (i as { modo_venta?: string }).modo_venta || 'unidad';
                    const esPaquete = modo === 'paquete' && p?.precioPaqueteUsd;
                    const precioEfectivo = esPaquete ? Number(p?.precioPaqueteUsd || 0) : Number(p?.precioUsd || 0);
                    const subUsd = (precioEfectivo * Number(i.cantidad)).toFixed(2);
                    const subBs = (Number(subUsd) * tasa).toFixed(2);
                    return {
                        sku: i.sku,
                        nombre: p?.nombre || i.sku,
                        cantidad: i.cantidad,
                        precioUsd: String(precioEfectivo),
                        tasaBloqueada: tasa.toFixed(2),
                        subtotalUsd: subUsd,
                        subtotalBs: subBs,
                        modoVenta: modo,
                    };
                }),
            };
            if (!demoStore.tickets.some(t => t.ventaId === ticket.ventaId)) {
                demoStore.tickets.unshift(ticket);
            }
            if (estadoVuelto === 'RETENIDO' && vueltoBs > 0.009) {
                demoStore.redondeos.unshift({
                    id: 'red-' + Math.random().toString(36).slice(2, 8),
                    ventaId: ticket.ventaId,
                    montoBs: vueltoBs.toFixed(2),
                    montoUsd: tasa > 0 ? (vueltoBs / tasa).toFixed(2) : null,
                    tasa: tasa.toFixed(2),
                    fechaUnix: Math.floor(ahora.getTime() / 1000),
                    jornadaId: demoStore.jornadaActual?.id,
                    operador: opActual,
                    metodo: metodoVuelto || null,
                });
            }
            // Store idempotency key for dedup
            if (idempotencyKey) {
                if (!demoStore.dedupVentas) demoStore.dedupVentas = {};
                demoStore.dedupVentas[idempotencyKey] = ticket.ventaId;
            }
            if (demoStore.jornadaActual) {
                const j = demoStore.jornadaActual;
                j.ventasTotalUsd = (parseNum(j.ventasTotalUsd) + totalUsd).toFixed(2);
                j.ventasTotalBs = (parseNum(j.ventasTotalBs) + totalBs).toFixed(2);
                j.ticketsEmitidos += 1;
                if (estadoVuelto === 'PAGADO') {
                    j.vueltoPagadoBs = (parseNum(j.vueltoPagadoBs) + vueltoBs).toFixed(2);
                } else if (estadoVuelto === 'RETENIDO') {
                    j.vueltoRetenidoBs = (parseNum(j.vueltoRetenidoBs) + vueltoBs).toFixed(2);
                }
            }
            demoStore.persist();
            return Promise.resolve(ticket as unknown as T);
        }
        case 'listar_cuentas':
            return Promise.resolve(demoStore.cuentas as unknown as T);
        case 'abrir_cuenta': {
            const etiqueta = String(args?.etiqueta || 'Mesa Demo').trim();
            const tipo = args?.tipo === 'deuda' ? 'deuda' : 'activa';
            const cliente = typeof args?.cliente === 'string' ? args.cliente.trim() : undefined;
            const nota = typeof args?.nota === 'string' ? args.nota.trim() : undefined;
            const ahora = new Date();
            const { fechaStr } = fechaHoraActualVet(ahora);
            const c: CuentaAbierta = {
                ventaId: (tipo === 'deuda' ? 'DEU-' : 'CTA-') + Math.random().toString(36).slice(2, 8).toUpperCase(),
                etiqueta,
                tipo,
                cliente,
                nota,
                fechaCreacionUnix: Math.floor(ahora.getTime() / 1000),
                fechaCreacionStr: fechaStr,
                totalParcialUsd: '0.00',
                totalParcialBs: '0.00',
                abonosUsd: '0.00',
                abonosBs: '0.00',
                lineas: 0,
                consumos: [],
            };
            demoStore.cuentas.push(c);
            demoStore.persist();
            return Promise.resolve(c as unknown as T);
        }
        case 'editar_cuenta': {
            const ventaId = String(args?.ventaId || '');
            const etiqueta = typeof args?.etiqueta === 'string' ? args.etiqueta.trim() : undefined;
            const cliente = typeof args?.cliente === 'string' ? args.cliente.trim() : undefined;
            const nota = typeof args?.nota === 'string' ? args.nota.trim() : undefined;
            const cuenta = demoStore.cuentas.find((c) => c.ventaId === ventaId);
            if (!cuenta) {
                return Promise.reject(new Error('Cuenta no encontrada'));
            }
            if (etiqueta) {
                cuenta.etiqueta = etiqueta;
            }
            if (cliente !== undefined) {
                cuenta.cliente = cliente || undefined;
            }
            if (nota !== undefined) {
                cuenta.nota = nota || undefined;
            }
            demoStore.persist();
            return Promise.resolve(cuenta as unknown as T);
        }
        case 'convertir_cuenta_a_deuda': {
            const ventaId = String(args?.ventaId || '');
            const cliente = String(args?.cliente || '').trim();
            const nota = typeof args?.nota === 'string' ? args.nota.trim() : undefined;
            const cuenta = demoStore.cuentas.find((c) => c.ventaId === ventaId);
            if (!cuenta) {
                return Promise.reject(new Error('Cuenta no encontrada'));
            }
            cuenta.tipo = 'deuda';
            if (cliente) {
                cuenta.cliente = cliente;
                cuenta.etiqueta = cliente;
            }
            if (nota !== undefined) {
                cuenta.nota = nota;
            }
            demoStore.persist();
            return Promise.resolve(cuenta as unknown as T);
        }
        case 'agregar_consumo': {
            const ventaId = String(args?.ventaId || '');
            const sku = String(args?.sku || '').trim().toUpperCase();
            const cant = parseNum(args?.cantidad) || 1;
            const modo = String(args?.modoVenta || args?.modo_venta || 'unidad');
            const cuenta = demoStore.cuentas.find((c) => c.ventaId === ventaId);
            const prod = demoStore.productos.find((p) => p.sku.trim().toUpperCase() === sku);
            if (cuenta && prod) {
                const pres = modo !== 'unidad'
                    ? prod.presentaciones?.find((p) => p.nombre.toLowerCase() === modo.toLowerCase())
                    : undefined;
                const esPaquete = !pres && modo === 'paquete' && (prod.precioPaqueteUsd || (prod.esCaja && prod.unidadesPorCaja && prod.unidadesPorCaja > 1));
                const unidadesPaquete = pres
                    ? pres.unidades
                    : (esPaquete ? (prod.unidadesPorCaja || 1) : 1);
                const precioEfectivo = pres
                    ? parseNum(pres.precioUsd)
                    : (esPaquete
                        ? (prod.precioPaqueteUsd ? parseNum(prod.precioPaqueteUsd) : parseNum(prod.precioUsd) * unidadesPaquete)
                        : parseNum(prod.precioUsd));
                const unidades = cant * unidadesPaquete;
                if (!prod.sinStock) {
                    const st = parseNum(prod.stock);
                    if (st < unidades) {
                        return Promise.reject(new Error(`Stock insuficiente para "${prod.nombre}". Disponible: ${st} ${prod.unidad || 'un.'}`));
                    }
                    prod.stock = String(Math.max(0, st - unidades));
                }

                if (!Array.isArray(cuenta.consumos)) cuenta.consumos = [];
                const subUsd = precioEfectivo * cant;
                const tasa = parseNum(demoStore.tasaActual.valor) || 807.39;

                const existente = cuenta.consumos.find((x) => x.sku.trim().toUpperCase() === prod.sku.trim().toUpperCase() && x.modoVenta === modo);
                if (existente) {
                    existente.cantidad += cant;
                    existente.subtotalUsd = (existente.cantidad * parseNum(existente.precioUsd)).toFixed(2);
                } else {
                    cuenta.consumos.push({
                        id: 'con-' + Math.random().toString(36).slice(2, 8),
                        sku: prod.sku,
                        nombre: prod.nombre,
                        cantidad: cant,
                        precioUsd: precioEfectivo.toFixed(2),
                        subtotalUsd: subUsd.toFixed(2),
                        modoVenta: modo,
                    });
                }
                const nuevoTotU = cuenta.consumos.reduce((acc, it) => acc + parseNum(it.subtotalUsd), 0);
                cuenta.totalParcialUsd = nuevoTotU.toFixed(2);
                cuenta.totalParcialBs = (nuevoTotU * tasa).toFixed(2);
                cuenta.lineas = cuenta.consumos.length;
                demoStore.persist();
                return Promise.resolve(cuenta as unknown as T);
            }
            return Promise.resolve(cuenta as unknown as T);
        }
        case 'eliminar_consumo': {
            const ventaId = String(args?.ventaId || '');
            const consumoId = String(args?.consumoId || '');
            const cantARemover = args?.cantidad !== undefined && args?.cantidad !== null ? parseNum(args.cantidad) : 0;
            const cuenta = demoStore.cuentas.find((c) => c.ventaId === ventaId);
            if (cuenta && Array.isArray(cuenta.consumos)) {
                const idx = cuenta.consumos.findIndex((x) => x.id === consumoId);
                if (idx !== -1) {
                    const item = cuenta.consumos[idx];
                    const prod = demoStore.productos.find((p) => p.sku.trim().toUpperCase() === item.sku.trim().toUpperCase());
                    const pres = item.modoVenta && item.modoVenta !== 'unidad' && prod?.presentaciones
                        ? prod.presentaciones.find((p) => p.nombre.toLowerCase() === item.modoVenta?.toLowerCase())
                        : undefined;
                    const esPaquete = !pres && item.modoVenta === 'paquete';
                    const multUnidades = pres
                        ? pres.unidades
                        : (esPaquete && prod?.unidadesPorCaja && prod.unidadesPorCaja > 1 ? prod.unidadesPorCaja : 1);

                    if (cantARemover > 0 && cantARemover < item.cantidad) {
                        item.cantidad -= cantARemover;
                        item.subtotalUsd = (item.cantidad * parseNum(item.precioUsd)).toFixed(2);
                        if (prod && !prod.sinStock) {
                            prod.stock = String(parseNum(prod.stock) + (cantARemover * multUnidades));
                        }
                    } else {
                        // Reintegrar todo
                        if (prod && !prod.sinStock) {
                            prod.stock = String(parseNum(prod.stock) + (item.cantidad * multUnidades));
                        }
                        cuenta.consumos.splice(idx, 1);
                    }
                    const tasa = parseNum(demoStore.tasaActual.valor) || 807.39;
                    const nuevoTotU = cuenta.consumos.reduce((acc, it) => acc + parseNum(it.subtotalUsd), 0);
                    cuenta.totalParcialUsd = nuevoTotU.toFixed(2);
                    cuenta.totalParcialBs = (nuevoTotU * tasa).toFixed(2);
                    cuenta.lineas = cuenta.consumos.length;
                    demoStore.persist();
                }
                return Promise.resolve(cuenta as unknown as T);
            }
            return Promise.resolve(cuenta as unknown as T);
        }
        case 'cerrar_cuenta': {
            const ventaId = String(args?.ventaId || '');
            const idx = demoStore.cuentas.findIndex((c) => c.ventaId === ventaId);
            if (idx === -1) {
                const existingTicket = demoStore.tickets.find(t => t.ventaId === ventaId);
                if (existingTicket) return Promise.resolve(existingTicket as unknown as T);
                return Promise.reject(new Error('Cuenta no encontrada'));
            }
            const cuenta = demoStore.cuentas[idx];
            let totalUsd = '0.00';
            let totalBs = '0.00';
            let lineas: LineaTicket[] = [];
            let saldoAFavorConsolidadoUsd = 0;
            const tasaParam = parseNum(args?.tasaCobro);
            const tasa = tasaParam > 0 ? tasaParam : (Number(demoStore.tasaActual.valor) || 807.39);
            const esDeuda = cuenta?.tipo === 'deuda';
            if (cuenta) {
                const totalConsumosU = Number(cuenta.totalParcialUsd);
                const totalAbonadoU = Number(cuenta.abonosUsd || '0');
                const saldoAFavorU = Math.max(0, totalAbonadoU - totalConsumosU);
                saldoAFavorConsolidadoUsd = saldoAFavorU;

                const ingresoTotalCuentaUsd = Math.max(totalConsumosU, totalAbonadoU);
                totalUsd = ingresoTotalCuentaUsd.toFixed(2);
                totalBs = (ingresoTotalCuentaUsd * tasa).toFixed(2);

                demoStore.cuentas.splice(idx, 1);
                demoStore.ventasTotalUsd += ingresoTotalCuentaUsd;
                demoStore.ventasTotalBs += ingresoTotalCuentaUsd * tasa;

                lineas = (cuenta.consumos || []).map((c) => ({
                    sku: c.sku,
                    nombre: c.nombre,
                    cantidad: String(c.cantidad),
                    precioUsd: c.precioUsd,
                    tasaBloqueada: tasa.toFixed(4),
                    subtotalUsd: c.subtotalUsd,
                    subtotalBs: (Number(c.subtotalUsd) * tasa).toFixed(2),
                }));

                if (saldoAFavorU > 0) {
                    lineas.push({
                        sku: 'GANANCIA-EXCEDENTE',
                        nombre: 'Saldo a Favor Consolidado como Ganancia (Excedente Retenido)',
                        cantidad: '1',
                        precioUsd: saldoAFavorU.toFixed(2),
                        tasaBloqueada: tasa.toFixed(4),
                        subtotalUsd: saldoAFavorU.toFixed(2),
                        subtotalBs: (saldoAFavorU * tasa).toFixed(2),
                    });
                }
            }
            const ahora = new Date();
            const horaStr = horaActualVet(ahora);
            const pagosRecibidos: PagoTicket[] = Array.isArray(args?.pagos) && args.pagos.length > 0
                ? (args.pagos as PagoTicket[])
                : [
                    {
                        metodo: esDeuda ? 'TRANSF.BS.' : 'BS.EFEC.',
                        moneda: 'BS',
                        montoUsd: totalUsd,
                        montoBs: totalBs,
                    },
                ];
            const montoRecibidoBsNum = Number(args?.montoRecibidoBs || totalBs);
            const vueltoBs = Math.max(0, montoRecibidoBsNum - Number(totalBs));
            const resVuelto = args?.resolucionVuelto as ResolucionVuelto | undefined;
            const estadoVuelto: EstadoVuelto = vueltoBs > 0.009 ? (resVuelto?.estado || 'PAGADO') : 'SIN_VUELTO';
            const metodoVuelto = estadoVuelto === 'PAGADO' ? (resVuelto?.metodo || (esDeuda ? 'TRANSF.BS.' : 'BS.EFEC.')) : undefined;
            const montoVueltoBs = vueltoBs > 0.009 ? (resVuelto?.montoBs || vueltoBs.toFixed(2)) : undefined;
            const montoVueltoUsd = vueltoBs > 0.009 ? (resVuelto?.montoUsd || (tasa > 0 ? (vueltoBs / tasa).toFixed(2) : '0.00')) : undefined;
            const tasaVuelto = estadoVuelto === 'PAGADO' ? resVuelto?.tasa : undefined;

            const opActual = demoStore.jornadaActual?.operadorActual || 'Caja Principal';
            const ticket: Ticket = {
                ventaId: ventaId || (esDeuda ? 'DEU-' : 'CTA-') + Math.floor(10000 + Math.random() * 90000),
                totalUsd,
                totalBs,
                tasaDelDia: tasa.toFixed(4),
                montoRecibidoBs: montoRecibidoBsNum.toFixed(2),
                vueltoBs: vueltoBs.toFixed(2),
                fechaHora: `Hoy, ${horaStr}`,
                fechaUnix: Math.floor(ahora.getTime() / 1000),
                canal: esDeuda ? 'LIQUIDACION DE DEUDA' : 'CONSUMO EN CUENTA',
                operador: opActual,
                saldoAFavorConsolidadoUsd: saldoAFavorConsolidadoUsd > 0 ? saldoAFavorConsolidadoUsd.toFixed(2) : undefined,
                pagos: pagosRecibidos,
                estadoVuelto,
                metodoVuelto,
                montoVueltoBs,
                montoVueltoUsd,
                tasaVuelto,
                lineas,
            };
            demoStore.tickets.unshift(ticket);
            if (demoStore.jornadaActual) {
                const j = demoStore.jornadaActual;
                const totU = parseNum(totalUsd);
                const totB = parseNum(totalBs);
                j.ventasTotalUsd = (parseNum(j.ventasTotalUsd) + totU).toFixed(2);
                j.ventasTotalBs = (parseNum(j.ventasTotalBs) + totB).toFixed(2);
                j.ticketsEmitidos += 1;
                if (esDeuda) {
                    j.deudasLiquidadasUsd = (parseNum(j.deudasLiquidadasUsd) + totU).toFixed(2);
                }
                if (estadoVuelto === 'PAGADO') {
                    j.vueltoPagadoBs = (parseNum(j.vueltoPagadoBs) + vueltoBs).toFixed(2);
                } else if (estadoVuelto === 'RETENIDO') {
                    j.vueltoRetenidoBs = (parseNum(j.vueltoRetenidoBs) + vueltoBs).toFixed(2);
                }
            }
            demoStore.persist();
            return Promise.resolve(ticket as unknown as T);
        }
        case 'listar_categorias':
            return Promise.resolve(demoStore.categorias as unknown as T);
        case 'crear_categoria': {
            const nombre = String(args?.nombre || '').trim();
            const id = 'cat-' + Math.random().toString(36).slice(2, 7);
            demoStore.categorias.push({ id, nombre });
            demoStore.persist();
            return Promise.resolve(demoStore.categorias as unknown as T);
        }
        case 'eliminar_categoria': {
            const id = String(args?.id || '');
            demoStore.categorias = demoStore.categorias.filter((c) => c.id !== id);
            demoStore.persist();
            return Promise.resolve(demoStore.categorias as unknown as T);
        }
        case 'listar_tasas_impuestos':
            return Promise.resolve(demoStore.tasasImpuestos as unknown as T);
        case 'crear_tasa_impuesto': {
            const nombre = String(args?.nombre || '').trim();
            const porcentaje = Number(args?.porcentaje || 0);
            const id = 'tax-' + Math.random().toString(36).slice(2, 7);
            demoStore.tasasImpuestos.push({ id, nombre, porcentaje: String(porcentaje) });
            demoStore.persist();
            return Promise.resolve(demoStore.tasasImpuestos as unknown as T);
        }
        case 'eliminar_tasa_impuesto': {
            const id = String(args?.id || '');
            demoStore.tasasImpuestos = demoStore.tasasImpuestos.filter((t) => t.id !== id);
            demoStore.persist();
            return Promise.resolve(demoStore.tasasImpuestos as unknown as T);
        }
        case 'abonar_cuenta': {
            const ventaId = String(args?.ventaId || '');
            const montoUsd = Number(args?.montoUsd || 0);
            const montoBsAporte = Number(args?.montoBs || 0);
            const cuenta = demoStore.cuentas.find((c) => c.ventaId === ventaId);
            if (cuenta && Number.isFinite(montoUsd) && montoUsd > 0 && montoUsd <= 50000) {
                // Reject payments on accounts with no products — prevents floating data
                const tieneProductos = Array.isArray(cuenta.consumos) && cuenta.consumos.length > 0;
                const tieneTotal = parseNum(cuenta.totalParcialUsd) > 0;
                if (!tieneProductos && !tieneTotal) {
                    return Promise.resolve(null as unknown as T);
                }
                const tasa = Number(demoStore.tasaActual.valor);
                const prevAbonoUsd = Number(cuenta.abonosUsd || '0');
                const prevAbonoBs = Number(cuenta.abonosBs || '0');
                if (montoBsAporte > 0) {
                    const nuevoAbonoBs = prevAbonoBs + montoBsAporte;
                    cuenta.abonosBs = nuevoAbonoBs.toFixed(2);
                    cuenta.abonosUsd = (tasa > 0 ? nuevoAbonoBs / tasa : 0).toFixed(2);
                } else {
                    const nuevoAbonoUsd = prevAbonoUsd + montoUsd;
                    cuenta.abonosUsd = nuevoAbonoUsd.toFixed(2);
                    cuenta.abonosBs = (nuevoAbonoUsd * tasa).toFixed(2);
                }
                demoStore.persist();
            }
            return Promise.resolve(cuenta as unknown as T);
        }
        case 'editar_abono_cuenta': {
            const ventaId = String(args?.ventaId || '');
            const nuevoAbonoUsd = Math.max(0, Math.min(50000, Number(args?.nuevoAbonoUsd || 0)));
            const cuenta = demoStore.cuentas.find((c) => c.ventaId === ventaId);
            if (cuenta && Number.isFinite(nuevoAbonoUsd)) {
                const tasa = Number(demoStore.tasaActual.valor);
                cuenta.abonosUsd = nuevoAbonoUsd.toFixed(2);
                cuenta.abonosBs = (nuevoAbonoUsd * tasa).toFixed(2);
                demoStore.persist();
            }
            return Promise.resolve(cuenta as unknown as T);
        }
        case 'datos_panel': {
            const tasa = Number(demoStore.tasaActual.valor);
            const totalVentasUsd = demoStore.ventasTotalUsd;
            const totalVentasBs = demoStore.ventasTotalBs;

            let totalVentaCatalogoUsd = 0;
            let totalCostoCatalogoUsd = 0;
            demoStore.productos.forEach((p) => {
                const precioVenta = Number(p.precioUsd) || 0;
                const precioBruto = Number(p.precioBrutoUsd) || 0;
                if (precioVenta > 0) {
                    totalVentaCatalogoUsd += precioVenta;
                    if (precioBruto > 0) {
                        totalCostoCatalogoUsd += precioBruto;
                    }
                }
            });
            const margenPromedio = totalVentaCatalogoUsd > 0 && totalCostoCatalogoUsd > 0
                ? (totalVentaCatalogoUsd - totalCostoCatalogoUsd) / totalVentaCatalogoUsd
                : 0;
            const costoTotalUsd = totalVentasUsd * (1 - margenPromedio);
            const gananciaBrutaUsd = totalVentasUsd - costoTotalUsd;
            const impuestosUsd = totalVentasUsd * 0.12;
            const gananciaNetaUsd = gananciaBrutaUsd - impuestosUsd;
            const gananciaNetaSinImpUsd = gananciaBrutaUsd;
            const gananciaNetaBs = gananciaNetaUsd * tasa;

            // Auditoría y agregación analítica de todos los productos comercializados
            const conteoPorSku: Record<string, { qty: number; monto: number; nombre: string }> = {};
            // Agregar ventas reales desde los tickets
            demoStore.tickets.forEach((t) => {
                t.lineas.forEach((l) => {
                    if (!conteoPorSku[l.sku]) {
                        conteoPorSku[l.sku] = { qty: 0, monto: 0, nombre: l.nombre };
                    }
                    conteoPorSku[l.sku].qty += Number(l.cantidad) || 1;
                    conteoPorSku[l.sku].monto += Number(l.subtotalUsd) || 0;
                });
            });

            // Complementar con productos del catálogo para que todos sean visibles en la analítica
            demoStore.productos.forEach((p, idx) => {
                if (!conteoPorSku[p.sku]) {
                    const cantEst = Math.max(1, 14 - idx * 2);
                    conteoPorSku[p.sku] = {
                        qty: cantEst,
                        monto: cantEst * Number(p.precioUsd),
                        nombre: p.nombre,
                    };
                }
            });

            const listaArticulos = Object.values(conteoPorSku).sort((a, b) => b.monto - a.monto);
            const sumaTotalMagnitud = listaArticulos.reduce((acc, curr) => acc + curr.monto, 0) || 1;

            const top = listaArticulos.map((item) => ({
                nombre: item.nombre,
                cantidad: String(item.qty),
                totalUsd: item.monto.toFixed(2),
                porcentaje: ((item.monto / sumaTotalMagnitud) * 100).toFixed(1),
            }));

            const tasaActualNum = Number(demoStore.tasaActual.valor) || 807.39;
            let totalGeneralBrutoUsd = 0;
            const mapaCategorias: Record<string, {
                categoriaId: string;
                nombre: string;
                cantidadProductos: number;
                unidadesStock: number;
                brutoUsd: number;
                ventaUsd: number;
            }> = {};

            demoStore.categorias.forEach((c) => {
                mapaCategorias[c.id] = {
                    categoriaId: c.id,
                    nombre: c.nombre,
                    cantidadProductos: 0,
                    unidadesStock: 0,
                    brutoUsd: 0,
                    ventaUsd: 0,
                };
            });
            if (!mapaCategorias['cat-general']) {
                mapaCategorias['cat-general'] = {
                    categoriaId: 'cat-general',
                    nombre: 'General',
                    cantidadProductos: 0,
                    unidadesStock: 0,
                    brutoUsd: 0,
                    ventaUsd: 0,
                };
            }

            demoStore.productos.forEach((p) => {
                const catId = (p.categoriaId && mapaCategorias[p.categoriaId]) ? p.categoriaId : 'cat-general';
                const itemCat = mapaCategorias[catId];
                itemCat.cantidadProductos += 1;
                const stock = p.sinStock ? 0 : (Number(p.stock) || 0);
                const brutoUnit = Number(p.precioBrutoUsd) > 0 ? Number(p.precioBrutoUsd) : (Number(p.precioUsd) * 0.65);
                const ventaUnit = Number(p.precioUsd) || 0;
                const subBruto = stock * brutoUnit;
                const subVenta = stock * ventaUnit;
                itemCat.unidadesStock += stock;
                itemCat.brutoUsd += subBruto;
                itemCat.ventaUsd += subVenta;
                totalGeneralBrutoUsd += subBruto;
            });

            const dineroPorCategoria: CategoriaDineroBruto[] = Object.values(mapaCategorias)
                .filter((c) => c.cantidadProductos > 0 || c.brutoUsd > 0)
                .map((c) => {
                    const margenUsd = Math.max(0, c.ventaUsd - c.brutoUsd);
                    const margenPct = c.ventaUsd > 0 ? ((margenUsd / c.ventaUsd) * 100).toFixed(1) : '0.0';
                    const pctCap = totalGeneralBrutoUsd > 0 ? ((c.brutoUsd / totalGeneralBrutoUsd) * 100).toFixed(1) : '0.0';
                    return {
                        categoriaId: c.categoriaId,
                        nombre: c.nombre,
                        cantidadProductos: c.cantidadProductos,
                        unidadesStock: Math.round(c.unidadesStock * 100) / 100,
                        dineroBrutoUsd: c.brutoUsd.toFixed(2),
                        dineroBrutoBs: (c.brutoUsd * tasaActualNum).toFixed(2),
                        dineroVentaUsd: c.ventaUsd.toFixed(2),
                        dineroVentaBs: (c.ventaUsd * tasaActualNum).toFixed(2),
                        margenBrutoProyectadoUsd: margenUsd.toFixed(2),
                        margenBrutoPct: margenPct,
                        porcentajeCapital: pctCap,
                    };
                })
                .sort((a, b) => Number(b.dineroBrutoUsd) - Number(a.dineroBrutoUsd));

            const deudasLista = demoStore.cuentas.filter((c) => c.tipo === 'deuda');
            const cuentasActivasLista = demoStore.cuentas.filter((c) => c.tipo !== 'deuda');
            const dineroEnLaCalleUsd = deudasLista.reduce((acc, c) => acc + Math.max(0, parseNum(c.totalParcialUsd) - parseNum(c.abonosUsd)), 0);
            const dineroEnLaCalleBs = dineroEnLaCalleUsd * tasaActualNum;

            const panel: PanelDatos = {
                ventas24hUsd: totalVentasUsd.toFixed(2),
                ventas24hBs: totalVentasBs.toFixed(2),
                tickets24h: Math.max(demoStore.tickets.length, 18),
                valorInventarioUsd: demoStore.productos
                    .reduce((a, p) => a + Number(p.precioUsd) * Number(p.stock), 0)
                    .toFixed(2),
                costoTotalUsd: costoTotalUsd.toFixed(2),
                gananciaBrutaUsd: gananciaBrutaUsd.toFixed(2),
                gananciaNetaUsd: gananciaNetaUsd.toFixed(2),
                gananciaNetaSinImpUsd: gananciaNetaSinImpUsd.toFixed(2),
                gananciaNetaBs: gananciaNetaBs.toFixed(2),
                cuentasAbiertas: cuentasActivasLista.length,
                deudasAbiertas: deudasLista.length,
                dineroEnLaCalleUsd: dineroEnLaCalleUsd.toFixed(2),
                dineroEnLaCalleBs: dineroEnLaCalleBs.toFixed(2),
                criticos: demoStore.productos
                    .filter((p) => !p.sinStock && Number(p.stock) <= 5)
                    .map((p) => ({ sku: p.sku, nombre: p.nombre, stock: p.stock })),
                topProductos: top,
                dineroPorCategoria,
            };
            return Promise.resolve(panel as unknown as T);
        }
        case 'compra_stock': {
            const sku = String(args?.sku || '');
            const cant = Number(args?.cantidad || '0');
            const prod = demoStore.productos.find((p) => p.sku === sku);
            if (prod && Number.isFinite(cant) && cant > 0) {
                prod.stock = String(Number(prod.stock) + cant);
                demoStore.persist();
                return Promise.resolve(prod.stock as unknown as T);
            }
            return Promise.resolve('0' as unknown as T);
        }
        case 'reducir_stock': {
            const sku = String(args?.sku || '');
            const cant = Number(args?.cantidad || '0');
            const prod = demoStore.productos.find((p) => p.sku === sku);
            if (prod && Number.isFinite(cant) && cant > 0) {
                prod.stock = String(Math.max(0, Number(prod.stock) - cant));
                demoStore.persist();
                return Promise.resolve(prod.stock as unknown as T);
            }
            return Promise.resolve('0' as unknown as T);
        }
        case 'registrar_merma': {
            const sku = String(args?.sku || '');
            const cant = Number(args?.cantidad || '0');
            const prod = demoStore.productos.find((p) => p.sku === sku);
            if (prod && Number.isFinite(cant) && cant > 0) {
                prod.stock = String(Math.max(0, Number(prod.stock) - cant));
                demoStore.persist();
                return Promise.resolve(prod.stock as unknown as T);
            }
            return Promise.resolve('0' as unknown as T);
        }
        case 'listar_respaldos':
            return Promise.resolve(demoStore.respaldos as unknown as T);
        case 'crear_respaldo': {
            const id = 'bk-' + Math.random().toString(36).slice(2, 7);
            const totalRegs = demoStore.productos.length + demoStore.cuentas.length + demoStore.categorias.length;
            const now = new Date();
            const nomNegocio = (demoStore.config?.nombre || 'DATIOLABS')
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '-')
                .replace(/-+/g, '-')
                .slice(0, 30);
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const hh = String(now.getHours()).padStart(2, '0');
            const min = String(now.getMinutes()).padStart(2, '0');
            const ss = String(now.getSeconds()).padStart(2, '0');
            const archivoNombre = `RESPALDO-MANUAL-${nomNegocio}-${yyyy}${mm}${dd}-${hh}${min}${ss}.backup`;

            const resp: RespaldoInfo = {
                id,
                fecha: `${yyyy}-${mm}-${dd} ${hh}:${min}`,
                archivoNombre,
                registros: totalRegs,
                tamanoKb: Math.round(totalRegs * 0.4 + 10),
                checksumSha256: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
            };
            demoStore.respaldos.unshift(resp);
            demoStore.persist();
            return Promise.resolve(resp as unknown as T);
        }
        case 'restaurar_desde_respaldo':
        case 'restaurar_desde_archivo': {
            // Restaurar datos limpios: catálogo, inventario, categorías, cuentas y tasas
            demoStore.persist();
            return Promise.resolve(true as unknown as T);
        }
        case 'obtener_licencia':
            return Promise.resolve(demoStore.licencia as unknown as T);
        case 'generar_licencia':
            return Promise.resolve(generarLicenciaUniversal() as unknown as T);
        case 'validar_licencia': {
            const clave = String(args?.clave || '');
            return Promise.resolve(validarLicenciaUniversal(clave) as unknown as T);
        }
        case 'obtener_tasa_bcv':
            return Promise.resolve(demoStore.tasaActual as unknown as T);
        case 'forzar_actualizacion_tasa':
            return demoStore.refrescarTasaEnVivo().then(() => demoStore.tasaActual as unknown as T);
        case 'volver_a_bcv':
            return demoStore.refrescarTasaEnVivo().then(() => demoStore.tasaActual as unknown as T);
        case 'listar_historico_tasas':
            return Promise.resolve(demoStore.historicoTasas as unknown as T);
        case 'fijar_tasa_manual': {
            const nueva = String(args?.tasa || '0');
            const numNueva = Number(nueva);
            const numAnt = Number(demoStore.tasaActual.valor);
            let diffPct: string | null = null;
            let dir: 'subio' | 'bajo' | 'estable' | null = null;
            if (Number.isFinite(numAnt) && numAnt > 0 && Number.isFinite(numNueva) && numNueva > 0 && numAnt !== numNueva) {
                const pct = ((numNueva - numAnt) / numAnt) * 100;
                diffPct = Math.abs(pct).toFixed(2);
                dir = pct > 0 ? 'subio' : 'bajo';
            }
            demoStore.tasaActual = {
                valor: numNueva.toFixed(4),
                fechaUnix: Math.floor(Date.now() / 1000),
                fluctuacionPct: diffPct,
                direccion: dir,
            };
            const ahora = new Date();
            const horaStr = horaActualVet(ahora);
            demoStore.historicoTasas.unshift({
                id: 'tx-' + Math.random().toString(36).slice(2, 7),
                valor: numNueva.toFixed(4),
                fechaHora: `Hoy, ${horaStr}`,
                tipo: 'manual',
                motivo: 'Ajuste manual por el usuario',
            });
            if (demoStore.historicoTasas.length > 50) demoStore.historicoTasas.pop();
            demoStore.persist();
            return Promise.resolve(demoStore.tasaActual as unknown as T);
        }
        case 'listar_ventas':
            return Promise.resolve(demoStore.tickets as unknown as T);
        case 'listar_anulaciones':
            return Promise.resolve(demoStore.anulaciones as unknown as T);
        case 'listar_redondeos':
            return Promise.resolve(demoStore.redondeos as unknown as T);
        case 'previsualizar_cierre_cuenta': {
            const ventaIdPrev = String(args?.ventaId || '');
            const cuenta = demoStore.cuentas.find((c) => c.ventaId === ventaIdPrev);
            const tasaPrev = parseNum(args?.tasaCobro) || Number(demoStore.tasaActual.valor) || 0;
            const totalUsd = Math.max(0, parseNum(cuenta?.totalParcialUsd) - parseNum(cuenta?.abonosUsd));
            const totalBs = Math.max(0, totalUsd * tasaPrev - parseNum(cuenta?.abonosBs));
            return Promise.resolve({
                totalUsd: totalUsd.toFixed(2),
                totalBs: totalBs.toFixed(2),
                tasaAplicada: tasaPrev.toFixed(4),
            } as unknown as T);
        }
        case 'listar_lotes':
            return Promise.resolve(demoStore.lotes as unknown as T);
        case 'crear_lote': {
            const skuLote = String(args?.sku || '').trim().toUpperCase();
            const cantidadLote = parseNum(args?.cantidad);
            const caduceUnix = Number(args?.caduceUnix || 0);
            const prodLote = demoStore.productos.find((p) => p.sku.toUpperCase() === skuLote);
            if (!prodLote || cantidadLote <= 0 || caduceUnix <= Math.floor(Date.now() / 1000)) {
                return Promise.reject(
                    new Error('Lote invalido: producto existente, cantidad mayor a cero y caducidad futura'),
                );
            }
            const idLote = 'LOT-' + Math.random().toString(36).slice(2, 8).toUpperCase();
            demoStore.lotes.push({
                id: idLote,
                sku: skuLote,
                cantidadInicial: cantidadLote.toFixed(2),
                disponible: cantidadLote.toFixed(2),
                horneadoUnix: Math.floor(Date.now() / 1000),
                caduceUnix,
            });
            prodLote.stock = String(parseNum(prodLote.stock) + cantidadLote);
            demoStore.persist();
            return Promise.resolve(idLote as unknown as T);
        }
        case 'eliminar_venta': {
            const ventaId = String(args?.ventaId || '');
            const idx = demoStore.tickets.findIndex((t) => t.ventaId === ventaId);
            if (idx === -1) {
                return Promise.reject(new Error('Venta no encontrada'));
            }
            const ticket = demoStore.tickets[idx];

            // Reintegrar stock de cada línea vendida
            if (Array.isArray(ticket.lineas)) {
                ticket.lineas.forEach((linea) => {
                    const prod = demoStore.productos.find((p) => p.sku.trim().toUpperCase() === linea.sku.trim().toUpperCase());
                    if (prod && !prod.sinStock) {
                        const modo = linea.modoVenta || 'unidad';
                        const pres = modo !== 'unidad'
                            ? prod.presentaciones?.find((p) => p.nombre.toLowerCase() === modo.toLowerCase())
                            : undefined;
                        const esPaquete = !pres && modo === 'paquete' && (prod.precioPaqueteUsd || (prod.esCaja && prod.unidadesPorCaja && prod.unidadesPorCaja > 1));
                        const multUnidades = pres
                            ? pres.unidades
                            : (esPaquete ? (prod.unidadesPorCaja || 1) : 1);
                        const cant = parseNum(linea.cantidad) || 1;
                        prod.stock = String(parseNum(prod.stock) + (cant * multUnidades));
                    }
                });
            }

            // Libro de anulaciones: se conserva la constancia con su turno.
            demoStore.anulaciones.unshift({
                id: 'anu-' + Math.random().toString(36).slice(2, 8),
                ventaId: ticket.ventaId,
                etiqueta: ticket.canal || 'Venta directa',
                totalUsd: String(ticket.totalUsd),
                totalBs: String(ticket.totalBs),
                fechaAnulacionUnix: Math.floor(Date.now() / 1000),
                operador: demoStore.jornadaActual?.operadorActual,
                motivo: 'ERROR OPERATIVO',
            });

            // Eliminar ticket
            demoStore.tickets.splice(idx, 1);

            // Ajustar jornada activa si pertenecía a ella
            if (demoStore.jornadaActual) {
                const j = demoStore.jornadaActual;
                if ((ticket.fechaUnix || 0) >= j.inicioUnix) {
                    const u = parseNum(ticket.totalUsd);
                    const b = parseNum(ticket.totalBs);
                    j.ventasTotalUsd = Math.max(0, parseNum(j.ventasTotalUsd) - u).toFixed(2);
                    j.ventasTotalBs = Math.max(0, parseNum(j.ventasTotalBs) - b).toFixed(2);
                    if (j.ticketsEmitidos > 0) j.ticketsEmitidos -= 1;
                    if (ticket.canal === 'LIQUIDACION DE DEUDA') {
                        j.deudasLiquidadasUsd = Math.max(0, parseNum(j.deudasLiquidadasUsd) - u).toFixed(2);
                    }
                    const vueltoB = parseNum(ticket.vueltoBs);
                    if (ticket.estadoVuelto === 'PAGADO' && vueltoB > 0) {
                        j.vueltoPagadoBs = Math.max(0, parseNum(j.vueltoPagadoBs) - vueltoB).toFixed(2);
                    } else if (ticket.estadoVuelto === 'RETENIDO' && vueltoB > 0) {
                        j.vueltoRetenidoBs = Math.max(0, parseNum(j.vueltoRetenidoBs) - vueltoB).toFixed(2);
                    }
                }
            }

            demoStore.ventasTotalUsd = Math.max(0, demoStore.ventasTotalUsd - parseNum(ticket.totalUsd));
            demoStore.ventasTotalBs = Math.max(0, demoStore.ventasTotalBs - parseNum(ticket.totalBs));

            demoStore.persist();
            return Promise.resolve(true as unknown as T);
        }
        case 'listar_metodos_pago': {
            demoStore.metodosPago.sort((a, b) => (a.moneda === b.moneda ? 0 : a.moneda === 'BS' ? -1 : 1));
            return Promise.resolve(demoStore.metodosPago as unknown as T);
        }
        case 'crear_metodo_pago': {
            const raw = String(args?.nombre || '').trim().toUpperCase().replace(/[^A-Z0-9. _-]/g, '').slice(0, 25);
            const moneda: MonedaMetodo = args?.moneda === 'USD' ? 'USD' : 'BS';
            if (raw && !demoStore.metodosPago.some((m) => m.nombre === raw)) {
                demoStore.metodosPago.push({ nombre: raw, moneda });
                demoStore.metodosPago.sort((a, b) => (a.moneda === b.moneda ? 0 : a.moneda === 'BS' ? -1 : 1));
                demoStore.persist();
            }
            return Promise.resolve(demoStore.metodosPago as unknown as T);
        }
        case 'eliminar_metodo_pago': {
            const nombre = String(args?.nombre || '').trim().toUpperCase();
            if (nombre) {
                demoStore.metodosPago = demoStore.metodosPago.filter((m) => m.nombre !== nombre);
                // Garantizar al menos un método por contingencia
                if (demoStore.metodosPago.length === 0) {
                    demoStore.metodosPago.push({ nombre: 'PUNTOD.VENTA', moneda: 'BS' });
                }
                demoStore.persist();
            }
            return Promise.resolve(demoStore.metodosPago as unknown as T);
        }
        case 'listar_operadores':
            return Promise.resolve(demoStore.operadores as unknown as T);
        case 'crear_operador': {
            const nombre = String(args?.nombre || '').trim();
            if (nombre) {
                const op: OperadorInfo = {
                    id: 'op-' + Math.random().toString(36).slice(2, 7),
                    nombre,
                    activo: true,
                    creadoUnix: Math.floor(Date.now() / 1000),
                };
                demoStore.operadores.push(op);
                demoStore.persist();
            }
            return Promise.resolve(demoStore.operadores as unknown as T);
        }
        case 'editar_operador': {
            const id = String(args?.id || '');
            const nuevoNombre = String(args?.nombre || '').trim();
            if (id && nuevoNombre) {
                const op = demoStore.operadores.find((o) => o.id === id);
                if (op) {
                    const nombreViejo = op.nombre;
                    op.nombre = nuevoNombre;
                    if (demoStore.jornadaActual) {
                        if (demoStore.jornadaActual.operadorActual === nombreViejo) {
                            demoStore.jornadaActual.operadorActual = nuevoNombre;
                        }
                        if (demoStore.jornadaActual.operadoresActivos) {
                            demoStore.jornadaActual.operadoresActivos = demoStore.jornadaActual.operadoresActivos.map((n) => n === nombreViejo ? nuevoNombre : n);
                        }
                        if (demoStore.jornadaActual.operadoresRelevo) {
                            demoStore.jornadaActual.operadoresRelevo = demoStore.jornadaActual.operadoresRelevo.map((n) => n === nombreViejo ? nuevoNombre : n);
                        }
                    }
                    demoStore.persist();
                }
            }
            return Promise.resolve(demoStore.operadores as unknown as T);
        }
        case 'eliminar_operador': {
            const id = String(args?.id || '');
            if (id) {
                const op = demoStore.operadores.find((o) => o.id === id);
                const nombreEliminado = op?.nombre;
                demoStore.operadores = demoStore.operadores.filter((o) => o.id !== id);
                if (demoStore.jornadaActual && nombreEliminado) {
                    if (demoStore.jornadaActual.operadoresActivos) {
                        demoStore.jornadaActual.operadoresActivos = demoStore.jornadaActual.operadoresActivos.filter((n) => n !== nombreEliminado);
                    }
                    if (demoStore.jornadaActual.operadorActual === nombreEliminado) {
                        demoStore.jornadaActual.operadorActual = demoStore.jornadaActual.operadoresActivos?.[0] || demoStore.operadores[0]?.nombre || 'Cajero Principal';
                    }
                }
                demoStore.persist();
            }
            return Promise.resolve(demoStore.operadores as unknown as T);
        }
        case 'alternar_operador': {
            const id = String(args?.id || '');
            const op = demoStore.operadores.find((o) => o.id === id);
            if (op) {
                op.activo = !op.activo;
                demoStore.persist();
            }
            return Promise.resolve(demoStore.operadores as unknown as T);
        }
        case 'obtener_jornada_actual':
            return Promise.resolve(demoStore.jornadaActual as unknown as T);
        case 'latido':
            return Promise.resolve(true as unknown as T);
        case 'buscar_deudas':
            return Promise.resolve({ totalGrupos: 0, totalDeudas: 0, pagina: 1, porPagina: 50, grupos: [] } as unknown as T);
        case 'detalle_deuda':
            return Promise.resolve({ id: '', nombre: '', abierta: false, aperturaUnix: 0, totalUsd: '0', abonosUsd: '0', abonosBs: '0', saldoUsd: '0', lineas: [] } as unknown as T);
        case 'buscar_historial':
            return Promise.resolve({ total: 0, pagina: 1, porPagina: 50, limiteAlcanzado: false, items: [] } as unknown as T);
        case 'listar_historico_jornadas': {
            // Deduplicate by jornada ID
            const seen = new Set<string>();
            const deduplicated = demoStore.historicoJornadas.filter((j) => {
                if (seen.has(j.id)) return false;
                seen.add(j.id);
                return true;
            });
            return Promise.resolve(deduplicated as unknown as T);
        }
        case 'abrir_jornada': {
            const operador = String(args?.operador || 'Cajero Principal').trim();
            const operadoresLista: string[] = Array.isArray(args?.operadores) && args.operadores.length > 0
                ? args.operadores.map((x: unknown) => String(x).trim()).filter(Boolean)
                : [operador];
            const ahora = new Date();
            const { horaStr, fechaStr, yyyy, mm, dd } = fechaHoraActualVet(ahora);
            const tasaActual = demoStore.tasaActual.valor;
            const jornada: JornadaLaboral = {
                id: `JOR-${yyyy}${mm}${dd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
                estado: 'abierta',
                inicioUnix: Math.floor(Date.now() / 1000),
                inicioStr: `Hoy, ${horaStr} (${fechaStr})`,
                operadorInicial: operadoresLista[0] || operador,
                operadorActual: operadoresLista.join(', '),
                operadoresActivos: operadoresLista,
                operadoresRelevo: [...operadoresLista],
                tasaInicio: tasaActual,
                ventasTotalUsd: '0.00',
                ventasTotalBs: '0.00',
                ticketsEmitidos: 0,
                vueltoPagadoBs: '0.00',
                vueltoRetenidoBs: '0.00',
                deudasLiquidadasUsd: '0.00',
                entradasStockReg: 0,
                mermasStockReg: 0,
                cambiosPrecioReg: 0,
            };
            demoStore.jornadaActual = jornada;
            demoStore.persist();
            return Promise.resolve(jornada as unknown as T);
        }
        case 'asignar_operadores_turno': {
            const lista = Array.isArray(args?.operadores) ? args.operadores.map((x: unknown) => String(x).trim()).filter(Boolean) : [];
            if (demoStore.jornadaActual) {
                demoStore.jornadaActual.operadoresActivos = lista;
                demoStore.jornadaActual.operadorActual = lista.length > 0 ? lista.join(', ') : 'Sin operador asignado';
                lista.forEach((op) => {
                    if (!demoStore.jornadaActual?.operadoresRelevo.includes(op)) {
                        demoStore.jornadaActual?.operadoresRelevo.push(op);
                    }
                });
                demoStore.persist();
            }
            return Promise.resolve(demoStore.jornadaActual as unknown as T);
        }
        case 'relevar_operador_jornada': {
            const op = String(args?.operador || '').trim();
            if (demoStore.jornadaActual && op) {
                demoStore.jornadaActual.operadorActual = op;
                demoStore.jornadaActual.operadoresActivos = [op];
                if (!demoStore.jornadaActual.operadoresRelevo.includes(op)) {
                    demoStore.jornadaActual.operadoresRelevo.push(op);
                }
                demoStore.persist();
            }
            return Promise.resolve(demoStore.jornadaActual as unknown as T);
        }
        case 'cerrar_jornada': {
            if (!demoStore.jornadaActual) {
                return Promise.reject(new Error('No existe una jornada laboral abierta para cerrar.'));
            }
            const ahora = new Date();
            const { fechaStr } = fechaHoraActualVet(ahora);
            const jor = { ...demoStore.jornadaActual };
            jor.estado = 'cerrada';
            jor.finUnix = Math.floor(Date.now() / 1000);
            jor.finStr = `${fechaStr}`;
            jor.tasaFin = demoStore.tasaActual.valor;
            jor.checksumSha256 = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
            demoStore.historicoJornadas.unshift(jor);
            demoStore.jornadaActual = null;
            demoStore.persist();
            return Promise.resolve(jor as unknown as T);
        }
        case 'obtener_semaforo_stock':
            return Promise.resolve(demoStore.semaforoStock as unknown as T);
        case 'guardar_semaforo_stock': {
            const rojo = Math.max(1, Number(args?.rojoMax) || 5);
            const amarillo = Math.max(rojo + 1, Number(args?.amarilloMax) || 15);
            demoStore.semaforoStock = { rojoMax: rojo, amarilloMax: amarillo };
            demoStore.persist();
            return Promise.resolve(demoStore.semaforoStock as unknown as T);
        }
        default:
            return Promise.resolve(null as unknown as T);
    }
}

export const api = {
    config: () => invocar<ConfigInfo | null>('obtener_config'),
    inicializar: (nombre: string, rubros: number, pin: string, licenciaClave?: string, privacidadInventario?: boolean) =>
        invocar<void>('inicializar_negocio', { nombre, rubros, pinDueno: pin || null, licenciaClave: licenciaClave || null, licenciaTitular: null, privacidadInventario: privacidadInventario ?? false }),
    validarPin: (pin: string) => invocar<boolean>('validar_pin_dueno', { pin }),
    productos: () => invocar<ProductoInfo[]>('listar_productos'),
    crearProducto: (p: {
        sku?: string; nombre: string; precioBrutoUsd?: string; margenPct?: string;
        precioUsd: string; impuestoPct: string; stockInicial: string;
        pesable: boolean; perecedero?: boolean; alcoholica: boolean; categoriaId?: string; sinStock?: boolean;
        unidad?: 'un' | 'kg' | 'ml'; esCaja?: boolean; unidadesPorCaja?: number;
        precioPaqueteUsd?: string; nombrePaquete?: string;
        presentaciones?: { nombre: string; precioUsd: string; unidades: number }[];
    }) => {
        const sku = p.sku && p.sku.trim() ? p.sku.trim().toUpperCase() : 'PROD-' + Math.random().toString(36).slice(2, 8).toUpperCase();
        return invocar<void>('crear_producto', { input: { ...p, sku } });
    },
    actualizarProducto: (p: {
        sku: string; nombre: string; precioBrutoUsd?: string; margenPct?: string;
        precioUsd: string; impuestoPct: string; stockInicial?: string;
        pesable?: boolean; perecedero?: boolean; alcoholica?: boolean; categoriaId?: string; sinStock?: boolean;
        unidad?: 'un' | 'kg' | 'ml'; esCaja?: boolean; unidadesPorCaja?: number;
        precioPaqueteUsd?: string; nombrePaquete?: string;
        presentaciones?: { nombre: string; precioUsd: string; unidades: number }[];
    }) => {
        return invocar<void>('actualizar_producto', { input: { ...p, stockInicial: p.stockInicial || '0', pesable: p.pesable ?? false, perecedero: p.perecedero ?? false } });
    },
    eliminarProducto: (sku: string) => invocar<void>('eliminar_producto', { sku }),
    registrarVenta: (
        items: { sku: string; cantidad: string; modo_venta?: string; modoVenta?: string }[],
        recibido: string,
        pagos?: PagoTicket[],
        resolucionVuelto?: ResolucionVuelto,
        idempotencyKey?: string,
        tasaCobro?: string,
    ) => {
        const itemsNormalizados = items.map((it) => {
            const modo = it.modoVenta || it.modo_venta;
            return {
                sku: it.sku,
                cantidad: it.cantidad,
                modoVenta: modo,
            };
        });
        return invocar<Ticket>('registrar_venta', {
            items: itemsNormalizados,
            montoRecibidoBs: recibido,
            tasaCobro,
            pagos,
            resolucionVuelto,
            idempotencyKey,
        });
    },
    previsualizarCierreCuenta: (ventaId: string, tasaCobro?: string) =>
        invocar<{ totalUsd: string; totalBs: string; tasaAplicada: string }>(
            'previsualizar_cierre_cuenta',
            { ventaId, tasaCobro },
        ),
    previsualizarCobro: (
        items: { sku: string; cantidad: string; modo_venta?: string; modoVenta?: string }[],
        tasaCobro?: string,
    ) => {
        const itemsNormalizados = items.map((it) => {
            const modo = it.modoVenta || it.modo_venta;
            return { sku: it.sku, cantidad: it.cantidad, modoVenta: modo };
        });
        return invocar<{ totalUsd: string; totalBs: string; tasaAplicada: string }>(
            'previsualizar_cobro',
            { items: itemsNormalizados, tasaCobro },
        );
    },
    abrirCuenta: (etiqueta: string, tipo?: 'activa' | 'deuda', nota?: string, cliente?: string) =>
        invocar<CuentaAbierta>('abrir_cuenta', { etiqueta, tipo, nota, cliente }),
    cuentas: () => invocar<CuentaAbierta[]>('listar_cuentas'),
    agregarConsumo: (ventaId: string, sku: string, cantidad: string, modo_venta?: string) =>
        invocar<CuentaAbierta>('agregar_consumo', { ventaId, sku, cantidad, modoVenta: modo_venta }),
    eliminarConsumo: (ventaId: string, consumoId: string, cantidad?: string | number) =>
        invocar<CuentaAbierta>('eliminar_consumo', { ventaId, consumoId, cantidad: cantidad !== undefined ? String(cantidad) : undefined }),
    abonarCuenta: (ventaId: string, montoUsd: number, montoBs?: number) =>
        invocar<CuentaAbierta>('abonar_cuenta', { ventaId, montoUsd, montoBs }),
    editarAbonoCuenta: (ventaId: string, nuevoAbonoUsd: number) =>
        invocar<CuentaAbierta>('editar_abono_cuenta', { ventaId, nuevoAbonoUsd }),
    convertirCuentaADeuda: (ventaId: string, cliente: string, nota?: string) =>
        invocar<CuentaAbierta>('convertir_cuenta_a_deuda', { ventaId, cliente, nota }),
    editarCuenta: (ventaId: string, etiqueta?: string, cliente?: string, nota?: string) =>
        invocar<CuentaAbierta>('editar_cuenta', { ventaId, etiqueta, cliente, nota }),
    cerrarCuenta: (
        ventaId: string,
        recibido: string,
        tasaCobro?: string,
        pagos?: PagoTicket[],
        resolucionVuelto?: ResolucionVuelto,
    ) =>
        invocar<Ticket>('cerrar_cuenta', { ventaId, montoRecibidoBs: recibido, tasaCobro, pagos, resolucionVuelto }),
    panel: () => invocar<PanelDatos>('datos_panel'),
    compraStock: (sku: string, cantidad: string) =>
        invocar<string>('compra_stock', { sku, cantidad }),
    reducirStock: (sku: string, cantidad: string) =>
        invocar<string>('reducir_stock', { sku, cantidad }),
    merma: (sku: string, cantidad: string, loteId: string | null) =>
        invocar<string>('registrar_merma', { sku, cantidad, loteId }),
    categorias: () => invocar<Categoria[]>('listar_categorias'),
    crearCategoria: (nombre: string) => invocar<Categoria[]>('crear_categoria', { nombre }),
    eliminarCategoria: (id: string) => invocar<Categoria[]>('eliminar_categoria', { id }),
    tasasImpuestos: () => invocar<TasaImpuesto[]>('listar_tasas_impuestos'),
    crearTasaImpuesto: (nombre: string, porcentaje: number) => invocar<TasaImpuesto[]>('crear_tasa_impuesto', { nombre, porcentaje }),
    eliminarTasaImpuesto: (id: string) => invocar<TasaImpuesto[]>('eliminar_tasa_impuesto', { id }),
    respaldos: () => invocar<RespaldoInfo[]>('listar_respaldos'),
    crearRespaldo: () => invocar<RespaldoInfo>('crear_respaldo'),
    restaurarDesdeArchivo: (contenidoBase64: string, nombreArchivo: string, licencia?: string) =>
        invocar<BackupMetadata>('restaurar_desde_archivo', { contenidoBase64, nombreArchivo, licencia }),
    cambiarPinDueno: (pinAnterior: string, pinNuevo: string) =>
        invocar<boolean>('cambiar_pin_dueno', { pinAnterior, pinNuevo }),
    tasa: () => invocar<TasaActual>('obtener_tasa_bcv'),
    historicoTasas: () => invocar<RegistroHistoricoTasa[]>('listar_historico_tasas'),
    volverABcv: () => invocar<TasaActual>('volver_a_bcv'),
    ventas: () => invocar<Ticket[]>('listar_ventas'),
    anulaciones: (limite?: number) =>
        invocar<AnulacionRegistro[]>('listar_anulaciones', { limite }),
    redondeos: (limite?: number) =>
        invocar<RedondeoRegistro[]>('listar_redondeos', { limite }),
    lotes: () => invocar<LoteRegistro[]>('listar_lotes'),
    crearLote: (sku: string, cantidad: string, caduceUnix: number) =>
        invocar<string>('crear_lote', { sku, cantidad, caduceUnix }),
    eliminarVenta: (ventaId: string) => invocar<boolean>('eliminar_venta', { ventaId }),
    listarMetodosPago: () => invocar<MetodoPagoConfig[]>('listar_metodos_pago'),
    crearMetodoPago: (nombre: string, moneda: MonedaMetodo = 'BS') =>
        invocar<MetodoPagoConfig[]>('crear_metodo_pago', { nombre, moneda }),
    eliminarMetodoPago: (nombre: string) =>
        invocar<MetodoPagoConfig[]>('eliminar_metodo_pago', { nombre }),
    listarOperadores: () => invocar<OperadorInfo[]>('listar_operadores'),
    crearOperador: (nombre: string) => invocar<OperadorInfo[]>('crear_operador', { nombre }),
    editarOperador: (id: string, nombre: string) => invocar<OperadorInfo[]>('editar_operador', { id, nombre }),
    eliminarOperador: (id: string) => invocar<OperadorInfo[]>('eliminar_operador', { id }),
    obtenerJornadaActual: () => invocar<JornadaLaboral | null>('obtener_jornada_actual'),
    latido: () => invocar<boolean>('latido'),
    buscarDeudas: (filtros: Record<string, unknown>) => invocar<BusquedaDeudas>('buscar_deudas', filtros),
    detalleDeuda: (ventaId: string) => invocar<DeudaDetalle>('detalle_deuda', { ventaId }),
    buscarHistorial: (filtros: Record<string, unknown>) => invocar<BusquedaHistorial>('buscar_historial', filtros),
    listarHistoricoJornadas: () => invocar<JornadaLaboral[]>('listar_historico_jornadas'),
    abrirJornada: (operador: string, operadores?: string[]) => invocar<JornadaLaboral>('abrir_jornada', { operador, operadores }),
    asignarOperadoresTurno: (operadores: string[]) => invocar<JornadaLaboral>('asignar_operadores_turno', { operadores }),
    cerrarJornada: () => invocar<JornadaLaboral>('cerrar_jornada'),
    obtenerSemaforoStock: () => invocar<ConfigSemaforoStock>('obtener_semaforo_stock'),
    guardarSemaforoStock: (rojoMax: number, amarilloMax: number) =>
        invocar<ConfigSemaforoStock>('guardar_semaforo_stock', { rojoMax, amarilloMax }),
    autoBackup: (directorio: string, maxBackups: number) =>
        invocar<BackupMetadata | null>('auto_backup', { directorio, maxBackups }),
    getBackupDir: () => invocar<string>('get_backup_dir'),
};
