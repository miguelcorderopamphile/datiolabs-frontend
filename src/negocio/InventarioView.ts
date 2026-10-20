import { api, CAP_PERECEDERO, Categoria, ProductoInfo, TasaImpuesto } from './api';
import { confirmarAccion, mostrarToast, pedirValor } from './dialogs';
import { NegocioModel } from './NegocioModel';

/** Gestion FEFO de lotes por producto: listar y crear con caducidad futura. */
async function gestionarLotes(sku: string, nombre: string): Promise<void> {
    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[130] p-4';
    backdrop.innerHTML = `
        <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal w-full max-w-lg max-h-[85vh] flex flex-col p-4 sm:p-5">
            <div class="flex justify-between items-center border-b-2 border-brand-black pb-2 mb-3">
                <div>
                    <h3 class="font-heading font-black text-lg">LOTES FEFO</h3>
                    <p class="text-[11px] text-gray-500 font-bold">${nombre} (${sku})</p>
                </div>
                <button id="lotes-cerrar" class="w-8 h-8 rounded border-2 border-brand-black font-black flex items-center justify-center hover:bg-gray-100">&times;</button>
            </div>
            <div id="lotes-lista" class="overflow-y-auto space-y-1.5 flex-1 min-h-[120px]"></div>
            <form id="form-nuevo-lote" class="mt-3 border-t-2 border-brand-black pt-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <div>
                    <label class="block text-[10px] font-black uppercase text-gray-600">Cantidad</label>
                    <input id="lote-cantidad" type="number" min="0.01" step="0.01" required class="w-full border-2 border-brand-black rounded px-2 py-1.5 font-bold text-sm" />
                </div>
                <div>
                    <label class="block text-[10px] font-black uppercase text-gray-600">Vence</label>
                    <input id="lote-caduce" type="date" required class="w-full border-2 border-brand-black rounded px-2 py-1.5 font-bold text-sm" />
                </div>
                <button type="submit" class="bg-brand-black text-white font-heading font-black px-3 py-2 rounded border-2 border-brand-black text-xs">AGREGAR</button>
            </form>
        </div>`;
    document.body.appendChild(backdrop);
    backdrop.querySelector('#lotes-cerrar')?.addEventListener('click', () => backdrop.remove());

    const renderLotes = async (): Promise<void> => {
        const lista = backdrop.querySelector('#lotes-lista') as HTMLElement;
        lista.innerHTML = '<p class="text-xs text-gray-400 font-bold py-4 text-center">Cargando...</p>';
        try {
            const todos = await api.lotes();
            const delSku = todos.filter((l) => l.sku.toUpperCase() === sku.toUpperCase());
            if (delSku.length === 0) {
                lista.innerHTML = '<p class="text-xs text-gray-400 font-bold py-4 text-center">Sin lotes registrados para este producto.</p>';
                return;
            }
            const ahora = Math.floor(Date.now() / 1000);
            lista.innerHTML = delSku
                .map((l) => {
                    const vencido = l.caduceUnix <= ahora;
                    const fecha = new Date(l.caduceUnix * 1000).toLocaleDateString('es-VE');
                    return `
                    <div class="border border-brand-black rounded p-2 text-xs ${vencido ? 'bg-red-50' : 'bg-white'}">
                        <span class="font-mono font-black">${l.id}</span>
                        <span class="ml-2 font-bold text-gray-600">Disp: ${l.disponible} / ${l.cantidadInicial}</span>
                        <p class="text-[10px] ${vencido ? 'text-red-700' : 'text-gray-500'} font-bold">Vence: ${fecha}${vencido ? ' (VENCIDO)' : ''}</p>
                    </div>`;
                })
                .join('');
        } catch (e) {
            lista.innerHTML = `<p class="text-xs text-red-700 font-bold py-4 text-center">Error cargando lotes: ${e instanceof Error ? e.message : String(e)}</p>`;
        }
    };
    await renderLotes();

    backdrop.querySelector('#form-nuevo-lote')?.addEventListener('submit', (e) => {
        e.preventDefault();
        void (async () => {
            const cant = (backdrop.querySelector('#lote-cantidad') as HTMLInputElement).value;
            const fecha = (backdrop.querySelector('#lote-caduce') as HTMLInputElement).value;
            if (!fecha) return;
            const caduceUnix = Math.floor(new Date(`${fecha}T23:59:59`).getTime() / 1000);
            try {
                await api.crearLote(sku, cant, caduceUnix);
                mostrarToast('Lote registrado y stock incrementado.', 'success');
                (backdrop.querySelector('#lote-cantidad') as HTMLInputElement).value = '';
                await renderLotes();
            } catch (err) {
                mostrarToast(
                    'No se pudo crear el lote: ' + (err instanceof Error ? err.message : String(err)),
                    'error',
                );
            }
        })();
    });
}

const sanitizarInputDecimal = (
    inputEl: HTMLInputElement,
    maxValor: number,
    maxLongitud: number,
    onInputCallback?: () => void,
): void => {
    inputEl.maxLength = maxLongitud;
    inputEl.addEventListener('input', () => {
        let val = inputEl.value.replace(/[^0-9.,]/g, '');
        const partes = val.split(/[.,]/);
        if (partes.length > 2) {
            val = partes[0] + '.' + partes.slice(1).join('');
        } else if (partes.length === 2) {
            val = partes[0] + '.' + partes[1].slice(0, 2);
        }
        if (val.length > maxLongitud) {
            val = val.slice(0, maxLongitud);
        }
        const num = parseFloat(val.replace(',', '.'));
        if (Number.isFinite(num) && num > maxValor) {
            val = String(maxValor);
        }
        if (inputEl.value !== val) {
            inputEl.value = val;
        }
        if (onInputCallback) onInputCallback();
    });
};

const sanitizarInputEntero = (
    inputEl: HTMLInputElement,
    minValor: number,
    maxValor: number,
    maxLongitud: number,
    onInputCallback?: () => void,
): void => {
    inputEl.maxLength = maxLongitud;
    inputEl.addEventListener('input', () => {
        let val = inputEl.value.replace(/[^0-9]/g, '');
        if (val.length > maxLongitud) {
            val = val.slice(0, maxLongitud);
        }
        const num = parseInt(val, 10);
        if (Number.isFinite(num) && num > maxValor) {
            val = String(maxValor);
        }
        if (inputEl.value !== val) {
            inputEl.value = val;
        }
        if (onInputCallback) onInputCallback();
    });
    inputEl.addEventListener('blur', () => {
        const num = parseInt(inputEl.value, 10);
        if (Number.isFinite(num) && num < minValor) {
            inputEl.value = String(minValor);
            if (onInputCallback) onInputCallback();
        }
    });
};

const sanitizarInputTexto = (
    inputEl: HTMLInputElement,
    maxLongitud: number,
    permitirEspeciales: boolean = false,
): void => {
    inputEl.maxLength = maxLongitud;
    inputEl.addEventListener('input', () => {
        let val = permitirEspeciales
            ? inputEl.value.replace(/[<>{}\\]/g, '')
            : inputEl.value.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ .,/_#-]/g, '');
        if (val.length > maxLongitud) {
            val = val.slice(0, maxLongitud);
        }
        if (inputEl.value !== val) {
            inputEl.value = val;
        }
    });
};

export class InventarioView {
    private contenedor: HTMLElement;
    private modelo: NegocioModel;
    private categorias: Categoria[] = [];
    private tasasImpuestos: TasaImpuesto[] = [];
    private productos: ProductoInfo[] = [];
    private busquedaRepo: string = '';
    private busquedaCatalogo: string = '';
    private filtroCategoriaRepo: string = 'todas';
    private filtroCategoriaCatalogo: string = 'todas';
    private tabActiva: 'alta' | 'stock' | 'ajustes' = 'alta';
    private semaforoStock: { rojoMax: number; amarilloMax: number } = { rojoMax: 5, amarilloMax: 15 };
    private readonly POR_PAGINA_CAT = 10;
    private readonly POR_PAGINA_REPO = 24;
    private readonly POR_PAGINA_CATEGORIAS = 8;
    private paginaCat: number = 1;
    private paginaRepo: number = 1;
    private paginaCategorias: number = 1;

    constructor(contenedor: HTMLElement, modelo: NegocioModel, private duenoAutenticado: boolean = true) {
        this.contenedor = contenedor;
        this.modelo = modelo;
        void this.modelo;
    }

    private getUnitLabel(p: ProductoInfo): string {
        if (p.unidad === 'kg') return 'kg';
        if (p.unidad === 'ml') return 'ml';
        if (p.unidad === 'un') return 'un.';
        return (p.capacidades & 2) ? 'kg' : 'un.';
    }

    private getNombreCategoria(categoriaId?: string): string {
        if (!categoriaId) return 'General';
        const cat = this.categorias.find((c) => c.id === categoriaId);
        return cat ? cat.nombre : 'General';
    }

    private getConteoCategorias(): Record<string, number> {
        const conteo: Record<string, number> = { todas: this.productos.length };
        this.categorias.forEach((c) => {
            conteo[c.id] = 0;
        });
        if (conteo['cat-general'] === undefined) {
            conteo['cat-general'] = 0;
        }
        this.productos.forEach((p) => {
            const cid = p.categoriaId || 'cat-general';
            conteo[cid] = (conteo[cid] || 0) + 1;
        });
        return conteo;
    }

