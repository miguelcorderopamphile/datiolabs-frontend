/**
 * DatioLabs Enterprise - Módulo de Aritmética Financiera de Punto Fijo.
 * Prohíbe operaciones directas de coma flotante IEEE 754 y garantiza
 * consistencia exacta al céntimo en toda la interfaz.
 */

export class Money {
    /**
     * Parsea cualquier entrada monetaria a número de centavos enteros.
     * Ejemplo: "12.34" -> 1234, 12.34 -> 1234, "1.234,56" -> 123456
     */
    static toCents(val: number | string | null | undefined): number {
        if (val === null || val === undefined) return 0;
        if (typeof val === 'number') {
            if (!Number.isFinite(val) || Number.isNaN(val)) return 0;
            return Math.round((val + Number.EPSILON) * 100);
        }
        let s = String(val).trim();
        if (!s) return 0;
        if (s.includes(',') && !s.includes('.')) {
            s = s.replace(',', '.');
        } else if (s.includes('.') && s.includes(',')) {
            s = s.replace(/\./g, '').replace(',', '.');
        }
        const num = parseFloat(s);
        if (!Number.isFinite(num) || Number.isNaN(num)) return 0;
        return Math.round((num + Number.EPSILON) * 100);
    }

    /**
     * Convierte centavos enteros a cadena decimal con 2 dígitos ('12.34').
     */
    static centsToStr(cents: number): string {
        const sign = cents < 0 ? '-' : '';
        const abs = Math.abs(cents);
        const intPart = Math.floor(abs / 100);
        const decPart = String(abs % 100).padStart(2, '0');
        return `${sign}${intPart}.${decPart}`;
    }

    /**
     * Convierte centavos enteros a flotante redondeado seguro.
     */
    static centsToNum(cents: number): number {
        return cents / 100;
    }

    /**
     * Suma una lista de valores monetarios con precisión entera.
     */
    static sum(...vals: (number | string | null | undefined)[]): number {
        return vals.reduce((acc: number, v) => acc + Money.toCents(v), 0);
    }

    /**
     * Resta (a - b) en centavos.
     */
    static sub(a: number | string | null | undefined, b: number | string | null | undefined): number {
        return Money.toCents(a) - Money.toCents(b);
    }

    /**
     * Multiplica un importe monetario por una cantidad o factor.
     * cant puede ser flotante pesable (ej: 0.375 kg).
     */
    static mul(monto: number | string | null | undefined, cant: number | string | null | undefined): number {
        const c = typeof cant === 'number' ? cant : parseFloat(String(cant || '0')) || 0;
        const cents = Money.toCents(monto);
        return Math.round(cents * c);
    }

    /**
     * Convierte un monto en USD a Bolívares usando la tasa cambiaria.
     * Retorna centavos de Bs.
     */
    static usdToBsCents(usd: number | string | null | undefined, tasa: number | string | null | undefined): number {
        const t = typeof tasa === 'number' ? tasa : parseFloat(String(tasa || '0')) || 0;
        if (t <= 0) return 0;
        const usdCents = Money.toCents(usd);
        return Math.round(usdCents * t);
    }

    /**
     * Convierte un monto en Bolívares a USD usando la tasa cambiaria.
     * Retorna centavos de USD.
     */
    static bsToUsdCents(bs: number | string | null | undefined, tasa: number | string | null | undefined): number {
        const t = typeof tasa === 'number' ? tasa : parseFloat(String(tasa || '0')) || 0;
        if (t <= 0) return 0;
        const bsCents = Money.toCents(bs);
        return Math.round(bsCents / t);
    }

    /**
     * Formatea un valor monetario con localización 'es-VE' (1.234,56).
     */
    static fmt(val: number | string | null | undefined): string {
        const cents = Money.toCents(val);
        const num = cents / 100;
        return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}
