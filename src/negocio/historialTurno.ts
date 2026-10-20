import { api, parseNum, type JornadaLaboral } from './api';
import { formatFechaHoraVet } from './dateUtils';
import { confirmarAccion, confirmarArqueoCierreJornada, mostrarToast, pedirValor } from './dialogs';

const fmt = (n: number | string | undefined | null): string =>
    parseNum(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Cierra la jornada con la regla de rigor: si hay cuentas abiertas, guia al
 * operador para pasarlas a deuda (con titular y nota) y reintenta el cierre.
 * Devuelve la jornada cerrada o null si el operador cancelo o hubo error.
 */
export async function cerrarJornadaGuiada(): Promise<JornadaLaboral | null> {
    try {
        const cerrada = await api.cerrarJornada();
        mostrarToast(`Turno cerrado exitosamente. ID: ${cerrada.id}`, 'success');
        return cerrada;
    } catch (e) {
        const mensaje = e instanceof Error ? e.message : String(e);
        if (!mensaje.includes('cuentas abiertas')) {
            mostrarToast('Error al cerrar el turno: ' + mensaje, 'error');
            return null;
        }
    }

    const cuentas = await api.cuentas();
    if (cuentas.length === 0) {
        mostrarToast('El turno no pudo cerrarse. Reintente en unos segundos.', 'error');
        return null;
    }

    for (const c of cuentas) {
        const cliente = await pedirValor(
            `Titular responsable de la cuenta "${c.etiqueta}"`,
            c.cliente || '',
            'PASAR A DEUDA',
        );
        if (cliente === null) return null;
        const nota = await pedirValor(
            `Nota de compromiso para "${c.etiqueta}" (opcional)`,
            c.nota || '',
            'PASAR A DEUDA',
        );
        if (nota === null) return null;
        try {
            await api.convertirCuentaADeuda(c.ventaId, cliente || 'Sin titular', nota || undefined);
            mostrarToast(`Cuenta "${c.etiqueta}" pasada a deuda.`, 'success');
        } catch (err) {
            mostrarToast(
                `No se pudo pasar "${c.etiqueta}" a deuda: ` +
                    (err instanceof Error ? err.message : String(err)),
                'error',
            );
            return null;
        }
    }

    try {
        const cerrada = await api.cerrarJornada();
        mostrarToast(`Turno cerrado exitosamente. ID: ${cerrada.id}`, 'success');
        return cerrada;
    } catch (e) {
        mostrarToast(
            'Error al cerrar el turno: ' + (e instanceof Error ? e.message : String(e)),
            'error',
        );
        return null;
    }
}

export async function abrirModalHistorialTurno(modalHost: HTMLElement): Promise<void> {
    const [jornada, tickets] = await Promise.all([
        api.obtenerJornadaActual(),
        api.ventas(),
    ]);
    let redondeos: Awaited<ReturnType<typeof api.redondeos>> = [];
    try {
        redondeos = await api.redondeos();
    } catch (e) {
        mostrarToast(
            'No se pudieron cargar los redondeos: ' + (e instanceof Error ? e.message : String(e)),
            'error',
        );
    }

    if (!jornada) {
        modalHost.innerHTML = `
        <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
            <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-6 w-full max-w-md text-center">
                <h3 class="font-heading font-black text-xl mb-2 text-red-700">SIN JORNADA ACTIVA</h3>
                <p class="text-xs font-body text-gray-600 mb-4">No existe un turno abierto actualmente en la estación. Abre un turno para iniciar el registro cronológico de ventas.</p>
                <button id="btn-cerrar-historial-turno" class="w-full bg-brand-black text-white font-heading font-black py-2.5 rounded border-2 border-brand-black text-xs">ENTENDIDO</button>
            </div>
        </div>`;
        modalHost.querySelector('#btn-cerrar-historial-turno')?.addEventListener('click', () => {
            modalHost.innerHTML = '';
        });
        return;
    }

    const inicioUnix = jornada.inicioUnix;
    // Filtrar tickets emitidos durante la jornada activa
    const ticketsTurno = tickets.filter(t => {
        const fUnix = t.fechaUnix || 0;
        return fUnix >= inicioUnix;
    });
    // El ticket sintetico de saldo a favor no es recaudacion ni comprobante.
    const ticketsContables = ticketsTurno.filter(t => t.canal !== 'SALDO A FAVOR');
    // Redondeos voluntarios del turno: ingreso del negocio (opcion B).
    const redondeosTurno = redondeos.filter((r) => r.fechaUnix >= inicioUnix);
    const totalRedondeoBs = redondeosTurno.reduce((a, r) => a + parseNum(r.montoBs), 0);
    const totalRedondeoUsd = redondeosTurno.reduce((a, r) => {
        const usd = parseNum(r.montoUsd);
        if (usd > 0) return a + usd;
        const tasa = parseNum(r.tasa);
        return a + (tasa > 0 ? parseNum(r.montoBs) / tasa : 0);
    }, 0);

    let totalRecaudadoUsd = 0;
    let totalRecaudadoBs = 0;
    let recaudadoPorMetodo: Record<string, { usd: number; bs: number }> = {};
    let recaudadoPorOperador: Record<string, { usd: number; bs: number; tickets: number }> = {};

    ticketsContables.forEach(t => {
        const u = parseNum(t.totalUsd);
        const b = parseNum(t.totalBs);
        totalRecaudadoUsd += u;
        totalRecaudadoBs += b;

        const op = t.operador || jornada.operadorActual || 'Cajero';
        if (!recaudadoPorOperador[op]) {
            recaudadoPorOperador[op] = { usd: 0, bs: 0, tickets: 0 };
        }
        recaudadoPorOperador[op].usd += u;
        recaudadoPorOperador[op].bs += b;
        recaudadoPorOperador[op].tickets += 1;

        if (Array.isArray(t.pagos) && t.pagos.length > 0) {
            t.pagos.forEach(p => {
                const met = p.metodo || 'EFECTIVO';
                if (!recaudadoPorMetodo[met]) {
                    recaudadoPorMetodo[met] = { usd: 0, bs: 0 };
                }
                recaudadoPorMetodo[met].usd += parseNum(p.montoUsd);
                recaudadoPorMetodo[met].bs += parseNum(p.montoBs);
            });
        }
    });

    const operadoresActivos = (jornada.operadoresActivos && jornada.operadoresActivos.length > 0)
        ? jornada.operadoresActivos.join(', ')
        : (jornada.operadorActual || 'Sin asignar');

    modalHost.innerHTML = `
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
        <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-5 sm:p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div class="flex justify-between items-center border-b-2 border-brand-black pb-3 mb-3">
                <div>
                    <span class="text-[10px] font-black uppercase tracking-wider text-brand-purple">Auditoría Operativa de Caja</span>
                    <h3 class="font-heading font-black text-2xl">HISTORIAL DEL TURNO ACTIVO</h3>
                    <p class="text-xs text-gray-500 font-bold">
                        Apertura: ${formatFechaHoraVet(jornada.inicioUnix)} · Operador(es): <strong>${operadoresActivos}</strong>
                    </p>
                </div>
                <button id="btn-cerrar-historial-turno" class="w-8 h-8 rounded border-2 border-brand-black font-black flex items-center justify-center hover:bg-gray-100">&times;</button>
            </div>

            <!-- Resumen Métricas del Turno -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div class="bg-gray-50 border-2 border-brand-black rounded p-3">
                    <span class="text-[10px] font-black uppercase text-gray-500 block">Total Recaudado en Turno</span>
                    <p class="font-heading font-black text-xl text-brand-black mt-0.5">$ ${fmt(totalRecaudadoUsd)} USD</p>
                    <p class="text-xs font-black text-brand-purple">Bs. ${fmt(totalRecaudadoBs)}</p>
                </div>
                <div class="bg-gray-50 border-2 border-brand-black rounded p-3">
                    <span class="text-[10px] font-black uppercase text-gray-500 block">Comprobantes Emitidos</span>
                    <p class="font-heading font-black text-xl text-brand-black mt-0.5">${ticketsContables.length} tickets</p>
                    <p class="text-xs font-bold text-gray-500">Tasa de inicio: Bs. ${fmt(jornada.tasaInicio)}</p>
                </div>
                <div class="bg-gray-50 border-2 border-brand-black rounded p-3">
                    <span class="text-[10px] font-black uppercase text-gray-500 block">Vueltos Otorgados / Retenidos</span>
                    <p class="font-heading font-black text-base text-gray-800 mt-0.5">Pagado: Bs. ${fmt(jornada.vueltoPagadoBs)}</p>
                    <p class="text-xs font-bold text-emerald-800">Retenido: Bs. ${fmt(jornada.vueltoRetenidoBs)}</p>
                    <p class="text-xs font-black text-brand-black mt-0.5">Redondeos (ingreso): Bs. ${fmt(totalRedondeoBs)} · $ ${fmt(totalRedondeoUsd)}</p>
                </div>
            </div>

            <!-- Desglose por Operador y Métodos -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div class="border-2 border-brand-black rounded p-3 bg-white">
                    <span class="text-[10px] font-heading font-black uppercase text-gray-600 block mb-2">Desglose por Cajero / Despachador</span>
                    <div class="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        ${Object.keys(recaudadoPorOperador).length === 0
                            ? `<p class="text-xs text-gray-400 italic">Sin transacciones registradas por operadores.</p>`
                            : Object.entries(recaudadoPorOperador).map(([op, val]) => `
                                <div class="flex justify-between items-center text-xs border-b border-gray-100 pb-1">
                                    <span class="font-bold text-gray-800">${op} (${val.tickets} t.)</span>
                                    <span class="font-mono font-black text-brand-black">$${fmt(val.usd)} · Bs. ${fmt(val.bs)}</span>
                                </div>
                            `).join('')}
                    </div>
                </div>
                <div class="border-2 border-brand-black rounded p-3 bg-white">
                    <span class="text-[10px] font-heading font-black uppercase text-gray-600 block mb-2">Desglose por Método de Pago</span>
                    <div class="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        ${Object.keys(recaudadoPorMetodo).length === 0
                            ? `<p class="text-xs text-gray-400 italic">Sin pagos asentados.</p>`
                            : Object.entries(recaudadoPorMetodo).map(([met, val]) => `
                                <div class="flex justify-between items-center text-xs border-b border-gray-100 pb-1">
                                    <span class="font-bold text-gray-800">${met}</span>
                                    <span class="font-mono font-black text-brand-black">${val.usd > 0 ? `$${fmt(val.usd)} ` : ''}Bs. ${fmt(val.bs)}</span>
                                </div>
                            `).join('')}
                    </div>
                </div>
            </div>

            <!-- Lista Cronológica de Tickets -->
            <div class="border-2 border-brand-black rounded-lg p-3 bg-gray-50 flex-1 flex flex-col min-h-[160px]">
                <div class="flex justify-between items-center border-b-2 border-gray-200 pb-1.5 mb-2">
                    <span class="text-xs font-heading font-black uppercase text-gray-700">Tickets del Turno (${ticketsTurno.length})</span>
                    <div class="flex items-center gap-2">
                        <span id="turno-pag-info" class="text-[10px] font-bold text-gray-500 font-mono"></span>
                        <div id="turno-pag-controles" class="flex gap-1"></div>
                    </div>
                </div>
                <div id="contenedor-tickets-turno" class="space-y-2 overflow-y-auto max-h-72 pr-1"></div>
            </div>

            <div class="pt-4 mt-2 border-t-2 border-brand-black flex justify-between items-center gap-2">
                <button id="btn-arqueo-cerrar-turno-caja" class="bg-red-600 text-white font-heading font-black px-4 py-2.5 rounded border-2 border-brand-black text-xs hover:bg-red-700 shadow-brutal-sm">
                    CERRAR TURNO OPERATIVO
                </button>
                <button id="btn-cerrar-historial-turno-footer" class="bg-white text-brand-black font-heading font-black px-6 py-2.5 rounded border-2 border-brand-black text-xs hover:bg-gray-100">
                    CERRAR VENTANA
                </button>
            </div>
        </div>
    </div>`;

    let paginaActual = 1;
    const POR_PAGINA = 15;
    const totalPaginas = Math.max(1, Math.ceil(ticketsTurno.length / POR_PAGINA));

    const renderTicketsPaginados = () => {
        const contenedor = modalHost.querySelector('#contenedor-tickets-turno');
        const infoEl = modalHost.querySelector('#turno-pag-info');
        const ctrlEl = modalHost.querySelector('#turno-pag-controles');
        if (!contenedor) return;

        if (ticketsTurno.length === 0) {
            contenedor.innerHTML = `<p class="py-6 text-center text-xs text-gray-400 font-bold">No se han emitido tickets durante el turno actual.</p>`;
            if (infoEl) infoEl.textContent = '';
            if (ctrlEl) ctrlEl.innerHTML = '';
            return;
        }

        const inicio = (paginaActual - 1) * POR_PAGINA;
        const fin = inicio + POR_PAGINA;
        const sliceTickets = ticketsTurno.slice(inicio, fin);

        if (infoEl) {
            infoEl.textContent = `${inicio + 1}-${Math.min(fin, ticketsTurno.length)} de ${ticketsTurno.length} (Pág. ${paginaActual}/${totalPaginas})`;
        }

        if (ctrlEl) {
            if (totalPaginas > 1) {
                ctrlEl.innerHTML = `
                    <button id="btn-pag-ant-turno" ${paginaActual === 1 ? 'disabled' : ''} class="px-2 py-0.5 text-[10px] font-heading font-black border border-brand-black rounded bg-white hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                        &larr; ANT
                    </button>
                    <button id="btn-pag-sig-turno" ${paginaActual === totalPaginas ? 'disabled' : ''} class="px-2 py-0.5 text-[10px] font-heading font-black border border-brand-black rounded bg-white hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                        SIG &rarr;
                    </button>
                `;
                ctrlEl.querySelector('#btn-pag-ant-turno')?.addEventListener('click', () => {
                    if (paginaActual > 1) {
                        paginaActual--;
                        renderTicketsPaginados();
                    }
                });
                ctrlEl.querySelector('#btn-pag-sig-turno')?.addEventListener('click', () => {
                    if (paginaActual < totalPaginas) {
                        paginaActual++;
                        renderTicketsPaginados();
                    }
                });
            } else {
                ctrlEl.innerHTML = '';
            }
        }

        contenedor.innerHTML = sliceTickets.map((t) => `
            <div class="border border-brand-black bg-white rounded overflow-hidden shadow-sm">
                <div class="flex items-center justify-between p-2.5 text-xs font-bold hover:bg-amber-50/50 cursor-pointer select-none" data-toggle-ticket-detalle="${t.ventaId}">
                    <div class="min-w-0 flex-1 pr-2">
                        <div class="flex items-center gap-2">
                            <span class="font-mono text-brand-black font-black">${t.ventaId}</span>
                            <span class="text-[10px] text-gray-500 font-bold">${formatFechaHoraVet(t.fechaUnix)}</span>
                        </div>
                        <p class="text-[10px] text-brand-purple font-black uppercase mt-0.5">
                            ${t.canal || 'VENTA DIRECTA'} ${t.operador ? `· Cajero: <strong class="text-brand-black">${t.operador}</strong>` : ''}
                        </p>
                    </div>
                    <div class="text-right shrink-0 flex items-center gap-3">
                        <div>
                            <p class="font-heading font-black text-sm text-brand-black">$${fmt(t.totalUsd)}</p>
                            <p class="text-[10px] font-bold text-brand-purple">Bs. ${fmt(t.totalBs)}</p>
                        </div>
                        <span class="text-xs font-black text-gray-500 px-1 py-0.5 border border-gray-300 rounded bg-gray-50" data-arrow-detalle="${t.ventaId}">▼</span>
                    </div>
                </div>
                <div id="detalle-ticket-${t.ventaId}" class="hidden border-t border-brand-black bg-gray-50 p-2.5 text-xs">
                    <p class="text-[10px] font-heading font-black uppercase text-gray-600 mb-1.5">Artículos y Servicios Despachados:</p>
                    <div class="space-y-1 mb-2">
                        ${(t.lineas && t.lineas.length > 0)
                            ? t.lineas.map(l => `
                                <div class="flex justify-between items-center text-[11px] border-b border-gray-200 pb-1">
                                    <div class="min-w-0 flex-1 pr-2">
                                        <div class="flex items-center gap-1.5 flex-wrap">
                                            <span class="font-bold text-gray-800">${l.nombre}</span>
                                            ${l.modoVenta && l.modoVenta !== 'unidad' ? `<span class="inline-block text-[9px] font-black bg-purple-100 text-purple-800 border border-brand-purple rounded px-1">${l.modoVenta}</span>` : ''}
                                        </div>
                                        <span class="text-[10px] text-gray-500 block">
                                            ${l.cantidad} × $${fmt(l.precioUsd)}
                                            ${l.modoVenta && l.modoVenta !== 'unidad' ? `· Presentación: <strong>${l.modoVenta}</strong> (${l.cantidad} ${l.cantidad === '1' ? 'empaque/presentación' : 'empaques/presentaciones'})` : '· Venta por Unidad individual'}
                                        </span>
                                    </div>
                                    <div class="text-right shrink-0 font-mono font-bold">
                                        <span class="text-brand-black">$${fmt(l.subtotalUsd)}</span>
                                        <span class="text-[10px] text-gray-500 block">Bs. ${fmt(l.subtotalBs)}</span>
                                    </div>
                                </div>
                            `).join('')
                            : `<p class="text-[10px] text-gray-400 italic">Detalle de líneas no disponible en este comprobante.</p>`
                        }
                    </div>
                    ${(t.pagos && t.pagos.length > 0) ? `
                        <div class="pt-1.5 border-t border-gray-200 flex flex-wrap justify-between items-center text-[10px] font-bold text-gray-600">
                            <span>Pagos: ${t.pagos.map(p => `${p.metodo} ($${fmt(p.montoUsd)}${p.moneda === 'BS' ? ` / Bs.${fmt(p.montoBs)}` : ''})`).join(', ')}</span>
                            ${t.vueltoBs && parseNum(t.vueltoBs) > 0 ? `<span class="text-emerald-800">Vuelto: Bs. ${fmt(t.vueltoBs)} (${t.estadoVuelto || 'PAGADO'})</span>` : ''}
                        </div>
                    ` : ''}
                    <div class="mt-2.5 pt-2 border-t border-gray-300 flex justify-end">
                        <button data-eliminar-ticket="${t.ventaId}" class="px-2.5 py-1 text-[10px] font-black uppercase text-red-700 bg-red-50 hover:bg-red-100 border border-red-400 rounded">
                            Eliminar Venta (Reintegrar Stock)
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        contenedor.querySelectorAll('[data-eliminar-ticket]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const vId = (btn as HTMLElement).dataset.eliminarTicket;
                if (!vId) return;
                const conf = await confirmarAccion(
                    `¿Deseas eliminar y anular permanentemente la venta ${vId}? Las unidades vendidas se restituirán automáticamente al inventario según su presentación.`,
                    'ANULAR VENTA Y REINTEGRAR INVENTARIO'
                );
                if (!conf) return;
                try {
                    await api.eliminarVenta(vId);
                    window.dispatchEvent(new CustomEvent('inventario_actualizado'));
                    mostrarToast(`Venta ${vId} eliminada e inventario restituido con éxito.`, 'success');
                    // Refrescar el modal
                    void abrirModalHistorialTurno(modalHost);
                } catch (e) {
                    mostrarToast('Error al eliminar la venta: ' + (e instanceof Error ? e.message : String(e)), 'error');
                }
            });
        });

        contenedor.querySelectorAll('[data-toggle-ticket-detalle]').forEach(el => {
            el.addEventListener('click', () => {
                const vId = (el as HTMLElement).dataset.toggleTicketDetalle;
                const det = contenedor.querySelector(`#detalle-ticket-${vId}`);
                const arr = contenedor.querySelector(`[data-arrow-detalle="${vId}"]`);
                if (det) {
                    const oculto = det.classList.contains('hidden');
                    if (oculto) {
                        det.classList.remove('hidden');
                        if (arr) arr.textContent = '▲';
                    } else {
                        det.classList.add('hidden');
                        if (arr) arr.textContent = '▼';
                    }
                }
            });
        });
    };

    renderTicketsPaginados();

    const cerrar = () => { modalHost.innerHTML = ''; };
    modalHost.querySelector('#btn-cerrar-historial-turno')?.addEventListener('click', cerrar);
    modalHost.querySelector('#btn-cerrar-historial-turno-footer')?.addEventListener('click', cerrar);

    modalHost.querySelector('#btn-arqueo-cerrar-turno-caja')?.addEventListener('click', async () => {
        try {
            const porMetodo: Record<string, { usd: number; bs: number; transacciones: number }> = {};
            ticketsTurno.forEach(t => {
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

            const conf = await confirmarArqueoCierreJornada({
                totalUsd: totalRecaudadoUsd,
                totalBs: totalRecaudadoBs,
                totalTickets: ticketsTurno.length,
                vueltoPagadoBs: parseNum(jornada.vueltoPagadoBs),
                vueltoRetenidoBs: parseNum(jornada.vueltoRetenidoBs),
                redondeoBs: totalRedondeoBs,
                redondeoUsd: totalRedondeoUsd,
                tasaInicio: parseNum(jornada.tasaInicio),
                operadores: operadoresActivos,
                inicioStr: formatFechaHoraVet(jornada.inicioUnix),
                porMetodo,
            });

            if (conf) {
                const cerrada = await cerrarJornadaGuiada();
                if (cerrada) {
                    cerrar();
                    mostrarToast(`Turno cerrado. Total: $${fmt(cerrada.ventasTotalUsd)} USD (Bs. ${fmt(cerrada.ventasTotalBs)})`, 'success');
                }
            }
        } catch (e) {
            mostrarToast('Error al cerrar el turno: ' + (e instanceof Error ? e.message : String(e)), 'error');
        }
    });
}

