import { api, ConfigInfo, RUBRO_UNIVERSAL, validarLicenciaUniversal } from './api';
import { NegocioModel } from './NegocioModel';

export class WizardView {
    private contenedor: HTMLElement;
    private modelo: NegocioModel;
    private alTerminar: (cfg: ConfigInfo) => void;
    private modo: 'nuevo' | 'restaurar' = 'nuevo';
    private bloquearPanel: boolean = true;

    constructor(contenedor: HTMLElement, modelo: NegocioModel, alTerminar: (cfg: ConfigInfo) => void) {
        this.contenedor = contenedor;
        this.modelo = modelo;
        this.alTerminar = alTerminar;
    }

    render(): void {
        this.contenedor.innerHTML = `
        <div class="max-w-2xl mx-auto mt-3 sm:mt-8 mb-8 sm:mb-12">
            <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-4 sm:p-8">
                <div class="flex flex-wrap items-center justify-between border-b-2 border-brand-black pb-4 mb-6 gap-3">
                    <div>
                        <h1 class="text-2xl sm:text-3xl font-black font-heading">Instalación del Terminal</h1>
                        <p class="text-brand-text font-body text-xs">Configuración inicial o restauración de datos</p>
                    </div>
                    <div class="inline-flex border-2 border-brand-black rounded bg-gray-100 p-0.5">
                        <button id="wz-tab-nuevo" class="px-2.5 sm:px-3 py-1 sm:py-1.5 font-heading text-[11px] sm:text-xs rounded transition-colors ${this.modo === 'nuevo' ? 'font-black bg-brand-black text-white' : 'font-bold text-brand-black hover:bg-white'}">NUEVO NEGOCIO</button>
                        <button id="wz-tab-restaurar" class="px-2.5 sm:px-3 py-1 sm:py-1.5 font-heading text-[11px] sm:text-xs rounded transition-colors ${this.modo === 'restaurar' ? 'font-black bg-brand-black text-white' : 'font-bold text-brand-black hover:bg-white'}">INSTALAR DESDE RESPALDO</button>
                    </div>
                </div>

                <!-- Modo 1: Instalación Limpia -->
                <div id="wz-sec-nuevo" class="${this.modo === 'nuevo' ? 'block' : 'hidden'} space-y-5">
                    <div>
                        <label class="block font-heading font-bold text-xs uppercase tracking-wide mb-1">Nombre del negocio *</label>
                        <input id="wz-nombre" type="text" maxlength="64" placeholder="Ej: Licorería El Triunfo, Panadería Central, Tienda Retail..."
                            class="w-full border-2 border-brand-black rounded px-4 py-2.5 text-base font-bold focus:outline-none focus:ring-2 focus:ring-brand-purple" />
                    </div>

                    <div class="bg-purple-50 border-2 border-brand-purple rounded-lg p-4 space-y-2">
                        <div class="flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full bg-brand-purple"></span>
                            <span class="font-heading font-black text-xs uppercase tracking-wide text-brand-purple">Motor Comercial Universal DatioLabs</span>
                        </div>
                        <p class="text-xs text-gray-700 font-bold leading-relaxed">
                            Todas las capacidades operan unificadas: venta unitaria y por peso (balanza), control de lotes y vencimiento FEFO, consumo y cuentas abiertas / fiados, presentaciones dinámicas (cajas, tobo, six-pack), series y garantías.
                        </p>
                    </div>

                    <!-- Clave de Licencia Comercial (Obligatoria) -->
                    <div class="border-2 border-brand-black rounded-lg p-4 bg-gray-50 space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="block font-heading font-black text-xs uppercase text-brand-black">Clave de Licencia Comercial *</span>
                            <span class="text-[10px] font-black uppercase text-red-600 bg-red-100 px-2 py-0.5 rounded border border-red-400">Requerida</span>
                        </div>
                        <p class="text-xs text-gray-600 font-bold">Ingresa una de las 10 claves de activación autorizadas DatioLabs de 16 dígitos.</p>
                        <input id="wz-licencia" type="text" maxlength="20" placeholder="Ej: 1662-3736-7017-0269"
                            class="w-full border-2 border-brand-black rounded px-4 py-2 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-purple tracking-wider" required />
                        <p id="wz-licencia-error" class="hidden text-red-700 font-bold text-xs">Clave de licencia obligatoria no válida o checksum incorrecto.</p>
                    </div>

                    <!-- Elección de Privacidad de Inventario -->
                    <div class="border-2 border-brand-black rounded-lg p-4 bg-gray-50 space-y-3">
                        <span class="block font-heading font-black text-xs uppercase text-brand-black">Privacidad de Inventario y Stock</span>
                        <p class="text-xs text-gray-600 font-bold">Nivel de visibilidad de costos y valoración para operadores:</p>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label class="cursor-pointer border-2 rounded p-3 bg-white flex items-start gap-2.5 border-brand-black ring-2 ring-brand-purple">
                                <input type="radio" name="opt-priv-inv" id="priv-inv-dueno" checked class="mt-0.5" />
                                <div>
                                    <span class="block font-heading font-black text-xs">SOLO DUEÑO(A) (RESTRINGIDO)</span>
                                    <span class="text-[11px] text-gray-500 font-bold">Operadores visualizan disponibilidad física sin costos ni valoración global.</span>
                                </div>
                            </label>
                            <label class="cursor-pointer border-2 rounded p-3 bg-white flex items-start gap-2.5 border-gray-300">
                                <input type="radio" name="opt-priv-inv" id="priv-inv-abierto" class="mt-0.5" />
                                <div>
                                    <span class="block font-heading font-black text-xs">VISIBILIDAD TOTAL</span>
                                    <span class="text-[11px] text-gray-500 font-bold">Acceso a conteos, costos unitarios y balance total de inventario.</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- Elección de Seguridad del Panel -->
                    <div class="border-2 border-brand-black rounded-lg p-4 bg-gray-50 space-y-3">
                        <span class="block font-heading font-black text-xs uppercase text-brand-black">Seguridad del Panel de Control Dueño(a)</span>
                        <p class="text-xs text-gray-600 font-bold">Restricción de acceso a métricas contables, arqueos y configuración:</p>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label class="cursor-pointer border-2 rounded p-3 bg-white flex items-start gap-2.5 ${this.bloquearPanel ? 'border-brand-black ring-2 ring-brand-purple' : 'border-gray-300'}">
                                <input type="radio" name="opt-seguridad" id="seg-bloqueado" ${this.bloquearPanel ? 'checked' : ''} class="mt-0.5" />
                                <div>
                                    <span class="block font-heading font-black text-xs">BLOQUEAR CON CLAVE</span>
                                    <span class="text-[11px] text-gray-500 font-bold">Acceso exclusivo mediante clave de Dueño(a).</span>
                                </div>
                            </label>
                            <label class="cursor-pointer border-2 rounded p-3 bg-white flex items-start gap-2.5 ${!this.bloquearPanel ? 'border-brand-black ring-2 ring-brand-purple' : 'border-gray-300'}">
                                <input type="radio" name="opt-seguridad" id="seg-abierto" ${!this.bloquearPanel ? 'checked' : ''} class="mt-0.5" />
                                <div>
                                    <span class="block font-heading font-black text-xs">DEJAR ABIERTO</span>
                                    <span class="text-[11px] text-gray-500 font-bold">Acceso directo sin clave en este terminal.</span>
                                </div>
                            </label>
                        </div>

                        <div id="wz-box-pin" class="${this.bloquearPanel ? 'block' : 'hidden'} pt-2">
                            <label class="block font-heading font-bold text-xs uppercase tracking-wide mb-1">Define la Clave Maestra de Dueño(a) *</label>
                            <input id="wz-pin" type="password" maxlength="16" placeholder="Ingresa clave numérica (ej: 1234)"
                                class="w-full border-2 border-brand-black rounded px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-purple" />
                            <p class="text-[10px] text-gray-500 font-bold mt-1">Configurable posteriormente desde el Panel de Control Dueño(a).</p>
                        </div>
                    </div>



                    <div id="wz-error" class="hidden bg-red-100 border-2 border-red-600 text-red-800 rounded px-4 py-3 font-bold text-sm"></div>

                    <button id="wz-iniciar" class="w-full bg-brand-black text-white font-heading font-black text-lg py-3.5 rounded border-2 border-brand-black shadow-brutal hover:-translate-y-0.5 transition-transform">
                        INICIALIZAR TERMINAL
                    </button>
                </div>

                <!-- Modo 2: Instalar desde Respaldo Criptográfico -->
                <div id="wz-sec-restaurar" class="${this.modo === 'restaurar' ? 'block' : 'hidden'} space-y-5">
                    <div class="bg-amber-50 border-2 border-brand-black rounded-lg p-4 text-xs font-bold text-amber-900 leading-relaxed">
                        <strong>Restauración Criptográfica de Datos:</strong>
                        <p class="mt-1">Restaura el catálogo SoA, inventario atómico, categorías, tasas tributarias e historial comercial con verificación de integridad SHA-256.</p>
                    </div>

                    <div>
                        <label class="block font-heading font-bold text-xs uppercase tracking-wide mb-2">Selecciona o arrastra el archivo de respaldo (.backup):</label>
                        <div class="border-2 border-dashed border-brand-black rounded-lg p-6 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" id="drop-zona">
                            <svg class="w-10 h-10 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                            </svg>
                            <p class="font-heading font-black text-sm text-brand-black mb-1">Haz clic para cargar archivo de respaldo</p>
                            <p class="text-[11px] font-mono text-gray-500">Formato: datio_FECHA.backup</p>
                            <input type="file" id="wz-archivo-input" accept=".backup,.datio,.bin" class="hidden" />
                        </div>
                        <div id="wz-archivo-cargado" class="hidden mt-2 p-2 bg-green-50 border border-brand-black rounded text-xs font-mono font-bold text-green-900 flex justify-between items-center">
                            <span id="wz-nombre-archivo"></span>
                            <span class="text-[10px] bg-green-200 px-2 py-0.5 rounded border border-brand-black uppercase font-black">SHA-256 OK</span>
                        </div>
                    </div>
                    <!-- Validación de Licencia del Respaldo -->
                    <div class="border-2 border-brand-black rounded-lg p-4 bg-gray-50 space-y-2">
                        <span class="block font-heading font-black text-xs uppercase text-brand-black">Clave de Licencia del Respaldo *</span>
                        <p class="text-xs text-gray-600 font-bold">Por seguridad contra copias no autorizadas, ingresa la clave de licencia original asociada a este respaldo:</p>
                        <input id="wz-licencia-restaurar" type="text" maxlength="20" placeholder="Ej: 0001-8888-1111-0000"
                            class="w-full border-2 border-brand-black rounded px-4 py-2 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-purple tracking-wider" />
                        <p class="text-[10px] text-gray-500 font-bold">Si el respaldo no contenía licencia registrada, puedes dejar este campo en blanco.</p>
                    </div>

                    <!-- Seguridad del Panel en Restauración -->
                    <div class="border-2 border-brand-black rounded-lg p-4 bg-gray-50 space-y-3">
                        <span class="block font-heading font-black text-xs uppercase text-brand-black">Seguridad del Panel en este Terminal</span>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label class="cursor-pointer border-2 rounded p-3 bg-white flex items-start gap-2.5 ${this.bloquearPanel ? 'border-brand-black ring-2 ring-brand-purple' : 'border-gray-300'}">
                                <input type="radio" name="opt-seguridad-res" id="seg-bloqueado-res" ${this.bloquearPanel ? 'checked' : ''} class="mt-0.5" />
                                <div>
                                    <span class="block font-heading font-black text-xs">BLOQUEAR CON CLAVE</span>
                                    <span class="text-[11px] text-gray-500 font-bold">Protege el panel en este equipo.</span>
                                </div>
                            </label>
                            <label class="cursor-pointer border-2 rounded p-3 bg-white flex items-start gap-2.5 ${!this.bloquearPanel ? 'border-brand-black ring-2 ring-brand-purple' : 'border-gray-300'}">
                                <input type="radio" name="opt-seguridad-res" id="seg-abierto-res" ${!this.bloquearPanel ? 'checked' : ''} class="mt-0.5" />
                                <div>
                                    <span class="block font-heading font-black text-xs">DEJAR ABIERTO</span>
                                    <span class="text-[11px] text-gray-500 font-bold">Acceso sin clave.</span>
                                </div>
                            </label>
                        </div>

                        <div id="wz-box-pin-res" class="${this.bloquearPanel ? 'block' : 'hidden'} pt-2">
                            <label class="block font-heading font-bold text-xs uppercase tracking-wide mb-1">Clave de Dueño(a) para este Terminal *</label>
                            <input id="wz-pin-restaurar" type="password" maxlength="16" placeholder="Define la clave para este terminal"
                                class="w-full border-2 border-brand-black rounded px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-purple" />
                        </div>
                    </div>

                    <div id="wz-restore-error" class="hidden bg-red-100 border-2 border-red-600 text-red-800 rounded px-4 py-3 font-bold text-sm"></div>

                    <button id="wz-ejecutar-restaurar" class="w-full bg-brand-black text-white font-heading font-black text-lg py-3.5 rounded border-2 border-brand-black shadow-brutal hover:-translate-y-0.5 transition-transform">
                        RESTAURAR E INICIALIZAR SISTEMA
                    </button>
                </div>
            </div>
        </div>`;

        this.conectarEventos();
    }


