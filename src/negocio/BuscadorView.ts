import { api, BusquedaHistorial, HistorialItem, DeudaDetalle } from './api';
import { NegocioModel } from './NegocioModel';
import { formatFechaHoraVet } from './dateUtils';

const fmt = (n: string | number | undefined | null): string => {
    const num = Number(n ?? 0);
    return Number.isFinite(num)
        ? num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '0,00';
};

const fecha = (unix: number | undefined): string => (unix && unix > 0 ? formatFechaHoraVet(unix) : '-');

const ETIQUETA_CANAL: Record<string, { texto: string; clase: string }> = {
    venta_directa: { texto: 'VENTA', clase: 'bg-blue-100 text-blue-900' },
    cuenta_abierta: { texto: 'CUENTA', clase: 'bg-amber-100 text-amber-900' },
    cuenta_liquidada: { texto: 'CTA. LIQ.', clase: 'bg-emerald-100 text-emerald-900' },
    deuda_abierta: { texto: 'DEUDA', clase: 'bg-amber-200 text-amber-950' },
    liquidacion_deuda: { texto: 'LIQ. DEUDA', clase: 'bg-emerald-100 text-emerald-900' },
    saldo_a_favor: { texto: 'SALDO FAVOR', clase: 'bg-purple-100 text-purple-900' },
};

/** BUSCADOR: un solo buscador historico (solo consulta) sobre buscar_historial. */
export class BuscadorView {
    private contenedor: HTMLElement;
    private modal: HTMLElement;
    private modelo: NegocioModel;
    private debounce: number | null = null;
    private tipo = '';
    private campoFecha: 'apertura' | 'liquidacion' = 'apertura';
    private preset = '';
    private operador = '';
    private metodo = '';
    private operadores: string[] = [];
    private metodos: string[] = [];
    private secuencia = 0;

    constructor(contenedor: HTMLElement, modal: HTMLElement, modelo: NegocioModel) {
        this.contenedor = contenedor;
        this.modal = modal;
        this.modelo = modelo;
    }

