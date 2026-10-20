/* DatioLabs Engineering — tiny i18n (EN default, ES toggle) and page behavior. */
(function () {
  var DICT = {
    en: {
      'doc.title': 'DatioLabs Engineering — a local-first POS in Rust',
      'nav.demo': 'Live demo',
      'nav.hire': 'Hire me',

      'hero.eyebrow': 'Engineering case study',
      'hero.title': 'A local-first point of sale, written in Rust',
      'hero.lead':
        "DatioLabs Retail is a Windows desktop POS for Venezuelan retail: fully offline, exact decimal money, every record on the client's machine. What follows is the engineering: real functions, real invariants, and how each one is verified.",
      'hero.by': 'Built by Miguel Cordero Pamphile · Rust engineer · open to work',
      'hero.cta.demo': 'Open the live web demo',
      'hero.cta.code': 'Read the code',

      'stat.tests': 'automated tests',
      'stat.commands': 'commands exercised over IPC',
      'stat.e2e': 'E2E scenarios, happy + adverse',
      'stat.size': 'signed Windows installer',

      'ctx.kicker': '01 — Context',
      'ctx.title': 'Built for shops that cannot go down',
      'ctx.p1':
        'Retail shops in Venezuela run on modest Windows PCs with unreliable connectivity. Prices are anchored in USD while customers pay in bolivars at the official BCV rate, which changes daily. A server, an internet connection or a subscription is not an option: the shop must keep selling when the network is down, and the data must stay on the shop\u2019s machine.',
      'ctx.b1': 'Offline-first: no cloud, no server, no web panel, no telemetry.',
      'ctx.b2': 'Exact money: multi-currency (USD/VES) with zero floating point.',
      'ctx.b3': 'Own the data: local database, verifiable backups, restore is sacred.',
      'ctx.b4': 'Small and light: a 3.1 MB installer that runs on entry-level hardware.',

      'arch.kicker': '02 — Architecture',
      'arch.title': 'Three layers, one deliberate boundary',
      'arch.l1t': 'Frontend SPA',
      'arch.l1s': 'TypeScript · Vite · Tailwind',
      'arch.l2t': 'Tauri IPC',
      'arch.l2s': 'in-process, no network',
      'arch.l3t': 'datiolabs-core',
      'arch.l3s': 'Rust domain engine',
      'arch.l4t': 'Sled',
      'arch.l4s': 'embedded DB · SHA-256 signed',
      'arch.n1': 'No network services: all communication is Tauri IPC inside the machine.',
      'arch.n2': 'All money and stock math happens in Rust (rust_decimal); the UI mirrors it with integer cents so both sides agree cent by cent.',
      'arch.n3': '15 persistence trees; backups carry header, trees, metadata and a SHA-256 checksum; a backup from any previous version restores in the current one.',

      'code.kicker': '03 — The engineering, in code',
      'code.title': 'Six decisions, with the code that proves them',
      'code.lead':
        'Short excerpts from the private codebase — trimmed for space, not simplified. Each block is the function that does the work the text describes.',

      'code.1t': 'Money that cannot drift',
      'code.1p':
        'Every amount in the core is a Decimal, and it travels as text, not as a binary float — sale signatures hash Decimal::to_string(), so a SHA-256 stays reproducible across platforms and versions. A malformed amount never becomes a silent zero: the backend has exactly one parser, and it fails loudly.',
      'code.1c':
        'Settlement sums per line with each line\u2019s locked rate, so one ticket can mix rates and still reconcile to the cent. The TypeScript side mirrors it with integer cents (Money.toCents, sum, usdToBsCents), and property tests assert exact sums and \u22641-cent reversibility.',

      'code.2t': 'Stock without database transactions',
      'code.2p':
        'The embedded store gives no multi-tree ACID, so inventory doesn\u2019t pretend otherwise: one writer at a time (con_ledger on a global Mutex<Ledger>), validate before write, an append-only movements ledger, and flush() as the durability point.',
      'code.2c':
        'Movements are keyed chronologically, so iter().rev() is recency order without sorting. IDs and names are fixed-size, zero-heap types (struct Sku([u8; 32], u8)), so scans don\u2019t allocate.',

      'code.3t': 'FEFO, packaging and one source of price',
      'code.3p':
        'Perishables consume from lots in expiry order, and the reverse path puts units back into the nearest valid lot. Packaging is not a second inventory: "2 boxes" is converted to base units once, by a single conversion shared by the preview and the charge.',
      'code.3c':
        'resolver_precio_presentacion is the only place that decides price and factor, and construir_lineas_venta is the only line factory — shared by previsualizar_cobro and registrar_venta. What the screen confirms is exactly what gets written.',

      'code.4t': 'A schema you cannot break, backups that outlive versions',
      'code.4p':
        'Records use positional bincode: adding, removing or reordering a field would corrupt every installed client. Persisted structs are therefore frozen, new features go to new trees, and backups are versioned and checksummed end to end.',
      'code.4c':
        'A fixture from the client\u2019s installed build is imported in CI and byte-compared against HEAD (compat_backup_cliente.rs). Restoring also clears trees that an older backup didn\u2019t have, so no residue survives.',

      'code.5t': 'Contracts enforced by reading the source',
      'code.5p':
        'A real bug motivated this: the UI called eliminar_consumo with an extra cantidad argument, Tauri silently ignores unknown arguments, and removing one unit deleted the whole line. The fix was structural — a test that parses #[tauri::command] signatures and every invocar() call.',
      'code.5c':
        'The suite asserts that the shift guard appears in exactly these eight commands — add a ninth without updating the test, and CI fails.',

      'code.6t': 'A desktop app that heals itself',
      'code.6p':
        'The UI sends a heartbeat every 5 seconds; the shell stores it in an AtomicI64, and a watchdog thread reloads the window if it goes quiet for 30 seconds — with a 120-second cooldown so it cannot loop.',
      'code.6c':
        'The E2E suite validates it by freezing the renderer for 45 seconds and asserting the window comes back. The same discipline applies to state: the manual exchange rate is re-checked inside the same write lock that refreshes from BCV, so a stale scrape can never overwrite an operator\u2019s decision.',

      'ver.kicker': '04 — Verification',
      'ver.title': 'Proof before promises',
      'ver.lead': 'Three layers, from unit tests to a remote harness that clicks the real desktop application.',
      'ver.l1t': 'Unit & contract',
      'ver.l1p':
        '64 Rust tests in the core plus 5 in the desktop shell, and 96 frontend tests across 9 suites. The frontend/backend money contract is enforced by 1:1 contract tests. Rust core coverage: 95.15% of lines (92.59% of functions, 91.13% of regions, measured with cargo-llvm-cov).',
      'ver.l2t': 'Property-based',
      'ver.l2p':
        'proptest in Rust (property-based integration suites) and fast-check in TypeScript attack the money and inventory invariants with randomized cases.',
      'ver.l3t': 'Real E2E over CDP',
      'ver.l3p':
        'No mocks: a test build of the Tauri app exposes the Chrome DevTools Protocol and Playwright-core drives real clicks on the real WebView2. The harness runs from a Linux workstation over SSH/SCP against a Windows Server, with an isolated APPDATA and a scheduled interactive task. The test binary and the debug flag never reach the installer — verified in the final artifact.',
      'ver.h1': 'Linux workstation',
      'ver.h2': 'Windows Server',
      'ver.h3': 'Real Tauri app (WebView2)',
      'ver.b1': 'Every Tauri command is exercised by the E2E harness: 68 directly (scripts or the app heartbeat), 2 legacy entry points through their wrappers.',
      'ver.b2': 'Forged license rejected: the app refuses to operate (scenario A4).',
      'ver.b3': 'Double-click on CHARGE creates exactly one sale: a replay returns the original ticket.',
      'ver.b4': 'Five concurrent sales keep stock exact; oversell is rejected.',
      'ver.b5': 'Midnight crossing (VET) and all 8 shift guards verified.',
      'ver.b6': 'Unicode/XSS payloads in labels and notes are inert.',
      'ver.b7': 'Upgrade over an installed version preserves data with 0 hash differences.',
      'ver.b8': 'Final installer contains no debug flag and no debug port.',

      'num.kicker': '05 — Numbers',
      'num.title': 'Every claim has a number',
      'num.r1': 'Rust core tests',
      'num.green': 'all green',
      'num.r2': 'Desktop shell tests (Windows)',
      'num.r3': 'Frontend tests',
      'num.r4': 'Rust core line coverage',
      'num.r4v': '95.15% · as a floor, not a proof',
      'num.r5': 'E2E scenarios',
      'num.r6': 'E2E scripts (CDP + Playwright)',
      'num.r7': 'Tauri commands over IPC',
      'num.r7v': '70 · all exercised by E2E',
      'num.r9': 'Persistence trees',
      'num.r10': 'Signed installer',
      'num.r11': 'E2E test binary (never shipped)',
      'num.r12': 'Source size',
      'num.method':
        'Method: measured on 2026-09-30 \u2014 cargo test (core and shell), vitest run, cargo llvm-cov -p datiolabs-core, artifact sizes, scenario counting from e2e/ESCENARIOS.md. Only numbers that can be reproduced with a documented command are published.',

      'gal.kicker': '06 — Product',
      'gal.title': 'Running today',
      'gal.lead': 'Real screenshots of the running application (web demo, mock backend).',
      'gal.c1': 'Checkout: catalog, live cart, BCV rate and exact totals in USD and VES.',
      'gal.c2': 'Owner panel: profitability by date range, shift control and operator ledger.',
      'gal.c3': 'Inventory: stock, lots and packaging, with FEFO rotation for perishables.',
      'gal.c4': 'Open accounts: consumptions, partial payments and balances in both currencies.',

      'st.kicker': '07 — Status',
      'st.title': 'Shipped. Private by design.',
      'st.text':
        'Phases 1\u20134 are implemented, verified and packaged (2026-09-19): product, offline rate, multi-vertical capabilities and the verification stack. The application is actively running in businesses in Venezuela. The source code is private because it is a commercial product.',
      'st.p1': 'Product & money',
      'st.p2': 'Offline BCV rate',
      'st.p3': 'Multi-vertical',
      'st.p4': 'Verification stack',

      'hire.kicker': 'Open to work',
      'hire.title': 'Available for Rust roles',
      'hire.text':
        'Backend, systems or edge — remote, or on-site in Argentina. The source is private; the code above is real, and I\u2019m happy to walk through it live.',
      'hire.email': 'Email me',

      'foot.tag': 'Engineering case study',
      'foot.product': 'Product site',
      'foot.demo': 'Live demo',
      'foot.by': 'Built by Miguel Cordero Pamphile'
    },

    es: {
      'doc.title': 'DatioLabs Engineering — un POS local-first en Rust',
      'nav.demo': 'Demo en vivo',
      'nav.hire': 'Contrátame',

      'hero.eyebrow': 'Caso de estudio de ingeniería',
      'hero.title': 'Un punto de venta local-first, escrito en Rust',
      'hero.lead':
        'DatioLabs Retail es un POS de escritorio para Windows pensado para el comercio venezolano: totalmente offline, dinero decimal exacto y cada registro en la máquina del cliente. Lo que sigue es la ingeniería: funciones reales, invariantes reales y cómo se verifica cada una.',
      'hero.by': 'Construido por Miguel Cordero Pamphile · ingeniero Rust · disponible',
      'hero.cta.demo': 'Abrir la demo web',
      'hero.cta.code': 'Leer el código',

      'stat.tests': 'pruebas automáticas',
      'stat.commands': 'comandos ejercidos sobre IPC',
      'stat.e2e': 'escenarios E2E, felices y adversos',
      'stat.size': 'instalador firmado de Windows',

      'ctx.kicker': '01 — Contexto',
      'ctx.title': 'Hecho para comercios que no pueden caerse',
      'ctx.p1':
        'Los comercios venezolanos operan en PCs Windows modestas y con conectividad poco fiable. Los precios se anclan en USD mientras los clientes pagan en bolívares a la tasa oficial del BCV, que cambia a diario. Un servidor, internet o una suscripción no son opción: la tienda debe seguir vendiendo cuando la red falla y los datos deben quedarse en la máquina del comercio.',
      'ctx.b1': 'Local-first: sin nube, sin servidor, sin panel web, sin telemetría.',
      'ctx.b2': 'Dinero exacto: multimoneda (USD/Bs) sin punto flotante.',
      'ctx.b3': 'Los datos son del cliente: base local, respaldos verificables, restaurar es sagrado.',
      'ctx.b4': 'Pequeño y liviano: instalador de 3.1 MB que corre en hardware de entrada.',

      'arch.kicker': '02 — Arquitectura',
      'arch.title': 'Tres capas, un límite deliberado',
      'arch.l1t': 'SPA de frontend',
      'arch.l1s': 'TypeScript · Vite · Tailwind',
      'arch.l2t': 'IPC de Tauri',
      'arch.l2s': 'en proceso, sin red',
      'arch.l3t': 'datiolabs-core',
      'arch.l3s': 'motor de dominio en Rust',
      'arch.l4t': 'Sled',
      'arch.l4s': 'DB embebida · firmas SHA-256',
      'arch.n1': 'Sin servicios de red: toda la comunicación es IPC de Tauri dentro de la máquina.',
      'arch.n2': 'Todo el cálculo de dinero y stock ocurre en Rust (rust_decimal); la UI lo espeja con centavos enteros para que ambos lados coincidan centavo a centavo.',
      'arch.n3': '15 árboles de persistencia; los respaldos llevan header, árboles, metadata y checksum SHA-256; un respaldo de cualquier versión anterior se restaura en la actual.',

      'code.kicker': '03 — La ingeniería, en código',
      'code.title': 'Seis decisiones, con el código que las prueba',
      'code.lead':
        'Fragmentos cortos del código privado — recortados por espacio, no simplificados. Cada bloque es la función que hace el trabajo que describe el texto.',

      'code.1t': 'Dinero que no puede desviarse',
      'code.1p':
        'Cada monto del core es un Decimal y viaja como texto, no como float binario: las firmas de venta hashean Decimal::to_string(), así que un SHA-256 se mantiene reproducible entre plataformas y versiones. Un monto malformado nunca se convierte en cero silencioso: el backend tiene un único parser y falla en voz alta.',
      'code.1c':
        'La liquidación suma por renglón con la tasa congelada de cada línea, así que un ticket puede mezclar tasas y cuadrar al centavo. El lado TypeScript lo espeja con centavos enteros (Money.toCents, sum, usdToBsCents) y los tests de propiedades afirman sumas exactas y reversibilidad ≤1 centavo.',

      'code.2t': 'Stock sin transacciones de base de datos',
      'code.2p':
        'El almacén embebido no da ACID multi-árbol, así que el inventario no pretende tenerlo: un solo escritor a la vez (con_ledger sobre un Mutex<Ledger> global), validar antes de escribir, un libro de movimientos append-only y flush() como punto de durabilidad.',
      'code.2c':
        'Los movimientos se indexan cronológicamente, así que iter().rev() da el orden de recencia sin ordenar. Los IDs y nombres son tipos de tamaño fijo sin heap (struct Sku([u8; 32], u8)), así que los barridos no asignan memoria.',

      'code.3t': 'FEFO, empaques y una única fuente de precio',
      'code.3p':
        'Los perecederos consumen de los lotes por orden de vencimiento, y el camino inverso devuelve las unidades al lote vigente más próximo. El empaque no es un segundo inventario: "2 cajas" se convierte a unidades base una sola vez, con la misma conversión que usan la previsualización y el cobro.',
      'code.3c':
        'resolver_precio_presentacion es el único lugar que decide precio y factor, y construir_lineas_venta es la única fábrica de líneas — compartida por previsualizar_cobro y registrar_venta. Lo que la pantalla confirma es exactamente lo que se graba.',

      'code.4t': 'Un esquema que no se puede romper, respaldos que sobreviven versiones',
      'code.4p':
        'Los registros usan bincode posicional: agregar, quitar o reordenar un campo corrompería la base de cada cliente instalado. Los structs persistidos están congelados, lo nuevo va en árboles nuevos, y los respaldos son versionados y con checksum de punta a punta.',
      'code.4c':
        'Un fixture de la build instalada del cliente se importa en CI y se compara byte a byte contra HEAD (compat_backup_cliente.rs). Restaurar además limpia los árboles que un respaldo viejo no traía, para que no quede residuo.',

      'code.5t': 'Contratos que se hacen cumplir leyendo el código fuente',
      'code.5p':
        'Lo motivó un bug real: la UI llamaba a eliminar_consumo con un argumento cantidad extra; Tauri ignora silenciosamente los argumentos desconocidos y se borraba la línea completa. La corrección fue estructural — un test que parsea las firmas #[tauri::command] y cada llamada invocar().',
      'code.5c':
        'La suite afirma que la guarda de turno aparece exactamente en estos ocho comandos: si se agrega un noveno sin actualizar el test, CI falla.',

      'code.6t': 'Una app de escritorio que se cura sola',
      'code.6p':
        'La UI manda un latido cada 5 segundos; el shell lo guarda en un AtomicI64 y un hilo vigilante recarga la ventana si el latido se calla 30 segundos — con un cooldown de 120 segundos para que no entre en bucle.',
      'code.6c':
        'La suite E2E lo valida congelando el renderer 45 segundos y comprobando que la ventana vuelve. La misma disciplina aplica al estado: la tasa manual se vuelve a comprobar dentro del mismo lock de escritura que refresca desde el BCV, así que una lectura vieja nunca sobrescribe la decisión de un operador.',

      'ver.kicker': '04 — Verificación',
      'ver.title': 'Pruebas antes que promesas',
      'ver.lead': 'Tres capas, desde tests unitarios hasta un arnés remoto que hace clics sobre la aplicación real.',
      'ver.l1t': 'Unitarios y contrato',
      'ver.l1p':
        '64 tests Rust en el core más 5 en el shell de escritorio, y 96 tests de frontend en 9 suites. El contrato de dinero frontend/backend se hace cumplir con tests de contrato 1:1. Cobertura del core Rust: 95.15% de líneas (92.59% de funciones, 91.13% de regiones, medido con cargo-llvm-cov).',
      'ver.l2t': 'Propiedades',
      'ver.l2p':
        'proptest en Rust (suites de integración con propiedades) y fast-check en TypeScript atacan las invariantes de dinero e inventario con casos aleatorios.',
      'ver.l3t': 'E2E real por CDP',
      'ver.l3p':
        'Sin mocks: una build de pruebas de la app Tauri expone el Chrome DevTools Protocol y Playwright-core hace clics reales sobre el WebView2 real. El arnés corre desde una estación Linux por SSH/SCP contra un Windows Server, con APPDATA aislado y tarea programada interactiva. El binario de pruebas y el flag de depuración nunca llegan al instalador — verificado en el artefacto final.',
      'ver.h1': 'Estación Linux',
      'ver.h2': 'Windows Server',
      'ver.h3': 'App Tauri real (WebView2)',
      'ver.b1': 'Cada comando Tauri es ejercido por el arnés E2E: 68 directamente (scripts o el latido de la app), 2 comandos heredados a través de sus envoltorios.',
      'ver.b2': 'Licencia forjada rechazada: la app se niega a operar (escenario A4).',
      'ver.b3': 'Doble clic en COBRAR crea exactamente una venta: un reenvío devuelve el ticket original.',
      'ver.b4': 'Cinco ventas concurrentes dejan el stock exacto; el oversell se rechaza.',
      'ver.b5': 'Cruce de medianoche (VET) y las 8 guardas de jornada verificadas.',
      'ver.b6': 'Payloads Unicode/XSS en etiquetas y notas quedan inertes.',
      'ver.b7': 'La actualización sobre una versión instalada conserva los datos con 0 diferencias de hash.',
      'ver.b8': 'El instalador final no contiene flag ni puerto de depuración.',

      'num.kicker': '05 — Números',
      'num.title': 'Cada afirmación tiene un número',
      'num.r1': 'Tests del core Rust',
      'num.green': 'todos en verde',
      'num.r2': 'Tests del shell de escritorio (Windows)',
      'num.r3': 'Tests de frontend',
      'num.r4': 'Cobertura de líneas (core Rust)',
      'num.r4v': '95.15% · piso, no prueba',
      'num.r5': 'Escenarios E2E',
      'num.r6': 'Scripts E2E (CDP + Playwright)',
      'num.r7': 'Comandos Tauri sobre IPC',
      'num.r7v': '70 · todos ejercidos por E2E',
      'num.r9': 'Árboles de persistencia',
      'num.r10': 'Instalador firmado',
      'num.r11': 'Binario E2E (nunca distribuido)',
      'num.r12': 'Tamaño del código',
      'num.method':
        'Método: medido el 2026-09-30 — cargo test (core y shell), vitest run, cargo llvm-cov -p datiolabs-core, tamaños de artefactos y conteo de escenarios desde e2e/ESCENARIOS.md. Solo se publican números reproducibles con un comando documentado.',

      'gal.kicker': '06 — Producto',
      'gal.title': 'En operación hoy',
      'gal.lead': 'Capturas reales de la aplicación en ejecución (demo web, backend mock).',
      'gal.c1': 'Caja: catálogo, carrito en vivo, tasa BCV y totales exactos en USD y Bs.',
      'gal.c2': 'Panel del dueño: rentabilidad por rango de fechas, control de jornada y operadores.',
      'gal.c3': 'Inventario: stock, lotes y empaques, con rotación FEFO para perecederos.',
      'gal.c4': 'Cuentas abiertas: consumos, abonos parciales y saldos en ambas monedas.',

      'st.kicker': '07 — Estado',
      'st.title': 'En producción. Privado por diseño.',
      'st.text':
        'Las fases 1–4 están implementadas, verificadas y empaquetadas (2026-09-19): producto, tasa offline, capacidades multi-rubro y el stack de verificación. El programa está corriendo activamente en negocios de Venezuela. El código es privado porque es un producto comercial.',
      'st.p1': 'Producto y dinero',
      'st.p2': 'Tasa BCV offline',
      'st.p3': 'Multi-rubro',
      'st.p4': 'Stack de verificación',

      'hire.kicker': 'Disponible para trabajar',
      'hire.title': 'Disponible para roles Rust',
      'hire.text':
        'Backend, sistemas o edge — remoto, o presencial en Argentina. El código es privado; los fragmentos de arriba son reales y puedo recorrerlos en vivo.',
      'hire.email': 'Escríbeme',

      'foot.tag': 'Caso de estudio de ingeniería',
      'foot.product': 'Sitio del producto',
      'foot.demo': 'Demo en vivo',
      'foot.by': 'Construido por Miguel Cordero Pamphile'
    }
  };

  var STORAGE_KEY = 'dl-engineering-lang';
  var DEFAULT_LANG = 'en';

  function normalize(lang) {
    return lang === 'es' ? 'es' : 'en';
  }

  function applyLang(lang) {
    var dict = DICT[lang];
    document.documentElement.lang = lang;
    document.title = dict['doc.title'];
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-i18n');
      if (dict[key]) nodes[i].textContent = dict[key];
    }
    var toggle = document.getElementById('lang-toggle');
    if (toggle) toggle.textContent = lang === 'es' ? 'EN' : 'ES';
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      /* storage unavailable: ignore */
    }
  }

  function pickLang() {
    try {
      var params = new URLSearchParams(window.location.search);
      var fromUrl = params.get('lang');
      if (fromUrl) return normalize(fromUrl);
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return normalize(stored);
    } catch (e) {
      /* ignore */
    }
    var nav = (navigator.language || '').toLowerCase();
    if (nav.indexOf('es') === 0) return 'es';
    return DEFAULT_LANG;
  }

  var current = pickLang();
  applyLang(current);

  var toggle = document.getElementById('lang-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      current = current === 'es' ? 'en' : 'es';
      applyLang(current);
    });
  }
})();
