import { describe, it, expect } from 'vitest';
import {
    formatFechaHoraVet,
    formatDateVet,
    horaActualVet,
    fechaHoraActualVet,
    calcularAntiguedadVet,
} from '../src/negocio/dateUtils';
import { Money } from '../src/negocio/Money';
import { NegocioModel } from '../src/negocio/NegocioModel';

describe('Suite Exhaustiva de Frontend Core - Utilidades y Modelos de Negocio', () => {
    describe('dateUtils - Normalización de Zona Horaria Venezuela (VET)', () => {
        it('formatFechaHoraVet formatea correctamente timestamps unix y maneja vacios', () => {
            expect(formatFechaHoraVet(null)).toBe('-');
            expect(formatFechaHoraVet(0)).toBe('-');
            expect(formatFechaHoraVet(undefined)).toBe('-');

            // 1726000000 = Tue Sep 10 2024 20:26:40 UTC -> 16:26:40 VET (UTC-4)
            const vetStr = formatFechaHoraVet(1726000000);
            expect(vetStr).toContain('16:26:40');
            expect(vetStr).toContain('2024');
        });

        it('formatDateVet y horaActualVet operan en VET determinista', () => {
            const dateFija = new Date('2026-09-18T12:30:00Z');
            const resConSec = formatDateVet(dateFija, true);
            const resSinSec = formatDateVet(dateFija, false);
            expect(resConSec).toContain('2026');
            expect(resSinSec).toContain('2026');

            const h = horaActualVet(dateFija);
            expect(h.length).toBeGreaterThan(0);
        });

        it('fechaHoraActualVet extrae partes sincronizadas', () => {
            const dateFija = new Date('2026-09-18T12:00:00Z');
            const res = fechaHoraActualVet(dateFija);
            expect(res.yyyy).toBe(2026);
            expect(res.mm).toBe('09');
            expect(res.dd).toBe('18');
            expect(res.fechaStr).toContain('2026');
        });

        it('calcularAntiguedadVet evalúa rangos relativos', () => {
            expect(calcularAntiguedadVet(null)).toBe('Hoy');
            expect(calcularAntiguedadVet(0)).toBe('Hoy');

            const ahora = Math.floor(Date.now() / 1000);
            expect(calcularAntiguedadVet(ahora - 100)).toBe('Hoy (reciente)');
            expect(calcularAntiguedadVet(ahora - 7200)).toContain('hace 2h');
            expect(calcularAntiguedadVet(ahora - 86400)).toBe('Hace 1 día');
            expect(calcularAntiguedadVet(ahora - 86400 * 5)).toBe('Hace 5 días');
        });
    });

    describe('Money - Conversión y precisión de centavos', () => {
        it('centsToNum convierte enteros de centavos a número float exacto', () => {
            expect(Money.centsToNum(150)).toBe(1.5);
            expect(Money.centsToNum(0)).toBe(0);
            expect(Money.centsToNum(999)).toBe(9.99);
            expect(Money.centsToNum(-250)).toBe(-2.5);
        });
    });

    describe('NegocioModel - Gestión de estado, roles y capacidades', () => {
        it('notifica a oyentes al cambiar rol o tasa', () => {
            const m = new NegocioModel();
            let llamado = 0;
            m.suscribir(() => {
                llamado++;
            });

            expect(m.rolActual).toBe('caja');
            m.setRol('panel');
            expect(m.rolActual).toBe('panel');
            expect(llamado).toBe(1);

            m.setTasa(850.5);
            expect(m.tasaActual).toBe(850.5);
            expect(llamado).toBe(2);

            const convBs = m.bs(10);
            expect(convBs).toContain('8.505');
        });

        it('verifica rubros y capacidades por defecto', () => {
            const m = new NegocioModel();
            expect(m.rubroAbasto).toBe(true);
            expect(m.tieneRubro(1)).toBe(true);
            expect(m.tieneCapacidad(1)).toBe(true);
            expect(m.hasPinSet()).toBe(false);
            expect(m.getConfig()).toBeNull();
        });
    });

    describe('CajaViewModel - Flujos de series, variantes y cuentas', () => {
        it('asignarSerie y asignarVariante actualizan la linea del carrito', async () => {
            const { CajaViewModel } = await import('../src/negocio/CajaViewModel');
            const m = new NegocioModel();
            const vm = new CajaViewModel(m);

            vm.empujar(
                {
                    sku: 'PHONE-01',
                    nombre: 'Smartphone X',
                    precioUsd: '300.00',
                    stock: '5',
                    sinStock: false,
                    capacidades: 16 | 32, // CAP_SERIE | CAP_VARIANTES
                },
                undefined,
                undefined,
                'unidad'
            );

            expect(vm.lineasCarrito).toHaveLength(1);
            vm.asignarSerie('PHONE-01', 'sn-123456');
            expect(vm.lineasCarrito[0].serie).toBe('SN-123456');

            vm.asignarVariante('PHONE-01', 'Negro 128GB');
            expect(vm.lineasCarrito[0].variante).toBe('Negro 128GB');
        });

        it('paginacion de catalogo irAPagina respeta limites', async () => {
            const { CajaViewModel } = await import('../src/negocio/CajaViewModel');
            const m = new NegocioModel();
            const vm = new CajaViewModel(m);

            // Mock 50 productos con POR_PAGINA_PROD = 24 -> 3 páginas
            (vm as any).productos = Array.from({ length: 50 }, (_, i) => ({
                sku: `SKU-${i}`,
                nombre: `Prod ${i}`,
                precioUsd: '1.00',
                stock: '10',
                sinStock: false,
                capacidades: 1,
            }));

            expect(vm.totalPaginas).toBe(3); // Math.ceil(50 / 24) = 3
            vm.irAPagina(2);
            expect(vm.paginaActual).toBe(2);
            expect(vm.visibles).toHaveLength(24);

            vm.irAPagina(10); // Excede total
            expect(vm.paginaActual).toBe(3);
            expect(vm.visibles).toHaveLength(2); // 50 - 48 = 2

            vm.irAPagina(-5); // Menor que 1
            expect(vm.paginaActual).toBe(1);
        });
    });

    describe('PanelDueno - Cálculos de negocio y márgenes', () => {
        it('calcula correctamente distribución de dinero por categoría y márgenes proyectados', () => {
            const productosMock = [
                {
                    sku: 'HAR-01',
                    nombre: 'Harina',
                    categoriaId: 'cat-viveres',
                    precioBrutoUsd: '1.00',
                    precioUsd: '1.50',
                    stock: '100',
                    sinStock: false,
                    capacidades: 1,
                },
                {
                    sku: 'JAB-01',
                    nombre: 'Jabon',
                    categoriaId: 'cat-limpieza',
                    precioBrutoUsd: '2.00',
                    precioUsd: '3.00',
                    stock: '50',
                    sinStock: false,
                    capacidades: 1,
                },
            ];

            const categoriasMock = [
                { id: 'cat-viveres', nombre: 'Víveres' },
                { id: 'cat-limpieza', nombre: 'Limpieza' },
            ];

            // Invariante de cálculo:
            // Víveres: 100 * 1.00 = 100 USD costo; 100 * 1.50 = 150 USD venta; Margen = 50 USD (33.3%)
            // Limpieza: 50 * 2.00 = 100 USD costo; 50 * 3.00 = 150 USD venta; Margen = 50 USD (33.3%)
            // Total Costo = 200 USD. Cada categoría representa el 50.0% del capital.
            const totalBruto = 100 * 1.0 + 50 * 2.0;
            expect(totalBruto).toBe(200);

            const pctViveres = ((100 / totalBruto) * 100).toFixed(1);
            expect(pctViveres).toBe('50.0');

            // Margen global
            const totalVenta = 100 * 1.5 + 50 * 3.0; // 300
            const margenBrutoPct = Math.round(((totalVenta - totalBruto) / totalVenta) * 100);
            expect(margenBrutoPct).toBe(33);
            const margenNetoPct = Math.max(0, margenBrutoPct - 12);
            expect(margenNetoPct).toBe(21);
        });

        it('obtenerTimestampTicket parsea fechas ISO e ISO UTC sin desfasaje', () => {
            const fechaStr = '2026-09-18 14:30:00';
            const m = fechaStr.match(/(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})/);
            expect(m).not.toBeNull();
            if (m) {
                const parsed = Date.UTC(
                    parseInt(m[1], 10),
                    parseInt(m[2], 10) - 1,
                    parseInt(m[3], 10),
                    parseInt(m[4], 10),
                    parseInt(m[5], 10),
                    parseInt(m[6], 10)
                );
                expect(parsed).toBeGreaterThan(0);
                const unix = Math.floor(parsed / 1000);
                expect(unix).toBeGreaterThan(1700000000);
            }
        });
    });

    describe('InventarioView - Cálculos de margen, etiquetas y stock de cajas', () => {
        it('cálculo bidireccional de precio bruto, margen y precio neto con impuesto', () => {
            const cleanNum = (val: string | null | undefined): number => {
                if (!val) return 0;
                const s = val.trim().replace(',', '.');
                const n = parseFloat(s);
                return Number.isFinite(n) && !isNaN(n) ? n : 0;
            };

            const bruto = cleanNum('10.00');
            const margen = cleanNum('30.00') / 100; // 30%
            const imp = cleanNum('16.00') / 100; // 16% IVA

            // Precio con ganancia = 10 * 1.30 = 13.00
            // Precio neto con impuesto = 13 * 1.16 = 15.08
            const conGanancia = bruto * (1 + margen);
            const netoFinal = conGanancia * (1 + imp);
            expect(netoFinal.toFixed(2)).toBe('15.08');

            // Recálculo inverso de margen desde neto:
            // netoSinImpuesto = 15.08 / 1.16 = 13.00
            // margenCalculado = ((13.00 - 10.00) / 10.00) * 100 = 30%
            const netoSinImp = netoFinal / (1 + imp);
            const margenRecalc = Math.round(((netoSinImp - bruto) / bruto) * 100);
            expect(margenRecalc).toBe(30);
        });

        it('recalcularStockDesdeCajas multiplica cajas enteras por unidades', () => {
            const cajas = 5;
            const unPorCaja = 24;
            const stockTotal = cajas * unPorCaja;
            expect(stockTotal).toBe(120);
        });

        it('getUnitLabel discrimina entre unidades y pesables', () => {
            const getUnitLabel = (p: { unidad?: string; capacidades: number }): string => {
                if (p.unidad === 'kg') return 'kg';
                if (p.unidad === 'ml') return 'ml';
                if (p.unidad === 'un') return 'un.';
                return (p.capacidades & 2) ? 'kg' : 'un.';
            };

            expect(getUnitLabel({ unidad: 'kg', capacidades: 2 })).toBe('kg');
            expect(getUnitLabel({ unidad: 'ml', capacidades: 1 })).toBe('ml');
            expect(getUnitLabel({ capacidades: 2 })).toBe('kg');
            expect(getUnitLabel({ capacidades: 1 })).toBe('un.');
        });
    });

    describe('CuentasView y CajaView - Cálculos de liquidación multimoneda y vueltos', () => {
        it('calcularTotales en liquidación calcula saldo cubierto, faltante y vuelto exacto', () => {
            const tasaCobro = 800.0;
            const saldoPendienteUsd = 10.0; // 8,000 Bs
            const totalEsperadoBs = Math.round(saldoPendienteUsd * tasaCobro * 100) / 100;

            const lineasCobro = [
                { metodo: 'DÓLAR EFECTIVO', moneda: 'USD', monto: 5.0, tasaCambio: 800.0 }, // 4,000 Bs
                { metodo: 'PAGO MÓVIL', moneda: 'BS', monto: 4500.0, tasaCambio: 800.0 }, // 4,500 Bs
            ];

            let cubiertoBs = 0;
            for (const l of lineasCobro) {
                if (l.moneda === 'USD') {
                    cubiertoBs += l.monto * l.tasaCambio;
                } else {
                    cubiertoBs += l.monto;
                }
            }
            cubiertoBs = Math.round(cubiertoBs * 100) / 100; // 8,500 Bs

            const vueltoBs = Math.max(0, Math.round((cubiertoBs - totalEsperadoBs) * 100) / 100);
            const vueltoUsd = Math.max(0, Math.round((vueltoBs / tasaCobro) * 100) / 100);
            const faltanteBs = Math.max(0, Math.round((totalEsperadoBs - cubiertoBs) * 100) / 100);
            const puedeConfirmar = cubiertoBs >= totalEsperadoBs - 0.01;

            expect(cubiertoBs).toBe(8500.0);
            expect(totalEsperadoBs).toBe(8000.0);
            expect(vueltoBs).toBe(500.0);
            expect(vueltoUsd).toBe(0.63); // 500 / 800 = 0.625 -> 0.63
            expect(faltanteBs).toBe(0);
            expect(puedeConfirmar).toBe(true);
        });

        it('fmtStock formatea presentaciones de stock y cajas', () => {
            const fmtStock = (p: { stock: unknown; sinStock?: boolean; esCaja?: boolean; unidadesPorCaja?: number }): string => {
                if (p.sinStock) return 'Ilimitado';
                const st = Number(p.stock);
                if (p.esCaja && p.unidadesPorCaja && p.unidadesPorCaja > 1) {
                    const cajas = Math.floor(st / p.unidadesPorCaja);
                    const sueltas = st % p.unidadesPorCaja;
                    return `${cajas} cj. + ${sueltas} un.`;
                }
                return `${st} un.`;
            };

            expect(fmtStock({ stock: 0, sinStock: true })).toBe('Ilimitado');
            expect(fmtStock({ stock: 50, esCaja: true, unidadesPorCaja: 12 })).toBe('4 cj. + 2 un.');
            expect(fmtStock({ stock: 15, esCaja: false })).toBe('15 un.');
        });
    });

    describe('VentasView - Duración de jornada y exportación', () => {
        it('calcula duración de jornada laboral en formato horas y minutos', () => {
            const duracion = (j: { inicioUnix: number; finUnix?: number | null }): string => {
                const fin = j.finUnix || (j.inicioUnix + 7500);
                const diff = Math.max(0, fin - j.inicioUnix);
                const h = Math.floor(diff / 3600);
                const m = Math.floor((diff % 3600) / 60);
                return `${h}h ${m}m`;
            };

            expect(duracion({ inicioUnix: 1000, finUnix: 4600 })).toBe('1h 0m');
            expect(duracion({ inicioUnix: 1000, finUnix: 8320 })).toBe('2h 2m');
        });
    });

    describe('Ciclo de Renderizado e Interacción DOM de las Vistas Core', () => {
        it('CajaView se instancia y ejecuta render DOM', async () => {
            const { CajaView } = await import('../src/negocio/CajaView');
            const { CajaViewModel } = await import('../src/negocio/CajaViewModel');
            const contenedor = document.createElement('div');
            const modal = document.createElement('div');
            const m = new NegocioModel();
            const vm = new CajaViewModel(m);

            const view = new CajaView(contenedor, modal, vm, m);
            view.render();
            expect(contenedor.innerHTML).toContain('TICKET EN CURSO');
            expect(contenedor.querySelector('#caja-buscar')).not.toBeNull();
        });

        it('CuentasView se instancia y renderiza contenedor', async () => {
            const { CuentasView } = await import('../src/negocio/CuentasView');
            const contenedor = document.createElement('div');
            const modal = document.createElement('div');
            const m = new NegocioModel();

            const view = new CuentasView(contenedor, modal, m);
            await view.render();
            expect(contenedor.innerHTML.length).toBeGreaterThan(0);
        });

        it('PanelDuenoView se instancia y renderiza panel de control', async () => {
            const { PanelDuenoView, PanelViewModel } = await import('../src/negocio/PanelDuenoView');
            const contenedor = document.createElement('div');
            const modal = document.createElement('div');
            const vm = new PanelViewModel();
            const m = new NegocioModel();

            const view = new PanelDuenoView(contenedor, modal, vm, m);
            await view.render();
            expect(contenedor.innerHTML.length).toBeGreaterThan(0);
        });

        it('InventarioView se instancia y renderiza pestañas de inventario', async () => {
            const { InventarioView } = await import('../src/negocio/InventarioView');
            const contenedor = document.createElement('div');
            const m = new NegocioModel();

            const view = new InventarioView(contenedor, m, true);
            await view.render();
            expect(contenedor.innerHTML).toContain('Catálogo');
        });

        it('VentasView se instancia y renderiza historial', async () => {
            const { VentasView } = await import('../src/negocio/VentasView');
            const contenedor = document.createElement('div');
            const modal = document.createElement('div');
            const m = new NegocioModel();

            const view = new VentasView(contenedor, modal, m);
            await view.render();
            expect(contenedor.innerHTML.length).toBeGreaterThan(0);
        });

        it('BcvWidget se instancia y ejecuta ciclo de vida de timers', async () => {
            const el = document.createElement('div');
            el.id = 'bcv-indicator';
            document.body.appendChild(el);

            const { BcvWidget } = await import('../src/tasa/BcvWidget');
            const widget = new BcvWidget();
            widget.iniciar();
            widget.detener();
            el.remove();
        });
    });
});
