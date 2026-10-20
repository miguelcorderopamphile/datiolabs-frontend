import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ProductoInfo } from '../src/negocio/api';

vi.mock('../src/negocio/api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../src/negocio/api')>();
    return {
        ...actual,
        api: {
            ...actual.api,
            obtenerSemaforoStock: async () => ({ rojoMax: 5, amarilloMax: 15 }),
            obtenerJornadaActual: async () => ({ operadorActual: 'Cajera', operadoresActivos: ['Cajera'] }),
        },
    };
});

import { api } from '../src/negocio/api';
import { CajaViewModel } from '../src/negocio/CajaViewModel';
import { CajaView } from '../src/negocio/CajaView';
import { NegocioModel } from '../src/negocio/NegocioModel';

const cerveza: ProductoInfo = {
    sku: 'POLAR-01',
    nombre: 'Cerveza Polar Pilsen',
    precioUsd: '1.00',
    stock: '48',
    sinStock: false,
    capacidades: 1,
};

const agua: ProductoInfo = {
    sku: 'AGUA-01',
    nombre: 'Agua Mineral',
    precioUsd: '0.50',
    stock: '48',
    sinStock: false,
    capacidades: 1,
};

const clic = (sel: string) => {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) throw new Error(`No existe en el DOM: ${sel}`);
    el.click();
    return el;
};

describe('Caja: borrado de una linea del ticket', () => {
    let modelo: NegocioModel;
    let vm: CajaViewModel;
    let view: CajaView;

    beforeEach(() => {
        document.body.innerHTML = '<div id="root"></div><div id="modal-root"></div>';
        modelo = new NegocioModel();
        modelo.setTasa(80);
        vm = new CajaViewModel(modelo);
        view = new CajaView(
            document.getElementById('root') as HTMLElement,
            document.getElementById('modal-root') as HTMLElement,
            vm,
            modelo,
        );
        view.render();
    });

    it('el boton x de una linea solo borra esa linea', () => {
        vm.empujar(cerveza);
        vm.empujar(agua);

        // La cajera suma una cerveza de mas: misma linea, cantidad 2
        vm.empujar(cerveza);
        view.render();
        expect(vm.lineasCarrito).toHaveLength(2);

        clic('[data-quitar="POLAR-01"]');

        expect(vm.lineasCarrito).toHaveLength(1);
        expect(vm.lineasCarrito[0].sku).toBe('AGUA-01');
    });

    it('el boton - no puede llevar una linea a cero (se queda pegada en 1)', () => {
        vm.empujar(cerveza);
        vm.empujar(agua);
        vm.empujar(cerveza);
        view.render();

        clic('[data-menos="POLAR-01"]');
        expect(vm.lineasCarrito.find((l) => l.sku === 'POLAR-01')?.cantidad).toBe(1);

        // Segundo intento: la linea no desaparece nunca con el boton de restar
        clic('[data-menos="POLAR-01"]');
        expect(vm.lineasCarrito).toHaveLength(2);
        expect(vm.lineasCarrito.find((l) => l.sku === 'POLAR-01')?.cantidad).toBe(1);
    });

    it('con 2 unidades de la misma cerveza, el boton x se lleva la linea entera (no una sola)', () => {
        vm.empujar(cerveza);
        vm.empujar(cerveza); // la "cerveza de mas": la misma linea queda en 2
        expect(vm.lineasCarrito).toHaveLength(1);
        expect(vm.lineasCarrito[0].cantidad).toBe(2);

        clic('[data-quitar="POLAR-01"]');

        // Se borraron las dos: no hay forma de quitar una sola
        expect(vm.lineasCarrito).toHaveLength(0);
    });

    it('con 19 unidades en el ticket y stock real de 17, el boton - SI puede bajar sin trabarse', async () => {
        let stockServidor = '40';
        (api as unknown as { productos: () => Promise<ProductoInfo[]> }).productos = async () => [
            { ...cerveza, stock: stockServidor },
        ];

        for (let i = 0; i < 19; i++) vm.empujar(cerveza);
        await vm.cargar();
        expect(vm.lineasCarrito[0].cantidad).toBe(19);

        // El dueño corrige el inventario a 17
        stockServidor = '17';
        await vm.cargar();

        // La cajera puede bajar de 19 a 18 sin que el stock bloquee la disminucion
        clic('[data-menos="POLAR-01"]');
        expect(vm.lineasCarrito[0].cantidad).toBe(18);

        clic('[data-menos="POLAR-01"]');
        expect(vm.lineasCarrito[0].cantidad).toBe(17);
    });

    it('el carrito sobrevive al destruir y recrear la vista de caja', () => {
        vm.empujar(cerveza);
        expect(vm.lineasCarrito).toHaveLength(1);

        view.destroy();
        const vista2 = new CajaView(
            document.getElementById('root') as HTMLElement,
            document.getElementById('modal-root') as HTMLElement,
            vm,
            modelo,
        );
        vista2.render();
        expect(vm.lineasCarrito).toHaveLength(1);
        expect(vm.lineasCarrito[0].sku).toBe('POLAR-01');
        vista2.destroy();
    });

    it('el boton Vaciar pide confirmacion antes de limpiar el ticket', async () => {
        vm.empujar(cerveza);
        vm.empujar(agua);
        view.render();
        expect(vm.lineasCarrito).toHaveLength(2);

        clic('#caja-vaciar');

        // Abre el modal de confirmacion en document.body con el titulo VACIAR TICKET
        expect(document.body.textContent).toContain('VACIAR TICKET');
        expect(vm.lineasCarrito).toHaveLength(2); // No se vacía antes de confirmar
    });
});
