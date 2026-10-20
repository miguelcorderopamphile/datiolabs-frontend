import { describe, it, expect } from 'vitest';
import { Money } from '../src/negocio/Money';

describe('Suite de Precisión Monetaria Exhaustiva (Money.ts)', () => {
    describe('Normalización a Centavos (toCents)', () => {
        it('maneja valores numéricos enteros y decimales', () => {
            expect(Money.toCents(10)).toBe(1000);
            expect(Money.toCents(10.5)).toBe(1050);
            expect(Money.toCents(10.99)).toBe(1099);
            expect(Money.toCents(0.01)).toBe(1);
        });

        it('maneja strings en formato venezolano / europeo (1.234,56)', () => {
            expect(Money.toCents('1.234,56')).toBe(123456);
            expect(Money.toCents('12,34')).toBe(1234);
            expect(Money.toCents('0,99')).toBe(99);
        });

        it('maneja strings en formato estándar (1234.56)', () => {
            expect(Money.toCents('1234.56')).toBe(123456);
            expect(Money.toCents('0.05')).toBe(5);
        });

        it('protección ante entradas nulas, vacías o malformadas', () => {
            expect(Money.toCents(null)).toBe(0);
            expect(Money.toCents(undefined)).toBe(0);
            expect(Money.toCents('')).toBe(0);
            expect(Money.toCents('   ')).toBe(0);
            expect(Money.toCents('invalido')).toBe(0);
            expect(Money.toCents(NaN)).toBe(0);
            expect(Money.toCents(Infinity)).toBe(0);
        });
    });

    describe('Conversión a String Decimal (centsToStr)', () => {
        it('formatea enteros a dos decimales con cero padding', () => {
            expect(Money.centsToStr(1234)).toBe('12.34');
            expect(Money.centsToStr(5)).toBe('0.05');
            expect(Money.centsToStr(0)).toBe('0.00');
            expect(Money.centsToStr(100)).toBe('1.00');
            expect(Money.centsToStr(-150)).toBe('-1.50');
        });
    });

    describe('Operaciones Aritméticas Cerradas', () => {
        it('suma múltiples importes sin error de acumulación flotante', () => {
            // Clásico error IEEE 754: 0.1 + 0.2 = 0.30000000000000004
            const total = Money.sum(0.1, 0.2);
            expect(total).toBe(30); // 30 centavos = 0.30
            expect(Money.centsToStr(total)).toBe('0.30');
        });

        it('sustracción exacta', () => {
            expect(Money.sub('10.00', '3.50')).toBe(650);
            expect(Money.sub('5.00', '10.00')).toBe(-500);
        });

        it('multiplicación escalada con cantidades pesables fraccionarias', () => {
            // 0.375 kg a $4.80 el kilo
            const subtotal = Money.mul('4.80', 0.375);
            expect(subtotal).toBe(180); // 180 centavos = $1.80
            expect(Money.centsToStr(subtotal)).toBe('1.80');
        });
    });

    describe('Conversión Cambiaria BCV Exacta', () => {
        it('conversión USD a Bs al centavo redondeado', () => {
            // $12.50 a tasa 82.40 Bs/$
            const bsCents = Money.usdToBsCents('12.50', 82.40);
            expect(bsCents).toBe(103000); // 1,030.00 Bs
            expect(Money.centsToStr(bsCents)).toBe('1030.00');
        });

        it('conversión Bs a USD al centavo redondeado', () => {
            // 1,030.00 Bs a tasa 82.40 Bs/$
            const usdCents = Money.bsToUsdCents('1030.00', 82.40);
            expect(usdCents).toBe(1250); // $12.50
            expect(Money.centsToStr(usdCents)).toBe('12.50');
        });

        it('protección ante tasa cero o negativa', () => {
            expect(Money.usdToBsCents('10.00', 0)).toBe(0);
            expect(Money.usdToBsCents('10.00', -50)).toBe(0);
            expect(Money.bsToUsdCents('100.00', 0)).toBe(0);
        });
    });

    describe('Formateo Visual Regional es-VE (fmt)', () => {
        it('aplica separador de miles con punto y decimal con coma', () => {
            const formatted = Money.fmt('1234567.89');
            // En es-VE: 1.234.567,89
            expect(formatted).toMatch(/1.*234.*567[,.]89/);
        });
    });
});