    private conectarEventos(): void {
        const tabNuevo = document.getElementById('wz-tab-nuevo');
        const tabRestaurar = document.getElementById('wz-tab-restaurar');

        tabNuevo?.addEventListener('click', () => {
            this.modo = 'nuevo';
            this.render();
        });

        tabRestaurar?.addEventListener('click', () => {
            this.modo = 'restaurar';
            this.render();
        });

        // Alternar bloqueo de panel en modo nuevo
        const radBloq = document.getElementById('seg-bloqueado');
        const radAbierto = document.getElementById('seg-abierto');
        const boxPin = document.getElementById('wz-box-pin');

        radBloq?.addEventListener('change', () => {
            this.bloquearPanel = true;
            boxPin?.classList.remove('hidden');
        });
        radAbierto?.addEventListener('change', () => {
            this.bloquearPanel = false;
            boxPin?.classList.add('hidden');
        });

        // Alternar bloqueo de panel en modo restaurar
        const radBloqRes = document.getElementById('seg-bloqueado-res');
        const radAbiertoRes = document.getElementById('seg-abierto-res');
        const boxPinRes = document.getElementById('wz-box-pin-res');

        radBloqRes?.addEventListener('change', () => {
            this.bloquearPanel = true;
            boxPinRes?.classList.remove('hidden');
        });
        radAbiertoRes?.addEventListener('change', () => {
            this.bloquearPanel = false;
            boxPinRes?.classList.add('hidden');
        });

        document.getElementById('wz-iniciar')?.addEventListener('click', () => void this.enviarNuevo());

        // Manejo de archivo en restauración
        const dropZona = document.getElementById('drop-zona');
        const fileInput = document.getElementById('wz-archivo-input') as HTMLInputElement | null;
        const infoCargado = document.getElementById('wz-archivo-cargado');
        const txtNombre = document.getElementById('wz-nombre-archivo');

        dropZona?.addEventListener('click', () => fileInput?.click());

        fileInput?.addEventListener('change', () => {
            if (fileInput.files && fileInput.files[0]) {
                const f = fileInput.files[0];
                if (txtNombre && infoCargado) {
                    txtNombre.textContent = f.name;
                    infoCargado.classList.remove('hidden');
                }
            }
        });

        document.getElementById('wz-ejecutar-restaurar')?.addEventListener('click', () => void this.enviarRestauracion());
    }

