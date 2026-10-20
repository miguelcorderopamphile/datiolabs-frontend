/**
 * DatioLabs Enterprise - Sistema de Notificaciones y Cuadros de Diálogo Brutalistas.
 * Sustituye completamente las llamadas nativas a alert(), confirm() y prompt().
 */

export function mostrarToast(mensaje: string, tipo: 'success' | 'error' | 'info' = 'info'): void {
    const colores = {
        success: 'bg-emerald-600 text-white',
        error: 'bg-red-600 text-white',
        info: 'bg-brand-black text-white',
    };
    const toast = document.createElement('div');
    toast.className = `fixed bottom-6 right-6 ${colores[tipo]} border-2 border-brand-black rounded shadow-brutal px-5 py-4 font-heading font-bold max-w-md z-[110] transition-all duration-300`;
    toast.innerHTML = `<span class="text-xs sm:text-sm">${mensaje.replace(/"/g, '')}</span> <button class="ml-3 underline font-black text-xs uppercase">Cerrar</button>`;
    toast.querySelector('button')?.addEventListener('click', () => toast.remove());
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 6000);
}

export function confirmarAccion(mensaje: string, titulo: string = 'CONFIRMACIÓN REQUERIDA'): Promise<boolean> {
    return new Promise((resolve) => {
        const backdrop = document.createElement('div');
        backdrop.className = 'fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[120]';
        
        backdrop.innerHTML = `
            <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal max-w-md w-full p-5 sm:p-6">
                <div class="flex justify-between items-center border-b-2 border-brand-black pb-2 mb-3">
                    <h3 class="font-heading font-black text-base sm:text-lg text-brand-black uppercase">${titulo}</h3>
                    <button data-dialog-cancel class="text-brand-black font-black text-lg hover:text-red-600">&times;</button>
                </div>
                <p class="text-xs sm:text-sm font-bold text-gray-700 leading-relaxed mb-5">${mensaje}</p>
                <div class="flex justify-end gap-2 pt-2 border-t border-gray-200">
                    <button data-dialog-cancel class="bg-white border-2 border-brand-black font-heading font-black px-4 py-2 rounded text-xs hover:bg-gray-100">
                        CANCELAR
                    </button>
                    <button data-dialog-confirm class="bg-brand-black text-white hover:bg-gray-800 border-2 border-brand-black font-heading font-black px-4 py-2 rounded text-xs shadow-brutal-sm">
                        CONFIRMAR
                    </button>
                </div>
            </div>
        `;

        const cerrar = (res: boolean) => {
            backdrop.remove();
            resolve(res);
        };

        backdrop.querySelectorAll('[data-dialog-cancel]').forEach((b) =>
            b.addEventListener('click', () => cerrar(false))
        );
        backdrop.querySelector('[data-dialog-confirm]')?.addEventListener('click', () => cerrar(true));
        document.body.appendChild(backdrop);
    });
}

export function pedirValor(mensaje: string, valorDefecto: string = '', titulo: string = 'SOLICITUD DE DATO'): Promise<string | null> {
    return new Promise((resolve) => {
        const backdrop = document.createElement('div');
        backdrop.className = 'fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[120]';
        
        backdrop.innerHTML = `
            <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal max-w-md w-full p-5 sm:p-6">
                <div class="flex justify-between items-center border-b-2 border-brand-black pb-2 mb-3">
                    <h3 class="font-heading font-black text-base sm:text-lg text-brand-black uppercase">${titulo}</h3>
                    <button data-dialog-cancel class="text-brand-black font-black text-lg hover:text-red-600">&times;</button>
                </div>
                <p class="text-xs sm:text-sm font-bold text-gray-700 leading-relaxed mb-3">${mensaje}</p>
                <input id="dialog-input-val" type="text" value="${valorDefecto}" class="w-full border-2 border-brand-black rounded px-3 py-2 text-sm font-bold mb-4 focus:outline-none focus:ring-2 focus:ring-brand-purple" />
                <div class="flex justify-end gap-2 pt-2 border-t border-gray-200">
                    <button data-dialog-cancel class="bg-white border-2 border-brand-black font-heading font-black px-4 py-2 rounded text-xs hover:bg-gray-100">
                        CANCELAR
                    </button>
                    <button data-dialog-accept class="bg-brand-black text-white hover:bg-gray-800 border-2 border-brand-black font-heading font-black px-4 py-2 rounded text-xs shadow-brutal-sm">
                        ACEPTAR
                    </button>
                </div>
            </div>
        `;

        const input = backdrop.querySelector<HTMLInputElement>('#dialog-input-val');
        const cerrar = (val: string | null) => {
            backdrop.remove();
            resolve(val);
        };

        backdrop.querySelectorAll('[data-dialog-cancel]').forEach((b) =>
            b.addEventListener('click', () => cerrar(null))
        );
        backdrop.querySelector('[data-dialog-accept]')?.addEventListener('click', () => {
            cerrar(input?.value ?? '');
        });
        input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') cerrar(input.value);
            if (e.key === 'Escape') cerrar(null);
        });

        document.body.appendChild(backdrop);
        input?.focus();
        input?.select();
    });
}

export interface ArqueoResumen {
    totalUsd: number;
    totalBs: number;
    totalTickets: number;
    vueltoPagadoBs: number;
    vueltoRetenidoBs: number;
    redondeoBs?: number;
    redondeoUsd?: number;
    tasaInicio: number;
    operadores: string;
    inicioStr: string;
    porMetodo: Record<string, { usd: number; bs: number; transacciones: number }>;
}