    async render(): Promise<void> {
        this.modelo.getConfig();
        try {
            const ops = (await api.listarOperadores()) || [];
            this.operadores = ops.map((o) => o.nombre);
        } catch { this.operadores = []; }
        try {
            const ms = (await api.listarMetodosPago()) || [];
            this.metodos = ms.map((m) => m.nombre);
        } catch { this.metodos = []; }

        const chip = (valor: string, texto: string): string =>
            `<button data-buscador-situacion="${valor}" class="border-2 border-brand-black rounded px-2.5 py-1 text-xs font-black bg-white hover:bg-gray-100">${texto}</button>`;
        this.contenedor.innerHTML = `
        <div class="flex flex-col gap-3">
            <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-3 sm:p-4">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                        <h2 class="font-heading font-black text-2xl sm:text-3xl">Buscador</h2>
                        <p class="text-xs font-bold text-gray-500">Consulta histórica de ventas, cuentas y deudas (solo lectura)</p>
                    </div>
                    <span id="buscador-resumen" class="text-[11px] font-black text-gray-500"></span>
                </div>
                <input id="buscador-texto" type="text" maxlength="40" autocomplete="off"
                    placeholder="Nombre de la deuda, operador o ID"
                    class="w-full border-2 border-brand-black rounded px-3 py-2 font-body text-base mb-3 focus:ring-2 focus:ring-brand-cyan" />
                <div class="flex flex-wrap items-center gap-2 mb-2">
                    <span class="text-[10px] font-black uppercase text-gray-500">Tipo</span>
                    ${chip('', 'TODOS')}
                    ${chip('directa', 'VENTAS')}
                    ${chip('cuenta', 'CUENTAS')}
                    ${chip('deuda', 'DEUDAS')}
                    ${chip('liquidacion', 'LIQUIDADAS')}
                    ${chip('saldo', 'SALDOS')}
                </div>
                <div class="flex flex-wrap items-center gap-2 mb-2">
                    <span class="text-[10px] font-black uppercase text-gray-500">Fecha</span>
                    <select id="buscador-campo" class="border-2 border-brand-black rounded px-2 py-1 text-xs font-bold bg-white">
                        <option value="apertura">Apertura</option>
                        <option value="liquidacion">Liquidación</option>
                    </select>
                    <button data-buscador-preset="hoy" class="border-2 border-brand-black rounded px-2 py-1 text-[11px] font-black bg-white hover:bg-gray-100">HOY</button>
                    <button data-buscador-preset="3dias" class="border-2 border-brand-black rounded px-2 py-1 text-[11px] font-black bg-white hover:bg-gray-100">3 DÍAS</button>
                    <button data-buscador-preset="semana" class="border-2 border-brand-black rounded px-2 py-1 text-[11px] font-black bg-white hover:bg-gray-100">SEMANA</button>
                    <button data-buscador-preset="mes" class="border-2 border-brand-black rounded px-2 py-1 text-[11px] font-black bg-white hover:bg-gray-100">MES</button>
                    <button data-buscador-preset="rango" class="border-2 border-brand-black rounded px-2 py-1 text-[11px] font-black bg-white hover:bg-gray-100">RANGO</button>
                    <button data-buscador-preset="fecha" class="border-2 border-brand-black rounded px-2 py-1 text-[11px] font-black bg-white hover:bg-gray-100">FECHA</button>
                    <input id="buscador-desde" type="date" class="hidden border-2 border-brand-black rounded px-2 py-1 text-xs font-bold" />
                    <input id="buscador-hasta" type="date" class="hidden border-2 border-brand-black rounded px-2 py-1 text-xs font-bold" />
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-[10px] font-black uppercase text-gray-500">Operador</span>
                    <select id="buscador-operador" class="border-2 border-brand-black rounded px-2 py-1 text-xs font-bold bg-white">
                        <option value="">Todos</option>
                        ${this.operadores.map((o) => `<option value="${o}">${o}</option>`).join('')}
                    </select>
                    <span class="text-[10px] font-black uppercase text-gray-500 ml-2">Método</span>
                    <select id="buscador-metodo" class="border-2 border-brand-black rounded px-2 py-1 text-xs font-bold bg-white">
                        <option value="">Todos</option>
                        ${this.metodos.map((m) => `<option value="${m}">${m}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div id="buscador-resumen-deudor"></div>
            <div id="buscador-resultados" class="flex flex-col gap-3"></div>
        </div>`;
        this.vincular();
        this.marcarSituacion();
        this.marcarPresets();
        this.pintarVacio();
    }

    private vincular(): void {
        const input = this.contenedor.querySelector<HTMLInputElement>('#buscador-texto');
        input?.addEventListener('input', () => this.programar());
        input?.addEventListener('keydown', (e) => {
            if ((e as KeyboardEvent).key === 'Enter') {
                if (this.debounce !== null) window.clearTimeout(this.debounce);
                void this.buscar(1);
            }
        });
        this.contenedor.querySelector<HTMLSelectElement>('#buscador-campo')?.addEventListener('change', (e) => {
            this.campoFecha = (e.target as HTMLSelectElement).value === 'liquidacion' ? 'liquidacion' : 'apertura';
            void this.buscar(1);
        });
        this.contenedor.querySelector<HTMLSelectElement>('#buscador-operador')?.addEventListener('change', (e) => {
            this.operador = (e.target as HTMLSelectElement).value;
            void this.buscar(1);
        });
        this.contenedor.querySelector<HTMLSelectElement>('#buscador-metodo')?.addEventListener('change', (e) => {
            this.metodo = (e.target as HTMLSelectElement).value;
            void this.buscar(1);
        });
        this.contenedor.querySelectorAll<HTMLButtonElement>('[data-buscador-situacion]').forEach((b) =>
            b.addEventListener('click', () => {
                this.tipo = b.dataset.buscadorSituacion || '';
                this.marcarSituacion();
                void this.buscar(1);
            }),
        );
        this.contenedor.querySelectorAll<HTMLButtonElement>('[data-buscador-preset]').forEach((b) =>
            b.addEventListener('click', () => {
                const elegido = b.dataset.buscadorPreset || '';
                this.preset = this.preset === elegido ? '' : elegido;
                const desde = this.contenedor.querySelector<HTMLInputElement>('#buscador-desde');
                const hasta = this.contenedor.querySelector<HTMLInputElement>('#buscador-hasta');
                if (desde) desde.classList.toggle('hidden', !(this.preset === 'rango' || this.preset === 'fecha'));
                if (hasta) hasta.classList.toggle('hidden', this.preset !== 'rango');
                this.marcarPresets();
                void this.buscar(1);
            }),
        );
        this.contenedor.querySelector<HTMLInputElement>('#buscador-desde')?.addEventListener('change', () => void this.buscar(1));
        this.contenedor.querySelector<HTMLInputElement>('#buscador-hasta')?.addEventListener('change', () => void this.buscar(1));
    }

    private marcarSituacion(): void {
        this.contenedor.querySelectorAll<HTMLButtonElement>('[data-buscador-situacion]').forEach((b) => {
            const activo = (b.dataset.buscadorSituacion || '') === this.tipo;
            b.className = `border-2 border-brand-black rounded px-2.5 py-1 text-xs font-black ${activo ? 'bg-brand-black text-white' : 'bg-white hover:bg-gray-100'}`;
        });
    }

    private marcarPresets(): void {
        this.contenedor.querySelectorAll<HTMLButtonElement>('[data-buscador-preset]').forEach((b) => {
            const activo = (b.dataset.buscadorPreset || '') === this.preset;
            b.className = `border-2 border-brand-black rounded px-2 py-1 text-[11px] font-black ${activo ? 'bg-brand-black text-white' : 'bg-white hover:bg-gray-100'}`;
        });
    }

    private programar(): void {
        if (this.debounce !== null) window.clearTimeout(this.debounce);
        this.debounce = window.setTimeout(() => void this.buscar(1), 300);
    }

    private unixDe(input: HTMLInputElement | null): number | undefined {
        if (!input || !input.value) return undefined;
        const t = Date.parse(`${input.value}T00:00:00-04:00`);
        return Number.isFinite(t) ? Math.floor(t / 1000) : undefined;
    }

    private async buscar(pagina: number): Promise<void> {
        const token = ++this.secuencia;
        const texto = this.contenedor.querySelector<HTMLInputElement>('#buscador-texto')?.value.trim() || '';
        const hayFiltro = texto.length >= 2 || this.tipo !== '' || this.preset !== '' || this.operador !== '' || this.metodo !== '';
        if (!hayFiltro) {
            this.pintarVacio();
            return;
        }
        const desdeUnix = this.unixDe(this.contenedor.querySelector<HTMLInputElement>('#buscador-desde'));
        const hastaUnix = this.unixDe(this.contenedor.querySelector<HTMLInputElement>('#buscador-hasta'));
        if (this.preset === 'rango' && desdeUnix && hastaUnix && desdeUnix > hastaUnix) {
            this.pintarError('Rango inválido: la fecha "desde" es mayor que "hasta".');
            return;
        }
        const resumenEl = this.contenedor.querySelector('#buscador-resumen');
        if (resumenEl) resumenEl.textContent = 'Buscando...';
        try {
            const r = await api.buscarHistorial({
                texto: texto || undefined,
                tipo: this.tipo || undefined,
                campoFecha: this.campoFecha,
                preset: this.preset || undefined,
                desdeUnix,
                hastaUnix,
                operador: this.operador || undefined,
                metodo: this.metodo || undefined,
                pagina,
            });
            if (token !== this.secuencia) return;
            this.pintar(r);
        } catch (e) {
            if (token !== this.secuencia) return;
            this.pintarError(e instanceof Error ? e.message : String(e));
        }
    }

    private pintarVacio(): void {
        const c = this.contenedor.querySelector('#buscador-resultados');
        if (c) {
            c.innerHTML = `<div class="bg-white border-2 border-dashed border-gray-400 rounded-lg p-6 text-center text-sm font-bold text-gray-400">
                Escriba el nombre de la deuda o elija un filtro para buscar en todo el historial.
            </div>`;
        }
        const r = this.contenedor.querySelector('#buscador-resumen');
        if (r) r.textContent = '';
        const rd = this.contenedor.querySelector('#buscador-resumen-deudor');
        if (rd) rd.innerHTML = '';
    }

    private pintarError(mensaje: string): void {
        const c = this.contenedor.querySelector('#buscador-resultados');
        if (c) {
            c.innerHTML = `<div class="bg-red-50 border-2 border-red-500 rounded-lg p-4 text-sm font-bold text-red-800">${mensaje}</div>`;
        }
    }

    private pintar(r: BusquedaHistorial): void {
        const totalPag = Math.max(1, Math.ceil(r.total / r.porPagina));
        const resumen = this.contenedor.querySelector('#buscador-resumen');
        if (resumen) resumen.textContent = `Página ${r.pagina} de ${totalPag} · ${r.total} registros`;
        const rd = this.contenedor.querySelector('#buscador-resumen-deudor');
        if (rd) {
            if (r.resumenDeudor) {
                const s = r.resumenDeudor;
                rd.innerHTML = `<div class="bg-amber-50 border-2 border-brand-black border-l-[6px] border-l-amber-600 rounded p-3 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2">
                    <span class="font-black uppercase">Deudor: ${s.totalDeudas} deudas · ${s.abiertas} abiertas</span>
                    <span>Saldo pendiente: <strong>$${fmt(s.saldoUsd)}</strong> · Histórico: <strong>$${fmt(s.historicoUsd)}</strong></span>
                </div>`;
            } else {
                rd.innerHTML = '';
            }
        }
        const c = this.contenedor.querySelector('#buscador-resultados');
        if (!c) return;
        if (!r.items || r.items.length === 0) {
            const aviso = r.limiteAlcanzado
                ? '<p class="mt-2 text-[11px] font-bold text-amber-700">Acota por fecha para ver más resultados.</p>'
                : '';
            c.innerHTML = `<div class="bg-white border-2 border-dashed border-gray-400 rounded-lg p-6 text-center text-sm font-bold text-gray-400">Sin resultados para esa búsqueda.${aviso}</div>`;
        } else {
            c.innerHTML = this.tabla(r.items);
        }
        const paginacion = `<div class="flex items-center justify-between bg-white border-2 border-brand-black rounded px-3 py-2">
            <span class="text-[11px] font-bold text-gray-600">Página ${r.pagina} de ${totalPag} · ${r.total} registros${r.limiteAlcanzado ? ' · acota por fecha para ver más' : ''}</span>
            <div class="flex gap-1">
                <button data-buscar-pag="${r.pagina - 1}" class="border-2 border-brand-black px-2 py-0.5 rounded text-[10px] font-heading font-black ${r.pagina <= 1 ? 'opacity-30 pointer-events-none' : 'hover:bg-gray-100'}">ANT.</button>
                <button data-buscar-pag="${r.pagina + 1}" class="border-2 border-brand-black px-2 py-0.5 rounded text-[10px] font-heading font-black ${r.pagina >= totalPag || r.limiteAlcanzado ? 'opacity-30 pointer-events-none' : 'hover:bg-gray-100'}">SIG.</button>
            </div>
        </div>`;
        c.innerHTML += paginacion;
        c.querySelectorAll<HTMLButtonElement>('[data-buscar-pag]').forEach((b) =>
            b.addEventListener('click', () => {
                const destino = Number(b.dataset.buscarPag || '1');
                if (destino >= 1 && destino <= totalPag) void this.buscar(destino);
            }),
        );
        c.querySelectorAll<HTMLButtonElement>('[data-buscador-ver]').forEach((b) =>
            b.addEventListener('click', () => {
                const id = b.dataset.buscadorVer || '';
                const item = r.items.find((x) => x.id === id);
                if (item) void this.abrirDetalle(item);
            }),
        );
    }

    private tabla(items: HistorialItem[]): string {
        const filas = items
            .map((x) => {
                const et = ETIQUETA_CANAL[x.canal] || { texto: x.canal.toUpperCase(), clase: 'bg-gray-100 text-gray-700' };
                return `
            <tr class="border-b border-gray-100 last:border-none">
                <td class="py-1.5 px-2 text-[11px] text-gray-600">${fecha(x.abierta ? x.aperturaUnix : x.cierreUnix || x.aperturaUnix)}</td>
                <td class="py-1.5 px-2"><span class="${et.clase} border border-brand-black rounded px-1.5 py-0.5 font-black text-[9px]">${et.texto}</span></td>
                <td class="py-1.5 px-2 text-[11px] font-bold text-brand-black">${x.etiqueta || x.operador || '-'}</td>
                <td class="py-1.5 px-2 text-right font-black text-[11px] text-brand-black">$ ${fmt(x.totalUsd)}</td>
                <td class="py-1.5 px-2 text-right font-black text-[11px] text-brand-purple">Bs. ${fmt(x.totalBs)}</td>
                <td class="py-1.5 px-2 text-center">
                    <button data-buscador-ver="${x.id}" class="bg-brand-black text-white border border-brand-black rounded px-2 py-0.5 text-[9px] font-heading font-black">VER</button>
                </td>
            </tr>`;
            })
            .join('');
        return `
        <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal-sm overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead><tr class="border-b border-gray-200 text-[9px] uppercase font-black text-gray-400">
                        <th class="py-1 px-2">Fecha</th><th class="py-1 px-2">Tipo</th><th class="py-1 px-2">Nombre / Operador</th>
                        <th class="py-1 px-2 text-right">Total $</th><th class="py-1 px-2 text-right">Total Bs.</th><th class="py-1 px-2 text-center">Detalle</th>
                    </tr></thead>
                    <tbody>${filas}</tbody>
                </table>
            </div>
        </div>`;
    }

    private async abrirDetalle(item: HistorialItem): Promise<void> {
        let det: DeudaDetalle | null = null;
        const esDeuda = item.canal === 'deuda_abierta' || item.canal === 'liquidacion_deuda';
        try { det = await api.detalleDeuda(item.id); } catch { det = null; }
        const cerrar = () => { this.modal.innerHTML = ''; };
        const et = ETIQUETA_CANAL[item.canal] || { texto: item.canal.toUpperCase(), clase: 'bg-gray-100 text-gray-700' };
        const consumos = det && det.lineas.length > 0
            ? `<div class="border border-brand-black rounded p-2.5 bg-white mb-3">
                <span class="text-[10px] uppercase font-black text-gray-500 block mb-1">Consumos (${det.lineas.length})</span>
                <table class="w-full text-xs"><tbody>
                ${det.lineas.map((l) => `<tr class="border-b border-gray-100 last:border-none">
                    <td class="py-1 text-left font-bold">${l.nombre}</td>
                    <td class="py-1 text-center">${l.cantidad}</td>
                    <td class="py-1 text-right font-mono">$ ${fmt(l.precioUsd)}</td>
                    <td class="py-1 text-right font-black">$ ${fmt(l.subtotalUsd)}</td>
                </tr>`).join('')}
                </tbody></table></div>`
            : '';
        const metodos = (item.metodos || []).length > 0
            ? `<p class="text-xs font-bold text-gray-700 mb-3">Métodos: ${item.metodos.join(' · ')}</p>`
            : '';
        this.modal.innerHTML = `
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[120] p-4">
            <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-start border-b-2 border-brand-black pb-2 mb-3">
                    <div>
                        <span class="${et.clase} border border-brand-black rounded px-1.5 py-0.5 font-black text-[9px]">${et.texto}</span>
                        <h3 class="font-heading font-black text-xl mt-1">${(det && det.nombre) || item.etiqueta || 'Detalle'}</h3>
                        <p class="text-[11px] font-mono text-gray-500">${item.id}</p>
                    </div>
                    <button id="buscador-cerrar" class="w-8 h-8 rounded border-2 border-brand-black font-black hover:bg-gray-100">&times;</button>
                </div>
                <div class="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div class="bg-gray-50 border border-brand-black rounded p-2">
                        <span class="block text-[10px] uppercase text-gray-500 font-bold">Fecha</span>
                        <span class="font-bold">${fecha(item.aperturaUnix)}</span>
                    </div>
                    <div class="bg-gray-50 border border-brand-black rounded p-2">
                        <span class="block text-[10px] uppercase text-gray-500 font-bold">Liquidación</span>
                        <span class="font-bold">${fecha(item.cierreUnix)}</span>
                    </div>
                    <div class="bg-gray-50 border border-brand-black rounded p-2">
                        <span class="block text-[10px] uppercase text-gray-500 font-bold">Operador</span>
                        <span class="font-black">${item.operador || 'Sin operador'}</span>
                    </div>
                    <div class="bg-gray-50 border border-brand-black rounded p-2">
                        <span class="block text-[10px] uppercase text-gray-500 font-bold">Total</span>
                        <span class="font-black">$ ${fmt(item.totalUsd)} · Bs. ${fmt(item.totalBs)}</span>
                    </div>
                    ${det && (esDeuda || item.canal === 'cuenta_abierta') ? `<div class="bg-gray-50 border border-brand-black rounded p-2 col-span-2">
                        <span class="block text-[10px] uppercase text-gray-500 font-bold">Abonado / Saldo</span>
                        <span class="font-black">$ ${fmt(det.abonosUsd)} abonado · $ ${fmt(det.saldoUsd)} pendiente</span>
                    </div>` : ''}
                </div>
                ${consumos}
                ${metodos}
                <button id="buscador-cerrar-2" class="w-full bg-brand-black text-white font-heading font-black py-3 rounded border-2 border-brand-black">CERRAR</button>
            </div>
        </div>`;
        document.getElementById('buscador-cerrar')?.addEventListener('click', cerrar);
        document.getElementById('buscador-cerrar-2')?.addEventListener('click', cerrar);
    }
}
