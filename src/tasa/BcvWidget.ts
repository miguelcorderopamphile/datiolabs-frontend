import { api, invocar, RegistroHistoricoTasa } from '../negocio/api';
import { confirmarAccion, mostrarToast } from '../negocio/dialogs';

type Direccion = 'subio' | 'bajo' | 'estable';

interface TasaInfo {
    valor: string;
    fechaUnix: number;
    fluctuacionPct: string | null;
    direccion: Direccion | null;
    fuente?: string;
}

const COLOR_SUBIO = '#00823B';
const COLOR_BAJO = '#C60C15';
const COLOR_ESTABLE = '#6B7280';
const INTERVALO_POLL_MS = 300_000;
export const STORAGE_KEY_MODO_TASA = 'datiolabs_modo_tasa_manual';

export class BcvWidget {
    private contenedor: HTMLElement | null;
    private timer: number | null = null;
    private modoManual: boolean = false;

    constructor() {
        this.contenedor = document.getElementById('bcv-indicator');
        this.modoManual = localStorage.getItem(STORAGE_KEY_MODO_TASA) === 'true';
    }

    public iniciar(): void {
        if (!this.contenedor) return;
        this.renderizarEsqueleto();
        // La primera lectura manda: pintar() arranca o detiene el sondeo segun
        // la fuente real del backend (MANUAL/BCV), no segun localStorage.
        void this.actualizar();
    }

    public detener(): void {
        this.detenerTimer();
    }

    private iniciarTimer(): void {
        this.detenerTimer();
        this.timer = window.setInterval(() => {
            if (!this.modoManual) {
                void this.actualizar();
            }
        }, INTERVALO_POLL_MS);
    }

    private detenerTimer(): void {
        if (this.timer !== null) {
            window.clearInterval(this.timer);
            this.timer = null;
        }
    }

    private setModoManual(activo: boolean): void {
        this.modoManual = activo;
        localStorage.setItem(STORAGE_KEY_MODO_TASA, String(activo));
        if (activo) {
            this.detenerTimer();
            this.actualizarEtiquetasModo();
            return;
        }
        // Volver a BCV es una accion explicita contra el backend: la tasa
        // manual es pegajosa y solo se reemplaza con esta confirmacion.
        void (async () => {
            try {
                const tasa = await api.volverABcv();
                if (tasa) this.pintar(tasa);
            } catch {
                mostrarToast('No se pudo consultar el BCV; se conserva la tasa vigente.', 'error');
            }
            this.iniciarTimer();
            this.actualizarEtiquetasModo();
        })();
    }

    private renderizarEsqueleto(): void {
        if (!this.contenedor) return;
        this.contenedor.innerHTML = `
            <div class="flex items-center gap-1.5 sm:gap-2 bg-white border-2 border-brand-black rounded px-2 sm:px-3 py-1 sm:py-2 shadow-brutal-sm">
                <span id="bcv-modo-tag" class="font-heading font-black text-[10px] sm:text-xs uppercase tracking-wider ${this.modoManual ? 'text-amber-700 bg-amber-100 px-1 rounded border border-brand-black' : 'text-gray-600'}">
                    ${this.modoManual ? 'MANUAL' : 'BCV'}
                </span>
                <span id="bcv-valor" title="Clic para ver histórico y configurar tasa" class="font-heading font-black text-sm sm:text-lg cursor-pointer hover:underline">--</span>
                <span id="bcv-fluctuacion" class="font-body font-bold text-[10px] sm:text-xs"></span>
                <button id="bcv-refresh" title="${this.modoManual ? 'Sincronización automática desactivada (Modo Manual)' : 'Actualizar tasa'}"
                    class="ml-0.5 sm:ml-1 w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded border-2 border-brand-black ${this.modoManual ? 'bg-gray-200 opacity-60 cursor-not-allowed' : 'bg-brand-yellow hover:-translate-y-0.5 transition-transform active:translate-y-0'}">
                    <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                </button>
            </div>`;
        document.getElementById('bcv-refresh')?.addEventListener('click', () => {
            if (this.modoManual) {
                mostrarToast('La tasa se encuentra en Modo Manual. Para actualizar automáticamente reactive la sincronización en el modal.', 'info');
                return;
            }
            void this.forzar();
        });
        document.getElementById('bcv-valor')?.addEventListener('click', () => void this.abrirModalHistoricoYAjuste());
    }

