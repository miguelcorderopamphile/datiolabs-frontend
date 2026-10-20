import { describe, expect, it } from 'vitest';
import { calcularBsDesdeUsd, calcularUsdDesdeBs } from '../src/negocio/CajaView';

describe('calculadora rapida de caja', () => {
    it('convierte USD a Bs con la tasa aplicada (manual o BCV)', () => {
        expect(calcularBsDesdeUsd(20, 961.75)).toBe('19235.00');
        expect(calcularBsDesdeUsd(20, 849.564)).toBe('16991.28');
        expect(calcularBsDesdeUsd(1.5, 1000)).toBe('1500.00');
    });

    it('convierte Bs a USD con la tasa aplicada', () => {
        expect(calcularUsdDesdeBs(5000, 961.75)).toBe('5.20');
        expect(calcularUsdDesdeBs(1000, 1000)).toBe('1.00');
        expect(calcularUsdDesdeBs(16991.28, 849.564)).toBe('20.00');
    });

    it('devuelve vacio ante valores invalidos o tasa cero, sin romper', () => {
        expect(calcularBsDesdeUsd(0, 900)).toBe('');
        expect(calcularBsDesdeUsd(-5, 900)).toBe('');
        expect(calcularBsDesdeUsd(20, 0)).toBe('');
        expect(calcularBsDesdeUsd(Number.NaN, 900)).toBe('');
        expect(calcularUsdDesdeBs(0, 900)).toBe('');
        expect(calcularUsdDesdeBs(5000, 0)).toBe('');
    });

    it('es coherente en ida y vuelta', () => {
        const tasa = 913.42;
        const bs = Number(calcularBsDesdeUsd(37.5, tasa));
        expect(Number(calcularUsdDesdeBs(bs, tasa))).toBeCloseTo(37.5, 1);
    });
});
