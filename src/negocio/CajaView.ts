import { api, CAP_PESABLE, MetodoPagoConfig, MonedaMetodo, PagoTicket, parseNum, ResolucionVuelto, Ticket } from './api';
import { CajaViewModel } from './CajaViewModel';
import { confirmarAccion, pedirValor } from './dialogs';
import { abrirModalHistorialTurno } from './historialTurno';
import { NegocioModel } from './NegocioModel';

const fmt = (n: number | string | undefined | null): string =>
    parseNum(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Conversion de la calculadora rapida del modal de cobro. Es solo ayuda
// visual para el operador y jamas altera la venta ni sus totales.
export const calcularBsDesdeUsd = (usd: number, tasa: number): string =>
    Number.isFinite(usd) && usd > 0 && Number.isFinite(tasa) && tasa > 0
        ? (usd * tasa).toFixed(2)
        : '';

export const calcularUsdDesdeBs = (bs: number, tasa: number): string =>
    Number.isFinite(bs) && bs > 0 && Number.isFinite(tasa) && tasa > 0
        ? (bs / tasa).toFixed(2)
        : '';

export class CajaView {
    private contenedor: HTMLElement;
    private vm: CajaViewModel;
    private modelo: NegocioModel;
    private modal: HTMLElement;
    private pagosBorrador: Array<{
        id: string;
        metodo: string;
        moneda: MonedaMetodo;
        monto: number;
        tasaCambio: number;
        referencia: string;
    }> | null = null;
    private resolucionVueltoBorrador: {
        estado: 'PAGADO' | 'RETENIDO';
        metodo: string;
        tasa: number;
    } | null = null;
    private semaforoStock: { rojoMax: number; amarilloMax: number } = { rojoMax: 5, amarilloMax: 15 };
    private limpiezas: Array<() => void> = [];
    private destruida = false;
    private handlerInventario = (): void => {
        void this.vm.cargar();
    };

    constructor(contenedor: HTMLElement, modal: HTMLElement, vm: CajaViewModel, modelo: NegocioModel) {
        this.contenedor = contenedor;
        this.modal = modal;
        this.vm = vm;
        this.modelo = modelo;
        void api.obtenerSemaforoStock().then((s) => {
            if (this.destruida) return;
            this.semaforoStock = s;
            this.renderDinamico();
        });
        this.limpiezas.push(this.vm.suscribir(() => this.renderDinamico()));
        this.limpiezas.push(this.modelo.suscribir(() => this.renderDinamico()));
        window.addEventListener('inventario_actualizado', this.handlerInventario);
    }

    /** Libera suscripciones y listeners para no acumular vistas al navegar. */
    destroy(): void {
        this.destruida = true;
        window.removeEventListener('inventario_actualizado', this.handlerInventario);
        this.limpiezas.forEach((f) => f());
        this.limpiezas = [];
    }

    render(): void {
        this.contenedor.innerHTML = `
        <div class="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6">
            <div class="lg:col-span-2 order-2 lg:order-1">
                <input id="caja-buscar" type="text" autocomplete="off" maxlength="40"
                    placeholder="Buscar producto o código..."
                    class="w-full border-2 border-brand-black rounded px-4 py-3 sm:px-5 sm:py-4 text-base sm:text-xl font-body font-bold mb-3 sm:mb-4 focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-brand-cyan/50" />
                <div id="caja-grid" class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4"></div>
                <div id="caja-paginacion" class="mt-4 flex items-center justify-between bg-white border-2 border-brand-black rounded p-2.5 shadow-brutal-sm"></div>
            </div>
            <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-3 sm:p-5 flex flex-col max-h-[75vh] lg:max-h-[80vh] order-1 lg:order-2">
                <div class="flex justify-between items-center border-b-2 border-brand-black pb-2 mb-2 sm:mb-3">
                    <div>
                        <h3 class="font-heading font-black text-lg sm:text-xl leading-none">TICKET EN CURSO</h3>
                        <span class="text-[10px] font-bold text-gray-500 uppercase">Caja Directa</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <button id="btn-historial-turno-caja" title="Ver historial de tickets y recaudación de la jornada activa" class="inline-flex items-center gap-1 text-[11px] font-heading font-black bg-gray-100 text-brand-black border border-brand-black hover:bg-gray-200 px-2 py-1 rounded shadow-brutal-sm transition-transform active:translate-y-0.5">
                            HISTORIAL
                        </button>
                        <button id="btn-gestionar-operadores-caja" title="Asignar o relevar cajero en turno" class="inline-flex items-center gap-1 text-[11px] font-heading font-black bg-purple-100 text-brand-purple border border-brand-purple hover:bg-purple-200 px-2 py-1 rounded">
                            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span id="caja-operadores-activo-texto" class="truncate max-w-[130px]">Operador en caja</span>
                            <span class="text-[10px] text-gray-500">▼</span>
                        </button>
                    </div>
                </div>
                <div id="caja-lineas" class="flex-1 overflow-y-auto space-y-2 sm:space-y-3 min-h-[90px] max-h-[220px] lg:max-h-none"></div>
                <div class="border-t-2 border-brand-black mt-2 sm:mt-3 pt-2 sm:pt-3">
                    <div class="flex justify-between items-baseline">
                        <span class="font-heading font-bold text-xs sm:text-base">TOTAL USD</span>
                        <span id="caja-total-usd" class="font-heading font-black text-lg sm:text-2xl"></span>
                    </div>
                    <div class="flex justify-between items-baseline">
                        <span class="font-heading font-bold text-sm sm:text-lg">TOTAL BS.</span>
                        <span id="caja-total-bs" class="font-heading font-black text-2xl sm:text-4xl text-brand-purple"></span>
                    </div>
                    <div class="grid grid-cols-3 gap-2 mt-3">
                        <button id="caja-cobrar" class="col-span-2 bg-green-600 hover:bg-green-700 disabled:opacity-30 text-white font-heading font-black text-lg sm:text-2xl py-3 sm:py-4 rounded border-2 border-brand-black shadow-brutal transition-transform active:translate-y-1 active:shadow-none">
                            COBRAR
                        </button>
                        <button id="caja-vaciar" class="bg-white font-heading font-bold text-xs sm:text-sm py-2 rounded border-2 border-brand-black hover:bg-red-50">
                            Vaciar
                        </button>
                    </div>
                </div>
            </div>
        </div>`;

        document.getElementById('caja-buscar')?.addEventListener('input', (e) => {
            this.vm.setBusqueda((e.target as HTMLInputElement).value);
        });
        document.getElementById('caja-buscar')?.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            void this.enterRapido();
        });
        document.getElementById('caja-vaciar')?.addEventListener('click', async () => {
            if (this.vm.lineasCarrito.length === 0) return;
            const conf = await confirmarAccion('¿Deseas vaciar todo el carrito de la venta actual?', 'VACIAR TICKET');
            if (!conf) return;
            this.pagosBorrador = null;
            this.resolucionVueltoBorrador = null;
            this.vm.vaciar();
        });
        document.getElementById('caja-cobrar')?.addEventListener('click', () => void this.abrirModalCobro());
        document.getElementById('btn-historial-turno-caja')?.addEventListener('click', () => {
            void abrirModalHistorialTurno(this.modal);
        });
        document.getElementById('btn-gestionar-operadores-caja')?.addEventListener('click', () => void (async () => {
            const j = await api.obtenerJornadaActual();
            if (j === null) {
                void this.abrirModalIniciarJornada();
            } else {
                void this.abrirModalOperadoresCaja();
            }
        })());

        this.renderDinamico();
    }

    private async enterRapido(): Promise<void> {
        const visibles = this.vm.visibles;
        if (visibles.length === 0) return;
        const err = await this.vm.agregar(visibles[0].sku);
        if (err) this.mostrarError(err);
        const input = document.getElementById('caja-buscar') as HTMLInputElement | null;
        if (input) input.value = '';
        this.vm.setBusqueda('');
    }

    private mostrarError(mensaje: string): void {
        this.renderModal(`
            <h3 class="font-heading font-black text-2xl text-red-700 mb-2">Atencion</h3>
            <p class="font-body text-brand-text mb-6">${mensaje}</p>
            <button data-cerrar class="w-full bg-brand-black text-white font-heading font-black py-3 rounded border-2 border-brand-black">ENTENDIDO</button>`);
    }

    private modalContenido(html: string, anchoClase: string = 'max-w-md'): void {
        this.modal.innerHTML = `
        <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
            <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-6 sm:p-8 w-full ${anchoClase} max-h-[90vh] overflow-y-auto">${html}</div>
        </div>`;
    }

    private cerrarModal(): void {
        this.modal.innerHTML = '';
    }

    private renderModal(html: string, anchoClase: string = 'max-w-md'): void {
        this.modalContenido(html, anchoClase);
        this.modal.querySelectorAll('[data-cerrar]').forEach((b) =>
            b.addEventListener('click', () => this.cerrarModal()),
        );
    }

    private async abrirModalOperadoresCaja(): Promise<void> {
        const ops = await api.listarOperadores();
        const j = await api.obtenerJornadaActual();
        const activosEnTurno = new Set(j?.operadoresActivos || [j?.operadorActual || '']);

        const renderContenido = () => {
            const itemsHtml = ops.map(op => {
                const seleccionado = activosEnTurno.has(op.nombre);
                return `
                <div class="flex items-center justify-between p-2.5 rounded border-2 border-brand-black ${seleccionado ? 'bg-purple-50 border-brand-purple' : 'bg-gray-50'}">
                    <label class="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                        <input type="checkbox" data-cajero-chk="${op.id}" value="${op.nombre}" ${seleccionado ? 'checked' : ''} class="w-4 h-4 rounded text-brand-purple" />
                        <div>
                            <span class="font-heading font-black text-sm text-brand-black truncate block">${op.nombre}</span>
                            <span class="text-[10px] text-gray-500 font-bold">${op.activo ? 'Operador Activo' : 'Inactivo'}</span>
                        </div>
                    </label>
                    <div class="flex items-center gap-1 shrink-0">
                        <button data-cajero-edit="${op.id}" data-cajero-nom="${op.nombre}" title="Editar nombre" class="text-xs bg-white border border-gray-400 rounded px-1.5 py-0.5 hover:bg-gray-100">✎</button>
                        <button data-cajero-del="${op.id}" data-cajero-nom="${op.nombre}" title="Eliminar operador" class="text-xs text-red-600 bg-white border border-gray-400 rounded px-1.5 py-0.5 hover:bg-red-50">✕</button>
                    </div>
                </div>`;
            }).join('');

            this.modalContenido(`
                <div>
                    <div class="flex justify-between items-center border-b-2 border-brand-black pb-2 mb-3">
                        <div>
                            <span class="text-[10px] font-black uppercase tracking-wider text-brand-purple">Atención y Relevos</span>
                            <h3 class="font-heading font-black text-xl">OPERADORES EN CAJA</h3>
                        </div>
                        <button data-cerrar class="w-8 h-8 rounded border-2 border-brand-black font-black flex items-center justify-center hover:bg-gray-100">&times;</button>
                    </div>
                    <p class="text-xs text-gray-600 font-bold mb-3">
                        Selecciona uno o varios operadores despachando simultáneamente en este turno:
                    </p>
                    <div class="space-y-2 max-h-56 overflow-y-auto pr-1 mb-4">
                        ${itemsHtml}
                    </div>
                    <!-- Formulario rápido para nuevo cajero -->
                    <form id="form-nuevo-cajero-caja" class="flex gap-2 mb-4">
                        <input id="in-nuevo-cajero-caja" type="text" maxlength="30" placeholder="Registrar nuevo empleado..." class="flex-1 border-2 border-brand-black rounded px-3 py-1.5 text-xs font-bold" />
                        <button type="submit" class="bg-brand-black text-white px-3 py-1.5 rounded font-black font-heading text-xs hover:bg-gray-800 shadow-brutal-sm">+ AGREGAR</button>
                    </form>
                    <div class="grid grid-cols-2 gap-3 border-t-2 border-brand-black pt-3">
                        <button id="btn-cancelar-operadores-caja" class="bg-white border-2 border-brand-black font-heading font-black py-2.5 rounded text-xs">CANCELAR</button>
                        <button id="btn-guardar-operadores-caja" class="bg-brand-purple text-white font-heading font-black py-2.5 rounded border-2 border-brand-black shadow-brutal-sm text-xs">ASIGNAR A TURNO</button>
                    </div>
                </div>
            `, 'max-w-md');

            this.modal.querySelector('[data-cerrar]')?.addEventListener('click', () => this.cerrarModal());
            this.modal.querySelector('#btn-cancelar-operadores-caja')?.addEventListener('click', () => this.cerrarModal());

            // Editar cajero
            this.modal.querySelectorAll<HTMLButtonElement>('button[data-cajero-edit]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.dataset.cajeroEdit || '';
                    const nom = btn.dataset.cajeroNom || '';
                    const nuevo = await pedirValor('Modificar nombre del operador:', nom, 'EDITAR OPERADOR');
                    if (nuevo && nuevo.trim() && nuevo.trim() !== nom) {
                        await api.editarOperador(id, nuevo.trim());
                        this.cerrarModal();
                        void this.abrirModalOperadoresCaja();
                        this.renderDinamico();
                    }
                });
            });

            // Eliminar cajero
            this.modal.querySelectorAll<HTMLButtonElement>('button[data-cajero-del]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.dataset.cajeroDel || '';
                    const nom = btn.dataset.cajeroNom || '';
                    if (await confirmarAccion(`¿Confirmas eliminar al operador "${nom}"?`, 'ELIMINAR OPERADOR')) {
                        await api.eliminarOperador(id);
                        this.cerrarModal();
                        void this.abrirModalOperadoresCaja();
                        this.renderDinamico();
                    }
                });
            });

            // Registrar nuevo cajero directamente
            this.modal.querySelector('#form-nuevo-cajero-caja')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const inp = this.modal.querySelector<HTMLInputElement>('#in-nuevo-cajero-caja');
                const nombre = inp?.value.trim() || '';
                if (nombre) {
                    await api.crearOperador(nombre);
                    this.cerrarModal();
                    void this.abrirModalOperadoresCaja();
                    this.renderDinamico();
                }
            });

            // Guardar asignación al turno
            this.modal.querySelector('#btn-guardar-operadores-caja')?.addEventListener('click', async () => {
                const checkedBoxes = this.modal.querySelectorAll<HTMLInputElement>('input[data-cajero-chk]:checked');
                const nombres: string[] = [];
                checkedBoxes.forEach(cb => {
                    if (cb.value) nombres.push(cb.value);
                });
                if (nombres.length === 0) {
                    this.mostrarToast('Debes seleccionar al menos un operador activo en turno.', 'error');
                    return;
                }
                await api.asignarOperadoresTurno(nombres);
                this.cerrarModal();
                this.renderDinamico();
            });
        };

        renderContenido();
    }

    private async abrirModalIniciarJornada(): Promise<void> {
        const ops = await api.listarOperadores();

        const renderContenido = () => {
            const itemsHtml = ops.length > 0
                ? ops.map((op, idx) => `
                <div class="flex items-center p-2.5 rounded border-2 border-brand-black ${idx === 0 ? 'bg-purple-50 border-brand-purple' : 'bg-gray-50'}">
                    <label class="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                        <input type="checkbox" data-inicio-cajero-chk value="${op.nombre}" ${idx === 0 ? 'checked' : ''} class="w-4 h-4 rounded text-brand-purple" />
                        <div>
                            <span class="font-heading font-black text-sm text-brand-black truncate block">${op.nombre}</span>
                            <span class="text-[10px] text-gray-500 font-bold">${op.activo ? 'Operador Activo' : 'Inactivo'}</span>
                        </div>
                    </label>
                </div>`).join('')
                : '<p class="text-xs text-gray-500 font-bold text-center py-3">No hay operadores registrados. Registra uno abajo para continuar.</p>';

            this.modalContenido(`
                <div>
                    <div class="flex justify-between items-center border-b-2 border-brand-black pb-2 mb-3">
                        <div>
                            <span class="text-[10px] font-black uppercase tracking-wider text-red-700">Sin turno activo</span>
                            <h3 class="font-heading font-black text-xl">INICIAR TURNO</h3>
                        </div>
                        <button data-cerrar class="w-8 h-8 rounded border-2 border-brand-black font-black flex items-center justify-center hover:bg-gray-100">&times;</button>
                    </div>
                    <p class="text-xs text-gray-600 font-bold mb-3">
                        Selecciona los cajeros que atenderan en este turno:
                    </p>
                    <div class="space-y-2 max-h-56 overflow-y-auto pr-1 mb-4">
                        ${itemsHtml}
                    </div>
                    <!-- Formulario rapido para nuevo cajero -->
                    <form id="form-nuevo-cajero-inicio" class="flex gap-2 mb-4">
                        <input id="in-nuevo-cajero-inicio" type="text" maxlength="30" placeholder="Registrar nuevo empleado..." class="flex-1 border-2 border-brand-black rounded px-3 py-1.5 text-xs font-bold" />
                        <button type="submit" class="bg-brand-black text-white px-3 py-1.5 rounded font-black font-heading text-xs hover:bg-gray-800 shadow-brutal-sm">+ AGREGAR</button>
                    </form>
                    <div class="grid grid-cols-2 gap-3 border-t-2 border-brand-black pt-3">
                        <button id="btn-cancelar-inicio-jornada" class="bg-white border-2 border-brand-black font-heading font-black py-2.5 rounded text-xs">CANCELAR</button>
                        <button id="btn-abrir-turno" class="bg-green-600 text-white font-heading font-black py-2.5 rounded border-2 border-brand-black shadow-brutal-sm text-xs">ABRIR TURNO</button>
                    </div>
                </div>
            `, 'max-w-md');

            this.modal.querySelector('[data-cerrar]')?.addEventListener('click', () => this.cerrarModal());
            this.modal.querySelector('#btn-cancelar-inicio-jornada')?.addEventListener('click', () => this.cerrarModal());

            // Registrar nuevo cajero directamente
            this.modal.querySelector('#form-nuevo-cajero-inicio')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const inp = this.modal.querySelector<HTMLInputElement>('#in-nuevo-cajero-inicio');
                const nombre = inp?.value.trim() || '';
                if (nombre) {
                    await api.crearOperador(nombre);
                    this.cerrarModal();
                    void this.abrirModalIniciarJornada();
                }
            });

            // Abrir turno con los cajeros seleccionados
            this.modal.querySelector('#btn-abrir-turno')?.addEventListener('click', async () => {
                const checkedBoxes = this.modal.querySelectorAll<HTMLInputElement>('input[data-inicio-cajero-chk]:checked');
                const nombres: string[] = [];
                checkedBoxes.forEach((cb) => {
                    if (cb.value) nombres.push(cb.value);
                });
                if (nombres.length === 0) {
                    this.mostrarToast('Selecciona al menos un operador para abrir el turno.', 'error');
                    return;
                }
                const primerOperador = nombres[0];
                await api.abrirJornada(primerOperador, nombres);
                this.cerrarModal();
                this.renderDinamico();
            });
        };

        renderContenido();
    }

    private async abrirModalCobro(): Promise<void> {
        if (this.vm.lineasCarrito.length === 0) return;

        let metodosDisponibles: MetodoPagoConfig[] = [];
        try {
            metodosDisponibles = await api.listarMetodosPago();
        } catch (e) {
            console.warn('No se pudieron cargar los metodos de pago; usando lista por defecto', e);
            metodosDisponibles = [
                { nombre: 'PUNTOD.VENTA', moneda: 'BS' },
                { nombre: 'BIOPAGO', moneda: 'BS' },
                { nombre: 'PAGO MOVIL', moneda: 'BS' },
                { nombre: 'TRANSF.BS.', moneda: 'BS' },
                { nombre: 'BS.EFEC.', moneda: 'BS' },
                { nombre: 'DOL.CASH', moneda: 'USD' },
                { nombre: 'ZELLE', moneda: 'USD' },
                { nombre: 'BINAN.USDT', moneda: 'USD' },
            ];
        }

        const tasaTicket = this.vm.tasaTicket;
        // Totales exactos calculados por el backend (Decimal): lo mostrado es
        // exactamente lo que se cobra y se graba, sin desvios de redondeo.
        let totalVentaUsd = Number(this.vm.totalUsd.toFixed(2));
        let totalVentaBs = Number((totalVentaUsd * tasaTicket).toFixed(2));
        try {
            const itemsPreview = this.vm.lineasCarrito.map((l) => ({
                sku: l.sku,
                cantidad: String(l.cantidad),
                modoVenta: l.modoVenta,
            }));
            const prev = await api.previsualizarCobro(
                itemsPreview,
                tasaTicket > 0 ? tasaTicket.toFixed(2) : undefined,
            );
            totalVentaUsd = parseNum(prev.totalUsd);
            totalVentaBs = parseNum(prev.totalBs);
        } catch (e) {
            this.mostrarError(e instanceof Error ? e.message : String(e));
            return;
        }

        interface LineaCobro {
            id: string;
            metodo: string;
            moneda: 'USD' | 'BS';
            monto: number;
            tasaCambio: number;
            referencia: string;
        }

        const defMetodo = metodosDisponibles.find((m) => m.nombre === 'BIOPAGO') ||
            metodosDisponibles.find((m) => m.moneda === 'BS') ||
            metodosDisponibles[0] ||
            { nombre: 'BIOPAGO', moneda: 'BS' as const };
        let lineasCobro: LineaCobro[];
        if (this.pagosBorrador && this.pagosBorrador.length > 0) {
            lineasCobro = this.pagosBorrador.map((p) => ({ ...p }));
            // Recálculo reactivo: si el cajero volvió a caja a añadir más productos:
            if (lineasCobro.length === 1 && lineasCobro[0]) {
                // Línea única: absorbe el 100% del total nuevo de la venta
                const unico = lineasCobro[0];
                unico.monto = unico.moneda === 'USD' ? totalVentaUsd : totalVentaBs;
                unico.tasaCambio = tasaTicket;
            } else if (lineasCobro.length > 1) {
                // Líneas múltiples: recalcular si hay diferencia con el nuevo total de la venta
                let sumaBs = 0;
                for (let i = 0; i < lineasCobro.length - 1; i++) {
                    const l = lineasCobro[i];
                    const t = l.tasaCambio > 0 ? l.tasaCambio : tasaTicket;
                    sumaBs += l.moneda === 'USD' ? l.monto * t : l.monto;
                }
                const restoBs = Math.max(0, Math.round((totalVentaBs - sumaBs) * 100) / 100);
                const ultima = lineasCobro[lineasCobro.length - 1];
                if (ultima) {
                    ultima.monto = ultima.moneda === 'USD'
                        ? (tasaTicket > 0 ? Number((restoBs / tasaTicket).toFixed(2)) : 0)
                        : restoBs;
                    ultima.tasaCambio = tasaTicket;
                }
            }
        } else {
            lineasCobro = [
                {
                    id: 'p-1',
                    metodo: defMetodo.nombre,
                    moneda: defMetodo.moneda,
                    monto: defMetodo.moneda === 'USD' ? totalVentaUsd : totalVentaBs,
                    tasaCambio: tasaTicket,
                    referencia: '',
                },
            ];
        }

        // Normaliza metodos que ya no existen (o cambiaron de moneda): lo que
        // muestra el selector debe ser exactamente lo que se envia al backend.
        lineasCobro.forEach((l) => {
            const existe = metodosDisponibles.some((m) => m.nombre === l.metodo && m.moneda === l.moneda);
            if (!existe) {
                const reemplazo = metodosDisponibles.find((m) => m.moneda === l.moneda) || metodosDisponibles[0];
                if (reemplazo) {
                    l.metodo = reemplazo.nombre;
                    l.moneda = reemplazo.moneda;
                }
            }
        });

        let estadoVuelto: 'PAGADO' | 'RETENIDO' = this.resolucionVueltoBorrador?.estado || 'PAGADO';
        let metodoVuelto: string = this.resolucionVueltoBorrador?.metodo || 'BS.EFEC.';
        let tasaVuelto: number = this.resolucionVueltoBorrador?.tasa || tasaTicket;

        if (!metodosDisponibles.some((m) => m.nombre === metodoVuelto)) {
            metodoVuelto = metodosDisponibles[0]?.nombre || 'BS.EFEC.';
        }

        let mostrandoNuevoMetodo = false;

        const calcularTotales = () => {
            let cubiertoBs = 0;
            for (const l of lineasCobro) {
                if (l.moneda === 'USD') {
                    const t = l.tasaCambio > 0 ? l.tasaCambio : tasaTicket;
                    cubiertoBs += l.monto * t;
                } else {
                    cubiertoBs += l.monto;
                }
            }
            cubiertoBs = Math.round(cubiertoBs * 100) / 100;
            const cubiertoUsd = tasaTicket > 0 ? Math.round((cubiertoBs / tasaTicket) * 100) / 100 : 0;
            const faltanteBs = Math.max(0, Math.round((totalVentaBs - cubiertoBs) * 100) / 100);
            const faltanteUsd = tasaTicket > 0 ? Math.max(0, Math.round((faltanteBs / tasaTicket) * 100) / 100) : 0;
            const vueltoBs = Math.max(0, Math.round((cubiertoBs - totalVentaBs) * 100) / 100);
            const vueltoUsd = tasaTicket > 0 ? Math.max(0, Math.round((vueltoBs / tasaTicket) * 100) / 100) : 0;
            const puedeConfirmar = cubiertoBs >= totalVentaBs - 0.01 && lineasCobro.every((l) => l.monto > 0);

            return {
                cubiertoUsd,
                cubiertoBs,
                faltanteUsd,
                faltanteBs,
                vueltoUsd,
                vueltoBs,
                puedeConfirmar,
            };
        };

        const generarBalanceHtml = (tActual: ReturnType<typeof calcularTotales>) => {
            const cfgMetodoVuelto = metodosDisponibles.find((m) => m.nombre === metodoVuelto);
            const metodoVueltoEsUsd = cfgMetodoVuelto?.moneda === 'USD';
            const tasaVueltoEfectiva = tasaVuelto > 0 ? tasaVuelto : tasaTicket;
            const montoVueltoUsdCalculado = metodoVueltoEsUsd && tasaVueltoEfectiva > 0
                ? Number((tActual.vueltoBs / tasaVueltoEfectiva).toFixed(2))
                : tActual.vueltoUsd;

            if (tActual.faltanteBs > 0.009) {
                return `
                <div class="bg-amber-50 border-2 border-amber-500 rounded p-3 text-center mb-3">
                    <p class="text-xs font-black uppercase text-amber-900">Monto Incompleto por Cubrir</p>
                    <p class="font-heading font-black text-xl text-amber-700">Faltan Bs. ${fmt(tActual.faltanteBs)} · <span class="text-base text-amber-900">$ ${fmt(tActual.faltanteUsd)} (Equiv. Oficial)</span></p>
                </div>`;
            }

            if (tActual.vueltoBs > 0.009) {
                return `
                <div class="border-2 border-emerald-700 bg-emerald-50/70 rounded-lg p-3 mb-3">
                    <div class="flex flex-wrap items-center justify-between gap-1 mb-2">
                        <div>
                            <span class="text-[10px] font-black uppercase text-emerald-900 tracking-wide block">Excedente / Vuelto del Cliente</span>
                            <span class="font-heading font-black text-xl text-emerald-800">Bs. ${fmt(tActual.vueltoBs)}</span>
                        </div>
                        <span class="text-xs font-bold text-emerald-900 font-mono">$ ${fmt(tActual.vueltoUsd)} equiv. USD</span>
                    </div>

                    <!-- Selector: Entregar Vuelto vs Retener Vuelto -->
                    <div class="grid grid-cols-2 gap-2 mb-2.5">
                        <button type="button" id="btn-vuelto-pagado" class="py-1.5 px-2 rounded border-2 text-xs font-heading font-black transition-all ${estadoVuelto === 'PAGADO' ? 'bg-emerald-700 text-white border-brand-black shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}">
                            ENTREGAR VUELTO (PAGADO)
                        </button>
                        <button type="button" id="btn-vuelto-retenido" class="py-1.5 px-2 rounded border-2 text-xs font-heading font-black transition-all ${estadoVuelto === 'RETENIDO' ? 'bg-emerald-700 text-white border-brand-black shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}">
                            RETENER VUELTO (A FAVOR)
                        </button>
                    </div>

                    ${estadoVuelto === 'PAGADO' ? `
                    <div class="bg-white border border-emerald-600 rounded p-2.5 space-y-2">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <label class="text-[11px] font-bold text-gray-700 uppercase">Método de Egreso del Vuelto:</label>
                            <select id="select-metodo-vuelto" class="border-2 border-brand-black rounded px-2 py-1 text-xs font-bold bg-white focus:outline-none">
                                ${metodosDisponibles.map((m) => `
                                    <option value="${m.nombre}" ${m.nombre === metodoVuelto ? 'selected' : ''}>
                                        ${m.nombre} (${m.moneda === 'USD' ? '$ Dólares' : 'Bs. Bolívares'})
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        ${metodoVueltoEsUsd ? `
                        <div class="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-gray-100">
                            <div>
                                <span class="text-[10px] font-bold text-gray-500 uppercase block">Tasa Pactada Vuelto USD:</span>
                                <div class="flex items-center gap-1.5">
                                    <input id="input-tasa-vuelto" type="text" inputmode="decimal" value="${tasaVuelto.toFixed(2)}"
                                        class="w-24 border-2 border-brand-black rounded px-2 py-0.5 text-xs font-mono font-bold" />
                                    <button id="btn-reset-tasa-vuelto" type="button" title="Restablecer a la tasa base del ticket" class="text-[10px] bg-gray-100 border border-gray-400 rounded px-1.5 py-0.5 hover:bg-gray-200 font-bold">
                                        Tasa Base
                                    </button>
                                </div>
                            </div>
                            <div class="text-right">
                                <span class="text-[10px] font-bold text-gray-500 uppercase block">Divisa USD a Entregar:</span>
                                <span class="font-heading font-black text-base text-brand-purple">
                                    $ ${fmt(montoVueltoUsdCalculado)} USD
                                </span>
                            </div>
                        </div>
                        ` : `
                        <div class="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
                            <span class="font-bold text-gray-600">Total a Entregar en Bolívares:</span>
                            <span class="font-heading font-black text-base text-brand-black">Bs. ${fmt(tActual.vueltoBs)}</span>
                        </div>
                        `}
                    </div>
                    ` : `
                    <div class="bg-white border border-gray-300 rounded p-2 text-xs text-gray-700">
                        <p class="font-bold text-emerald-900 mb-0.5">Vuelto Retenido como Saldo a Favor</p>
                        <p class="text-[11px] text-gray-600 leading-tight">
                            Excedente de <b>Bs. ${fmt(tActual.vueltoBs)} ($ ${fmt(tActual.vueltoUsd)})</b> asentado a favor sin egreso de efectivo.
                        </p>
                    </div>
                    `}
                </div>`;
            }

            return `
            <div class="bg-emerald-50 border-2 border-emerald-600 rounded p-2.5 text-center mb-3">
                <p class="text-xs font-black uppercase text-emerald-800">Total Exactamente Cubierto</p>
                <p class="text-xs text-emerald-700 font-bold">Importe liquidado sin diferencia pendiente.</p>
            </div>`;
        };

        const renderFormularioCobro = () => {
            const t = calcularTotales();

            const metodosUsd = metodosDisponibles.filter((m) => m.moneda === 'USD');
            const metodosBs = metodosDisponibles.filter((m) => m.moneda === 'BS');

            const filasHtml = lineasCobro
                .map((p, idx) => {
                    const optUsd = metodosUsd
                        .map(
                            (m) =>
                                `<option value="${m.nombre}" data-moneda="USD" ${m.nombre === p.metodo && m.moneda === p.moneda ? 'selected' : ''}>${m.nombre} ($ - Tasa Dinámica)</option>`,
                        )
                        .join('');
                    const optBs = metodosBs
                        .map(
                            (m) =>
                                `<option value="${m.nombre}" data-moneda="BS" ${m.nombre === p.metodo && m.moneda === p.moneda ? 'selected' : ''}>${m.nombre} (Bs.)</option>`,
                        )
                        .join('');

                    const opcionesMetodos = `
                        <optgroup label="MÉTODOS EN BOLÍVARES (Bs.)">
                            ${optBs}
                        </optgroup>
                        <optgroup label="MÉTODOS EN DÓLARES ($ - TASA PROPIA)">
                            ${optUsd}
                        </optgroup>
                    `;

                    const tasaUsd = p.tasaCambio > 0 ? p.tasaCambio : tasaTicket;
                    const aporteBs = p.moneda === 'USD' ? p.monto * tasaUsd : p.monto;
                    const equivOficialUsd = tasaTicket > 0 ? aporteBs / tasaTicket : 0;

                    return `
                    <div data-pago-card="${p.id}" class="border-2 border-brand-black rounded-lg p-3 bg-gray-50 mb-2.5">
                        <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <span class="font-heading font-black text-xs uppercase text-gray-700">
                                Pago #${idx + 1} · <span class="${p.moneda === 'USD' ? 'text-brand-purple' : 'text-brand-black'}">${p.moneda === 'USD' ? 'Divisa ($ USD)' : 'Moneda Nacional (Bs.)'}</span>
                            </span>
                            ${
                                lineasCobro.length > 1
                                    ? `<button data-eliminar-pago="${p.id}" class="text-xs font-black text-red-600 hover:text-red-800 bg-red-50 border border-red-300 rounded px-2 py-0.5">Eliminar</button>`
                                    : ''
                            }
                        </div>
                        ${
                            p.moneda === 'USD'
                                ? `
                        <div class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                            <div class="sm:col-span-4">
                                <label class="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Medio en Divisa</label>
                                <select data-pago-metodo="${p.id}" class="w-full border-2 border-brand-black rounded px-2.5 py-1.5 font-heading font-black text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple">
                                    ${opcionesMetodos}
                                </select>
                            </div>
                            <div class="sm:col-span-3">
                                <label class="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Monto ($ USD)</label>
                                <div class="flex items-center">
                                    <span class="bg-brand-black text-white px-2 py-1.5 rounded-l border-y-2 border-l-2 border-brand-black text-xs font-mono font-bold">$</span>
                                    <input type="number" step="0.01" min="0.01" max="999999" data-pago-monto="${p.id}" value="${p.monto > 0 ? p.monto : ''}" placeholder="0.00"
                                        class="w-full border-2 border-brand-black rounded-r px-2 py-1.5 text-xs font-mono font-black focus:outline-none focus:ring-2 focus:ring-brand-purple text-right" />
                                </div>
                            </div>
                            <div class="sm:col-span-3">
                                <div class="flex items-center justify-between mb-0.5">
                                    <label class="block text-[10px] font-bold text-gray-500 uppercase">Tasa (Bs./$)</label>
                                    <button type="button" data-reset-tasa="${p.id}" class="text-[9px] font-black uppercase text-brand-purple hover:underline" title="Restablecer a la tasa base del ticket">Base: ${fmt(tasaTicket)}</button>
                                </div>
                                <input type="number" step="0.01" min="1" max="100000" data-pago-tasa="${p.id}" value="${tasaUsd > 0 ? tasaUsd : tasaTicket}"
                                    class="w-full border-2 border-brand-black rounded px-2 py-1.5 text-xs font-mono font-black focus:outline-none focus:ring-2 focus:ring-brand-purple text-right" />
                            </div>
                            <div class="sm:col-span-2">
                                <label class="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Referencia</label>
                                <input type="text" maxlength="25" data-pago-ref="${p.id}" value="${p.referencia || ''}" placeholder="Opcional"
                                    class="w-full border-2 border-brand-black rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-purple" />
                            </div>
                        </div>
                        <div data-aporte-info="${p.id}" class="flex flex-wrap items-center justify-between gap-1 mt-1.5 text-[11px]">
                            <span class="font-bold text-brand-purple">Aporte: Bs. ${fmt(aporteBs)}</span>
                            <span class="text-gray-500 font-mono">Aporte computable: $ ${fmt(equivOficialUsd)} ${tasaUsd !== tasaTicket ? `(Tasa pactada: Bs. ${fmt(tasaUsd)} vs Base: Bs. ${fmt(tasaTicket)})` : ''}</span>
                        </div>
                        `
                                : `
                        <div class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                            <div class="sm:col-span-5">
                                <label class="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Medio en Bolívares</label>
                                <select data-pago-metodo="${p.id}" class="w-full border-2 border-brand-black rounded px-2.5 py-1.5 font-heading font-black text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple">
                                    ${opcionesMetodos}
                                </select>
                            </div>
                            <div class="sm:col-span-4">
                                <label class="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Monto (Bs.)</label>
                                <div class="flex items-center">
                                    <span class="bg-brand-black text-white px-2 py-1.5 rounded-l border-y-2 border-l-2 border-brand-black text-xs font-mono font-bold">Bs.</span>
                                    <input type="number" step="0.01" min="0.01" max="999999999" data-pago-monto="${p.id}" value="${p.monto > 0 ? p.monto : ''}" placeholder="0.00"
                                        class="w-full border-2 border-brand-black rounded-r px-2 py-1.5 text-xs font-mono font-black focus:outline-none focus:ring-2 focus:ring-brand-purple text-right" />
                                </div>
                            </div>
                            <div class="sm:col-span-3">
                                <label class="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Referencia</label>
                                <input type="text" maxlength="25" data-pago-ref="${p.id}" value="${p.referencia || ''}" placeholder="Opcional"
                                    class="w-full border-2 border-brand-black rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-purple" />
                            </div>
                        </div>
                        <div data-aporte-info="${p.id}" class="flex flex-wrap items-center justify-between gap-1 mt-1.5 text-[11px]">
                            <span class="font-bold text-brand-black">Aporte directo: Bs. ${fmt(p.monto)}</span>
                            <span class="text-gray-500 font-mono">Equiv. a tasa BCV: $ ${fmt(equivOficialUsd)}</span>
                        </div>
                        `
                        }
                    </div>`;
                })
                .join('');

            const estadoBalanceHtml = `<div id="contenedor-estado-balance">${generarBalanceHtml(t)}</div>`;

            this.modalContenido(`
                <div>
                    <div class="flex justify-between items-center border-b-2 border-brand-black pb-3 mb-3">
                        <div>
                            <span class="text-[10px] font-black uppercase tracking-wider text-brand-purple">Operación de Caja Directa</span>
                            <h3 class="font-heading font-black text-2xl">COBRAR VENTA</h3>
                        </div>
                        <button data-cerrar class="w-8 h-8 rounded border-2 border-brand-black font-black flex items-center justify-center hover:bg-gray-100">&times;</button>
                    </div>

                    <!-- Resumen del Importe a Cobrar -->
                    <div class="border-2 border-brand-black rounded-lg p-3 bg-brand-gray/30 mb-3 flex flex-wrap justify-between items-center gap-2">
                        <div>
                            <span class="text-[10px] font-bold text-gray-600 uppercase block">Total a Liquidar</span>
                            <div class="flex items-baseline gap-2">
                                <span class="font-heading font-black text-2xl text-brand-black">$ ${fmt(totalVentaUsd)} USD</span>
                                <span class="font-heading font-black text-xl text-brand-purple">Bs. ${fmt(totalVentaBs)}</span>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="text-[10px] font-bold text-gray-500 uppercase block">Tasa Oficial Aplicada</span>
                            <span class="text-xs font-mono font-black text-gray-800">Bs. ${fmt(tasaTicket)}</span>
                        </div>
                    </div>

                    <!-- Calculadora rapida: solo ayuda visual, no afecta la venta -->
                    <div class="border-2 border-dashed border-gray-400 rounded-lg px-3 py-2 mb-3 flex flex-wrap items-center gap-2 text-xs bg-white">
                        <span class="font-black uppercase text-[10px] text-gray-500">Calculadora</span>
                        <label class="flex items-center gap-1 font-bold text-gray-700">
                            $ <input id="calc-usd" type="number" step="0.01" min="0" inputmode="decimal" placeholder="20.00"
                                class="w-24 border-2 border-brand-black rounded px-2 py-1 font-mono text-right" />
                        </label>
                        <span class="font-black text-gray-500">x</span>
                        <span class="font-mono font-black text-gray-800">Bs. ${fmt(tasaTicket)}</span>
                        <span class="font-black text-gray-500">=</span>
                        <label class="flex items-center gap-1 font-bold text-brand-purple">
                            Bs. <input id="calc-bs" type="number" step="0.01" min="0" inputmode="decimal" placeholder="0.00"
                                class="w-32 border-2 border-brand-black rounded px-2 py-1 font-mono text-right" />
                        </label>
                    </div>

                    <!-- Lista de Pagos Asignados -->
                    <div class="mb-3">
                        ${filasHtml}
                    </div>

                    <!-- Botones de Acción sobre Métodos -->
                    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <button id="btn-agregar-pago" class="bg-blue-50 text-blue-950 hover:bg-blue-100 border-2 border-brand-black rounded px-3 py-1.5 text-xs font-heading font-black shadow-brutal-sm">
                            + AGREGAR OTRO MÉTODO (PAGO MIXTO)
                        </button>
                        <button id="btn-toggle-nuevo-metodo" class="bg-white text-gray-800 hover:bg-gray-50 border border-brand-black rounded px-2.5 py-1.5 text-xs font-bold">
                            + CREAR MÉTODO DE PAGO
                        </button>
                    </div>

                    <!-- Subformulario para Crear o Eliminar Métodos de Pago -->
                    ${
                        mostrandoNuevoMetodo
                            ? `
                    <div class="bg-purple-50 border-2 border-brand-purple rounded-lg p-3 mb-3">
                        <div class="flex justify-between items-center mb-1.5">
                            <p class="text-xs font-heading font-black text-brand-purple uppercase">Gestión de Métodos de Pago</p>
                            <span class="text-[10px] text-gray-500 font-bold">Agregar o Quitar Métodos</span>
                        </div>
                        <div class="space-y-2">
                            <div class="flex gap-2">
                                <input id="input-nuevo-metodo-nombre" type="text" maxlength="25" placeholder="Ej: PAYPAL, BANESCO PANAMA..."
                                    class="flex-1 border-2 border-brand-black rounded px-2.5 py-1 text-xs font-bold uppercase focus:outline-none" />
                                <button id="btn-guardar-nuevo-metodo" class="bg-brand-purple text-white border-2 border-brand-black rounded px-3 py-1 text-xs font-heading font-black hover:opacity-90">
                                    GUARDAR
                                </button>
                            </div>
                            <div class="flex flex-wrap items-center gap-4 text-xs font-bold text-gray-800">
                                <span class="text-[10px] text-gray-500 uppercase">Moneda Base:</span>
                                <label class="inline-flex items-center gap-1 cursor-pointer">
                                    <input type="radio" name="radio-nuevo-metodo-moneda" value="USD" checked class="text-brand-purple" />
                                    <span>Dólares ($ USD - Tasa Dinámica)</span>
                                </label>
                                <label class="inline-flex items-center gap-1 cursor-pointer">
                                    <input type="radio" name="radio-nuevo-metodo-moneda" value="BS" class="text-brand-purple" />
                                    <span>Bolívares (Bs.)</span>
                                </label>
                            </div>
                            <!-- Métodos activos con botón para eliminar -->
                            <div class="pt-2 border-t border-purple-200">
                                <span class="text-[10px] font-bold text-gray-600 uppercase block mb-1">Métodos Registrados (Toca ✕ para eliminar):</span>
                                <div class="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                    ${metodosDisponibles.map(m => `
                                        <span class="inline-flex items-center gap-1 border border-brand-black rounded px-2 py-0.5 text-[11px] font-bold bg-white">
                                            <span>${m.nombre}</span>
                                            <span class="text-[9px] text-gray-500">(${m.moneda})</span>
                                            <button data-caja-eliminar-metodo="${m.nombre}" title="Eliminar método" class="text-red-600 hover:text-red-800 font-bold ml-0.5">✕</button>
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>`
                            : ''
                    }

                    <!-- Indicador de Cobertura y Vuelto -->
                    ${estadoBalanceHtml}

                    <div id="cobro-error" class="hidden text-red-700 text-xs font-bold mb-3 bg-red-50 border border-red-400 rounded p-2"></div>

                    <!-- Acciones Finales -->
                    <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t-2 border-brand-black">
                        <div class="flex items-center gap-2">
                            <button data-cancelar class="bg-white border-2 border-brand-black font-heading font-black px-4 py-2.5 rounded text-xs hover:bg-gray-100">
                                CERRAR
                            </button>
                            <button id="btn-volver-caja" class="bg-amber-100 hover:bg-amber-200 text-amber-950 border-2 border-brand-black font-heading font-black px-3 py-2.5 rounded text-xs">
                                AGREGAR PRODUCTOS (VOLVER A CAJA)
                            </button>
                        </div>
                        <button id="btn-confirmar-cobro" ${!t.puedeConfirmar ? 'disabled' : ''}
                            class="bg-green-700 hover:bg-green-800 disabled:opacity-30 disabled:cursor-not-allowed text-white font-heading font-black px-5 py-2.5 rounded border-2 border-brand-black shadow-brutal-sm text-sm">
                            CONFIRMAR COBRO
                        </button>
                    </div>
                </div>`, 'max-w-xl');

            conectarEventosFormulario();
        };

        const conectarEventosFormulario = () => {
            const cerrarConBorrador = () => {
                this.pagosBorrador = lineasCobro;
                this.resolucionVueltoBorrador = { estado: estadoVuelto, metodo: metodoVuelto, tasa: tasaVuelto };
                this.cerrarModal();
            };

            this.modal.querySelectorAll('[data-cerrar]').forEach((b) =>
                b.addEventListener('click', cerrarConBorrador),
            );
            this.modal.querySelector('[data-cancelar]')?.addEventListener('click', cerrarConBorrador);

            // Calculadora de una linea: convierte entre $ y Bs con la tasa
            // aplicada (BCV o manual). Es solo ayuda visual para el operador.
            const calcUsd = this.modal.querySelector('#calc-usd') as HTMLInputElement | null;
            const calcBs = this.modal.querySelector('#calc-bs') as HTMLInputElement | null;
            if (calcUsd && calcBs && tasaTicket > 0) {
                calcUsd.addEventListener('input', () => {
                    calcBs.value = calcularBsDesdeUsd(Number(calcUsd.value), tasaTicket);
                });
                calcBs.addEventListener('input', () => {
                    calcUsd.value = calcularUsdDesdeBs(Number(calcBs.value), tasaTicket);
                });
            }

            this.modal.querySelector('#btn-volver-caja')?.addEventListener('click', () => {
                this.pagosBorrador = lineasCobro;
                this.resolucionVueltoBorrador = { estado: estadoVuelto, metodo: metodoVuelto, tasa: tasaVuelto };
                this.cerrarModal();
                const busq = document.getElementById('caja-buscar') as HTMLInputElement | null;
                busq?.focus();
            });

            // Selector de entrega vs retención de vuelto
            this.modal.querySelector('#btn-vuelto-pagado')?.addEventListener('click', () => {
                estadoVuelto = 'PAGADO';
                this.resolucionVueltoBorrador = { estado: estadoVuelto, metodo: metodoVuelto, tasa: tasaVuelto };
                renderFormularioCobro();
            });
            this.modal.querySelector('#btn-vuelto-retenido')?.addEventListener('click', () => {
                estadoVuelto = 'RETENIDO';
                this.resolucionVueltoBorrador = { estado: estadoVuelto, metodo: metodoVuelto, tasa: tasaVuelto };
                renderFormularioCobro();
            });

            // Selector método de egreso del vuelto
            this.modal.querySelector<HTMLSelectElement>('#select-metodo-vuelto')?.addEventListener('change', (e) => {
                metodoVuelto = (e.target as HTMLSelectElement).value;
                this.resolucionVueltoBorrador = { estado: estadoVuelto, metodo: metodoVuelto, tasa: tasaVuelto };
                renderFormularioCobro();
            });

            // Tasa para vuelto en divisa
            const inpTasaVuelto = this.modal.querySelector<HTMLInputElement>('#input-tasa-vuelto');
            if (inpTasaVuelto) {
                inpTasaVuelto.addEventListener('input', (e) => {
                    const val = parseNum((e.target as HTMLInputElement).value);
                    tasaVuelto = val > 0 ? val : tasaTicket;
                    this.resolucionVueltoBorrador = { estado: estadoVuelto, metodo: metodoVuelto, tasa: tasaVuelto };
                });
                inpTasaVuelto.addEventListener('blur', () => {
                    renderFormularioCobro();
                });
            }
            this.modal.querySelector('#btn-reset-tasa-vuelto')?.addEventListener('click', () => {
                tasaVuelto = tasaTicket;
                this.resolucionVueltoBorrador = { estado: estadoVuelto, metodo: metodoVuelto, tasa: tasaVuelto };
                renderFormularioCobro();
            });

            // Selectores de método de pago
            this.modal.querySelectorAll<HTMLSelectElement>('select[data-pago-metodo]').forEach((sel) => {
                sel.addEventListener('change', (e) => {
                    const id = sel.dataset.pagoMetodo;
                    const val = (e.target as HTMLSelectElement).value;
                    const item = lineasCobro.find((x) => x.id === id);
                    if (item) {
                        // La moneda se toma de la opcion elegida (no del primer
                        // metodo con ese nombre): evita que un duplicado en otra
                        // moneda cambie lo que se muestra o se graba.
                        const opcion = (e.target as HTMLSelectElement).selectedOptions[0];
                        const monedaOpcion: 'USD' | 'BS' = opcion?.dataset.moneda === 'USD' ? 'USD' : 'BS';
                        const cfg = metodosDisponibles.find((m) => m.nombre === val && m.moneda === monedaOpcion)
                            || metodosDisponibles.find((m) => m.nombre === val);
                        const nuevaMoneda = (cfg?.moneda as 'USD' | 'BS') || monedaOpcion;
                        const monedaAnterior = item.moneda;
                        item.moneda = nuevaMoneda;
                        item.tasaCambio = tasaTicket;
                        if (lineasCobro.length === 1) {
                            item.monto = item.moneda === 'USD' ? totalVentaUsd : totalVentaBs;
                        } else if (nuevaMoneda !== monedaAnterior) {
                            // Convertir el monto al cambiar de moneda para no
                            // reinterpretar el mismo numero en otra divisa.
                            if (nuevaMoneda === 'USD') {
                                item.monto = Number((tasaTicket > 0 ? item.monto / tasaTicket : 0).toFixed(2));
                            } else {
                                item.monto = Number((item.monto * tasaTicket).toFixed(2));
                            }
                        }
                        item.metodo = val;
                        this.pagosBorrador = lineasCobro;
                        renderFormularioCobro();
                    }
                });
            });

            const refrescarBalanceUi = () => {
                const t = calcularTotales();
                const cont = this.modal.querySelector('#contenedor-estado-balance');
                if (cont) {
                    cont.innerHTML = generarBalanceHtml(t);
                    // Reconectar listeners de vuelto en el nuevo HTML
                    this.modal.querySelector('#btn-vuelto-pagado')?.addEventListener('click', () => {
                        estadoVuelto = 'PAGADO';
                        this.resolucionVueltoBorrador = { estado: estadoVuelto, metodo: metodoVuelto, tasa: tasaVuelto };
                        renderFormularioCobro();
                    });
                    this.modal.querySelector('#btn-vuelto-retenido')?.addEventListener('click', () => {
                        estadoVuelto = 'RETENIDO';
                        this.resolucionVueltoBorrador = { estado: estadoVuelto, metodo: metodoVuelto, tasa: tasaVuelto };
                        renderFormularioCobro();
                    });
                    this.modal.querySelector<HTMLSelectElement>('#select-metodo-vuelto')?.addEventListener('change', (e) => {
                        metodoVuelto = (e.target as HTMLSelectElement).value;
                        this.resolucionVueltoBorrador = { estado: estadoVuelto, metodo: metodoVuelto, tasa: tasaVuelto };
                        renderFormularioCobro();
                    });
                    const inTasaV = this.modal.querySelector<HTMLInputElement>('#input-tasa-vuelto');
                    if (inTasaV) {
                        inTasaV.addEventListener('input', (e) => {
                            const val = parseNum((e.target as HTMLInputElement).value);
                            tasaVuelto = val > 0 ? val : tasaTicket;
                            this.resolucionVueltoBorrador = { estado: estadoVuelto, metodo: metodoVuelto, tasa: tasaVuelto };
                        });
                        inTasaV.addEventListener('blur', () => renderFormularioCobro());
                    }
                    this.modal.querySelector('#btn-reset-tasa-vuelto')?.addEventListener('click', () => {
                        tasaVuelto = tasaTicket;
                        this.resolucionVueltoBorrador = { estado: estadoVuelto, metodo: metodoVuelto, tasa: tasaVuelto };
                        renderFormularioCobro();
                    });
                }
                const btnConf = this.modal.querySelector<HTMLButtonElement>('#btn-confirmar-cobro');
                if (btnConf) btnConf.disabled = !t.puedeConfirmar;
            };

            const actualizarAporteTarjeta = (item: typeof lineasCobro[0]) => {
                const infoDiv = this.modal.querySelector(`div[data-aporte-info="${item.id}"]`);
                if (!infoDiv) return;
                const tasaUsd = item.tasaCambio > 0 ? item.tasaCambio : tasaTicket;
                const aporteBs = item.moneda === 'USD' ? item.monto * tasaUsd : item.monto;
                const equivOficialUsd = tasaTicket > 0 ? aporteBs / tasaTicket : 0;
                if (item.moneda === 'USD') {
                    infoDiv.innerHTML = `
                        <span class="font-bold text-brand-purple">Aporte: Bs. ${fmt(aporteBs)}</span>
                        <span class="text-gray-500 font-mono">Aporte computable: $ ${fmt(equivOficialUsd)} ${tasaUsd !== tasaTicket ? `(Tasa pactada: Bs. ${fmt(tasaUsd)} vs Base: Bs. ${fmt(tasaTicket)})` : ''}</span>
                    `;
                } else {
                    infoDiv.innerHTML = `
                        <span class="font-bold text-brand-black">Aporte directo: Bs. ${fmt(item.monto)}</span>
                        <span class="text-gray-500 font-mono">Aporte computable: $ ${fmt(equivOficialUsd)}</span>
                    `;
                }
            };

            // Inputs de tasa (para métodos en USD)
            this.modal.querySelectorAll<HTMLInputElement>('input[data-pago-tasa]').forEach((inp) => {
                inp.addEventListener('input', (e) => {
                    const id = inp.dataset.pagoTasa;
                    const val = parseNum((e.target as HTMLInputElement).value);
                    const item = lineasCobro.find((x) => x.id === id);
                    if (item) {
                        item.tasaCambio = val > 0 ? val : tasaTicket;
                        this.pagosBorrador = lineasCobro;
                        actualizarAporteTarjeta(item);
                        refrescarBalanceUi();
                    }
                });
                inp.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        const t = calcularTotales();
                        if (t.puedeConfirmar) {
                            this.modal.querySelector<HTMLButtonElement>('#btn-confirmar-cobro')?.click();
                        }
                    }
                });
            });

            // Botón reset de tasa a BCV oficial
            this.modal.querySelectorAll<HTMLButtonElement>('button[data-reset-tasa]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.resetTasa;
                    const item = lineasCobro.find((x) => x.id === id);
                    if (item) {
                        item.tasaCambio = tasaTicket;
                        this.pagosBorrador = lineasCobro;
                        renderFormularioCobro();
                    }
                });
            });

            // Inputs de monto
            this.modal.querySelectorAll<HTMLInputElement>('input[data-pago-monto]').forEach((inp) => {
                inp.addEventListener('input', (e) => {
                    const id = inp.dataset.pagoMonto;
                    const val = parseNum((e.target as HTMLInputElement).value);
                    const item = lineasCobro.find((x) => x.id === id);
                    if (item) {
                        item.monto = val;
                        this.pagosBorrador = lineasCobro;
                        actualizarAporteTarjeta(item);
                        refrescarBalanceUi();
                    }
                });
                inp.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        const t = calcularTotales();
                        if (t.puedeConfirmar) {
                            this.modal.querySelector<HTMLButtonElement>('#btn-confirmar-cobro')?.click();
                        }
                    }
                });
            });

            // Inputs de referencia
            this.modal.querySelectorAll<HTMLInputElement>('input[data-pago-ref]').forEach((inp) => {
                inp.addEventListener('input', (e) => {
                    const id = inp.dataset.pagoRef;
                    const val = (e.target as HTMLInputElement).value;
                    const item = lineasCobro.find((x) => x.id === id);
                    if (item) {
                        item.referencia = val;
                        this.pagosBorrador = lineasCobro;
                    }
                });
                inp.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        const t = calcularTotales();
                        if (t.puedeConfirmar) {
                            this.modal.querySelector<HTMLButtonElement>('#btn-confirmar-cobro')?.click();
                        }
                    }
                });
            });

            // Eliminar pago
            this.modal.querySelectorAll<HTMLButtonElement>('button[data-eliminar-pago]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.eliminarPago;
                    lineasCobro = lineasCobro.filter((x) => x.id !== id);
                    this.pagosBorrador = lineasCobro;
                    renderFormularioCobro();
                });
            });

            // Agregar otro método (pago mixto)
            this.modal.querySelector('#btn-agregar-pago')?.addEventListener('click', () => {
                let t = calcularTotales();
                const nuevoId = 'p-' + Math.random().toString(36).slice(2, 7);
                const nuevoMetodo =
                    metodosDisponibles.find((m) => !lineasCobro.some((l) => l.metodo === m.nombre)) ||
                    metodosDisponibles[0] ||
                    { nombre: 'BS.EFEC.', moneda: 'BS' as const };

                // Si no hay faltante porque el pago anterior cubría el 100%, dividir el saldo del primer método a la mitad
                if (t.faltanteBs <= 0.01 && lineasCobro.length === 1 && lineasCobro[0]) {
                    const primero = lineasCobro[0];
                    const tPrimero = primero.tasaCambio > 0 ? primero.tasaCambio : tasaTicket;
                    const aporteOriginalBs = primero.moneda === 'USD' ? primero.monto * tPrimero : primero.monto;
                    const mitadBs = Math.round((aporteOriginalBs / 2) * 100) / 100;
                    primero.monto = primero.moneda === 'USD'
                        ? (tPrimero > 0 ? Number((mitadBs / tPrimero).toFixed(2)) : 0)
                        : mitadBs;
                    t = calcularTotales();
                }

                const faltante = t.faltanteBs > 0 ? t.faltanteBs : 0;
                lineasCobro.push({
                    id: nuevoId,
                    metodo: nuevoMetodo.nombre,
                    moneda: nuevoMetodo.moneda,
                    monto: nuevoMetodo.moneda === 'USD' ? (tasaTicket > 0 ? Number((faltante / tasaTicket).toFixed(2)) : 0) : faltante,
                    tasaCambio: tasaTicket,
                    referencia: '',
                });
                this.pagosBorrador = lineasCobro;
                renderFormularioCobro();
            });

            // Toggle subformulario nuevo método
            this.modal.querySelector('#btn-toggle-nuevo-metodo')?.addEventListener('click', () => {
                mostrandoNuevoMetodo = !mostrandoNuevoMetodo;
                renderFormularioCobro();
            });

            // Guardar nuevo método
            this.modal.querySelector('#btn-guardar-nuevo-metodo')?.addEventListener('click', () => {
                void (async () => {
                    const inp = this.modal.querySelector<HTMLInputElement>('#input-nuevo-metodo-nombre');
                    const nombre = inp?.value.trim() || '';
                    const radioUsd = this.modal.querySelector<HTMLInputElement>('input[name="radio-nuevo-metodo-moneda"][value="USD"]');
                    const moneda: MonedaMetodo = radioUsd?.checked ? 'USD' : 'BS';
                    if (nombre) {
                        try {
                            metodosDisponibles = await api.crearMetodoPago(nombre, moneda);
                            mostrandoNuevoMetodo = false;
                            renderFormularioCobro();
                        } catch (err) {
                            this.mostrarToast('Error al registrar método de pago: ' + (err instanceof Error ? err.message : String(err)), 'error');
                        }
                    }
                })();
            });

            // Eliminar método desde el modal de cobro
            this.modal.querySelectorAll<HTMLButtonElement>('button[data-caja-eliminar-metodo]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    void (async () => {
                        const mNombre = btn.dataset.cajaEliminarMetodo || '';
                        if (mNombre && await confirmarAccion(`¿Seguro que deseas eliminar el método de pago "${mNombre}"?`, 'ELIMINAR MÉTODO')) {
                            metodosDisponibles = await api.eliminarMetodoPago(mNombre);
                            // Si la línea actual tenía ese método, reasignar a uno disponible
                            lineasCobro.forEach((l) => {
                                if (l.metodo === mNombre) {
                                    const fallback = metodosDisponibles[0] || { nombre: 'PUNTOD.VENTA', moneda: 'BS' as const };
                                    l.metodo = fallback.nombre;
                                    l.moneda = fallback.moneda;
                                }
                            });
                            this.pagosBorrador = lineasCobro;
                            renderFormularioCobro();
                        }
                    })();
                });
            });

            // Confirmar cobro
            let procesandoCobro = false;
            const btnConf = this.modal.querySelector<HTMLButtonElement>('#btn-confirmar-cobro');
            btnConf?.addEventListener('click', () => {
                if (procesandoCobro) return;
                procesandoCobro = true;
                if (btnConf) {
                    btnConf.disabled = true;
                    btnConf.textContent = 'PROCESANDO COBRO...';
                }
                void (async () => {
                    const errEl = this.modal.querySelector<HTMLDivElement>('#cobro-error');
                    try {
                        const pagosFinales: PagoTicket[] = lineasCobro
                            .filter((l) => l.monto > 0)
                            .map((l) => {
                                const tasaFinal = l.moneda === 'USD' ? (l.tasaCambio > 0 ? l.tasaCambio : tasaTicket) : tasaTicket;
                                const aporteBs = l.moneda === 'USD' ? l.monto * tasaFinal : l.monto;
                                const aporteUsd = tasaTicket > 0 ? aporteBs / tasaTicket : 0;
                                return {
                                    metodo: l.metodo,
                                    moneda: l.moneda,
                                    montoUsd: (l.moneda === 'USD' ? l.monto : aporteUsd).toFixed(2),
                                    montoBs: aporteBs.toFixed(2),
                                    tasaCambio: l.moneda === 'USD' ? tasaFinal.toFixed(2) : undefined,
                                    referencia: l.referencia.trim() || undefined,
                                };
                            });

                        if (pagosFinales.length === 0) {
                            throw new Error('Debe especificar al menos un pago válido.');
                        }

                        const t = calcularTotales();
                        const totalRecibidoBs = pagosFinales.reduce((acc, p) => acc + Number(p.montoBs), 0);

                        const cfgVuelto = metodosDisponibles.find((m) => m.nombre === metodoVuelto);
                        const vueltoEsUsd = cfgVuelto?.moneda === 'USD';
                        const tasaVueltoFinal = vueltoEsUsd ? (tasaVuelto > 0 ? tasaVuelto : tasaTicket) : undefined;
                        const montoUsdVuelto = vueltoEsUsd && tasaVueltoFinal ? (t.vueltoBs / tasaVueltoFinal).toFixed(2) : t.vueltoUsd.toFixed(2);

                        const resVuelto: ResolucionVuelto = {
                            estado: t.vueltoBs > 0.009 ? estadoVuelto : 'SIN_VUELTO',
                            metodo: t.vueltoBs > 0.009 && estadoVuelto === 'PAGADO' ? metodoVuelto : undefined,
                            montoBs: t.vueltoBs > 0.009 ? t.vueltoBs.toFixed(2) : undefined,
                            montoUsd: t.vueltoBs > 0.009 ? montoUsdVuelto : undefined,
                            tasa: t.vueltoBs > 0.009 && estadoVuelto === 'PAGADO' && tasaVueltoFinal ? tasaVueltoFinal.toFixed(2) : undefined,
                        };

                        const ticket = await this.vm.cobrar(totalRecibidoBs.toFixed(2), pagosFinales, resVuelto, tasaTicket);
                        this.pagosBorrador = null;
                        this.resolucionVueltoBorrador = null;
                        this.cerrarModal();
                        this.modalTicketExito(ticket, totalRecibidoBs);
                    } catch (e) {
                        procesandoCobro = false;
                        if (btnConf) {
                            btnConf.disabled = false;
                            btnConf.textContent = 'CONFIRMAR COBRO';
                        }
                        if (errEl) {
                            errEl.textContent = e instanceof Error ? e.message.replace(/"/g, '') : String(e);
                            errEl.classList.remove('hidden');
                        }
                    }
                })();
            });
        };

        renderFormularioCobro();
    }

    private modalTicketExito(t: Ticket, totalCobrado: number): void {
        const lineasPagosHtml = t.pagos && t.pagos.length > 0
            ? t.pagos.map((p) => `
                <tr class="border-b border-gray-100 last:border-none">
                    <td class="py-1.5 text-left font-heading font-black text-xs text-brand-black">
                        ${p.metodo}
                        ${p.tasaCambio ? `<span class="block text-[10px] text-brand-purple font-mono font-bold">Tasa: Bs. ${fmt(Number(p.tasaCambio))}</span>` : ''}
                        ${p.referencia ? `<span class="block text-[10px] text-gray-500 font-mono font-normal">Ref: ${p.referencia}</span>` : ''}
                    </td>
                    <td class="py-1.5 text-right font-black text-xs text-brand-black">$ ${fmt(p.montoUsd)}</td>
                    <td class="py-1.5 text-right font-black text-xs text-brand-purple">Bs. ${fmt(p.montoBs)}</td>
                </tr>
            `).join('')
            : `<tr><td colspan="3" class="py-2 text-center text-xs text-gray-400">Pago Único Estándar</td></tr>`;

        const vueltoNum = parseNum(t.vueltoBs);

        this.renderModal(`
            <div class="text-center mb-3">
                <h3 class="font-heading font-black text-3xl text-green-700">VENTA EXITOSA</h3>
                <p class="font-body text-xs text-brand-text">Ticket ${t.ventaId} · Tasa BCV: Bs. ${fmt(Number(t.tasaDelDia))}</p>
            </div>
            <div class="border-t-2 border-b-2 border-brand-black py-3 mb-3 text-center bg-gray-50 rounded">
                <span class="text-[10px] font-bold text-gray-500 uppercase block">Total Liquidado</span>
                <p class="font-heading font-black text-3xl text-brand-purple">Bs. ${fmt(totalCobrado)}</p>
                <p class="font-body text-xs text-gray-600">$ ${fmt(Number(t.totalUsd))} USD</p>
            </div>

            <!-- Desglose de Artículos Despachados -->
            <div class="mb-3 border border-brand-black rounded p-2.5 bg-white">
                <span class="text-[10px] uppercase font-heading font-bold text-gray-500 block mb-1">
                    Artículos Despachados (${t.lineas ? t.lineas.length : 0})
                </span>
                <table class="w-full text-xs">
                    <thead>
                        <tr class="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400">
                            <th class="py-1 text-left">Producto / Presentación</th>
                            <th class="py-1 text-center">Cant.</th>
                            <th class="py-1 text-right">P. Unit ($)</th>
                            <th class="py-1 text-right">Subtotal ($)</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${(t.lineas && t.lineas.length > 0)
                            ? t.lineas.map((l) => `
                                <tr class="border-b border-gray-100 last:border-none">
                                    <td class="py-1.5 pr-1 text-left">
                                        <div class="font-bold text-gray-900 flex items-center gap-1 flex-wrap">
                                            <span>${l.nombre}</span>
                                            ${l.modoVenta && l.modoVenta !== 'unidad' ? `<span class="inline-block text-[9px] font-black bg-purple-100 text-purple-800 border border-brand-purple rounded px-1">${l.modoVenta}</span>` : ''}
                                        </div>
                                        <div class="text-[9px] text-gray-500 font-mono">
                                            ${l.modoVenta && l.modoVenta !== 'unidad' ? `Presentación: ${l.modoVenta} (${l.cantidad} ${l.cantidad === '1' ? 'empaque' : 'empaques'})` : 'Venta por unidad'}
                                        </div>
                                    </td>
                                    <td class="py-1.5 text-center font-bold">${l.cantidad}</td>
                                    <td class="py-1.5 text-right font-mono">$ ${fmt(l.precioUsd)}</td>
                                    <td class="py-1.5 text-right font-black text-brand-black">$ ${fmt(l.subtotalUsd)}</td>
                                </tr>
                            `).join('')
                            : `<tr><td colspan="4" class="py-2 text-center text-xs text-gray-400">Detalle de líneas no disponible</td></tr>`
                        }
                    </tbody>
                </table>
            </div>

            <!-- Desglose de Métodos de Pago Registrados -->
            <div class="mb-3 border border-brand-black rounded p-2.5 bg-white">
                <span class="text-[10px] uppercase font-heading font-bold text-gray-500 block mb-1">
                    Métodos de Pago Aplicados (${t.pagos ? t.pagos.length : 1})
                </span>
                <table class="w-full text-xs">
                    <thead>
                        <tr class="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400">
                            <th class="py-1 text-left">Método</th>
                            <th class="py-1 text-right">Monto ($)</th>
                            <th class="py-1 text-right">Monto (Bs.)</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${lineasPagosHtml}
                    </tbody>
                </table>
            </div>

            ${vueltoNum > 0 ? `
            <div class="mb-3 ${t.estadoVuelto === 'RETENIDO' ? 'bg-blue-50 border-blue-500' : 'bg-emerald-50 border-emerald-500'} border rounded p-2.5 text-center">
                <span class="text-[10px] font-bold ${t.estadoVuelto === 'RETENIDO' ? 'text-blue-900' : 'text-emerald-800'} uppercase block">
                    ${t.estadoVuelto === 'RETENIDO' ? 'Vuelto Retenido (Saldo a Favor del Negocio)' : 'Vuelto Pagado al Cliente'}
                </span>
                <span class="font-heading font-black text-xl ${t.estadoVuelto === 'RETENIDO' ? 'text-blue-800' : 'text-emerald-700'}">
                    Bs. ${fmt(vueltoNum)}
                </span>
                <span class="block text-xs font-bold text-gray-600 mt-0.5">
                    ${t.estadoVuelto === 'RETENIDO' ? `Asentado en comprobante ($ ${fmt(t.montoVueltoUsd || (Number(t.tasaDelDia) > 0 ? vueltoNum / Number(t.tasaDelDia) : 0))} USD equiv.)` : `Método: ${t.metodoVuelto || 'Efectivo'} ${t.montoVueltoUsd && Number(t.montoVueltoUsd) > 0 && t.tasaVuelto ? `($ ${fmt(t.montoVueltoUsd)} USD @ Bs. ${fmt(t.tasaVuelto)})` : ''}`}
                </span>
            </div>` : ''}

            <button data-cerrar class="w-full bg-brand-black text-white font-heading font-black text-lg py-3 rounded border-2 border-brand-black shadow-brutal-sm hover:bg-gray-800">
                LISTO
            </button>`, 'max-w-md');
    }

    private renderDinamico(): void {
        const grid = this.contenedor.querySelector<HTMLElement>('#caja-grid');
        if (!grid) return;
        const semaforo = this.semaforoStock;
        grid.innerHTML = this.vm.visibles
            .map((p) => {
                const pesable = (p.capacidades & CAP_PESABLE) !== 0;
                const stockNum = Number(p.stock);
                const sinStock = stockNum <= 0;
                // Semáforo dinámico según configuración del negocio
                const colorStockClass = p.sinStock
                    ? 'text-purple-700'
                    : stockNum <= semaforo.rojoMax
                    ? 'text-red-600'
                    : stockNum <= semaforo.amarilloMax
                    ? 'text-amber-600'
                    : 'text-emerald-700';
                const unidadStr = p.unidad ? (p.unidad.toLowerCase() === 'un' ? 'un.' : p.unidad.toLowerCase()) : (pesable ? 'kg' : 'un.');
                const badgeUnidad = unidadStr === 'kg' ? 'kg' : unidadStr === 'ml' ? 'ml' : 'un.';
                
                // Formateo de stock con despiece de cajas si aplica
                let textoStock = '';
                if (p.sinStock) {
                    textoStock = 'LIBRE';
                } else if (sinStock) {
                    textoStock = 'AGOTADO';
                } else if (p.esCaja && p.unidadesPorCaja && p.unidadesPorCaja > 1) {
                    const cajas = Math.floor(stockNum / p.unidadesPorCaja);
                    const sueltas = stockNum % p.unidadesPorCaja;
                    textoStock = `${cajas} cajas y ${sueltas} un. (${stockNum} un.)`;
                } else {
                    textoStock = `${stockNum} ${unidadStr}`;
                }

                const tienePaquete = (p.precioPaqueteUsd && p.nombrePaquete) || (p.esCaja && p.unidadesPorCaja && p.unidadesPorCaja > 1);

                const botonesPresentaciones = (p.presentaciones && p.presentaciones.length > 0)
                    ? p.presentaciones.map((pres) => `
                        <button data-sku="${p.sku}" data-modo="${pres.nombre}" ${sinStock && !p.sinStock ? 'disabled' : ''}
                            class="text-left border-2 border-brand-purple rounded p-2 bg-purple-50 shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-hover transition-all active:translate-y-0.5 active:shadow-none disabled:opacity-30 w-full mt-1">
                            <div class="flex justify-between items-center">
                                <span class="font-heading font-bold text-xs text-purple-800">${pres.nombre} ($${Number(pres.precioUsd).toFixed(2)})</span>
                                <span class="text-[10px] font-black text-purple-600">${pres.unidades} un.</span>
                            </div>
                        </button>`).join('')
                    : (tienePaquete ? `
                        <button data-sku="${p.sku}" data-modo="paquete" ${sinStock && !p.sinStock ? 'disabled' : ''}
                            class="text-left border-2 border-brand-purple rounded p-2 bg-purple-50 shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-hover transition-all active:translate-y-0.5 active:shadow-none disabled:opacity-30 w-full mt-1">
                            <div class="flex justify-between items-center">
                                <span class="font-heading font-bold text-xs text-purple-800">${p.nombrePaquete || 'Caja'} (${p.precioPaqueteUsd ? `$${Number(p.precioPaqueteUsd).toFixed(2)}` : `$${(Number(p.precioUsd) * (p.unidadesPorCaja || 1)).toFixed(2)}`})</span>
                                <span class="text-[10px] font-black text-purple-600">${p.unidadesPorCaja || 1} un.</span>
                            </div>
                        </button>` : '');

                return `
                <div class="relative" data-producto-card="${p.sku}">
                    <button data-sku="${p.sku}" data-modo="unidad" ${sinStock && !p.sinStock ? 'disabled' : ''}
                        class="text-left border-2 border-brand-black rounded p-3 bg-white shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-hover transition-all active:translate-y-0.5 active:shadow-none disabled:opacity-30 w-full">
                        <div class="flex justify-between items-start mb-1 gap-1">
                            <span class="font-heading font-extrabold leading-tight text-sm text-brand-black truncate" title="${p.nombre}">${p.nombre}</span>
                            <div class="flex gap-1 shrink-0">
                                ${badgeUnidad ? `<span class="text-[9px] font-black bg-amber-100 text-amber-900 border border-brand-black rounded px-1 lowercase">${badgeUnidad}</span>` : ''}
                            </div>
                        </div>
                        <p class="font-heading font-black text-lg text-brand-purple">Bs. ${this.modelo.bs(p.precioUsd)}</p>
                        <div class="flex justify-between items-center mt-1">
                            <span class="text-xs font-bold text-gray-600">$${Number(p.precioUsd).toFixed(2)}</span>
                            <span class="text-[11px] font-black ${colorStockClass}">
                                ${textoStock}
                            </span>
                        </div>
                    </button>
                    ${botonesPresentaciones}
                </div>`;
            })
            .join('');

        grid.querySelectorAll('button[data-sku]').forEach((btn) =>
            btn.addEventListener('click', () => {
                const sku = (btn as HTMLElement).dataset.sku ?? '';
                const modo = ((btn as HTMLElement).dataset.modo || 'unidad') as 'unidad' | 'paquete';
                void (async () => {
                    const err = this.vm.modoCuentaAbierta
                        ? await this.vm.agregarACuenta(sku, modo)
                        : await this.vm.agregar(sku, modo);
                    if (err) this.mostrarError(err);
                })();
            }),
        );

        const pagBox = this.contenedor.querySelector<HTMLElement>('#caja-paginacion');
        if (pagBox) {
            const totalPag = this.vm.totalPaginas;
            const pagActual = this.vm.paginaActual;
            const totalProds = this.vm.totalProductosFiltrados;
            pagBox.innerHTML = `
                <span class="text-xs font-bold text-gray-700">Pág. ${pagActual} de ${totalPag} <span class="text-gray-400 font-normal">(${totalProds} productos)</span></span>
                <div class="flex items-center gap-1.5">
                    <button id="caja-pag-ant" class="border-2 border-brand-black px-3 py-1 rounded text-xs font-heading font-black shadow-brutal-sm ${pagActual <= 1 ? 'opacity-30 pointer-events-none' : 'hover:bg-gray-100 active:translate-y-0.5'}">ANT.</button>
                    <button id="caja-pag-sig" class="border-2 border-brand-black px-3 py-1 rounded text-xs font-heading font-black shadow-brutal-sm ${pagActual >= totalPag ? 'opacity-30 pointer-events-none' : 'hover:bg-gray-100 active:translate-y-0.5'}">SIG.</button>
                </div>
            `;
            pagBox.querySelector('#caja-pag-ant')?.addEventListener('click', () => {
                this.vm.paginaAnterior();
            });
            pagBox.querySelector('#caja-pag-sig')?.addEventListener('click', () => {
                this.vm.paginaSiguiente();
            });
        }

        const lineasBox = this.contenedor.querySelector<HTMLElement>('#caja-lineas');
        if (lineasBox) {
            lineasBox.innerHTML =
                this.vm.lineasCarrito.length === 0
                    ? '<p class="text-center text-brand-text font-body py-10">Toca un producto para agregarlo</p>'
                    : this.vm.lineasCarrito
                          .map(
                              (l) => `
                    <div class="border-2 border-brand-black rounded p-2 bg-white shadow-sm space-y-1">
                        <div class="flex items-center gap-2">
                            <div class="flex-1 min-w-0 pr-2">
                                <p class="font-heading font-bold text-sm truncate" title="${l.nombre}">
                                    ${l.nombre}
                                    ${l.modoVenta !== 'unidad' ? `<span class="inline-block ml-1 text-[9px] font-black bg-purple-100 text-purple-800 border border-brand-purple rounded px-1">${l.modoVenta}</span>` : ''}
                                </p>
                                <p class="text-xs text-gray-600 font-bold">$${l.precioUsd.toFixed(2)} · Bs. ${this.modelo.bs(Number((l.precioUsd * l.cantidad).toFixed(2)))}</p>
                            </div>
                            ${l.pesable
                                ? `<input type="number" step="0.05" min="0.01" max="999.99" maxlength="6" value="${Number(l.cantidad.toFixed(3))}" data-qty="${l.sku}" data-modo="${l.modoVenta}" class="w-20 border-2 border-brand-black rounded px-1 py-0.5 text-right font-bold text-sm" />`
                                : `<button data-menos="${l.sku}" data-modo="${l.modoVenta}" class="w-7 h-7 border-2 border-brand-black rounded font-black bg-amber-100 text-sm">-</button>
                                   <span class="font-black w-5 text-center text-sm">${l.cantidad}</span>
                                   <button data-mas="${l.sku}" data-modo="${l.modoVenta}" class="w-7 h-7 border-2 border-brand-black rounded font-black bg-emerald-100 text-sm">+</button>`}
                            <button data-quitar="${l.sku}" data-modo="${l.modoVenta}" class="w-7 h-7 border-2 border-brand-black rounded font-black bg-red-100 text-red-800 text-sm hover:bg-red-600 hover:text-white transition-colors">&times;</button>
                        </div>
                    </div>`,
                          )
                          .join('');
        }

        const usdEl = this.contenedor.querySelector<HTMLElement>('#caja-total-usd');
        const bsEl = this.contenedor.querySelector<HTMLElement>('#caja-total-bs');
        if (usdEl) usdEl.textContent = '$ ' + fmt(this.vm.totalUsd);
        if (bsEl) bsEl.textContent = 'Bs. ' + fmt(this.vm.totalBs);

        // Actualizar etiqueta del operador activo en turno y estado del botón COBRAR
        void api.obtenerJornadaActual().then((j) => {
            const el = this.contenedor.querySelector<HTMLElement>('#caja-operadores-activo-texto');
            const btn = this.contenedor.querySelector<HTMLButtonElement>('#btn-gestionar-operadores-caja');
            const btnCobrar = this.contenedor.querySelector<HTMLButtonElement>('#caja-cobrar');

            if (j === null) {
                // Sin jornada activa: botón en rojo/naranja y cobrar bloqueado
                if (el) {
                    el.textContent = 'SIN TURNO ACTIVO';
                    el.title = 'No hay jornada activa. Abre un turno para operar.';
                }
                if (btn) {
                    btn.classList.remove('bg-purple-100', 'text-brand-purple', 'border-brand-purple', 'hover:bg-purple-200');
                    btn.classList.add('bg-orange-100', 'text-red-800', 'border-red-600', 'hover:bg-orange-200');
                    // Reemplazar el indicador pulsante verde por uno rojo
                    const dot = btn.querySelector('span.rounded-full');
                    if (dot) {
                        dot.classList.remove('bg-emerald-500');
                        dot.classList.add('bg-red-500');
                    }
                }
                if (btnCobrar) {
                    btnCobrar.disabled = true;
                    btnCobrar.title = 'Abre un turno antes de cobrar';
                }
            } else {
                // Jornada activa: comportamiento original
                const nombres = (j.operadoresActivos && j.operadoresActivos.length > 0)
                    ? j.operadoresActivos.join(', ')
                    : (j.operadorActual || 'Operador en caja');
                if (el) {
                    el.textContent = nombres;
                    el.title = `Operadores en caja: ${nombres}`;
                }
                if (btn) {
                    btn.classList.add('bg-purple-100', 'text-brand-purple', 'border-brand-purple', 'hover:bg-purple-200');
                    btn.classList.remove('bg-orange-100', 'text-red-800', 'border-red-600', 'hover:bg-orange-200');
                    const dot = btn.querySelector('span.rounded-full');
                    if (dot) {
                        dot.classList.add('bg-emerald-500');
                        dot.classList.remove('bg-red-500');
                    }
                }
                if (btnCobrar) {
                    btnCobrar.disabled = false;
                    btnCobrar.title = '';
                }
            }
        });

        this.contenedor.querySelectorAll('[data-mas]').forEach((b) =>
            b.addEventListener('click', () => {
                const sku = (b as HTMLElement).dataset.mas ?? '';
                const modo = (b as HTMLElement).dataset.modo ?? 'unidad';
                const l = this.vm.lineasCarrito.find((x) => x.sku === sku && x.modoVenta === modo);
                if (l) {
                    const err = this.vm.cambiarCantidad(sku, l.cantidad + 1, modo);
                    if (err) this.mostrarError(err);
                }
            }),
        );
        this.contenedor.querySelectorAll('[data-menos]').forEach((b) =>
            b.addEventListener('click', () => {
                const sku = (b as HTMLElement).dataset.menos ?? '';
                const modo = (b as HTMLElement).dataset.modo ?? 'unidad';
                const l = this.vm.lineasCarrito.find((x) => x.sku === sku && x.modoVenta === modo);
                if (l) {
                    const err = this.vm.cambiarCantidad(sku, Math.max(1, l.cantidad - 1), modo);
                    if (err) this.mostrarError(err);
                }
            }),
        );
        this.contenedor.querySelectorAll('[data-quitar]').forEach((b) =>
            b.addEventListener('click', () => {
                const sku = (b as HTMLElement).dataset.quitar ?? '';
                const modo = (b as HTMLElement).dataset.modo ?? 'unidad';
                this.vm.quitar(sku, modo);
            }),
        );
        this.contenedor.querySelectorAll<HTMLInputElement>('input[data-qty]').forEach((inp) =>
            inp.addEventListener('change', () => {
                const raw = Number(inp.value || '0');
                const modo = inp.dataset.modo ?? 'unidad';
                const val = Math.min(999.99, Math.max(0.01, Number.isFinite(raw) ? raw : 0.01));
                inp.value = String(val);
                const err = this.vm.cambiarCantidad(inp.dataset.qty ?? '', val, modo);
                if (err) this.mostrarError(err);
            }),
        );
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
