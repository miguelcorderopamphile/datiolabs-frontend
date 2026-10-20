export class GuiaView {
    private contenedor: HTMLElement;

    constructor(contenedor: HTMLElement) {
        this.contenedor = contenedor;
    }

    render(): void {
        this.contenedor.innerHTML = `
        <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
                <h2 class="text-2xl sm:text-3xl font-black font-heading">Manual de Procedimientos y Operación Comercial</h2>
                <p class="text-brand-text font-body text-xs sm:text-sm">Directrices de uso operativo, arqueo y lectura analítica de DatioLabs</p>
            </div>
            <span class="bg-brand-black text-white px-3 py-1.5 rounded font-black font-heading text-xs uppercase tracking-wider">
                DOCUMENTACIÓN OFICIAL
            </span>
        </div>

        <!-- Tarjetas Resumen de los 5 Modulos -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
            <div class="border-2 border-brand-black rounded-lg bg-amber-50 p-3.5 shadow-brutal-sm">
                <span class="font-mono text-[10px] font-black text-amber-900 uppercase">MODULO 01</span>
                <h4 class="font-heading font-black text-base mt-0.5">CAJA</h4>
                <p class="text-xs text-gray-700 mt-1">Precio dual USD/Bs., semáforo dinámico, pesable, empaques, multi-operador, historial del turno, reactividad Enter y cobro multimoneda con vuelto exacto.</p>
            </div>
            <div class="border-2 border-brand-black rounded-lg bg-yellow-50 p-3.5 shadow-brutal-sm">
                <span class="font-mono text-[10px] font-black text-yellow-900 uppercase">MODULO 02</span>
                <h4 class="font-heading font-black text-base mt-0.5">CUENTAS</h4>
                <p class="text-xs text-gray-700 mt-1">Cuentas activas en mesa, conversión directa a deuda comercial, adición/decremento fluido de consumos con retorno de existencias y abonos a tasa pactada.</p>
            </div>
            <div class="border-2 border-brand-black rounded-lg bg-blue-50 p-3.5 shadow-brutal-sm">
                <span class="font-mono text-[10px] font-black text-blue-900 uppercase">MODULO 03</span>
                <h4 class="font-heading font-black text-base mt-0.5">VENTAS</h4>
                <p class="text-xs text-gray-700 mt-1">Historial de jornadas con KPIs, desglose por método de pago, marcas cronológicas VET UTC-4 y exportación CSV exhaustiva.</p>
            </div>
            <div class="border-2 border-brand-black rounded-lg bg-emerald-50 p-3.5 shadow-brutal-sm">
                <span class="font-mono text-[10px] font-black text-emerald-900 uppercase">MODULO 04</span>
                <h4 class="font-heading font-black text-base mt-0.5">INVENTARIO</h4>
                <p class="text-xs text-gray-700 mt-1">Catálogo por categorías, calculadora de margen, descuento atómico por empaque/caja, semáforo configurable y modo privacidad.</p>
            </div>
            <div class="border-2 border-brand-black rounded-lg bg-slate-100 p-3.5 shadow-brutal-sm">
                <span class="font-mono text-[10px] font-black text-gray-800 uppercase">MODULO 05</span>
                <h4 class="font-heading font-black text-base mt-0.5">PANEL</h4>
                <p class="text-xs text-gray-700 mt-1">Diagnóstico financiero por fechas VET, gráfico SVG determinista, semáforo de stock, respaldos criptográficos SHA-256 y control Dueño(a).</p>
            </div>
        </div>

        <div class="space-y-6">

            <!-- ============ MODULO 1: CAJA ============ -->
            <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-6">
                <div class="flex items-center gap-3 border-b-2 border-brand-black pb-3 mb-4">
                    <span class="w-8 h-8 rounded-full bg-brand-black text-white font-black font-heading flex items-center justify-center text-sm">1</span>
                    <div>
                        <h3 class="font-heading font-black text-lg sm:text-xl">Módulo CAJA: Precio Dual, Historial del Turno y Cobro Reactivo</h3>
                        <p class="text-xs text-gray-500 font-bold">Facturación directa con precisión decimal bancaria en USD y Bs., control de stock visual y auditoría en tiempo real</p>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-body leading-relaxed text-gray-700">
                    <div class="border border-brand-black rounded p-3 bg-amber-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Precio Dual USD / Bs.</strong>
                        Cada producto muestra simultáneamente su precio en dólares y en bolívares con tasa BCV. El ticket calcula totales con el módulo determinista de punto fijo Money.ts.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-red-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Semáforo Dinámico de Stock</strong>
                        Indicador visual de salud del inventario: ROJO (stock crítico), AMARILLO (stock bajo), VERDE (suficiente). Los umbrales se sincronizan en tiempo real con la configuración del negocio.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-blue-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Soporte Pesable (kg / ml)</strong>
                        Productos vendidos por peso o volumen muestran input decimal en vez de botones +/-. Paso automático fraccionario con protección contra desbordes.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-purple-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Empaque y Descuento Atómico</strong>
                        Productos configurados en empaque (six-pack, bultos, cajas) descuentan exactamente la cantidad de unidades físicas base correspondientes (K unidades x paquete) tanto en el carrito como en el libro mayor.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-emerald-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Historial del Turno Activo</strong>
                        Botón "HISTORIAL" en cabecera: despliega modal brutalista con tickets y recaudación acumulada exclusiva del turno activo desglosada por operador y método sin interrumpir la sesión.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-orange-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Multi-Operador y Relevo</strong>
                        Múltiples cajeros pueden operar en el mismo turno. El selector en la cabecera del ticket muestra el operador activo y permite registrar check-in y check-out de personal.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-gray-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Reactividad Total y Tecla Enter</strong>
                        El cálculo de faltante y vuelto se recalcula en tiempo real al tipear (evento input) en montos y tasas. Presionar Enter en cualquier campo confirma la venta si el total está cubierto.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-gray-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Cobro Multimoneda con Vuelto</strong>
                        Pagos mixtos en bolívares y divisas con tasas pactadas individuales. El excedente puede entregarse como vuelto físico o retenerse como saldo a favor en cuenta.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-gray-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Borrador Persistente</strong>
                        Si se cierra el modal de cobro sin confirmar, los importes, métodos y resolución de vuelto quedan retenidos en memoria y se restauran al volver a abrir.
                    </div>
                </div>
            </div>

            <!-- ============ MODULO 2: CUENTAS ============ -->
            <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-6">
                <div class="flex items-center gap-3 border-b-2 border-brand-black pb-3 mb-4">
                    <span class="w-8 h-8 rounded-full bg-brand-black text-white font-black font-heading flex items-center justify-center text-sm">2</span>
                    <div>
                        <h3 class="font-heading font-black text-lg sm:text-xl">Módulo CUENTAS: Comandas en Local, Deudas y Conversión</h3>
                        <p class="text-xs text-gray-500 font-bold">Comandas para mesas, cartera de crédito comercial, conversión directa a deuda y ajuste fluido de consumos</p>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-body leading-relaxed text-gray-700">
                    <div class="border border-brand-black rounded p-3 bg-blue-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Dos Modalidades: Local vs. Deuda</strong>
                        Cuentas Activas (mesas o barras, liquidadas en la sesión) y Deudas Comerciales (crédito a clientes de confianza que permanecen abiertas descontando existencias al instante).
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-amber-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Botón Conversión a Deuda</strong>
                        Botón "CONVERTIR A DEUDA": permite transferir una cuenta activa de mesa directamente al balance de deudas por cobrar asignando titular y plazo sin obligar a liquidar en caja.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-emerald-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Ajuste Fluido de Consumos</strong>
                        Controles interactivos [+] y [-] por cada línea de consumo. Permite incrementar o decrementar cantidades con devolución o descuento automático de stock físico.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-purple-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Liquidación a Tasa Libre y Enter</strong>
                        El comerciante fija la tasa libremente o carga la oficial con un clic. La liquidación reacciona a cada pulsación y confirma la transacción al presionar Enter.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-red-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Abonos Parciales y Saldo a Favor</strong>
                        Abonos en múltiples monedas con tasa individual. Si el abono sobrepasa la deuda, se genera automáticamente comprobante con saldo a favor retenido.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-gray-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Historial del Turno en Cuentas</strong>
                        Acceso directo al botón "HISTORIAL DEL TURNO" en la barra superior para auditar tickets cobrados y verificar balances de caja sin cambiar de módulo.
                    </div>
                </div>
            </div>

            <!-- ============ MODULO 3: VENTAS ============ -->
            <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-6">
                <div class="flex items-center gap-3 border-b-2 border-brand-black pb-3 mb-4">
                    <span class="w-8 h-8 rounded-full bg-brand-black text-white font-black font-heading flex items-center justify-center text-sm">3</span>
                    <div>
                        <h3 class="font-heading font-black text-lg sm:text-xl">Módulo VENTAS: Historial de Jornadas con KPIs</h3>
                        <p class="text-xs text-gray-500 font-bold">Balance por turno, desglose por método de pago, badges de canal y exportación CSV</p>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-body leading-relaxed text-gray-700">
                    <div class="border border-brand-black rounded p-3 bg-amber-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">KPIs en Cabecera</strong>
                        4 tarjetas: Facturado Total (USD), Estado Actual (Abierta/Sin turno con pulse verde), Tasa BCV del día (morado), Tickets Totales (azul).
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-blue-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Buscador y Paginación</strong>
                        Filtra por ID de jornada, nombre de operador o fecha. Paginación a 20 registros por página. El estado de expansión se preserva al filtrar.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-emerald-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Detalle Expandible por Jornada</strong>
                        Al expandir: duración, vueltos pagados y retenidos, deudas liquidadas, entradas de stock, mermas, tasa de apertura y cierre, SHA-256 de verificación.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-purple-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Desglose por Método de Pago</strong>
                        Dentro de cada jornada: tabla con nombre del método, total en USD y total en Bs. para cada método utilizado.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-orange-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Badges de Canal Comercial</strong>
                        Cada ticket muestra badge de color: VENTA DIRECTA (verde), CUENTA/DEUDA (azul), MIXTO (morado). Permite distinguir origen de cada transacción.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-gray-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Exportación CSV y Ticket PDF</strong>
                        Cada jornada tiene botón CSV con encabezado completo (operadores, totales, vueltos, SHA-256) y tabla de tickets. Modal de detalle de ticket con comprobante completo.
                    </div>
                </div>
            </div>

            <!-- ============ MODULO BUSCADOR ============ -->
            <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-6">
                <h3 class="font-heading font-black text-lg sm:text-xl">Módulo BUSCADOR: Consulta Histórica (sin clave)</h3>
                <p class="text-xs text-gray-700 mt-1 mb-3">Es exclusivamente para consultar. No cobra, no abona, no cierra deudas y no genera resúmenes por día: esa información la dan VENTAS y PANEL.</p>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-body leading-relaxed text-gray-700">
                    <div class="border border-brand-black rounded p-3 bg-amber-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Un Solo Buscador</strong>
                        Una sola barra (máximo 40 caracteres) busca por nombre puesto a la deuda, operador o ID. No distingue mayúsculas ni acentos ("gomez" encuentra "Gómez").
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-blue-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Filtro por Tipo</strong>
                        TODOS, VENTAS, CUENTAS, DEUDAS, LIQUIDADAS y SALDOS. Cada fila lleva su badge: VENTA, CUENTA, CTA. LIQ., DEUDA, LIQ. DEUDA o SALDO FAVOR.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-emerald-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Filtro por Fecha y Operador</strong>
                        Campo Apertura o Liquidación con Hoy, 3 días, Semana, Mes, Rango y Fecha exacta (tocar de nuevo un acceso lo desactiva). Además: operador y método de pago.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-purple-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Resumen del Deudor</strong>
                        Al buscar por nombre se muestra arriba: cuántas deudas tiene, cuántas abiertas, saldo pendiente e histórico total, sin agrupar la lista.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-orange-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Detalle y Paginación</strong>
                        VER abre el detalle con los consumos exactos de ventas, cuentas y deudas (producto, cantidad, precio y subtotal), abonos, saldo y pagos de liquidación, más los métodos cobrados. Lista cronológica con "Página X de Y · N registros" y botones ANT./SIG.; si superas 200 páginas, acota por fecha.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-gray-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Filtro Rápido en CUENTAS</strong>
                        En CUENTAS, el campo de búsqueda filtra la lista que está trabajando (nombre, cliente, nota o ID) sin cambiar de vista ni recargar datos.
                    </div>
                </div>
            </div>

            <!-- ============ MODULO 4: INVENTARIO ============ -->
            <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-6">
                <div class="flex items-center gap-3 border-b-2 border-brand-black pb-3 mb-4">
                    <span class="w-8 h-8 rounded-full bg-brand-black text-white font-black font-heading flex items-center justify-center text-sm">4</span>
                    <div>
                        <h3 class="font-heading font-black text-lg sm:text-xl">Módulo INVENTARIO: Catálogo, Márgenes, Empaque y Movimientos</h3>
                        <p class="text-xs text-gray-500 font-bold">Alta de productos con calculadora de margen, sistema de empaque/paquete, PIN protegido</p>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-body leading-relaxed text-gray-700">
                    <div class="border border-brand-black rounded p-3 bg-purple-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Calculadora de Margen Bidireccional</strong>
                        Ingrese precio bruto (costo) y margen % para calcular precio neto, O ingrese precio neto para calcular margen inverso. Soporta tasa de impuesto configurable.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-amber-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Empaque / Caja con Unidades</strong>
                        Configuración de productos en empaque: unidades por caja, stock en cajas (se convierte automáticamente a unidades base). Stock se despieza en "X cajas + Y un.".
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-blue-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Precio por Paquete</strong>
                        Productos pueden tener precio adicional por paquete/bóveda/cambio. Nombre del empaque configurable. Se muestra botón morado en Caja y Cuentas.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-emerald-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Unidades de Medida</strong>
                        Soporte para Unidad/Pieza (un.), Peso (Kilogramos - kg) y Volumen (Mililitros - ml) con pasos de input diferentes.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-red-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">PIN Protegido y Modo Privacidad</strong>
                        Operadores requieren PIN para eliminar productos, entradas, reducciones y mermas. Dueño(a) puede ocultar precios y stock a los operadores desde la configuración.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-gray-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Movimientos de Stock</strong>
                        + ENTRADA (reposición), - REDUCIR (ajuste físico) y - MERMA (deterioro). Cada movimiento se registra en la auditoría. Botón de eliminación por producto con confirmación.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-gray-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Gestión de Categorías e Impuestos</strong>
                        Pestaña dedicada para CRUD de categorías (con conteo de productos) y tasas de impuestos (0% y 16% predefinidas, más personalizadas).
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-gray-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Catálogo Lateral Paginado</strong>
                        Columna derecha con filtro por categoría, búsqueda y lista paginada (10 por página) con nombre, categoría, precio, IVA% y badge de stock.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-gray-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Venta Sin Stock</strong>
                        Checkbox "Venta Sin Stock" para servicios o detal libre: productos que no descuentan inventario al vender.
                    </div>
                </div>
            </div>

            <!-- ============ MODULO 5: PANEL DE CONTROL DUEÑO(A) ============ -->
            <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-6">
                <div class="flex items-center gap-3 border-b-2 border-brand-black pb-3 mb-4">
                    <span class="w-8 h-8 rounded-full bg-brand-black text-white font-black font-heading flex items-center justify-center text-sm">5</span>
                    <div>
                        <h3 class="font-heading font-black text-lg sm:text-xl">Módulo PANEL: Diagnóstico Financiero y Control Dueño(a)</h3>
                        <p class="text-xs text-gray-500 font-bold">KPIs por rango de fechas, gráfico SVG, semáforo, respaldos y administración con clave</p>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-body leading-relaxed text-gray-700">
                    <div class="border border-brand-black rounded p-3 bg-amber-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">KPIs y Rango de Fechas</strong>
                        4 indicadores: Ventas Totales (USD+Bs.), Ganancia Bruta (con % margen), Ganancia Neta (Bs.) e Inventario Total. Selector de rango (24H, 7D, 30D, 1A, TODO) y rango personalizado con fechas exactas.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-emerald-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Gráfico SVG de Rendimiento</strong>
                        Gráfico de pie puro SVG (sin librerías externas). Criterio toggleable: POR VOLUMEN o POR INGRESOS. Colores dinámicos, tooltips, leyenda con tabla de productos.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-blue-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Capital por Categoría</strong>
                        Tabla desglosada: categoría, n° productos, stock físico, dinero en bruto (USD y Bs.), valor PVP, margen proyectado, % capital con barra de progreso y total consolidado.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-red-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Semáforo de Salud del Stock</strong>
                        Configuración de umbrales de stock: ROJO (crítico) y AMARILLO (bajo). Validación de coherencia. Botón de restablecer a valores predeterminados.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-purple-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Historial de Transacciones</strong>
                        Tabla cronológica con ID, fecha, canal (badge: Cuenta Abierta / Caja Directa), operador, tasa BCV, total USD y Bs. Paginación a 20 por página.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-gray-100">
                        <strong class="text-brand-black block font-heading font-black mb-1">Respaldos Criptográficos</strong>
                        Copias de seguridad con SHA-256 verificable. Lista de respaldos con nombre de archivo, hash truncado, fecha, registros y tamaño. Botón de crear respaldo con verificación inmediata.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-slate-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Jornada y Multi-Operador</strong>
                        Apertura y cierre de jornada desde el Panel con confirmación. Gestión completa de operadores: alta, edición de nombre, baja. Asignación de operadores al turno activo.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-slate-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Métodos de Pago</strong>
                        CRUD de métodos de pago: nombre y moneda (USD o Bs.). Chips con badge de moneda. Eliminación con garantía de al menos un método activo.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-slate-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Seguridad y PIN</strong>
                        Cambio o eliminación de clave del Panel. Campo "vacío = sin clave". Indicador de estado "Protegido" con descripción de seguridad.
                    </div>
                </div>
            </div>

            <!-- ============ PROCEDIMIENTOS OPERATIVOS ============ -->
            <div class="bg-white border-2 border-brand-black rounded-lg shadow-brutal p-6">
                <div class="flex items-center gap-3 border-b-2 border-brand-black pb-3 mb-4">
                    <div class="w-8 h-8 rounded-full bg-brand-black text-white font-black font-heading flex items-center justify-center text-sm">O</div>
                    <div>
                        <h3 class="font-heading font-black text-lg sm:text-xl">Procedimientos Operativos: Jornadas, Cobro y Stock</h3>
                        <p class="text-xs text-gray-500 font-bold">Instrucciones para apertura de turno, gestión de cajeros, cobro multimoneda y control de inventario</p>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-body leading-relaxed text-gray-700">
                    <div class="border border-brand-black rounded p-3 bg-gray-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Apertura Directa sin Clave</strong>
                        Si no hay turno activo, el botón de operador en Caja muestra "SIN TURNO ACTIVO". El operador selecciona los cajeros del día y abre el turno sin requerir clave de Dueño(a).
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-gray-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Relevo y Asignación en Vivo</strong>
                        Desde Caja o Panel se pueden agregar, editar y relevar cajeros simultáneos. Los cambios se propagan inmediatamente al turno activo sin interrumpir ventas.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-gray-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Cierre desde Panel</strong>
                        Solo Dueño(a) puede cerrar la jornada desde el Panel. El cierre consolida totales, genera SHA-256 de verificación y bloquea ediciones posteriores.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-gray-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Paginación y Rendimiento</strong>
                        Todos los módulos históricos (Jornadas, Transacciones, Catálogo, Reposición, Cuentas) operan bajo paginación estricta con sanitización en tiempo real.
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-gray-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Cobro Multimoneda y Vuelto</strong>
                        El sistema prioriza bolívares arriba y divisas abajo. Vuelto se resuelve como PAGADO (entregado) o RETENIDO (saldo a favor del cliente).
                    </div>
                    <div class="border border-brand-black rounded p-3 bg-gray-50">
                        <strong class="text-brand-black block font-heading font-black mb-1">Notificaciones Toast</strong>
                        Alertas no intrusivas en la esquina inferior derecha: verde (éxito), rojo (error), negro (info). Se auto-cierran a los 8 segundos.
                    </div>
                </div>
            </div>
        </div>`;
    }
}