    private async enviarNuevo(): Promise<void> {
        const errorBox = document.getElementById('wz-error');
        const nombre = (document.getElementById('wz-nombre') as HTMLInputElement).value.trim();
        const pinInput = document.getElementById('wz-pin') as HTMLInputElement | null;
        const pin = this.bloquearPanel ? (pinInput?.value.trim() || '') : '';
        const rubros = RUBRO_UNIVERSAL;
        const licenciaInput = document.getElementById('wz-licencia') as HTMLInputElement | null;
        const licenciaClave = licenciaInput?.value.trim() || '';
        const licenciaError = document.getElementById('wz-licencia-error');

        if (!nombre) {
            if (errorBox) {
                errorBox.textContent = 'Escribe el nombre del negocio para continuar.';
                errorBox.classList.remove('hidden');
            }
            return;
        }
        if (this.bloquearPanel && !pin) {
            if (errorBox) {
                errorBox.textContent = 'Ingresa una clave para proteger el panel o selecciona la opción "DEJAR ABIERTO".';
                errorBox.classList.remove('hidden');
            }
            return;
        }
        if (!licenciaClave || !validarLicenciaUniversal(licenciaClave)) {
            if (licenciaError) {
                licenciaError.textContent = 'Debes ingresar una clave de licencia comercial universal válida de 16 dígitos.';
                licenciaError.classList.remove('hidden');
            }
            return;
        }
        if (licenciaError) {
            licenciaError.classList.add('hidden');
        }

        try {
            const privInvRadio = document.getElementById('priv-inv-dueno') as HTMLInputElement | null;
            const privacidadInventario = privInvRadio?.checked ?? true;
            await this.modelo.inicializar(nombre, rubros, pin, licenciaClave, privacidadInventario);
            const cfg = this.modelo.getConfig();
            if (cfg) this.alTerminar(cfg);
        } catch (e) {
            if (errorBox) {
                errorBox.textContent = e instanceof Error ? e.message : String(e);
                errorBox.classList.remove('hidden');
            }
        }
    }

