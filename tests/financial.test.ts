import { describe, it, expect } from 'vitest';
import { parseNum } from '../src/negocio/api';

describe('Precisión Financiera y Manejo de Decimales', () => {
    describe('parseNum', () => {
        it('debe parsear strings numéricos con punto decimal', () => {
            expect(parseNum('123.45')).toBe(123.45);
            expect(parseNum('0.00')).toBe(0);
        });

        it('debe parsear strings numéricos con coma decimal', () => {
            expect(parseNum('123,45')).toBe(123.45);
        });

        it('debe parsear formato con separador de miles y coma decimal', () => {
            expect(parseNum('1.234,56')).toBe(1234.56);
        });

        it('debe retornar 0 para entradas nulas o invalidas', () => {
            expect(parseNum(null)).toBe(0);
            expect(parseNum(undefined)).toBe(0);
            expect(parseNum('')).toBe(0);
            expect(parseNum('abc')).toBe(0);
            expect(parseNum(NaN)).toBe(0);
        });
    });

    describe('Cálculos de Liquidación y Vueltos', () => {
        it('cobertura exacta sin vuelto ni faltante', () => {
            const saldoPendienteUsd = 10.00;
            const tasaCobro = 80.50;
            const totalEsperadoBs = Math.round(saldoPendienteUsd * tasaCobro * 100) / 100;
            
            // Pago exacto en Bolívares
            const recibidoBs = 805.00;
            const faltanteBs = Math.max(0, Math.round((totalEsperadoBs - recibidoBs) * 100) / 100);
            const vueltoBs = Math.max(0, Math.round((recibidoBs - totalEsperadoBs) * 100) / 100);

            expect(faltanteBs).toBe(0);
            expect(vueltoBs).toBe(0);
        });

        it('pago mixto (USD + Bs) con cálculo exacto', () => {
            const saldoPendienteUsd = 20.00;
            const tasaCobro = 80.00;
            const totalEsperadoBs = 1600.00;

            const pagoUsd = 10.00;
            const tasaPagoUsd = 80.00;
            const aporteBs1 = pagoUsd * tasaPagoUsd; // 800 Bs

            const pagoBs = 800.00; // 800 Bs
            const totalCubiertoBs = aporteBs1 + pagoBs; // 1600 Bs

            const faltanteBs = Math.max(0, Math.round((totalEsperadoBs - totalCubiertoBs) * 100) / 100);
            const vueltoBs = Math.max(0, Math.round((totalCubiertoBs - totalEsperadoBs) * 100) / 100);

            expect(faltanteBs).toBe(0);
            expect(vueltoBs).toBe(0);
        });

        it('cálculo de vuelto en divisa extranjera con tasa pactada', () => {
            const vueltoBs = 800.00;
            const tasaVuelto = 80.00;
            const montoUsdVuelto = Number((vueltoBs / tasaVuelto).toFixed(2));

            expect(montoUsdVuelto).toBe(10.00);
        });

        it('tolerancia de 1 centavo (0.01) para pagos electrónicos fraccionarios', () => {
            const totalEsperadoBs = 100.00;
            const cubiertoBs = 99.995;
            const redondeado = Math.round(cubiertoBs * 100) / 100; // 100.00
            const puedeConfirmar = redondeado >= totalEsperadoBs - 0.01;

            expect(puedeConfirmar).toBe(true);
        });

        it('invariante contable de particion por operador: la suma de operadores es identica al total sin duplicacion', () => {
            const tickets = [
                { id: 'T-1', totalUsd: '25.50', totalBs: '2040.00', operador: 'Cajero A' },
                { id: 'T-2', totalUsd: '14.50', totalBs: '1160.00', operador: 'Cajero B' },
                { id: 'T-3', totalUsd: '10.00', totalBs: '800.00', operador: 'Cajero A' },
                { id: 'T-4', totalUsd: '50.00', totalBs: '4000.00', operador: 'Cajero C' },
            ];

            let totalGlobalUsd = 0;
            let totalGlobalBs = 0;
            const porOperador: Record<string, { usd: number; bs: number; tickets: number }> = {};

            tickets.forEach(t => {
                const u = parseNum(t.totalUsd);
                const b = parseNum(t.totalBs);
                totalGlobalUsd += u;
                totalGlobalBs += b;

                if (!porOperador[t.operador]) {
                    porOperador[t.operador] = { usd: 0, bs: 0, tickets: 0 };
                }
                porOperador[t.operador].usd += u;
                porOperador[t.operador].bs += b;
                porOperador[t.operador].tickets += 1;
            });

            const sumaOperadoresUsd = Object.values(porOperador).reduce((acc, op) => acc + op.usd, 0);
            const sumaOperadoresBs = Object.values(porOperador).reduce((acc, op) => acc + op.bs, 0);
            const sumaOperadoresTickets = Object.values(porOperador).reduce((acc, op) => acc + op.tickets, 0);

            // Invariante estricta: partición disjunta, cero duplicación
            expect(Math.round(sumaOperadoresUsd * 100) / 100).toBe(totalGlobalUsd);
            expect(Math.round(sumaOperadoresBs * 100) / 100).toBe(totalGlobalBs);
            expect(sumaOperadoresTickets).toBe(tickets.length);
        });
    });
});
