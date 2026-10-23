    // FIX: API_URL configurable vía meta tag, fallback al dominio Railway.
    // En el <head>: <meta name="api-url" content="https://...">
    // ── Selector de canal (INV-MINI-29) ───────────────────────────────────────
    // Un MISMO deploy sirve varios canales TOTALMENTE INDEPENDIENTES: el backend
    // de cada canal es una instancia propia de betting-stats-bot con su PROPIA
    // base de datos (stats separadas). Se elige con ?c=<clave> en la URL del
    // WebApp (configurada en BotFather) o del navegador. Sin ?c → canal por
    // defecto (el del meta api-url), 100% compatible con el comportamiento actual.
    // IMPORTANTE: todo host que aparezca aquí DEBE estar en connect-src de la CSP
    // del index.html (INV-MINI-20, host exacto sin comodín). Al añadir/editar un
    // canal: (1) pon su URL real aquí, (2) añádela a connect-src, (3) sube el ?v=
    // de los <script> (INV-MINI-28).
    const _API_DEFAULT = (
      document.querySelector('meta[name="api-url"]')?.content
      || "https://betting-stats-bot-production.up.railway.app"
    );
    // `bot` = @username del bot de cada canal (para el login web fuera de Telegram;
    // dentro de Telegram el initData ya viene firmado por el bot que abre el WebApp).
    const _BOT_DEFAULT = document.querySelector('meta[name="tg-bot-username"]')?.content || "";
    const CANALES = {
      "1": { apiUrl: _API_DEFAULT, label: "Canal 1", bot: _BOT_DEFAULT },
      "2": { apiUrl: "https://web-production-aa47e.up.railway.app", label: "Canal 2", bot: "tubettingstats2bot" },
      "3": { apiUrl: "https://betting-stats-bot-canal3-production.up.railway.app", label: "Canal 3", bot: "HBCBettingStats_bot" },
      "4": { apiUrl: "https://betting-stats-bot-canal4-production.up.railway.app", label: "Canal 4", bot: "GuGaBets_bot" },
    };
    const _canalKey = new URLSearchParams(location.search).get("c");
    const CANAL = CANALES[_canalKey] || CANALES["1"];
    const API_URL = CANAL.apiUrl;
    // Indicador visible del canal activo (solo si no es el canal por defecto),
    // para no confundir stats de canales independientes. Sin eventos ni HTML
    // crudo: solo document.title (INV-MINI-13).
    if (CANAL !== CANALES["1"]) {
      document.title = "Betting Stats · " + CANAL.label;
    }
    // ── Iconos (INV-MINI-44): trazos SVG propios en lugar de emojis en la UI de la app.
    // Strings estáticos (sin datos del usuario); edge.js/pico.js los reusan vía ico().
    const ICON = {
      home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
      chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-6"/>',
      list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3.5 6h.01"/><path d="M3.5 12h.01"/><path d="M3.5 18h.01"/>',
      sliders: '<path d="M20 7h-9"/><path d="M14 17H4"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
      refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>',
      share: '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>',
      plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
      edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
      trash: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
      chevL: '<path d="m15 18-6-6 6-6"/>',
      chevR: '<path d="m9 18 6-6-6-6"/>',
      chevD: '<path d="m6 9 6 6 6-6"/>',
      logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
      coins: '<circle cx="9" cy="9" r="6"/><path d="M18.1 10.4A6 6 0 1 1 10.3 18"/><path d="M8 7h1v4"/>',
      check: '<path d="M20 6 9 17l-5-5"/>',
      x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      minus: '<path d="M5 12h14"/>',
      up: '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
      down: '<path d="m7 7 10 10"/><path d="M17 8v9H8"/>',
      flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
      chartBar: '<path d="M3 3v18h18"/><path d="M8 17v-5"/><path d="M13 17V8"/><path d="M18 17v-3"/>',
      logo: '<path d="M5 20v-7"/><path d="M12 20V5"/><path d="M19 20v-10"/>',
      image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.5-3.5L9 20"/>',
      layers: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>',
      link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
      sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v4"/><path d="M21 5h-4"/>',
      alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    };
    const ico = (n, cls) => `<svg class="ico${cls ? " " + cls : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n] || ""}</svg>`;

    const tg = window.Telegram?.WebApp;
    const _isLowGPU = navigator.userAgent.includes("Linux") && !navigator.userAgent.includes("Android");
    // ── Tema: hereda el modo claro/oscuro del cliente Telegram ────────────────────
    // Mapea themeParams → variables CSS de superficie/texto. Los colores SEMÁNTICOS
    // (win=verde, loss=rojo, pend=ámbar, accent) NO cambian con el tema: significan lo
    // mismo en claro y oscuro. Sin themeParams (fuera de Telegram o cliente viejo) se
    // conserva la paleta oscura del :root.
    function applyTelegramTheme() {
      if (!tg) return;
      const tp = tg.themeParams || {};
      const dark = (tg.colorScheme || "dark") !== "light";
      const root = document.documentElement;
      root.dataset.theme = dark ? "dark" : "light";
      const S = (v, c) => { if (c) root.style.setProperty(v, c); };
      // Convención de Telegram (INV-MINI-44): secondary_bg = fondo de página y
      // section_bg = tarjeta, así las tarjetas se separan del fondo en claro y oscuro.
      const page = tp.secondary_bg_color || tp.bg_color;
      const card = tp.section_bg_color || tp.bg_color;
      S("--bg", page);
      S("--surface", card);
      S("--card", card);
      S("--card2", _mixHex(card, tp.text_color, dark ? 0.07 : 0.05));
      S("--text", tp.text_color);
      S("--text-2", tp.hint_color || tp.subtitle_text_color);
      const line = dark ? "255,255,255" : "20,28,46";
      root.style.setProperty("--border", `rgba(${line},${dark ? 0.07 : 0.08})`);
      root.style.setProperty("--text-3", `rgba(${line},${dark ? 0.38 : 0.42})`);
      root.style.setProperty("--chart-grid", `rgba(${line},${dark ? 0.06 : 0.07})`);
      root.style.setProperty("--chart-tick", tp.hint_color || (dark ? "#7A808B" : "#8A909B"));
      if (!dark) {
        root.style.setProperty("color-scheme", "light");
        root.style.setProperty("--accent", "#5B63F0");
        root.style.setProperty("--accent-dim", "rgba(91,99,240,0.10)");
        root.style.setProperty("--border-hi", "rgba(91,99,240,0.40)");
        root.style.setProperty("--win", "#16A35F");
        root.style.setProperty("--win-bg", "rgba(22,163,95,0.10)");
        root.style.setProperty("--loss", "#E5484D");
        root.style.setProperty("--loss-bg", "rgba(229,72,77,0.09)");
        root.style.setProperty("--pend", "#C9820F");
        root.style.setProperty("--pend-bg", "rgba(201,130,15,0.11)");
      }
      // "Chrome" de la app: header translúcido sobre el fondo y barra inferior del
      // color de tarjeta, para que iconos y texto mantengan contraste en ambos modos.
      if (page) root.style.setProperty("--header-bg", _hexAlpha(page, 0.86));
      if (card) {
        root.style.setProperty("--nav-bg", _hexAlpha(card, 0.92));
        root.style.setProperty("--nav-bg-solid", card);
      }
      try { tg.setBackgroundColor("bg_color"); } catch (_) {}
      try { tg.setHeaderColor("secondary_bg_color"); } catch (_) {}
    }
    // Helpers de color para themeParams (siempre "#rrggbb"); si no es hex, se devuelve tal cual.
    function _hexRgb(h) {
      const m = /^#?([0-9a-f]{6})$/i.exec(String(h || "").trim());
      if (!m) return null;
      const n = parseInt(m[1], 16);
      return [n >> 16, (n >> 8) & 255, n & 255];
    }
    function _hexAlpha(h, a) { const c = _hexRgb(h); return c ? `rgba(${c[0]},${c[1]},${c[2]},${a})` : h; }
    function _mixHex(a, b, t) {
      const x = _hexRgb(a), y = _hexRgb(b);
      if (!x || !y) return a;
      return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
    }
    function refreshChartsTheme() {
      if (typeof Chart === "undefined") return;
      Object.keys(charts).forEach(destroyChart);
      initCharts();
    }
    if (tg) {
      tg.ready();
      if (tg.isVersionAtLeast("6.1")) tg.expand();
      tg.disableVerticalSwipes();
      applyTelegramTheme();
      tg.onEvent("themeChanged", () => { applyTelegramTheme(); refreshChartsTheme(); });
      if (tg.platform === "tdesktop" || tg.platform === "weba" || tg.platform === "webk" || tg.platform === "webz" || _isLowGPU) {
        document.documentElement.classList.add("no-blur");
      }
    }
    if (document.documentElement.classList.contains("no-blur") && typeof Chart !== "undefined") {
      Chart.defaults.animation = false;
      Chart.defaults.animations = {};
    }

    // ── Sesión web (Telegram Login Widget) ───────────────────────────────────────
    // Guarda { token, user } en localStorage después de autenticarse con el Widget.
    // Permite usar la app desde cualquier navegador sin Telegram abierto.
    const _SESSION_KEY = "bsw_session";
    function _loadSession() {
      try { return JSON.parse(localStorage.getItem(_SESSION_KEY) || "null"); } catch (_) { return null; }
    }
    function _saveSession(d) {
      try { localStorage.setItem(_SESSION_KEY, JSON.stringify(d)); } catch (_) {}
    }
    function _clearSession() {
      try { localStorage.removeItem(_SESSION_KEY); } catch (_) {}
    }
    let _webSession = _loadSession(); // { token, user } | null
    function _isAuthed() { return !!(tg?.initData) || !!_webSession?.token; }

    // Callback global que invoca el widget de Telegram al completar el login.
    window.onTelegramAuth = async function(data) {
      const errEl = document.getElementById("web-login-err");
      if (errEl) errEl.textContent = "";
      try {
        const resp = await fetch(API_URL + "/api/session/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const j = await resp.json();
        if (!resp.ok) throw new Error(j.error || "Autenticación fallida");
        _webSession = { token: j.token, user: j.user };
        _saveSession(_webSession);
        document.getElementById("web-login").style.display = "none";
        await cargarDatos();
      } catch (err) {
        if (errEl) errEl.textContent = "" + err.message;
      }
    };

    // Inyecta el widget de Telegram Login del bot del canal ACTIVO (INV-MINI-29).
    // Método dinámico oficial del widget; el bot por defecto sale del meta
    // tg-bot-username. Una sola vez por carga.
    let _loginWidgetDone = false;
    function _setupLoginWidget() {
      if (_loginWidgetDone) return;
      const cont = document.getElementById("tg-widget-container");
      if (!cont || !CANAL.bot) return;
      _loginWidgetDone = true;
      cont.textContent = "";
      const s = document.createElement("script");
      s.async = true;
      s.src = "https://telegram.org/js/telegram-widget.js?22";
      s.setAttribute("data-telegram-login", CANAL.bot);
      s.setAttribute("data-size", "large");
      s.setAttribute("data-onauth", "onTelegramAuth(user)");
      s.setAttribute("data-request-access", "write");
      cont.appendChild(s);
    }
    function showLoginScreen() {
      const el = document.getElementById("web-login");
      if (!el) return;
      _setupLoginWidget();
      el.style.display = "flex";
      document.getElementById("bottomNav").style.display = "none";
      document.getElementById("app").innerHTML = "";
    }

    async function logout() {
      try {
        if (_webSession?.token) {
          await fetch(API_URL + "/api/session/logout", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + _webSession.token },
          });
        }
      } catch (_) {}
      _webSession = null;
      _clearSession();
      showLoginScreen();
    }

    // ── Auth para endpoints CRUD ──────────────────────────────────────────────────
    // §7.2: parseo de respuesta con mensaje user-friendly por status. Evita exponer
    // errores crípticos de parseo ("Unexpected token <") cuando el proxy de Railway
    // devuelve un cuerpo no-JSON (502/503/504/413).
    async function safeJson(resp) {
      let j = null;
      try { j = await resp.json(); } catch (_) { j = null; }
      if (!resp.ok || j === null) {
        const byStatus = {
          413: "Imagen demasiado grande. Reduce tamaño o resolución.",
          429: "Demasiadas solicitudes o presupuesto diario agotado. Intenta más tarde.",
          502: "Servidor no disponible (502). Reintenta en unos segundos.",
          503: "Servidor no disponible (503). Reintenta en unos segundos.",
          504: "El servidor tardó demasiado (504). Reintenta.",
        };
        throw new Error((j && j.error) || byStatus[resp.status] || `Error del servidor (HTTP ${resp.status}).`);
      }
      return j;
    }
    // §7.2: reintenta automáticamente SOLO en 503/504 (servicio no disponible),
    // nunca en 4xx. Backoff corto. Las mutaciones no se reintentan (no idempotentes).
    async function fetchRetry503(url, opts, attempts = 3) {
      let res;
      for (let i = 0; i < attempts; i++) {
        res = await fetch(url, opts);
        if ((res.status === 503 || res.status === 504) && i < attempts - 1) {
          await new Promise(r => setTimeout(r, 600 * (i + 1)));
          continue;
        }
        return res;
      }
      return res;
    }
    function apiHeaders(extra = {}) {
      const headers = { "Content-Type": "application/json", ...extra };
      if (tg?.initData) {
        headers["X-Telegram-Init-Data"] = tg.initData;
      } else if (_webSession?.token) {
        headers["Authorization"] = "Bearer " + _webSession.token;
      }
      return headers;
    }
    const _noBlur = document.documentElement.classList.contains("no-blur");
    // Lee una variable CSS (resuelta) para alimentar colores de Chart.js según el tema activo.
    const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || undefined;

    /* Renderiza un canvas o un botón lazy según el entorno */
    function chartPlaceholder(canvasId, makeKey, tall = false) {
      const cls = tall ? "chart-wrap-tall" : "chart-wrap";
      if (_noBlur && window.innerWidth < 768) {
        return `<div class="${cls}" id="cwrap-${canvasId}" style="display:flex;align-items:center;justify-content:center;background:var(--card2);border-radius:var(--radius-md)"><button class="lazy-chart-btn" data-action="load-lazy-chart" data-canvas-id="${canvasId}" data-make-key="${makeKey}">${ico("chartBar", "ico-sm")}Cargar gráfica</button></div>`;
      }
      return `<div class="${cls}"><canvas id="${canvasId}" aria-label="Gráfica ${canvasId}" role="img"></canvas></div>`;
    }

    function loadLazyChart(canvasId, makeKey) {
      const wrap = document.getElementById("cwrap-" + canvasId);
      if (!wrap) return;
      wrap.removeAttribute("id");
      wrap.innerHTML = `<canvas id="${canvasId}"></canvas>`;
      if (makeKey === "neto") makeChartNeto();
      else if (makeKey === "meses") makeChartMeses();
      else if (makeKey === "dep") makeChartDep();
      else if (makeKey === "tipo") makeChartTipo();
      else if (makeKey === "rolling") makeChartRolling();
      else if (makeKey === "cumulative") makeChartCumulative();
      else if (makeKey === "tipomix") makeChartTipoMix();
      else if (makeKey === "monthlypl") makeChartMonthlyPL();
      else if (makeKey === "bt2") makeChartCompounding();
    }

    let DATA = null, filtroDeporte = "Todos", filtroEquipo = "";
    let filtroEquipoGestion = "", _gListLimit = 40;
    let mesActual = null, mesesDisponibles = [];
    let charts = {}, tabActual = "resumen", cargando = false;
    let _renderedSections = new Set();
    // Momentum (B4): N y tipo de racha seleccionados + set de row_id para filtrar
    // el Wager Log ("Filtrar historial a estos picks"). null = sin filtro activo.
    let momentumN = 1, momentumTipo = "win", filtroMomentumIds = null;
    // Wager Log (B8): orden y paginación 100% cliente sobre DATA.apuestas.
    let wlSortCol = "fecha", wlSortDir = "desc", wlPage = 1;
    const WL_PAGE_SIZE = 50;
    // Monthly P/L (B6): toggle mensual/semanal del chart de neto por período.
    let monthlyPLVista = "mensual";
    // Caché del análisis IA: localStorage (persiste entre cierres/reaperturas de
    // la mini-app en Telegram). sessionStorage NO servía porque Telegram lo borra
    // al cerrar el webview, forzando un análisis nuevo en cada sesión.
    // Namespaced por canal (INV-MINI-29): sin esto, dos bots comparten el mismo
    // origen (misma miniapp) y por tanto el mismo localStorage, así que el análisis
    // de un canal se veía también en el otro.
    const _PATRONES_LS_KEY = "betstats_patrones_cache_c" + (_canalKey || "1");
    let _patronesData = null, _patronesCargando = false, _patronesPeekDone = false;

    function _cargarPatronesGuardados() {
      try {
        const raw = localStorage.getItem(_PATRONES_LS_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (_) { return null; }
    }

    function _guardarPatrones(data) {
      try { localStorage.setItem(_PATRONES_LS_KEY, JSON.stringify(data)); } catch (_) {}
    }

    // Navegación primaria: 4 grupos alcanzables con el pulgar. Cada grupo agrupa una o
    // más de las secciones existentes (no se elimina ninguna); los análisis avanzados
    // viven en una sub-vista "Más" con BackButton nativo de Telegram.
    const NAV_GROUPS = [
      { id: "resumen",   icon: "home",    label: "Resumen",   sections: ["resumen", "semana"], more: true },
      { id: "graficas",  icon: "chart",   label: "Gráficas",  sections: ["deportes", "tipos", "rolling", "temporal"] },
      { id: "historial", icon: "list",    label: "Historial", sections: ["apuestas", "mes", "calendario"] },
      { id: "gestion",   icon: "sliders", label: "Gestión",   sections: ["gestion"] },
    ];
    const ADVANCED = ["kelly", "capital", "patrones", "backtest", "compounding"];
    const SECTION_LABELS = {
      resumen: "General", semana: "7 días",
      deportes: "Deportes", tipos: "Tipos", rolling: "Tendencia", temporal: "Timing",
      apuestas: "Bets", mes: "Mes", calendario: "Calendario", gestion: "Gestión",
      kelly: "Kelly", capital: "Capital", patrones: "Patrones IA", backtest: "Simulador",
      compounding: "Compounding",
    };
    let currentGroup = "resumen", _inAdvanced = false, _backReady = false;
    function groupOf(sectionId) { return NAV_GROUPS.find(g => g.sections.includes(sectionId)) || null; }
    function haptic(kind) {
      try {
        const h = tg?.HapticFeedback; if (!h) return;
        if (kind === "select") h.selectionChanged();
        else if (kind === "success" || kind === "error" || kind === "warning") h.notificationOccurred(kind);
        else h.impactOccurred(kind || "light");
      } catch (_) {}
    }

    function esc(s) { return s == null ? "" : String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;") }
    // INV-MINI-43: todos los importes de /api/* vienen en UNIDADES (INV-XCUT-22). fmt*/fmtC*
    // muestran unidades ("12.5u"); fmtEq/eqLine, el equivalente en dinero al valor actual
    // de la unidad del canal (DATA.unidad.valor, que el owner fija en Ajustes).
    const _UNIDAD_DEF = { valor: 100, moneda: "$" };
    const unidad = () => (DATA && DATA.unidad && Number(DATA.unidad.valor) > 0) ? DATA.unidad : _UNIDAD_DEF;
    const _num2 = a => a.toLocaleString("es-MX", { maximumFractionDigits: 2 });
    const fmt = n => n == null ? "—" : `${Number(n) < 0 ? "−" : ""}${_num2(Math.abs(Number(n)))}u`;
    const fmtp = n => n == null ? "—" : `${Number(n).toFixed(1)}%`;
    const fmts = n => n == null ? "—" : Number(n) >= 0 ? `+${fmt(n)}` : fmt(n);
    // Unidades compactas para el resumen inicial (hero + KPIs): 12.4u, 340u, 1.5ku.
    // El número exacto se conserva en el title (ver fmt).
    const fmtC = n => {
      if (n == null) return "—";
      const v = Number(n), a = Math.abs(v), s = v < 0 ? "−" : "";
      if (a < 100) return `${s}${+a.toFixed(1)}u`;
      if (a < 999.5) return `${s}${Math.round(a)}u`;
      if (a < 999500) { const k = a / 1e3; return `${s}${k < 10 ? +k.toFixed(1) : Math.round(k)}ku`; }
      const m = a / 1e6; return `${s}${m < 10 ? +m.toFixed(2) : +m.toFixed(1)}Mu`;
    };
    const fmtsC = n => n == null ? "—" : Number(n) >= 0 ? `+${fmtC(n)}` : fmtC(n);
    // Neto compacto para celdas del calendario (espacio mínimo): ±N.N (en u, sin sufijo).
    const fmtsCompact = n => {
      if (n == null) return "";
      const v = Number(n), s = v >= 0 ? "+" : "−", a = Math.abs(v);
      if (a >= 1000) return `${s}${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}k`;
      return `${s}${a < 10 ? +a.toFixed(1) : Math.round(a)}`;
    };
    // Equivalente en dinero de n unidades: "≈ $1,240" / "≈ +$1,240".
    const fmtEq = (n, signo) => {
      if (n == null) return "";
      const u = unidad(), v = Number(n) * Number(u.valor), a = Math.round(Math.abs(v));
      const s = v < 0 ? "−" : (signo && v > 0 ? "+" : "");
      return `≈ ${s}${u.moneda}${a.toLocaleString("es-MX")}`;
    };
    // Línea pequeña bajo un hero/KPI con el equivalente en dinero.
    const eqLine = (n, signo) => n == null ? "" : `<div class="eq-line">${esc(fmtEq(n, signo))}</div>`;
    const signColor = n => Number(n) >= 0 ? "green" : "red";
    function mesLabel(m) { if (!m) return "—"; const [y, mo] = m.split("-"); return ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][parseInt(mo, 10) - 1] + " " + y }

    /* ── Fetch ── */
    let _ctrl = null;
    // Caché de /api/stats en sessionStorage (INV-MINI-04: localStorage prohibido,
    // sessionStorage permitido). Permite pintado instantáneo al reabrir sin re-consultar
    // en frío; siempre se refresca en segundo plano.
    // Sufijo _u: una caché de antes de las unidades (importes en $) no debe pintarse como u.
    const _STATS_CACHE_KEY = "betstats_stats_cache_u";
    function _loadStatsCache() {
      try { const raw = sessionStorage.getItem(_STATS_CACHE_KEY); return raw ? JSON.parse(raw) : null; } catch (_) { return null; }
    }
    function _saveStatsCache(json) {
      try { sessionStorage.setItem(_STATS_CACHE_KEY, JSON.stringify(json)); } catch (_) {}
    }
    function _applyStats(json) {
      DATA = json;
      mesesDisponibles = DATA.grafica_meses.map(m => m.mes);
      if (!mesActual || !mesesDisponibles.includes(mesActual)) mesActual = mesesDisponibles[mesesDisponibles.length - 1] || null;
      renderApp();
    }
    // Header con avatar + saludo. Soporta Telegram WebApp y sesión web (Login Widget).
    function _headerHTML(opts) {
      const u = (tg && tg.initDataUnsafe ? tg.initDataUnsafe.user : null) || _webSession?.user || null;
      const name = u && u.first_name ? String(u.first_name).trim() : "";
      const initial = name ? name[0].toUpperCase() : "B";
      const hi = name ? `Hola, ${esc(name)}` : "Hola";
      const titulo = CANAL !== CANALES["1"] ? `Betting Stats · ${esc(CANAL.label)}` : "Betting Stats";
      const refresh = opts && opts.refresh
        ? `<button class="refresh-btn refresh-round" data-action="recargar" aria-label="Recargar" title="Recargar">${ico("refresh", "ico-sm")}</button>`
        : "";
      const logoutBtn = (!tg && _webSession)
        ? `<button class="logout-btn" data-action="logout">${ico("logout", "ico-sm")}Salir</button>`
        : "";
      return `<div class="header"><div class="header-inner"><div class="user-block"><div class="avatar">${esc(initial)}</div><div class="greet"><span class="hi">${hi}</span><span class="nm">${titulo}</span></div></div><div class="header-actions">${logoutBtn}${refresh}</div></div></div>`;
    }
    function _renderSkeleton() {
      document.getElementById("app").innerHTML = `
    ${_headerHTML({ refresh: false })}
    <div class="content">
      <div class="skeleton" style="height:52px;border-radius:999px;margin:4px 0 18px"></div>
      <div class="skeleton sk-hero" style="height:300px"></div>
      <div class="skeleton" style="height:46px;border-radius:999px;margin-bottom:24px"></div>
      <div class="skeleton" style="height:220px"></div>
    </div>`;
    }
    function _showStaleBanner() {
      const cont = document.querySelector(".content");
      if (!cont || document.getElementById("staleBanner")) return;
      const b = document.createElement("div");
      b.id = "staleBanner";
      b.className = "stale-banner";
      b.innerHTML = `<span>Sin conexión: mostrando los últimos datos guardados.</span><button data-action="recargar">Reintentar</button>`;
      cont.insertBefore(b, cont.firstChild);
    }
    async function cargarDatos() {
      if (!_isAuthed()) {
        showLoginScreen();
        return;
      }
      // 1) Pintado instantáneo desde caché de sesión (o skeleton si es carga en frío).
      const cached = _loadStatsCache();
      const paintedFromCache = !!(cached && cached.resumen && Array.isArray(cached.apuestas));
      if (paintedFromCache) _applyStats(cached);
      else _renderSkeleton();
      // 2) Refresco fresco desde la API en segundo plano.
      if (_ctrl) _ctrl.abort();
      _ctrl = new AbortController();
      const timeout = setTimeout(() => _ctrl.abort(), 12000);
      try {
        const res = await fetchRetry503(`${API_URL}/api/stats`, { headers: apiHeaders(), signal: _ctrl.signal });
        if (res.status === 401 && !tg?.initData) {
          // Sesión web expirada o invalidada (p.ej. redeploy del servidor).
          _webSession = null;
          _clearSession();
          showLoginScreen();
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.resumen || !Array.isArray(json.apuestas)) throw new Error("Datos inesperados");
        _saveStatsCache(json);
        // Evita re-render (parpadeo/reset de scroll) si nada cambió respecto a la caché.
        if (!paintedFromCache || JSON.stringify(json) !== JSON.stringify(cached)) _applyStats(json);
      } catch (e) {
        const msg = e.name === "AbortError"
          ? "Tiempo de espera agotado (12s). Verifica tu conexión o que el backend esté disponible."
          : e.message;
        if (paintedFromCache) {
          _showStaleBanner();   // ya hay datos en pantalla: avisar sin romper la vista
        } else {
          document.getElementById("app").innerHTML = `<div style="padding:20px"><div class="error-box"><p>No pudimos cargar tus datos</p><small>${esc(msg)}</small><br><button class="retry-btn" data-action="recargar">${ico("refresh", "ico-sm")}Reintentar</button></div></div>`;
        }
      } finally { clearTimeout(timeout); }
    }

    /* ── Analytics helpers (client-side) ── */
    function normalizaTipo(raw) {
      const t = (raw || "").toLowerCase().trim();
      if (!t) return "Otro";
      // Combinada mismo partido — bet-builder "Win + O2.5", "ML & O1.5 Goals", "or Draw & O1.5",
      // "Win + BTTS", "to Win and U3.5". Mismo orden que analytics.py (_RE_COMBINADA antes
      // que _RE_PARLAY, INV-BIZ-55). "Brighton & Hove" no casa: tras el & va un mercado.
      if (/\bcombinad|bet builder|\+\s*(o|u)\d|\bgana\b\s*\+|[&+]\s*(o|u)\d|[&+]\s*(over|under|total|btts|both teams|ambos|m[aá]s de|menos de)|\band\s+(o|u)\d|\band\s+(over|under)\b/.test(t)) return "Combinada";
      // Parlay: puede contener "winner", "over", etc. en sus picks
      if (/parlay|combo|acumulad|multi.?bet|\bsgp\b|same.?game/.test(t)) return "Parlay";
      // Futuro / Outright
      if (/\boutright\b|futures?|to win the|championship|tournament winner|season (wins?|points?|goals?)|award|mvp|heisman|ballon/.test(t)) return "Futuro";
      // Córners / Tarjetas — mercados secundarios: categoría propia ANTES de Moneyline/Handicap/Total O/U
      // (gemelo de analytics.py _RE_CORNERS/_RE_TARJETAS, INV-BIZ-21 / INV-XCUT-02).
      if (/\bcorners?\b|córner|saques? de esquina|tiros? de esquina/.test(t)) return "Córners";
      if (/\bcards?\b|tarjeta|booking|amonestac/.test(t)) return "Tarjetas";
      // Mercados de evento con palabras de Moneyline/Total ("to win both halves", "Aces ML",
      // "Shots - Total Over"): Props ANTES de Moneyline (gemelo de _RE_PROPS_ESPECIAL).
      if (/both halves|ambas mitades|\baces?\b|\bshots?\b/.test(t)) return "Props";
      // Doble oportunidad — va ANTES de Moneyline: "Double Chance - Home/Draw" no debe
      // caer en Moneyline por el sufijo home/draw (gemelo de analytics.py _RE_DOBLE_OPORTUNIDAD).
      // Incluye fraseo "Team Win or Draw" / "Team or Draw" (equivalente a X2/1X en texto libre).
      if (/double chance|doble oportunidad|home\/draw|draw\/away|home\/away|\bor draw\b|draw or \w|gana o empata|empata o gana|\bo empata\b/.test(t)) return "Doble oportunidad";
      // Moneyline / Ganador — DNB, to qualify, W1/W2, fight/race winner, MMA
      if (/moneyline|\b1x2\b|\bml\b|ganador|team wins?|\bw[12]\b|\bwinner\b|to win\b|match result|draw no bet|\bdnb\b|to qualify|fight winner|race winner|series winner|method of victory|\bko\b|\btko\b|decision win|round betting|will win|\bgana\b(?!.*(sin recibir|porter[ií]a|valla invicta))|^(empate|draw)$|\bclasifica(n|r)?\b|\bpasa de ronda/.test(t)) return "Moneyline";
      // "Asian Total Over 2.75" es un total, no un hándicap (gemelo de _RE_TOTAL_ASIATICO).
      if (/asian (handicap\s*-\s*)?total/.test(t)) return "Total O/U";
      // Handicap — puck line (NHL), run line (MLB), point spread, AH
      if (/handicap|hcp|\bspread\b|\basian\b|puck line|run line|point spread|european handicap|\beh\b|alt(ernate)? spread|\S\s[+-]\d+(\.\d+)?$|[+-]\d+(\.\d+)?\s*(games?|sets?|juegos?|maps?|mapas?|frames?|goals?|goles|points?|puntos|runs?|carreras)\b/.test(t)) return "Handicap";
      // BTTS
      if (/ambos|btts|both teams to score|\bgg\b|no goal/.test(t)) return "BTTS";
      // Marcador exacto
      if (/correct score|marcador exacto|resultado exacto|exact score|(^|\s)[0-3]-[0-3](\s*(in )?sets?)?$/.test(t)) return "Marcador exacto";
      // Props — va ANTES de Total O/U: "Player Points Over 25.5" debe ser Prop, no Total O/U.
      // Incluye "Win to Nil"/clean sheet y "shots on target" (gemelo de analytics.py _RE_PROPS).
      if (/\bplayer\b|\bprop\b|anytime (scorer|td|goal|basket|touchd)|first (goal|scorer|td|basket|pitch|serve|touchd)|last (goal|scorer|td|touchd)|to score\b|rushing yards|receiving yards|passing yards|\bassists?\b|\brebounds?\b|strikeouts?\b|home run|top (batsman|bowler|scorer)|fall of wicket|wickets?\b|century\b|win to nil|to nil\b|clean sheet|porter[ií]a a (0|cero)|valla invicta|sin recibir gol|shots? on target|shots? (over|under)?\s*\d|both halves|ambas mitades|\baces?\b/.test(t)) return "Props";
      // Total O/U — \b evita "overtime", "overview", etc.
      if (/\bover\b|\bunder\b|\btotal\b|\bo\/u\b|más de|menos de|alt(ernate)? total|\bgames? o\/?u\b|\bsets? o\/?u\b|\bruns? o\/?u\b|half total|1st half total|q[1-4] total/.test(t)) return "Total O/U"; return "Otro";
    }
    /* Categoría de una apuesta (texto + patas): un "Parlay" con todas las patas del mismo
       partido es una Combinada. Gemelo de analytics.tipo_de_row (INV-BIZ-55). */
    function legsMismoPartido(legs) {
      if (!Array.isArray(legs) || legs.length < 2) return false;
      const partidos = new Set();
      for (const l of legs) {
        if (!l || typeof l !== "object") return false;
        const e = [l.equipo1, l.equipo2].map(x => String(x || "").trim().toLowerCase()).filter(Boolean);
        if (e.length) partidos.add(e.sort().join("|"));
      }
      return partidos.size === 1;
    }
    function tipoDe(a) {
      const cat = normalizaTipo(a?.tipo);
      return cat === "Parlay" && legsMismoPartido(a?.legs) ? "Combinada" : cat;
    }

    /* Apuestas resueltas (win/loss) en orden cronológico real: mismo criterio que
       usa el backend para "racha"/gráficas (fecha_partido, con row_id de desempate
       para picks del mismo día). Base compartida de Recent Form, Cumulative Profit,
       Momentum y Wager Log — evita recalcular el orden en cada widget. */
    function apuestasOrdenadas() {
      return DATA.apuestas
        .filter(a => a.status === "win" || a.status === "loss")
        .slice()
        .sort((a, b) => {
          const fa = a.fecha_partido || a.fecha || "", fb = b.fecha_partido || b.fecha || "";
          if (fa !== fb) return fa < fb ? -1 : 1;
          return (a.row_id || 0) - (b.row_id || 0);
        });
    }

    // Neto (P/L) de una apuesta. OJO: `a.ganancia` en una ganada es el COBRO bruto
    // (stake incluido) y en una perdida es −stake; sumarlo tal cual inflaba cada
    // acierto en su stake (FIX-NETO-MINI). void/pendiente → 0.
    function netoDe(a) {
      if (a.status === "win") return (a.ganancia || a.monto || 0) - (a.monto || 0);
      if (a.status === "loss") return -(a.monto || 0);
      return 0;
    }

    // Agrupa apuestasOrdenadas() por semana ISO (año-Www) sumando neto — vista
    // "Semanal" del chart Monthly P/L (B6). Usa fecha_partido (fallback fecha).
    function calcSemanal() {
      const buckets = {}, orden = [];
      for (const a of apuestasOrdenadas()) {
        const f = (a.fecha_partido || a.fecha || "").slice(0, 10);
        if (f.length !== 10) continue;
        const d = new Date(f + "T12:00:00Z");
        if (isNaN(d)) continue;
        const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        const dayNum = (tmp.getUTCDay() + 6) % 7; // 0=Lun
        tmp.setUTCDate(tmp.getUTCDate() - dayNum + 3); // jueves de esa semana ISO
        const firstThu = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
        const week = 1 + Math.round(((tmp - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
        const key = `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
        if (!(key in buckets)) { buckets[key] = 0; orden.push(key); }
        buckets[key] += netoDe(a);
      }
      return orden.sort().map(k => ({ periodo: k, neto: +buckets[k].toFixed(2) }));
    }

    // Recent Form (L5/L10, paridad con el tracker de referencia): record + neto
    // de las últimas `n` apuestas resueltas en orden cronológico.
    function calcRecentForm(n) {
      const ord = apuestasOrdenadas();
      const ult = ord.slice(-n);
      const wins = ult.filter(a => a.status === "win").length;
      const losses = ult.length - wins;
      const neto = ult.reduce((s, a) => s + netoDe(a), 0);
      return { wins, losses, neto, n: ult.length };
    }

    // Momentum: qué pasa en el pick SIGUIENTE a exactamente N resultados seguidos
    // del mismo tipo (streakType: "win"/"loss"). Recorre en orden cronológico
    // llevando la racha corriente; cada vez que la racha PREVIA al pick actual
    // coincide con streakLen/streakType, ese pick entra en la muestra.
    function calcMomentum(streakLen, streakType) {
      const ord = apuestasOrdenadas();
      let racha = 0, tipoRacha = "";
      const picks = [];
      for (const a of ord) {
        if (racha === streakLen && tipoRacha === streakType) picks.push(a);
        if (a.status === tipoRacha) racha++; else { tipoRacha = a.status; racha = 1; }
      }
      const wins = picks.filter(p => p.status === "win").length;
      const losses = picks.length - wins;
      const neto = picks.reduce((s, p) => s + netoDe(p), 0);
      return { wins, losses, neto, n: picks.length, picks };
    }

    function renderMomentum() {
      const r = DATA.resumen;
      const m = calcMomentum(momentumN, momentumTipo);
      const wr = m.n > 0 ? (m.wins / m.n * 100) : 0;
      const opcionesN = [1, 2, 3, 4, 5].map(n => `<option value="${n}" ${n === momentumN ? "selected" : ""}>${n}</option>`).join("");
      return `<div class="card">
      <div class="card-head"><div class="card-title">Momentum</div>${r.racha >= 2 ? `<span class="card-meta">racha actual ${r.racha}${r.tipo_racha === "win" ? "W" : "L"}</span>` : ""}</div>
      <div class="momentum-controls">
        <span>Después de exactamente</span>
        <select data-momentum-n>${opcionesN}</select>
        <select data-momentum-tipo>
          <option value="win" ${momentumTipo === "win" ? "selected" : ""}>victorias</option>
          <option value="loss" ${momentumTipo === "loss" ? "selected" : ""}>derrotas</option>
        </select>
        <span>seguidas</span>
      </div>
      <div id="momentumResult">${renderMomentumResult(m, wr)}</div>
    </div>`;
    }
    function renderMomentumResult(m, wr) {
      if (!m.n) return `<div class="empty">No hay suficientes datos para esta racha.</div>`;
      return `<div class="kpi-row three">
      <div class="kpi"><div class="kpi-label">Récord</div><div class="kpi-value">${m.wins}–${m.losses}</div></div>
      <div class="kpi"><div class="kpi-label">Win rate</div><div class="kpi-value">${wr.toFixed(0)}%</div></div>
      <div class="kpi"><div class="kpi-label">Neto</div><div class="kpi-value ${signColor(m.neto)}">${fmts(m.neto)}</div></div>
    </div>
    <div class="card-meta" style="margin:10px 0 12px">${m.n} ${m.n === 1 ? "vez" : "veces"} en el historial</div>
    <button class="filter-chip" data-action="momentum-filtrar">Ver estos picks en el historial</button>`;
    }
    function actualizarMomentum() {
      const box = document.getElementById("momentumResult");
      if (!box) return;
      const m = calcMomentum(momentumN, momentumTipo);
      const wr = m.n > 0 ? (m.wins / m.n * 100) : 0;
      box.innerHTML = renderMomentumResult(m, wr);
    }

    function calcRoiPorTipo() {
      const bucket = {};
      DATA.apuestas.filter(a => a.status === "win" || a.status === "loss").forEach(a => {
        const t = tipoDe(a);
        if (!bucket[t]) bucket[t] = { w: 0, l: 0, apo: 0, gan: 0, cuotas: [] };
        const b = bucket[t];
        b.apo += a.monto || 0;
        if (parseFloat(a.cuota) > 1.01) b.cuotas.push(parseFloat(a.cuota));
        if (a.status === "win") { b.w++; b.gan += a.ganancia || a.monto || 0; }
        else b.l++;
      });
      return Object.entries(bucket)
        .filter(([, b]) => b.w + b.l >= 1)
        .map(([tipo, b]) => {
          const total = b.w + b.l, neto = b.gan - b.apo;
          return { tipo, wins: b.w, losses: b.l, apo: b.apo, neto, roi: b.apo > 0 ? neto / b.apo * 100 : 0, wr: total > 0 ? b.w / total * 100 : 0, cuotaMedia: b.cuotas.length > 0 ? b.cuotas.reduce((a, c) => a + c, 0) / b.cuotas.length : 0 };
        })
        .sort((a, b) => b.roi - a.roi);
    }

    /* ── Helper: convierte un Date UTC a sus componentes en hora CDMX ── */
    const _mxFmt = (() => { try { return new Intl.DateTimeFormat("en-US", { timeZone: "America/Mexico_City", weekday: "short", hour: "numeric", hour12: false }); } catch (e) { return null; } })();
    function toMXParts(dt) {
      try {
        const parts = (_mxFmt || new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Mexico_City",
          weekday: "short",       // "Mon", "Tue"…
          hour: "numeric",
          hour12: false
        })).formatToParts(dt);
        const get = t => parts.find(p => p.type === t)?.value ?? "0";
        const WEEK_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return {
          dow: WEEK_SHORT.indexOf(get("weekday")),   // 0=Dom … 6=Sáb
          hour: parseInt(get("hour"), 10)              // 0-23
        };
      } catch (e) {
        // Fallback: UTC-6 fijo (funciona sin soporte de Intl avanzado)
        const local = new Date(dt.getTime() - 6 * 3600000);
        return { dow: local.getUTCDay(), hour: local.getUTCHours() };
      }
    }

    function calcTemporal() {
      const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
      const FRANJAS = ["00-06", "06-10", "10-14", "14-18", "18-22", "22-00"];
      const db = {}, hb = {};
      DIAS.forEach(d => { db[d] = { w: 0, l: 0, apo: 0, gan: 0 } });
      FRANJAS.forEach(f => { hb[f] = { w: 0, l: 0, apo: 0, gan: 0 } });

      DATA.apuestas.filter(a => (a.status === "win" || a.status === "loss") && (a.fecha_partido || a.fecha)).forEach(a => {

        // ── DÍA DE SEMANA: usa fecha del EVENTO (no de registro) ──
        const fechaEvento = a.fecha_partido
          ? new Date(a.fecha_partido + "T12:00:00")   // mediodía local, sin desplazamiento UTC
          : new Date(a.fecha.replace(" ", "T") + "Z");
        if (isNaN(fechaEvento)) return;

        const dowEvento = fechaEvento.getDay();         // 0=Dom … 6=Sáb
        const diaIdx = dowEvento === 0 ? 6 : dowEvento - 1;
        const dia = DIAS[diaIdx];

        db[dia].apo += a.monto || 0;
        if (a.status === "win") { db[dia].w++; db[dia].gan += a.ganancia || a.monto || 0; }
        else db[dia].l++;

        // ── FRANJA HORARIA: usa fecha/hora de REGISTRO ──
        const horaSrc = a.fecha_publicacion;
        if (horaSrc) {
          // La API ya entrega "YYYY-MM-DD HH:MM" en hora CDMX: se lee la hora tal cual.
          const hour = parseInt(String(horaSrc).slice(11, 13), 10);
          if (!isNaN(hour)) {
            const franja = hour < 6 ? "00-06" : hour < 10 ? "06-10" : hour < 14 ? "10-14" :
              hour < 18 ? "14-18" : hour < 22 ? "18-22" : "22-00";
            hb[franja].apo += a.monto || 0;
            if (a.status === "win") { hb[franja].w++; hb[franja].gan += a.ganancia || a.monto || 0; }
            else hb[franja].l++;
          }
        }
      });

      const toStats = (label, b) => {
        const total = b.w + b.l, neto = b.gan - b.apo;
        return {
          label, wins: b.w, losses: b.l, neto, roi: b.apo > 0 ? neto / b.apo * 100 : 0,
          wr: total > 0 ? b.w / total * 100 : 0, total
        };
      };
      // Rango real de publicación sobre TODO el historial (incluye pendientes), en minutos del día.
      let minM = null, maxM = null;
      DATA.apuestas.forEach(a => {
        const s = String(a.fecha_publicacion || "");
        const h = parseInt(s.slice(11, 13), 10), m = parseInt(s.slice(14, 16), 10);
        if (isNaN(h) || isNaN(m)) return;
        const t = h * 60 + m;
        if (minM === null || t < minM) minM = t;
        if (maxM === null || t > maxM) maxM = t;
      });
      const fmtHM = t => t === null ? null : String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0");
      return {
        porDia: DIAS.map(d => toStats(d, db[d])).filter(x => x.total > 0),
        porHora: FRANJAS.map(f => toStats(f, hb[f])).filter(x => x.total > 0),
        horaMin: fmtHM(minM), horaMax: fmtHM(maxM)
      };
    }

    function calcRolling(ventana = 20) {
      // Orden cronológico (fecha_partido, row_id) — igual que rolling_roi del backend.
      const res = apuestasOrdenadas();
      if (res.length < ventana) return [];
      const points = [];
      let netoAcum = 0;
      for (let i = 0; i < res.length; i++) {
        const a = res[i];
        if (a.status === "win") netoAcum += (a.ganancia || a.monto || 0) - (a.monto || 0);
        else netoAcum -= a.monto || 0;
        if (i < ventana - 1) continue;
        const win = res.slice(i - ventana + 1, i + 1);
        const w = win.filter(x => x.status === "win").length;
        const apo = win.reduce((s, x) => s + (x.monto || 0), 0);
        const gan = win.reduce((s, x) => x.status === "win" ? s + (x.ganancia || x.monto || 0) : s, 0);
        const roi = apo > 0 ? (gan - apo) / apo * 100 : 0;
        points.push({ i, roi, wr: w / ventana * 100, netoAcum });
      }
      return points;
    }

    function calcKelly() {
      const res = DATA.apuestas.filter(a => a.status === "win" || a.status === "loss");
      if (res.length < 10) return null;
      const p = res.filter(a => a.status === "win").length / res.length;
      const cuotas = res.map(a => parseFloat(a.cuota)).filter(c => c > 1.01);  // solo bets resueltas
      if (!cuotas.length) return null;
      const b = cuotas.reduce((s, c) => s + c, 0) / cuotas.length - 1;
      if (b <= 0) return null;
      // EV = yield real por unidad (win → cuota−1, loss → −1), no p·b̄ − (1−p): la
      // cuota media ignora a qué cuota se gana y a cuál se pierde (gemelo de
      // analytics.ventaja_desde_apuestas, FIX-VENTAJA-CUOTA-MEDIA).
      const val = res.map(a => [a.status === "win", parseFloat(a.cuota)]).filter(([, c]) => c > 1.01);
      const ev = val.reduce((s, [w, c]) => s + (w ? c - 1 : -1), 0) / val.length;
      const f = Math.max(0, Math.min(ev / b, 0.25));
      return { f, fMedio: f / 2, fCuarto: f / 4, p: p * 100, cuotaMedia: b + 1, ev };
    }

    const _RENDER_FNS = {
      resumen: () => renderResumen(),
      semana: () => renderSemana(),
      mes: () => renderMes(),
      deportes: () => renderDeportes(),
      tipos: () => renderTipos(),
      temporal: () => renderTemporal(),
      rolling: () => renderRolling(),
      kelly: () => renderKelly(),
      patrones: () => renderPatrones(),
      capital: () => renderCapital(),
      backtest: () => renderBacktest(),
      compounding: () => renderCompounding(),
      apuestas: () => renderApuestas(),
      calendario: () => renderCalendario(),
      gestion: () => renderGestion(),
      // clv / politica: registrados por assets/edge.js (INV-XCUT-16/17), que se
      // carga después y añade sus propias entradas a este objeto y a ADVANCED.
    };

    /* ── Render App ── */
    function renderApp() {
      _renderedSections.clear();
      document.getElementById("app").innerHTML = `
    ${_headerHTML({ refresh: true })}
    <div class="content">
      <div id="subNav" class="sub-nav" style="display:none"></div>
      <div id="resumen"  class="section"></div>
      <div id="semana"   class="section"></div>
      <div id="mes"      class="section"></div>
      <div id="deportes" class="section"></div>
      <div id="tipos"    class="section"></div>
      <div id="temporal" class="section"></div>
      <div id="rolling"  class="section"></div>
      <div id="kelly"    class="section"></div>
      <div id="patrones" class="section"></div>
      <div id="capital"  class="section"></div>
      <div id="backtest" class="section"></div>
      <div id="compounding" class="section"></div>
      <div id="clv"      class="section"></div>
      <div id="politica" class="section"></div>
      <div id="pico"     class="section"></div>
      <div id="apuestas" class="section"></div>
      <div id="calendario" class="section"></div>
      <div id="gestion"  class="section"></div>
    </div>`;
      const nav = document.getElementById("bottomNav");
      nav.style.display = "flex";
      // Sidebar logo — visible solo en desktop (≥768px) vía CSS
      const _sidebarLogo = `<div class="sidebar-logo"><div class="sidebar-logo-icon">${ico("logo")}</div><div class="sidebar-logo-text">Betting Stats</div></div>`;
      nav.innerHTML = _sidebarLogo + NAV_GROUPS.map(n => `<button class="nav-item" data-group="${n.id}"><span class="nav-icon">${ico(n.icon)}</span><span class="nav-label">${n.label}</span></button>`).join("");
      // BackButton nativo: vuelve de la sub-vista "Más análisis" a Resumen.
      if (tg?.BackButton && !_backReady) { tg.BackButton.onClick(() => closeAdvanced()); _backReady = true; }
      const saved = tabActual;
      setTimeout(() => showTab(saved), 0);
    }

    /* ── Tab: Resumen ── */
    function renderResumen() {
      const r = DATA.resumen;
      const wr = ((r.winrate ?? 0)).toFixed(1);
      const rachaHtml = r.racha >= 2 ? `<div class="racha-badge ${r.tipo_racha === "win" ? "racha-win" : "racha-loss"}"><span class="racha-icon">${ico(r.tipo_racha === "win" ? "flame" : "down")}</span>Racha de ${r.racha} ${r.tipo_racha === "win" ? "victorias" : "derrotas"} seguidas</div>` : "";
      // Héroe (INV-MINI-44): el neto total es el protagonista, con su curva y las
      // métricas clave debajo. Mismas cifras que el antiguo hero-grid (INV-MINI-15/43).
      const s = DATA.stats_semana || null;
      const sNeto = s ? s.neto : null;
      const delta = sNeto == null ? "" : `<span class="delta ${sNeto >= 0 ? "up" : "down"}" title="${esc(fmts(sNeto))} · ${esc(fmtEq(sNeto, true))}">${ico(sNeto >= 0 ? "up" : "down")}${fmtsC(sNeto)} en 7 días</span>`;
      const hero = `<section class="hero">
      <div class="hero-top"><span class="hero-eyebrow">Neto total</span></div>
      <div class="hero-amount ${signColor(r.neto)}" title="${fmts(r.neto)}">${fmtsC(r.neto)}</div>
      <div class="hero-subline"><span>${esc(fmtEq(r.neto, true))}</span>${delta}</div>
      ${heroSparkline()}
      <div class="hero-metrics">
        <div class="hero-metric"><div class="hero-metric-v ${signColor(r.roi)}">${(r.roi ?? 0) >= 0 ? "+" : ""}${fmtp(r.roi)}</div><div class="hero-metric-l">ROI</div></div>
        <div class="hero-metric"><div class="hero-metric-v">${wr}%</div><div class="hero-metric-l">Win rate</div></div>
        <div class="hero-metric"><div class="hero-metric-v">${r.wins}–${r.losses}</div><div class="hero-metric-l">Récord</div></div>
      </div>
    </section>
    <div class="action-row">
      <button class="pill-btn primary share-card-btn" data-action="share-card">${ico("share", "ico-sm")}Compartir</button>
      <button class="pill-btn" data-action="open-unidad" title="Cuánto dinero vale 1 unidad">${ico("coins", "ico-sm")}1u = ${esc(fmtEq(1).replace("≈ ", ""))}</button>
    </div>`;
      const total = r.wins + r.losses + (r.pending || 0) + (r.voids || 0);
      const seg = (n, color) => n > 0 ? `<i style="flex:${n};background:${color}"></i>` : "";
      const leg = (label, n, color) => `<div class="seg-item"><span class="seg-dot" style="background:${color}"></span><span class="seg-item-l">${label}</span><span class="seg-item-v">${n}</span></div>`;
      const historial = `<div class="card">
      <div class="card-head"><div class="card-title">Historial</div><span class="card-meta">${total} apuestas</span></div>
      <div class="seg-bar">${seg(r.wins, "var(--win)")}${seg(r.losses, "var(--loss)")}${seg(r.pending, "var(--pend)")}${seg(r.voids, "var(--text-3)")}</div>
      <div class="seg-legend">
        ${leg("Ganadas", r.wins, "var(--win)")}${leg("Perdidas", r.losses, "var(--loss)")}
        ${leg("Pendientes", r.pending ?? 0, "var(--pend)")}${leg("Nulas", r.voids ?? 0, "var(--text-3)")}
      </div>
    </div>`;
      const dinero = `<div class="card"><div class="stat-list">
      <div class="stat-row"><span class="stat-row-l">Total apostado</span><span class="stat-row-v" title="${fmt(r.apostado)}">${fmtC(r.apostado)}${eqLine(r.apostado)}</span></div>
      <div class="stat-row"><span class="stat-row-l">Total cobrado</span><span class="stat-row-v" title="${fmt(r.ganado)}">${fmtC(r.ganado)}${eqLine(r.ganado)}</span></div>
      ${r.mejor_mes ? `<div class="stat-row"><span class="stat-row-l">Mejor mes · ${mesLabel(r.mejor_mes.mes)}</span><span class="stat-row-v ${signColor(r.mejor_mes.neto)}" title="${fmts(r.mejor_mes.neto)}">${fmtsC(r.mejor_mes.neto)}${eqLine(r.mejor_mes.neto, true)}</span></div>` : ""}
    </div></div>`;
      return `${typeof picoBanner === "function" ? picoBanner() : ""}${hero}
    <div class="dash-grid">${historial}${dinero}</div>
    ${rachaHtml}
    <div class="card"><div class="card-head"><div class="card-title">Ganancia acumulada</div><span class="card-meta">pick a pick</span></div>${chartPlaceholder("chartCumulative", "cumulative", true)}</div>
    <div class="dash-grid">${renderRecentForm()}${renderMomentum()}</div>
    <div class="card"><div class="card-title">Neto por periodo</div>
      <div class="range-sel">
        <button class="range-chip ${monthlyPLVista === "mensual" ? "active" : ""}" data-monthlypl-vista="mensual">Mensual</button>
        <button class="range-chip ${monthlyPLVista === "semanal" ? "active" : ""}" data-monthlypl-vista="semanal">Semanal</button>
      </div>
      ${chartPlaceholder("chartMonthlyPL", "monthlypl")}</div>
    <div class="dash-grid">
      <div class="card"><div class="card-title">Neto acumulado por mes</div>${chartPlaceholder("chartNeto", "neto")}</div>
      <div class="card"><div class="card-title">Apostado vs. cobrado</div>${chartPlaceholder("chartMeses", "meses")}</div>
    </div>`;
    }

    // Sparkline del héroe: neto acumulado pick a pick (mismo cálculo que la gráfica
    // "Ganancia acumulada"), en SVG inline sin librerías y coloreado por tema.
    function heroSparkline() {
      const ord = apuestasOrdenadas();
      if (ord.length < 2) return "";
      let acum = 0;
      const serie = [0].concat(ord.map(a => (acum += netoDe(a))));
      const paso = Math.max(1, Math.ceil(serie.length / 140));
      const pts = serie.filter((_, i) => i % paso === 0 || i === serie.length - 1);
      const min = Math.min(...pts), max = Math.max(...pts), rango = (max - min) || 1;
      const W = 300, H = 84, pad = 8;
      const xy = pts.map((v, i) => [i / (pts.length - 1) * W, pad + (1 - (v - min) / rango) * (H - pad * 2)]);
      const line = xy.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
      const area = `${line}L${W},${H}L0,${H}Z`;
      const color = acum >= 0 ? "var(--accent)" : "var(--loss)";
      const y0 = pad + (1 - (0 - min) / rango) * (H - pad * 2);
      const cero = (min < 0 && max > 0) ? `<line x1="0" x2="${W}" y1="${y0.toFixed(1)}" y2="${y0.toFixed(1)}" style="stroke:var(--text-3)" stroke-width="1" stroke-dasharray="3 4" vector-effect="non-scaling-stroke" opacity=".6"/>` : "";
      return `<svg class="hero-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Evolución del neto acumulado">
        <defs><linearGradient id="heroSparkFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${color};stop-opacity:.28"/><stop offset="1" style="stop-color:${color};stop-opacity:0"/></linearGradient></defs>
        ${cero}<path d="${area}" fill="url(#heroSparkFill)"/>
        <path d="${line}" fill="none" style="stroke:${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
      </svg>`;
    }

    /* ── Recent Form (L5/L10) ── */
    function renderRecentForm() {
      const l5 = calcRecentForm(5), l10 = calcRecentForm(10);
      if (!l5.n) return "";
      const item = (f, label) => `<div>
        <div class="form-cell-l">${label}</div>
        <div class="form-cell-v">${f.wins}–${f.losses}</div>
        <div class="form-cell-s ${signColor(f.neto)}">${fmts(f.neto)}</div>
      </div>`;
      return `<div class="card"><div class="card-title">Forma reciente</div><div class="form-grid">${item(l5, "Últimas 5")}${item(l10, "Últimas 10")}</div></div>`;
    }

    /* ── Tab: Semana ── */
    function renderSemana() {
      const s = DATA.stats_semana;
      if (!s) return '<div class="empty">Sin datos esta semana</div>';
      const wr = ((s.winrate ?? 0)).toFixed(1);
      const ap7 = DATA.apuestas.filter(a => {
        const f = a.fecha_partido || a.fecha;
        if (!f) return false;
        // fecha_partido es YYYY-MM-DD, fecha_reg es YYYY-MM-DD HH:MM (UTC)
        const iso = f.length === 10 ? f + "T12:00:00" : f.replace(" ", "T") + "Z";
        return new Date(iso).getTime() >= Date.now() - 7 * 24 * 3600 * 1000;
      });
      return `<div class="section-header">Últimos <span>7 días</span></div>
    <div class="stats-grid">
      <div class="stat-card win-card"><div class="stat-value green">${s.wins}</div><div class="stat-label">Ganadas</div></div>
      <div class="stat-card loss-card"><div class="stat-value red">${s.losses}</div><div class="stat-label">Perdidas</div></div>
      <div class="stat-card pend-card"><div class="stat-value yellow">${s.pending}</div><div class="stat-label">Pendientes</div></div>
    </div>
    ${(s.voids ?? 0) > 0 ? `<div class="kpi-row"><div class="kpi"><div class="kpi-label">Nulas (void)</div><div class="kpi-value accent">${s.voids ?? 0}</div></div></div>` : ""}
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">Neto</div><div class="kpi-value ${signColor(s.neto)}">${fmts(s.neto)}</div>${eqLine(s.neto, true)}</div>
      <div class="kpi"><div class="kpi-label">ROI</div><div class="kpi-value ${signColor(s.roi)}">${(s.roi ?? 0) >= 0 ? "+" : ""}${fmtp(s.roi)}</div></div>
    </div>
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">Apostado</div><div class="kpi-value accent">${fmt(s.apostado)}</div></div>
      <div class="kpi"><div class="kpi-label">Win rate</div><div class="kpi-value">${wr}%</div></div>
    </div>
    <div class="card"><div class="card-title">Apuestas (${ap7.length})</div>${ap7.length === 0 ? '<div class="empty">Sin apuestas</div>' : [...ap7].reverse().map(renderBetItem).join("")}</div>`;
    }

    /* ── Tab: Mes ── */
    function renderMes() {
      if (!DATA || !mesesDisponibles.length) return '<div class="empty">No hay datos de meses</div>';
      const idx = mesesDisponibles.indexOf(mesActual);
      return `<div class="mes-selector">
    <button class="mes-nav" data-mes-dir="-1" aria-label="Mes anterior" ${idx <= 0 ? "disabled" : ""}>${ico("chevL")}</button>
    <span class="mes-label" id="mesLabel">${mesLabel(mesActual)}</span>
    <button class="mes-nav" data-mes-dir="1" aria-label="Mes siguiente" ${idx >= mesesDisponibles.length - 1 ? "disabled" : ""}>${ico("chevR")}</button>
  </div>
  <div id="mesContent">${renderMesContent()}</div>`;
    }
    function renderMesContent() {
      if (!mesActual) return '<div class="empty">No hay datos este mes</div>';
      const ap = DATA.apuestas.filter(a => (a.fecha_partido || a.fecha)?.startsWith(mesActual));
      let w = 0, l = 0, v = 0, p = 0, apo = 0, gan = 0;
      ap.forEach(a => { if (a.status === "win") { w++; apo += a.monto; gan += a.ganancia || a.monto || 0; } else if (a.status === "loss") { l++; apo += a.monto; } else if (a.status === "void") { v++; } else p++; });
      const neto = gan - apo, roi = apo > 0 ? neto / apo * 100 : 0, wr = (w + l) > 0 ? (w / (w + l) * 100).toFixed(1) : "N/A";
      const _mesData = DATA.grafica_meses.find(m => m.mes === mesActual);
      const _netoMax = _mesData != null ? _mesData.neto_max : null;
      return `<div class="stats-grid">
      <div class="stat-card win-card"><div class="stat-value green">${w}</div><div class="stat-label">Ganadas</div></div>
      <div class="stat-card loss-card"><div class="stat-value red">${l}</div><div class="stat-label">Perdidas</div></div>
      <div class="stat-card pend-card"><div class="stat-value yellow">${p}</div><div class="stat-label">Pendientes</div></div>
    </div>
    ${v > 0 ? `<div class="kpi-row"><div class="kpi"><div class="kpi-label">Nulas (void)</div><div class="kpi-value accent">${v}</div></div></div>` : ""}
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">Neto del mes</div><div class="kpi-value ${signColor(neto)}">${fmts(neto)}</div>${eqLine(neto, true)}</div>
      <div class="kpi"><div class="kpi-label">ROI</div><div class="kpi-value ${signColor(roi)}">${roi >= 0 ? "+" : ""}${fmtp(roi)}</div></div>
    </div>
    ${_netoMax !== null ? `<div class="kpi-row">
      <div class="kpi"><div class="kpi-label">Pico neto (acum.)</div><div class="kpi-value ${signColor(_netoMax)}">${fmts(_netoMax)}</div><div style="font-size:9px;color:var(--text-2);margin-top:3px">Máx. global alcanzado este mes</div></div>
    </div>`: ""}
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">Apostado</div><div class="kpi-value accent">${fmt(apo)}</div></div>
      <div class="kpi"><div class="kpi-label">Win rate</div><div class="kpi-value">${wr}%</div></div>
    </div>
    <div class="card"><div class="card-title">Apuestas (${ap.length})</div>${ap.length === 0 ? '<div class="empty">Sin apuestas</div>' : ap.slice(-12).reverse().map(renderBetItem).join("")}</div>`;
    }
    function cambiarMes(dir) {
      const idx = mesesDisponibles.indexOf(mesActual), nuevo = idx + dir;
      if (nuevo < 0 || nuevo >= mesesDisponibles.length) return;
      mesActual = mesesDisponibles[nuevo];
      document.getElementById("mesLabel").textContent = mesLabel(mesActual);
      document.getElementById("mesContent").innerHTML = renderMesContent();
      const ni = mesesDisponibles.indexOf(mesActual);
      document.querySelectorAll("[data-mes-dir]").forEach(btn => { const d = parseInt(btn.dataset.mesDir, 10), dis = (d === -1 && ni <= 0) || (d === 1 && ni >= mesesDisponibles.length - 1); btn.disabled = dis; btn.style.opacity = dis ? "0.3" : ""; btn.style.cursor = dis ? "default" : ""; });
    }

    /* ── Tab: Calendario ──
       Rejilla mensual con la GANANCIA REAL (neto) ganada por día. Consume el campo
       aditivo DATA.grafica_dias de /api/stats (INV-XCUT-15; el cálculo vive 100% en
       el bot, INV-MINI-02). Estado de mes/día propio (mesCalActual/calDiaSel) para no
       interferir con el tab "Mes" (mesActual). Presentación pura: todo dato por esc(). */
    let mesCalActual = null, calDiaSel = null;
    // Mapa "YYYY-MM-DD" → {neto, wins, losses, n, apostado, ganado} (lectura O(1) por celda).
    function _calMap() {
      const m = {};
      (DATA.grafica_dias || []).forEach(d => { if (d && d.fecha) m[d.fecha] = d; });
      return m;
    }
    function renderCalendario() {
      if (!DATA || !mesesDisponibles.length) return '<div class="empty">No hay datos</div>';
      if (!mesCalActual || !mesesDisponibles.includes(mesCalActual)) mesCalActual = mesActual || mesesDisponibles[mesesDisponibles.length - 1];
      calDiaSel = null;
      const idx = mesesDisponibles.indexOf(mesCalActual);
      return `<div class="mes-selector">
    <button class="mes-nav" data-mescal-dir="-1" aria-label="Mes anterior" ${idx <= 0 ? "disabled" : ""}>${ico("chevL")}</button>
    <span class="mes-label" id="calLabel">${mesLabel(mesCalActual)}</span>
    <button class="mes-nav" data-mescal-dir="1" aria-label="Mes siguiente" ${idx >= mesesDisponibles.length - 1 ? "disabled" : ""}>${ico("chevR")}</button>
  </div>
  <div id="calBody">${renderCalContent()}</div>`;
    }
    function renderCalContent() {
      if (!mesCalActual) return '<div class="empty">No hay datos este mes</div>';
      const [y, mo] = mesCalActual.split("-").map(n => parseInt(n, 10));
      const mapa = _calMap();
      // Resumen del mes (suma de netos diarios del mes en curso).
      let netoMes = 0, diasGanados = 0, diasPerdidos = 0;
      Object.keys(mapa).forEach(f => {
        if (!f.startsWith(mesCalActual)) return;
        const nt = mapa[f].neto || 0;
        netoMes += nt;
        if (nt > 0) diasGanados++; else if (nt < 0) diasPerdidos++;
      });
      // getUTCDay: 0=Dom..6=Sáb → reindex a 0=Lun..6=Dom.
      const firstDow = (new Date(Date.UTC(y, mo - 1, 1)).getUTCDay() + 6) % 7;
      const diasEnMes = new Date(Date.UTC(y, mo, 0)).getUTCDate();
      const dows = ["L", "M", "X", "J", "V", "S", "D"];
      let celdas = dows.map(d => `<div class="cal-dow">${d}</div>`).join("");
      for (let i = 0; i < firstDow; i++) celdas += `<div class="cal-cell cal-empty"></div>`;
      for (let d = 1; d <= diasEnMes; d++) {
        const fecha = `${mesCalActual}-${String(d).padStart(2, "0")}`;
        const info = mapa[fecha];
        const nt = info ? info.neto : null;
        const cls = nt == null || nt === 0 ? "cal-neutral" : nt > 0 ? "cal-win" : "cal-loss";
        const monto = nt == null ? "" : `<span class="cal-net">${fmtsCompact(nt)}</span>`;
        const pct = (info && info.apostado > 0) ? `<span class="cal-pct">${nt >= 0 ? "+" : ""}${(nt / info.apostado * 100).toFixed(0)}%</span>` : "";
        celdas += `<button class="cal-cell ${cls}" data-cal-day="${fecha}"><span class="cal-num">${d}</span>${monto}${pct}</button>`;
      }
      return `<div class="kpi-row">
      <div class="kpi"><div class="kpi-label">Neto del mes</div><div class="kpi-value ${signColor(netoMes)}">${fmts(netoMes)}</div></div>
      <div class="kpi"><div class="kpi-label">Días +/−</div><div class="kpi-value"><span class="green">${diasGanados}</span> / <span class="red">${diasPerdidos}</span></div></div>
    </div>
    <div class="cal-grid">${celdas}</div>
    <div class="cal-legend"><span><i class="cal-dot cal-win"></i>Ganancia</span><span><i class="cal-dot cal-loss"></i>Pérdida</span><span><i class="cal-dot cal-neutral"></i>Sin/0</span></div>
    <div id="calDetail" class="cal-detail"><div class="empty">Toca un día para ver el detalle</div></div>`;
    }
    function cambiarMesCal(dir) {
      const idx = mesesDisponibles.indexOf(mesCalActual), nuevo = idx + dir;
      if (nuevo < 0 || nuevo >= mesesDisponibles.length) return;
      mesCalActual = mesesDisponibles[nuevo];
      const lbl = document.getElementById("calLabel");
      if (lbl) lbl.textContent = mesLabel(mesCalActual);
      const body = document.getElementById("calBody");
      if (body) body.innerHTML = renderCalContent();
      const ni = mesesDisponibles.indexOf(mesCalActual);
      document.querySelectorAll("[data-mescal-dir]").forEach(btn => { const d = parseInt(btn.dataset.mescalDir, 10), dis = (d === -1 && ni <= 0) || (d === 1 && ni >= mesesDisponibles.length - 1); btn.disabled = dis; btn.style.opacity = dis ? "0.3" : ""; btn.style.cursor = dis ? "default" : ""; });
    }
    function calSelectDay(fecha) {
      calDiaSel = fecha;
      document.querySelectorAll(".cal-cell[data-cal-day]").forEach(c => c.classList.toggle("cal-sel", c.dataset.calDay === fecha));
      const det = document.getElementById("calDetail");
      if (!det) return;
      const info = _calMap()[fecha];
      const ap = DATA.apuestas.filter(a => (a.fecha_partido || a.fecha)?.slice(0, 10) === fecha);
      const [yy, mm, dd] = fecha.split("-");
      const titulo = `${dd}/${mm}/${yy}`;
      if (!info && ap.length === 0) { det.innerHTML = `<div class="cal-detail-head">${titulo}</div><div class="empty">Sin apuestas resueltas este día</div>`; return; }
      const head = `<div class="cal-detail-head">${titulo}${info ? ` · <span class="${signColor(info.neto)}">${fmts(info.neto)}</span> · <span class="green">${info.wins}W</span> <span class="red">${info.losses}L</span>` : ""}</div>`;
      det.innerHTML = head + (ap.length === 0 ? '<div class="empty">Sin apuestas</div>' : [...ap].reverse().map(renderGCard).join(""));
    }

    /* ── Tab: Deportes ── */
    function renderDeportes() {
      const deps = [...DATA.deportes].sort((a, b) => b.roi - a.roi);
      if (!deps.length) return '<div class="empty">Sin datos</div>';
      return `<div class="section-header">ROI por <span>deporte</span></div>
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">Mejor</div><div class="kpi-value green" style="font-size:14px;margin-top:4px">${esc(deps[0].nombre)}</div><div style="font-family:var(--font-num);font-size:12px;color:var(--win);margin-top:4px">${deps[0].roi >= 0 ? "+" : ""}${fmtp(deps[0].roi)}</div></div>
      <div class="kpi"><div class="kpi-label">Peor</div><div class="kpi-value red" style="font-size:14px;margin-top:4px">${esc(deps[deps.length - 1].nombre)}</div><div style="font-family:var(--font-num);font-size:12px;color:var(--loss);margin-top:4px">${fmtp(deps[deps.length - 1].roi)}</div></div>
    </div>
    <div class="card"><div class="card-title">ROI comparativo</div>${chartPlaceholder("chartDep", "dep")}</div>
    <div class="card"><div class="card-title">Desglose</div>${deps.map(d => { const total = d.wins + d.losses, wr = total > 0 ? (d.wins / total * 100).toFixed(0) : 0; return `<div class="sport-item"><div><div class="sport-name">${esc(d.nombre)}</div><div class="sport-sub">${d.wins}–${d.losses} · ${wr}% WR · ${fmt(d.apostado)} apostado</div></div><div class="sport-roi ${d.roi >= 0 ? "green" : "red"}">${d.roi >= 0 ? "+" : ""}${fmtp(d.roi)}</div></div>`; }).join("")}</div>`;
    }

    /* ── Tab: Tipos ── */
    function renderTipos() {
      const tipos = calcRoiPorTipo();
      if (!tipos.length) return `<div class="section-header">ROI por <span>tipo de apuesta</span></div><div class="empty">Aún no tienes apuestas resueltas (win/loss) para ver este análisis.</div>`;
      const maxAbsRoi = Math.max(...tipos.map(t => Math.abs(t.roi)), 1);
      const kpisMejorPeor = tipos.length > 1 ? `
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">Mejor tipo</div><div class="kpi-value green" style="font-size:14px;margin-top:4px">${esc(tipos[0].tipo)}</div><div style="font-family:var(--font-num);font-size:12px;color:var(--win);margin-top:4px">${tipos[0].roi >= 0 ? "+" : ""}${fmtp(tipos[0].roi)}</div></div>
      <div class="kpi"><div class="kpi-label">Peor tipo</div><div class="kpi-value red" style="font-size:14px;margin-top:4px">${esc(tipos[tipos.length - 1].tipo)}</div><div style="font-family:var(--font-num);font-size:12px;color:var(--loss);margin-top:4px">${fmtp(tipos[tipos.length - 1].roi)}</div></div>
    </div>`: "";
      return `<div class="section-header">ROI por <span>tipo</span></div>
    ${kpisMejorPeor}
    <div class="card"><div class="card-title">Bet Type Mix — % del volumen</div>${renderTipoMixLegend(tipos)}${chartPlaceholder("chartTipoMix", "tipomix")}</div>
    <div class="card"><div class="card-title">ROI por tipo</div>${chartPlaceholder("chartTipo", "tipo")}</div>
    <div class="card"><div class="card-title">Bet Type Breakdown</div>${renderTipoTabla(tipos)}</div>
    <div class="card"><div class="card-title">Detalle completo</div>
      ${tipos.map(t => {
        const barW = Math.min(100, Math.abs(t.roi) / maxAbsRoi * 100);
        const barColor = t.roi >= 0 ? "var(--win)" : "var(--loss)";
        const cuotaTxt = t.cuotaMedia > 0 ? `· cuota media ${t.cuotaMedia.toFixed(2)}` : "";
        const muestraTxt = (t.wins + t.losses) < 3 ? `<span style="font-size:10px;color:var(--text-2);font-weight:400"> · muestra pequeña</span>` : "";
        return `<div class="tipo-item">
          <div style="flex:1">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <span style="font-size:13px;font-weight:700">${esc(t.tipo)}${muestraTxt}</span>
              <span style="font-family:var(--font-num);font-size:13px;font-weight:700;color:${barColor}">${t.roi >= 0 ? "+" : ""}${t.roi.toFixed(1)}%</span>
            </div>
            <div style="font-size:11px;color:var(--text-2);margin-bottom:6px">${t.wins}W·${t.losses}L·WR ${t.wr.toFixed(0)}% ${cuotaTxt}</div>
            <div style="font-size:11px;color:${barColor};margin-bottom:6px">Neto: ${t.neto >= 0 ? "+" : ""}${fmt(t.neto)}</div>
            <div class="tipo-bar-wrap"><div class="tipo-bar-fill" style="width:${barW}%;background:${barColor}"></div></div>
          </div>
        </div>`;
      }).join("")}
    </div>
    <div class="explainer"><strong>Tip:</strong> Enfoca tu capital en los tipos de apuesta con ROI positivo consistente. Si un tipo tiene &lt;5 apuestas, el ROI puede ser engañoso.</div>`;
    }

    // Paleta fija por tipo (mismo verde acento + tonos complementarios del tema,
    // sin introducir colores ajenos a la identidad visual existente).
    const TIPO_MIX_COLORS = ["#7C83FF", "#3DD68C", "#F5B54A", "#FF6B6B", "#4CC9F0", "#C084FC", "#8A909B"];
    function tipoMixColor(i) { return TIPO_MIX_COLORS[i % TIPO_MIX_COLORS.length]; }

    function renderTipoMixLegend(tipos) {
      const totalN = tipos.reduce((s, t) => s + t.wins + t.losses, 0) || 1;
      return `<div class="mix-legend">${tipos.map((t, i) => {
        const n = t.wins + t.losses, pctVol = n / totalN * 100;
        const wr = t.wins + t.losses > 0 ? t.wins / (t.wins + t.losses) * 100 : 0;
        return `<div class="mix-legend-item"><i class="mix-dot" style="background:${tipoMixColor(i)}"></i><span class="mix-name">${esc(t.tipo)}</span><span class="mix-pct">${pctVol.toFixed(0)}%</span><span class="mix-wr">${wr.toFixed(0)}% W</span></div>`;
      }).join("")}</div>`;
    }

    function renderTipoTabla(tipos) {
      return `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>Tipo</th><th>Record</th><th>Net</th></tr></thead>
      <tbody>${tipos.map(t => `<tr><td>${esc(t.tipo)}</td><td>${t.wins}-${t.losses}</td><td class="num ${signColor(t.neto)}">${fmts(t.neto)}</td></tr>`).join("")}</tbody>
      </table></div>`;
    }

    function makeChartTipoMix() {
      const c = document.getElementById("chartTipoMix");
      if (!c) return;
      destroyChart("tipomix");
      const tipos = calcRoiPorTipo();
      if (!tipos.length) return;
      charts.tipomix = new Chart(c, { type: "doughnut", data: { labels: tipos.map(t => t.tipo), datasets: [{ data: tipos.map(t => t.wins + t.losses), backgroundColor: tipos.map((_, i) => tipoMixColor(i)), borderColor: cssVar("--card"), borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: "65%", plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed} apuestas` } } } } });
    }

    /* ── Tab: Temporal ── */
    function renderTemporal() {
      const data = calcTemporal();
      if (!data.porDia.length && !data.porHora.length) return `<div class="section-header">Análisis <span>temporal</span></div><div class="empty">No hay suficientes datos con fechas registradas.</div>`;
      const maxAbsDia = Math.max(...data.porDia.map(d => Math.abs(d.roi)), 1);
      const maxAbsHora = Math.max(...data.porHora.map(d => Math.abs(d.roi)), 1);
      return `<div class="section-header">¿Cuándo <span>rinde más</span>?</div>
    ${data.porDia.length ? `
    <div class="card">
      <div class="card-title">Por día de la semana</div>
      ${data.porDia.map(d => {
        const barW = Math.min(100, Math.abs(d.roi) / maxAbsDia * 100);
        const col = d.roi >= 0 ? "var(--win)" : "var(--loss)";
        const best = d.roi === Math.max(...data.porDia.map(x => x.roi));
        return `<div class="dia-row">
          <span class="dia-label" style="color:${best ? "var(--accent)" : "var(--text-2)"}">${d.label}${best ? " ★" : ""}</span>
          <div class="dia-bar-wrap"><div class="dia-bar-fill" style="width:${barW}%;background:${col}"></div></div>
          <span class="dia-roi" style="color:${col}">${d.roi >= 0 ? "+" : ""}${d.roi.toFixed(1)}%</span>
          <span class="dia-wl">${d.wins}W-${d.losses}L</span>
        </div>`;
      }).join("")}
    </div>`: ""}
    ${data.porDia.length ? `
    <div class="card"><div class="card-title">Daily</div>
      <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Día</th><th>Record</th><th>Win%</th><th>Net</th></tr></thead>
      <tbody>${data.porDia.map(d => `<tr><td>${d.label}</td><td>${d.wins}-${d.losses}</td><td>${d.wr.toFixed(0)}%</td><td class="num ${signColor(d.neto)}">${fmts(d.neto)}</td></tr>`).join("")}</tbody>
      </table></div>
    </div>`: ""}
    ${data.porHora.length ? `
    <div class="card">
      <div class="card-title">Por franja horaria (hora de publicación)</div>
      ${data.horaMin ? `<div style="font-size:12px;color:var(--text-2);margin-bottom:8px">Rango real de publicación (todo el historial): <strong>${data.horaMin}</strong> — <strong>${data.horaMax}</strong></div>` : ""}
      ${data.porHora.map(d => {
        const barW = Math.min(100, Math.abs(d.roi) / maxAbsHora * 100);
        const col = d.roi >= 0 ? "var(--win)" : "var(--loss)";
        const best = d.roi === Math.max(...data.porHora.map(x => x.roi));
        return `<div class="dia-row">
          <span class="dia-label" style="color:${best ? "var(--accent)" : "var(--text-2)"};font-size:10px">${d.label}${best ? " ★" : ""}</span>
          <div class="dia-bar-wrap"><div class="dia-bar-fill" style="width:${barW}%;background:${col}"></div></div>
          <span class="dia-roi" style="color:${col}">${d.roi >= 0 ? "+" : ""}${d.roi.toFixed(1)}%</span>
          <span class="dia-wl">${d.wins}W-${d.losses}L</span>
        </div>`;
      }).join("")}
    </div>`: ""}
    <div class="explainer"><strong>Nota:</strong> El día de semana usa la fecha del evento. La franja horaria usa cuándo se publicó el pick en el canal (hora CDMX). Apuestas sin hora de publicación confiable no se cuentan. Con más datos este análisis se vuelve más preciso.</div>`;
    }

    /* ── Tab: Rolling ROI ── */
    let rollingShow = 30; // puntos rodantes visibles por defecto (selector de rango)
    function renderRolling() {
      const VENTANA = 20;
      const points = calcRolling(VENTANA);
      const res = DATA.apuestas.filter(a => a.status === "win" || a.status === "loss").length;
      if (!points.length) return `<div class="section-header">ROI <span>rodante</span></div><div class="empty">Necesitas al menos ${VENTANA} apuestas resueltas. Tienes ${res}.</div>`;
      const ultimo = points[points.length - 1];
      const tendencia = points.length >= 3 ? (() => { const t = points.slice(-3).map(p => p.roi); return t[2] > t[0] + 3 ? "Mejorando" : t[2] < t[0] - 3 ? "Empeorando" : "Estable"; })() : "—";
      return `<div class="section-header">ROI <span>rodante</span></div>
    <div class="rolling-kpi">
      <div class="rolling-kpi-item">
        <div class="rolling-kpi-val ${signColor(ultimo.roi)}">${ultimo.roi >= 0 ? "+" : ""}${ultimo.roi.toFixed(1)}%</div>
        <div class="rolling-kpi-lbl">ROI últimas ${VENTANA}</div>
      </div>
      <div class="rolling-kpi-item">
        <div class="rolling-kpi-val">${ultimo.wr.toFixed(0)}%</div>
        <div class="rolling-kpi-lbl">Win rate</div>
      </div>
      <div class="rolling-kpi-item">
        <div class="rolling-kpi-val ${signColor(ultimo.netoAcum)}">${fmts(ultimo.netoAcum)}</div>
        <div class="rolling-kpi-lbl">Neto total</div>
      </div>
    </div>
    <div class="card" style="margin-bottom:8px">
      <div style="font-size:13px;font-weight:700;margin-bottom:6px">Tendencia reciente</div>
      <div style="font-size:24px">${tendencia.split(" ")[0]} <span style="font-size:14px;color:var(--text-2)">${tendencia.split(" ").slice(1).join(" ")}</span></div>
    </div>
    <div class="card"><div class="card-title">ROI rodante (ventana ${VENTANA})</div>
      <div class="range-sel">
        <button class="range-chip ${rollingShow === 30 ? "active" : ""}" data-rolling-show="30">Últimas 30</button>
        <button class="range-chip ${rollingShow === 60 ? "active" : ""}" data-rolling-show="60">60</button>
        <button class="range-chip ${rollingShow >= 9999 ? "active" : ""}" data-rolling-show="9999">Todas</button>
      </div>
      ${chartPlaceholder("chartRolling", "rolling", true)}</div>
    <div class="explainer"><strong>ROI rodante:</strong> Calcula el rendimiento de las últimas ${VENTANA} apuestas cerradas. Si la línea sube, el tipster está mejorando. Si baja, hay una racha negativa real — no solo mala suerte en 1-2 apuestas.</div>`;
    }

    /* ── Tab: Kelly ── */
    function renderKelly() {
      const k = calcKelly();
      if (!k) return `<div class="section-header">Kelly <span>Criterion</span></div><div class="empty">Necesitas al menos 10 apuestas con cuota registrada.</div>`;
      const evColor = k.ev > 0 ? "green" : "red";
      const kellyPct = Math.min(k.f * 100, 25);
      return `<div class="section-header">Kelly <span>Criterion</span></div>
    <div class="card">
      <div class="card-title">Valor esperado (EV)</div>
      <div style="font-size:34px;font-weight:650;letter-spacing:-.03em;color:var(--${evColor});margin-bottom:8px">${k.ev >= 0 ? "+" : ""}${k.ev.toFixed(3)}</div>
      <div style="font-size:12px;color:var(--text-2)">Por unidad apostada. Positivo = ventaja estadística sobre la casa.</div>
    </div>
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">Win rate histórico</div><div class="kpi-value">${k.p.toFixed(1)}%</div></div>
      <div class="kpi"><div class="kpi-label">Cuota media</div><div class="kpi-value accent">${k.cuotaMedia.toFixed(2)}</div></div>
    </div>
    <div class="card">
      <div class="card-title">Fracción Kelly óptima: ${kellyPct.toFixed(1)}% del capital</div>
      <div class="kelly-meter"><div class="kelly-fill" style="width:${(kellyPct / 25) * 100}%"></div></div>
      <div class="kelly-grid">
        <div class="kelly-card">
          <div class="kelly-card-pct green">${(k.f * 100).toFixed(1)}%</div>
          <div class="kelly-card-lbl">Kelly completo</div>
          <div class="kelly-card-sub">Alta volatilidad</div>
        </div>
        <div class="kelly-card" style="border-color:var(--border-hi)">
          <div class="kelly-card-pct accent">${(k.fMedio * 100).toFixed(1)}%</div>
          <div class="kelly-card-lbl">Kelly medio ★</div>
          <div class="kelly-card-sub">Recomendado</div>
        </div>
        <div class="kelly-card">
          <div class="kelly-card-pct">${(k.fCuarto * 100).toFixed(1)}%</div>
          <div class="kelly-card-lbl">Kelly/4</div>
          <div class="kelly-card-sub">Ultra-seguro</div>
        </div>
      </div>
    </div>
    <div class="explainer"><strong>Kelly Criterion</strong> calcula el tamaño óptimo de apuesta para maximizar el crecimiento del capital a largo plazo sin riesgo de ruina. <strong>Kelly medio</strong> es el balance ideal entre crecimiento y seguridad. Los porcentajes son sobre tu capital total disponible.</div>`;
    }

    /* ── Patrones IA: conversión de Markdown de Claude a render enriquecido ──
       El texto que devuelve Claude cambia en cada análisis, así que el parser
       trabaja sobre patrones estables (encabezados ##, líneas de métricas
       ROI/WR, confianza, recomendaciones 💡, avisos ⚠️). Todo lo que no encaje
       cae con gracia a un párrafo: nunca se pierde contenido. */
    function _patInline(s) {
      // Resalta porcentajes y montos con signo (+verde / −rojo)
      s = s.replace(/([+\-−]\s?\d+(?:[.,]\d+)?\s?%)/g, m => `<span class="pat-num ${/[-−]/.test(m) ? "neg" : "pos"}">${m}</span>`);
      s = s.replace(/([+\-−]\s?\d[\d.,]*\s?€)/g, m => `<span class="pat-num ${/[-−]/.test(m) ? "neg" : "pos"}">${m}</span>`);
      s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      s = s.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
      s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
      return s;
    }
    function _patSplitIcon(txt) {
      const sp = txt.indexOf(" ");
      if (sp > 0) {
        const first = txt.slice(0, sp);
        if (!/[A-Za-z0-9À-ÿ]/.test(first)) return { ico: first, rest: txt.slice(sp + 1).trim() };
      }
      return { ico: "", rest: txt };
    }
    function _patIsStat(line) {
      const t = line.trim();
      if (/^(📈|📉)/.test(t)) return true;
      return /\bROI\b/i.test(t) && /\bWR\b/i.test(t) && /%/.test(t);
    }
    function _patKind(line) {
      const t = line.trim();
      if (_patIsStat(line)) return "stat";
      if (/confianza/i.test(t)) return "conf";
      if (t.startsWith("💡")) return "tip";
      if (t.startsWith("⚠")) return "warn";
      if (t.startsWith("✅")) return "note";
      if (/^[-–—•]\s+/.test(t)) return "bullet";
      if (/^\d+[.)]\s+/.test(t)) return "num";
      return "text";
    }
    function _patTheme(txt) {
      const t = txt.toLowerCase();
      if (/plan de acci|plan\b/.test(t)) return "plan";
      if (/anti.?patr|evitar|fuga|❌|🚫|✕/.test(t)) return "bad";
      if (/fuerte|\+ev|favorab|✅|ganador/.test(t)) return "good";
      return "info";
    }
    function _patChip(k, v, cls) {
      return `<span class="pat-metric pat-metric--${cls}"><span class="pat-metric-k">${esc(k)}</span><span class="pat-metric-v">${esc(v)}</span></span>`;
    }
    function _patMetrics(line) {
      const chips = [];
      const roi = line.match(/ROI\s*([+\-−]?\s*\d+(?:[.,]\d+)?)\s*%/i);
      if (roi) { const v = roi[1].replace(/\s/g, "").replace("−", "-"); chips.push(_patChip("ROI", v + "%", v.startsWith("-") ? "roi-neg" : "roi-pos")); }
      const wr = line.match(/\bWR\s*[: ]?\s*(\d+(?:[.,]\d+)?)\s*%/i) || line.match(/winrate\s*[: ]?\s*(\d+(?:[.,]\d+)?)\s*%/i);
      if (wr) chips.push(_patChip("WR", wr[1] + "%", "wr"));
      const smp = line.match(/(\d+)\s*W\s*[-–—]\s*(\d+)\s*L/i);
      if (smp) chips.push(_patChip("Muestra", smp[1] + "W-" + smp[2] + "L", "sample"));
      const mon = line.match(/([+\-−]?\s*\d[\d.,]*\s*€)/);
      if (mon) { const v = mon[1].replace(/\s/g, "").replace("−", "-"); chips.push(_patChip("Neto", v, v.startsWith("-") ? "money-neg" : "money-pos")); }
      if (!chips.length) return `<div class="pat-p">${_patInline(line.trim())}</div>`;
      return `<div class="pat-metrics">${chips.join("")}</div>`;
    }
    function _patConf(line) {
      const m = line.match(/confianza\s*:?\s*(.+)$/i);
      const lbl = (m ? m[1] : line).replace(/[*_`🛡️]/g, "").trim();
      const low = lbl.toLowerCase();
      const cls = /baja/.test(low) ? "baja" : /alta/.test(low) ? "alta" : /media/.test(low) ? "media" : "baja";
      return `<div class="pat-conf pat-conf--${cls}"><span class="pat-conf-dot"></span>Confianza <strong>${_patInline(lbl)}</strong></div>`;
    }
    function _patCallLine(line, cls) {
      const { ico, rest } = _patSplitIcon(line.trim());
      const fb = cls === "warn" ? "⚠️" : cls === "note" ? "✅" : "💡";
      return `<div class="pat-${cls}"><span class="pat-ico">${ico || fb}</span><span>${_patInline(rest)}</span></div>`;
    }
    function _patSteps(block) {
      const rows = block.map((l, i) => {
        const m = l.trim().match(/^\d+[.)]\s+(.*)$/);
        return `<div class="pat-step"><span class="pat-step-n">${i + 1}</span><span class="pat-step-t">${_patInline((m ? m[1] : l).trim())}</span></div>`;
      });
      return `<div class="pat-steps">${rows.join("")}</div>`;
    }
    function _patBullets(block) {
      const items = block.map(l => `<li>${_patInline(l.trim().replace(/^[-–—•]\s+/, ""))}</li>`);
      return `<ul class="pat-list">${items.join("")}</ul>`;
    }
    function _patCard(block, theme) {
      let inner = "", titled = false;
      for (const line of block) {
        const k = _patKind(line);
        if (k === "stat") inner += _patMetrics(line);
        else if (k === "conf") inner += _patConf(line);
        else if (k === "tip" || k === "warn" || k === "note") inner += _patCallLine(line, k);
        else if (k === "bullet") inner += `<div class="pat-li">${_patInline(line.trim().replace(/^[-–—•]\s+/, ""))}</div>`;
        else if (!titled) { inner += `<div class="pat-card-title">${_patInline(line.trim())}</div>`; titled = true; }
        else inner += `<div class="pat-p">${_patInline(line.trim())}</div>`;
      }
      return `<div class="pat-card pat-card--${theme}">${inner}</div>`;
    }
    function _patCallout(block) {
      let out = "";
      for (const line of block) {
        const k = _patKind(line);
        if (k === "tip" || k === "warn" || k === "note") out += _patCallLine(line, k);
        else if (k === "conf") out += _patConf(line);
        else if (k === "bullet") out += `<div class="pat-li">${_patInline(line.trim().replace(/^[-–—•]\s+/, ""))}</div>`;
        else out += `<div class="pat-p">${_patInline(line.trim())}</div>`;
      }
      return out;
    }
    function _patBlock(block, theme) {
      if (block.every(l => /^\d+[.)]\s+/.test(l.trim()))) return _patSteps(block);
      if (block.every(l => /^[-–—•]\s+/.test(l.trim()))) return _patBullets(block);
      if (block.some(_patIsStat) || block.some(l => /confianza/i.test(l))) return _patCard(block, theme);
      return _patCallout(block);
    }
    function _patHeader(txt, lvl, theme) {
      const { ico, rest } = _patSplitIcon(txt);
      if (lvl === 1) return `<div class="pat-hero"><span class="pat-ico">${ico || "📊"}</span><span>${_patInline(rest)}</span></div>`;
      return `<div class="pat-sec pat-sec--${theme}"><span class="pat-ico">${ico || "•"}</span><span>${_patInline(rest)}</span></div>`;
    }
    function renderPatronesMarkdown(raw) {
      const lines = esc(raw || "").replace(/\r/g, "").split("\n");
      let html = "", block = [], theme = "info";
      const flush = () => { if (block.length) { html += _patBlock(block, theme); block = []; } };
      for (const ln of lines) {
        const line = ln.replace(/\s+$/, "");
        if (!line.trim()) { flush(); continue; }
        const h = line.match(/^(#{1,3})\s+(.*)$/);
        if (h) { flush(); theme = _patTheme(h[2]); html += _patHeader(h[2].trim(), h[1].length, theme); continue; }
        if (/^\s*([-–—_*=]\s*){3,}$/.test(line)) { flush(); continue; } // separador ---
        block.push(line);
      }
      flush();
      return `<div class="pat-wrap">${html}</div>`;
    }

    /* ── Motor de Neto Mensual (ANM): render de tarjetas/chips ──
       Consume el campo aditivo neto_mensual de /api/patterns. Presentación pura
       (esc() + sin eventos inline). Tolera ausencia/error del campo. */
    function renderNetoMensual(nm) {
      if (!nm || nm.error || !Array.isArray(nm.por_mes) || !nm.por_mes.length) return "";
      const money = v => (v >= 0 ? "+" : "") + Math.round(v).toLocaleString("es-MX");
      const dom = nm.patron_dominante;
      const mejor = nm.mejor_mes;
      // Pico neto del mejor mes, con fallback a neto final (datos cacheados sin neto_max).
      const _mejorPico = mm => (typeof mm.neto_max === "number") ? mm.neto_max : mm.neto;

      const resumen = `
        <div class="nm-resumen">
          <div class="nm-stat">
            <span class="nm-stat-k">Motor dominante</span>
            <span class="nm-stat-v">${dom ? esc(dom.patron) : "—"}</span>
            <small>${dom ? `top en ${dom.meses_top} ${dom.meses_top === 1 ? "mes" : "meses"} · neto ${money(dom.neto_acumulado)}` : ""}</small>
          </div>
          <div class="nm-stat">
            <span class="nm-stat-k">Mejor mes</span>
            <span class="nm-stat-v ${mejor && _mejorPico(mejor) >= 0 ? "pos" : ""}">${mejor ? esc(mejor.mes) : "—"}</span>
            <small>${mejor ? `pico ${money(_mejorPico(mejor))} · ${esc(mejor.driver.patron)}` : ""}</small>
          </div>
          <div class="nm-stat">
            <span class="nm-stat-k">Estabilidad</span>
            <span class="nm-stat-v ${nm.estabilidad === "sistematico" ? "pos" : "neg"}">${nm.estabilidad === "sistematico" ? "Sistemática" : "Variable"}</span>
            <small>${nm.estabilidad === "sistematico" ? "patrón recurrente" : "depende del azar"}</small>
          </div>
        </div>`;

      const tarjetas = nm.por_mes.slice().reverse().map(m => {
        const d = m.driver;
        // Pico neto intra-mes (neto máximo alcanzado). Fallback a neto final si el
        // backend aún no envía neto_max (análisis cacheado previo).
        const pico = (typeof m.neto_max === "number") ? m.neto_max : m.neto;
        const conc = Math.min(100, Math.max(0, m.concentracion_pct || 0));
        const lowBadge = d.muestra_baja ? `<span class="nm-badge low">muestra baja</span>` : "";
        const dims = ["deporte", "tipo", "dia", "cuota"].map(k => {
          const dd = m.por_dimension && m.por_dimension[k];
          return dd ? `<span class="nm-dim"><b>${esc(dd.valor)}</b> ${money(dd.neto)}</span>` : "";
        }).join("");
        return `
          <div class="nm-card">
            <div class="nm-card-head">
              <span class="nm-mes">${esc(m.mes)}</span>
              <span class="nm-neto ${pico >= 0 ? "pos" : "neg"}">${money(pico)}<small class="nm-neto-tag">pico</small></span>
            </div>
            <div class="nm-driver">
              <span class="nm-chip">${esc(d.patron)}</span>${lowBadge}
              <small>${d.wins}W-${d.losses}L · ROI ${Math.round(d.roi)}%</small>
            </div>
            <div class="nm-bar" title="Concentración del neto en el driver">
              <div class="nm-bar-fill" style="width:${conc.toFixed(0)}%"></div>
              <span class="nm-bar-lbl">${conc.toFixed(0)}% del neto</span>
            </div>
            <div class="nm-dims">${dims}</div>
          </div>`;
      }).join("");

      return `
        <div class="nm-wrap">
          <div class="pat-sec pat-sec--info"><span>Motor de Neto Mensual</span></div>
          ${resumen}
          <div class="nm-grid">${tarjetas}</div>
        </div>`;
    }

    /* ── Tab: Patrones IA ── */
    // Reconciliación con el bot al abrir el tab: trae el último análisis persistido
    // vía ?peek=true (el bot NO genera, no consume presupuesto Anthropic), de modo
    // que la web refleje el análisis hecho desde Telegram y viceversa. Fire-and-forget:
    // pinta primero lo de localStorage y repinta solo si el servidor trae uno más nuevo.
    async function peekPatrones() {
      try {
        const res = await fetchRetry503(`${API_URL}/api/patterns?peek=true`, { headers: apiHeaders() });
        if (!res.ok) return;                         // silencioso: conservamos lo local
        const server = await res.json();
        if (server.error || !server.analisis) return; // nada persistido aún → conservar local
        const localTs = (_patronesData && _patronesData.timestamp) || 0;
        if (!_patronesData || (server.timestamp || 0) > localTs) {
          _patronesData = server;
          _guardarPatrones(server);
          if (tabActual === "patrones" && !_patronesCargando) renderPatrones();
        }
      } catch (_) { /* offline → conservar lo local */ }
    }

    async function fetchPatrones(force = false) {
      if (_patronesCargando) return;
      _patronesCargando = true;
      const el = document.getElementById("patrones");
      if (el) {
        el.innerHTML = `<div class="section-header">Patrones <span>IA</span></div>
          <div class="empty" style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:40px 20px">
            <div class="loader-logo" style="animation:pulse 1s infinite alternate;font-size:32px">${ico("sparkles", "ico-lg")}</div>
            <p>Claude está analizando todo tu historial para encontrar patrones EV+...</p>
            <small style="color:var(--text-3)">(Este proceso puede tardar unos 10-20 segundos)</small>
          </div>`;
      }
      try {
        const url = `${API_URL}/api/patterns` + (force ? "?force=true" : "");
        const res = await fetchRetry503(url, { headers: apiHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        _patronesData = await res.json();
        if (!_patronesData.error) _guardarPatrones(_patronesData);
      } catch (e) {
        _patronesData = { error: e.message };
      } finally {
        _patronesCargando = false;
        renderPatrones();
      }
    }

    function renderPatrones() {
      const el = document.getElementById("patrones");
      if (!el) return "";

      // Al abrir el tab, reconciliar UNA vez con el bot (peek, sin generar) para
      // reflejar el último análisis hecho desde Telegram. Repinta solo si trae algo
      // más nuevo que lo guardado en localStorage. No interfiere con una generación.
      if (!_patronesPeekDone && !_patronesCargando) {
        _patronesPeekDone = true;
        peekPatrones();
      }

      // Si no hay datos en memoria, intentar recuperar del último análisis
      // guardado (localStorage) antes de lanzar una llamada a Claude.
      if (!_patronesData && !_patronesCargando) {
        const cached = _cargarPatronesGuardados();
        if (cached) {
          _patronesData = cached;
        } else {
          // Primera vez (nada guardado todavía) → mostrar pantalla de bienvenida
          // con botón explícito. NO lanzar análisis automático.
          el.innerHTML = `<div class="section-header">Patrones <span>IA</span></div>
            <div class="explainer" style="margin-bottom:16px;background:rgba(0,168,128,0.06);border-color:rgba(0,168,128,0.25)">
              <strong>BetStats IA:</strong> Claude analiza la distribución de tu ROI por Deporte, Mercado, Día y Cuotas para encontrar sesgos estadísticos.
            </div>
            <div class="empty" style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:32px 20px">
              <div>${ico("sparkles", "ico-lg")}</div>
              <p style="text-align:center;margin:0">Aún no has ejecutado el análisis IA.</p>
              <small style="color:var(--text-3);text-align:center">Presiona el botón para que Claude analice tu historial y detecte patrones EV+.</small>
              <button class="retry-btn" data-action="force-patrones" style="margin:0;padding:10px 20px;font-size:13px">Iniciar análisis IA</button>
            </div>`;
          return el.innerHTML;
        }
      }

      if (_patronesCargando) {
        el.innerHTML = `<div class="section-header">Patrones <span>IA</span></div>
          <div class="empty" style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:40px 20px">
            <div class="loader-logo" style="animation:pulse 1s infinite alternate;font-size:32px">${ico("sparkles", "ico-lg")}</div>
            <p>Claude está analizando todo tu historial para encontrar patrones EV+...</p>
            <small style="color:var(--text-3)">(Este proceso puede tardar unos 10-20 segundos)</small>
          </div>`;
        return el.innerHTML;
      }

      if (_patronesData.error) {
        el.innerHTML = `<div class="section-header">Patrones <span>IA</span></div>
          <div class="empty">
            <p>Error al cargar los patrones</p>
            <small style="color:var(--loss)">${esc(_patronesData.error)}</small>
            <br><br>
            <button class="retry-btn" data-action="retry-patrones">↻ Reintentar</button>
          </div>`;
        return el.innerHTML;
      }

      // Convertir el Markdown de Claude a render enriquecido (tarjetas,
      // chips de métricas, pills de confianza, callouts). Ver renderPatronesMarkdown.
      const htmlContent = renderPatronesMarkdown(_patronesData.analisis);

      // Motor de Neto Mensual (ANM): visual de tarjetas/chips encima del texto IA.
      // Tolera ausencia del campo (clientes/análisis previos sin neto_mensual).
      const netoHtml = renderNetoMensual(_patronesData.neto_mensual);

      // Formato bonito de timestamp
      let fechaTxt = "—";
      if (_patronesData.timestamp > 0) {
        const fecha = new Date(_patronesData.timestamp * 1000);
        fechaTxt = fecha.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
      }

      el.innerHTML = `<div class="section-header">Patrones <span>IA</span></div>
        <div class="explainer" style="margin-bottom:16px;background:rgba(0,168,128,0.06);border-color:rgba(0,168,128,0.25)">
          <strong>BetStats IA:</strong> Claude analiza la distribución de tu ROI por Deporte, Mercado, Día y Cuotas para encontrar sesgos estadísticos.
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
          <div style="font-size:11px;color:var(--text-3)">Generado: <strong>${fechaTxt}</strong></div>
          <button class="retry-btn" data-action="force-patrones" style="margin:0;padding:6px 12px;font-size:11px;background:var(--card);border:1px solid var(--border);color:var(--text)">Nuevo análisis</button>
        </div>
        ${netoHtml}
        <div style="word-break:break-word">${htmlContent}</div>`;
      return el.innerHTML;
    }

    /* ── Tab: Capital ── */
    function renderCapital() {
      const c = DATA.capital, cm = DATA.capital_mes;
      if (!c) return '<div class="empty">Faltan datos</div>';

      // ── Semáforo de ventaja (EV/Kelly) — campos aditivos, tolera ausencia (INV-BIZ-12) ──
      let ventajaHtml = "";
      if (c.tiene_ventaja != null) {
        // 4 estados (INV-BIZ-46): el veredicto sale del IC95% del rendimiento por unidad apostada,
        // no del signo del edge — con ~300 apuestas el error típico es ±6 puntos y un +0.8% no es
        // distinguible de 0. Backend viejo (sin veredicto_ventaja) → cae al signo, como antes.
        const v = c.veredicto_ventaja || (c.tiene_ventaja ? "ventaja" : "pierde");
        const palette = {
          ventaja:       ["var(--win)",  "var(--win-bg)",  "Ventaja demostrada"],
          pierde:        ["var(--loss)", "var(--loss-bg)", "El sistema pierde"],
          sin_evidencia: ["var(--pend)", "var(--pend-bg)", "Sin evidencia todavía"],
          insuficiente:  ["var(--pend)", "var(--pend-bg)", "Muestra insuficiente"],
        };
        const [col, bg, titulo] = palette[v] || palette.sin_evidencia;
        const cuotaM = ((c.cuota_media_b ?? 0) + 1).toFixed(2);
        const edgeP = fmtp((c.edge_por_stake ?? 0) * 100);
        const ic = (c.edge_low != null && c.edge_high != null)
          ? `${fmtp(c.edge_low * 100)} a ${fmtp(c.edge_high * 100)}` : null;
        const base = `Winrate ${fmtp((c.winrate_p ?? 0) * 100)} vs break-even ${fmtp((c.break_even_wr ?? 0) * 100)} (cuota media ${cuotaM}).`;
        let detalle;
        if (v === "ventaja") {
          detalle = `Rendimiento por unidad apostada <strong>${edgeP}</strong>${ic ? ` (IC95%: ${ic})` : ""}, con el intervalo completo por encima de cero. ${base} Kelly/4 sugerido: <strong>${fmtp((c.kelly_cuarto ?? 0) * 100)}</strong> del capital por apuesta.`;
        } else if (v === "pierde") {
          detalle = `Rendimiento por unidad apostada <strong>${edgeP}</strong>${ic ? ` (IC95%: ${ic})` : ""}, con el intervalo completo por debajo de cero. ${base} Kelly óptimo ≤ 0: ningún capital arregla un edge negativo, solo cambia la velocidad de la ruina. Prioriza subir el winrate o bajar la cuota de entrada.`;
        } else if (v === "insuficiente") {
          detalle = `Con ${c.n_resueltas ?? "pocas"} apuestas resueltas (menos de 10) no se puede estimar la ventaja. ${base}`;
        } else {
          detalle = `Rinde <strong>${edgeP}</strong> por unidad apostada${ic ? `, pero con ${c.n_resueltas ?? "estas"} apuestas el margen va de ${ic}` : ""}: no se distingue de cero. Todavía no hay base para decir que el sistema gana ni que pierde; no subas el stake por esta cifra. ${base}`;
        }
        ventajaHtml = `
    <div class="card" style="border:1px solid ${col};background:${bg};margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
        <div style="font-weight:800;font-size:14px;color:${col}">${titulo}</div>
        <div style="font-family:var(--font-num);font-size:13px;color:${col}">edge ${edgeP}/stake</div>
      </div>
      <div style="font-size:12px;color:var(--text-2);margin-top:6px;line-height:1.5">${detalle}</div>
    </div>`;
      }

      // ── Recomendación robusta (drawdown p95 Monte Carlo + liquidez) — aditivo ──
      let robustoHtml = "";
      if (c.capital_minimo_robusto != null) {
        // Aviso de muestra baja (n<30): los prospectivos no son fiables aún (aditivo, tolera ausencia).
        const avisoMuestra = (c.muestra_suficiente === false)
          ? `
    <div class="card" style="border:1px solid var(--pend);background:var(--pend-bg);margin-bottom:10px">
      <div style="font-size:12px;color:var(--pend);line-height:1.5"><strong>Muestra baja</strong> (${c.n_resueltas ?? 0} resueltas &lt; 30): los valores prospectivos (p95/p99, racha esperada) son orientativos, todavía no fiables. Ganan precisión al acumular historial.</div>
    </div>`
          : "";
        robustoHtml = avisoMuestra + `
    <div class="card" style="margin-bottom:10px">
      <div class="card-title">Recomendación robusta (p95)</div>
      <div class="capital-hero" style="padding:10px 0 6px">
        <div class="capital-label">Capital cómodo robusto</div>
        <div class="capital-amount">${fmt(c.capital_comodo_robusto)}</div>
        <div class="capital-sub">Sobrevive el drawdown al percentil 99</div>
      </div>
      <div style="margin-top:8px;padding:10px 12px;background:var(--card2);border-radius:var(--radius-md);border:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
          <span style="color:var(--text-2)">Capital mínimo robusto</span>
          <span style="font-family:var(--font-num);color:var(--pend)">${fmt(c.capital_minimo_robusto)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
          <span style="color:var(--text-2)">↳ Drawdown p95 (Monte Carlo)</span>
          <span style="font-family:var(--font-num);color:var(--loss)">${fmt(c.drawdown_p95)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px">
          <span style="color:var(--text-2)">↳ + Exposición simultánea viva</span>
          <span style="font-family:var(--font-num);color:var(--text)">${fmt(c.exp_maxima)}</span>
        </div>
      </div>
      <div class="cap-grid" style="margin-top:10px">
        <div class="cap-stat"><div class="cap-stat-val red">${c.peor_racha_esperada ?? "—"}</div><div class="cap-stat-lbl">Peor racha esperada (p95)</div></div>
        <div class="cap-stat"><div class="cap-stat-val accent">${c.simultaneas_max_capital ?? "—"}</div><div class="cap-stat-lbl">Simultáneas que soporta</div></div>
      </div>
    </div>`;
      }

      // ── Card desglose capital mínimo ──────────────────────────────────────
      const desglose = (c.exp_maxima != null && c.drawdown_racha != null) ? `
    <div style="margin-top:10px;padding:10px 12px;background:var(--card2);border-radius:var(--radius-md);border:1px solid var(--border)">
      <div style="font-size:10px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">Composición del mínimo</div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
        <span style="color:var(--text-2)">Exposición simultánea máx.</span>
        <span style="font-family:var(--font-num);color:var(--text)">${fmt(c.exp_maxima)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
        <span style="color:var(--text-2)">Drawdown peor racha (${c.peor_racha} × ${fmt(c.monto_racha_prom ?? c.monto_promedio)})</span>
        <span style="font-family:var(--font-num);color:var(--loss)">${fmt(c.drawdown_racha)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px">
        <span style="color:var(--text-2)">Drawdown histórico real</span>
        <span style="font-family:var(--font-num);color:var(--loss)">${fmt(c.drawdown_maximo ?? 0)}</span>
      </div>
    </div>` : "";

      const capMesHtml = cm ? `
    <div class="card" style="margin-top:10px">
      <div class="card-title">Capital — Este mes</div>
      <div class="capital-hero" style="padding:12px 0 8px">
        <div class="capital-label">Capital cómodo</div>
        <div class="capital-amount" style="font-size:30px">${fmt(cm.capital_comodo)}</div>
      </div>
      <div class="cap-grid">
        <div class="cap-stat"><div class="cap-stat-val yellow">${fmt(cm.capital_minimo)}</div><div class="cap-stat-lbl">Mínimo</div></div>
        <div class="cap-stat"><div class="cap-stat-val accent">${cm.max_simultaneas}</div><div class="cap-stat-lbl">Simultáneas</div></div>
        <div class="cap-stat"><div class="cap-stat-val">${(cm.promedio_dia ?? 0).toFixed(1)}</div><div class="cap-stat-lbl">Bets/día</div></div>
        <div class="cap-stat"><div class="cap-stat-val red">${cm.peor_racha}</div><div class="cap-stat-lbl">Peor racha</div></div>
      </div>
    </div>` : "";

      const heroLabel = c.capital_minimo_robusto != null
        ? "Capital cómodo — modelo simple (×1.5)"
        : "Capital cómodo recomendado";

      return `<div class="section-header">Gestión de <span>capital</span></div>
    ${ventajaHtml}
    ${robustoHtml}
    <div class="card">
      <div class="capital-hero">
        <div class="capital-label">${heroLabel}</div>
        <div class="capital-amount">${fmt(c.capital_comodo)}</div>
        <div class="capital-sub">Para seguir al tipster sin riesgo de ruina</div>
      </div>
      ${desglose}
      <div class="cap-grid" style="margin-top:12px">
        <div class="cap-stat"><div class="cap-stat-val yellow">${fmt(c.capital_minimo)}</div><div class="cap-stat-lbl">Capital mínimo</div></div>
        <div class="cap-stat"><div class="cap-stat-val accent">${c.max_simultaneas}</div><div class="cap-stat-lbl">Máx simultáneas</div></div>
        <div class="cap-stat"><div class="cap-stat-val">${(c.promedio_dia ?? 0).toFixed(1)}</div><div class="cap-stat-lbl">Bets/día prom.</div></div>
        <div class="cap-stat"><div class="cap-stat-val red">${c.peor_racha}</div><div class="cap-stat-lbl">Peor racha</div></div>
        <div class="cap-stat"><div class="cap-stat-val">${fmt(c.monto_promedio)}</div><div class="cap-stat-lbl">Monto prom.</div></div>
        <div class="cap-stat"><div class="cap-stat-val green">${c.total_apuestas}</div><div class="cap-stat-lbl">Total bets</div></div>
      </div>
    </div>
    ${capMesHtml}
    <div class="explainer">
      ${c.tiene_ventaja != null ? `El <strong>semáforo de ventaja</strong> compara tu winrate con el break-even de tu cuota media: sin ventaja (Kelly ≤ 0), ningún capital evita la ruina a largo plazo. ` : ""}${c.capital_minimo_robusto != null ? `La <strong>recomendación robusta</strong> dimensiona el capital con el drawdown al percentil 95/99 (simulación Monte Carlo sobre tus resultados reales) más la exposición simultánea viva — más realista que el modelo simple. ` : ""}El <strong>capital mínimo (simple)</strong> es el mayor entre: la exposición simultánea máxima histórica, el drawdown de la peor racha perdedora y el drawdown histórico real; el <strong>cómodo (simple)</strong> le añade un 50% de colchón.
    </div>`;
    }

    /* ── Tab: Simulador "what-if" (backtesting) — INV-MINI-26 ──────────────────
       Presentación pura (INV-MINI-02): arma los filtros, llama POST /api/backtest
       (el cálculo vive en analytics.simular_backtest, INV-BIZ-14) y pinta KPIs +
       curva del bank. Sin eventos inline (INV-MINI-13); todo por delegación. ── */
    const _BT_DIAS = [["Lun", 0], ["Mar", 1], ["Mié", 2], ["Jue", 3], ["Vie", 4], ["Sáb", 5], ["Dom", 6]];
    // Compounding Tracker (B9): a diferencia del Simulador (_bt, what-if con
    // filtros), este SIEMPRE corre sobre TODO el historial sin filtrar — es un
    // tracker de bankroll real, no un análisis exploratorio. Reusa el mismo motor
    // (POST /api/backtest, modo_stake="porcentaje") con el stake_cap nuevo (A2).
    // Bank y stakes en unidades (INV-MINI-43): 100u de bank, 2u fijas, tope 1000u.
    let _ct = { bank_inicial: "100", pct: "5", cap: 1000, res: null, loading: false };

    let _bt = {
      bank_inicial: "100", modo: "fijo", stake_valor: "2",
      cuota_min: "", cuota_max: "", date_from: "", date_to: "",
      sel: { deportes: new Set(), tipos: new Set(), dias: new Set() },
      // Modo "en contra" (fade / anti-tipster, INV-BIZ-25): apostar lo CONTRARIO
      // de cada análisis. `margen` = vig del mercado con el que se deriva la cuota
      // del otro lado; `incluir_nb` fuerza también los mercados no binarios.
      contra: false, margen: "5", incluir_nb: false,
      res: null, base: null, dir: null, search: null, loading: false, searching: false,
    };

    function btSetModo(m) {
      _bt.modo = (m === "porcentaje") ? "porcentaje" : "fijo";
      haptic("select");
      document.querySelectorAll("[data-bt-modo]").forEach(b =>
        b.classList.toggle("active", b.dataset.btModo === _bt.modo));
      const lbl = document.getElementById("btStakeLabel");
      const suf = document.getElementById("btStakeSuffix");
      if (lbl) lbl.textContent = _bt.modo === "porcentaje" ? "% del bank por apuesta" : "Unidades fijas por apuesta";
      if (suf) suf.textContent = _bt.modo === "porcentaje" ? "%" : "u";
    }
    /* Lado de la apuesta: "favor" (seguir al tipster) o "contra" (fade). Solo
       muestra/oculta el bloque de opciones — no re-renderiza la pestaña, para no
       perder los resultados ya pintados. */
    function btSetLado(l) {
      _bt.contra = (l === "contra");
      haptic("select");
      document.querySelectorAll("[data-bt-lado]").forEach(b =>
        b.classList.toggle("active", (b.dataset.btLado === "contra") === _bt.contra));
      const box = document.getElementById("btContraBox");
      if (box) box.style.display = _bt.contra ? "" : "none";
      const nota = document.getElementById("btSearchNota");
      if (nota) nota.style.display = _bt.contra ? "" : "none";
    }
    function btToggleNB() {
      _bt.incluir_nb = !_bt.incluir_nb;
      haptic("select");
      const b = document.querySelector("[data-bt-nb]");
      if (b) b.classList.toggle("active", _bt.incluir_nb);
    }
    function btToggle(group, value) {
      const set = _bt.sel[group];
      if (!set) return;
      const key = (group === "dias") ? parseInt(value, 10) : value;
      if (set.has(key)) set.delete(key); else set.add(key);
      haptic("select");
      const chip = document.querySelector(`[data-bt-toggle="${group}"][data-bt-value="${CSS.escape(value)}"]`);
      if (chip) chip.classList.toggle("active", set.has(key));
    }
    function btReset() {
      _bt.sel = { deportes: new Set(), tipos: new Set(), dias: new Set() };
      _bt.cuota_min = ""; _bt.cuota_max = ""; _bt.date_from = ""; _bt.date_to = "";
      _bt.res = null; _bt.base = null; _bt.dir = null; _bt.search = null;
      haptic("light");
      destroyChart("bt");
      const sec = document.getElementById("backtest");
      if (sec) sec.innerHTML = renderBacktest();
    }

    function renderBacktest() {
      if (!DATA?.apuestas?.length) return '<div class="section-header">Simulador <span>what-if</span></div><div class="empty">Sin apuestas registradas todavía.</div>';
      const deportes = [...new Set(DATA.apuestas.map(a => (a.deporte || "").trim()).filter(Boolean))].sort();
      // Tipos = CATEGORÍAS canónicas (Moneyline, Handicap, Total O/U…), no la variante
      // cruda con equipo/línea: reusa normalizaTipo (gemelo JS de _normalizar_tipo,
      // INV-XCUT-02/07). El backend filtra por la misma categoría normalizada.
      const tipos = [...new Set(DATA.apuestas.map(a => tipoDe(a)).filter(Boolean))].sort();
      const chip = (group, label, value, active) =>
        `<button class="bt-chip${active ? " active" : ""}" data-bt-toggle="${group}" data-bt-value="${esc(value)}">${esc(label)}</button>`;
      const depChips = deportes.map(d => chip("deportes", d, d, _bt.sel.deportes.has(d))).join("");
      const tipoChips = tipos.map(t => chip("tipos", t, t, _bt.sel.tipos.has(t))).join("");
      const diaChips = _BT_DIAS.map(([lbl, n]) => chip("dias", lbl, String(n), _bt.sel.dias.has(n))).join("");
      const sufijo = _bt.modo === "porcentaje" ? "%" : "u";
      const stakeLbl = _bt.modo === "porcentaje" ? "% del bank por apuesta" : "Unidades fijas por apuesta";

      return `<div class="section-header">Simulador <span>what-if</span></div>
    <div class="explainer" style="margin-bottom:14px">
      Reproduce tu historial real apostando <strong>solo</strong> lo que elijas, con un bank y un staking a tu medida. Recalcula cuánto habrías ganado o perdido (las pendientes no entran). Con el modo <strong>En contra</strong> simula lo opuesto: apostar <em>contra</em> cada análisis.
    </div>

    <div class="card" style="margin-bottom:12px">
      <div class="card-title">Parámetros</div>
      <div class="bt-form">
        <label class="bt-field"><span>Bank inicial</span>
          <div class="bt-input-wrap"><span class="bt-prefix">u</span><input class="bt-input" type="text" inputmode="decimal" data-bt-input="bank_inicial" value="${esc(_bt.bank_inicial)}"></div>
        </label>
        <label class="bt-field"><span id="btStakeLabel">${stakeLbl}</span>
          <div class="bt-input-wrap"><span class="bt-prefix" id="btStakeSuffix">${sufijo}</span><input class="bt-input" type="text" inputmode="decimal" data-bt-input="stake_valor" value="${esc(_bt.stake_valor)}"></div>
        </label>
      </div>
      <div class="bt-modo-row">
        <button class="bt-chip${_bt.modo === "fijo" ? " active" : ""}" data-bt-modo="fijo">Unidades fijas</button>
        <button class="bt-chip${_bt.modo === "porcentaje" ? " active" : ""}" data-bt-modo="porcentaje">% del bank</button>
      </div>
    </div>

    <div class="card" style="margin-bottom:12px">
      <div class="card-title">Lado de la apuesta</div>
      <div class="bt-modo-row" style="margin-top:0">
        <button class="bt-chip${!_bt.contra ? " active" : ""}" data-bt-lado="favor">A favor</button>
        <button class="bt-chip${_bt.contra ? " active" : ""}" data-bt-lado="contra">En contra</button>
      </div>
      <div id="btContraBox" style="${_bt.contra ? "" : "display:none"}">
        <div class="bt-alert bt-alert-muted">
          <strong>Modo fade:</strong> apuesta lo <strong>contrario</strong> de cada análisis (si el pick era <em>Over 1.5</em>, se simula <em>Under 1.5</em>). Gana lo que el análisis perdía y pierde lo que ganaba — pero <strong>a la cuota del otro lado</strong>, que también lleva la comisión de la casa. Por eso ir en contra de un tipster perdedor <strong>no</strong> garantiza ganar.
        </div>
        <div class="bt-form" style="margin-top:12px">
          <label class="bt-field"><span>Margen de la casa (vig)</span>
            <div class="bt-input-wrap"><span class="bt-prefix">%</span><input class="bt-input" type="text" inputmode="decimal" placeholder="5" data-bt-input="margen" value="${esc(_bt.margen)}"></div>
          </label>
        </div>
        <div class="bt-chips" style="margin-top:10px">
          <button class="bt-chip${_bt.incluir_nb ? " active" : ""}" data-bt-nb="1">Incluir mercados no binarios (aprox.)</button>
        </div>
        <div style="font-size:11px;color:var(--text-3);margin-top:8px;line-height:1.5">
          La cuota contraria se deriva de la del análisis: <strong>1 / (1 + margen − 1/cuota)</strong>. Con 0% sale el espejo teórico sin comisión (irreal); 4–6% es lo típico en un mercado de dos salidas.
          Por defecto solo se invierten los mercados <strong>binarios</strong> (over/under, BTTS, hándicap asiático, ganador sin empate…), donde "lo contrario" es una apuesta que existía de verdad. Un 1X2 con empate, un marcador exacto o un parlay no tienen contraria única: quedan fuera salvo que actives la casilla.
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:12px">
      <div class="card-title">Filtros <span style="font-weight:500;color:var(--text-3);font-size:11px">(vacío = todo)</span></div>
      ${deportes.length ? `<div class="bt-flbl">Deporte</div><div class="bt-chips">${depChips}</div>` : ""}
      ${tipos.length ? `<div class="bt-flbl">Tipo de apuesta</div><div class="bt-chips">${tipoChips}</div>` : ""}
      <div class="bt-flbl">Día de la semana</div><div class="bt-chips">${diaChips}</div>
      <div class="bt-form" style="margin-top:12px">
        <label class="bt-field"><span>Cuota mínima</span><input class="bt-input" type="text" inputmode="decimal" placeholder="ej. 1.50" data-bt-input="cuota_min" value="${esc(_bt.cuota_min)}"></label>
        <label class="bt-field"><span>Cuota máxima</span><input class="bt-input" type="text" inputmode="decimal" placeholder="ej. 2.50" data-bt-input="cuota_max" value="${esc(_bt.cuota_max)}"></label>
        <label class="bt-field"><span>Desde</span><input class="bt-input" type="date" data-bt-input="date_from" value="${esc(_bt.date_from)}"></label>
        <label class="bt-field"><span>Hasta</span><input class="bt-input" type="date" data-bt-input="date_to" value="${esc(_bt.date_to)}"></label>
      </div>
    </div>

    <div class="bt-actions">
      <button class="bt-run" data-action="bt-run">Simular</button>
      <button class="bt-reset" data-action="bt-reset">Limpiar</button>
    </div>

    <div id="btResults">${_bt.res ? btRenderResults() : ""}</div>

    <button class="bt-search-btn" data-action="bt-search">Buscar el mejor filtro automáticamente</button>
    <div id="btSearchNota" class="bt-alert bt-alert-muted" style="${_bt.contra ? "" : "display:none"}">El buscador rankea filtros por su rendimiento <strong>a favor</strong>. Al pulsar "Aplicar" con el modo En contra activo, el simulador correrá ese filtro <strong>en contra</strong>.</div>
    <div id="btSearch">${_bt.search ? btRenderSearch() : ""}</div>`;
    }

    /* ── Cara a cara "a favor vs en contra" (INV-BIZ-25) ──────────────────────
       El bot devuelve `directo` = la MISMA simulación siguiendo al tipster sobre
       exactamente el mismo conjunto de apuestas invertibles, así que la
       comparación es manzana con manzana. Aditivo: sin `directo` no se pinta. ── */
    function btRenderCaraACara() {
      const r = _bt.res, d = _bt.dir;
      if (!r || !d || !r.contrario?.activo) return "";
      const col = n => (n >= 0 ? "var(--win)" : "var(--loss)");
      const gana = r.neto > d.neto ? "en contra" : (d.neto > r.neto ? "a favor" : "empate");
      const veredicto = gana === "empate"
        ? "Ambos lados acaban igual."
        : (gana === "en contra"
          ? `Con este subconjunto, <strong>ir en contra habría rendido más</strong> (${fmts(r.neto - d.neto)} de diferencia).`
          : `Con este subconjunto, <strong>seguir los análisis habría rendido más</strong> (${fmts(d.neto - r.neto)} de diferencia).`);
      return `
    <div class="card" style="margin-bottom:12px">
      <div class="card-title">A favor vs en contra <span style="font-weight:500;color:var(--text-3);font-size:11px">(mismas ${r.n_apuestas} apuestas)</span></div>
      <div class="bt-cmp" style="margin-bottom:0">
        <div class="bt-cmp-row"><span>Siguiendo los análisis</span><strong style="color:${col(d.neto)}">${fmts(d.neto)} · ${fmtp(d.roi)} ROI · WR ${fmtp(d.winrate * 100)}</strong></div>
        <div class="bt-cmp-row"><span>Apostando en contra</span><strong style="color:${col(r.neto)}">${fmts(r.neto)} · ${fmtp(r.roi)} ROI · WR ${fmtp(r.winrate * 100)}</strong></div>
      </div>
      <div style="font-size:11px;color:var(--text-3);margin-top:10px;line-height:1.5">
        ${veredicto} Los dos netos <strong>no</strong> son opuestos exactos: la casa se queda su margen (${fmtp(r.contrario.margen_pct)}) en cada lado, así que la suma de ambos es negativa. Ese es justo el motivo por el que fadear a un tipster perdedor no es dinero gratis.
      </div>
    </div>`;
    }

    function btRenderResults() {
      const r = _bt.res, b = _bt.base;
      if (!r) return "";
      const wrPct = (r.winrate * 100), wlow = (r.wilson_low * 100), whigh = (r.wilson_high * 100);
      const netoCls = r.neto >= 0 ? "var(--win)" : "var(--loss)";

      let avisos = "";
      if (r.quiebra) {
        const fq = r.fecha_quiebra ? ` el ${esc(r.fecha_quiebra)}` : "";
        const om = r.apuestas_omitidas
          ? ` <strong>${r.apuestas_omitidas} apuesta(s) posteriores —incluidas las nuevas— no se simularon.</strong>`
          : "";
        avisos += `<div class="bt-alert bt-alert-red"><strong>Quiebra${fq}:</strong> el bank llegó a 0u y la simulación se detuvo ahí.${om} Sube el bank inicial o baja el stake para recorrer el historial completo.</div>`;
      }
      if (r.stake_insostenible) {
        const fc = r.fecha_corte ? ` el ${esc(r.fecha_corte)}` : "";
        const om = r.apuestas_omitidas
          ? ` <strong>${r.apuestas_omitidas} apuesta(s) posteriores no se simularon.</strong>`
          : "";
        avisos += `<div class="bt-alert bt-alert-red"><strong>Monto fijo insostenible${fc}:</strong> el bank cayó a ${fmt(r.bank_final)}, por debajo del monto fijo de ${fmt(parseFloat(_bt.stake_valor) || 0)} por apuesta. No puedes seguir apostando ese monto, así que la simulación se detuvo ahí.${om} Baja el monto fijo o sube el bank inicial.</div>`;
      }
      if (!r.muestra_suficiente) {
        avisos += `<div class="bt-alert bt-alert-amber"><strong>Muestra baja</strong> (${r.n_resueltas} apuestas resueltas &lt; 30). El ROI y el winrate de este subconjunto son <strong>orientativos</strong>: filtrar el pasado buscando lo que "habría funcionado" es <em>data-mining</em> y no garantiza resultados futuros.</div>`;
      }
      if (r.excluidas_sin_cuota > 0) {
        avisos += `<div class="bt-alert bt-alert-muted">${r.excluidas_sin_cuota} apuesta(s) sin cuota válida quedaron fuera (no se puede recalcular su ganancia).</div>`;
      }
      // Modo "en contra" (INV-BIZ-25): qué se invirtió y qué quedó fuera. El bot
      // manda `contrario` en cada resultado; se tolera ausente (bot sin desplegar).
      const ct = r.contrario;
      const fade = !!(ct && ct.activo);
      if (fade) {
        const fuera = [];
        if (ct.descartadas_no_binarias) fuera.push(`${ct.descartadas_no_binarias} de mercado no binario (1X2 con empate, marcador exacto, parlay…)`);
        if (ct.descartadas_sin_contraria) fuera.push(`${ct.descartadas_sin_contraria} sin contraria apostable (cuota demasiado alta)`);
        avisos += `<div class="bt-alert bt-alert-muted"><strong>Apostando en contra</strong> de ${ct.invertidas} análisis, con un margen de casa del ${fmtp(ct.margen_pct)}: cuota media ${(ct.cuota_media_original ?? 0).toFixed(2)} en el pick original → <strong>${(ct.cuota_media_contraria ?? 0).toFixed(2)}</strong> en la contraria.${fuera.length ? ` Quedaron fuera ${fuera.join(" y ")}.` : ""}${ct.no_binarias_incluidas ? ` <strong>${ct.no_binarias_incluidas}</strong> no binaria(s) se invirtieron igualmente (aproximación).` : ""}</div>`;
      }

      const cmpLbl = fade ? ["En contra (tu filtro)", "En contra (todo el historial)"] : ["Con tu filtro", "Apostando todo"];
      const cmp = b ? `
    <div class="bt-cmp">
      <div class="bt-cmp-row"><span>${cmpLbl[0]}</span><strong style="color:${r.neto >= 0 ? "var(--win)" : "var(--loss)"}">${fmts(r.neto)} · ${fmtp(r.roi)} ROI</strong></div>
      <div class="bt-cmp-row"><span>${cmpLbl[1]}</span><strong style="color:${b.neto >= 0 ? "var(--win)" : "var(--loss)"}">${fmts(b.neto)} · ${fmtp(b.roi)} ROI</strong></div>
    </div>` : "";

      return `
    ${btRenderCaraACara()}
    <div class="card" style="margin-bottom:12px">
      <div class="capital-hero" style="padding:6px 0 10px">
        <div class="capital-label">${fade ? "Bank final apostando EN CONTRA" : "Bank final"} (desde ${fmt(r.bank_inicial)})</div>
        <div class="capital-amount" style="color:${netoCls}">${fmt(r.bank_final)}</div>
        <div class="capital-sub" style="color:${netoCls}">${fmts(r.neto)} neto · ${fmtp(r.roi)} ROI</div>
      </div>
      ${avisos}
      <div class="cap-grid" style="margin-top:6px">
        <div class="cap-stat"><div class="cap-stat-val">${r.n_apuestas}</div><div class="cap-stat-lbl">Apuestas simuladas</div></div>
        <div class="cap-stat"><div class="cap-stat-val">${fmtp(wrPct)}</div><div class="cap-stat-lbl">Winrate (${r.wins}-${r.losses})</div></div>
        <div class="cap-stat"><div class="cap-stat-val red">${fmt(r.drawdown_max)}</div><div class="cap-stat-lbl">Drawdown máx (${fmtp(r.drawdown_pct)})</div></div>
        <div class="cap-stat"><div class="cap-stat-val red">${r.racha_max_perdedora}</div><div class="cap-stat-lbl">Peor racha perdedora</div></div>
        ${r.capital_simultaneo_max != null ? `<div class="cap-stat"><div class="cap-stat-val">${fmt(r.capital_simultaneo_max)}</div><div class="cap-stat-lbl">Capital máx. en simultáneo</div></div>` : ""}
        ${r.simultaneas_max != null ? `<div class="cap-stat"><div class="cap-stat-val">${r.simultaneas_max}</div><div class="cap-stat-lbl">Apuestas vivas a la vez (máx)</div></div>` : ""}
      </div>
      <div style="font-size:11px;color:var(--text-3);margin-top:8px;text-align:center">Winrate real entre ${fmtp(wlow)} y ${fmtp(whigh)} (IC 95% de Wilson)</div>
      ${r.capital_simultaneo_max != null ? `<div style="font-size:11px;color:var(--text-3);margin-top:6px;text-align:center"><strong>Capital máx. en simultáneo</strong>: el dinero máximo que necesitaste tener disponible a la vez (apuestas vivas al mismo tiempo, desde que registras hasta que se resuelve el partido) para cubrir esta simulación con ese staking.</div>` : ""}
    </div>

    ${cmp}

    ${btRenderMensual()}

    <div class="card">
      <div class="card-title">Evolución del bank</div>
      <div class="chart-wrap-tall"><canvas id="chartBt"></canvas></div>
    </div>`;
    }

    /* ── Neto por mes + pico neto (high-water) de la simulación — consume los
       campos aditivos pico_neto/desglose_mensual/mejor_mes/peor_mes de
       /api/backtest (INV-BIZ-14). Presentación pura: reusa las clases nm- y
       capital- existentes (sin CSS nuevo), todo por esc(), sin eventos inline.
       Tolera la ausencia de los campos (bot sin desplegar) → "". ── */
    const _BT_MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    function btMesLbl(m) {
      if (!m || m === "—") return "Sin fecha";
      const [y, mo] = String(m).split("-");
      const i = parseInt(mo, 10) - 1;
      return (_BT_MES[i] || mo) + " " + y;
    }
    function btRenderMensual() {
      const r = _bt.res;
      if (!r || !Array.isArray(r.desglose_mensual) || !r.desglose_mensual.length) return "";
      const col = n => (Number(n) >= 0 ? "var(--win)" : "var(--loss)");
      const mm = r.mejor_mes, pm = r.peor_mes;

      const cards = r.desglose_mensual.map(d => `
      <div class="nm-card">
        <div class="nm-card-head">
          <span class="nm-mes">${esc(btMesLbl(d.mes))}</span>
          <span class="nm-neto ${d.pico_neto_mes >= 0 ? "pos" : "neg"}">${fmts(d.pico_neto_mes)}<small class="nm-neto-tag">pico</small></span>
        </div>
        <div class="nm-dims">
          <span class="nm-dim">P/L mes <b style="color:${col(d.pl)}">${fmts(d.pl)}</b></span>
          <span class="nm-dim">Cierre <b style="color:${col(d.neto_fin)}">${fmts(d.neto_fin)}</b></span>
          <span class="nm-dim">${d.n} bet${d.n !== 1 ? "s" : ""}</span>
        </div>
      </div>`).join("");

      const hero = `
      <div class="capital-hero" style="padding:6px 0 10px">
        <div class="capital-label">Máximo neto alcanzado${r.pico_neto_fecha ? ` (${esc(r.pico_neto_fecha)})` : ""}</div>
        <div class="capital-amount" style="color:${col(r.pico_neto)}">${fmts(r.pico_neto)}</div>
        <div class="capital-sub">el punto más alto que tocó el bank en toda la simulación${r.pico_neto_i ? ` · apuesta #${r.pico_neto_i}` : ""}</div>
      </div>`;

      const resumen = `
      <div class="nm-resumen">
        <div class="nm-stat">
          <span class="nm-stat-k">Mejor mes (por pico)</span>
          <span class="nm-stat-v ${mm && mm.pico_neto_mes >= 0 ? "pos" : ""}">${mm ? esc(btMesLbl(mm.mes)) + " · " + fmts(mm.pico_neto_mes) : "—"}</span>
        </div>
        <div class="nm-stat">
          <span class="nm-stat-k">Peor mes (por P/L)</span>
          <span class="nm-stat-v ${pm && pm.pl >= 0 ? "pos" : "neg"}">${pm ? esc(btMesLbl(pm.mes)) + " · " + fmts(pm.pl) : "—"}</span>
        </div>
      </div>`;

      return `
    <div class="card" style="margin-bottom:12px">
      <div class="card-title">Neto por mes <span style="font-weight:500;color:var(--text-3);font-size:11px">(de esta simulación)</span></div>
      ${hero}
      ${resumen}
      <div class="nm-grid" style="margin-top:10px">${cards}</div>
      <div style="font-size:11px;color:var(--text-3);margin-top:8px;text-align:center"><strong>Pico</strong> = mayor neto acumulado que tocó el bank dentro del mes · <strong>P/L mes</strong> = ganancia/pérdida del propio mes · <strong>Cierre</strong> = neto acumulado al terminar el mes.</div>
    </div>`;
    }

    function makeChartBacktest() {
      const c = document.getElementById("chartBt");
      if (!c || !_bt.res || typeof Chart === "undefined") return;
      destroyChart("bt");
      const fade = !!_bt.res.contrario?.activo;
      const r = _bt.res.curva || [], b = _bt.base ? (_bt.base.curva || []) : [];
      const d = (fade && _bt.dir) ? (_bt.dir.curva || []) : [];
      const n = Math.max(r.length, b.length, d.length);
      const labels = Array.from({ length: n }, (_, i) => i === 0 ? "Inicio" : `#${i}`);
      const datasets = [{
        label: fade ? "En contra (tu filtro)" : "Con filtro", data: r.map(p => p.bank),
        borderColor: cssVar("--accent"), backgroundColor: cFill("--accent"),
        borderWidth: 2, pointRadius: 0, fill: true, tension: 0.25,
      }];
      // En modo fade la curva "a favor" sobre el MISMO set es la comparación útil.
      if (d.length) datasets.push({
        label: "A favor (mismas apuestas)", data: d.map(p => p.bank),
        borderColor: cssVar("--pend"), borderWidth: 2, pointRadius: 0, fill: false, tension: 0.25,
      });
      if (b.length) datasets.push({
        label: fade ? "En contra (todo)" : "Todo el historial", data: b.map(p => p.bank),
        borderColor: cssVar("--text-3"), borderWidth: 1.5, borderDash: [5, 4],
        pointRadius: 0, fill: false, tension: 0.25,
      });
      charts.bt = new Chart(c, {
        type: "line", data: { labels, datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: true, labels: { font: { size: 11, family: CHART_FONT }, boxWidth: 10, padding: 10, color: cssVar("--text-2") } },
            tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` } },
          },
          scales: {
            x: { grid: { display: false }, ticks: { display: false } },
            y: { grid: { color: cssVar("--chart-grid") }, ticks: { callback: axisM, font: { size: 10, family: CHART_FONT }, color: cssVar("--chart-tick") } },
          },
        },
      });
    }

    async function runBacktest() {
      if (_bt.loading) return;
      const bank = parseFloat(_bt.bank_inicial), stake = parseFloat(_bt.stake_valor);
      const errEl = msg => (tg?.showAlert ? tg.showAlert(msg) : alert(msg));
      if (!(bank > 0)) { errEl("El bank inicial debe ser mayor que 0."); return; }
      if (!(stake > 0)) { errEl("El stake debe ser mayor que 0."); return; }
      if (_bt.modo === "porcentaje" && stake > 100) { errEl("En modo %, el stake no puede superar 100%."); return; }
      if (_bt.modo === "fijo" && stake > bank) { errEl("El monto fijo de apuesta no puede ser mayor que el bank inicial."); return; }

      const filtros = {};
      if (_bt.date_from) filtros.date_from = _bt.date_from;
      if (_bt.date_to) filtros.date_to = _bt.date_to;
      if (_bt.sel.dias.size) filtros.dias_semana = [..._bt.sel.dias];
      if (_bt.sel.deportes.size) filtros.deportes = [..._bt.sel.deportes];
      if (_bt.sel.tipos.size) filtros.tipos = [..._bt.sel.tipos];
      const cmin = parseFloat(_bt.cuota_min), cmax = parseFloat(_bt.cuota_max);
      if (!isNaN(cmin)) filtros.cuota_min = cmin;
      if (!isNaN(cmax)) filtros.cuota_max = cmax;

      const payload = { bank_inicial: bank, modo_stake: _bt.modo, stake_valor: stake, filtros };
      if (_bt.contra) {
        const margen = parseFloat(_bt.margen);
        if (isNaN(margen) || margen < 0 || margen > 20) { errEl("El margen de la casa debe estar entre 0 y 20%."); return; }
        payload.contrario = { activo: true, margen_pct: margen, incluir_no_binarias: !!_bt.incluir_nb };
      }
      const btn = document.querySelector("[data-action='bt-run']");
      const orig = btn ? btn.textContent : "";
      _bt.loading = true;
      if (btn) { btn.disabled = true; btn.textContent = "Simulando…"; }
      haptic("light");
      try {
        const resp = await fetch(`${API_URL}/api/backtest`, { method: "POST", headers: apiHeaders(), body: JSON.stringify(payload) });
        const j = await safeJson(resp);
        if (!resp.ok || j.error) throw new Error(j.error || `Error ${resp.status}`);
        _bt.res = j.resultado; _bt.base = j.baseline; _bt.dir = j.directo || null;
        const box = document.getElementById("btResults");
        if (box) box.innerHTML = btRenderResults();
        haptic("success");
        if (!_bt.res.n_apuestas) {
          errEl(_bt.contra
            ? "Ninguna apuesta del filtro admite contraria (mercados no binarios o cuota sin otro lado apostable)."
            : "Ningún resultado coincide con esos filtros.");
        }
        setTimeout(makeChartBacktest, 60);
      } catch (err) {
        haptic("error");
        errEl("" + err.message);
      } finally {
        _bt.loading = false;
        if (btn) { btn.disabled = false; btn.textContent = orig || "Simular"; }
      }
    }

    /* ── Buscador de mejor filtro (barrido server-side, INV-BIZ-15) ── */
    async function runSearch() {
      if (_bt.searching) return;
      const bank = parseFloat(_bt.bank_inicial), stake = parseFloat(_bt.stake_valor);
      const errEl = msg => (tg?.showAlert ? tg.showAlert(msg) : alert(msg));
      if (!(bank > 0)) { errEl("El bank inicial debe ser mayor que 0."); return; }
      if (!(stake > 0)) { errEl("El stake debe ser mayor que 0."); return; }
      if (_bt.modo === "porcentaje" && stake > 100) { errEl("En modo %, el stake no puede superar 100%."); return; }
      if (_bt.modo === "fijo" && stake > bank) { errEl("El monto fijo de apuesta no puede ser mayor que el bank inicial."); return; }

      const payload = { bank_inicial: bank, modo_stake: _bt.modo, stake_valor: stake };
      const btn = document.querySelector("[data-action='bt-search']");
      const orig = btn ? btn.textContent : "";
      _bt.searching = true;
      if (btn) { btn.disabled = true; btn.textContent = "Analizando combinaciones…"; }
      haptic("light");
      try {
        const resp = await fetch(`${API_URL}/api/backtest/search`, { method: "POST", headers: apiHeaders(), body: JSON.stringify(payload) });
        const j = await safeJson(resp);
        if (j.error === "historial_insuficiente") {
          _bt.search = j;
        } else if (j.error) {
          throw new Error(j.error);
        } else {
          _bt.search = j;
        }
        const box = document.getElementById("btSearch");
        if (box) box.innerHTML = btRenderSearch();
        haptic("success");
      } catch (err) {
        haptic("error");
        errEl("" + err.message);
      } finally {
        _bt.searching = false;
        if (btn) { btn.disabled = false; btn.textContent = orig || "Buscar el mejor filtro automáticamente"; }
      }
    }

    function btRenderSearch() {
      const d = _bt.search;
      if (!d) return "";
      if (d.error === "historial_insuficiente") {
        return `<div class="bt-alert bt-alert-amber" style="margin-top:12px"><strong>Historial insuficiente</strong> para el buscador (${d.n_total || 0} apuestas resueltas). Necesitas más datos para partir en train/test y medir significancia. Sigue registrando y vuelve más adelante.</div>`;
      }
      const sp = d.split || {};
      const cands = d.candidatos || [];
      const resumen = `
    <div class="bt-alert bt-alert-muted" style="margin-top:12px">
      Evalué <strong>${d.evaluados}</strong> combinaciones (descarté ${d.descartados_muestra} por muestra &lt; ${d.min_muestra}).
      <strong>${d.robustos}</strong> superan significancia (FDR α=${d.alpha}); <strong>${d.sobreviven_oos}</strong> se mantienen fuera de muestra.
      Descubierto en el ${Math.round((sp.train_frac || 0.7) * 100)}% antiguo (${sp.train_n} bets, hasta ${esc(sp.fecha_corte || "—")}); probado en el ${sp.test_n} más recientes.
      <br><em>Filtrar el pasado es exploración estadística: el rendimiento histórico no garantiza el futuro.</em>
    </div>`;

      if (!cands.length) {
        return resumen + `<div class="empty" style="margin-top:8px">Ningún subconjunto alcanzó la muestra mínima.</div>`;
      }

      const rows = cands.map((c, i) => {
        const badge = c.robusto
          ? `<span class="bt-badge bt-badge-ok">robusto</span>`
          : (c.pasa_fdr ? `<span class="bt-badge bt-badge-warn">FDR sí · IC no</span>` : `<span class="bt-badge bt-badge-muted">no signif.</span>`);
        const trCol = c.roi_train >= 0 ? "var(--win)" : "var(--loss)";
        const teTxt = (c.roi_test == null)
          ? `<span style="color:var(--text-3)">—</span>`
          : `<span style="color:${c.roi_test >= 0 ? "var(--win)" : "var(--loss)"}">${fmtp(c.roi_test)}<small style="color:var(--text-3)"> (${c.n_test})</small></span>`;
        return `
    <div class="bt-cand">
      <div class="bt-cand-top">
        <span class="bt-cand-lbl">${esc(c.label)}</span>${badge}
      </div>
      <div class="bt-cand-metrics">
        <span>n=${c.n}</span>
        <span>WR ${fmtp(c.winrate * 100)}</span>
        <span title="break-even de la cuota media">BE ${fmtp(c.break_even * 100)}</span>
        <span>ROI train <strong style="color:${trCol}">${fmtp(c.roi_train)}</strong></span>
        <span>ROI test ${teTxt}</span>
      </div>
      <button class="bt-cand-apply" data-action="bt-apply" data-bt-idx="${i}">Aplicar este filtro</button>
    </div>`;
      }).join("");

      return resumen + `<div class="bt-cands">${rows}</div>`;
    }

    function btApply(idx) {
      const d = _bt.search;
      if (!d || !d.candidatos || !d.candidatos[idx]) return;
      const f = d.candidatos[idx].filtro || {};
      _bt.sel = { deportes: new Set(f.deportes || []), tipos: new Set(f.tipos || []), dias: new Set(f.dias_semana || []) };
      _bt.cuota_min = f.cuota_min != null ? String(f.cuota_min) : "";
      _bt.cuota_max = f.cuota_max != null ? String(f.cuota_max) : "";
      haptic("select");
      const sec = document.getElementById("backtest");
      if (sec) { sec.innerHTML = renderBacktest(); sec.classList.add("active"); }
      runBacktest();
      const r = document.getElementById("btResults");
      if (r) r.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    /* ── Tab: Compounding Tracker (B9) ── */
    function renderCompounding() {
      if (!DATA?.apuestas?.length) return `<div class="section-header">Compounding <span>Tracker</span></div><div class="empty">Sin apuestas registradas todavía.</div>`;
      const capChip = (val, label) => `<button class="bt-chip${_ct.cap === val ? " active" : ""}" data-ct-cap="${val == null ? "" : val}">${label}</button>`;
      return `<div class="section-header">Compounding <span>Tracker</span></div>
    <div class="explainer" style="margin-bottom:14px">Recorre TODO tu historial real (sin filtros) apostando un % fijo de un bankroll que compone mes a mes, con un tope opcional de unidad máxima. A diferencia del Simulador (what-if con filtros), este siempre usa el historial completo.</div>
    <div class="card" style="margin-bottom:12px">
      <div class="card-title">Parámetros</div>
      <div class="bt-form">
        <label class="bt-field"><span>Bankroll inicial</span>
          <div class="bt-input-wrap"><span class="bt-prefix">u</span><input class="bt-input" type="text" inputmode="decimal" data-ct-input="bank_inicial" value="${esc(_ct.bank_inicial)}"></div>
        </label>
        <label class="bt-field"><span>% de unidad por apuesta</span>
          <div class="bt-input-wrap"><input class="bt-input" type="text" inputmode="decimal" data-ct-input="pct" value="${esc(_ct.pct)}"><span class="bt-prefix">%</span></div>
        </label>
      </div>
      <div class="bt-flbl">Tope de unidad máxima</div>
      <div class="bt-chips">${capChip(500, "500u")}${capChip(1000, "1,000u")}${capChip(2000, "2,000u")}${capChip(null, "Sin tope")}</div>
    </div>
    <div class="bt-actions"><button class="bt-run" data-action="ct-run">${_ct.loading ? "Calculando…" : "Calcular"}</button></div>
    <div id="ctResults">${_ct.res ? ctRenderResults() : ""}</div>`;
    }

    function ctRenderResults() {
      const r = _ct.res;
      if (!r) return "";
      const desglose = r.desglose_mensual || [];
      return `<div class="kpi-row" style="margin-top:12px">
      <div class="kpi"><div class="kpi-label">Bankroll final</div><div class="kpi-value accent">${fmtC(r.bank_final)}</div></div>
      <div class="kpi"><div class="kpi-label">Return</div><div class="kpi-value ${signColor(r.neto)}">${r.bank_inicial > 0 ? (r.neto >= 0 ? "+" : "") + (r.neto / r.bank_inicial * 100).toFixed(1) + "%" : "—"}</div></div>
    </div>
    <div class="card" style="margin:10px 0"><div class="card-title">Evolución del bankroll</div>${chartPlaceholder("chartCompounding", "bt2", true)}</div>
    <div class="card"><div class="card-title">Desglose año/mes</div>
      <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Mes</th><th>Bankroll inicial</th><th>P/L del mes</th><th>Bankroll final</th></tr></thead>
      <tbody>${desglose.map(m => {
        // desglose_mensual (analytics.py:_bt_metricas_neto) no trae bank_ini directo:
        // se deriva del neto acumulado (neto_fin = neto al cierre del mes; neto_fin − pl = neto al inicio).
        const bankIni = r.bank_inicial + (m.neto_fin - m.pl);
        const bankFin = r.bank_inicial + m.neto_fin;
        return `<tr><td>${mesLabel(m.mes)}</td><td class="num">${fmtC(bankIni)}</td><td class="num ${signColor(m.pl)}">${fmts(m.pl)}</td><td class="num">${fmtC(bankFin)}</td></tr>`;
      }).join("")}</tbody>
      </table></div>
    </div>
    ${r.quiebra ? `<div class="bt-alert bt-alert-danger" style="margin-top:10px">El bankroll llegó a 0u el ${esc(r.fecha_quiebra || "")}. La simulación se detuvo ahí.</div>` : ""}`;
    }

    async function runCompounding() {
      if (_ct.loading) return;
      const bank = parseFloat(_ct.bank_inicial), pct = parseFloat(_ct.pct);
      const errEl = msg => (tg?.showAlert ? tg.showAlert(msg) : alert(msg));
      if (!(bank > 0)) { errEl("El bankroll inicial debe ser mayor que 0."); return; }
      if (!(pct > 0) || pct > 100) { errEl("El % de unidad debe estar entre 0 y 100."); return; }
      const payload = { bank_inicial: bank, modo_stake: "porcentaje", stake_valor: pct, filtros: {} };
      if (_ct.cap) payload.stake_cap = _ct.cap;
      const btn = document.querySelector("[data-action='ct-run']");
      const orig = btn ? btn.textContent : "";
      _ct.loading = true;
      if (btn) { btn.disabled = true; btn.textContent = "Calculando…"; }
      haptic("light");
      try {
        const resp = await fetch(`${API_URL}/api/backtest`, { method: "POST", headers: apiHeaders(), body: JSON.stringify(payload) });
        const j = await safeJson(resp);
        if (!resp.ok || j.error) throw new Error(j.error || `Error ${resp.status}`);
        _ct.res = j.resultado;
        const box = document.getElementById("ctResults");
        if (box) box.innerHTML = ctRenderResults();
        haptic("success");
        setTimeout(makeChartCompounding, 60);
      } catch (err) {
        haptic("error");
        errEl("" + err.message);
      } finally {
        _ct.loading = false;
        if (btn) { btn.disabled = false; btn.textContent = orig || "Calcular"; }
      }
    }

    function makeChartCompounding() {
      const c = document.getElementById("chartCompounding");
      const curva = _ct.res?.curva;
      if (!c || !curva?.length) return;
      destroyChart("ct");
      charts.ct = new Chart(c, { type: "line", data: { labels: curva.map(p => `#${p.i}`), datasets: [{ label: "Bankroll", data: curva.map(p => p.bank), borderColor: cssVar("--accent"), backgroundColor: cFill("--accent"), borderWidth: 2, pointRadius: 0, fill: true, tension: 0.2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmtC(ctx.parsed.y) } } }, scales: { x: { grid: { display: false }, ticks: { display: false } }, y: { grid: { color: cssVar("--chart-grid") }, ticks: { callback: axisM, font: { size: 10, family: CHART_FONT }, color: cssVar("--chart-tick") } } } } });
    }

    /* ── Tab: Apuestas ── */
    function renderApuestas() {
      const deportesUnicos = ["Todos", ...new Set(DATA.apuestas.map(a => a.deporte).filter(Boolean))];
      return `<div class="section-header">Historial de apuestas</div>
    <div class="search-wrap"><span class="search-icon">${ico("search")}</span><input class="search-input" placeholder="Buscar por equipo…" data-search-equipo value="${esc(filtroEquipo)}"></div>
    <div class="filter-row">${deportesUnicos.map(d => `<button class="filter-chip ${d === filtroDeporte ? "active" : ""}" data-filtro-deporte="${esc(d)}">${esc(d)}</button>`).join("")}</div>
    <div id="apuestasLista">${renderApuestasList()}</div>`;
    }
    // Wager Log (B8): índice cronológico global (1..N sobre TODAS las apuestas,
    // no solo las filtradas/paginadas) — misma columna "#" que la referencia.
    function _wlIndiceMap() {
      const all = DATA.apuestas.slice().sort((a, b) => {
        const fa = a.fecha_partido || a.fecha || "", fb = b.fecha_partido || b.fecha || "";
        if (fa !== fb) return fa < fb ? -1 : 1;
        return (a.row_id || 0) - (b.row_id || 0);
      });
      const m = new Map();
      all.forEach((a, i) => m.set(a.row_id, i + 1));
      return m;
    }
    function _wlSortValue(a, col) {
      if (col === "fecha") return a.fecha_partido || a.fecha || "";
      if (col === "monto") return a.monto || 0;
      if (col === "cuota") return parseFloat(a.cuota) || 0;
      if (col === "ganancia") return a.ganancia || 0;
      return a.fecha_partido || a.fecha || "";
    }
    // Position: FAV/DOG para Moneyline/Handicap (cuota decimal < 2.0 = favorito,
    // implica >50% de probabilidad); el resto de tipos muestra su categoría
    // (igual que la referencia distingue "TOTAL" como posición).
    function posicionBet(a) {
      const tipo = tipoDe(a);
      const cuota = parseFloat(a.cuota);
      if (tipo === "Moneyline" || tipo === "Handicap") {
        if (!(cuota > 0)) return "—";
        return cuota < 2.0 ? "FAV" : "DOG";
      }
      return tipo;
    }
    function diaSemanaLabel(a) {
      const f = (a.fecha_partido || a.fecha || "").slice(0, 10);
      if (f.length !== 10) return "—";
      const d = new Date(f + "T12:00:00");
      if (isNaN(d)) return "—";
      return ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][d.getDay()];
    }
    function renderApuestasList() {
      const term = filtroEquipo.toLowerCase().trim();
      let filt = DATA.apuestas
        .filter(a => filtroDeporte === "Todos" || a.deporte === filtroDeporte)
        .filter(a => !term || (a.equipo1 || "").toLowerCase().includes(term) || (a.equipo2 || "").toLowerCase().includes(term));
      const momentumActivo = !!filtroMomentumIds;
      if (momentumActivo) filt = filt.filter(a => filtroMomentumIds.has(a.row_id));
      const idxMap = _wlIndiceMap();
      const dir = wlSortDir === "asc" ? 1 : -1;
      const ordenado = filt.slice().sort((a, b) => {
        const va = _wlSortValue(a, wlSortCol), vb = _wlSortValue(b, wlSortCol);
        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
        return 0;
      });
      const filtroBanner = momentumActivo ? `<div class="filter-chip active" style="margin-bottom:8px">Filtrado a picks de Momentum <button data-action="wl-clear-momentum" style="background:none;border:none;color:inherit;margin-left:6px;cursor:pointer">✕</button></div>` : "";
      if (!ordenado.length) return `${filtroBanner}<div class="empty">Sin resultados</div>`;
      const totalPages = Math.max(1, Math.ceil(ordenado.length / WL_PAGE_SIZE));
      if (wlPage > totalPages) wlPage = totalPages;
      if (wlPage < 1) wlPage = 1;
      const pagina = ordenado.slice((wlPage - 1) * WL_PAGE_SIZE, wlPage * WL_PAGE_SIZE);
      // INV-MINI-45: sin scroll horizontal. Móvil = lista agrupada por día (todos los
      // campos del Wager Log en dos líneas); escritorio = tabla compacta de 9 columnas.
      // Ambas se pintan y el CSS muestra la que corresponde (sin JS de viewport).
      const flecha = col => wlSortCol === col ? ico(wlSortDir === "asc" ? "up" : "down", "ico-xs") : "";
      const th = (col, label, cls) => `<th data-wl-sort="${col}"${cls ? ` class="${cls}"` : ""}>${label}${flecha(col)}</th>`;
      const sortChip = (col, label) => `<button class="range-chip ${wlSortCol === col ? "active" : ""}" data-wl-sort="${col}">${label}${flecha(col)}</button>`;
      const filas = pagina.map(a => _wlFila(a, idxMap.get(a.row_id)));
      let lista = "", diaPrev = null;
      filas.forEach(f => {
        if (wlSortCol === "fecha" && f.fecha !== diaPrev) {
          diaPrev = f.fecha;
          lista += `<div class="wl-day">${_wlFechaLarga(f.fecha)}</div>`;
        }
        lista += f.row;
      });
      return `${filtroBanner}<div class="card wlog-card">
      <div class="card-head"><div class="card-title">${ordenado.length} apuesta${ordenado.length !== 1 ? "s" : ""}</div><span class="card-meta">${(wlPage - 1) * WL_PAGE_SIZE + 1}–${Math.min(wlPage * WL_PAGE_SIZE, ordenado.length)}</span></div>
      <div class="wl-sortbar" aria-label="Ordenar por"><div class="range-sel">${sortChip("fecha", "Fecha")}${sortChip("ganancia", "Return")}${sortChip("monto", "Monto")}${sortChip("cuota", "Cuota")}</div></div>
      <div class="wl-list">${lista}</div>
      <div class="wl-table"><table class="data-table wager-log">
      <thead><tr><th class="wl-idx">#</th>${th("fecha", "Fecha")}<th>Partido</th><th>Mercado</th>${th("cuota", "Cuota", "num")}${th("monto", "Monto", "num")}<th class="num">A ganar</th><th>Resultado</th>${th("ganancia", "Return", "num")}</tr></thead>
      <tbody>${filas.map(f => f.tr).join("")}</tbody>
      </table></div>
      <div class="wl-pager">
        <button data-wl-page="-1" aria-label="Página anterior" ${wlPage <= 1 ? "disabled" : ""}>${ico("chevL", "ico-sm")}</button>
        <span>Página ${wlPage} de ${totalPages}</span>
        <button data-wl-page="1" aria-label="Página siguiente" ${wlPage >= totalPages ? "disabled" : ""}>${ico("chevR", "ico-sm")}</button>
      </div>
    </div>`;
    }
    // Una apuesta del Wager Log en sus dos formas (fila de lista móvil y <tr> de escritorio).
    function _wlFila(a, idx) {
      const fecha = (a.fecha_partido || a.fecha || "").slice(0, 10) || "—";
      const esParlay = (a.equipo2 || "").startsWith("PARLAY");
      const partido = esParlay ? `Parlay · ${esc(a.equipo2 || "")}` : `${esc(a.equipo1 || "?")} vs ${esc(a.equipo2 || "?")}`;
      const mercado = esc(formatTipoApuesta(a));
      const pos = posicionBet(a);
      const posTag = (pos === "FAV" || pos === "DOG") ? `<span class="wl-tag">${pos}</span>` : "";
      const cls = a.status === "win" ? "win" : a.status === "loss" ? "loss" : a.status === "void" ? "void" : "pend";
      const estado = { win: "Ganada", loss: "Perdida", void: "Nula" }[a.status] || "Pendiente";
      const pend = !["win", "loss", "void"].includes(a.status);
      const ret = pend ? `<span class="yellow">Pendiente</span>`
        : a.status === "void" ? `<span class="muted">Nula</span>`
        : `<span class="${signColor(a.ganancia)}">${fmts(a.ganancia)}</span>`;
      const aGanar = a.potencial ? fmt(a.potencial) : "—";
      const cuota = a.cuota ? esc(String(a.cuota)) : "—";
      const idxTxt = idx ? `#${idx}` : "";
      const dia = diaSemanaLabel(a);
      const fechaTag = wlSortCol !== "fecha" ? `<span class="wl-tag">${esc(fecha)} · ${dia}</span>` : "";
      const row = `<div class="wl-row">
        <div class="bet-dot ${cls}" title="${estado}" role="img" aria-label="${estado}">${ico(_STATUS_ICO[a.status] || "clock")}</div>
        <div class="wl-main">
          <div class="wl-teams">${partido}</div>
          <div class="wl-meta">${esc(a.liga || a.deporte || "—")} · ${mercado}</div>
          <div class="wl-tags">${idxTxt ? `<span class="wl-tag">${idxTxt}</span>` : ""}${posTag}${fechaTag}</div>
        </div>
        <div class="wl-right">
          <div class="wl-ret">${ret}</div>
          <div class="wl-stake">${fmt(a.monto)} @ ${cuota}</div>
          ${pend && a.potencial ? `<div class="wl-stake">gana ${aGanar}</div>` : ""}
        </div>
      </div>`;
      const tr = `<tr>
        <td class="wl-idx">${idx || "—"}</td>
        <td class="wl-fecha"><div>${_wlFechaCorta(fecha)}</div><div class="wlog-sub">${dia}</div></td>
        <td class="wl-partido"><div class="wl-ellipsis">${partido}</div><div class="wlog-sub wl-ellipsis">${esc(a.liga || a.deporte || "—")}</div></td>
        <td class="wl-mercado"><div class="wl-ellipsis">${mercado}</div><div class="wlog-sub">${esc(pos)}</div></td>
        <td class="num">${cuota}</td><td class="num">${fmt(a.monto)}</td><td class="num muted">${aGanar}</td>
        <td><span class="wl-badge ${cls}">${estado}</span></td>
        <td class="num wl-ret">${pend || a.status === "void" ? `<span class="muted">—</span>` : ret}</td>
      </tr>`;
      return { fecha, row, tr };
    }
    function _wlFechaCorta(f) {
      if (!f || f.length !== 10) return "—";
      const [y, m, d] = f.split("-").map(Number);
      return `${d} ${["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][m - 1]} ${y}`;
    }
    function _wlFechaLarga(f) {
      if (!f || f.length !== 10) return "Sin fecha";
      const [y, m, d] = f.split("-").map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
      const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
      return `${dias[dt.getUTCDay()]} · ${d} ${meses[m - 1]} ${y}`;
    }
    const _RE_SUFIJO_HOME_AWAY = /^((?:Asian\s+Handicap|Handicap|Moneyline|1X2)(?:\s+[+\-]?\d+(?:\.\d+)?)?)\s*-\s*(Home|Away|Draw|Empate|Local|Visitante)\s*$/i;

    function formatTipoApuesta(a) {
      let t = (a?.tipo || "").trim();
      if (!t) return "";

      // 1) Unificar 1X2 → Moneyline.
      t = t.replace(/^1X2\b/i, "Moneyline");

      // 2) Traducir Home/Away/Draw → equipo concreto.
      const m = t.match(_RE_SUFIJO_HOME_AWAY);
      if (!m) return t;

      const base = m[1].trim();
      const sel = m[2].trim().toLowerCase();
      const eq1 = (a.equipo1 || "").trim();
      const eq2 = (a.equipo2 || "").trim();

      if (sel === "home" || sel === "local") return eq1 ? `${base} - ${eq1}` : t;
      if (sel === "away" || sel === "visitante") return eq2 ? `${base} - ${eq2}` : t;
      if ((sel === "draw" || sel === "empate") && /^moneyline/i.test(base))
        return `${base} - Empate`;
      return t;
    }

    // INV-XCUT-20 / INV-MINI-42: EV frente a la referencia (1xBet) del pick, o la nota en gris
    // cuando la referencia no ofrecía la línea del ticket (consenso, solo informativo).
    function _evRefTexto(a) {
      const nom = esc(DATA?.valor_ref?.nombre_ref || "1xBet");
      const pct = n => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;
      if (typeof a.ev_pick === "number") {
        const manual = String(a.ref_pick_fuente || "").toLowerCase().endsWith("_manual");
        return { color: a.ev_pick >= 0 ? "var(--win)" : "var(--loss)",
                 html: `EV vs ${nom}${manual ? " ✍️" : ""} ${pct(a.ev_pick)}` };
      }
      if (String(a.ref_pick_fuente || "").toLowerCase() === "consenso") {
        const ev = typeof a.ev_consenso === "number" ? ` · consenso EV ${pct(a.ev_consenso)}` : "";
        const mejor = a.cuota_mejor ? ` · mejor ${esc(a.casa_mejor || "")} ${esc(String(a.cuota_mejor))}` : "";
        return { color: "var(--text-3)", html: `${nom} no envía esta línea${ev}${mejor}` };
      }
      return null;
    }

    const _STATUS_ICO = { win: "check", loss: "x", void: "minus" };
    function renderBetItem(a) {
      const icon = a.status === "win" ? "win" : a.status === "loss" ? "loss" : a.status === "void" ? "void" : "pend";
      const res = a.status === "win" ? `+${fmt(a.ganancia)}` : a.status === "loss" ? `−${fmt(a.monto)}` : a.status === "void" ? `Nula` : `${fmt(a.potencial)}`;
      const rc = a.status === "win" ? "green" : a.status === "loss" ? "red" : a.status === "void" ? "accent" : "yellow";
      const _stMap = { win: ["Ganada", "win"], loss: ["Perdida", "loss"], void: ["Nula", "void"] };
      const [statusLabel, badgeKey] = _stMap[a.status] || ["Pendiente", "pend"];
      const esParlay = (a.equipo2 || "").startsWith("PARLAY");
      const teamsLabel = esParlay ? `Parlay · ${esc(a.equipo2 || "")}` : `${esc(a.equipo1 || "?")} vs ${esc(a.equipo2 || "?")}`;
      const metaLabel = esParlay ? `${esc(a.deporte)} · Acumulador @ ${esc(a.cuota)} · ${(a.fecha_partido || a.fecha)?.slice(0, 10) || ""}` : `${esc(a.deporte)} · ${esc(formatTipoApuesta(a))} @ ${esc(a.cuota)} · ${(a.fecha_partido || a.fecha)?.slice(0, 10) || ""}`;
      // INV-BIZ-16: patas estructuradas del parlay/combinada. Se muestra cada pick
      // con todos sus datos (antes solo se veía la pata #1 en las columnas planas).
      const legs = Array.isArray(a.legs) ? a.legs : [];
      const legsHtml = legs.length ? `<div class="bet-legs" style="margin-top:5px;font-size:11px;color:var(--text-2);line-height:1.55">${legs.map((p, i) => {
        const teams = (p.equipo1 || p.equipo2) ? `${esc(p.equipo1 || "?")} vs ${esc(p.equipo2 || "?")} · ` : "";
        const ctx = [p.deporte, p.liga].filter(Boolean).map(esc).join(" · ");
        const ctxHtml = ctx ? `<span style="opacity:.7">${ctx} · </span>` : "";
        const cuota = p.cuota ? ` @ ${esc(String(p.cuota))}` : "";
        const cuando = [String(p.fecha_partido || "").slice(0, 10), p.hora_partido].filter(Boolean).map(esc).join(" ");
        const cuandoHtml = cuando ? `<span style="opacity:.6"> · ${cuando}</span>` : "";
        return `<div><b style="opacity:.8">#${i + 1}</b> ${ctxHtml}${teams}${esc(p.tipo_apuesta || "")}${cuota}${cuandoHtml}</div>`;
      }).join("")}</div>` : "";
      // INV-XCUT-16: CLV visible en el listado si la apuesta tiene cierre registrado.
      const clvHtml = (typeof a.clv === "number")
        ? `<div class="bet-meta" style="color:${a.clv >= 0 ? "var(--win)" : "var(--loss)"}">CLV ${a.clv >= 0 ? "+" : ""}${(a.clv * 100).toFixed(1)}%</div>` : "";
      // INV-XCUT-20: EV del ticket frente a la línea justa de la referencia (1xBet) al registrar el pick.
      const evTxt = _evRefTexto(a);
      const evHtml = evTxt ? `<div class="bet-meta" style="color:${evTxt.color}">${evTxt.html}</div>` : "";
      return `<div class="bet-item"><div class="bet-dot ${icon}" title="${statusLabel}" role="img" aria-label="${statusLabel}">${ico(_STATUS_ICO[a.status] || "clock")}</div><div class="bet-info"><div class="bet-teams">${teamsLabel}</div><div class="bet-meta">${metaLabel}</div>${clvHtml}${evHtml}${legsHtml}</div><div class="bet-right"><div class="bet-badge bet-badge-${badgeKey}">${statusLabel}</div><div class="bet-monto">${fmt(a.monto)}</div><div class="bet-result ${rc}">${res}</div></div></div>`;
    }

    /* ── Charts ── */
    function axisM(v) { const a = Math.abs(v); return a >= 1000 ? `${(v / 1000).toFixed(1)}ku` : `${+Number(v).toFixed(2)}u` }
    // Colores de gráfica SIEMPRE desde variables del tema (INV-MINI-16/44): nunca hex fijos.
    const CHART_FONT = "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif";
    function cAlpha(v, a) { return _hexAlpha(cssVar(v) || "#888888", a); }
    // Relleno degradado vertical bajo una línea (se resuelve con el área ya medida).
    function cFill(v) {
      return ctx => {
        const ch = ctx.chart, ar = ch.chartArea;
        if (!ar) return cAlpha(v, 0.1);
        const g = ch.ctx.createLinearGradient(0, ar.top, 0, ar.bottom);
        g.addColorStop(0, cAlpha(v, 0.26));
        g.addColorStop(1, cAlpha(v, 0));
        return g;
      };
    }
    function destroyChart(k) { if (charts[k]) { charts[k].destroy(); delete charts[k]; } }

    function makeChartCumulative() {
      const c = document.getElementById("chartCumulative");
      const ord = apuestasOrdenadas();
      if (!c || !ord.length) return;
      destroyChart("cumulative");
      let acum = 0;
      const data = ord.map(a => { acum += netoDe(a); return +acum.toFixed(2); });
      charts.cumulative = new Chart(c, { type: "line", data: { labels: ord.map((_, i) => `#${i + 1}`), datasets: [{ label: "Ganancia acumulada", data, borderColor: cssVar("--accent"), backgroundColor: cFill("--accent"), borderWidth: 2, pointRadius: 0, fill: true, tension: 0.25 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmts(ctx.parsed.y) } } }, scales: { x: { grid: { display: false }, ticks: { display: false } }, y: { grid: { color: cssVar("--chart-grid") }, ticks: { callback: axisM, font: { size: 10, family: CHART_FONT }, color: cssVar("--chart-tick") } } } } });
    }

    function makeChartMonthlyPL() {
      const c = document.getElementById("chartMonthlyPL");
      if (!c) return;
      destroyChart("monthlypl");
      const datos = monthlyPLVista === "semanal" ? calcSemanal() : DATA.grafica_meses.map(m => ({ periodo: m.mes, neto: m.neto }));
      if (!datos.length) return;
      const labels = datos.map(d => monthlyPLVista === "semanal" ? d.periodo.replace(/^\d{4}-/, "") : mesLabel(d.periodo));
      charts.monthlypl = new Chart(c, { type: "bar", data: { labels, datasets: [{ label: "Net", data: datos.map(d => +d.neto.toFixed(2)), backgroundColor: datos.map(d => d.neto >= 0 ? cAlpha("--win", 0.85) : cAlpha("--loss", 0.85)), borderRadius: 6, borderSkipped: false }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 10, family: CHART_FONT }, color: cssVar("--chart-tick") } }, y: { grid: { color: cssVar("--chart-grid") }, ticks: { callback: axisM, font: { size: 10, family: CHART_FONT }, color: cssVar("--chart-tick") } } } } });
    }

    function makeChartNeto() {
      const c = document.getElementById("chartNeto");
      if (!c || !DATA.grafica_meses.length) return;
      destroyChart("neto");
      let acum = 0;
      charts.neto = new Chart(c, { type: "bar", data: { labels: DATA.grafica_meses.map(m => mesLabel(m.mes)), datasets: [{ label: "Neto acumulado", data: DATA.grafica_meses.map(m => { acum += m.neto; return acum; }), backgroundColor: DATA.grafica_meses.map((_, i, arr) => { let s = 0; arr.slice(0, i + 1).forEach(x => s += x.neto); return s >= 0 ? cAlpha("--win", 0.85) : cAlpha("--loss", 0.85) }), borderRadius: 6, borderSkipped: false }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 10, family: CHART_FONT }, color: cssVar("--chart-tick") } }, y: { grid: { color: cssVar("--chart-grid") }, ticks: { callback: axisM, font: { size: 10, family: CHART_FONT }, color: cssVar("--chart-tick") } } } } });
    }

    function makeChartMeses() {
      const c = document.getElementById("chartMeses");
      if (!c || !DATA.grafica_meses.length) return;
      destroyChart("meses");
      charts.meses = new Chart(c, { type: "bar", data: { labels: DATA.grafica_meses.map(m => mesLabel(m.mes)), datasets: [{ label: "Apostado", data: DATA.grafica_meses.map(m => m.apostado), backgroundColor: cAlpha("--chart-tick", 0.45), borderRadius: 4, borderSkipped: false }, { label: "Ganado", data: DATA.grafica_meses.map(m => m.ganado), backgroundColor: cAlpha("--accent", 0.9), borderRadius: 4, borderSkipped: false }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, labels: { font: { size: 11, family: CHART_FONT }, boxWidth: 10, padding: 10, color: cssVar("--text-2") } } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 10, family: CHART_FONT }, color: cssVar("--chart-tick") } }, y: { grid: { color: cssVar("--chart-grid") }, ticks: { callback: axisM, font: { size: 10, family: CHART_FONT }, color: cssVar("--chart-tick") } } } } });
    }

    function makeChartDep() {
      const c = document.getElementById("chartDep");
      if (!c || !DATA.deportes.length) return;
      destroyChart("dep");
      const deps = [...DATA.deportes].sort((a, b) => b.roi - a.roi);
      charts.dep = new Chart(c, { type: "bar", data: { labels: deps.map(d => d.nombre), datasets: [{ label: "ROI %", data: deps.map(d => parseFloat(d.roi.toFixed(1))), backgroundColor: deps.map(d => d.roi >= 0 ? cAlpha("--win", 0.85) : cAlpha("--loss", 0.85)), borderRadius: 6, borderSkipped: false }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 10, family: CHART_FONT }, color: cssVar("--chart-tick") } }, y: { grid: { color: cssVar("--chart-grid") }, ticks: { callback: v => `${v}%`, font: { size: 10, family: CHART_FONT }, color: cssVar("--chart-tick") } } } } });
    }

    function makeChartTipo() {
      const c = document.getElementById("chartTipo");
      if (!c) return;
      destroyChart("tipo");
      const tipos = calcRoiPorTipo();
      if (!tipos.length) return;
      charts.tipo = new Chart(c, { type: "bar", data: { labels: tipos.map(t => t.tipo), datasets: [{ label: "ROI %", data: tipos.map(t => parseFloat(t.roi.toFixed(1))), backgroundColor: tipos.map(t => t.roi >= 0 ? cAlpha("--win", 0.85) : cAlpha("--loss", 0.85)), borderRadius: 6, borderSkipped: false }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 10, family: CHART_FONT }, color: cssVar("--chart-tick") } }, y: { grid: { color: cssVar("--chart-grid") }, ticks: { callback: v => `${v}%`, font: { size: 10, family: CHART_FONT }, color: cssVar("--chart-tick") } } } } });
    }

    function makeChartRolling() {
      const c = document.getElementById("chartRolling");
      if (!c) return;
      destroyChart("rolling");
      const all = calcRolling(20);
      if (!all.length) return;
      const points = rollingShow >= 9999 ? all : all.slice(-rollingShow);
      charts.rolling = new Chart(c, { type: "line", data: { labels: points.map(p => `#${p.i + 1}`), datasets: [{ label: "ROI rodante", data: points.map(p => parseFloat(p.roi.toFixed(2))), borderColor: cssVar("--accent"), backgroundColor: cFill("--accent"), borderWidth: 2, pointRadius: 0, fill: true, tension: 0.3 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.parsed.y >= 0 ? "+" : ""}${ctx.parsed.y.toFixed(1)}%` } } }, scales: { x: { grid: { display: false }, ticks: { display: false } }, y: { grid: { color: cssVar("--chart-grid") }, ticks: { callback: v => `${v >= 0 ? "+" : ""}${v}%`, font: { size: 10, family: CHART_FONT }, color: cssVar("--chart-tick") }, afterDataLimits: scale => { const pad = Math.abs(scale.max - scale.min) * 0.15; scale.max += pad; scale.min -= pad; } } } } });
    }

    function initCharts() {
      if (!DATA || typeof Chart === "undefined") return;
      if (_noBlur && window.innerWidth < 768) return; // en Linux/tdesktop los charts son lazy (botón manual) en móvil
      Chart.defaults.color = cssVar("--chart-tick");
      Chart.defaults.borderColor = cssVar("--chart-grid");
      Chart.defaults.font.family = CHART_FONT;
      Chart.defaults.font.size = 11;
      try {
        Chart.defaults.scale.border.display = false;
        Chart.defaults.scale.ticks.maxRotation = 0;
        Chart.defaults.scale.ticks.autoSkipPadding = 14;
      } catch (_) {}
      Chart.defaults.elements.line.borderCapStyle = "round";
      Chart.defaults.elements.point.hoverRadius = 4;
      Chart.defaults.elements.point.hoverBorderWidth = 2;
      // Tooltips táctiles temáticos (se activan al tocar la gráfica en móvil).
      Chart.defaults.plugins.tooltip.backgroundColor = cssVar("--card2");
      Chart.defaults.plugins.tooltip.titleColor = cssVar("--text-2");
      Chart.defaults.plugins.tooltip.bodyColor = cssVar("--text");
      Chart.defaults.plugins.tooltip.borderColor = cssVar("--border");
      Chart.defaults.plugins.tooltip.borderWidth = 1;
      Chart.defaults.plugins.tooltip.padding = 12;
      Chart.defaults.plugins.tooltip.cornerRadius = 12;
      Chart.defaults.plugins.tooltip.boxPadding = 4;
      Chart.defaults.plugins.tooltip.titleFont = { weight: "500", size: 11 };
      Chart.defaults.plugins.tooltip.bodyFont = { weight: "600", size: 13 };
      Chart.defaults.plugins.legend.labels.usePointStyle = true;
      Chart.defaults.plugins.legend.labels.pointStyle = "circle";
      Chart.defaults.interaction = { mode: "index", intersect: false };
      if (tabActual === "resumen") { makeChartCumulative(); makeChartMonthlyPL(); makeChartNeto(); makeChartMeses(); }
      if (tabActual === "deportes") { makeChartDep(); }
      if (tabActual === "tipos") { makeChartTipoMix(); makeChartTipo(); }
      if (tabActual === "rolling") { makeChartRolling(); }
      if (tabActual === "backtest" && _bt.res) { makeChartBacktest(); }
      if (tabActual === "compounding" && _ct.res) { makeChartCompounding(); }
    }

    /* ── Events ── */
    document.addEventListener("click", e => {
      const chip = e.target.closest("[data-filtro-deporte]");
      if (chip) { filtroDeporte = chip.dataset.filtroDeporte; wlPage = 1; document.querySelectorAll("[data-filtro-deporte]").forEach(c => c.classList.toggle("active", c.dataset.filtroDeporte === filtroDeporte)); const l = document.getElementById("apuestasLista"); if (l) l.innerHTML = renderApuestasList(); return; }
      const rs = e.target.closest("[data-rolling-show]");
      if (rs) { rollingShow = parseInt(rs.dataset.rollingShow, 10); haptic("select"); document.querySelectorAll("[data-rolling-show]").forEach(b => b.classList.toggle("active", b === rs)); destroyChart("rolling"); makeChartRolling(); return; }
      const mplVista = e.target.closest("[data-monthlypl-vista]");
      if (mplVista) { monthlyPLVista = mplVista.dataset.monthlyplVista; haptic("select"); document.querySelectorAll("[data-monthlypl-vista]").forEach(b => b.classList.toggle("active", b === mplVista)); destroyChart("monthlypl"); makeChartMonthlyPL(); return; }
      // Simulador (backtest): chips de modo de staking y de filtros.
      const btModo = e.target.closest("[data-bt-modo]");
      if (btModo) { btSetModo(btModo.dataset.btModo); return; }
      const btLado = e.target.closest("[data-bt-lado]");
      if (btLado) { btSetLado(btLado.dataset.btLado); return; }
      const btNB = e.target.closest("[data-bt-nb]");
      if (btNB) { btToggleNB(); return; }
      const btChip = e.target.closest("[data-bt-toggle]");
      if (btChip) { btToggle(btChip.dataset.btToggle, btChip.dataset.btValue); return; }
      const ctCap = e.target.closest("[data-ct-cap]");
      if (ctCap) { _ct.cap = ctCap.dataset.ctCap === "" ? null : parseInt(ctCap.dataset.ctCap, 10); haptic("select"); document.querySelectorAll("[data-ct-cap]").forEach(b => b.classList.toggle("active", b === ctCap)); return; }
      const ctRun = e.target.closest("[data-action='ct-run']");
      if (ctRun) { runCompounding(); return; }
      const momFiltrar = e.target.closest("[data-action='momentum-filtrar']");
      if (momFiltrar) {
        const m = calcMomentum(momentumN, momentumTipo);
        filtroMomentumIds = new Set(m.picks.map(p => p.row_id));
        wlPage = 1;
        haptic("select");
        showGroup("historial"); showTab("apuestas");
        return;
      }
      const wlClear = e.target.closest("[data-action='wl-clear-momentum']");
      if (wlClear) { filtroMomentumIds = null; wlPage = 1; const l = document.getElementById("apuestasLista"); if (l) l.innerHTML = renderApuestasList(); return; }
      const wlPrev = e.target.closest("[data-wl-page]");
      if (wlPrev) {
        wlPage += parseInt(wlPrev.dataset.wlPage, 10);
        const l = document.getElementById("apuestasLista");
        if (l) {
          l.innerHTML = renderApuestasList();
          // Al cambiar de página, volver al inicio de la lista (no quedarse al pie).
          const y = l.getBoundingClientRect().top + window.scrollY - 80;
          if (window.scrollY > y) window.scrollTo({ top: y, behavior: "smooth" });
        }
        return;
      }
      const wlSort = e.target.closest("[data-wl-sort]");
      if (wlSort) {
        const col = wlSort.dataset.wlSort;
        if (wlSortCol === col) wlSortDir = wlSortDir === "asc" ? "desc" : "asc";
        else { wlSortCol = col; wlSortDir = "desc"; }
        wlPage = 1;
        const l = document.getElementById("apuestasLista"); if (l) l.innerHTML = renderApuestasList();
        return;
      }

      const grp = e.target.closest("[data-group]");
      if (grp) { showGroup(grp.dataset.group); return; }
      const sub = e.target.closest("[data-section]");
      if (sub) { haptic("select"); showTab(sub.dataset.section); return; }
      const advOpen = e.target.closest("[data-advanced]");
      if (advOpen) { openAdvanced(advOpen.dataset.advanced || null); return; }
      const advClose = e.target.closest("[data-advanced-close]");
      if (advClose) { closeAdvanced(); return; }
      const mes = e.target.closest("[data-mes-dir]");
      if (mes) { cambiarMes(parseInt(mes.dataset.mesDir, 10)); return; }
      const mesCal = e.target.closest("[data-mescal-dir]");
      if (mesCal) { haptic("select"); cambiarMesCal(parseInt(mesCal.dataset.mescalDir, 10)); return; }
      const calDay = e.target.closest("[data-cal-day]");
      if (calDay) { haptic("select"); calSelectDay(calDay.dataset.calDay); return; }

      const actEl = e.target.closest("[data-action]");
      const act = actEl?.dataset.action;
      
      if (e.target.id === "mOverlay") { closeModal(); return; }
      
      if (act) {
        if (act === "logout") { logout(); return; }
        if (act === "recargar") { recargar(); return; }
        if (act === "new-bet") { openModal(null); return; }
        if (act === "edit-bet") { openModal(parseInt(actEl.dataset.rowid, 10)); return; }
        if (act === "delete-bet") { confirmDel(parseInt(actEl.dataset.rowid, 10), actEl.dataset.label); return; }
        if (act === "close-modal") { closeModal(); return; }
        if (act === "open-unidad") { openUnidadModal(); return; }
        if (act === "save-unidad") { saveUnidad(); return; }
        if (act === "trigger-upload") { document.getElementById("uInput").click(); return; }
        if (act === "add-parlay-pick") { addParlayPick(); return; }
        if (act === "calc-cuota") { calcCuotaAuto(); return; }
        if (act === "set-fecha-now") { setFechaNow(); return; }
        if (act === "submit-bet") { submitBet(); return; }
        if (act === "remove-parlay-pick") { removeParlayPick(parseInt(actEl.dataset.idx, 10)); return; }
        if (act === "load-lazy-chart") { loadLazyChart(actEl.dataset.canvasId, actEl.dataset.makeKey); return; }
        if (act === "retry-patrones") { fetchPatrones(false); return; }
        if (act === "force-patrones") { fetchPatrones(true); return; }
        if (act === "share-card") { shareCard(); return; }
        if (act === "bt-run") { runBacktest(); return; }
        if (act === "bt-reset") { btReset(); return; }
        if (act === "bt-search") { runSearch(); return; }
        if (act === "bt-apply") { btApply(parseInt(actEl.dataset.btIdx, 10)); return; }
        if (act === "load-more-bets") { _gListLimit += 40; const l = document.getElementById("gLista"); if (l) l.innerHTML = renderGLista(); return; }
      }
    });
    document.addEventListener("input", e => {
      const el = e.target.closest("[data-search-equipo]");
      if (el) { filtroEquipo = el.value; wlPage = 1; const l = document.getElementById("apuestasLista"); if (l) l.innerHTML = renderApuestasList(); return; }

      const gEl = e.target.closest("[data-search-equipo-gestion]");
      if (gEl) { filtroEquipoGestion = gEl.value; _gListLimit = 40; const l = document.getElementById("gLista"); if (l) l.innerHTML = renderGLista(); return; }

      const pInput = e.target.closest("[data-parlay-idx]");
      if (pInput) {
        const idx = parseInt(pInput.dataset.parlayIdx, 10);
        const field = pInput.dataset.parlayField;
        if (_parlayPicks[idx]) {
          _parlayPicks[idx][field] = pInput.value;
          if (field === "cuota") calcCuotaAuto();
        }
      }
      
      if (e.target.id === "mCuotaTotal") {
        const msg = document.getElementById("cuotaAutoMsg");
        if (msg) msg.style.display = "none";
      }

      if (e.target.closest("[data-unidad-input]")) { _syncUnidadPreview(); return; }

      const btIn = e.target.closest("[data-bt-input]");
      if (btIn) {
        const k = btIn.dataset.btInput;
        // Normaliza el separador decimal (coma→punto) en los campos numéricos del
        // simulador para que el teclado en locale ES (móvil/Telegram) y el de
        // escritorio manden EXACTAMENTE el mismo payload. Inocuo en date_from/date_to
        // (formato YYYY-MM-DD, sin comas). Los inputs son type="text" inputmode="decimal"
        // a propósito: type="number" descartaba "1,50" dejando .value vacío.
        _bt[k] = btIn.value.replace(/,/g, ".");
        return;
      }
      const ctIn = e.target.closest("[data-ct-input]");
      if (ctIn) { _ct[ctIn.dataset.ctInput] = ctIn.value.replace(/,/g, "."); return; }
    });
    document.addEventListener("change", e => {
      const el = e.target.closest("#mEsParlay");
      if (el) { toggleParlay(el.checked); return; }

      const mN = e.target.closest("[data-momentum-n]");
      if (mN) { momentumN = parseInt(mN.value, 10); actualizarMomentum(); return; }
      const mT = e.target.closest("[data-momentum-tipo]");
      if (mT) { momentumTipo = mT.value; actualizarMomentum(); return; }

      const uEl = e.target.closest("[data-action='upload-image']");
      if (uEl && uEl.files?.length) { analyzeTicket(uEl.files[0]); }
    });
    // INV-MINI-13: drag&drop por delegación global (sin eventos inline en el HTML).
    document.addEventListener("dragover", e => {
      const z = e.target.closest("[data-dropzone]");
      if (z) { e.preventDefault(); z.classList.add("drag"); }
    });
    document.addEventListener("dragleave", e => {
      const z = e.target.closest("[data-dropzone]");
      if (z) { z.classList.remove("drag"); }
    });
    document.addEventListener("drop", e => {
      const z = e.target.closest("[data-dropzone]");
      if (z) { handleDrop(e); }
    });

    const _ALWAYS_RERENDER = new Set(["apuestas", "mes", "calendario", "gestion", "patrones", "backtest", "compounding"]);

    /* ── Sub-navegación (segmented control) del grupo activo o de la vista "Más" ── */
    function renderSubNav() {
      const el = document.getElementById("subNav");
      if (!el) return;
      let chips;
      if (_inAdvanced) {
        chips = `<button class="sub-chip sub-back" data-advanced-close>${ico("chevL")}Volver</button>`
          + ADVANCED.map(s => `<button class="sub-chip" data-section="${s}">${SECTION_LABELS[s]}</button>`).join("");
      } else {
        const g = NAV_GROUPS.find(x => x.id === currentGroup) || NAV_GROUPS[0];
        chips = g.sections.map(s => `<button class="sub-chip" data-section="${s}">${SECTION_LABELS[s]}</button>`).join("");
        if (g.more) chips += `<button class="sub-chip sub-more" data-advanced>Más análisis${ico("chevR")}</button>`;
      }
      el.innerHTML = chips;
      el.style.display = el.querySelectorAll(".sub-chip").length > 1 ? "flex" : "none";
      el.querySelectorAll(".sub-chip[data-section]").forEach(c =>
        c.classList.toggle("active", c.dataset.section === tabActual));
    }
    function showGroup(groupId) {
      const g = NAV_GROUPS.find(x => x.id === groupId);
      if (!g) return;
      haptic("light");
      showTab(g.sections[0]);
    }
    function openAdvanced(section) { haptic("light"); showTab(section || ADVANCED[0]); }
    function closeAdvanced() {
      haptic("light");
      const g = NAV_GROUPS.find(x => x.id === currentGroup) || NAV_GROUPS[0];
      showTab(g.sections[0]);
    }

    function showTab(id) {
      // Liberar canvases del tab anterior antes de cambiar
      if (tabActual === "resumen") { destroyChart("neto"); destroyChart("meses"); }
      if (tabActual === "deportes") { destroyChart("dep"); }
      if (tabActual === "tipos") { destroyChart("tipo"); }
      if (tabActual === "rolling") { destroyChart("rolling"); }
      if (tabActual === "backtest") { destroyChart("bt"); }
      if (tabActual === "compounding") { destroyChart("ct"); }
      // Sincronizar grupo / sub-vista avanzada según la sección destino
      if (ADVANCED.includes(id)) {
        if (!_inAdvanced) { _inAdvanced = true; try { tg?.BackButton?.show(); } catch (_) {} }
      } else {
        const g = groupOf(id);
        if (g) currentGroup = g.id;
        if (_inAdvanced) { _inAdvanced = false; try { tg?.BackButton?.hide(); } catch (_) {} }
      }
      document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
      const sec = document.getElementById(id);
      if (sec) {
        if (_RENDER_FNS[id] && (!_renderedSections.has(id) || _ALWAYS_RERENDER.has(id))) {
          sec.innerHTML = _RENDER_FNS[id]();
          _renderedSections.add(id);
        }
        sec.classList.add("active");
      }
      tabActual = id;
      // Estado activo de la nav inferior (ningún grupo activo dentro de "Más")
      document.querySelectorAll(".nav-item").forEach(t =>
        t.classList.toggle("active", !_inAdvanced && t.dataset.group === currentGroup));
      renderSubNav();
      setTimeout(initCharts, 80);
    }

    async function recargar() {
      if (cargando) return;
      cargando = true;
      document.getElementById("app").innerHTML = `<div class="loader"><div class="loader-logo">Bet<span>Stats</span></div><div class="loader-bar"><div class="loader-bar-fill"></div></div><p>Actualizando...</p></div>`;
      const nav = document.getElementById("bottomNav");
      if (nav) nav.style.display = "none";
      // No borramos el análisis IA guardado: persiste entre recargas y sesiones.
      // El usuario pide uno nuevo con "⚡ Nuevo análisis" cuando lo necesite; la
      // fecha de "Generado:" deja claro a qué historial corresponde.
      _patronesData = null;
      _patronesPeekDone = false;   // un refresh completo vuelve a reconciliar con el bot
      try { await cargarDatos(); } finally { cargando = false; }
    }

    /* ── Compartir imagen: descarga la tarjeta PNG del bot (/api/share-card,
       misma imagen que el botón de Telegram) y la comparte con Web Share API
       (fallback a descarga). El render vive 100% en el bot (INV-MINI-02). ── */
    let _sharing = false;
    async function shareCard() {
      if (_sharing) return;
      _sharing = true;
      const btn = document.querySelector("[data-action='share-card']");
      const txt = btn ? btn.innerHTML : "";
      if (btn) { btn.disabled = true; btn.textContent = "Generando…"; }
      haptic("select");
      // Aviso visible dentro Y fuera de Telegram: tg.showAlert es un NO-OP cuando la app
      // no corre dentro del cliente Telegram (el SDK del CDN crea window.Telegram.WebApp
      // igual, pero sin cliente que reciba el postMessage) → usar alert() real ahí.
      const notify = (m) => (tg?.initData && tg.showAlert) ? tg.showAlert(m) : alert(m);
      // Descarga directa del PNG (camino fiable en escritorio y fallback universal).
      const descargar = (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "resumen-apuestas.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        haptic("success");
      };
      try {
        const res = await fetch(`${API_URL}/api/share-card`, { headers: apiHeaders() });
        if (!res.ok) {
          notify(res.status === 404 ? "Aún no hay datos para compartir."
               : res.status === 401 ? "Sesión expirada. Vuelve a iniciar sesión para compartir."
               : "No se pudo generar la imagen.");
          return;
        }
        const blob = await res.blob();
        const file = new File([blob], "resumen-apuestas.png", { type: "image/png" });
        // 1) Web Share API con archivo SOLO si el cliente puede compartir archivos
        //    Y estamos en un contexto táctil/Telegram. En escritorio el share se intenta
        //    tras el await del fetch, lo que suele invalidar el user-gesture (NotAllowedError);
        //    por eso ahí vamos directo a la descarga, que es lo que el usuario espera.
        const puedeCompartirArchivo = !!(navigator.canShare && navigator.canShare({ files: [file] }));
        const esTactil = !!(tg?.initData) || (navigator.maxTouchPoints > 0);
        if (puedeCompartirArchivo && esTactil) {
          try {
            await navigator.share({ files: [file], title: "Mis estadísticas", text: "Mi resumen de apuestas 📊" });
            haptic("success");
            return;
          } catch (err) {
            if (err && err.name === "AbortError") return;  // el usuario canceló
            // si share falla por otra razón (gesto expirado, no permitido) → descargamos
          }
        }
        // 2) Fallback / escritorio: descargar el PNG.
        descargar(blob);
      } catch (e) {
        notify("Error de conexión al generar la imagen.");
      } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = txt; }
        _sharing = false;
      }
    }

    /* ════════════════════════════════════════════════════════════════
       TAB GESTIÓN — CRUD completo + análisis de ticket con IA
       ════════════════════════════════════════════════════════════════ */

    let _editRowId = null;
    // Recuerda desde qué pestaña (y, si es el calendario, qué día) se abrió la
    // edición/borrado, para volver ahí en vez de saltar siempre a Gestión.
    let _editReturnTab = "gestion", _editReturnDay = null;
    function _rememberEditOrigin() {
      _editReturnTab = tabActual;
      _editReturnDay = tabActual === "calendario" ? calDiaSel : null;
    }
    function _returnToEditOrigin() {
      showTab(_editReturnTab);
      if (_editReturnTab === "calendario" && _editReturnDay) calSelectDay(_editReturnDay);
    }

    function renderGestion() {
      return `
  <div class="section-header">Gestión de apuestas</div>

  <div class="g-toolbar">
    <button class="btn-add" data-action="new-bet">${ico("plus", "ico-sm")}Nueva apuesta</button>
    <button class="btn-unidad" data-action="open-unidad" title="Cuánto dinero vale 1 unidad">${ico("coins", "ico-sm")}1u = ${esc(fmtEq(1).replace("≈ ", ""))}</button>
    <span class="g-count">${DATA?.apuestas?.length ?? 0} registradas</span>
  </div>

  <div class="search-wrap"><span class="search-icon">${ico("search")}</span><input class="search-input" placeholder="Buscar por equipo…" data-search-equipo-gestion value="${esc(filtroEquipoGestion)}"></div>

  <div id="gLista">${renderGLista()}</div>`;
    }

    // Todo bet trae `row_id` (id de Postgres); el fallback posicional (i+1) solo
    // cubre datos legacy sin ese campo. Misma convención usada por openModal().
    function _rowIdOf(a, i) { return a.row_id ?? (i + 1); }
    function _findApuestaByRowId(rowId) {
      if (!DATA?.apuestas) return null;
      return DATA.apuestas.find((a, i) => _rowIdOf(a, i) === rowId) || null;
    }

    function _gListaFiltrada() {
      const term = filtroEquipoGestion.toLowerCase().trim();
      const filt = !term ? DATA.apuestas : DATA.apuestas.filter(a => (a.equipo1 || "").toLowerCase().includes(term) || (a.equipo2 || "").toLowerCase().includes(term));
      return [...filt].reverse();
    }

    // Tarjeta de gestión (editar/eliminar) reutilizada por la pestaña Gestión y
    // por el detalle de día del Calendario (INV-MINI-31).
    function renderGCard(a) {
      const rowId = _rowIdOf(a, DATA.apuestas.indexOf(a));
      const stCls = a.status === "win" ? "win" : a.status === "loss" ? "loss" : a.status === "void" ? "void" : "pend";
      const stLbl = { win: "Ganada", loss: "Perdida", void: "Nula" }[a.status] || "Pendiente";
      const gStr = a.status === "win" ? ` · <span class="green">+${fmt(a.ganancia)}</span>` : a.status === "loss" ? ` · <span class="red">−${fmt(a.monto)}</span>` : "";
      // INV-XCUT-16: CLV visible en la tarjeta si la apuesta tiene cierre registrado.
      const clvStr = (typeof a.clv === "number")
        ? ` · <span style="color:${a.clv >= 0 ? "var(--win)" : "var(--loss)"}">CLV ${a.clv >= 0 ? "+" : ""}${(a.clv * 100).toFixed(1)}%</span>` : "";
      const evTxtG = _evRefTexto(a);
      const evStr = evTxtG ? ` · <span style="color:${evTxtG.color}">${evTxtG.html}</span>` : "";
      return `<div class="g-card">
      <div class="g-card-head">
        <div class="g-main">
          <div class="bet-dot ${stCls}" title="${stLbl}" role="img" aria-label="${stLbl}">${ico(_STATUS_ICO[a.status] || "clock")}</div>
          <div style="min-width:0">
            <div class="g-teams">${esc(a.equipo1)} vs ${esc(a.equipo2)}</div>
            <div class="g-meta">${esc(a.deporte || "")}${a.deporte ? " · " : ""}${esc(a.tipo || "")} @ ${esc(String(a.cuota || ""))} · ${fmt(a.monto)}${gStr}${a.fecha_partido ? " · " + esc(a.fecha_partido) : ""}${clvStr}${evStr}</div>
          </div>
        </div>
        <div class="g-actions">
          <button class="btn-edit" data-action="edit-bet" data-rowid="${rowId}" aria-label="Editar" title="Editar">${ico("edit")}</button>
          <button class="btn-del"  data-action="delete-bet" data-rowid="${rowId}" data-label="${esc(a.equipo1)} vs ${esc(a.equipo2)}" aria-label="Eliminar" title="Eliminar">${ico("trash")}</button>
        </div>
      </div>
    </div>`;
    }

    function renderGLista() {
      if (!DATA?.apuestas?.length) return '<div class="empty">Sin apuestas registradas</div>';
      const lista = _gListaFiltrada();
      if (!lista.length) return '<div class="empty">Sin resultados</div>';
      const visibles = lista.slice(0, _gListLimit);
      const cards = visibles.map(renderGCard).join("");
      const more = lista.length > visibles.length
        ? `<button class="retry-btn ghost" data-action="load-more-bets" style="width:100%;margin-top:8px">Cargar más · ${lista.length - visibles.length} restantes</button>`
        : "";
      return cards + more;
    }

    /* ── Viewport helper ── */
    function getVH() {
      if (tg?.viewportStableHeight && tg.viewportStableHeight > 100) return tg.viewportStableHeight;
      if (window.visualViewport) return window.visualViewport.height;
      return window.innerHeight;
    }

    /* ── Ajusta el sheet cuando el teclado abre/cierra ── */
    function syncModalToViewport() {
      const sheet = document.getElementById("mSheet");
      if (!sheet) return;
      // En desktop (≥768px) el CSS ya maneja max-height con min(88vh,700px); no sobreescribir.
      if (window.matchMedia("(min-width:768px)").matches) return;
      const vh = window.visualViewport ? window.visualViewport.height : getVH();
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 72;
      sheet.style.maxHeight = Math.floor((vh - navH) * 0.94) + "px";
    }

    // ── MainButton nativo de Telegram para la acción primaria del modal ──
    // Si está disponible, sustituye al botón propio (que queda como fallback fuera
    // de Telegram). Ambos disparan submitBet().
    let _mainBtnHandler = null;
    function _setupMainButton(text) {
      const mb = tg?.MainButton;
      // Fuera del cliente de Telegram, telegram-web-app.js igual crea el objeto
      // MainButton, pero .show() no dibuja nada. Gating por initData (real Telegram)
      // para no ocultar el botón del formulario en navegador/web-session.
      if (!mb || !tg?.initData) return; // sin Telegram real: se conserva el botón del formulario
      const inForm = document.getElementById("mSubmitBtn");
      if (inForm) inForm.style.display = "none";
      mb.setText(text);
      if (_mainBtnHandler) { try { mb.offClick(_mainBtnHandler); } catch (_) {} }
      _mainBtnHandler = () => submitBet();
      mb.onClick(_mainBtnHandler);
      try { mb.enable(); mb.hideProgress(); } catch (_) {}
      mb.show();
    }
    function _teardownMainButton() {
      const mb = tg?.MainButton;
      if (!mb) return;
      try { mb.hideProgress(); } catch (_) {}
      if (_mainBtnHandler) { try { mb.offClick(_mainBtnHandler); } catch (_) {} _mainBtnHandler = null; }
      mb.hide();
    }
    function openModal(rowId) {
      _editRowId = rowId;
      _rememberEditOrigin();
      const a = (rowId !== null) ? (_findApuestaByRowId(rowId) || {}) : {};
      const v = {
        eq1: a.equipo1 || "", eq2: a.equipo2 || "", tipo: a.tipo || "", cuota: a.cuota || "",
        monto: a.monto || "", dep: a.deporte || "", liga: a.liga || "",
        fecha: a.fecha_partido || "",
        hora: a.hora_partido || "",
        status: a.status || "pending",
      };
      
      document.getElementById("gModal").innerHTML = `
  <div class="m-overlay" id="mOverlay">
    <div class="m-sheet" id="mSheet" style="max-height:${window.matchMedia('(min-width:768px)').matches ? '' : '' + Math.floor((getVH() - 72) * 0.94) + 'px'}">
      <div class="m-handle"></div>
      <div class="m-head">
        <div class="m-title">
          <span>${rowId === null ? "Nueva apuesta" : "Editar apuesta"}</span>
          <button class="m-close" data-action="close-modal">✕</button>
        </div>
      </div>
      <div class="m-body">
        ${rowId === null ? `
        <div class="u-zone" id="uZone"
             data-action="trigger-upload"
             data-dropzone>
          <div class="u-icon">${ico("image")}</div>
          <div class="u-text">Foto del ticket → auto-rellena el formulario</div>
          <div class="u-sub">Toca o arrastra la imagen</div>
        </div>
        <input id="uInput" type="file" accept="image/*" style="display:none" data-action="upload-image">
        <div class="u-analyzing" id="uAn">Analizando con IA…</div>`: ""}

        <!-- Toggle Parlay (solo en creación nueva) -->
        ${rowId === null ? `
        <div class="m-group" style="display:flex;align-items:center;gap:10px;margin-top:8px">
          <label class="m-label" style="margin:0;flex:1">Es Parlay / Acumulador</label>
          <label style="position:relative;display:inline-block;width:44px;height:24px">
            <input type="checkbox" id="mEsParlay"
                   style="opacity:0;width:0;height:0">
            <span id="parlaySlider" style="
              position:absolute;cursor:pointer;inset:0;border-radius:24px;
              background:var(--border);transition:.3s;
            "></span>
            <span id="parlayThumb" style="
              position:absolute;top:3px;left:3px;width:18px;height:18px;
              border-radius:50%;background:#fff;transition:.3s;
            "></span>
          </label>
        </div>`: ""}

        <!-- Campos apuesta simple (ocultos en modo parlay) -->
        <div id="simpleFields">
          <div class="m-row">
            <div class="m-group"><label class="m-label">Equipo 1</label><input id="mEq1" class="m-input" value="${esc(v.eq1)}" placeholder="Real Madrid"></div>
            <div class="m-group"><label class="m-label">Equipo 2</label><input id="mEq2" class="m-input" value="${esc(v.eq2)}" placeholder="Barcelona"></div>
          </div>
          <div class="m-group"><label class="m-label">Tipo de apuesta</label><input id="mTipo" class="m-input" value="${esc(v.tipo)}" placeholder="moneyline, handicap, total over 2.5, corners total over 9.5…"></div>
          <div class="m-row">
            <div class="m-group"><label class="m-label">Cuota</label><input id="mCuota" class="m-input" type="number" step="0.01" value="${esc(String(v.cuota))}" placeholder="1.85"></div>
            <div class="m-group"><label class="m-label">Unidades <span class="m-hint">(1u = ${esc(fmtEq(1).replace("≈ ", ""))})</span></label><input id="mMonto" class="m-input" type="number" step="0.01" min="0" value="${esc(String(v.monto))}" placeholder="1"></div>
          </div>
        </div>

        <!-- Sección Parlay (visible solo en modo parlay) -->
        <div id="parlaySection" style="display:none">
          <div class="m-group" style="background:var(--surface-2,#1e2235);border-radius:10px;padding:10px">
            <div style="font-size:12px;color:var(--accent);font-weight:700;margin-bottom:8px">PICKS DEL PARLAY</div>
            <div id="picksContainer"></div>
            <button data-action="add-parlay-pick"
                    style="width:100%;margin-top:8px;padding:8px;border:1px dashed var(--accent);
                           border-radius:8px;background:transparent;color:var(--accent);
                           font-size:13px;cursor:pointer">
              Agregar pick
            </button>
          </div>
          <div class="m-row" style="margin-top:8px">
            <div class="m-group">
              <label class="m-label">Cuota total</label>
              <div style="display:flex;gap:6px;align-items:center">
                <input id="mCuotaTotal" class="m-input" type="number" step="0.001" placeholder="Auto" style="flex:1">
                <button data-action="calc-cuota"
                        style="padding:8px 10px;border-radius:8px;background:var(--accent);
                               color:#fff;border:none;cursor:pointer;white-space:nowrap;font-size:12px">
                  Calcular
                </button>
              </div>
              <div id="cuotaAutoMsg" style="font-size:11px;color:var(--text-2);margin-top:4px;display:none"></div>
            </div>
            <div class="m-group"><label class="m-label">Unidades <span class="m-hint">(1u = ${esc(fmtEq(1).replace("≈ ", ""))})</span></label><input id="mMonto" class="m-input" type="number" step="0.01" min="0" value="${esc(String(v.monto))}" placeholder="1"></div>
          </div>
        </div>

        <!-- Campos comunes (deporte, liga, fecha, hora) -->
        <div class="m-row">
          <div class="m-group"><label class="m-label">Deporte</label><input id="mDep" class="m-input" value="${esc(v.dep)}" placeholder="Football…"></div>
          <div class="m-group"><label class="m-label">Liga</label><input id="mLiga" class="m-input" value="${esc(v.liga)}" placeholder="Opcional"></div>
        </div>
        <div class="m-group">
          <label class="m-label">Fecha del partido</label>
          <div class="m-date-row">
            <button class="m-now-btn" data-action="set-fecha-now">Ahora</button>
            <input id="mFecha" class="m-input" type="date" value="${esc(v.fecha)}" style="flex:1">
          </div>
          <input id="mHora" class="m-input" type="time" value="${esc(v.hora)}" style="margin-top:6px">
          <input id="mNotas" type="hidden" value="">
        </div>
        <div class="m-group">
          <label class="m-label">Notas (opcional)</label>
          <input id="mNotasVisible" class="m-input" value="" placeholder="Notas adicionales…">
        </div>
        ${rowId !== null ? `
        <div class="m-group"><label class="m-label">Resultado</label>
          <select id="mStatus" class="m-input">
            <option value="pending" ${v.status === "pending" ? "selected" : ""}>Pendiente</option>
            <option value="win"     ${v.status === "win" ? "selected" : ""}>Win</option>
            <option value="loss"    ${v.status === "loss" ? "selected" : ""}>Loss</option>
            <option value="void"    ${v.status === "void" ? "selected" : ""}>Void</option>
          </select></div>`: ""}
      </div>
      <div class="m-foot">
        <div class="m-err" id="mErr"></div>
        <button class="m-submit" id="mSubmitBtn" data-action="submit-bet">${rowId === null ? "Registrar apuesta" : "Guardar cambios"}</button>
      </div>
    </div>
  </div>`;
      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", syncModalToViewport);
        window.visualViewport.addEventListener("scroll", syncModalToViewport);
      }
      syncModalToViewport();
      _setupMainButton(rowId === null ? "Registrar apuesta" : "Guardar cambios");
    }

    // archivo: index.html
    function closeModal() {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", syncModalToViewport);
        window.visualViewport.removeEventListener("scroll", syncModalToViewport);
      }
      _teardownMainButton();
      document.getElementById("gModal").innerHTML = "";
      _editRowId = null;
      _parlayPicks = [];  // ← limpiar picks al cerrar
      _ocrCombinadaPicks = [];
    }

    /* ── Valor de la unidad (INV-MINI-43 / INV-XCUT-22) ──
       Todo se lleva en unidades; aquí el owner fija cuánto dinero es 1u en ESTE canal.
       "Recalcular" convierte el historial (monto ÷ valor nuevo); "Mantener" deja las
       unidades ya registradas y solo las apuestas nuevas usan el valor nuevo. */
    function openUnidadModal() {
      if (!_isAuthed()) return;
      const u = unidad();
      const neto = DATA?.resumen?.neto;
      document.getElementById("gModal").innerHTML = `
  <div class="m-overlay" id="mOverlay">
    <div class="m-sheet">
      <div class="m-handle"></div>
      <div class="m-head"><div class="m-title"><span>Valor de la unidad</span>
        <button class="m-close" data-action="close-modal">✕</button></div></div>
      <div class="m-body">
        <p class="unit-help">Las estadísticas de este canal se llevan en <b>unidades</b>. Aquí defines cuánto dinero es 1u: se usa para convertir el importe de los tickets y para mostrar el equivalente en dinero.</p>
        <div class="m-group"><label class="m-label">1 unidad = (${esc(u.moneda)})</label>
          <input id="uValor" class="m-input" type="text" inputmode="decimal" value="${esc(String(u.valor))}" data-unidad-input></div>
        <div class="m-group">
          <label class="unit-opt"><input type="radio" name="uModo" value="reescalar" checked data-unidad-input>
            <span><b>Recalcular el historial</b> — cada apuesta pasa a monto ÷ valor nuevo. El dinero que representa no cambia.</span></label>
          <label class="unit-opt"><input type="radio" name="uModo" value="mantener" data-unidad-input>
            <span><b>Mantener las unidades registradas</b> — solo las apuestas nuevas usan el valor nuevo.</span></label>
        </div>
        <div class="unit-preview" id="uPreview">${_unidadPreview(u.valor, true, neto)}</div>
      </div>
      <div class="m-foot">
        <div class="m-err" id="mErr"></div>
        <button class="m-submit" id="uSaveBtn" data-action="save-unidad">Guardar</button>
      </div>
    </div>
  </div>`;
    }
    function _unidadPreview(valorNuevo, reescalar, neto) {
      const u = unidad(), v = parseFloat(String(valorNuevo).replace(",", "."));
      if (!(v > 0)) return "Escribe un valor mayor que 0.";
      if (neto == null) return `1u = ${esc(u.moneda)}${v.toLocaleString("es-MX")}`;
      const netoNuevo = reescalar ? neto * Number(u.valor) / v : neto;
      const dinero = Math.round(netoNuevo * v);
      return `Tu neto quedaría en <b>${esc(fmts(netoNuevo))}</b> (≈ ${dinero < 0 ? "−" : "+"}${esc(u.moneda)}${Math.abs(dinero).toLocaleString("es-MX")}).`;
    }
    function _syncUnidadPreview() {
      const el = document.getElementById("uPreview"); if (!el) return;
      const val = document.getElementById("uValor")?.value || "";
      const re = document.querySelector('input[name="uModo"]:checked')?.value !== "mantener";
      el.innerHTML = _unidadPreview(val, re, DATA?.resumen?.neto);
    }
    async function saveUnidad() {
      const raw = (document.getElementById("uValor")?.value || "").trim().replace(",", ".");
      const valor = parseFloat(raw);
      if (!(valor > 0) || !isFinite(valor)) { showErr("El valor debe ser un número mayor que 0."); return; }
      const reescalar = document.querySelector('input[name="uModo"]:checked')?.value !== "mantener";
      const btn = document.getElementById("uSaveBtn");
      if (btn) { btn.disabled = true; btn.textContent = "Guardando…"; }
      try {
        const resp = await fetch(`${API_URL}/api/config/unidad`, {
          method: "PUT", headers: apiHeaders(), body: JSON.stringify({ valor, reescalar_historial: reescalar }),
        });
        const j = await safeJson(resp);
        if (!j.ok) throw new Error(j.error || `Error ${resp.status}`);
        haptic("success");
        closeModal();
        recargar();
      } catch (err) {
        if (btn) { btn.disabled = false; btn.textContent = "Guardar"; }
        showErr("" + err.message);
      }
    }
    // archivo: index.html — funciones del modo Parlay

    let _parlayPicks = [];  // array de picks del parlay actual
    let _ocrCombinadaPicks = [];  // selecciones de una combinada detectada por foto (para enviar como legs)

    function toggleParlay(on) {
      const slider = document.getElementById("parlaySlider");
      const thumb = document.getElementById("parlayThumb");
      if (slider) { slider.style.background = on ? "var(--accent)" : "var(--border)"; }
      if (thumb) { thumb.style.left = on ? "23px" : "3px"; }
      document.getElementById("simpleFields").style.display = on ? "none" : "";
      document.getElementById("parlaySection").style.display = on ? "" : "none";
      if (on && _parlayPicks.length === 0) addParlayPick();
    }

    function addParlayPick() {
      _parlayPicks.push({ equipo1: "", equipo2: "", tipo_apuesta: "", cuota: "", deporte: "", liga: "", fecha_partido: "", hora_partido: "" });
      renderParlayPicks();
    }

    function removeParlayPick(idx) {
      _parlayPicks.splice(idx, 1);
      renderParlayPicks();
    }

    function renderParlayPicks() {
      const container = document.getElementById("picksContainer");
      if (!container) return;
      container.innerHTML = _parlayPicks.map((p, i) => `
    <div style="background:var(--surface,#151929);border-radius:8px;padding:8px;margin-bottom:6px;position:relative">
      <div style="font-size:11px;font-weight:700;color:var(--text-2);margin-bottom:6px">
        Pick #${i + 1}
        ${_parlayPicks.length > 1
          ? `<button data-action="remove-parlay-pick" data-idx="${i}"
                     style="position:absolute;right:8px;top:8px;background:transparent;
                            border:none;color:var(--red,#e05);cursor:pointer;font-size:13px">✕</button>`
          : ""}
      </div>
      <div style="display:flex;gap:6px;margin-bottom:4px">
        <input class="m-input" placeholder="Equipo 1" value="${esc(p.equipo1)}"
               data-parlay-idx="${i}" data-parlay-field="equipo1" style="flex:1;font-size:12px">
        <input class="m-input" placeholder="Equipo 2" value="${esc(p.equipo2)}"
               data-parlay-idx="${i}" data-parlay-field="equipo2" style="flex:1;font-size:12px">
      </div>
      <div style="display:flex;gap:6px">
        <input class="m-input" placeholder="Tipo (moneyline, over 2.5, corners over 9.5…)" value="${esc(p.tipo_apuesta)}"
               data-parlay-idx="${i}" data-parlay-field="tipo_apuesta" style="flex:2;font-size:12px">
        <input class="m-input" placeholder="Cuota" type="number" step="0.01" value="${esc(String(p.cuota))}"
               data-parlay-idx="${i}" data-parlay-field="cuota" style="flex:1;font-size:12px">
      </div>
      <div style="display:flex;gap:6px;margin-top:4px">
        <input class="m-input" placeholder="Deporte" value="${esc(p.deporte || "")}"
               data-parlay-idx="${i}" data-parlay-field="deporte" style="flex:1;font-size:12px">
        <input class="m-input" placeholder="Liga" value="${esc(p.liga || "")}"
               data-parlay-idx="${i}" data-parlay-field="liga" style="flex:1;font-size:12px">
      </div>
      <div style="display:flex;gap:6px;margin-top:4px">
        <input class="m-input" type="date" title="Fecha del partido" value="${esc(p.fecha_partido || "")}"
               data-parlay-idx="${i}" data-parlay-field="fecha_partido" style="flex:1;font-size:12px">
        <input class="m-input" type="time" title="Hora del partido" value="${esc(p.hora_partido || "")}"
               data-parlay-idx="${i}" data-parlay-field="hora_partido" style="flex:1;font-size:12px">
      </div>
    </div>
  `).join("");
    }

    function calcCuotaAuto() {
      const cuotas = _parlayPicks.map(p => parseFloat(p.cuota)).filter(c => c > 0);
      if (cuotas.length < 2) return;
      const total = cuotas.reduce((a, b) => a * b, 1);
      const el = document.getElementById("mCuotaTotal");
      const msg = document.getElementById("cuotaAutoMsg");
      if (el && !el.value) { el.value = total.toFixed(3); }
      if (msg) { msg.textContent = `Calculado: ${total.toFixed(3)} (producto de ${cuotas.length} cuotas)`; msg.style.display = "block"; }
    }
    function setFechaNow() { const n = new Date(); document.getElementById("mFecha").value = n.toISOString().slice(0, 10); document.getElementById("mHora").value = n.toTimeString().slice(0, 5); }

    function handleDrop(e) {
      e.preventDefault(); document.getElementById("uZone").classList.remove("drag");
      const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) analyzeTicket(f);
    }

    // Pre-comprime imagen via canvas. Reduce 5-12MB → <1MB sin pérdida visible para tickets.
    // Re-compresión adaptativa: si el primer preset (1920px q=0.85) excede el umbral,
    // reintenta con presets más agresivos antes de rendirse. Si ningún preset baja
    // del umbral, lanza error local — nunca enviamos un body que el bot rechazaría.
    const _COMPRESS_PRESETS = [
      { maxDim: 1920, quality: 0.85 },
      { maxDim: 1600, quality: 0.75 },
      { maxDim: 1280, quality: 0.70 },
    ];
    // 6MB de blob comprimido. Margen de seguridad bajo el client_max_size=10MB del bot
    // considerando overhead de base64 (×4/3) + envoltura JSON.
    const _MAX_BLOB_BYTES_TO_SEND = 6 * 1024 * 1024;

    async function _compressOnce(file, { maxDim, quality }) {
      const bmp = await createImageBitmap(file).catch(() => null);
      if (!bmp) throw new Error("No se pudo decodificar la imagen");
      let { width: w, height: h } = bmp;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      w = Math.round(w * scale); h = Math.round(h * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bmp, 0, 0, w, h);
      bmp.close?.();
      const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", quality));
      if (!blob) throw new Error("Fallo en compresión");
      return { blob, dim: { w, h } };
    }

    async function compressImage(file) {
      if (!file || !file.size) throw new Error("Archivo vacío");
      let lastBlob = null, lastDim = null, lastPreset = null;
      for (const preset of _COMPRESS_PRESETS) {
        const { blob, dim } = await _compressOnce(file, preset);
        lastBlob = blob; lastDim = dim; lastPreset = preset;
        if (blob.size <= _MAX_BLOB_BYTES_TO_SEND) break;
        console.warn(`[compressImage] preset ${preset.maxDim}px q=${preset.quality} → ${(blob.size / 1024 / 1024).toFixed(2)}MB, reintentando más agresivo`);
      }
      if (lastBlob.size > _MAX_BLOB_BYTES_TO_SEND) {
        throw new Error(`Imagen demasiado grande tras compresión (${(lastBlob.size / 1024 / 1024).toFixed(1)}MB). Recorta el ticket o usa otra captura.`);
      }
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = () => rej(new Error("Error leyendo blob comprimido"));
        r.readAsDataURL(lastBlob);
      });
      return {
        blob: lastBlob,
        b64,
        originalSize: file.size,
        compressedSize: lastBlob.size,
        dim: lastDim,
        preset: lastPreset,
      };
    }

    async function analyzeTicket(file) {
      if (!file) return;
      if (!_isAuthed()) { showErr("Inicia sesión para usar esta función."); return; }
      const an = document.getElementById("uAn"); const uz = document.getElementById("uZone");
      an.style.display = "flex"; uz.style.opacity = "0.5";
      try {
        const { b64, originalSize, compressedSize, dim, preset } = await compressImage(file);
        const mbIn = (originalSize / 1024 / 1024).toFixed(2);
        const mbOut = (compressedSize / 1024 / 1024).toFixed(2);
        console.log(`[analyzeTicket] ${mbIn}MB → ${mbOut}MB · ${dim.w}x${dim.h} · q=${preset.quality}`);
        // Feedback visible: en Telegram WebApp móvil no hay acceso a la consola.
        // Mostramos los tamaños en la zona de upload para diagnóstico inmediato.
        const uTextEl = uz.querySelector(".u-text");
        if (uTextEl) uTextEl.textContent = `Comprimida ${mbIn}→${mbOut}MB · analizando…`;
        const resp = await fetch(`${API_URL}/api/analyze-ticket`, { method: "POST", headers: apiHeaders(), body: JSON.stringify({ image_b64: b64 }) });
        const j = await safeJson(resp);
        if (!j.ok) throw new Error(j.error || "No se detectó ticket");
        const d = j.datos;
        const esParlay    = d.es_parlay && Array.isArray(d.picks) && d.picks.length > 1;
        const esCombinada = d.es_combinada && Array.isArray(d.picks) && d.picks.length > 1;
        _ocrCombinadaPicks = [];  // se rellena abajo si el ticket es una combinada

        if (d.equipo1) document.getElementById("mEq1").value = d.equipo1;
        if (d.equipo2) document.getElementById("mEq2").value = d.equipo2;
        if (d.tipo_apuesta) document.getElementById("mTipo").value = d.tipo_apuesta;
        if (d.cuota) document.getElementById("mCuota").value = d.cuota;
        if (d.monto) document.getElementById("mMonto").value = d.monto;
        if (d.deporte) document.getElementById("mDep").value = d.deporte;
        if (d.liga) document.getElementById("mLiga").value = d.liga;
        if (d.fecha_partido) document.getElementById("mFecha").value = d.fecha_partido;
        if (d.hora_partido) document.getElementById("mHora").value = d.hora_partido;

        const mNotasEl = document.getElementById("mNotas");
        if (mNotasEl) mNotasEl.value = d.notas || "";

        if (esParlay) {
          // Cargar TODAS las patas en el editor de parlay y activar el modo parlay,
          // para que al guardar se registre cada pick con todos sus datos (no solo la #1).
          _parlayPicks = d.picks.map(p => ({
            equipo1: p.equipo1 || "", equipo2: p.equipo2 || "",
            tipo_apuesta: p.tipo_apuesta || "", cuota: String(p.cuota || ""),
            deporte: p.deporte || "", liga: p.liga || "",
            fecha_partido: p.fecha_partido || "", hora_partido: p.hora_partido || "",
          }));
          const chkParlay = document.getElementById("mEsParlay");
          if (chkParlay) chkParlay.checked = true;
          toggleParlay(true);          // muestra parlaySection (no añade pick vacío: ya hay picks)
          renderParlayPicks();
          const ctEl = document.getElementById("mCuotaTotal");
          if (ctEl && d.cuota) ctEl.value = String(d.cuota);   // cuota total del ticket
          const picksHtml = d.picks.map((p, i) =>
            `<div style="font-size:11px;padding:3px 0;border-bottom:1px solid var(--border)">
          <b>#${i + 1}</b> ${esc(p.equipo1 || "?")} vs ${esc(p.equipo2 || "?")}
          <span style="color:var(--text-2)"> | ${esc(p.tipo_apuesta || "")} @ ${esc(String(p.cuota || ""))}</span>
        </div>`
          ).join("");
          uz.innerHTML = `
        <div class="u-icon">${ico("layers")}</div>
        <div class="u-text" style="color:var(--accent);font-weight:700">
          Parlay · ${d.picks.length} picks · Cuota total: ${esc(String(d.cuota || ""))}
        </div>
        <div style="width:100%;margin-top:8px;text-align:left">${picksHtml}</div>
        <div class="u-sub" style="margin-top:6px">Revisa las unidades y guarda ↓</div>`;
        } else if (esCombinada) {
          // Guardar las selecciones para enviarlas como legs al confirmar (mismo partido).
          _ocrCombinadaPicks = d.picks.map(p => ({ tipo_apuesta: p.tipo_apuesta || "" }));
          const sels = d.picks.map(p => esc(p.tipo_apuesta || "?")).join(" + ");
          uz.innerHTML = `
        <div class="u-icon">${ico("link")}</div>
        <div class="u-text" style="color:var(--accent);font-weight:700">
          Combinada · ${d.picks.length} selecciones · Cuota: ${esc(String(d.cuota || ""))}
        </div>
        <div style="width:100%;margin-top:8px;text-align:left;font-size:11px;padding:4px 0">${sels}</div>
        <div class="u-sub" style="margin-top:6px">Revisa las unidades y guarda ↓</div>`;
        } else {
          uz.innerHTML = `<div class="u-icon">${ico("check")}</div><div class="u-text" style="color:var(--win)">Ticket detectado — revisa los campos</div>`;
        }
      } catch (err) { showErr("" + err.message); uz.style.opacity = "1"; }
      finally { an.style.display = "none"; }
    }

    // archivo: index.html
    async function submitBet() {
      if (!_isAuthed()) { showErr("Inicia sesión para usar esta función."); return; }
      const esParlay = document.getElementById("mEsParlay")?.checked || false;
      const monto = document.getElementById("mMonto")?.value.trim();
      const dep = document.getElementById("mDep")?.value.trim();
      const liga = document.getElementById("mLiga")?.value.trim();
      const fecha = document.getElementById("mFecha")?.value.trim();
      const hora = document.getElementById("mHora")?.value.trim();
      const st = document.getElementById("mStatus")?.value || "pending";
      const notasVis = document.getElementById("mNotasVisible")?.value.trim() || "";

      if (!monto) { showErr("Ingresa las unidades apostadas."); return; }
      if (!(parseFloat(monto) > 0)) { showErr("Las unidades deben ser mayores que 0."); return; }

      let payload;

      if (esParlay && _editRowId === null) {
        // ── Validar picks ────────────────────────────────────────────────────────
        // Sync picks desde el DOM (por si el usuario escribió sin disparar oninput)
        document.querySelectorAll("#picksContainer [data-parlay-idx]").forEach(inp => {
          const idx = parseInt(inp.dataset.parlayIdx, 10);
          const field = inp.dataset.parlayField;
          if (_parlayPicks[idx] && field) _parlayPicks[idx][field] = (inp.value || "").trim();
        });

        const validPicks = _parlayPicks.filter(p => p.equipo1 && p.equipo2 && p.tipo_apuesta && p.cuota);
        if (validPicks.length < 2) { showErr("Un parlay necesita al menos 2 picks completos."); return; }

        const cuotaTotal = parseFloat(document.getElementById("mCuotaTotal")?.value) ||
          validPicks.reduce((a, b) => a * parseFloat(b.cuota || 1), 1);

        const notasPicks = validPicks.map((p, i) =>
          `#${i + 1}: ${p.equipo1} vs ${p.equipo2} | ${p.tipo_apuesta} @ ${p.cuota}`
        ).join(" || ");

        const notas = notasVis ? `${notasPicks} || Nota: ${notasVis}` : notasPicks;
        const ganancia = (parseFloat(monto) * cuotaTotal).toFixed(4);   // en u (INV-MINI-43)
        const p0 = validPicks[0];

        payload = {
          equipo1: p0.equipo1,
          equipo2: `PARLAY x${validPicks.length}`,
          tipo_apuesta: "Parlay",
          cuota: String(cuotaTotal.toFixed(3)),
          monto,
          deporte: dep || "Multi",
          liga: liga || "",
          fecha_partido: fecha || "",
          hora_partido: hora || "",
          notas,
          ganancia_potencial: ganancia,
          // INV-BIZ-16: registro estructurado de TODAS las patas (no solo la #1).
          legs: validPicks.map(p => ({
            equipo1: p.equipo1 || "", equipo2: p.equipo2 || "",
            tipo_apuesta: p.tipo_apuesta || "", cuota: p.cuota || "",
            deporte: p.deporte || "", liga: p.liga || "",
            fecha_partido: p.fecha_partido || "", hora_partido: p.hora_partido || "",
          })),
        };

      } else {
        // ── Apuesta simple ───────────────────────────────────────────────────────
        const eq1 = document.getElementById("mEq1")?.value.trim();
        const eq2 = document.getElementById("mEq2")?.value.trim();
        const tipo = document.getElementById("mTipo")?.value.trim();
        const cuota = document.getElementById("mCuota")?.value.trim();
        if (!eq1 || !eq2 || !tipo || !cuota) { showErr("Completa: equipos, tipo y cuota."); return; }

        const notas = document.getElementById("mNotas")?.value || notasVis;
        payload = { equipo1: eq1, equipo2: eq2, tipo_apuesta: tipo, cuota, monto, deporte: dep || "Otro", liga, fecha_partido: fecha, hora_partido: hora, notas };

        // INV-BIZ-16/17: combinada mismo-partido detectada por foto → registrar sus
        // selecciones como legs (los equipos van al nivel superior). Guardado condicional
        // por si el usuario cambió el tipo tras el OCR.
        if (_ocrCombinadaPicks.length && /combinada/i.test(tipo)) {
          payload.legs = _ocrCombinadaPicks.map(p => ({
            equipo1: eq1 || "", equipo2: eq2 || "",
            tipo_apuesta: p.tipo_apuesta || "", cuota: "",
            deporte: dep || "", liga: liga || "",
            fecha_partido: fecha || "", hora_partido: hora || "",
          }));
        }
      }

      const btn = document.getElementById("mSubmitBtn");
      const originalTxt = btn?.textContent || "";
      if (btn) { btn.disabled = true; btn.textContent = "Guardando…"; }
      const mb = tg?.MainButton;
      if (mb) { try { mb.showProgress(); mb.disable(); } catch (_) {} }

      try {
        let resp;
        if (_editRowId === null) {
          resp = await fetch(`${API_URL}/api/bets`, { method: "POST", headers: apiHeaders(), body: JSON.stringify(payload) });
        } else {
          if (st !== "pending") {
            payload.status_final = st.charAt(0).toUpperCase() + st.slice(1);
            const cuotaEdit = parseFloat(document.getElementById("mCuota")?.value || "0");
            const montoEdit = parseFloat(monto || "0");
            if (st === "win") {
              // FIX-GANANCIA: si cuota o monto no son válidos en este momento, no hay
              // forma confiable de calcular el retorno bruto — antes esto mandaba
              // ganancia_real = monto (ganancia $0 silenciosa e incorrecta).
              if (!(cuotaEdit > 0) || !(montoEdit > 0)) {
                if (btn) { btn.disabled = false; btn.textContent = originalTxt; }
                if (mb) { try { mb.hideProgress(); mb.enable(); } catch (_) {} }
                showErr("Completa cuota y unidades válidas antes de marcar como ganada.");
                return;
              }
              // Retorno bruto: unidades × cuota (4 decimales: los importes van en u).
              payload.ganancia_real = String((cuotaEdit * montoEdit).toFixed(4));
            }
            // Convención del sistema (bot.py / postgres.py): loss = -monto, void = 0.
            if (st === "loss") payload.ganancia_real = String((-Math.abs(montoEdit || 0)).toFixed(4));
            if (st === "void") payload.ganancia_real = "0";
          }
          resp = await fetch(`${API_URL}/api/bets/${_editRowId}`, { method: "PUT", headers: apiHeaders(), body: JSON.stringify(payload) });
        }
        const j = await safeJson(resp);
        if (!j.ok) throw new Error(j.error || `Error ${resp.status}`);
        _parlayPicks = [];
        haptic("success");
        closeModal();
        await recargar();
        _returnToEditOrigin();
      } catch (err) {
        haptic("error");
        showErr("" + err.message);
        if (btn) { btn.disabled = false; btn.textContent = originalTxt; }
        if (mb) { try { mb.hideProgress(); mb.enable(); } catch (_) {} }
      }
    }

    function confirmDel(rowId, label) {
      _rememberEditOrigin();
      if (!confirm(`¿Borrar?\n\n${label}\n\nAcción irreversible.`)) return;
      deleteBet(rowId);
    }

    async function deleteBet(rowId) {
      if (!_isAuthed()) { alert("Inicia sesión para usar esta función."); return; }
      try {
        const resp = await fetch(`${API_URL}/api/bets/${rowId}`, { method: "DELETE", headers: apiHeaders() });
        const j = await safeJson(resp);
        if (!j.ok) throw new Error(j.error);
        await recargar();
        _returnToEditOrigin();
      } catch (err) { alert("" + err.message); }
    }

    function showErr(msg) { const el = document.getElementById("mErr"); if (el) { el.textContent = msg; el.style.display = "block"; } }

    cargarDatos();