    private abrirModalEditarProducto(prod: ProductoInfo): void {
        const modalId = 'modal-editar-producto-root';
        document.getElementById(modalId)?.remove();

        const backdrop = document.createElement('div');
        backdrop.id = modalId;
        backdrop.className = 'fixed inset-0 bg-black/60 flex items-center justify-center p-3 sm:p-4 z-[120] overflow-y-auto';

        const catOptions = this.categorias.map((c) =>
            `<option value="${c.id}" ${prod.categoriaId === c.id ? 'selected' : ''}>${c.nombre}</option>`
        ).join('');

        const impOptions = this.tasasImpuestos.map((t) =>
            `<option value="${t.porcentaje}" ${String(prod.impuestoPct) === String(t.porcentaje) ? 'selected' : ''}>${t.nombre}</option>`
        ).join('');

        backdrop.innerHTML = `
            <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal max-w-xl w-full p-4 sm:p-6 my-auto max-h-[90vh] flex flex-col">
                <div class="flex justify-between items-center border-b-2 border-brand-black pb-2 mb-4 shrink-0">
                    <div>
                        <h3 class="font-heading font-black text-lg text-brand-black uppercase">Editar Producto</h3>
                        <p class="text-[11px] font-mono text-gray-500 font-bold">SKU: ${prod.sku}</p>
                    </div>
                    <button data-edit-cancel class="text-brand-black font-black text-2xl hover:text-red-600 leading-none">&times;</button>
                </div>

                <form id="form-editar-prod" class="space-y-4 overflow-y-auto pr-1 flex-1">
                    <div>
                        <label class="block text-xs font-bold uppercase mb-1">Nombre Comercial *</label>
                        <input id="edit-prod-nombre" type="text" maxlength="64" value="${prod.nombre.replace(/"/g, '&quot;')}" class="w-full border-2 border-brand-black rounded px-3 py-2 font-bold text-sm bg-white" required />
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold uppercase mb-1">Categoría</label>
                            <select id="edit-prod-categoria" class="w-full border-2 border-brand-black rounded px-3 py-2 bg-white font-bold text-xs">
                                ${catOptions}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase mb-1">Tasa de Impuesto</label>
                            <select id="edit-prod-impuesto" class="w-full border-2 border-brand-black rounded px-3 py-2 bg-white font-bold text-xs">
                                ${impOptions}
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50 border-2 border-brand-black rounded p-3">
                        <div>
                            <label class="block text-[11px] font-bold uppercase mb-0.5 text-gray-700">Costo Bruto ($)</label>
                            <input id="edit-prod-bruto" type="text" inputmode="decimal" maxlength="8" value="${prod.precioBrutoUsd ? Number(prod.precioBrutoUsd).toFixed(2) : ''}" placeholder="0.00" class="w-full border-2 border-brand-black rounded px-2.5 py-1.5 font-bold text-xs bg-white" />
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold uppercase mb-0.5 text-gray-700">Margen (%)</label>
                            <input id="edit-prod-margen" type="text" inputmode="decimal" maxlength="5" value="${prod.margenPct || '30'}" class="w-full border-2 border-brand-black rounded px-2.5 py-1.5 font-bold text-xs bg-white" />
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold uppercase mb-0.5 text-brand-purple">Precio Neto ($) *</label>
                            <input id="edit-prod-neto" type="text" inputmode="decimal" maxlength="8" value="${Number(prod.precioUsd).toFixed(2)}" class="w-full border-2 border-brand-black rounded px-2.5 py-1.5 font-black text-xs text-brand-purple bg-white" required />
                        </div>
                    </div>

                    <!-- Sección de Presentaciones Múltiples -->
                    <div class="bg-gray-50 border-2 border-brand-black rounded p-3 space-y-2">
                        <div class="flex items-center justify-between">
                            <div>
                                <span class="font-bold text-xs text-brand-purple uppercase">Presentaciones de Venta</span>
                                <p class="text-[10px] text-gray-500 font-bold">Six-pack, Caja, Tobo, Bulto con descuento exacto de stock.</p>
                            </div>
                            <button type="button" id="edit-btn-add-pres" class="bg-brand-purple text-white font-heading font-black text-[10px] px-2.5 py-1 rounded border border-brand-black hover:bg-purple-800 shadow-brutal-sm">
                                + PRESENTACIÓN
                            </button>
                        </div>
                        <div id="edit-presentaciones-lista" class="space-y-1.5 pt-1"></div>
                    </div>

                    <div>
                        <label class="inline-flex items-center gap-2 cursor-pointer select-none">
                            <input id="edit-prod-perecedero" type="checkbox" ${(prod.capacidades & CAP_PERECEDERO) !== 0 ? 'checked' : ''} class="w-5 h-5 border-2 border-brand-black rounded text-brand-black focus:ring-0" />
                            <span class="font-bold text-xs sm:text-sm">Producto perecedero (lotes con vencimiento y rotacion FEFO)</span>
                        </label>
                    </div>

                    ${(prod.capacidades & CAP_PERECEDERO) !== 0 ? `
                    <div class="bg-amber-50 border-2 border-brand-black rounded p-3 space-y-2">
                        <div class="flex items-center justify-between">
                            <div>
                                <span class="font-bold text-xs text-brand-purple uppercase">Lotes y Caducidad (FEFO)</span>
                                <p class="text-[10px] text-gray-500 font-bold">El sistema descuenta primero el lote mas proximo a vencer.</p>
                            </div>
                            <button type="button" id="edit-btn-gestionar-lotes" class="bg-amber-600 text-white font-heading font-black text-[10px] px-2.5 py-1 rounded border border-brand-black hover:bg-amber-700 shadow-brutal-sm">
                                GESTIONAR LOTES
                            </button>
                        </div>
                    </div>` : ''}

                    <div class="flex justify-end gap-2 pt-3 border-t border-gray-200 shrink-0">
                        <button type="button" data-edit-cancel class="bg-white border-2 border-brand-black font-heading font-black px-4 py-2 rounded text-xs hover:bg-gray-100">
                            CANCELAR
                        </button>
                        <button type="submit" class="bg-brand-black text-white hover:bg-gray-800 border-2 border-brand-black font-heading font-black px-5 py-2 rounded text-xs shadow-brutal-sm">
                            GUARDAR CAMBIOS
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(backdrop);

        const form = backdrop.querySelector('#form-editar-prod') as HTMLFormElement;
        const inNombre = backdrop.querySelector('#edit-prod-nombre') as HTMLInputElement;
        const inCat = backdrop.querySelector('#edit-prod-categoria') as HTMLSelectElement;
        const inImp = backdrop.querySelector('#edit-prod-impuesto') as HTMLSelectElement;
        const inBruto = backdrop.querySelector('#edit-prod-bruto') as HTMLInputElement;
        const inMargen = backdrop.querySelector('#edit-prod-margen') as HTMLInputElement;
        const inNeto = backdrop.querySelector('#edit-prod-neto') as HTMLInputElement;
        const listaPres = backdrop.querySelector('#edit-presentaciones-lista') as HTMLElement;
        const btnAddPres = backdrop.querySelector('#edit-btn-add-pres') as HTMLButtonElement;
        backdrop.querySelector('#edit-btn-gestionar-lotes')?.addEventListener('click', () => {
            void gestionarLotes(prod.sku, prod.nombre);
        });

        sanitizarInputDecimal(inBruto, 99999, 8);
        sanitizarInputDecimal(inMargen, 1000, 5);
        sanitizarInputDecimal(inNeto, 99999, 8);

        let editPresSeq = 0;
        const agregarFilaEditPres = (nombre: string = '', precio: string = '', unidades: number = 1) => {
            const idx = editPresSeq++;
            const row = document.createElement('div');
            row.id = `edit-pres-row-${idx}`;
            row.className = 'grid grid-cols-[1fr_90px_70px_32px] gap-2 items-center bg-white border border-brand-black rounded p-2';
            row.innerHTML = `
                <div>
                    <label class="block text-[9px] font-bold uppercase text-gray-600 mb-0.5">Nombre</label>
                    <input id="edit-pres-nom-${idx}" type="text" maxlength="30" value="${nombre.replace(/"/g, '&quot;')}" placeholder="Ej: Six-pack, Caja" class="w-full border border-brand-black rounded px-2 py-1 font-bold text-xs bg-gray-50 focus:bg-white" />
                </div>
                <div>
                    <label class="block text-[9px] font-bold uppercase text-gray-600 mb-0.5">Precio ($)</label>
                    <input id="edit-pres-pre-${idx}" type="number" min="0.01" step="0.01" value="${precio}" placeholder="0.00" class="w-full border border-brand-black rounded px-1.5 py-1 font-bold text-xs bg-gray-50 focus:bg-white" />
                </div>
                <div>
                    <label class="block text-[9px] font-bold uppercase text-gray-600 mb-0.5">Unidades</label>
                    <input id="edit-pres-uni-${idx}" type="number" min="1" max="9999" step="1" value="${unidades}" placeholder="1" class="w-full border border-brand-black rounded px-1.5 py-1 font-bold text-xs bg-gray-50 focus:bg-white" />
                </div>
                <div class="pt-3">
                    <button type="button" data-del-pres="${idx}" title="Eliminar presentación" class="w-7 h-7 rounded border border-red-400 text-red-600 hover:bg-red-50 font-black text-sm flex items-center justify-center">&times;</button>
                </div>
            `;
            listaPres.appendChild(row);
            row.querySelector(`[data-del-pres="${idx}"]`)?.addEventListener('click', () => {
                row.remove();
            });
        };

        // Cargar presentaciones existentes
        if (prod.presentaciones && Array.isArray(prod.presentaciones)) {
            prod.presentaciones.forEach((pr) => {
                agregarFilaEditPres(pr.nombre, String(pr.precioUsd), pr.unidades);
            });
        }

        btnAddPres.addEventListener('click', () => {
            agregarFilaEditPres();
        });

        backdrop.querySelectorAll('[data-edit-cancel]').forEach((btn) => {
            btn.addEventListener('click', () => backdrop.remove());
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nuevoNombre = inNombre.value.trim();
            if (!nuevoNombre) {
                mostrarToast('El nombre del producto es obligatorio.', 'error');
                inNombre.focus();
                return;
            }

            const nuevoPrecioNum = parseFloat(inNeto.value.replace(',', '.'));
            if (isNaN(nuevoPrecioNum) || nuevoPrecioNum <= 0) {
                mostrarToast('El precio neto debe ser un número mayor a cero.', 'error');
                inNeto.focus();
                return;
            }

            const nuevasPres: { nombre: string; precioUsd: string; unidades: number }[] = [];
            listaPres.querySelectorAll('[id^="edit-pres-row-"]').forEach((r) => {
                const rowId = r.id.replace('edit-pres-row-', '');
                const n = (document.getElementById(`edit-pres-nom-${rowId}`) as HTMLInputElement)?.value.trim();
                const p = parseFloat((document.getElementById(`edit-pres-pre-${rowId}`) as HTMLInputElement)?.value || '0');
                const u = parseInt((document.getElementById(`edit-pres-uni-${rowId}`) as HTMLInputElement)?.value || '1', 10);
                if (n && p > 0 && Number.isFinite(u) && u >= 1) {
                    nuevasPres.push({
                        nombre: n,
                        precioUsd: p.toFixed(2),
                        unidades: u,
                    });
                }
            });

            try {
                await api.actualizarProducto({
                    sku: prod.sku,
                    nombre: nuevoNombre,
                    precioUsd: nuevoPrecioNum.toFixed(2),
                    impuestoPct: inImp.value,
                    precioBrutoUsd: inBruto.value ? parseFloat(inBruto.value.replace(',', '.')).toFixed(2) : prod.precioBrutoUsd,
                    margenPct: inMargen.value ? inMargen.value.trim() : prod.margenPct,
                    categoriaId: inCat.value || '',
                    sinStock: prod.sinStock,
                    unidad: prod.unidad,
                    esCaja: prod.esCaja,
                    unidadesPorCaja: prod.unidadesPorCaja,
                    precioPaqueteUsd: prod.precioPaqueteUsd,
                    nombrePaquete: prod.nombrePaquete,
                    perecedero: (backdrop.querySelector('#edit-prod-perecedero') as HTMLInputElement)?.checked || false,
                    presentaciones: nuevasPres,
                });

                const prods = await api.productos();
                this.productos = prods;
                this.renderRepoLista();
                this.renderCatalogoLista();
                backdrop.remove();
                mostrarToast(`Producto "${nuevoNombre}" actualizado con éxito.`, 'success');
            } catch (err) {
                mostrarToast(err instanceof Error ? err.message : String(err), 'error');
            }
        });
    }

    async render(tab?: 'alta' | 'stock' | 'ajustes'): Promise<void> {
        if (tab) this.tabActiva = tab;

        const [categorias, tasas, productos, semaforo] = await Promise.all([
            api.categorias(),
            api.tasasImpuestos(),
            api.productos(),
            api.obtenerSemaforoStock(),
        ]);
        this.categorias = categorias;
        this.tasasImpuestos = tasas;
        this.productos = productos;
        this.semaforoStock = semaforo;

        const conteo = this.getConteoCategorias();

        const placeholderProducto = 'Nombre comercial del producto o servicio...';

        const privacidad = this.modelo.getConfig()?.privacidadInventario;
        const ocultarStock = privacidad && !this.duenoAutenticado;

        this.contenedor.innerHTML = `
        <div class="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
                <h2 class="text-2xl sm:text-3xl font-black font-heading">Control de Inventario</h2>
                <p class="text-brand-text font-body text-xs sm:text-sm">Alta de productos, reposición de mercancía, categorías y tasas tributarias</p>
            </div>
            ${ocultarStock ? '<div class="bg-amber-100 border-2 border-amber-400 rounded px-3 py-1 text-xs font-bold text-amber-800">MODO OPERADOR — Precios y stock ocultos. Acceda como administrador para ver información sensible.</div>' : ''}
            <div class="flex items-center gap-1 overflow-x-auto max-w-full pb-1" id="inv-tabs-container">
                <div class="inline-flex border-2 border-brand-black rounded bg-white shadow-brutal-sm p-0.5" id="inv-tabs">
                    <button id="tab-alta" class="w-36 sm:w-48 h-9 flex items-center justify-center font-heading text-xs rounded transition-colors shrink-0 ${this.tabActiva === 'alta' ? 'font-black bg-brand-black text-white' : 'font-bold text-brand-black hover:bg-gray-100'}">AÑADIR PRODUCTO</button>
                    <button id="tab-stock" class="w-36 sm:w-48 h-9 flex items-center justify-center font-heading text-xs rounded transition-colors shrink-0 ${this.tabActiva === 'stock' ? 'font-black bg-brand-black text-white' : 'font-bold text-brand-black hover:bg-gray-100'}">AÑADIR / AJUSTAR STOCK</button>
                    <button id="tab-ajustes" class="w-36 sm:w-48 h-9 flex items-center justify-center font-heading text-xs rounded transition-colors shrink-0 ${this.tabActiva === 'ajustes' ? 'font-black bg-brand-black text-white' : 'font-bold text-brand-black hover:bg-gray-100'}">CATEGORÍAS E IMPUESTOS</button>
                </div>
            </div>
        </div>

        <div id="inv-seccion-alta" class="${this.tabActiva === 'alta' ? 'block' : 'hidden'}">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                <form id="form-nuevo-producto" novalidate class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-4 sm:p-6 lg:col-span-2 space-y-4">
                    <h3 class="font-heading font-black text-xl border-b-2 border-brand-black pb-2">Registrar Nuevo Producto o Servicio</h3>
                    
                    <div>
                        <label class="block text-xs font-bold uppercase mb-1">Nombre Comercial del Producto o Servicio *</label>
                        <input id="prod-nombre" maxlength="64" placeholder="${placeholderProducto}" class="w-full border-2 border-brand-black rounded px-4 py-2.5 font-bold focus:ring-2 focus:ring-brand-cyan" required />
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold uppercase mb-1">Categoría</label>
                            <select id="prod-categoria" class="w-full border-2 border-brand-black rounded px-3 py-2.5 bg-white font-bold">
                                ${this.categorias.map((c) => `<option value="${c.id}">${c.nombre}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase mb-1">Tasa de Impuesto</label>
                            <select id="prod-impuesto" class="w-full border-2 border-brand-black rounded px-3 py-2.5 bg-white font-bold">
                                ${this.tasasImpuestos.map((t) => `<option value="${t.porcentaje}">${t.nombre}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 border-2 border-brand-black rounded p-4">
                        <div>
                            <label class="block text-xs font-bold uppercase mb-1 text-gray-700">Precio Bruto (Costo $)</label>
                            <input id="prod-precio-bruto" type="text" inputmode="decimal" maxlength="8" placeholder="0.00" class="w-full border-2 border-brand-black rounded px-3 py-2 font-bold bg-white" />
                            <span class="text-[10px] text-gray-500">Costo de reposición (opcional)</span>
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase mb-1 text-gray-700">Margen de Ganancia (%)</label>
                            <input id="prod-margen" type="text" inputmode="decimal" maxlength="5" value="30" class="w-full border-2 border-brand-black rounded px-3 py-2 font-bold bg-white" />
                            <span class="text-[10px] text-gray-500">Utilidad deseada (%)</span>
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase mb-1 text-brand-purple">Precio Neto Final ($) *</label>
                            <input id="prod-precio-neto" type="text" inputmode="decimal" maxlength="8" placeholder="0.00" class="w-full border-2 border-brand-black rounded px-3 py-2 font-black text-brand-purple bg-white" required />
                            <span class="text-[10px] text-gray-500">PVP con impuesto incluido</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                        <div id="box-stock-inicial">
                            <label class="block text-xs font-bold uppercase mb-1">Stock Inicial (en unidades base)</label>
                            <input id="prod-stock" type="text" inputmode="decimal" maxlength="7" value="10" class="w-full border-2 border-brand-black rounded px-3 py-2 font-bold bg-white" />
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase mb-1">Tipo de Medida / Venta</label>
                            <select id="prod-unidad" class="w-full border-2 border-brand-black rounded px-3 py-2 font-black bg-white">
                                <option value="un">Unidad / Pieza (un.)</option>
                                <option value="kg">Por Peso (Kilogramos - kg)</option>
                                <option value="ml">Por Volumen (Mililitros - ml)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Configuración de Empaque / Caja y Despiece -->
                    <div class="bg-gray-50 border-2 border-brand-black rounded p-3 space-y-2">
                        <label class="inline-flex items-center gap-2 cursor-pointer select-none">
                            <input id="prod-es-caja" type="checkbox" class="w-4 h-4 border-2 border-brand-black rounded text-brand-black focus:ring-0" />
                            <span class="font-bold text-xs sm:text-sm">¿Viene en empaque / caja con unidades sueltas?</span>
                        </label>
                        <div id="box-caja-config" class="hidden grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div>
                                <label class="block text-[11px] font-bold uppercase text-gray-700 mb-0.5">Unidades por Empaque / Caja *</label>
                                <input id="prod-unidades-caja" type="number" min="2" max="1000" step="1" value="12" placeholder="Ej: 12" class="w-full border-2 border-brand-black rounded px-3 py-1.5 font-bold bg-white text-sm" />
                                <span class="text-[10px] text-gray-500">Cantidad de unidades contenidas en cada empaque</span>
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold uppercase text-gray-700 mb-0.5">Ingresar Stock Inicial en Cajas</label>
                                <input id="prod-stock-cajas" type="number" min="0" max="9999" step="1" placeholder="Ej: 5 cajas" class="w-full border-2 border-brand-black rounded px-3 py-1.5 font-bold bg-white text-sm" />
                                <span class="text-[10px] text-gray-500">Convierte automáticamente a unidades base</span>
                            </div>
                        </div>
                        <div class="pt-2 border-t border-gray-300">
                            <label class="inline-flex items-center gap-2 cursor-pointer select-none">
                                <input id="prod-tiene-paquete" type="checkbox" class="w-4 h-4 border-2 border-brand-purple rounded text-brand-purple focus:ring-0" />
                                <span class="font-bold text-xs sm:text-sm">¿Tiene precio por paquete / caja único?</span>
                            </label>
                            <div id="box-paquete-config" class="hidden grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                <div>
                                    <label class="block text-[11px] font-bold uppercase text-gray-700 mb-0.5">Nombre del Empaque *</label>
                                    <input id="prod-nombre-paquete" type="text" maxlength="30" placeholder="Ej: Caja, Tobo, Bolsa" class="w-full border-2 border-brand-purple rounded px-3 py-1.5 font-bold bg-white text-sm" />
                                    <span class="text-[10px] text-gray-500">Nombre descriptivo del empaque</span>
                                </div>
                                <div>
                                    <label class="block text-[11px] font-bold uppercase text-gray-700 mb-0.5">Precio por Empaque (USD) *</label>
                                    <input id="prod-precio-paquete" type="number" min="0" step="0.01" placeholder="Ej: 25.00" class="w-full border-2 border-brand-purple rounded px-3 py-1.5 font-bold bg-white text-sm" />
                                    <span class="text-[10px] text-gray-500">Precio de venta por empaque completo</span>
                                </div>
                            </div>
                        </div>
                        <div class="pt-2 border-t border-gray-300 space-y-2">
                            <div class="flex items-center justify-between">
                                <div>
                                    <span class="font-bold text-xs sm:text-sm text-brand-purple">Múltiples Presentaciones (Diferentes Tamaños / Empaques)</span>
                                    <p class="text-[10px] text-gray-500">Ej: Six-pack (6 un.), Tobo (10 un.), Caja (24 un.). Descuento dinámico exacto de stock.</p>
                                </div>
                                <button type="button" id="btn-agregar-presentacion" class="bg-brand-purple text-white font-heading font-black text-[10px] px-2.5 py-1 rounded border border-brand-black hover:bg-purple-800 shadow-brutal-sm">
                                    + PRESENTACIÓN
                                </button>
                            </div>
                            <div id="presentaciones-lista" class="space-y-1.5 pt-1"></div>
                        </div>
                    </div>

                    <div>
                        <label class="inline-flex items-center gap-2 cursor-pointer select-none">
                            <input id="prod-sin-stock" type="checkbox" class="w-5 h-5 border-2 border-brand-black rounded text-brand-black focus:ring-0" />
                            <span class="font-bold text-xs sm:text-sm">Venta "Sin Stock" (Servicios / Detal libre sin inventario rígido)</span>
                        </label>
                    </div>

                    <div>
                        <label class="inline-flex items-center gap-2 cursor-pointer select-none">
                            <input id="prod-perecedero" type="checkbox" class="w-5 h-5 border-2 border-brand-black rounded text-brand-black focus:ring-0" />
                            <span class="font-bold text-xs sm:text-sm">Producto perecedero (lotes con vencimiento y rotacion FEFO)</span>
                        </label>
                    </div>

                    <div class="pt-2">
                        <button type="submit" class="w-full bg-brand-black text-white font-heading font-black py-4 rounded border-2 border-brand-black shadow-brutal hover:-translate-y-0.5 transition-all text-lg">
                            GUARDAR PRODUCTO O SERVICIO
                        </button>
                        <p id="alta-prod-msg" class="hidden font-bold text-sm mt-3 text-center"></p>
                    </div>
                </form>

                <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-4 sm:p-6 flex flex-col min-h-[300px] max-h-[480px] lg:max-h-[650px]">
                    <div class="flex justify-between items-center border-b-2 border-brand-black pb-2 mb-2">
                        <h3 class="font-heading font-black text-base sm:text-lg">Catálogo Registrado</h3>
                        <span class="text-xs font-black bg-gray-100 border border-brand-black px-2 py-0.5 rounded">${this.productos.length} artículos</span>
                    </div>
                    <div class="space-y-2 mb-3">
                        <select id="cat-filtro-lateral" class="w-full border-2 border-brand-black rounded px-2.5 py-1.5 text-xs font-bold bg-white focus:ring-2 focus:ring-brand-cyan">
                            <option value="todas">Todas las categorías (${this.productos.length} prods)</option>
                            ${this.categorias.map((c) => `<option value="${c.id}" ${this.filtroCategoriaCatalogo === c.id ? 'selected' : ''}>${c.nombre} (${conteo[c.id] || 0} prods)</option>`).join('')}
                        </select>
                        <input id="cat-buscar-filtro" type="text" maxlength="40" placeholder="Filtrar por nombre o SKU..." value="${this.busquedaCatalogo}" class="w-full border-2 border-brand-black rounded px-3 py-2 text-xs font-bold" />
                    </div>
                    <div id="cat-lista-items" class="flex-1 overflow-y-auto space-y-2 pr-1"></div>
                    <div id="cat-lista-paginacion" class="flex items-center justify-between pt-2 mt-2 border-t-2 border-brand-black shrink-0"></div>
                </div>
            </div>
        </div>

        <div id="inv-seccion-stock" class="${this.tabActiva === 'stock' ? 'block' : 'hidden'} space-y-4">
            <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-4 sm:p-6">
                <div class="flex flex-wrap justify-between items-center mb-3 gap-2">
                    <div>
                        <h3 class="font-heading font-black text-xl">Reposición Dinámica de Stock</h3>
                        <p class="text-xs sm:text-sm text-gray-600">Explora por categoría o busca por nombre para dar entrada o salida a existencias.</p>
                    </div>
                    <span id="repo-contador-estado" class="text-xs font-bold text-gray-700 bg-gray-100 border-2 border-brand-black px-2.5 py-1 rounded">
                        ${this.productos.length} artículos en depósito
                    </span>
                </div>

                <!-- Chips de Filtrado por Categoría con Conteo Exacto -->
                <div class="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 max-w-full" id="repo-chips-categorias">
                    <button data-cat-chip="todas" class="px-3 py-1 rounded text-xs font-heading font-black border-2 border-brand-black shrink-0 transition-colors ${this.filtroCategoriaRepo === 'todas' ? 'bg-brand-black text-white' : 'bg-gray-100 text-brand-black hover:bg-gray-200'}">
                        TODAS (${this.productos.length})
                    </button>
                    ${this.categorias.map((c) => {
                        const num = conteo[c.id] || 0;
                        const activo = this.filtroCategoriaRepo === c.id;
                        return `
                        <button data-cat-chip="${c.id}" class="px-3 py-1 rounded text-xs font-heading font-black border-2 border-brand-black shrink-0 transition-colors ${activo ? 'bg-brand-black text-white' : 'bg-gray-100 text-brand-black hover:bg-gray-200'}">
                            ${c.nombre} (${num})
                        </button>`;
                    }).join('')}
                </div>

                <input id="repo-buscar" type="text" maxlength="40" placeholder="Escribe el nombre del producto para buscar..." value="${this.busquedaRepo}" class="w-full border-2 border-brand-black rounded px-4 py-2.5 text-base font-bold mb-4 focus:ring-2 focus:ring-brand-cyan" />

                <div id="repo-lista" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto p-1"></div>
            </div>
        </div>

        <div id="inv-seccion-ajustes" class="${this.tabActiva === 'ajustes' ? 'block' : 'hidden'} grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-6 space-y-4">
                <div class="border-b-2 border-brand-black pb-2 flex justify-between items-center">
                    <div>
                        <h3 class="font-heading font-black text-xl">Gestión de Categorías</h3>
                        <p class="text-xs text-gray-500 font-bold">Clasificación de catálogo comercial e inventario</p>
                    </div>
                    <span class="text-xs font-black bg-gray-100 border border-brand-black px-2 py-0.5 rounded">${this.categorias.length} categorías</span>
                </div>
                <form id="form-crear-cat" class="flex gap-2">
                    <input id="cat-nombre" maxlength="32" placeholder="Nombre de categoría..." class="flex-1 border-2 border-brand-black rounded px-3 py-2 font-bold" required />
                    <button type="submit" class="bg-brand-black text-white px-4 py-2 rounded font-black font-heading text-sm">AGREGAR</button>
                </form>
                <div id="cat-gest-lista-items" class="space-y-2 min-h-[160px]"></div>
                <div id="cat-gest-paginacion" class="flex justify-between items-center border-t-2 border-brand-black pt-2 mt-2"></div>
            </div>

            <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-6 space-y-4">
                <h3 class="font-heading font-black text-xl border-b-2 border-brand-black pb-2">Tasas de Impuestos (IVA)</h3>
                <form id="form-crear-tax" class="grid grid-cols-3 gap-2">
                    <input id="tax-nombre" maxlength="32" placeholder="Nombre (ej: Retención 5%)" class="col-span-2 border-2 border-brand-black rounded px-3 py-2 font-bold text-sm" required />
                    <div class="flex gap-1">
                        <input id="tax-pct" type="number" step="0.5" min="0" max="100" maxlength="4" placeholder="%" class="w-16 border-2 border-brand-black rounded px-2 py-2 font-bold text-sm" required />
                        <button type="submit" class="bg-brand-black text-white px-3 py-2 rounded font-black font-heading text-xs flex-1">+</button>
                    </div>
                </form>
                <div class="space-y-2 max-h-[350px] overflow-y-auto">
                    ${this.tasasImpuestos.map((t) => `
                        <div class="flex justify-between items-center border border-brand-black rounded p-2.5 bg-gray-50">
                            <span class="font-bold text-sm">${t.nombre} (${t.porcentaje}%)</span>
                            ${t.porcentaje === '0' || t.porcentaje === '16' ? '<span class="text-xs text-gray-400 font-bold">Por defecto</span>' : `<button data-del-tax="${t.id}" class="text-xs font-black text-red-600 hover:underline">Eliminar</button>`}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>`;

        this.conectarEventos();
        this.renderCatalogoLista();
        this.renderRepoLista();
    }

    private conectarEventos(): void {
        const tabAlta = document.getElementById('tab-alta');
        const tabStock = document.getElementById('tab-stock');
        const tabAjustes = document.getElementById('tab-ajustes');
        const secAlta = document.getElementById('inv-seccion-alta');
        const secStock = document.getElementById('inv-seccion-stock');
        const secAjustes = document.getElementById('inv-seccion-ajustes');

        const activarTab = (tabName: 'alta' | 'stock' | 'ajustes', btn: HTMLElement | null, sec: HTMLElement | null) => {
            this.tabActiva = tabName;
            [tabAlta, tabStock, tabAjustes].forEach((t) => {
                if (t) {
                    t.className = 'w-36 sm:w-48 h-9 flex items-center justify-center font-heading font-bold text-xs rounded text-brand-black hover:bg-gray-100 transition-colors shrink-0';
                }
            });
            [secAlta, secStock, secAjustes].forEach((s) => {
                s?.classList.remove('block');
                s?.classList.add('hidden');
            });
            if (btn && sec) {
                btn.className = 'w-36 sm:w-48 h-9 flex items-center justify-center font-heading font-black text-xs rounded bg-brand-black text-white transition-colors shrink-0';
                sec.classList.remove('hidden');
                sec.classList.add('block');
            }
        };

        tabAlta?.addEventListener('click', () => activarTab('alta', tabAlta, secAlta));
        tabStock?.addEventListener('click', () => {
            activarTab('stock', tabStock, secStock);
            this.renderRepoLista();
        });
        tabAjustes?.addEventListener('click', () => activarTab('ajustes', tabAjustes, secAjustes));

        // Cálculo dinámico bidireccional de precio bruto / neto / margen
        const inBruto = document.getElementById('prod-precio-bruto') as HTMLInputElement | null;
        const inMargen = document.getElementById('prod-margen') as HTMLInputElement | null;
        const inImp = document.getElementById('prod-impuesto') as HTMLSelectElement | null;
        const inNeto = document.getElementById('prod-precio-neto') as HTMLInputElement | null;

        const cleanNum = (val: string | null | undefined): number => {
            if (!val) return 0;
            const s = val.trim().replace(',', '.');
            const n = parseFloat(s);
            return Number.isFinite(n) && !isNaN(n) ? n : 0;
        };

        const recalcularNeto = () => {
            if (!inBruto || !inNeto || !inMargen || !inImp) return;
            const bruto = cleanNum(inBruto.value);
            const margen = cleanNum(inMargen.value) / 100;
            const imp = cleanNum(inImp.value) / 100;
            if (bruto > 0) {
                const conGanancia = bruto * (1 + margen);
                const netoFinal = conGanancia * (1 + imp);
                inNeto.value = netoFinal.toFixed(2);
            }
        };

        const recalcularMargenDesdeNeto = () => {
            if (!inBruto || !inNeto || !inMargen || !inImp) return;
            const neto = cleanNum(inNeto.value);
            const bruto = cleanNum(inBruto.value);
            const margen = cleanNum(inMargen.value) / 100;
            const imp = cleanNum(inImp.value) / 100;

            if (neto > 0) {
                const baseSinImp = neto / (1 + imp);
                if (bruto > 0) {
                    const margenResultante = ((baseSinImp - bruto) / bruto) * 100;
                    inMargen.value = Math.max(0, Math.round(margenResultante * 10) / 10).toFixed(1);
                } else if (margen > 0) {
                    // Deducir automáticamente costo bruto si no fue ingresado
                    inBruto.value = (baseSinImp / (1 + margen)).toFixed(2);
                }
            }
        };

        const inStockEl = document.getElementById('prod-stock') as HTMLInputElement | null;
        const inNombre = document.getElementById('prod-nombre') as HTMLInputElement | null;
        const inUnidadEl = document.getElementById('prod-unidad') as HTMLSelectElement | null;
        const inCatNombre = document.getElementById('cat-nombre') as HTMLInputElement | null;
        const inTaxNombre = document.getElementById('tax-nombre') as HTMLInputElement | null;
        const inTaxPct = document.getElementById('tax-pct') as HTMLInputElement | null;
        const inBuscarCat = document.getElementById('cat-buscar-filtro') as HTMLInputElement | null;
        const inBuscarRepo = document.getElementById('repo-buscar') as HTMLInputElement | null;
        const msgEl = document.getElementById('alta-prod-msg');

        if (inNombre) sanitizarInputTexto(inNombre, 64);
        if (inBruto) sanitizarInputDecimal(inBruto, 99999.99, 8, recalcularNeto);
        if (inMargen) sanitizarInputDecimal(inMargen, 999, 5, recalcularNeto);
        if (inNeto) sanitizarInputDecimal(inNeto, 99999.99, 8, recalcularMargenDesdeNeto);
        if (inStockEl) sanitizarInputDecimal(inStockEl, 99999, 7);
        if (inCatNombre) sanitizarInputTexto(inCatNombre, 32);
        if (inTaxNombre) sanitizarInputTexto(inTaxNombre, 32);
        if (inTaxPct) sanitizarInputDecimal(inTaxPct, 100, 5);
        if (inBuscarCat) sanitizarInputTexto(inBuscarCat, 40);
        if (inBuscarRepo) sanitizarInputTexto(inBuscarRepo, 40);
        inImp?.addEventListener('change', recalcularNeto);

        // Limpieza de mensajes de error al corregir
        const limpiarError = () => {
            if (msgEl && !msgEl.classList.contains('hidden') && msgEl.style.color !== '#00823B') {
                msgEl.classList.add('hidden');
                msgEl.textContent = '';
            }
        };
        inNombre?.addEventListener('input', limpiarError);
        inNeto?.addEventListener('input', limpiarError);
        inStockEl?.addEventListener('input', limpiarError);
        inUnidadEl?.addEventListener('change', limpiarError);

        // Sin stock checkbox
        const chkSinStock = document.getElementById('prod-sin-stock') as HTMLInputElement | null;
        const boxStock = document.getElementById('box-stock-inicial');
        chkSinStock?.addEventListener('change', () => {
            limpiarError();
            if (boxStock) {
                boxStock.style.opacity = chkSinStock.checked ? '0.3' : '1';
                (boxStock.querySelector('input') as HTMLInputElement).disabled = chkSinStock.checked;
            }
        });

        // Empaque / Caja checkbox y conversión automática
        const chkEsCaja = document.getElementById('prod-es-caja') as HTMLInputElement | null;
        const boxCajaConfig = document.getElementById('box-caja-config');
        const inUnidadesCaja = document.getElementById('prod-unidades-caja') as HTMLInputElement | null;
        const inStockCajas = document.getElementById('prod-stock-cajas') as HTMLInputElement | null;

        chkEsCaja?.addEventListener('change', () => {
            limpiarError();
            if (boxCajaConfig) {
                if (chkEsCaja.checked) {
                    boxCajaConfig.classList.remove('hidden');
                } else {
                    boxCajaConfig.classList.add('hidden');
                }
            }
        });

        const recalcularStockDesdeCajas = () => {
            if (chkEsCaja?.checked && inStockCajas && inUnidadesCaja && inStockEl) {
                const cajas = parseInt(inStockCajas.value, 10);
                const unPorCaja = parseInt(inUnidadesCaja.value, 10);
                if (Number.isFinite(cajas) && cajas >= 0 && Number.isFinite(unPorCaja) && unPorCaja > 1) {
                    inStockEl.value = String(cajas * unPorCaja);
                }
            }
        };

        if (inUnidadesCaja) sanitizarInputEntero(inUnidadesCaja, 2, 1000, 4, recalcularStockDesdeCajas);
        if (inStockCajas) sanitizarInputEntero(inStockCajas, 0, 9999, 4, recalcularStockDesdeCajas);

        // Precio Paquete checkbox y configuración
        const chkTienePaquete = document.getElementById('prod-tiene-paquete') as HTMLInputElement | null;
        const boxPaqueteConfig = document.getElementById('box-paquete-config');
        chkTienePaquete?.addEventListener('change', () => {
            limpiarError();
            if (boxPaqueteConfig) {
                if (chkTienePaquete.checked) {
                    boxPaqueteConfig.classList.remove('hidden');
                } else {
                    boxPaqueteConfig.classList.add('hidden');
                }
            }
        });

        inStockCajas?.addEventListener('input', recalcularStockDesdeCajas);
        inUnidadesCaja?.addEventListener('input', recalcularStockDesdeCajas);

        // Presentaciones dinámicas múltiples
        const listaPres = document.getElementById('presentaciones-lista');
        const btnAddPres = document.getElementById('btn-agregar-presentacion');
        let presSeq = 0;
        const agregarFilaPresentacion = () => {
            const idx = presSeq++;
            const row = document.createElement('div');
            row.id = `pres-row-${idx}`;
            row.className = 'grid grid-cols-[1fr_90px_70px_32px] gap-2 items-center bg-white border border-brand-black rounded p-2';
            row.innerHTML = `
                <div>
                    <label class="block text-[9px] font-bold uppercase text-gray-600 mb-0.5">Nombre</label>
                    <input id="pres-nombre-${idx}" type="text" maxlength="30" placeholder="Ej: Six-pack, Tobo, Caja" class="w-full border border-brand-black rounded px-2 py-1 font-bold text-xs bg-gray-50 focus:bg-white" />
                </div>
                <div>
                    <label class="block text-[9px] font-bold uppercase text-gray-600 mb-0.5">Precio ($)</label>
                    <input id="pres-precio-${idx}" type="number" min="0.01" step="0.01" placeholder="0.00" class="w-full border border-brand-black rounded px-1.5 py-1 font-bold text-xs bg-gray-50 focus:bg-white" />
                </div>
                <div>
                    <label class="block text-[9px] font-bold uppercase text-gray-600 mb-0.5">Unidades</label>
                    <input id="pres-unidades-${idx}" type="number" min="1" max="9999" step="1" value="1" placeholder="1" class="w-full border border-brand-black rounded px-1.5 py-1 font-bold text-xs bg-gray-50 focus:bg-white" />
                </div>
                <div class="pt-3">
                    <button type="button" data-del-pres="${idx}" title="Eliminar presentación" class="w-7 h-7 rounded border border-red-400 text-red-600 hover:bg-red-50 font-black text-sm flex items-center justify-center">&times;</button>
                </div>
            `;
            listaPres?.appendChild(row);
            row.querySelector(`[data-del-pres="${idx}"]`)?.addEventListener('click', () => {
                row.remove();
            });
        };
        btnAddPres?.addEventListener('click', () => {
            agregarFilaPresentacion();
        });

        // Form alta producto
        document.getElementById('form-nuevo-producto')?.addEventListener('submit', (e) => {
            e.preventDefault();
            void this.guardarProducto();
        });

        // Buscador catálogo lateral
        document.getElementById('cat-buscar-filtro')?.addEventListener('input', (e) => {
            this.busquedaCatalogo = (e.target as HTMLInputElement).value.trim().toLowerCase();
            this.paginaCat = 1;
            this.renderCatalogoLista();
        });

        // Filtro por categoría en panel lateral de catálogo
        document.getElementById('cat-filtro-lateral')?.addEventListener('change', (e) => {
            this.filtroCategoriaCatalogo = (e.target as HTMLSelectElement).value;
            this.paginaCat = 1;
            this.renderCatalogoLista();
        });

        // Buscador de reposición
        document.getElementById('repo-buscar')?.addEventListener('input', (e) => {
            this.busquedaRepo = (e.target as HTMLInputElement).value.trim().toLowerCase();
            this.paginaRepo = 1;
            this.renderRepoLista();
        });


        // Chips de categoría en reposición
        this.contenedor.querySelectorAll('[data-cat-chip]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const catId = (btn as HTMLElement).dataset.catChip || 'todas';
                this.filtroCategoriaRepo = catId;
                this.paginaRepo = 1;
                // Actualizar estilo visual de los chips
                this.contenedor.querySelectorAll('[data-cat-chip]').forEach((b) => {
                    const c = (b as HTMLElement).dataset.catChip || 'todas';
                    if (c === catId) {
                        b.className = 'px-3 py-1 rounded text-xs font-heading font-black border-2 border-brand-black shrink-0 transition-colors bg-brand-black text-white';
                    } else {
                        b.className = 'px-3 py-1 rounded text-xs font-heading font-black border-2 border-brand-black shrink-0 transition-colors bg-gray-100 text-brand-black hover:bg-gray-200';
                    }
                });
                this.renderRepoLista();
            });
        });

        // Categorías
        document.getElementById('form-crear-cat')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('cat-nombre') as HTMLInputElement | null;
            if (input?.value.trim()) {
                void api.crearCategoria(input.value.trim()).then(() => void this.render('ajustes'));
            }
        });

        // Categorías con paginación
        const renderCategoriasGestion = () => {
            const listEl = document.getElementById('cat-gest-lista-items');
            const pagEl = document.getElementById('cat-gest-paginacion');
            if (!listEl) return;

            const conteo: Record<string, number> = {};
            this.productos.forEach((p) => {
                const cId = p.categoriaId || 'cat-general';
                conteo[cId] = (conteo[cId] || 0) + 1;
            });

            const totalCategorias = this.categorias.length;
            const totalPaginas = Math.max(1, Math.ceil(totalCategorias / this.POR_PAGINA_CATEGORIAS));
            if (this.paginaCategorias > totalPaginas) this.paginaCategorias = totalPaginas;
            if (this.paginaCategorias < 1) this.paginaCategorias = 1;

            const inicio = (this.paginaCategorias - 1) * this.POR_PAGINA_CATEGORIAS;
            const slice = this.categorias.slice(inicio, inicio + this.POR_PAGINA_CATEGORIAS);

            if (slice.length === 0) {
                listEl.innerHTML = '<p class="text-xs text-gray-400 font-bold py-6 text-center">No hay categorías registradas.</p>';
                if (pagEl) pagEl.innerHTML = '';
                return;
            }

            listEl.innerHTML = slice.map((c) => {
                const num = conteo[c.id] || 0;
                return `
                <div class="flex justify-between items-center border-2 border-brand-black rounded-lg p-3 bg-gray-50">
                    <div>
                        <span class="font-bold text-sm text-brand-black">${c.nombre}</span>
                        <p class="text-[11px] font-bold text-gray-500">${num} ${num === 1 ? 'producto asociado' : 'productos asociados'}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-black px-2 py-0.5 rounded border border-brand-black ${num > 0 ? 'bg-amber-100 text-amber-900' : 'bg-gray-200 text-gray-600'}">
                            ${num} prods.
                        </span>
                        <button data-del-cat="${c.id}" class="text-xs font-black text-red-600 hover:text-white hover:bg-red-600 border border-red-300 rounded px-2 py-1 transition-colors">Eliminar</button>
                    </div>
                </div>`;
            }).join('');

            // Eventos de eliminación
            listEl.querySelectorAll('[data-del-cat]').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const id = (btn as HTMLElement).dataset.delCat;
                    if (!id) return;
                    const privacidad = this.modelo.getConfig()?.privacidadInventario;
                    if (privacidad && !this.duenoAutenticado) {
                        mostrarToast('Acción no permitida en modo operador. Solicite al Dueño(a).', 'error');
                        return;
                    }
                    if (!this.duenoAutenticado && this.modelo.hasPinSet()) {
                        const pin = await pedirValor('Acción protegida. Ingrese el PIN de Administrador(a) / Dueño(a):', '', 'AUTENTICACIÓN DUEÑO(A)');
                        if (!pin || !await this.modelo.verificarPin(pin)) {
                            mostrarToast('PIN incorrecto o no suministrado. Acción cancelada.', 'error');
                            return;
                        }
                    }
                    if (!await confirmarAccion('¿Seguro que desea eliminar esta categoría? Los productos asociados quedarán sin categoría.', 'ELIMINAR CATEGORÍA')) return;
                    void api.eliminarCategoria(id).then(() => void this.render('ajustes'));
                });
            });

            if (pagEl) {
                if (totalPaginas > 1) {
                    pagEl.innerHTML = `
                        <span class="text-[10px] font-bold text-gray-600">Pág. ${this.paginaCategorias}/${totalPaginas} (${totalCategorias} cats.)</span>
                        <div class="flex gap-1.5">
                            <button id="btn-cat-ant" ${this.paginaCategorias === 1 ? 'disabled' : ''} class="border-2 border-brand-black px-2 py-0.5 rounded text-[10px] font-heading font-black shadow-brutal-sm ${this.paginaCategorias === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100'}">&larr; ANT</button>
                            <button id="btn-cat-sig" ${this.paginaCategorias === totalPaginas ? 'disabled' : ''} class="border-2 border-brand-black px-2 py-0.5 rounded text-[10px] font-heading font-black shadow-brutal-sm ${this.paginaCategorias === totalPaginas ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100'}">SIG &rarr;</button>
                        </div>
                    `;
                    pagEl.querySelector('#btn-cat-ant')?.addEventListener('click', () => {
                        if (this.paginaCategorias > 1) {
                            this.paginaCategorias--;
                            renderCategoriasGestion();
                        }
                    });
                    pagEl.querySelector('#btn-cat-sig')?.addEventListener('click', () => {
                        if (this.paginaCategorias < totalPaginas) {
                            this.paginaCategorias++;
                            renderCategoriasGestion();
                        }
                    });
                } else {
                    pagEl.innerHTML = '';
                }
            }
        };

        renderCategoriasGestion();

        // Impuestos
        document.getElementById('form-crear-tax')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const inNom = document.getElementById('tax-nombre') as HTMLInputElement | null;
            const inPct = document.getElementById('tax-pct') as HTMLInputElement | null;
            if (inNom?.value.trim() && inPct) {
                void api.crearTasaImpuesto(inNom.value.trim(), Number(inPct.value)).then(() => void this.render('ajustes'));
            }
        });

        this.contenedor.querySelectorAll('[data-del-tax]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = (btn as HTMLElement).dataset.delTax;
                if (id) void api.eliminarTasaImpuesto(id).then(() => void this.render('ajustes'));
            });
        });
    }

    private renderCatalogoLista(): void {
        const box = document.getElementById('cat-lista-items');
        if (!box) return;

        const filtrados = this.productos.filter((p) => {
            const coincideTexto = !this.busquedaCatalogo
                || p.nombre.toLowerCase().includes(this.busquedaCatalogo)
                || p.sku.toLowerCase().includes(this.busquedaCatalogo);
            const coincideCat = this.filtroCategoriaCatalogo === 'todas'
                || (p.categoriaId || 'cat-general') === this.filtroCategoriaCatalogo;
            return coincideTexto && coincideCat;
        });

        if (filtrados.length === 0) {
            box.innerHTML = '<p class="py-4 text-center text-gray-400 font-bold text-xs">Sin coincidencias en esta categoría.</p>';
            const pagBox = document.getElementById('cat-lista-paginacion');
            if (pagBox) pagBox.innerHTML = '';
            return;
        }

        const totalPag = Math.ceil(filtrados.length / this.POR_PAGINA_CAT);
        if (this.paginaCat > totalPag) this.paginaCat = totalPag;
        const inicio = (this.paginaCat - 1) * this.POR_PAGINA_CAT;
        const pagina = filtrados.slice(inicio, inicio + this.POR_PAGINA_CAT);

        box.innerHTML = pagina.map((p) => {
            const st = Number(p.stock);
            const badgeClass = p.sinStock
                ? 'bg-purple-100 text-purple-900'
                : st <= this.semaforoStock.rojoMax
                ? 'bg-red-100 text-red-900'
                : st <= this.semaforoStock.amarilloMax
                ? 'bg-yellow-100 text-yellow-900'
                : 'bg-green-100 text-green-900';
            const unitLabel = this.getUnitLabel(p);
            const catNombre = this.getNombreCategoria(p.categoriaId);
            const privacidad = this.modelo.getConfig()?.privacidadInventario;
            const ocultarStock = privacidad && !this.duenoAutenticado;
            return `
            <div class="border border-brand-black rounded p-2 bg-gray-50 flex justify-between items-center text-xs">
                <div class="min-w-0 flex-1 pr-2">
                    <p class="font-bold truncate text-brand-black" title="${p.nombre}">${p.nombre}</p>
                    <p class="text-[10px] text-gray-500 font-bold">
                        <span class="text-brand-purple font-black">${catNombre}</span> · ${ocultarStock ? '•••' : `$${Number(p.precioUsd).toFixed(2)}`} · IVA ${p.impuestoPct}%
                    </p>
                </div>
                <div class="text-right shrink-0 flex items-center gap-1.5">
                    <span class="font-black px-2 py-0.5 rounded border border-brand-black text-[10px] inline-block ${badgeClass}">
                        ${ocultarStock ? '<span class="text-gray-400">•••</span>' : (p.sinStock ? 'LIBRE' : (p.esCaja && p.unidadesPorCaja && p.unidadesPorCaja > 1 ? `${Math.floor(st / p.unidadesPorCaja)} cj. + ${st % p.unidadesPorCaja} un. (${st} un.)` : `${st} ${unitLabel}`))}
                    </span>
                    <button data-cat-edit="${p.sku}" title="Editar producto" class="w-5 h-5 rounded border border-brand-black text-brand-black hover:bg-brand-black hover:text-white flex items-center justify-center font-black text-[10px] shrink-0">✎</button>
                </div>
            </div>`;
        }).join('');

        box.querySelectorAll('[data-cat-edit]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const sku = (btn as HTMLElement).dataset.catEdit;
                const prod = this.productos.find((x) => x.sku === sku);
                if (!sku || !prod) return;
                const privacidad = this.modelo.getConfig()?.privacidadInventario;
                if (privacidad && !this.duenoAutenticado) {
                    mostrarToast('Acción no permitida en modo operador. Solicite al Dueño(a).', 'error');
                    return;
                }
                if (!this.duenoAutenticado && this.modelo.hasPinSet()) {
                    const pin = await pedirValor('Acción protegida. Ingrese el PIN de Administrador(a) / Dueño(a):', '', 'AUTENTICACIÓN DUEÑO(A)');
                    if (!pin || !await this.modelo.verificarPin(pin)) {
                        mostrarToast('PIN incorrecto o no suministrado. Acción cancelada.', 'error');
                        return;
                    }
                }
                this.abrirModalEditarProducto(prod);
            });
        });

        const pagBox = document.getElementById('cat-lista-paginacion');
        if (pagBox) {
            if (totalPag <= 1) {
                pagBox.innerHTML = `
                    <span class="text-[10px] font-bold text-gray-500">Pág. 1 de 1 · ${filtrados.length} productos</span>
                `;
            } else {
                pagBox.innerHTML = `
                    <span class="text-[10px] font-bold text-gray-700">Pág. ${this.paginaCat} de ${totalPag} · ${filtrados.length} prods</span>
                    <div class="flex items-center gap-1.5">
                        <button id="cat-pag-ant" class="border-2 border-brand-black px-2.5 py-1 rounded text-[10px] font-heading font-black shadow-brutal-sm transition-all ${this.paginaCat === 1 ? 'opacity-30 pointer-events-none cursor-not-allowed bg-gray-100' : 'bg-white hover:bg-gray-100 hover:-translate-y-0.5'}">ANT.</button>
                        <button id="cat-pag-sig" class="border-2 border-brand-black px-2.5 py-1 rounded text-[10px] font-heading font-black shadow-brutal-sm transition-all ${this.paginaCat === totalPag ? 'opacity-30 pointer-events-none cursor-not-allowed bg-gray-100' : 'bg-white hover:bg-gray-100 hover:-translate-y-0.5'}">SIG.</button>
                    </div>`;

                document.getElementById('cat-pag-ant')?.addEventListener('click', () => {
                    if (this.paginaCat > 1) {
                        this.paginaCat--;
                        this.renderCatalogoLista();
                    }
                });
                document.getElementById('cat-pag-sig')?.addEventListener('click', () => {
                    if (this.paginaCat < totalPag) {
                        this.paginaCat++;
                        this.renderCatalogoLista();
                    }
                });
            }
        }
    }



    private renderRepoLista(): void {
        const box = document.getElementById('repo-lista');
        if (!box) return;

        const filtrados = this.productos.filter((p) => {
            const coincideTexto = !this.busquedaRepo
                || p.nombre.toLowerCase().includes(this.busquedaRepo)
                || p.sku.toLowerCase().includes(this.busquedaRepo);
            const coincideCat = this.filtroCategoriaRepo === 'todas'
                || (p.categoriaId || 'cat-general') === this.filtroCategoriaRepo;
            return coincideTexto && coincideCat;
        });

        const estadoEl = document.getElementById('repo-contador-estado');
        if (estadoEl) {
            const nombreCat = this.filtroCategoriaRepo === 'todas' ? 'en depósito' : `en ${this.getNombreCategoria(this.filtroCategoriaRepo)}`;
            estadoEl.textContent = `${filtrados.length} de ${this.productos.length} artículos ${nombreCat}`;
        }

        if (filtrados.length === 0) {
            box.innerHTML = '<p class="col-span-full py-8 text-center text-gray-500 font-bold">No se encontraron productos en la categoría seleccionada.</p>';
            return;
        }

        const semaforo = this.semaforoStock;
        const totalPag = Math.ceil(filtrados.length / this.POR_PAGINA_REPO);
        if (this.paginaRepo > totalPag) this.paginaRepo = totalPag;
        const inicio = (this.paginaRepo - 1) * this.POR_PAGINA_REPO;
        const pagina = filtrados.slice(inicio, inicio + this.POR_PAGINA_REPO);

        box.innerHTML = pagina.map((p) => {
            const st = Number(p.stock);
            const colorStock = p.sinStock
                ? 'text-purple-700'
                : st <= semaforo.rojoMax
                ? 'text-red-600'
                : st <= semaforo.amarilloMax
                ? 'text-amber-600'
                : 'text-emerald-700';
            const unitLabel = this.getUnitLabel(p);
            const catNombre = this.getNombreCategoria(p.categoriaId);
            const textoStock = p.sinStock
                ? 'Venta libre'
                : p.esCaja && p.unidadesPorCaja && p.unidadesPorCaja > 1
                ? `${Math.floor(st / p.unidadesPorCaja)} cajas y ${st % p.unidadesPorCaja} un. (${st} un.)`
                : `${st} ${unitLabel}`;
            const privacidad = this.modelo.getConfig()?.privacidadInventario;
            const ocultarStock = privacidad && !this.duenoAutenticado;
            return `
            <div class="border-2 border-brand-black rounded-lg p-3 bg-white shadow-sm flex flex-col justify-between h-[175px] min-h-[175px] max-h-[175px] box-border overflow-hidden">
                <div class="min-w-0">
                    <div class="flex justify-between items-start gap-1">
                        <div class="min-w-0 flex-1">
                            <span class="text-[9px] font-black uppercase tracking-wider text-brand-purple bg-purple-50 border border-purple-200 rounded px-1.5 py-0.2 inline-block mb-0.5 truncate max-w-[150px]">${catNombre}</span>
                            <h4 class="font-heading font-black text-sm truncate" title="${p.nombre}">${p.nombre}</h4>
                        </div>
                        <div class="flex gap-1 shrink-0">
                            <button data-repo-edit="${p.sku}" title="Editar precio y datos del producto" class="w-5 h-5 rounded border border-brand-black text-brand-black hover:bg-brand-black hover:text-white flex items-center justify-center font-black text-[10px] shrink-0">✎</button>
                            <button data-repo-del="${p.sku}" title="Eliminar producto del catálogo" class="w-5 h-5 rounded border border-brand-black text-red-600 hover:bg-red-600 hover:text-white flex items-center justify-center font-black text-xs shrink-0">&times;</button>
                        </div>
                    </div>
                    <p class="text-xs font-bold text-gray-500 mt-0.5">${ocultarStock ? 'Stock: <span class="font-black text-gray-400">•••</span>' : `Precio: <span class="font-black text-brand-black">$${Number(p.precioUsd).toFixed(2)}</span> · Stock: <span class="font-black ${colorStock}">${textoStock}</span>`}</p>
                </div>
                ${p.sinStock ? '<p class="text-[11px] text-purple-700 font-bold mt-auto">Sin control de existencias físicas.</p>' : `
                <div class="flex items-center gap-1 mt-auto pt-2 border-t border-gray-100">
                    ${p.esCaja && p.unidadesPorCaja && p.unidadesPorCaja > 1 ? `
                        <select data-repo-tipo="${p.sku}" class="h-8 border-2 border-brand-black rounded px-1 py-0.5 font-bold text-[10px] shrink-0 bg-white">
                            <option value="unidad">Unidad</option>
                            <option value="caja">Caja (${p.unidadesPorCaja} un.)</option>
                        </select>
                    ` : ''}
                    <input type="number" step="${unitLabel === 'kg' || unitLabel === 'ml' ? '0.1' : '1'}" min="${unitLabel === 'kg' || unitLabel === 'ml' ? '0.01' : '1'}" max="9999" maxlength="5" placeholder="Cant." data-repo-cant="${p.sku}" class="w-14 h-8 border-2 border-brand-black rounded px-1.5 py-0.5 font-bold text-xs shrink-0" />
                    <button data-repo-in="${p.sku}" title="Sumar stock por reposición de compra" class="h-8 bg-green-200 hover:bg-green-300 border border-brand-black rounded px-1.5 text-[10px] font-black font-heading flex-1 truncate shrink-0">+ ENTRADA</button>
                    <button data-repo-red="${p.sku}" title="Reducir stock por ajuste de inventario regular" class="h-8 bg-amber-200 hover:bg-amber-300 border border-brand-black rounded px-1.5 text-[10px] font-black font-heading flex-1 truncate shrink-0">- REDUCIR</button>
                    <button data-repo-out="${p.sku}" title="Registrar como merma o daño físico" class="h-8 bg-red-200 hover:bg-red-300 border border-brand-black rounded px-1.5 text-[10px] font-black font-heading flex-1 truncate shrink-0">- MERMA</button>
                </div>`}
            </div>`;
        }).join('');

        // Controles de paginación
        document.getElementById('paginacion-repo')?.remove();
        if (totalPag > 1) {
            const pagDiv = document.createElement('div');
            pagDiv.id = 'paginacion-repo';
            pagDiv.className = 'col-span-full flex items-center justify-between mt-3 gap-3 flex-wrap';
            pagDiv.innerHTML = `
                <span class="text-xs font-bold text-gray-500">Pagina ${this.paginaRepo} de ${totalPag} · ${filtrados.length} productos</span>
                <div class="flex gap-2">
                    <button id="repo-pag-ant" class="border-2 border-brand-black px-3 py-1 rounded text-xs font-heading font-black shadow-brutal-sm ${this.paginaRepo === 1 ? 'opacity-30 pointer-events-none' : 'hover:bg-gray-100'}">ANTERIOR</button>
                    <button id="repo-pag-sig" class="border-2 border-brand-black px-3 py-1 rounded text-xs font-heading font-black shadow-brutal-sm ${this.paginaRepo === totalPag ? 'opacity-30 pointer-events-none' : 'hover:bg-gray-100'}">SIGUIENTE</button>
                </div>`;
            box.insertAdjacentElement('afterend', pagDiv);
            document.getElementById('repo-pag-ant')?.addEventListener('click', () => {
                if (this.paginaRepo > 1) { this.paginaRepo--; this.renderRepoLista(); }
            });
            document.getElementById('repo-pag-sig')?.addEventListener('click', () => {
                if (this.paginaRepo < totalPag) { this.paginaRepo++; this.renderRepoLista(); }
            });
        }

        // Sanitización de inputs de cantidad en reposición
        box.querySelectorAll<HTMLInputElement>('input[data-repo-cant]').forEach((inp) => {
            sanitizarInputDecimal(inp, 9999, 5);
        });

        box.querySelectorAll('[data-repo-edit]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const sku = (btn as HTMLElement).dataset.repoEdit;
                const prod = this.productos.find((x) => x.sku === sku);
                if (!sku || !prod) return;
                const privacidad = this.modelo.getConfig()?.privacidadInventario;
                if (privacidad && !this.duenoAutenticado) {
                    mostrarToast('Acción no permitida en modo operador. Solicite al Dueño(a).', 'error');
                    return;
                }
                if (!this.duenoAutenticado && this.modelo.hasPinSet()) {
                    const pin = await pedirValor('Acción protegida. Ingrese el PIN de Administrador(a) / Dueño(a):', '', 'AUTENTICACIÓN DUEÑO(A)');
                    if (!pin || !await this.modelo.verificarPin(pin)) {
                        mostrarToast('PIN incorrecto o no suministrado. Acción cancelada.', 'error');
                        return;
                    }
                }
                this.abrirModalEditarProducto(prod);
            });
        });

        box.querySelectorAll('[data-repo-del]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const sku = (btn as HTMLElement).dataset.repoDel;
                const prod = this.productos.find((x) => x.sku === sku);
                if (!sku || !prod) return;
                const privacidad = this.modelo.getConfig()?.privacidadInventario;
                if (privacidad && !this.duenoAutenticado) {
                    mostrarToast('Acción no permitida en modo operador. Solicite al Dueño(a).', 'error');
                    return;
                }
                if (!this.duenoAutenticado && this.modelo.hasPinSet()) {
                    const pin = await pedirValor('Acción protegida. Ingrese el PIN de Administrador(a) / Dueño(a):', '', 'AUTENTICACIÓN DUEÑO(A)');
                    if (!pin || !await this.modelo.verificarPin(pin)) {
                        mostrarToast('PIN incorrecto o no suministrado. Acción cancelada.', 'error');
                        return;
                    }
                }
                const confirmar = await confirmarAccion(`¿Seguro que deseas eliminar permanentemente el producto "${prod.nombre}" del catálogo?`, 'ELIMINAR PRODUCTO');
                if (confirmar) {
                    void api.eliminarProducto(sku).then(() => {
                        void api.productos().then((prods) => {
                            this.productos = prods;
                            window.dispatchEvent(new CustomEvent('inventario_actualizado'));
                            this.renderRepoLista();
                            this.renderCatalogoLista();
                            const contEl = document.getElementById('repo-contador-estado');
                            if (contEl) contEl.textContent = `${this.productos.length} artículos en depósito`;
                        });
                    });
                }
            });
        });

        box.querySelectorAll('[data-repo-in]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const sku = (btn as HTMLElement).dataset.repoIn;
                const inp = box.querySelector<HTMLInputElement>(`input[data-repo-cant="${sku}"]`);
                const cant = inp?.value;
                if (sku && cant && Number(cant) > 0 && Number(cant) <= 9999) {
                    const privacidad = this.modelo.getConfig()?.privacidadInventario;
                    if (privacidad && !this.duenoAutenticado) {
                        mostrarToast('Acción no permitida en modo operador. Solicite al Dueño(a).', 'error');
                        return;
                    }
                    if (!this.duenoAutenticado && this.modelo.hasPinSet()) {
                        const pin = await pedirValor('Acción de inventario protegida. Ingrese el PIN de Administrador(a) / Dueño(a):', '', 'AUTENTICACIÓN DUEÑO(A)');
                        if (!pin || !await this.modelo.verificarPin(pin)) {
                            mostrarToast('PIN incorrecto o no suministrado. Operación cancelada.', 'error');
                            return;
                        }
                    }
                    const tipoSelect = box.querySelector<HTMLSelectElement>(`select[data-repo-tipo="${sku}"]`);
                    const tipo = tipoSelect?.value || 'unidad';
                    const prod = this.productos.find((p) => p.sku === sku);
                    let cantFinal = Number(cant);
                    if (tipo === 'caja' && prod?.esCaja && prod?.unidadesPorCaja && prod.unidadesPorCaja > 1) {
                        cantFinal = cantFinal * prod.unidadesPorCaja;
                    }
                    void api.compraStock(sku, String(cantFinal)).then(() => {
                        void api.productos().then((prods) => {
                            this.productos = prods;
                            window.dispatchEvent(new CustomEvent('inventario_actualizado'));
                            this.renderRepoLista();
                            this.renderCatalogoLista();
                        });
                    });
                }
            });
        });

        box.querySelectorAll('[data-repo-red]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const sku = (btn as HTMLElement).dataset.repoRed;
                const inp = box.querySelector<HTMLInputElement>(`input[data-repo-cant="${sku}"]`);
                const cant = inp?.value;
                if (sku && cant && Number(cant) > 0 && Number(cant) <= 9999) {
                    const privacidad = this.modelo.getConfig()?.privacidadInventario;
                    if (privacidad && !this.duenoAutenticado) {
                        mostrarToast('Acción no permitida en modo operador. Solicite al Dueño(a).', 'error');
                        return;
                    }
                    if (!this.duenoAutenticado && this.modelo.hasPinSet()) {
                        const pin = await pedirValor('Acción de inventario protegida. Ingrese el PIN de Administrador(a) / Dueño(a):', '', 'AUTENTICACIÓN DUEÑO(A)');
                        if (!pin || !await this.modelo.verificarPin(pin)) {
                            mostrarToast('PIN incorrecto o no suministrado. Operación cancelada.', 'error');
                            return;
                        }
                    }
                    const tipoSelect = box.querySelector<HTMLSelectElement>(`select[data-repo-tipo="${sku}"]`);
                    const tipo = tipoSelect?.value || 'unidad';
                    const prod = this.productos.find((p) => p.sku === sku);
                    let cantFinal = Number(cant);
                    if (tipo === 'caja' && prod?.esCaja && prod?.unidadesPorCaja && prod.unidadesPorCaja > 1) {
                        cantFinal = cantFinal * prod.unidadesPorCaja;
                    }
                    void api.reducirStock(sku, String(cantFinal)).then(() => {
                        void api.productos().then((prods) => {
                            this.productos = prods;
                            window.dispatchEvent(new CustomEvent('inventario_actualizado'));
                            this.renderRepoLista();
                            this.renderCatalogoLista();
                        });
                    });
                }
            });
        });

        box.querySelectorAll('[data-repo-out]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const sku = (btn as HTMLElement).dataset.repoOut;
                const inp = box.querySelector<HTMLInputElement>(`input[data-repo-cant="${sku}"]`);
                const cant = inp?.value;
                if (sku && cant && Number(cant) > 0 && Number(cant) <= 9999) {
                    const privacidad = this.modelo.getConfig()?.privacidadInventario;
                    if (privacidad && !this.duenoAutenticado) {
                        mostrarToast('Acción no permitida en modo operador. Solicite al Dueño(a).', 'error');
                        return;
                    }
                    if (!this.duenoAutenticado && this.modelo.hasPinSet()) {
                        const pin = await pedirValor('Acción de inventario protegida. Ingrese el PIN de Administrador(a) / Dueño(a):', '', 'AUTENTICACIÓN DUEÑO(A)');
                        if (!pin || !await this.modelo.verificarPin(pin)) {
                            mostrarToast('PIN incorrecto o no suministrado. Operación cancelada.', 'error');
                            return;
                        }
                    }
                    const tipoSelect = box.querySelector<HTMLSelectElement>(`select[data-repo-tipo="${sku}"]`);
                    const tipo = tipoSelect?.value || 'unidad';
                    const prod = this.productos.find((p) => p.sku === sku);
                    let cantFinal = Number(cant);
                    if (tipo === 'caja' && prod?.esCaja && prod?.unidadesPorCaja && prod.unidadesPorCaja > 1) {
                        cantFinal = cantFinal * prod.unidadesPorCaja;
                    }
                    void api.merma(sku, String(cantFinal), null).then(() => {
                        void api.productos().then((prods) => {
                            this.productos = prods;
                            window.dispatchEvent(new CustomEvent('inventario_actualizado'));
                            this.renderRepoLista();
                            this.renderCatalogoLista();
                        });
                    });
                }
            });
        });
    }

    private async guardarProducto(): Promise<void> {
        const inNombre = document.getElementById('prod-nombre') as HTMLInputElement | null;
        const inCat = document.getElementById('prod-categoria') as HTMLSelectElement | null;
        const inImp = document.getElementById('prod-impuesto') as HTMLSelectElement | null;
        const inBruto = document.getElementById('prod-precio-bruto') as HTMLInputElement | null;
        const inMargen = document.getElementById('prod-margen') as HTMLInputElement | null;
        const inNeto = document.getElementById('prod-precio-neto') as HTMLInputElement | null;
        const inStock = document.getElementById('prod-stock') as HTMLInputElement | null;
        const inUnidad = (document.getElementById('prod-unidad') as HTMLSelectElement | null)?.value as 'un' | 'kg' | 'ml' || 'un';
        const chkSinStock = document.getElementById('prod-sin-stock') as HTMLInputElement | null;
        const msgEl = document.getElementById('alta-prod-msg');

        const parseVal = (str?: string): number => {
            if (!str) return 0;
            const clean = str.trim().replace(',', '.');
            const n = parseFloat(clean);
            return Number.isFinite(n) && !isNaN(n) ? n : 0;
        };

        if (msgEl) {
            msgEl.classList.add('hidden');
            msgEl.textContent = '';
        }

        if (!inNombre?.value.trim()) {
            if (msgEl) {
                msgEl.textContent = 'El nombre del producto o servicio es obligatorio.';
                msgEl.style.color = '#C60C15';
                msgEl.classList.remove('hidden');
                inNombre?.focus();
            }
            return;
        }

        const precioNetoNum = parseVal(inNeto?.value);
        if (precioNetoNum <= 0 || precioNetoNum > 99999.99) {
            if (msgEl) {
                msgEl.textContent = 'El precio neto final debe ser un monto positivo entre $0.01 y $99,999.99 USD.';
                msgEl.style.color = '#C60C15';
                msgEl.classList.remove('hidden');
                inNeto?.focus();
            }
            return;
        }

        const stockNum = parseVal(inStock?.value);
        const esSinStock = chkSinStock?.checked || false;

        if (!esSinStock && (stockNum < 0 || stockNum > 99999)) {
            if (msgEl) {
                msgEl.textContent = 'El stock inicial debe estar comprendido entre 0 y 99,999 unidades.';
                msgEl.style.color = '#C60C15';
                msgEl.classList.remove('hidden');
                inStock?.focus();
            }
            return;
        }

        // Validación guiada para unidades enteras
        if (!esSinStock && inUnidad === 'un') {
            const tieneFraccion = !Number.isInteger(stockNum) || (stockNum % 1 !== 0);
            if (tieneFraccion) {
                if (msgEl) {
                    msgEl.textContent = 'Los productos vendidos por Unidad (un.) deben tener un stock entero exacto (ej: 10). Para registrar fracciones o decimales, seleccione Tipo de Medida "Por Peso (kg)" o "Por Volumen (ml)".';
                    msgEl.style.color = '#C60C15';
                    msgEl.classList.remove('hidden');
                    inStock?.focus();
                }
                return;
            }
        }

        const impPct = parseVal(inImp?.value || '0');
        const margenPct = parseVal(inMargen?.value || '30');
        let brutoNum = parseVal(inBruto?.value);
        if (brutoNum <= 0) {
            // Deducción automática de costo bruto para que el comerciante no quede bloqueado
            const baseSinImp = precioNetoNum / (1 + impPct / 100);
            brutoNum = baseSinImp / (1 + margenPct / 100);
        }

        const chkEsCaja = document.getElementById('prod-es-caja') as HTMLInputElement | null;
        const inUnidadesCaja = document.getElementById('prod-unidades-caja') as HTMLInputElement | null;
        const esCaja = chkEsCaja?.checked || false;
        const unidadesPorCaja = esCaja && inUnidadesCaja ? Math.max(2, parseInt(inUnidadesCaja.value, 10) || 12) : undefined;

        const chkTienePaquete = document.getElementById('prod-tiene-paquete') as HTMLInputElement | null;
        const inNombrePaquete = document.getElementById('prod-nombre-paquete') as HTMLInputElement | null;
        const inPrecioPaquete = document.getElementById('prod-precio-paquete') as HTMLInputElement | null;
        const tienePaquete = chkTienePaquete?.checked || false;
        const nombrePaquete = tienePaquete && inNombrePaquete ? inNombrePaquete.value.trim() : undefined;
        const precioPaqueteUsd = tienePaquete && inPrecioPaquete ? parseVal(inPrecioPaquete.value).toFixed(2) : undefined;

        // Recopilar presentaciones adicionales dinámicas
        const presentaciones: { nombre: string; precioUsd: string; unidades: number }[] = [];
        document.querySelectorAll('[id^="pres-row-"]').forEach((row) => {
            const idx = (row.id as string).replace('pres-row-', '');
            const inNom = document.getElementById(`pres-nombre-${idx}`) as HTMLInputElement | null;
            const inPre = document.getElementById(`pres-precio-${idx}`) as HTMLInputElement | null;
            const inUni = document.getElementById(`pres-unidades-${idx}`) as HTMLInputElement | null;
            const nom = inNom?.value.trim();
            const pre = parseVal(inPre?.value);
            const uni = parseInt(inUni?.value || '1', 10);
            if (nom && pre > 0 && Number.isFinite(uni) && uni >= 1) {
                presentaciones.push({
                    nombre: nom,
                    precioUsd: pre.toFixed(2),
                    unidades: uni,
                });
            }
        });

        try {
            await api.crearProducto({
                nombre: inNombre.value.trim(),
                precioBrutoUsd: brutoNum.toFixed(2),
                margenPct: String(margenPct),
                precioUsd: precioNetoNum.toFixed(2),
                impuestoPct: String(impPct),
                stockInicial: chkSinStock?.checked ? '0' : String(stockNum),
                categoriaId: inCat?.value || '',
                sinStock: chkSinStock?.checked || false,
                pesable: inUnidad === 'kg' || inUnidad === 'ml',
                perecedero: (document.getElementById('prod-perecedero') as HTMLInputElement | null)?.checked || false,
                unidad: inUnidad,
                alcoholica: false,
                esCaja,
                unidadesPorCaja,
                precioPaqueteUsd,
                nombrePaquete,
                presentaciones: presentaciones.length > 0 ? presentaciones : undefined,
            });

            if (msgEl) {
                msgEl.textContent = 'Producto o servicio registrado exitosamente.';
                msgEl.style.color = '#00823B';
                msgEl.classList.remove('hidden');
            }
            window.dispatchEvent(new CustomEvent('inventario_actualizado'));
            setTimeout(() => void this.render('alta'), 800);
        } catch (e) {
            if (msgEl) {
                msgEl.textContent = e instanceof Error ? e.message : String(e);
                msgEl.style.color = '#C60C15';
                msgEl.classList.remove('hidden');
            }
        }
    }
}