    private actualizarEtiquetasModo(): void {
        const tag = document.getElementById('bcv-modo-tag');
        const btn = document.getElementById('bcv-refresh');
        if (tag) {
            tag.textContent = this.modoManual ? 'MANUAL' : 'BCV';
            tag.className = `font-heading font-black text-[10px] sm:text-xs uppercase tracking-wider ${this.modoManual ? 'text-amber-700 bg-amber-100 px-1 rounded border border-brand-black' : 'text-gray-600'}`;
        }
        if (btn) {
            btn.title = this.modoManual ? 'Sincronización automática desactivada (Modo Manual)' : 'Actualizar tasa';
            btn.className = `ml-0.5 sm:ml-1 w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded border-2 border-brand-black ${this.modoManual ? 'bg-gray-200 opacity-60 cursor-not-allowed' : 'bg-brand-yellow hover:-translate-y-0.5 transition-transform active:translate-y-0'}`;
        }
    }

    private async abrirModalHistoricoYAjuste(): Promise<void> {
        const modalRoot = document.getElementById('modal-root');
        if (!modalRoot) return;

        let historico: RegistroHistoricoTasa[] = [];
        try {
            historico = await api.historicoTasas();
        } catch (e) {
            mostrarToast(
                'No se pudo cargar el historico de tasas: ' +
                    (e instanceof Error ? e.message : String(e)),
                'error',
            );
        }
        const actual = document.getElementById('bcv-valor')?.textContent || '--';

        modalRoot.innerHTML = `
        <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-[110] p-4">
            <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-6 w-full max-w-lg">
                <div class="flex justify-between items-center border-b-2 border-brand-black pb-3 mb-4">
                    <div>
                        <h3 class="font-heading font-black text-2xl">TASA DE CAMBIO APLICADA</h3>
                        <p class="font-body text-xs text-gray-600">Historial cronológico, modo manual y referencia del BCV</p>
                    </div>
                    <button id="tasa-modal-cerrar" class="w-8 h-8 rounded border-2 border-brand-black flex items-center justify-center font-black text-lg hover:bg-gray-100">&times;</button>
                </div>

                <!-- Selector de Modo de Sincronización -->
                <div class="bg-gray-50 border-2 border-brand-black rounded-lg p-3 sm:p-4 mb-4">
                    <div class="flex justify-between items-center mb-2">
                        <h4 class="font-heading font-black text-xs uppercase">MODO DE TASA CAMBIARIA</h4>
                        <span class="text-[10px] px-2 py-0.5 rounded border border-brand-black font-black uppercase ${this.modoManual ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}">
                            ${this.modoManual ? 'MODO MANUAL ACTIVO' : 'SINCRONIZACIÓN BCV ACTIVA'}
                        </span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold">
                        <label class="flex items-center gap-2 p-2 rounded border-2 border-brand-black bg-white cursor-pointer hover:bg-gray-100 ${!this.modoManual ? 'ring-2 ring-brand-black' : ''}">
                            <input type="radio" name="modo-tasa-cambio" value="auto" ${!this.modoManual ? 'checked' : ''} class="w-4 h-4 text-brand-black" />
                            <div>
                                <span class="block font-black">AUTOMÁTICO (BCV)</span>
                                <span class="text-[10px] text-gray-500 font-normal">La tasa aplicada se sincroniza con el BCV</span>
                            </div>
                        </label>
                        <label class="flex items-center gap-2 p-2 rounded border-2 border-brand-black bg-white cursor-pointer hover:bg-gray-100 ${this.modoManual ? 'ring-2 ring-brand-black' : ''}">
                            <input type="radio" name="modo-tasa-cambio" value="manual" ${this.modoManual ? 'checked' : ''} class="w-4 h-4 text-brand-black" />
                            <div>
                                <span class="block font-black">MANUAL (FIJA)</span>
                                <span class="text-[10px] text-gray-500 font-normal">Desactiva el sondeo web. Tasa ingresada a mano</span>
                            </div>
                        </label>
                    </div>
                </div>

                <!-- Formulario de ajuste manual con confirmación de seguridad -->
                <div class="bg-gray-50 border-2 border-brand-black rounded-lg p-4 mb-4">
                    <h4 class="font-heading font-black text-xs uppercase mb-1">Ajustar Tasa Manualmente</h4>
                    <p class="text-[11px] text-gray-600 font-bold mb-3">Tasa vigente actual: <span class="text-brand-black font-black">Bs. ${actual}</span></p>
                    <form id="form-tasa-manual" class="flex gap-2">
                        <input id="in-tasa-manual" type="number" step="0.01" min="1" max="999999" placeholder="Ej: 805.50"
                            class="flex-1 border-2 border-brand-black rounded px-3 py-2 text-sm font-black focus:ring-2 focus:ring-brand-purple" required />
                        <button type="submit" class="bg-brand-black text-white font-heading font-black px-4 py-2 rounded border-2 border-brand-black text-xs shadow-brutal-sm hover:-translate-y-0.5 transition-transform">
                            MODIFICAR TASA
                        </button>
                    </form>
                    <p id="msg-tasa-confirm" class="hidden text-xs font-bold text-amber-900 mt-2 bg-amber-100 p-2 border border-brand-black rounded"></p>
                </div>

                <!-- Historial Cronológico de Tasas con Paginación -->
                <div>
                    <div class="flex justify-between items-center mb-2">
                        <h4 class="font-heading font-black text-xs uppercase">Histórico de Actualizaciones (${historico.length})</h4>
                        <span id="tasa-pag-info" class="text-[10px] font-bold text-gray-500 font-mono"></span>
                    </div>
                    <div id="tasa-lista-items" class="space-y-1.5 min-h-[140px]"></div>
                    <div id="tasa-pag-controles" class="flex justify-between items-center border-t border-gray-200 pt-2 mt-2"></div>
                </div>

                <div class="flex justify-between items-center pt-4 border-t-2 border-brand-black text-xs text-gray-500 font-bold mt-4">
                    <span>${this.modoManual ? 'Tasa aplicada: manual (el BCV no la modifica)' : 'Tasa aplicada: referencia BCV'}</span>
                    <button id="tasa-modal-btn-cerrar" class="bg-brand-black text-white px-4 py-2 rounded font-black font-heading text-xs">CERRAR</button>
                </div>
            </div>
        </div>`;

        const cerrar = () => { modalRoot.innerHTML = ''; };
        document.getElementById('tasa-modal-cerrar')?.addEventListener('click', cerrar);
        document.getElementById('tasa-modal-btn-cerrar')?.addEventListener('click', cerrar);

        // Paginación interactiva del histórico de tasas
        const POR_PAGINA_TASA = 5;
        let paginaTasa = 1;
        const totalPaginasTasa = Math.max(1, Math.ceil(historico.length / POR_PAGINA_TASA));

        const renderPaginaTasas = () => {
            const listEl = document.getElementById('tasa-lista-items');
            const infoEl = document.getElementById('tasa-pag-info');
            const ctrlEl = document.getElementById('tasa-pag-controles');
            if (!listEl) return;

            if (historico.length === 0) {
                listEl.innerHTML = '<p class="text-xs text-gray-400 font-bold py-6 text-center">Sin registros históricos previos.</p>';
                if (infoEl) infoEl.textContent = '';
                if (ctrlEl) ctrlEl.innerHTML = '';
                return;
            }

            const inicio = (paginaTasa - 1) * POR_PAGINA_TASA;
            const slice = historico.slice(inicio, inicio + POR_PAGINA_TASA);

            if (infoEl) {
                infoEl.textContent = `Pág. ${paginaTasa}/${totalPaginasTasa} (${historico.length} reg.)`;
            }

            listEl.innerHTML = slice.map((h) => `
                <div class="border border-brand-black rounded p-2 bg-white flex justify-between items-center text-xs">
                    <div>
                        <span class="font-black font-heading text-sm text-brand-black">Bs. ${Number(h.valor).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span class="text-[10px] text-gray-500 font-bold ml-2">· ${h.motivo || 'Actualización'}</span>
                    </div>
                    <div class="text-right">
                        <span class="text-[10px] px-1.5 py-0.5 rounded border border-brand-black font-black uppercase ${h.tipo === 'manual' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'}">
                            ${h.tipo}
                        </span>
                        <p class="text-[10px] text-gray-500 font-mono mt-0.5">${h.fechaHora}</p>
                    </div>
                </div>
            `).join('');

            if (ctrlEl) {
                if (totalPaginasTasa > 1) {
                    ctrlEl.innerHTML = `
                        <span class="text-[10px] text-gray-600 font-bold">Mostrando ${inicio + 1}-${Math.min(inicio + POR_PAGINA_TASA, historico.length)}</span>
                        <div class="flex gap-1.5">
                            <button id="btn-tasa-ant" ${paginaTasa === 1 ? 'disabled' : ''} class="border border-brand-black px-2 py-0.5 rounded text-[10px] font-heading font-black shadow-brutal-sm ${paginaTasa === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100'}">&larr; ANT</button>
                            <button id="btn-tasa-sig" ${paginaTasa === totalPaginasTasa ? 'disabled' : ''} class="border border-brand-black px-2 py-0.5 rounded text-[10px] font-heading font-black shadow-brutal-sm ${paginaTasa === totalPaginasTasa ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100'}">SIG &rarr;</button>
                        </div>
                    `;
                    ctrlEl.querySelector('#btn-tasa-ant')?.addEventListener('click', () => {
                        if (paginaTasa > 1) {
                            paginaTasa--;
                            renderPaginaTasas();
                        }
                    });
                    ctrlEl.querySelector('#btn-tasa-sig')?.addEventListener('click', () => {
                        if (paginaTasa < totalPaginasTasa) {
                            paginaTasa++;
                            renderPaginaTasas();
                        }
                    });
                } else {
                    ctrlEl.innerHTML = '';
                }
            }
        };

        renderPaginaTasas();

        // Control de cambio de modo (Automático / Manual)
        modalRoot.querySelectorAll('input[name="modo-tasa-cambio"]').forEach((radio) => {
            radio.addEventListener('change', async (e) => {
                const target = e.target as HTMLInputElement;
                const esManual = target.value === 'manual';
                if (!esManual && this.modoManual) {
                    const confirmado = await confirmarAccion(
                        '¿Volver a la tasa del BCV? La tasa manual aplicada será reemplazada por la última cotización oficial.',
                        'VOLVER A BCV'
                    );
                    if (!confirmado) {
                        void this.abrirModalHistoricoYAjuste();
                        return;
                    }
                }
                this.setModoManual(esManual);
                mostrarToast(
                    esManual
                        ? 'Modo Manual activado. El sondeo web periódico queda suspendido.'
                        : 'Modo Automático activado. Se reanuda la sincronización periódica con el BCV.',
                    'info'
                );
                // Re-renderizamos el modal para actualizar el badge de estado
                void this.abrirModalHistoricoYAjuste();
            });
        });

        const form = document.getElementById('form-tasa-manual');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('in-tasa-manual') as HTMLInputElement | null;
            const nuevoVal = Number(input?.value || 0);
            if (!nuevoVal || nuevoVal <= 0) return;

            // Confirmación obligatoria de seguridad con diálogo brutalista
            const confirmado = await confirmarAccion(
                `¿Está seguro de que desea cambiar la tasa oficial del sistema a Bs. ${nuevoVal.toFixed(2)}?\n\nEsta tasa afectará todos los nuevos cobros y tickets a partir de este momento.`,
                'MODIFICAR TASA DEL DÍA'
            );

            if (confirmado) {
                const tasa = await invocar<TasaInfo>('fijar_tasa_manual', { tasa: nuevoVal.toFixed(2) });
                if (tasa) this.pintar(tasa);
                cerrar();
            }
        });
    }

    private async actualizar(): Promise<void> {
        const tasa = await this.obtenerTasa('obtener_tasa_bcv');
        if (tasa) this.pintar(tasa);
    }

    private async forzar(): Promise<void> {
        const boton = document.getElementById('bcv-refresh');
        if (boton) boton.classList.add('animate-spin');
        const tasa = await this.obtenerTasa('forzar_actualizacion_tasa');
        if (boton) boton.classList.remove('animate-spin');
        if (tasa) this.pintar(tasa);
    }

    private async obtenerTasa(comando: string): Promise<TasaInfo | null> {
        try {
            return await invocar<TasaInfo>(comando);
        } catch {
            return null;
        }
    }

    private pintar(tasa: TasaInfo): void {
        // La fuente real la manda el backend; la UI se sincroniza con ella.
        const fuente = (tasa.fuente || '').toUpperCase();
        if (fuente) {
            const manualServicio = fuente === 'MANUAL';
            if (manualServicio !== this.modoManual) {
                this.modoManual = manualServicio;
                localStorage.setItem(STORAGE_KEY_MODO_TASA, String(manualServicio));
                if (manualServicio) this.detenerTimer();
                else this.iniciarTimer();
                this.actualizarEtiquetasModo();
            }
        }

        const elValor = document.getElementById('bcv-valor');
        const elFluct = document.getElementById('bcv-fluctuacion');
        if (!elValor || !elFluct) return;

        const valorNumerico = Number(tasa.valor);
        elValor.textContent = Number.isFinite(valorNumerico) && valorNumerico > 0
            ? valorNumerico.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : '--';

        if (Number.isFinite(valorNumerico) && valorNumerico > 0) {
            window.dispatchEvent(new CustomEvent('tasa_actualizada', { detail: valorNumerico }));
        }

        const pct = Number(tasa.fluctuacionPct);
        if (tasa.direccion && Number.isFinite(pct)) {
            const color = tasa.direccion === 'subio'
                ? COLOR_SUBIO
                : tasa.direccion === 'bajo' ? COLOR_BAJO : COLOR_ESTABLE;
            const signo = pct > 0 ? '+' : '';
            elFluct.textContent = `${signo}${pct.toFixed(2)}%`;
            elFluct.style.color = color;
        } else {
            elFluct.textContent = '';
        }
    }
}
