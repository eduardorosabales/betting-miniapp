/* record.js — página PÚBLICA de track record (marketing, sin auth). INV-XCUT-18/INV-BIZ-37.
 *
 * Independiente de app.js/edge.js a propósito: esta página no vive dentro de Telegram
 * (no hay `tg`/initData) y no requiere login — es la superficie que se comparte fuera
 * del bot. Consume /api/public/summary, que expone SOLO tasas/%/conteos (nunca montos
 * absolutos ni detalle de apuestas — ver edge_analytics.resumen_publico en el bot).
 *
 * `CANALES` está DUPLICADO a propósito desde assets/app.js (mismo patrón que INV-XCUT-02):
 * si se añade/cambia un canal ahí, replicar aquí. Solo se necesitan las URLs (sin `bot`,
 * esta página no tiene login).
 */
(function () {
  "use strict";

  // `telegram: null` = ese canal no tiene destino público propio todavía (confirmado por
  // el usuario, 2026-09-21) → el CTA se OMITE para esa pestaña en vez de un enlace roto.
  const CANALES = {
    "1": { apiUrl: "https://betting-stats-bot-production.up.railway.app", label: "Canal 1", telegram: "https://t.me/tubettingstatsbot" },
    "2": { apiUrl: "https://web-production-aa47e.up.railway.app", label: "Canal 2", telegram: null },
    "3": { apiUrl: "https://betting-stats-bot-canal3-production.up.railway.app", label: "Canal 3", telegram: null },
    "4": { apiUrl: "https://betting-stats-bot-canal4-production.up.railway.app", label: "Canal 4", telegram: null },
  };

  const params = new URLSearchParams(location.search);
  let canalActual = params.has("c") && CANALES[params.get("c")] ? params.get("c") : "1";

  const app = document.getElementById("app");
  const esc = s => s == null ? "" : String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const fmtp = n => n == null ? "—" : `${n >= 0 ? "+" : ""}${Number(n).toFixed(1)}%`;
  const fmtpAbs = n => n == null ? "—" : `${Number(n).toFixed(1)}%`;
  const signCls = n => n == null ? "" : (n >= 0 ? "green" : "red");

  const MES_LBL = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  function mesLabel(m) {
    if (!m) return "—";
    const [y, mo] = m.split("-");
    return `${MES_LBL[parseInt(mo, 10) - 1] || mo} ${y.slice(2)}`;
  }

  function veredictoBadge(v) {
    const map = {
      ventaja: ["win", "Ventaja demostrada"],
      sin_ventaja: ["loss", "Sin ventaja"],
      indeterminado: ["warn", "Indeterminado"],
      insuficiente: ["", "Muestra insuficiente"],
      sin_datos: ["", "Sin datos de cierre"],
    };
    const [cls, txt] = map[v] || ["", v || "—"];
    return `<span class="badge ${cls}">${txt}</span>`;
  }

  function renderSwitch() {
    return `<div class="canal-switch">${Object.entries(CANALES).map(([k, c]) =>
      `<button class="canal-chip${k === canalActual ? " active" : ""}" data-canal="${k}">${esc(c.label)}</button>`
    ).join("")}</div>`;
  }

  function renderHeader() {
    return `<header class="top">
      <div class="logo">
        <div class="logo-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 20v-7"/><path d="M12 20V5"/><path d="M19 20v-10"/></svg></div>
        <div class="logo-text">Betting Stats</div>
      </div>
      <p class="tagline">Track record verificado, sin maquillaje. El CLV (precio tomado vs. cierre del mercado) mide ventaja real — no depende de la suerte de un resultado.</p>
      ${renderSwitch()}
    </header>`;
  }

  function renderContent(d) {
    const resueltas = d.wins + d.losses;
    const avisoMuestra = !d.muestra_suficiente
      ? `<div class="sample-note"><span><b>Muestra todavía chica</b> (${resueltas} resueltas): estos números pueden moverse bastante con las próximas semanas.</span></div>`
      : "";
    const clv = d.clv || {};
    const clvBlock = clv.n
      ? `<div class="card">
          <h2>CLV — Closing Line Value ${veredictoBadge(clv.veredicto)}</h2>
          <p class="note">Compara el precio tomado contra el cierre del mercado (justo antes del inicio). Es la métrica que usan los profesionales para medir ventaja real: converge con muchas menos apuestas que el ROI, porque compara precio contra precio, no resultado contra azar.</p>
          <div class="clv-row">
            <div class="clv-kpi"><div class="l">Con cierre</div><div class="v">${clv.n}</div></div>
            <div class="clv-kpi"><div class="l">CLV medio</div><div class="v ${signCls(clv.clv_medio_pct)}">${fmtp(clv.clv_medio_pct)}</div></div>
            <div class="clv-kpi"><div class="l">Beat rate</div><div class="v">${fmtpAbs(clv.beat_rate_pct)}</div></div>
          </div>
        </div>`
      : `<div class="card"><h2>CLV — Closing Line Value</h2><p class="note">Todavía no hay suficientes apuestas con cuota de cierre registrada para mostrar esta métrica.</p></div>`;

    const mensual = d.mensual || [];
    const mensualBlock = mensual.length
      ? `<div class="card"><h2>ROI por mes</h2><div class="chart-box"><canvas id="chMes" role="img" aria-label="ROI por mes"></canvas></div></div>`
      : "";

    const tgUrl = CANALES[canalActual].telegram;
    const ctaBlock = tgUrl
      ? `<a class="cta" href="${esc(tgUrl)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>Unirme al canal de Telegram</a>`
      : "";

    const racha = d.racha ? `${d.racha} ${d.tipo_racha === "win" ? (d.racha === 1 ? "ganada" : "ganadas") : (d.racha === 1 ? "perdida" : "perdidas")}` : "—";
    const wilson = d.wilson_low_pct != null ? ` · IC 95% del win rate: ${fmtpAbs(d.wilson_low_pct)} – ${fmtpAbs(d.wilson_high_pct)}` : "";

    return `
      <section class="hero">
        <div class="hero-eyebrow">Rendimiento (ROI)</div>
        <div class="hero-amount ${signCls(d.roi_pct)}">${fmtp(d.roi_pct)}</div>
        <div class="hero-sub">${resueltas} apuestas resueltas${d.voids ? ` · ${d.voids} nulas` : ""}${wilson}</div>
        <div class="hero-metrics">
          <div class="hero-metric"><div class="hero-metric-v">${fmtpAbs(d.winrate_pct)}</div><div class="hero-metric-l">Win rate</div></div>
          <div class="hero-metric"><div class="hero-metric-v">${d.wins}–${d.losses}</div><div class="hero-metric-l">Récord</div></div>
          <div class="hero-metric"><div class="hero-metric-v ${d.racha ? (d.tipo_racha === "win" ? "green" : "red") : ""}">${esc(racha)}</div><div class="hero-metric-l">Racha actual</div></div>
        </div>
      </section>
      ${avisoMuestra}
      ${clvBlock}
      ${mensualBlock}
      ${ctaBlock}
      <footer>
        Datos generados automáticamente por el bot — cero edición manual.<br>
        Actualizado: ${d.actualizado ? new Date(d.actualizado).toLocaleString("es-MX") : "—"}
      </footer>`;
  }

  function makeChartMensual(mensual) {
    const canvas = document.getElementById("chMes");
    if (!canvas || typeof Chart === "undefined") return;
    const labels = mensual.map(m => mesLabel(m.mes));
    const data = mensual.map(m => m.roi_pct);
    // Colores desde las variables del tema (claro u oscuro según el sistema), nunca fijos.
    const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const font = { family: "Inter, system-ui, sans-serif", size: 11 };
    new Chart(canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: data.map(v => (v == null ? css("--text-3") : v >= 0 ? css("--win") : css("--loss"))),
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 36,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: css("--card2"), titleColor: css("--text-2"), bodyColor: css("--text"),
            borderColor: css("--border"), borderWidth: 1, padding: 12, cornerRadius: 12, displayColors: false,
            callbacks: { label: c => `ROI: ${fmtp(c.raw)}` },
          },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: css("--chart-tick"), font, maxRotation: 0, autoSkipPadding: 12 } },
          y: { grid: { color: css("--chart-grid") }, border: { display: false }, ticks: { color: css("--chart-tick"), font, callback: v => `${v}%` } },
        },
      },
    });
  }

  async function cargar() {
    app.innerHTML = renderHeader() + `<div class="loader">Cargando historial…</div>`;
    document.querySelectorAll("[data-canal]").forEach(b => b.addEventListener("click", onCanalClick));
    const url = CANALES[canalActual].apiUrl;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 12000);
      const resp = await fetch(`${url}/api/public/summary`, { signal: ctrl.signal });
      clearTimeout(t);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const d = await resp.json();
      app.innerHTML = renderHeader() + renderContent(d);
      document.querySelectorAll("[data-canal]").forEach(b => b.addEventListener("click", onCanalClick));
      if (d.mensual && d.mensual.length) makeChartMensual(d.mensual);
    } catch (e) {
      const msg = e.name === "AbortError" ? "Tiempo de espera agotado." : e.message;
      app.innerHTML = renderHeader() + `<div class="error-box">
        <p>No se pudo cargar el historial de este canal.</p>
        <small>${esc(msg)}</small><br>
        <button id="retryBtn">Reintentar</button>
      </div>`;
      document.querySelectorAll("[data-canal]").forEach(b => b.addEventListener("click", onCanalClick));
      document.getElementById("retryBtn")?.addEventListener("click", cargar);
    }
  }

  function onCanalClick(e) {
    canalActual = e.currentTarget.dataset.canal;
    const url = new URL(location.href);
    url.searchParams.set("c", canalActual);
    history.replaceState(null, "", url);
    cargar();
  }

  cargar();
})();
