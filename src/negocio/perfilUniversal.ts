import { ConfigInfo, ProductoInfo, RUBRO_UNIVERSAL, TODAS_LAS_CAPACIDADES } from './api';

export function obtenerPerfilUniversal(): { config: ConfigInfo; productos: ProductoInfo[]; key: string; claveLicencia: string; titular: string } {
    return {
        key: 'datiolabs_demo_universal_v1',
        claveLicencia: '0000888811110000',
        titular: 'Empresa DatioLabs Demo Universal',
        config: {
            nombre: 'DatioLabs Universal Store',
            rubros: RUBRO_UNIVERSAL,
            capacidades: TODAS_LAS_CAPACIDADES,
            tienePin: false,
        },
        productos: [
            // 1. Abasto / Víveres con presentaciones múltiples dinámicas y peso
            {
                sku: 'HARINA-PAN-1KG',
                nombre: 'Harina de Maíz Blanco 1Kg',
                precioBrutoUsd: '0.90',
                margenPct: '33',
                precioUsd: '1.20',
                impuestoPct: '0',
                stock: '80',
                capacidades: 1, // unitaria
                unidad: 'un',
                categoriaId: 'cat-viveres',
                presentaciones: [
                    { nombre: 'Fardo (20 un)', precioUsd: '22.00', unidades: 20 },
                    { nombre: 'Bulto 10 un', precioUsd: '11.50', unidades: 10 },
                ],
            },
            {
                sku: 'QUESO-GUAYANES',
                nombre: 'Queso Guayanés Fresco por Peso',
                precioBrutoUsd: '3.20',
                margenPct: '40',
                precioUsd: '4.50',
                impuestoPct: '0',
                stock: '25.00',
                capacidades: 1 | 2, // unitaria y pesable
                unidad: 'kg',
                categoriaId: 'cat-viveres',
            },
            {
                sku: 'CAFE-GOURMET-250G',
                nombre: 'Café Molido Premium 250g',
                precioBrutoUsd: '2.00',
                margenPct: '50',
                precioUsd: '3.00',
                impuestoPct: '0',
                stock: '35',
                capacidades: 1,
                unidad: 'un',
                categoriaId: 'cat-viveres',
                presentaciones: [
                    { nombre: 'Paquete 6 un', precioUsd: '17.00', unidades: 6 },
                ],
            },

            // 2. Panadería FEFO
            {
                sku: 'PAN-CANILLA',
                nombre: 'Pan Canilla Tradicional',
                precioBrutoUsd: '0.50',
                margenPct: '60',
                precioUsd: '0.80',
                impuestoPct: '0',
                stock: '50',
                capacidades: 1,
                unidad: 'un',
                categoriaId: 'cat-panes',
            },
            {
                sku: 'PAN-CAMPESINO',
                nombre: 'Pan Campesino Rústico Especial',
                precioBrutoUsd: '0.80',
                margenPct: '50',
                precioUsd: '1.20',
                impuestoPct: '0',
                stock: '30',
                capacidades: 1,
                unidad: 'un',
                categoriaId: 'cat-panes',
            },

            // 3. Licorería / Consumo en Cuenta
            {
                sku: 'RON-SANTA-TERESA',
                nombre: 'Ron Santa Teresa Gran Reserva 750ml',
                precioBrutoUsd: '8.80',
                margenPct: '36',
                precioUsd: '12.00',
                impuestoPct: '16',
                stock: '20',
                capacidades: 1 | 8, // unitaria + cuenta abierta
                unidad: 'un',
                categoriaId: 'cat-bebidas',
                presentaciones: [
                    { nombre: 'Caja (12 un)', precioUsd: '135.00', unidades: 12 },
                ],
            },
            {
                sku: 'CERVEZA-POLAR-6P',
                nombre: 'Six Pack Cerveza Pilsen 330ml',
                precioBrutoUsd: '3.30',
                margenPct: '36',
                precioUsd: '4.50',
                impuestoPct: '16',
                stock: '45',
                capacidades: 1 | 8,
                unidad: 'un',
                categoriaId: 'cat-bebidas',
                presentaciones: [
                    { nombre: 'Caja 24 un', precioUsd: '16.50', unidades: 24 },
                    { nombre: 'Tobo (10 un)', precioUsd: '7.00', unidades: 10 },
                ],
            },
            {
                sku: 'WHISKY-12A',
                nombre: 'Whisky Escocés 12 Años 750ml',
                precioBrutoUsd: '16.50',
                margenPct: '33',
                precioUsd: '22.00',
                impuestoPct: '16',
                stock: '10',
                capacidades: 1 | 8,
                unidad: 'un',
                categoriaId: 'cat-bebidas',
            },
            {
                sku: 'HIELO-BOLSA',
                nombre: 'Bolsa de Hielo 3Kg',
                precioBrutoUsd: '0.60',
                margenPct: '66',
                precioUsd: '1.00',
                impuestoPct: '16',
                stock: '40',
                capacidades: 1 | 8,
                unidad: 'un',
                categoriaId: 'cat-viveres',
            },

            // 4. Retail / Series y Garantías
            {
                sku: 'SMART-PHONE-X',
                nombre: 'Smartphone X 128GB (Serie/Garantía)',
                precioBrutoUsd: '180.00',
                margenPct: '38',
                precioUsd: '250.00',
                impuestoPct: '16',
                stock: '6',
                capacidades: 1 | 16 | 64, // unitaria | serie | garantia
                unidad: 'un',
                categoriaId: 'cat-general',
            },
            {
                sku: 'AURICULAR-BT',
                nombre: 'Audífonos Bluetooth Noise Cancelling',
                precioBrutoUsd: '14.00',
                margenPct: '42',
                precioUsd: '20.00',
                impuestoPct: '16',
                stock: '18',
                capacidades: 1 | 64,
                unidad: 'un',
                categoriaId: 'cat-general',
            },
        ],
    };
}
