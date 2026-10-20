import { describe, it, expect, beforeEach } from 'vitest';
import { CajaViewModel } from '../src/negocio/CajaViewModel';
import { NegocioModel } from '../src/negocio/NegocioModel';
import type { ProductoInfo } from '../src/negocio/api';

describe('Suite de Lógica de Carrito y Estado (CajaViewModel)', () => {
    let modelo: NegocioModel;
    let vm: CajaViewModel;

    const productoPrueba: ProductoInfo = {
        sku: 'HAR-01',
        nombre: 'Harina de Maíz',
        precioUsd: '1.50',
        stock: '10',
        sinStock: false,
        capacidades: 1, // CAP_UNITARIA
        presentaciones: [
            {
                nombre: 'Bulto 20',
                precioUsd: '28.00',
                unidades: 20,
            },
        ],
    };

    const productoPesable: ProductoInfo = {
        sku: 'QUE-01',
        nombre: 'Queso Blanco Llanero',
        precioUsd: '6.00',
        stock: '5.5',
        sinStock: false,
        capacidades: 2, // CAP_PESABLE
        unidad: 'kg',
    };

    beforeEach(() => {
        modelo = new NegocioModel();
        modelo.setTasa(80.00); // 80 Bs/$
        vm = new CajaViewModel(modelo);
    });

    it('empujar producto unitario calcula totales exactos y bloquea la tasa', () => {
        const err = vm.empujar(productoPrueba, undefined, undefined, 'unidad');
        expect(err).toBeNull();

        expect(vm.lineasCarrito).toHaveLength(1);
        expect(vm.lineasCarrito[0].cantidad).toBe(1);
        expect(vm.lineasCarrito[0].precioUsd).toBe(1.50);

        // Totales
        expect(vm.totalUsd).toBe(1.50);
        expect(vm.totalBs).toBe(120.00); // 1.50 * 80.00

        // Invariante de tasa bloqueada: si la tasa del modelo cambia, el carrito mantiene la tasa pactada
        modelo.setTasa(85.00);
        expect(vm.tasaTicket).toBe(80.00);
        expect(vm.totalBs).toBe(120.00);
    });

    it('bloquea adición si el stock es menor al requerido por una presentación múltiple', () => {
        // Stock disponible: 10 unidades. Presentación 'Bulto 20' requiere 20 unidades.
        const err = vm.empujar(productoPrueba, undefined, undefined, 'Bulto 20');
        expect(err).toContain('Stock insuficiente');
        expect(vm.lineasCarrito).toHaveLength(0);
    });

    it('permite adición fraccionaria de productos pesables (paso de 0.25 kg)', () => {
        const err = vm.empujar(productoPesable);
        expect(err).toBeNull();

        expect(vm.lineasCarrito).toHaveLength(1);
        expect(vm.lineasCarrito[0].cantidad).toBe(0.25);
        expect(vm.lineasCarrito[0].precioUsd).toBe(6.00);

        // 0.25 kg * $6.00 = $1.50
        expect(vm.totalUsd).toBe(1.50);

        // Incrementar cantidad volviendo a empujar
        vm.empujar(productoPesable);
        expect(vm.lineasCarrito[0].cantidad).toBe(0.50);
        expect(vm.totalUsd).toBe(3.00);

        // Cambiar cantidad arbitraria
        vm.cambiarCantidad('QUE-01', 1.25);
        expect(vm.lineasCarrito[0].cantidad).toBe(1.25);
        expect(vm.totalUsd).toBe(7.50); // 1.25 * 6.00
    });

    it('decremento y eliminación al asignar cantidad cero o usar quitar', () => {
        vm.empujar(productoPrueba);
        expect(vm.lineasCarrito).toHaveLength(1);

        // Al cambiar cantidad a cero se purga la línea
        vm.cambiarCantidad('HAR-01', 0);
        expect(vm.lineasCarrito).toHaveLength(0);
        expect(vm.totalUsd).toBe(0);
        expect(vm.totalBs).toBe(0);

        // Quitar explícito
        vm.empujar(productoPrueba);
        expect(vm.lineasCarrito).toHaveLength(1);
        vm.quitar('HAR-01');
        expect(vm.lineasCarrito).toHaveLength(0);
    });

    it('vaciar carrito libera la tasa bloqueada', () => {
        vm.empujar(productoPrueba);
        expect(vm.tasaTicket).toBe(80.00);

        vm.vaciar();
        expect(vm.lineasCarrito).toHaveLength(0);

        // Al vaciar, la tasa vuelve a seguir la tasa activa del modelo
        modelo.setTasa(90.00);
        expect(vm.tasaTicket).toBe(90.00);
    });

    it('paginacion de productos: navegacion entre paginas y reseteo en busqueda', () => {
        expect(vm.paginaActual).toBe(1);
        expect(vm.totalPaginas).toBe(1);

        // Avanzar no excede total
        vm.paginaSiguiente();
        expect(vm.paginaActual).toBe(1);

        // Retroceder no baja de 1
        vm.paginaAnterior();
        expect(vm.paginaActual).toBe(1);

        // Buscar reinicia pagina a 1
        vm.setBusqueda('arroz');
        expect(vm.paginaActual).toBe(1);
    });

    it('las líneas del carrito registran y preservan el modoVenta de la presentación elegida', () => {
        const prodConStockSuficiente: ProductoInfo = {
            ...productoPrueba,
            stock: '50',
        };

        const err = vm.empujar(prodConStockSuficiente, undefined, undefined, 'Bulto 20');
        expect(err).toBeNull();
        expect(vm.lineasCarrito).toHaveLength(1);
        expect(vm.lineasCarrito[0].modoVenta).toBe('Bulto 20');
        expect(vm.lineasCarrito[0].precioUsd).toBe(28.00);

        // Mapeo saliente para api.registrarVenta
        const payloadItems = vm.lineasCarrito.map((l) => ({
            sku: l.sku,
            cantidad: String(l.cantidad),
            modo_venta: l.modoVenta,
            modoVenta: l.modoVenta,
        }));

        expect(payloadItems[0].modo_venta).toBe('Bulto 20');
        expect(payloadItems[0].modoVenta).toBe('Bulto 20');
    });

    it('permite múltiples presentaciones del mismo SKU en líneas independientes', () => {
        const prodCerveza: ProductoInfo = {
            sku: 'POLAR-01',
            nombre: 'Cerveza Polar Pilsen',
            precioUsd: '1.00',
            stock: '50',
            sinStock: false,
            capacidades: 1,
            presentaciones: [
                { nombre: 'Six Pack', precioUsd: '5.50', unidades: 6 },
                { nombre: 'Caja 24', precioUsd: '20.00', unidades: 24 },
            ],
        };

        // 1. Agregar 1 unidad
        let err = vm.empujar(prodCerveza, undefined, undefined, 'unidad');
        expect(err).toBeNull();

        // 2. Agregar 1 Six Pack (6 unidades)
        err = vm.empujar(prodCerveza, undefined, undefined, 'Six Pack');
        expect(err).toBeNull();

        // 3. Agregar 1 Caja 24 (24 unidades)
        err = vm.empujar(prodCerveza, undefined, undefined, 'Caja 24');
        expect(err).toBeNull();

        // Deben existir 3 líneas separadas, no colapsadas
        expect(vm.lineasCarrito).toHaveLength(3);
        expect(vm.lineasCarrito[0].modoVenta).toBe('unidad');
        expect(vm.lineasCarrito[0].cantidad).toBe(1);
        expect(vm.lineasCarrito[0].precioUsd).toBe(1.00);

        expect(vm.lineasCarrito[1].modoVenta).toBe('Six Pack');
        expect(vm.lineasCarrito[1].cantidad).toBe(1);
        expect(vm.lineasCarrito[1].precioUsd).toBe(5.50);

        expect(vm.lineasCarrito[2].modoVenta).toBe('Caja 24');
        expect(vm.lineasCarrito[2].cantidad).toBe(1);
        expect(vm.lineasCarrito[2].precioUsd).toBe(20.00);

        // Total USD = 1.00 + 5.50 + 20.00 = 26.50
        expect(vm.totalUsd).toBe(26.50);
    });

    it('bloquea la adición si la combinación de varias presentaciones excede el stock total', () => {
        const prodCerveza: ProductoInfo = {
            sku: 'POLAR-02',
            nombre: 'Cerveza Polar Pilsen',
            precioUsd: '1.00',
            stock: '30', // Solo hay 30 unidades
            sinStock: false,
            capacidades: 1,
            presentaciones: [
                { nombre: 'Six Pack', precioUsd: '5.50', unidades: 6 },
                { nombre: 'Caja 24', precioUsd: '20.00', unidades: 24 },
            ],
        };

        // 1. Agregar 1 Caja 24 (consume 24 de 30, quedan 6 disponibles)
        let err = vm.empujar(prodCerveza, undefined, undefined, 'Caja 24');
        expect(err).toBeNull();
        expect(vm.lineasCarrito).toHaveLength(1);

        // 2. Agregar 1 Six Pack (consume 6 de 6, quedan 0 disponibles)
        err = vm.empujar(prodCerveza, undefined, undefined, 'Six Pack');
        expect(err).toBeNull();
        expect(vm.lineasCarrito).toHaveLength(2);

        // 3. Intentar agregar 1 unidad suelta debe rebotar por stock insuficiente
        err = vm.empujar(prodCerveza, undefined, undefined, 'unidad');
        expect(err).toContain('Stock insuficiente');
        expect(vm.lineasCarrito).toHaveLength(2);

        // 4. Intentar agregar otra Caja 24 debe rebotar
        err = vm.empujar(prodCerveza, undefined, undefined, 'Caja 24');
        expect(err).toContain('Stock insuficiente');
        expect(vm.lineasCarrito).toHaveLength(2);
    });
});