    private async enviarRestauracion(): Promise<void> {
        const errorBox = document.getElementById('wz-restore-error');
        const fileInput = document.getElementById('wz-archivo-input') as HTMLInputElement | null;
        const pinInput = document.getElementById('wz-pin-restaurar') as HTMLInputElement | null;
        const pin = this.bloquearPanel ? (pinInput?.value.trim() || '') : '';

        const f = fileInput?.files?.[0];

        if (!f) {
            if (errorBox) {
                errorBox.textContent = 'Selecciona un archivo de respaldo.';
                errorBox.classList.remove('hidden');
            }
            return;
        }

        if (this.bloquearPanel && !pin) {
            if (errorBox) {
                errorBox.textContent = 'Ingresa una clave para el panel en este terminal o selecciona "DEJAR ABIERTO".';
                errorBox.classList.remove('hidden');
            }
            return;
        }

        const licInput = document.getElementById('wz-licencia-restaurar') as HTMLInputElement | null;
        const licencia = licInput?.value.trim() || '';

        try {
            const contenidoBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const result = reader.result;
                    if (typeof result === 'string') {
                        const base64 = result.split(',')[1] || '';
                        resolve(base64);
                    } else {
                        reject(new Error('Error leyendo archivo'));
                    }
                };
                reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
                reader.readAsDataURL(f);
            });

            await api.restaurarDesdeArchivo(contenidoBase64, f.name, licencia);

            if (this.bloquearPanel && pin) {
                try {
                    await api.cambiarPinDueno('', pin);
                } catch (e) {
                    // El respaldo ya tenia clave: se conserva la anterior y se
                    // avisa sin dejar el wizard trabado (la data ya se restauro).
                    console.warn('No se pudo fijar la nueva clave del panel', e);
                    if (errorBox) {
                        errorBox.textContent =
                            'Respaldo restaurado. El respaldo ya tenia una clave de dueno: se conserva la anterior y podras cambiarla desde el Panel conociendola.';
                        errorBox.classList.remove('hidden');
                    }
                }
            }

            const cfg = await api.config();
            if (cfg) this.alTerminar(cfg);
            else throw new Error('Respaldo restaurado pero no se pudo cargar la configuración');
        } catch (e) {
            if (errorBox) {
                errorBox.textContent = e instanceof Error ? e.message : String(e);
                errorBox.classList.remove('hidden');
            }
        }
    }
}