export function confirmarArqueoCierreJornada(data: ArqueoResumen): Promise<boolean> {
    const fmt = (n: number) =>
        n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const metodosEntries = Object.entries(data.porMetodo);
    const metodosHtml = metodosEntries.length > 0
        ? metodosEntries.map(([met, val]) => `
            <div class="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-none text-xs">
                <div class="min-w-0 pr-2">
                    <span class="font-heading font-black text-brand-black block truncate">${met}</span>
                    <span class="text-[10px] text-gray-500 font-bold">${val.transacciones} comprobante${val.transacciones !== 1 ? 's' : ''}</span>
                </div>
                <div class="text-right shrink-0">
                    <span class="font-black text-brand-black font-mono">$ ${fmt(val.usd)}</span>
                    <span class="text-brand-purple font-mono font-bold ml-2">Bs. ${fmt(val.bs)}</span>
                </div>
            </div>
        `).join('')
        : `<p class="py-3 text-center text-xs text-gray-400 italic">Sin transacciones registradas en este turno.</p>`;

    return new Promise((resolve) => {
        const backdrop = document.createElement('div');
        backdrop.className = 'fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[120]';

        backdrop.innerHTML = `
            <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal max-w-lg w-full p-5 sm:p-6 max-h-[90vh] flex flex-col">
                <div class="flex justify-between items-center border-b-2 border-brand-black pb-2 mb-3">
                    <div>
                        <span class="text-[10px] font-black uppercase tracking-wider text-red-700">Auditoría y Arqueo</span>
                        <h3 class="font-heading font-black text-lg sm:text-xl text-brand-black uppercase">CIERRE DE JORNADA OPERATIVA</h3>
                    </div>
                    <button data-dialog-cancel class="text-brand-black font-black text-lg hover:text-red-600">&times;</button>
                </div>

                <div class="overflow-y-auto pr-1 space-y-3 flex-1">
                    <p class="text-xs font-bold text-gray-600">
                        Verifica el cuadre físico de caja y terminales antes de consolidar el informe final:
                    </p>

                    <!-- Resumen métricas -->
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                        <div class="p-2 border border-brand-black rounded bg-gray-50">
                            <span class="text-[9px] font-black uppercase text-gray-500 block">Venta Total USD</span>
                            <span class="font-heading font-black text-sm text-brand-black">$ ${fmt(data.totalUsd)}</span>
                        </div>
                        <div class="p-2 border border-brand-black rounded bg-gray-50">
                            <span class="text-[9px] font-black uppercase text-gray-500 block">Venta Total Bs.</span>
                            <span class="font-heading font-black text-sm text-brand-purple">Bs. ${fmt(data.totalBs)}</span>
                        </div>
                        <div class="p-2 border border-brand-black rounded bg-gray-50 col-span-2 sm:col-span-1">
                            <span class="text-[9px] font-black uppercase text-gray-500 block">Tickets Emitidos</span>
                            <span class="font-heading font-black text-sm text-brand-black">${data.totalTickets}</span>
                        </div>
                    </div>

                    <!-- Datos turno -->
                    <div class="bg-purple-50 border border-brand-purple rounded p-2.5 text-xs">
                        <div class="flex justify-between mb-1">
                            <span class="font-bold text-gray-600">Apertura:</span>
                            <span class="font-mono font-bold text-brand-black">${data.inicioStr || '-'}</span>
                        </div>
                        <div class="flex justify-between mb-1">
                            <span class="font-bold text-gray-600">Operadores:</span>
                            <span class="font-bold text-brand-purple truncate max-w-[220px]">${data.operadores || 'Principal'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="font-bold text-gray-600">Vuelto Pagado / Retenido:</span>
                            <span class="font-mono font-bold text-gray-800">Bs. ${fmt(data.vueltoPagadoBs)} / Bs. ${fmt(data.vueltoRetenidoBs)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="font-bold text-gray-600">Redondeos voluntarios (ingreso):</span>
                            <span class="font-mono font-black text-emerald-800">Bs. ${fmt(data.redondeoBs || 0)} · $ ${fmt(data.redondeoUsd || 0)}</span>
                        </div>
                    </div>

                    <!-- Desglose métodos de pago -->
                    <div class="border-2 border-brand-black rounded p-3 bg-white">
                        <span class="text-[10px] font-heading font-black uppercase text-gray-600 block mb-2">
                            Arqueo Discriminado por Método de Pago
                        </span>
                        <div class="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                            ${metodosHtml}
                        </div>
                    </div>
                </div>

                <div class="flex justify-between items-center gap-2 pt-3 border-t-2 border-brand-black mt-3">
                    <button data-dialog-cancel class="bg-white border-2 border-brand-black font-heading font-black px-4 py-2.5 rounded text-xs hover:bg-gray-100">
                        VOLVER A REVISAR
                    </button>
                    <button data-dialog-confirm class="bg-red-600 text-white hover:bg-red-700 border-2 border-brand-black font-heading font-black px-5 py-2.5 rounded text-xs shadow-brutal-sm">
                        CONFIRMAR CIERRE DEFINITIVO
                    </button>
                </div>
            </div>
        `;

        const cerrar = (res: boolean) => {
            backdrop.remove();
            resolve(res);
        };

        backdrop.querySelectorAll('[data-dialog-cancel]').forEach((b) =>
            b.addEventListener('click', () => cerrar(false))
        );
        backdrop.querySelector('[data-dialog-confirm]')?.addEventListener('click', () => cerrar(true));
        document.body.appendChild(backdrop);
    });
}

