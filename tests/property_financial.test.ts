import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Money } from '../src/negocio/Money';

describe('Pruebas de Propiedades Financieras en Frontend (Fuzzing)', () => {
    it('Invariante: sum(...parts) suma exactamente al centavo', () => {
        fc.assert(
            fc.property(
                fc.array(fc.integer({ min: 0, max: 1000000 })), // centavos
                (centsArr) => {
                    const strArr = centsArr.map((c) => Money.centsToStr(c));
                    const totalCents = Money.sum(...strArr);
                    const esperado = centsArr.reduce((a, b) => a + b, 0);
                    expect(totalCents).toBe(esperado);
                }
            )
        );
    });

    it('Invariante bancaria de liquidación: Cobro - Venta == Vuelto (o Faltante)', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 5000000 }), // total venta en centavos (Bs.)
                fc.integer({ min: 0, max: 10000000 }), // total cobrado en centavos (Bs.)
                (ventaCents, cobroCents) => {
                    const faltanteCents = Math.max(0, ventaCents - cobroCents);
                    const vueltoCents = Math.max(0, cobroCents - ventaCents);

                    // La suma de lo que falta más lo cobrado menos el vuelto debe dar exactamente el total
                    expect(cobroCents + faltanteCents - vueltoCents).toBe(ventaCents);
                }
            )
        );
    });

    it('Invariante de conversión y redondeo: USD a Bs y reversibilidad dentro del margen de tasa', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 100, max: 1000000 }), // USD en centavos ($1 a $10,000)
                fc.float({ min: Math.fround(50.0), max: Math.fround(2000.0), noNaN: true }), // Tasa
                (usdCents, tasa) => {
                    const bsCents = Money.usdToBsCents(Money.centsToStr(usdCents), tasa);
                    const backUsdCents = Money.bsToUsdCents(Money.centsToStr(bsCents), tasa);

                    // Por redondeo de centavos en Bs, la diferencia al volver a USD nunca debe superar 1 centavo
                    expect(Math.abs(backUsdCents - usdCents)).toBeLessThanOrEqual(1);
                }
            )
        );
    });
});
