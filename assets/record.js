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
      ventaja: ["win", "🟢 Ventaja demostrada"],
      sin_ventaja: ["loss", "🔴 Sin ventaja"],
      indeterminado: ["warn", "🟡 Indeterminado"],
      insuficiente: ["", "⚪ Muestra insuficiente"],
      sin_datos: ["", "⚪ Sin datos de cierre"],
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
        <svg class="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="2.5" y="14" width="4" height="7" rx="1.4" fill="#00CD96" fill-opacity=".55"/>
          <rect x="10" y="10.5" width="4" height="10.5" rx="1.4" fill="#00CD96" fill-opacity=".78"/>
          <rect x="17.5" y="6.5" width="4" height="14.5" rx="1.4" fill="#00CD96"/>
          <path d="M3 10.2L9.2 6.4 13 8.3 20.5 3.4" stroke="#00CD96" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="logo-text">Bet<span>Stats</span></div>
      </div>
      <p class="tagline">Track record verificado, sin maquillaje. El CLV (precio tomado vs. cierre del mercado) mide ventaja real — no depende de la suerte de un resultado.</p>
      ${renderSwitch()}
    </header>`;
  }

  function renderContent(d) {
    const wl = `${d.wins}W – ${d.losses}L${d.voids ? ` – ${d.voids} nulas` : ""}`;
    const avisoMuestra = !d.muestra_suficiente
      ? `<p class="note">⚠️ Muestra todavía chica (${d.wins + d.losses} resueltas): estos números pueden moverse bastante con las próximas semanas.</p>`
      : "";
    const clv = d.clv || {};
    const clvBlock = clv.n
      ? `<div class="card">
          <h2>📈 CLV — Closing Line Value ${veredictoBadge(clv.veredicto)}</h2>
          <p class="note">Compara el precio tomado contra el cierre del mercado (justo antes del inicio). Es la métrica que usan los profesionales para medir ventaja real: converge con muchas menos apuestas que el ROI, porque compara precio contra precio, no resultado contra azar.</p>
          <div class="clv-row">
            <div class="clv-kpi"><div class="l">Con cierre</div><div class="v">${clv.n}</div></div>
            <div class="clv-kpi"><div class="l">CLV medio</div><div class="v ${signCls(clv.clv_medio_pct)}">${fmtp(clv.clv_medio_pct)}</div></div>
            <div class="clv-kpi"><div class="l">Beat rate</div><div class="v">${fmtpAbs(clv.beat_rate_pct)}</div></div>
          </div>
        </div>`
      : `<div class="card"><h2>📈 CLV — Closing Line Value</h2><p class="note">Todavía no hay suficientes apuestas con cuota de cierre registrada para mostrar esta métrica.</p></div>`;

    const mensual = d.mensual || [];
    const mensualBlock = mensual.length
      ? `<div class="card"><h2>📅 ROI por mes</h2><canvas id="chMes" height="160"></canvas></div>`
      : "";

    const tgUrl = CANALES[canalActual].telegram;
    const ctaBlock = tgUrl
      ? `<a class="cta" href="${esc(tgUrl)}" target="_blank" rel="noopener">📲 Unirme al canal de Telegram</a>`
      : "";

    return `
      <div class="hero-grid">
        <div class="hero-card"><div class="hero-label">ROI</div><div class="hero-value ${signCls(d.roi_pct)}">${fmtp(d.roi_pct)}</div></div>
        <div class="hero-card"><div class="hero-label">Win rate</div><div class="hero-value">${fmtpAbs(d.winrate_pct)}</div></div>
        <div class="hero-card"><div class="hero-label">Récord</div><div class="hero-value" style="font-size:18px">${esc(wl)}</div></div>
        <div class="hero-card"><div class="hero-label">Racha actual</div><div class="hero-value" style="font-size:18px">${d.racha ? `${d.racha} ${d.tipo_racha === "win" ? "🔥" : "🧊"}` : "—"}</div></div>
      </div>
      ${avisoMuestra}
      ${d.wilson_low_pct != null ? `<p class="note" style="text-align:center;margin:10px 0 0">Win rate con intervalo de confianza 95%: ${fmtpAbs(d.wilson_low_pct)} – ${fmtpAbs(d.wilson_high_pct)}</p>` : ""}
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
    new Chart(canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: data.map(v => (v == null ? "#5D6B82" : v >= 0 ? "#00CD96" : "#FF3D5A")),
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `ROI: ${fmtp(c.raw)}` } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#8896A8", font: { size: 11 } } },
          y: { grid: { color: "rgba(255,255,255,.05)" }, ticks: { color: "#8896A8", font: { size: 11 }, callback: v => `${v}%` } },
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
        <button id="retryBtn">↻ Reintentar</button>
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
