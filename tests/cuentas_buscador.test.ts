import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CuentasView } from '../src/negocio/CuentasView';
import { api, CuentaAbierta } from '../src/negocio/api';
import type { NegocioModel } from '../src/negocio/NegocioModel';

vi.mock('../src/negocio/api', () => ({
    api: {
        cuentas: vi.fn(),
        productos: vi.fn(),
        agregarConsumo: vi.fn(),
        eliminarConsumo: vi.fn(),
        convertirCuentaADeuda: vi.fn(),
    },
}));

const cuenta = (over: Partial<CuentaAbierta>): CuentaAbierta => ({
    ventaId: 'id-' + Math.random().toString(36).slice(2, 10),
    etiqueta: 'DEUDA',
    lineas: 1,
    totalParcialUsd: '10.00',
    totalParcialBs: '9617.50',
    abonosUsd: '0',
    abonosBs: '0',
    tipo: 'deuda',
    fechaCreacionUnix: 1790000000,
    ...over,
});

const modeloStub = {
    tieneRubro: () => false,
    tasaActual: 961.75,
    bs: (n: number) => String(n),
} as unknown as NegocioModel;

const montar = async (cuentas: CuentaAbierta[]) => {
    vi.mocked(api.cuentas).mockResolvedValue(cuentas);
    vi.mocked(api.productos).mockResolvedValue([]);
    const cont = document.createElement('div');
    const modal = document.createElement('div');
    document.body.append(cont, modal);
    const vista = new CuentasView(cont, modal, modeloStub);
    await vista.render();
    return { cont, modal, vista };
};

const escribir = (input: HTMLInputElement, texto: string) => {
    input.value = texto;
    input.dispatchEvent(new Event('input', { bubbles: true }));
};

beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
});

describe('CUENTAS: buscador local sin romper la retícula', () => {
    it('la barra de búsqueda queda FUERA del grid y el grid conserva sus 2 columnas', async () => {
        const { cont } = await montar([
            cuenta({ etiqueta: 'MARIA PEREZ', cliente: 'Maria Perez' }),
            cuenta({ etiqueta: 'JOSE LOPEZ', cliente: 'Jose Lopez' }),
        ]);
        const grid = cont.querySelector<HTMLElement>('.grid.lg\\:grid-cols-3');
        expect(grid).toBeTruthy();
        expect(grid!.children.length).toBe(2);
        expect(grid!.querySelector('#cta-buscar-deuda')).toBeNull();
        const barra = cont.querySelector<HTMLElement>('#cta-buscar-deuda')!;
        expect(barra).toBeTruthy();
        expect(barra.getAttribute('maxlength')).toBe('40');
        const hijos = Array.from(cont.children);
        expect(hijos.indexOf(barra.closest('div.mb-3') as HTMLElement)).toBeLessThan(hijos.indexOf(grid!));
    });

    it('filtra por nombre, cliente y nota sin repintar la vista completa (input y foco intactos)', async () => {
        const { cont } = await montar([
            cuenta({ etiqueta: 'MARIA PEREZ', cliente: 'Maria Perez' }),
            cuenta({ etiqueta: 'JOSE LOPEZ', cliente: 'Jose Lopez', nota: 'paga viernes' }),
        ]);
        const input = cont.querySelector<HTMLInputElement>('#cta-buscar-deuda')!;
        input.focus();
        escribir(input, 'maria');
        expect(cont.querySelector('#cta-buscar-deuda')).toBe(input);
        expect(document.activeElement).toBe(input);
        let wrap = cont.querySelector<HTMLElement>('#cta-lista-wrap')!;
        expect(wrap.textContent).toContain('MARIA PEREZ');
        expect(wrap.textContent).not.toContain('JOSE LOPEZ');
        expect(cont.querySelector<HTMLElement>('#cta-buscar-contador')!.textContent).toBe('1 registros');

        escribir(input, 'viernes');
        wrap = cont.querySelector<HTMLElement>('#cta-lista-wrap')!;
        expect(wrap.textContent).toContain('JOSE LOPEZ');
        expect(wrap.textContent).not.toContain('MARIA PEREZ');

        escribir(input, 'no-existe-xyz');
        wrap = cont.querySelector<HTMLElement>('#cta-lista-wrap')!;
        expect(wrap.textContent).toContain('No hay registros');
    });

    it('el botón × limpia y restaura la lista completa', async () => {
        const { cont } = await montar([
            cuenta({ etiqueta: 'MARIA PEREZ' }),
            cuenta({ etiqueta: 'JOSE LOPEZ' }),
        ]);
        const input = cont.querySelector<HTMLInputElement>('#cta-buscar-deuda')!;
        escribir(input, 'maria');
        cont.querySelector<HTMLButtonElement>('#cta-buscar-limpiar')!.click();
        expect(input.value).toBe('');
        expect(cont.querySelector<HTMLElement>('#cta-lista-wrap')!.textContent).toContain('JOSE LOPEZ');
        expect(cont.querySelector<HTMLElement>('#cta-buscar-contador')!.textContent).toBe('2 registros');
    });

    it('clic en tarjeta tras filtrar sigue seleccionando el registro', async () => {
        const { cont } = await montar([
            cuenta({ ventaId: 'aaaa-1111', etiqueta: 'MARIA PEREZ', cliente: 'Maria Perez' }),
            cuenta({ ventaId: 'bbbb-2222', etiqueta: 'JOSE LOPEZ', cliente: 'Jose Lopez' }),
        ]);
        const input = cont.querySelector<HTMLInputElement>('#cta-buscar-deuda')!;
        escribir(input, 'maria');
        const card = cont.querySelector<HTMLElement>('[data-cuenta-id="aaaa-1111"]')!;
        card.click();
        await vi.waitFor(() => {
            const detalle = cont.querySelector<HTMLElement>('.lg\\:col-span-2')!;
            expect(detalle.textContent).toContain('MARIA PEREZ');
        });
        expect(cont.querySelector<HTMLElement>('#cta-buscar-deuda')).toBe(input);
        expect(detalleCliente(cont)).toContain('Maria Perez');
    });

    it('pagina de a 15 y el filtro vuelve a la página 1', async () => {
        const muchas = Array.from({ length: 20 }, (_, i) =>
            cuenta({ ventaId: `p-${i}`, etiqueta: `CLIENTE ${String(i).padStart(2, '0')}` }),
        );
        const { cont } = await montar(muchas);
        let wrap = cont.querySelector<HTMLElement>('#cta-lista-wrap')!;
        expect(wrap.textContent).toContain('Pág. 1 de 2');
        cont.querySelector<HTMLButtonElement>('#cta-pag-sig')!.click();
        wrap = cont.querySelector<HTMLElement>('#cta-lista-wrap')!;
        expect(wrap.textContent).toContain('Pág. 2 de 2');

        const input = cont.querySelector<HTMLInputElement>('#cta-buscar-deuda')!;
        escribir(input, 'cliente 19');
        wrap = cont.querySelector<HTMLElement>('#cta-lista-wrap')!;
        expect(wrap.textContent).toContain('CLIENTE 19');
        expect(wrap.textContent).not.toContain('CLIENTE 18');
        expect(wrap.textContent).not.toContain('Pág.');
    });
});

const detalleCliente = (cont: HTMLElement): string => {
    const detalle = cont.querySelector<HTMLElement>('.lg\\:col-span-2');
    return detalle ? detalle.textContent || '' : '';
};
