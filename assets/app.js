    // FIX: API_URL configurable vía meta tag, fallback al dominio Railway.
    // En el <head>: <meta name="api-url" content="https://...">
    const API_URL = (
      document.querySelector('meta[name="api-url"]')?.content
      || "https://betting-stats-bot-production.up.railway.app"
    );
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
      S("--bg", tp.bg_color);
      S("--surface", tp.secondary_bg_color || tp.bg_color);
      S("--card", tp.section_bg_color || tp.secondary_bg_color || tp.bg_color);
      S("--card2", tp.secondary_bg_color || tp.section_bg_color);
      S("--text", tp.text_color);
      S("--text-2", tp.hint_color || tp.subtitle_text_color);
      const line = dark ? "255,255,255" : "20,28,46";
      root.style.setProperty("--border", `rgba(${line},${dark ? 0.06 : 0.12})`);
      root.style.setProperty("--text-3", `rgba(${line},${dark ? 0.30 : 0.45})`);
      root.style.setProperty("--chart-grid", `rgba(${line},${dark ? 0.06 : 0.10})`);
      root.style.setProperty("--chart-tick", tp.hint_color || (dark ? "#4A5568" : "#6B7A90"));
      // "Chrome" de la app (header + barra inferior): superficie sólida del tema para
      // que texto e iconos de navegación mantengan contraste también en modo claro.
      const chrome = tp.secondary_bg_color || tp.bg_color;
      if (chrome) {
        root.style.setProperty("--header-bg", chrome);
        root.style.setProperty("--nav-bg", chrome);
        root.style.setProperty("--nav-bg-solid", chrome);
      }
      try { tg.setBackgroundColor("bg_color"); } catch (_) {}
      try { tg.setHeaderColor("secondary_bg_color"); } catch (_) {}
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
        if (errEl) errEl.textContent = "⚠️ " + err.message;
      }
    };

    function showLoginScreen() {
      const el = document.getElementById("web-login");
      if (!el) return;
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
        return `<div class="${cls}" id="cwrap-${canvasId}" style="display:flex;align-items:center;justify-content:center;background:var(--card2);border-radius:var(--radius-md)"><button style="background:transparent;border:1px solid var(--border);color:var(--text-2);padding:10px 20px;min-height:44px;display:inline-flex;align-items:center;border-radius:var(--radius-md);font-size:13px;font-weight:600;cursor:pointer" data-action="load-lazy-chart" data-canvas-id="${canvasId}" data-make-key="${makeKey}">📊 Cargar gráfica</button></div>`;
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
    }

    let DATA = null, filtroDeporte = "Todos", filtroEquipo = "";
    let mesActual = null, mesesDisponibles = [];
    let charts = {}, tabActual = "resumen", cargando = false;
    let _renderedSections = new Set();
    // Caché del análisis IA: localStorage (persiste entre cierres/reaperturas de
    // la mini-app en Telegram). sessionStorage NO servía porque Telegram lo borra
    // al cerrar el webview, forzando un análisis nuevo en cada sesión.
    const _PATRONES_LS_KEY = "betstats_patrones_cache";
    let _patronesData = null, _patronesCargando = false;

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
      { id: "resumen",   icon: "🏠", label: "Resumen",   sections: ["resumen", "semana"], more: true },
      { id: "graficas",  icon: "📈", label: "Gráficas",  sections: ["deportes", "tipos", "rolling", "temporal"] },
      { id: "historial", icon: "📋", label: "Historial", sections: ["apuestas", "mes"] },
      { id: "gestion",   icon: "⚙️", label: "Gestión",   sections: ["gestion"] },
    ];
    const ADVANCED = ["kelly", "capital", "patrones"];
    const SECTION_LABELS = {
      resumen: "General", semana: "7 días",
      deportes: "Deportes", tipos: "Tipos", rolling: "Tendencia", temporal: "Timing",
      apuestas: "Bets", mes: "Mes", gestion: "Gestión",
      kelly: "Kelly", capital: "Capital", patrones: "Patrones IA",
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
    const fmt = n => n == null ? "—" : `$${Number(n).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
    const fmtp = n => n == null ? "—" : `${Number(n).toFixed(1)}%`;
    const fmts = n => n == null ? "—" : Number(n) >= 0 ? `+${fmt(n)}` : fmt(n);
    const signColor = n => Number(n) >= 0 ? "green" : "red";
    function mesLabel(m) { if (!m) return "—"; const [y, mo] = m.split("-"); return ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][parseInt(mo, 10) - 1] + " " + y }

    /* ── Fetch ── */
    let _ctrl = null;
    // Caché de /api/stats en sessionStorage (INV-MINI-04: localStorage prohibido,
    // sessionStorage permitido). Permite pintado instantáneo al reabrir sin re-consultar
    // en frío; siempre se refresca en segundo plano.
    const _STATS_CACHE_KEY = "betstats_stats_cache";
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
      const hi = name ? `Hola, ${esc(name)}` : "Hola 👋";
      const refresh = opts && opts.refresh
        ? `<button class="refresh-btn refresh-round" data-action="recargar" aria-label="Recargar">↻</button>`
        : "";
      const logoutBtn = (!tg && _webSession)
        ? `<button data-action="logout" style="background:transparent;border:none;color:var(--text-2);font-size:12px;cursor:pointer;padding:6px 10px;min-height:44px;border-radius:var(--radius-sm)">✕ Salir</button>`
        : "";
      return `<div class="header"><div class="header-inner"><div class="user-block"><div class="avatar">${esc(initial)}</div><div class="greet"><span class="hi">${hi}</span><span class="nm">Bet<span>Stats</span></span></div></div>${refresh}${logoutBtn}</div></div>`;
    }
    function _renderSkeleton() {
      const c = `<div class="skeleton" style="height:86px"></div>`;
      document.getElementById("app").innerHTML = `
    ${_headerHTML({ refresh: false })}
    <div class="content">
      <div class="hero-grid">${c}${c}${c}${c}</div>
      <div class="skeleton" style="height:120px"></div>
      <div class="skeleton" style="height:200px"></div>
    </div>`;
    }
    function _showStaleBanner() {
      const cont = document.querySelector(".content");
      if (!cont || document.getElementById("staleBanner")) return;
      const b = document.createElement("div");
      b.id = "staleBanner";
      b.className = "stale-banner";
      b.innerHTML = `<span>⚠️ Mostrando datos guardados (sin conexión).</span><button data-action="recargar">Reintentar</button>`;
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
          document.getElementById("app").innerHTML = `<div style="padding:20px"><div class="error-box"><p>Sin conexión</p><br><small>${esc(msg)}</small><br><button class="retry-btn" data-action="recargar">↻ Reintentar</button></div></div>`;
        }
      } finally { clearTimeout(timeout); }
    }

    /* ── Analytics helpers (client-side) ── */
    function normalizaTipo(raw) {
      const t = (raw || "").toLowerCase().trim();
      if (!t) return "Otro";
      // Parlay — primero: puede contener "winner", "over", etc. en sus picks
      if (/parlay|combo|acumulad|multi.?bet|\bsgp\b|same.?game/.test(t)) return "Parlay";
      // Combinada mismo partido
      if (/\bcombinad/.test(t)) return "Combinada";
      // Futuro / Outright
      if (/\boutright\b|futures?|to win the|championship|tournament winner|season (wins?|points?|goals?)|award|mvp|heisman|ballon/.test(t)) return "Futuro";
      // Moneyline / Ganador — DNB, to qualify, W1/W2, fight/race winner, MMA
      if (/moneyline|\b1x2\b|\bml\b|ganador|team wins?|\bw[12]\b|\bwinner\b|to win\b|match result|draw no bet|\bdnb\b|to qualify|fight winner|race winner|series winner|method of victory|\bko\b|\btko\b|decision win|round betting|will win/.test(t)) return "Moneyline";
      // Handicap — puck line (NHL), run line (MLB), point spread, AH
      if (/handicap|hcp|\bspread\b|\basian\b|puck line|run line|point spread|european handicap|\beh\b|alt(ernate)? spread/.test(t)) return "Handicap";
      // BTTS
      if (/ambos|btts|both teams to score|\bgg\b|no goal/.test(t)) return "BTTS";
      // Marcador exacto
      if (/correct score|marcador exacto|resultado exacto|exact score/.test(t)) return "Marcador exacto";
      // Props — va ANTES de Total O/U: "Player Points Over 25.5" debe ser Prop, no Total O/U
      if (/\bplayer\b|\bprop\b|anytime (scorer|td|goal|basket|touchd)|first (goal|scorer|td|basket|pitch|serve|touchd)|last (goal|scorer|td|touchd)|to score\b|rushing yards|receiving yards|passing yards|\bassists?\b|\brebounds?\b|strikeouts?\b|home run|top (batsman|bowler|scorer)|fall of wicket|wickets?\b|century\b/.test(t)) return "Props";
      // Total O/U — \b evita "overtime", "overview", etc.
      if (/\bover\b|\bunder\b|\btotal\b|\bo\/u\b|más de|menos de|alt(ernate)? total|\bgames? o\/?u\b|\bsets? o\/?u\b|\bruns? o\/?u\b|half total|1st half total|q[1-4] total/.test(t)) return "Total O/U"; return "Otro";
    }

    function calcRoiPorTipo() {
      const bucket = {};
      DATA.apuestas.filter(a => a.status === "win" || a.status === "loss").forEach(a => {
        const t = normalizaTipo(a.tipo);
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
        if (a.fecha) {
          const dtReg = new Date(a.fecha.replace(" ", "T") + "Z");
          if (!isNaN(dtReg)) {
            const { hour } = toMXParts(dtReg);
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
      return {
        porDia: DIAS.map(d => toStats(d, db[d])).filter(x => x.total > 0),
        porHora: FRANJAS.map(f => toStats(f, hb[f])).filter(x => x.total > 0)
      };
    }

    function calcRolling(ventana = 20) {
      const res = DATA.apuestas.filter(a => a.status === "win" || a.status === "loss");
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
      const f = Math.max(0, Math.min((p * (b + 1) - 1) / b, 0.25));
      const ev = p * b - (1 - p);
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
      apuestas: () => renderApuestas(),
      gestion: () => renderGestion(),
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
      <div id="apuestas" class="section"></div>
      <div id="gestion"  class="section"></div>
    </div>`;
      const nav = document.getElementById("bottomNav");
      nav.style.display = "flex";
      // Sidebar logo — visible solo en desktop (≥768px) vía CSS
      const _sidebarLogo = `<div class="sidebar-logo"><div class="sidebar-logo-icon"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="2.5" y="14" width="4" height="7" rx="1.4" fill="#fff" fill-opacity=".55"/><rect x="10" y="10.5" width="4" height="10.5" rx="1.4" fill="#fff" fill-opacity=".78"/><rect x="17.5" y="6.5" width="4" height="14.5" rx="1.4" fill="#fff"/><path d="M3 10.2L9.2 6.4 13 8.3 20.5 3.4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.8 3.4H20.7V7.1" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="sidebar-logo-text">Bet<span>Stats</span></div></div>`;
      nav.innerHTML = _sidebarLogo + NAV_GROUPS.map(n => `<button class="nav-item" data-group="${n.id}"><span class="nav-icon">${n.icon}</span><span class="nav-label">${n.label}</span></button>`).join("");
      // BackButton nativo: vuelve de la sub-vista "Más análisis" a Resumen.
      if (tg?.BackButton && !_backReady) { tg.BackButton.onClick(() => closeAdvanced()); _backReady = true; }
      const saved = tabActual;
      setTimeout(() => showTab(saved), 0);
    }

    /* ── Tab: Resumen ── */
    function renderResumen() {
      const r = DATA.resumen;
      const wr = ((r.winrate ?? 0)).toFixed(1);
      const rachaHtml = r.racha >= 2 ? `<div class="racha-badge ${r.tipo_racha === "win" ? "racha-win" : "racha-loss"}"><span class="racha-icon">${r.tipo_racha === "win" ? "🔥" : "🧊"}</span>Racha de ${r.racha} ${r.tipo_racha === "win" ? "victorias" : "derrotas"} seguidas</div>` : "";
      // Resumen ejecutivo: 4 métricas clave visibles al abrir, antes del detalle.
      const s = DATA.stats_semana || null;
      const sNeto = s ? s.neto : null;
      const hero = `<div class="hero-grid">
      <div class="hero-card"><div class="hero-label">Neto total</div><div class="hero-value ${signColor(r.neto)}">${fmts(r.neto)}</div></div>
      <div class="hero-card"><div class="hero-label">ROI</div><div class="hero-value ${signColor(r.roi)}">${(r.roi ?? 0) >= 0 ? "+" : ""}${fmtp(r.roi)}</div></div>
      <div class="hero-card"><div class="hero-label">Win rate</div><div class="hero-value">${wr}%</div></div>
      <div class="hero-card"><div class="hero-label">Últimos 7 días</div><div class="hero-value ${sNeto == null ? "" : signColor(sNeto)}">${sNeto == null ? "—" : fmts(sNeto)}</div></div>
    </div>`;
      return `${hero}<div class="section-header">Detalle <span>·</span> Historial</div>
    <div class="stats-grid">
      <div class="stat-card win-card"><div class="stat-value green">${r.wins}</div><div class="stat-label">Ganadas</div></div>
      <div class="stat-card loss-card"><div class="stat-value red">${r.losses}</div><div class="stat-label">Perdidas</div></div>
      <div class="stat-card pend-card"><div class="stat-value yellow">${r.pending}</div><div class="stat-label">Pendientes</div></div>
    </div>
    ${(r.voids ?? 0) > 0 ? `<div class="kpi-row"><div class="kpi"><div class="kpi-label">Nulas (void)</div><div class="kpi-value accent">${r.voids ?? 0}</div></div></div>` : ""}
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">Total apostado</div><div class="kpi-value accent">${fmt(r.apostado)}</div></div>
      <div class="kpi"><div class="kpi-label">Total cobrado</div><div class="kpi-value">${fmt(r.ganado)}</div></div>
    </div>
    ${r.mejor_mes ? `<div class="kpi-row">
      <div class="kpi"><div class="kpi-label">🏆 Mejor mes</div><div class="kpi-value accent">${mesLabel(r.mejor_mes.mes)}</div></div>
      <div class="kpi"><div class="kpi-label">Neto del mes</div><div class="kpi-value ${signColor(r.mejor_mes.neto)}">${fmts(r.mejor_mes.neto)}</div></div>
    </div>` : ""}
    ${rachaHtml}
    <div class="card"><div class="card-title">Win rate — ${wr}%</div>
      <div class="progress-wrap"><div class="progress-labels"><span class="green">${r.wins}W</span><span class="muted">${wr}%</span><span class="red">${r.losses}L</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${wr}%"></div></div></div></div>
    <div class="card"><div class="card-title">Neto acumulado</div>${chartPlaceholder("chartNeto", "neto")}</div>
    <div class="card"><div class="card-title">Apostado vs Ganado</div>${chartPlaceholder("chartMeses", "meses")}</div>`;
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
      <div class="kpi"><div class="kpi-label">Neto</div><div class="kpi-value ${signColor(s.neto)}">${fmts(s.neto)}</div></div>
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
    <button class="mes-nav" data-mes-dir="-1" ${idx <= 0 ? "disabled style='opacity:0.3;cursor:default'" : ""}>‹</button>
    <span class="mes-label" id="mesLabel">${mesLabel(mesActual)}</span>
    <button class="mes-nav" data-mes-dir="1" ${idx >= mesesDisponibles.length - 1 ? "disabled style='opacity:0.3;cursor:default'" : ""}>›</button>
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
      <div class="kpi"><div class="kpi-label">Neto del mes</div><div class="kpi-value ${signColor(neto)}">${fmts(neto)}</div></div>
      <div class="kpi"><div class="kpi-label">ROI</div><div class="kpi-value ${signColor(roi)}">${roi >= 0 ? "+" : ""}${fmtp(roi)}</div></div>
    </div>
    ${_netoMax !== null ? `<div class="kpi-row">
      <div class="kpi"><div class="kpi-label">📈 Pico neto (acum.)</div><div class="kpi-value ${signColor(_netoMax)}">${fmts(_netoMax)}</div><div style="font-size:9px;color:var(--text-2);margin-top:3px">Máx. global alcanzado este mes</div></div>
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

    /* ── Tab: Deportes ── */
    function renderDeportes() {
      const deps = [...DATA.deportes].sort((a, b) => b.roi - a.roi);
      if (!deps.length) return '<div class="empty">Sin datos</div>';
      return `<div class="section-header">ROI por <span>deporte</span></div>
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">🟢 Mejor</div><div class="kpi-value green" style="font-size:14px;margin-top:4px">${esc(deps[0].nombre)}</div><div style="font-family:var(--font-num);font-size:12px;color:var(--win);margin-top:4px">${deps[0].roi >= 0 ? "+" : ""}${fmtp(deps[0].roi)}</div></div>
      <div class="kpi"><div class="kpi-label">🔴 Peor</div><div class="kpi-value red" style="font-size:14px;margin-top:4px">${esc(deps[deps.length - 1].nombre)}</div><div style="font-family:var(--font-num);font-size:12px;color:var(--loss);margin-top:4px">${fmtp(deps[deps.length - 1].roi)}</div></div>
    </div>
    <div class="card"><div class="card-title">ROI comparativo</div>${chartPlaceholder("chartDep", "dep")}</div>
    <div class="card"><div class="card-title">Desglose</div>${deps.map(d => { const total = d.wins + d.losses, wr = total > 0 ? (d.wins / total * 100).toFixed(0) : 0; return `<div class="sport-item"><div><div class="sport-name">${esc(d.nombre)}</div><div class="sport-sub">${d.wins}W·${d.losses}L·${wr}%WR·${fmt(d.apostado)}</div></div><div class="sport-roi ${d.roi >= 0 ? "green" : "red"}">${d.roi >= 0 ? "+" : ""}${fmtp(d.roi)}</div></div>`; }).join("")}</div>`;
    }

    /* ── Tab: Tipos ── */
    function renderTipos() {
      const tipos = calcRoiPorTipo();
      if (!tipos.length) return `<div class="section-header">ROI por <span>tipo de apuesta</span></div><div class="empty">Aún no tienes apuestas resueltas (win/loss) para ver este análisis.</div>`;
      const maxAbsRoi = Math.max(...tipos.map(t => Math.abs(t.roi)), 1);
      const kpisMejorPeor = tipos.length > 1 ? `
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">🏆 Mejor tipo</div><div class="kpi-value green" style="font-size:14px;margin-top:4px">${esc(tipos[0].tipo)}</div><div style="font-family:var(--font-num);font-size:12px;color:var(--win);margin-top:4px">${tipos[0].roi >= 0 ? "+" : ""}${fmtp(tipos[0].roi)}</div></div>
      <div class="kpi"><div class="kpi-label">⚠️ Peor tipo</div><div class="kpi-value red" style="font-size:14px;margin-top:4px">${esc(tipos[tipos.length - 1].tipo)}</div><div style="font-family:var(--font-num);font-size:12px;color:var(--loss);margin-top:4px">${fmtp(tipos[tipos.length - 1].roi)}</div></div>
    </div>`: "";
      return `<div class="section-header">ROI por <span>tipo</span></div>
    ${kpisMejorPeor}
    <div class="card"><div class="card-title">ROI por tipo</div>${chartPlaceholder("chartTipo", "tipo")}</div>
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
          <span class="dia-label" style="color:${best ? "var(--accent)" : "var(--text-2)"}">${d.label}${best ? " ⭐" : ""}</span>
          <div class="dia-bar-wrap"><div class="dia-bar-fill" style="width:${barW}%;background:${col}"></div></div>
          <span class="dia-roi" style="color:${col}">${d.roi >= 0 ? "+" : ""}${d.roi.toFixed(1)}%</span>
          <span class="dia-wl">${d.wins}W-${d.losses}L</span>
        </div>`;
      }).join("")}
    </div>`: ""}
    ${data.porHora.length ? `
    <div class="card">
      <div class="card-title">Por franja horaria (hora de registro)</div>
      ${data.porHora.map(d => {
        const barW = Math.min(100, Math.abs(d.roi) / maxAbsHora * 100);
        const col = d.roi >= 0 ? "var(--win)" : "var(--loss)";
        const best = d.roi === Math.max(...data.porHora.map(x => x.roi));
        return `<div class="dia-row">
          <span class="dia-label" style="color:${best ? "var(--accent)" : "var(--text-2)"};font-size:10px">${d.label}${best ? " ⭐" : ""}</span>
          <div class="dia-bar-wrap"><div class="dia-bar-fill" style="width:${barW}%;background:${col}"></div></div>
          <span class="dia-roi" style="color:${col}">${d.roi >= 0 ? "+" : ""}${d.roi.toFixed(1)}%</span>
          <span class="dia-wl">${d.wins}W-${d.losses}L</span>
        </div>`;
      }).join("")}
    </div>`: ""}
    <div class="explainer"><strong>Nota:</strong> El día de semana usa la fecha del evento. La franja horaria usa cuándo registraste la apuesta (hora CDMX). Con más datos este análisis se vuelve más preciso.</div>`;
    }

    /* ── Tab: Rolling ROI ── */
    let rollingShow = 30; // puntos rodantes visibles por defecto (selector de rango)
    function renderRolling() {
      const VENTANA = 20;
      const points = calcRolling(VENTANA);
      const res = DATA.apuestas.filter(a => a.status === "win" || a.status === "loss").length;
      if (!points.length) return `<div class="section-header">ROI <span>rodante</span></div><div class="empty">Necesitas al menos ${VENTANA} apuestas resueltas. Tienes ${res}.</div>`;
      const ultimo = points[points.length - 1];
      const tendencia = points.length >= 3 ? (() => { const t = points.slice(-3).map(p => p.roi); return t[2] > t[0] + 3 ? "📈 Mejorando" : t[2] < t[0] - 3 ? "📉 Empeorando" : "➡️ Estable"; })() : "—";
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
      const evEmoji = k.ev > 0 ? "✅" : "❌";
      const kellyPct = Math.min(k.f * 100, 25);
      return `<div class="section-header">Kelly <span>Criterion</span></div>
    <div class="card">
      <div class="card-title">Valor esperado (EV)</div>
      <div style="font-family:var(--font-num);font-size:32px;font-weight:700;color:var(--${evColor});margin-bottom:8px">${evEmoji} ${k.ev >= 0 ? "+" : ""}${k.ev.toFixed(3)}</div>
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
          <div class="kelly-card-lbl">Kelly medio ⭐</div>
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
          <div class="pat-sec pat-sec--info"><span class="pat-ico">⚙️</span><span>Motor de Neto Mensual</span></div>
          ${resumen}
          <div class="nm-grid">${tarjetas}</div>
        </div>`;
    }

    /* ── Tab: Patrones IA ── */
    async function fetchPatrones(force = false) {
      if (_patronesCargando) return;
      _patronesCargando = true;
      const el = document.getElementById("patrones");
      if (el) {
        el.innerHTML = `<div class="section-header">Patrones <span>IA</span></div>
          <div class="empty" style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:40px 20px">
            <div class="loader-logo" style="animation:pulse 1s infinite alternate;font-size:32px">🤖</div>
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
              🤖 <strong>BetStats IA:</strong> Claude analiza la distribución de tu ROI por Deporte, Mercado, Día y Cuotas para encontrar sesgos estadísticos.
            </div>
            <div class="empty" style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:32px 20px">
              <div style="font-size:40px">🤖</div>
              <p style="text-align:center;margin:0">Aún no has ejecutado el análisis IA.</p>
              <small style="color:var(--text-3);text-align:center">Presiona el botón para que Claude analice tu historial y detecte patrones EV+.</small>
              <button class="retry-btn" data-action="force-patrones" style="margin:0;padding:10px 20px;font-size:13px">⚡ Iniciar análisis IA</button>
            </div>`;
          return el.innerHTML;
        }
      }

      if (_patronesCargando) {
        el.innerHTML = `<div class="section-header">Patrones <span>IA</span></div>
          <div class="empty" style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:40px 20px">
            <div class="loader-logo" style="animation:pulse 1s infinite alternate;font-size:32px">🤖</div>
            <p>Claude está analizando todo tu historial para encontrar patrones EV+...</p>
            <small style="color:var(--text-3)">(Este proceso puede tardar unos 10-20 segundos)</small>
          </div>`;
        return el.innerHTML;
      }

      if (_patronesData.error) {
        el.innerHTML = `<div class="section-header">Patrones <span>IA</span></div>
          <div class="empty">
            <p>⚠️ Error al cargar los patrones</p>
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
          🤖 <strong>BetStats IA:</strong> Claude analiza la distribución de tu ROI por Deporte, Mercado, Día y Cuotas para encontrar sesgos estadísticos.
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
          <div style="font-size:11px;color:var(--text-3)">Generado: <strong>${fechaTxt}</strong></div>
          <button class="retry-btn" data-action="force-patrones" style="margin:0;padding:6px 12px;font-size:11px;background:var(--card);border:1px solid var(--border);color:var(--text)">⚡ Nuevo análisis</button>
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
        const ok  = c.tiene_ventaja;
        const col = ok ? "--win" : "--loss";
        const bg  = ok ? "--win-bg" : "--loss-bg";
        const titulo = ok ? "🟢 Tienes ventaja" : "🔴 Sin ventaja — el sistema pierde";
        const cuotaM = ((c.cuota_media_b ?? 0) + 1).toFixed(2);
        const detalle = ok
          ? `Winrate ${fmtp((c.winrate_p ?? 0) * 100)} &gt; break-even ${fmtp((c.break_even_wr ?? 0) * 100)} (cuota media ${cuotaM}). Kelly/4 sugerido: <strong>${fmtp((c.kelly_cuarto ?? 0) * 100)}</strong> del capital por apuesta.`
          : `Winrate ${fmtp((c.winrate_p ?? 0) * 100)} &lt; break-even ${fmtp((c.break_even_wr ?? 0) * 100)} (cuota media ${cuotaM}). Kelly óptimo ≤ 0: ningún capital arregla un edge negativo, solo cambia la velocidad de la ruina. Prioriza subir el winrate o bajar la cuota de entrada.`;
        ventajaHtml = `
    <div class="card" style="border:1px solid var(${col});background:var(${bg});margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
        <div style="font-weight:800;font-size:14px;color:var(${col})">${titulo}</div>
        <div style="font-family:var(--font-num);font-size:13px;color:var(${col})">edge ${fmtp((c.edge_por_stake ?? 0) * 100)}/stake</div>
      </div>
      <div style="font-size:12px;color:var(--text-2);margin-top:6px;line-height:1.5">${detalle}</div>
    </div>`;
      }

      // ── Recomendación robusta (drawdown p95 Monte Carlo + liquidez) — aditivo ──
      let robustoHtml = "";
      if (c.capital_minimo_robusto != null) {
        robustoHtml = `
    <div class="card" style="margin-bottom:10px">
      <div class="card-title">🛡️ Recomendación robusta (p95)</div>
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

    /* ── Tab: Apuestas ── */
    function renderApuestas() {
      const deportesUnicos = ["Todos", ...new Set(DATA.apuestas.map(a => a.deporte).filter(Boolean))];
      return `<div class="section-header">Historial de <span>bets</span></div>
    <div class="search-wrap"><span class="search-icon">🔍</span><input class="search-input" placeholder="Buscar por equipo..." data-search-equipo value="${esc(filtroEquipo)}"></div>
    <div class="filter-row">${deportesUnicos.map(d => `<button class="filter-chip ${d === filtroDeporte ? "active" : ""}" data-filtro-deporte="${esc(d)}">${esc(d)}</button>`).join("")}</div>
    <div id="apuestasLista">${renderApuestasList()}</div>`;
    }
    function renderApuestasList() {
      const term = filtroEquipo.toLowerCase().trim();
      const filt = DATA.apuestas.filter(a => filtroDeporte === "Todos" || a.deporte === filtroDeporte).filter(a => !term || (a.equipo1 || "").toLowerCase().includes(term) || (a.equipo2 || "").toLowerCase().includes(term));
      const mostrar = [...filt].reverse().slice(0, 50);
      const truncated = filt.length > 50; return `<div class="card"><div class="card-title">${filt.length} apuesta${filt.length !== 1 ? "s" : ""}${truncated ? " <span style='color:var(--text-2);font-weight:400;font-size:10px'>(mostrando últimas 50)</span>" : ""}</div>${mostrar.length === 0 ? '<div class="empty">Sin resultados</div>' : mostrar.map(renderBetItem).join("")}</div>`;
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

    function renderBetItem(a) {
      const icon = a.status === "win" ? "win" : a.status === "loss" ? "loss" : a.status === "void" ? "pend" : "pend";
      const res = a.status === "win" ? `+${fmt(a.ganancia)}` : a.status === "loss" ? `-${fmt(a.monto)}` : a.status === "void" ? `🔄 Nula` : ` ⏳ ${fmt(a.potencial)}`;
      const rc = a.status === "win" ? "green" : a.status === "loss" ? "red" : a.status === "void" ? "accent" : "yellow";
      const _stMap = { win: ["Ganada", "win"], loss: ["Perdida", "loss"], void: ["Nula", "void"] };
      const [statusLabel, badgeKey] = _stMap[a.status] || ["Pendiente", "pend"];
      const esParlay = (a.equipo2 || "").startsWith("PARLAY");
      const teamsLabel = esParlay ? `🎯 Parlay · ${esc(a.equipo2 || "")}` : `${esc(a.equipo1 || "?")} vs ${esc(a.equipo2 || "?")}`;
      const metaLabel = esParlay ? `${esc(a.deporte)} · Acumulador @ ${esc(a.cuota)} · ${(a.fecha_partido || a.fecha)?.slice(0, 10) || ""}` : `${esc(a.deporte)} · ${esc(formatTipoApuesta(a))} @ ${esc(a.cuota)} · ${(a.fecha_partido || a.fecha)?.slice(0, 10) || ""}`;
      return `<div class="bet-item"><div class="bet-dot ${icon}"></div><div class="bet-info"><div class="bet-teams">${teamsLabel}</div><div class="bet-meta">${metaLabel}</div></div><div class="bet-right"><div class="bet-badge bet-badge-${badgeKey}">${statusLabel}</div><div class="bet-monto">${fmt(a.monto)}</div><div class="bet-result ${rc}">${res}</div></div></div>`;
    }

    /* ── Charts ── */
    function axisM(v) { const a = Math.abs(v); return a >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}` }
    function destroyChart(k) { if (charts[k]) { charts[k].destroy(); delete charts[k]; } }

    function makeChartNeto() {
      const c = document.getElementById("chartNeto");
      if (!c || !DATA.grafica_meses.length) return;
      destroyChart("neto");
      let acum = 0;
      charts.neto = new Chart(c, { type: "bar", data: { labels: DATA.grafica_meses.map(m => mesLabel(m.mes)), datasets: [{ label: "Neto acumulado", data: DATA.grafica_meses.map(m => { acum += m.neto; return acum; }), backgroundColor: DATA.grafica_meses.map((_, i, arr) => { let s = 0; arr.slice(0, i + 1).forEach(x => s += x.neto); return s >= 0 ? "rgba(0,205,150,0.75)" : "rgba(255,61,90,0.75)" }), borderRadius: 5, borderSkipped: false }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: cssVar("--chart-grid") }, ticks: { font: { size: 10, family: "Space Mono" }, color: cssVar("--chart-tick") } }, y: { grid: { color: cssVar("--chart-grid") }, ticks: { callback: axisM, font: { size: 10, family: "Space Mono" }, color: cssVar("--chart-tick") } } } } });
    }

    function makeChartMeses() {
      const c = document.getElementById("chartMeses");
      if (!c || !DATA.grafica_meses.length) return;
      destroyChart("meses");
      charts.meses = new Chart(c, { type: "bar", data: { labels: DATA.grafica_meses.map(m => mesLabel(m.mes)), datasets: [{ label: "Apostado", data: DATA.grafica_meses.map(m => m.apostado), backgroundColor: "rgba(108,99,255,0.6)", borderRadius: 4, borderSkipped: false }, { label: "Ganado", data: DATA.grafica_meses.map(m => m.ganado), backgroundColor: "rgba(0,205,150,0.6)", borderRadius: 4, borderSkipped: false }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, labels: { font: { size: 11, family: "DM Sans" }, boxWidth: 10, padding: 10, color: cssVar("--text-2") } } }, scales: { x: { grid: { color: cssVar("--chart-grid") }, ticks: { font: { size: 10, family: "Space Mono" }, color: cssVar("--chart-tick") } }, y: { grid: { color: cssVar("--chart-grid") }, ticks: { callback: axisM, font: { size: 10, family: "Space Mono" }, color: cssVar("--chart-tick") } } } } });
    }

    function makeChartDep() {
      const c = document.getElementById("chartDep");
      if (!c || !DATA.deportes.length) return;
      destroyChart("dep");
      const deps = [...DATA.deportes].sort((a, b) => b.roi - a.roi);
      charts.dep = new Chart(c, { type: "bar", data: { labels: deps.map(d => d.nombre), datasets: [{ label: "ROI %", data: deps.map(d => parseFloat(d.roi.toFixed(1))), backgroundColor: deps.map(d => d.roi >= 0 ? "rgba(0,205,150,0.75)" : "rgba(255,61,90,0.75)"), borderRadius: 5, borderSkipped: false }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: cssVar("--chart-grid") }, ticks: { font: { size: 10, family: "Space Mono" }, color: cssVar("--chart-tick") } }, y: { grid: { color: cssVar("--chart-grid") }, ticks: { callback: v => `${v}%`, font: { size: 10, family: "Space Mono" }, color: cssVar("--chart-tick") } } } } });
    }

    function makeChartTipo() {
      const c = document.getElementById("chartTipo");
      if (!c) return;
      destroyChart("tipo");
      const tipos = calcRoiPorTipo();
      if (!tipos.length) return;
      charts.tipo = new Chart(c, { type: "bar", data: { labels: tipos.map(t => t.tipo), datasets: [{ label: "ROI %", data: tipos.map(t => parseFloat(t.roi.toFixed(1))), backgroundColor: tipos.map(t => t.roi >= 0 ? "rgba(0,205,150,0.75)" : "rgba(255,61,90,0.75)"), borderRadius: 5, borderSkipped: false }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: cssVar("--chart-grid") }, ticks: { font: { size: 10, family: "Space Mono" }, color: cssVar("--chart-tick") } }, y: { grid: { color: cssVar("--chart-grid") }, ticks: { callback: v => `${v}%`, font: { size: 10, family: "Space Mono" }, color: cssVar("--chart-tick") } } } } });
    }

    function makeChartRolling() {
      const c = document.getElementById("chartRolling");
      if (!c) return;
      destroyChart("rolling");
      const all = calcRolling(20);
      if (!all.length) return;
      const points = rollingShow >= 9999 ? all : all.slice(-rollingShow);
      charts.rolling = new Chart(c, { type: "line", data: { labels: points.map(p => `#${p.i + 1}`), datasets: [{ label: "ROI rodante", data: points.map(p => parseFloat(p.roi.toFixed(2))), borderColor: "#00CD96", backgroundColor: "rgba(0,205,150,0.08)", borderWidth: 2, pointRadius: 0, fill: true, tension: 0.3 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.parsed.y >= 0 ? "+" : ""}${ctx.parsed.y.toFixed(1)}%` } } }, scales: { x: { grid: { color: cssVar("--chart-grid") }, ticks: { display: false } }, y: { grid: { color: cssVar("--chart-grid") }, ticks: { callback: v => `${v >= 0 ? "+" : ""}${v}%`, font: { size: 10, family: "Space Mono" }, color: cssVar("--chart-tick") }, afterDataLimits: scale => { const pad = Math.abs(scale.max - scale.min) * 0.15; scale.max += pad; scale.min -= pad; } } } } });
    }

    function initCharts() {
      if (!DATA || typeof Chart === "undefined") return;
      if (_noBlur && window.innerWidth < 768) return; // en Linux/tdesktop los charts son lazy (botón manual) en móvil
      Chart.defaults.color = cssVar("--chart-tick");
      Chart.defaults.borderColor = cssVar("--chart-grid");
      // Tooltips táctiles temáticos (se activan al tocar la gráfica en móvil).
      Chart.defaults.plugins.tooltip.backgroundColor = cssVar("--card2");
      Chart.defaults.plugins.tooltip.titleColor = cssVar("--text");
      Chart.defaults.plugins.tooltip.bodyColor = cssVar("--text");
      Chart.defaults.plugins.tooltip.borderColor = cssVar("--border");
      Chart.defaults.plugins.tooltip.borderWidth = 1;
      Chart.defaults.plugins.tooltip.padding = 10;
      Chart.defaults.interaction = { mode: "index", intersect: false };
      if (tabActual === "resumen") { makeChartNeto(); makeChartMeses(); }
      if (tabActual === "deportes") { makeChartDep(); }
      if (tabActual === "tipos") { makeChartTipo(); }
      if (tabActual === "rolling") { makeChartRolling(); }
    }

    /* ── Events ── */
    document.addEventListener("click", e => {
      const chip = e.target.closest("[data-filtro-deporte]");
      if (chip) { filtroDeporte = chip.dataset.filtroDeporte; document.querySelectorAll("[data-filtro-deporte]").forEach(c => c.classList.toggle("active", c.dataset.filtroDeporte === filtroDeporte)); const l = document.getElementById("apuestasLista"); if (l) l.innerHTML = renderApuestasList(); return; }
      const rs = e.target.closest("[data-rolling-show]");
      if (rs) { rollingShow = parseInt(rs.dataset.rollingShow, 10); haptic("select"); document.querySelectorAll("[data-rolling-show]").forEach(b => b.classList.toggle("active", b === rs)); destroyChart("rolling"); makeChartRolling(); return; }
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
      
      const actEl = e.target.closest("[data-action]");
      const act = actEl?.dataset.action;
      
      if (e.target.id === "mOverlay") { closeModal(); return; }
      
      if (act) {
        if (act === "logout") { logout(); return; }
        if (act === "recargar") { recargar(); return; }
        if (act === "new-bet") { openModal(null, null); return; }
        if (act === "edit-bet") { openModal(parseInt(actEl.dataset.rowid, 10), parseInt(actEl.dataset.idx, 10)); return; }
        if (act === "delete-bet") { confirmDel(parseInt(actEl.dataset.rowid, 10), actEl.dataset.label); return; }
        if (act === "close-modal") { closeModal(); return; }
        if (act === "trigger-upload") { document.getElementById("uInput").click(); return; }
        if (act === "add-parlay-pick") { addParlayPick(); return; }
        if (act === "calc-cuota") { calcCuotaAuto(); return; }
        if (act === "set-fecha-now") { setFechaNow(); return; }
        if (act === "submit-bet") { submitBet(); return; }
        if (act === "remove-parlay-pick") { removeParlayPick(parseInt(actEl.dataset.idx, 10)); return; }
        if (act === "load-lazy-chart") { loadLazyChart(actEl.dataset.canvasId, actEl.dataset.makeKey); return; }
        if (act === "retry-patrones") { fetchPatrones(false); return; }
        if (act === "force-patrones") { fetchPatrones(true); return; }
      }
    });
    document.addEventListener("input", e => {
      const el = e.target.closest("[data-search-equipo]");
      if (el) { filtroEquipo = el.value; const l = document.getElementById("apuestasLista"); if (l) l.innerHTML = renderApuestasList(); return; }
      
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
    });
    document.addEventListener("change", e => {
      const el = e.target.closest("#mEsParlay");
      if (el) { toggleParlay(el.checked); return; }
      
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

    const _ALWAYS_RERENDER = new Set(["apuestas", "mes", "gestion", "patrones"]);

    /* ── Sub-navegación (segmented control) del grupo activo o de la vista "Más" ── */
    function renderSubNav() {
      const el = document.getElementById("subNav");
      if (!el) return;
      let chips;
      if (_inAdvanced) {
        chips = `<button class="sub-chip sub-back" data-advanced-close>‹ Volver</button>`
          + ADVANCED.map(s => `<button class="sub-chip" data-section="${s}">${SECTION_LABELS[s]}</button>`).join("");
      } else {
        const g = NAV_GROUPS.find(x => x.id === currentGroup) || NAV_GROUPS[0];
        chips = g.sections.map(s => `<button class="sub-chip" data-section="${s}">${SECTION_LABELS[s]}</button>`).join("");
        if (g.more) chips += `<button class="sub-chip sub-more" data-advanced>Más análisis ▾</button>`;
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
      try { await cargarDatos(); } finally { cargando = false; }
    }

    /* ════════════════════════════════════════════════════════════════
       TAB GESTIÓN — CRUD completo + análisis de ticket con IA
       ════════════════════════════════════════════════════════════════ */

    let _editRowId = null;

    function renderGestion() {
      return `
  <div class="section-header">Gestión de <span>apuestas</span></div>

  <div class="g-toolbar">
    <button class="btn-add" data-action="new-bet">➕ Nueva apuesta</button>
    <span style="font-size:11px;color:var(--text-3)">${DATA?.apuestas?.length ?? 0} registradas</span>
  </div>

  <div id="gLista">${renderGLista()}</div>`;
    }

    function renderGLista() {
      if (!DATA?.apuestas?.length) return '<div class="empty">Sin apuestas registradas</div>';
      const total = DATA.apuestas.length;
      return [...DATA.apuestas].reverse().slice(0, 40).map((a, idx) => {
        const rowId = a.row_id ?? (total - idx);
        const si = a.status === "win" ? "✅" : a.status === "loss" ? "❌" : a.status === "void" ? "🔄" : "⏳";
        const gStr = a.status === "win" ? ` → +${fmt(a.ganancia)}` : a.status === "loss" ? ` → -${fmt(a.monto)}` : "";
        return `<div class="g-card">
      <div class="g-card-head">
        <div>
          <div class="g-teams">${si} ${esc(a.equipo1)} vs ${esc(a.equipo2)}</div>
          <div class="g-meta">${esc(a.deporte || "")}${a.deporte ? " · " : ""}${esc(a.tipo || "")} @ ${esc(String(a.cuota || ""))} · ${fmt(a.monto)}${gStr}${a.fecha_partido ? " · 📅 " + esc(a.fecha_partido) : ""}</div>
        </div>
        <div class="g-actions">
          <button class="btn-edit" data-action="edit-bet" data-rowid="${rowId}" data-idx="${idx}">✏️</button>
          <button class="btn-del"  data-action="delete-bet" data-rowid="${rowId}" data-label="${esc(a.equipo1)} vs ${esc(a.equipo2)}">🗑️</button>
        </div>
      </div>
    </div>`;
      }).join("");
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
      if (!mb) return; // sin MainButton: se conserva el botón del formulario
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
    function openModal(rowId, idx) {
      _editRowId = rowId;
      const a = (rowId !== null && DATA?.apuestas) ? [...DATA.apuestas].reverse()[idx] : {};
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
          <span>${rowId === null ? "➕ Nueva apuesta" : "✏️ Editar apuesta"}</span>
          <button class="m-close" data-action="close-modal">✕</button>
        </div>
      </div>
      <div class="m-body">
        ${rowId === null ? `
        <div class="u-zone" id="uZone"
             data-action="trigger-upload"
             data-dropzone>
          <div class="u-icon">📸</div>
          <div class="u-text">Foto del ticket → auto-rellena el formulario</div>
          <div class="u-sub">Toca o arrastra la imagen</div>
        </div>
        <input id="uInput" type="file" accept="image/*" style="display:none" data-action="upload-image">
        <div class="u-analyzing" id="uAn">⏳ Analizando con IA…</div>`: ""}

        <!-- Toggle Parlay (solo en creación nueva) -->
        ${rowId === null ? `
        <div class="m-group" style="display:flex;align-items:center;gap:10px;margin-top:8px">
          <label class="m-label" style="margin:0;flex:1">🎯 Es Parlay / Acumulador</label>
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
          <div class="m-group"><label class="m-label">Tipo de apuesta</label><input id="mTipo" class="m-input" value="${esc(v.tipo)}" placeholder="moneyline, handicap, total over 2.5…"></div>
          <div class="m-row">
            <div class="m-group"><label class="m-label">Cuota</label><input id="mCuota" class="m-input" type="number" step="0.01" value="${esc(String(v.cuota))}" placeholder="1.85"></div>
            <div class="m-group"><label class="m-label">Monto ($)</label><input id="mMonto" class="m-input" type="number" value="${esc(String(v.monto))}" placeholder="100"></div>
          </div>
        </div>

        <!-- Sección Parlay (visible solo en modo parlay) -->
        <div id="parlaySection" style="display:none">
          <div class="m-group" style="background:var(--surface-2,#1e2235);border-radius:10px;padding:10px">
            <div style="font-size:12px;color:var(--accent);font-weight:700;margin-bottom:8px">🎯 PICKS DEL PARLAY</div>
            <div id="picksContainer"></div>
            <button data-action="add-parlay-pick"
                    style="width:100%;margin-top:8px;padding:8px;border:1px dashed var(--accent);
                           border-radius:8px;background:transparent;color:var(--accent);
                           font-size:13px;cursor:pointer">
              ➕ Agregar pick
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
                  🔄 Calcular
                </button>
              </div>
              <div id="cuotaAutoMsg" style="font-size:11px;color:var(--text-2);margin-top:4px;display:none"></div>
            </div>
            <div class="m-group"><label class="m-label">Monto ($)</label><input id="mMonto" class="m-input" type="number" value="${esc(String(v.monto))}" placeholder="100"></div>
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
            <button class="m-now-btn" data-action="set-fecha-now">📅 Ahora</button>
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
            <option value="pending" ${v.status === "pending" ? "selected" : ""}>⏳ Pendiente</option>
            <option value="win"     ${v.status === "win" ? "selected" : ""}>✅ Win</option>
            <option value="loss"    ${v.status === "loss" ? "selected" : ""}>❌ Loss</option>
            <option value="void"    ${v.status === "void" ? "selected" : ""}>🔄 Void</option>
          </select></div>`: ""}
      </div>
      <div class="m-foot">
        <div class="m-err" id="mErr"></div>
        <button class="m-submit" id="mSubmitBtn" data-action="submit-bet">${rowId === null ? "✅ Registrar apuesta" : "💾 Guardar cambios"}</button>
      </div>
    </div>
  </div>`;
      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", syncModalToViewport);
        window.visualViewport.addEventListener("scroll", syncModalToViewport);
      }
      syncModalToViewport();
      _setupMainButton(rowId === null ? "✅ Registrar apuesta" : "💾 Guardar cambios");
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
    }
    // archivo: index.html — funciones del modo Parlay

    let _parlayPicks = [];  // array de picks del parlay actual

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
      _parlayPicks.push({ equipo1: "", equipo2: "", tipo_apuesta: "", cuota: "" });
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
        <input class="m-input" placeholder="Tipo (moneyline, over 2.5…)" value="${esc(p.tipo_apuesta)}"
               data-parlay-idx="${i}" data-parlay-field="tipo_apuesta" style="flex:2;font-size:12px">
        <input class="m-input" placeholder="Cuota" type="number" step="0.01" value="${esc(String(p.cuota))}"
               data-parlay-idx="${i}" data-parlay-field="cuota" style="flex:1;font-size:12px">
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
          const picksHtml = d.picks.map((p, i) =>
            `<div style="font-size:11px;padding:3px 0;border-bottom:1px solid var(--border)">
          <b>#${i + 1}</b> ${esc(p.equipo1 || "?")} vs ${esc(p.equipo2 || "?")}
          <span style="color:var(--text-2)"> | ${esc(p.tipo_apuesta || "")} @ ${esc(String(p.cuota || ""))}</span>
        </div>`
          ).join("");
          uz.innerHTML = `
        <div class="u-icon">🎯</div>
        <div class="u-text" style="color:var(--accent);font-weight:700">
          Parlay · ${d.picks.length} picks · Cuota total: ${esc(String(d.cuota || ""))}
        </div>
        <div style="width:100%;margin-top:8px;text-align:left">${picksHtml}</div>
        <div class="u-sub" style="margin-top:6px">Revisa el monto y guarda ↓</div>`;
        } else if (esCombinada) {
          const sels = d.picks.map(p => esc(p.tipo_apuesta || "?")).join(" + ");
          uz.innerHTML = `
        <div class="u-icon">🔗</div>
        <div class="u-text" style="color:var(--accent);font-weight:700">
          Combinada · ${d.picks.length} selecciones · Cuota: ${esc(String(d.cuota || ""))}
        </div>
        <div style="width:100%;margin-top:8px;text-align:left;font-size:11px;padding:4px 0">${sels}</div>
        <div class="u-sub" style="margin-top:6px">Revisa el monto y guarda ↓</div>`;
        } else {
          uz.innerHTML = `<div class="u-icon">✅</div><div class="u-text" style="color:var(--win)">Ticket detectado — revisa los campos</div>`;
        }
      } catch (err) { showErr("⚠️ " + err.message); uz.style.opacity = "1"; }
      finally { an.style.display = "none"; }
    }

    // archivo: index.html
    async function submitBet() {
      if (!_isAuthed()) { showErr("🔑 Inicia sesión para usar esta función."); return; }
      const esParlay = document.getElementById("mEsParlay")?.checked || false;
      const monto = document.getElementById("mMonto")?.value.trim();
      const dep = document.getElementById("mDep")?.value.trim();
      const liga = document.getElementById("mLiga")?.value.trim();
      const fecha = document.getElementById("mFecha")?.value.trim();
      const hora = document.getElementById("mHora")?.value.trim();
      const st = document.getElementById("mStatus")?.value || "pending";
      const notasVis = document.getElementById("mNotasVisible")?.value.trim() || "";

      if (!monto) { showErr("⚠️ Ingresa el monto."); return; }

      let payload;

      if (esParlay && _editRowId === null) {
        // ── Validar picks ────────────────────────────────────────────────────────
        // Sync picks desde el DOM (por si el usuario escribió sin disparar oninput)
        document.querySelectorAll("#picksContainer > div").forEach((el, i) => {
          const inputs = el.querySelectorAll("input");
          if (_parlayPicks[i]) {
            _parlayPicks[i].equipo1 = inputs[0]?.value.trim() || "";
            _parlayPicks[i].equipo2 = inputs[1]?.value.trim() || "";
            _parlayPicks[i].tipo_apuesta = inputs[2]?.value.trim() || "";
            _parlayPicks[i].cuota = inputs[3]?.value.trim() || "";
          }
        });

        const validPicks = _parlayPicks.filter(p => p.equipo1 && p.equipo2 && p.tipo_apuesta && p.cuota);
        if (validPicks.length < 2) { showErr("⚠️ Un parlay necesita al menos 2 picks completos."); return; }

        const cuotaTotal = parseFloat(document.getElementById("mCuotaTotal")?.value) ||
          validPicks.reduce((a, b) => a * parseFloat(b.cuota || 1), 1);

        const notasPicks = validPicks.map((p, i) =>
          `#${i + 1}: ${p.equipo1} vs ${p.equipo2} | ${p.tipo_apuesta} @ ${p.cuota}`
        ).join(" || ");

        const notas = notasVis ? `${notasPicks} || Nota: ${notasVis}` : notasPicks;
        const ganancia = (parseFloat(monto) * cuotaTotal).toFixed(2);
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
        };

      } else {
        // ── Apuesta simple ───────────────────────────────────────────────────────
        const eq1 = document.getElementById("mEq1")?.value.trim();
        const eq2 = document.getElementById("mEq2")?.value.trim();
        const tipo = document.getElementById("mTipo")?.value.trim();
        const cuota = document.getElementById("mCuota")?.value.trim();
        if (!eq1 || !eq2 || !tipo || !cuota) { showErr("⚠️ Completa: equipos, tipo y cuota."); return; }

        const notas = document.getElementById("mNotas")?.value || notasVis;
        payload = { equipo1: eq1, equipo2: eq2, tipo_apuesta: tipo, cuota, monto, deporte: dep || "Otro", liga, fecha_partido: fecha, hora_partido: hora, notas };
      }

      const btn = document.getElementById("mSubmitBtn");
      const originalTxt = btn?.textContent || "";
      if (btn) { btn.disabled = true; btn.textContent = "⏳ Guardando…"; }
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
              // Retorno bruto: monto × cuota. Si no hay cuota, al menos devolver el monto.
              payload.ganancia_real = cuotaEdit > 0
                ? String((cuotaEdit * montoEdit).toFixed(2))
                : String(montoEdit.toFixed(2));
            }
            if (st === "loss") payload.ganancia_real = "0";   // consistente con bot.py
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
        showTab("gestion");
      } catch (err) {
        haptic("error");
        showErr("❌ " + err.message);
        if (btn) { btn.disabled = false; btn.textContent = originalTxt; }
        if (mb) { try { mb.hideProgress(); mb.enable(); } catch (_) {} }
      }
    }

    function confirmDel(rowId, label) {
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
        showTab("gestion");
      } catch (err) { alert("❌ " + err.message); }
    }

    function showErr(msg) { const el = document.getElementById("mErr"); if (el) { el.textContent = msg; el.style.display = "block"; } }

    cargarDatos();
