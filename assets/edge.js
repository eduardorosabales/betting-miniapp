/* edge.js — "Ventaja real": salud de datos, CLV (closing line value), precio (line
   shopping) y política pre-apuesta (INV-BIZ-32..36, INV-XCUT-16/17).

   Carga DESPUÉS de app.js como <script> clásico (sin build step, INV-MINI-01): ambos
   comparten el scope léxico de top-level de la página, así que este archivo reutiliza
   directamente las const/let/function de app.js (esc, fmt*, apiHeaders, API_URL, DATA,
   CANALES, ADVANCED, SECTION_LABELS, _RENDER_FNS, _ALWAYS_RERENDER, showTab, haptic,
   safeJson, fetchRetry503, _isAuthed) sin necesidad de imports.

   Eventos propios por delegación con atributos `data-ed-*` — SEPARADOS de los `data-action`
   de app.js — para no tocar su listener de click (INV-MINI-13: delegación, cero inline).

   Presentación pura: toda la lógica de negocio (CLV, de-vig, Kelly, política) vive en el
   bot (edge_analytics.py) — este archivo solo pinta lo que la API ya calculó (INV-MINI-02). */
(function () {
  "use strict";

  // ── Registro de las dos sub-vistas nuevas dentro de "Más análisis" ──────────
  if (!ADVANCED.includes("clv")) ADVANCED.push("clv");
  if (!ADVANCED.includes("politica")) ADVANCED.push("politica");
  SECTION_LABELS.clv = "Ventaja real";
  SECTION_LABELS.politica = "Política";
  _RENDER_FNS.clv = () => renderClv();
  _RENDER_FNS.politica = () => renderPolitica();
  _ALWAYS_RERENDER.add("clv");
  _ALWAYS_RERENDER.add("politica");

  const fmtPct1 = n => n == null ? "—" : `${(n * 100).toFixed(1)}%`;
  const fmtPctS = n => n == null ? "—" : `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;

  // ── Estado en memoria (solo de sesión — se pierde al recargar, igual que _bt) ──
  let _clvDetalle = null;      // respuesta de GET /api/clv (segmentos + comparador base)
  let _clvCargando = false;
  let _clvError = null;
  let _cmpCanales = null;      // resultado del comparador multi-canal
  let _cmpCargando = false;
  let _reglas = null;          // respuesta de GET /api/policy
  let _reglasError = null;
  let _nuevaRegla = { nombre: "", accion: "saltar", deportes: new Set(), tipos: new Set(),
                      cuota_min: "", cuota_max: "" };
  let _evalPick = { deporte: "", liga: "", tipo_apuesta: "", cuota: "", fecha_partido: "", hora_partido: "" };
  let _evalResultado = null, _evalError = null, _evalCargando = false;

  async function _apiGet(path) {
    const resp = await fetchRetry503(`${API_URL}${path}`, { headers: apiHeaders() });
    return safeJson(resp);
  }
  async function _apiPost(path, body, method) {
    const resp = await fetch(`${API_URL}${path}`, {
      method: method || "POST", headers: apiHeaders(), body: JSON.stringify(body || {}),
    });
    return safeJson(resp);
  }
  async function _apiDelete(path) {
    const resp = await fetch(`${API_URL}${path}`, { method: "DELETE", headers: apiHeaders() });
    return safeJson(resp);
  }

  // ── Salud de datos (INV-BIZ-32) — ya viene en /api/stats, sin fetch extra ──────
  function _renderSalud() {
    const s = DATA?.salud;
    if (!s) return "";
    const alertas = (s.alertas || []).map(a =>
      `<div class="ed-alert ${a.nivel}">⚠️ ${esc(a.mensaje)}</div>`).join("");
    const rancias = (s.rancias || []).slice(0, 8).map(r =>
      `<div style="font-size:11.5px;padding:3px 0;border-top:1px solid rgba(255,255,255,.06)">
         #${r.row_id} ${esc(r.partido)} — ${esc(r.fecha_partido)} <span style="color:var(--loss)">(${r.dias} d)</span>
       </div>`).join("");
    return `<div class="ed-card">
      <h4>🩺 Salud de los datos</h4>
      <div class="ed-row">
        <div class="ed-kpi"><div class="l">Resueltas</div><div class="v">${fmtPct1(s.pct_resueltas)}</div><div class="s">${s.resueltas}/${s.total}</div></div>
        <div class="ed-kpi"><div class="l">Stake asumido</div><div class="v">${fmtPct1(s.pct_stake_asumido)}</div><div class="s">${s.n_stake_asumido} apuestas</div></div>
        <div class="ed-kpi"><div class="l">Sin clasificar</div><div class="v">${fmtPct1(s.pct_sin_clasificar)}</div><div class="s">${s.n_sin_clasificar} en «Otro»</div></div>
        <div class="ed-kpi"><div class="l">Con cierre (CLV)</div><div class="v">${fmtPct1(s.pct_con_cierre)}</div><div class="s">${s.n_con_cierre}/${s.n_elegibles_cierre || 0}</div></div>
      </div>
      ${alertas || `<div class="ed-ok">✅ Sin alertas de calidad de datos.</div>`}
      ${rancias ? `<details class="ed-fold"><summary>Pendientes rancias (${s.pendientes_rancias})</summary>${rancias}</details>` : ""}
    </div>`;
  }

  // ── ROI con stake real vs. con stakes asumidos ────────────────────────────────
  function _renderRoiReal() {
    const r = DATA?.roi_stake_real;
    if (!r || !r.n_excluidas) return "";
    const t = r.todas, s = r.solo_stake_real;
    const delta = r.delta_roi_pp;
    return `<div class="ed-card">
      <h4>💵 ROI con stake real</h4>
      <p class="ed-note">${r.n_excluidas} apuesta(s) usan un monto asumido (no el real apostado). Comparación con y sin ellas:</p>
      <div class="ed-row">
        <div class="ed-kpi"><div class="l">ROI (todas)</div><div class="v" style="color:${t.roi >= 0 ? "var(--win)" : "var(--loss)"}">${fmtp(t.roi)}</div><div class="s">n=${t.n}</div></div>
        <div class="ed-kpi"><div class="l">ROI (stake real)</div><div class="v" style="color:${s.roi >= 0 ? "var(--win)" : "var(--loss)"}">${fmtp(s.roi)}</div><div class="s">n=${s.n}</div></div>
        <div class="ed-kpi"><div class="l">Diferencia</div><div class="v" style="color:${Math.abs(delta || 0) > 3 ? "#F5A623" : "inherit"}">${delta == null ? "—" : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}pp`}</div></div>
      </div>
      ${Math.abs(delta || 0) > 3 ? `<p class="ed-note">La diferencia es grande: los montos asumidos están distorsionando tu ROI oficial.</p>` : ""}
    </div>`;
  }

  // ── CLV global + precio + valor del sistema (ya en /api/stats) ────────────────
  function _badgeVeredicto(v) {
    const map = { ventaja: ["win", "🟢 Ventaja"], sin_ventaja: ["loss", "🔴 Sin ventaja"],
                  indeterminado: ["warn", "🟡 Indeterminado"], insuficiente: ["", "⚪ Muestra insuficiente"],
                  sin_datos: ["", "⚪ Sin datos"] };
    const [cls, txt] = map[v] || ["", v || "—"];
    return `<span class="ed-badge ${cls}">${txt}</span>`;
  }

  function _renderClvGlobal() {
    const c = DATA?.clv;
    if (!c) return "";
    return `<div class="ed-card">
      <h4>📈 CLV — Closing Line Value ${_badgeVeredicto(c.veredicto)}</h4>
      <p class="ed-note">Compara la cuota que tomaste contra la cuota de <b>cierre</b> (justo antes del inicio). Es la métrica que dice si tienes ventaja real <b>mucho antes</b> de que el resultado (ganar/perder) tenga suficiente muestra — con 150 apuestas ya converge, el ROI necesita miles.</p>
      <div class="ed-row">
        <div class="ed-kpi"><div class="l">Apuestas con cierre</div><div class="v">${c.n}</div><div class="s">${fmtPct1(c.cobertura)} del historial elegible</div></div>
        <div class="ed-kpi"><div class="l">CLV medio</div><div class="v" style="color:${(c.clv_medio || 0) >= 0 ? "var(--win)" : "var(--loss)"}">${fmtPctS(c.clv_medio)}</div></div>
        <div class="ed-kpi"><div class="l">Beat rate</div><div class="v">${fmtPct1(c.beat_rate)}</div><div class="s">${c.beats}/${c.n} por encima del cierre</div></div>
        <div class="ed-kpi"><div class="l">IC 95%</div><div class="v" style="font-size:13px">${fmtPct1(c.wilson_low)} – ${fmtPct1(c.wilson_high)}</div></div>
      </div>
      ${c.n < (c.min_muestra || 30) ? `<p class="ed-note">⚠️ Menos de ${c.min_muestra || 30} apuestas con cierre: el veredicto todavía no es fiable.</p>` : ""}
      ${c.cobertura < 0.5 ? `<p class="ed-note">⚠️ Solo ${fmtPct1(c.cobertura)} de tus apuestas resueltas tienen cuota de cierre — activa la captura automática o cárgalo a mano para que el CLV represente todo tu historial.</p>` : ""}
    </div>`;
  }

  function _renderPrecio() {
    const p = DATA?.precio;
    if (!p || !p.n_con_mejor) return `<div class="ed-card"><h4>💰 Precio (line shopping)</h4><p class="ed-note">Todavía no hay apuestas con «Cuota mejor» registrada. Añádela al crear/editar una apuesta para medir cuánto dejas en la mesa por no comparar precio entre casas.</p></div>`;
    const casas = (p.por_casa || []).slice(0, 8).map(c => `<tr>
      <td>${esc(c.casa)}</td><td class="n">${c.n}</td>
      <td class="n" style="color:${(c.roi ?? 0) >= 0 ? "var(--win)" : "var(--loss)"}">${c.roi == null ? "—" : fmtp(c.roi)}</td>
    </tr>`).join("");
    const mejorEn = (p.mejor_precio_en || []).slice(0, 5)
      .map(x => `${esc(x.casa)} (${x.veces})`).join(" · ");
    return `<div class="ed-card">
      <h4>💰 Precio — dinero dejado en la mesa</h4>
      <div class="ed-row">
        <div class="ed-kpi"><div class="l">Valor esperado cedido</div><div class="v" style="color:var(--loss)">${fmtC(p.perdido_esperado)}</div></div>
        <div class="ed-kpi"><div class="l">Realizado (en ganadas)</div><div class="v" style="color:var(--loss)">${fmtC(p.perdido_realizado)}</div></div>
        <div class="ed-kpi"><div class="l">Captura media</div><div class="v">${fmtPct1(p.captura_media)}</div><div class="s">de la mejor cuota</div></div>
      </div>
      ${mejorEn ? `<p class="ed-note">La mejor cuota apareció más veces en: <b>${mejorEn}</b>.</p>` : ""}
      ${casas ? `<table class="ed-table"><thead><tr><th>Casa</th><th class="n">n</th><th class="n">ROI</th></tr></thead><tbody>${casas}</tbody></table>` : ""}
    </div>`;
  }

  function _renderSistema() {
    const s = DATA?.sistema;
    if (!s || !s.n) return "";
    const filas = (s.grupos || []).map(g => `<tr>
      <td>${esc(g.decision)}</td><td class="n">${g.n}</td><td class="n">${fmtPct1(g.wins / g.n)}</td>
      <td class="n" style="color:${g.unidades >= 0 ? "var(--win)" : "var(--loss)"}">${g.unidades >= 0 ? "+" : ""}${g.unidades.toFixed(2)}u</td>
    </tr>`).join("");
    return `<div class="ed-card">
      <h4>🎯 Valor de obedecer al sistema</h4>
      <p class="ed-note">Sobre las apuestas resueltas donde el sistema ya opinó (modo <b>${esc(DATA?.config?.modo || "advise")}</b>). Unidades = stake unitario desde la cuota (comparable, sin importar el monto real de cada día).</p>
      <div class="ed-row">
        <div class="ed-kpi"><div class="l">Si obedecías siempre</div><div class="v" style="color:${s.unidades_si_obedece >= 0 ? "var(--win)" : "var(--loss)"}">${s.unidades_si_obedece >= 0 ? "+" : ""}${s.unidades_si_obedece.toFixed(2)}u</div></div>
        <div class="ed-kpi"><div class="l">Sin filtrar nada</div><div class="v">${s.unidades_todas >= 0 ? "+" : ""}${s.unidades_todas.toFixed(2)}u</div></div>
        <div class="ed-kpi"><div class="l">Valor de la política</div><div class="v" style="color:${s.valor_politica >= 0 ? "var(--win)" : "var(--loss)"}">${s.valor_politica >= 0 ? "+" : ""}${s.valor_politica.toFixed(2)}u</div></div>
      </div>
      ${!s.muestra_suficiente ? `<p class="ed-note">⚠️ Muestra chica (n=${s.n}): esta comparación todavía es ruido.</p>` : ""}
      <table class="ed-table"><thead><tr><th>Decisión</th><th class="n">n</th><th class="n">WR</th><th class="n">Unidades</th></tr></thead><tbody>${filas}</tbody></table>
    </div>`;
  }

  // ── Segmentos de CLV (fetch bajo demanda, GET /api/clv) ───────────────────────
  function _tablaSegmentos(titulo, filas) {
    if (!filas || !filas.length) return "";
    const rows = filas.slice(0, 15).map(f => {
      const baja = f.n < 10;
      return `<tr class="${baja ? "low" : ""}">
        <td>${esc(f.segmento)}</td><td class="n">${f.n}</td>
        <td class="n" style="color:${(f.clv_medio || 0) >= 0 ? "var(--win)" : "var(--loss)"}">${fmtPctS(f.clv_medio)}</td>
        <td class="n">${fmtPct1(f.beat_rate)}</td>
        <td>${_badgeVeredicto(f.veredicto)}</td>
      </tr>`;
    }).join("");
    return `<details class="ed-fold"><summary>${titulo} (${filas.length})</summary>
      <table class="ed-table"><thead><tr><th>Segmento</th><th class="n">n</th><th class="n">CLV</th><th class="n">Beat</th><th>Veredicto</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <p class="ed-note">Filas atenuadas: menos de 10 apuestas con cierre — no saques conclusiones todavía.</p>
    </details>`;
  }

  async function _cargarClvDetalle(force) {
    if (_clvCargando || (_clvDetalle && !force)) return;
    _clvCargando = true; _clvError = null;
    const box = document.getElementById("edClvDetalle");
    if (box) box.innerHTML = `<p class="ed-note">⏳ Calculando segmentos…</p>`;
    try {
      _clvDetalle = await _apiGet("/api/clv");
    } catch (e) {
      _clvError = e.message;
    } finally {
      _clvCargando = false;
      if (box) box.innerHTML = _renderClvDetalleBox();
    }
  }

  function _renderClvDetalleBox() {
    if (_clvError) return `<p class="ed-note">❌ ${esc(_clvError)} <button class="ed-btn ghost small" data-ed-action="clv-reload">Reintentar</button></p>`;
    if (!_clvDetalle) return `<p class="ed-note">⏳ Cargando…</p>`;
    const seg = _clvDetalle.segmentos || {};
    return _tablaSegmentos("Por deporte", seg.deporte)
      + _tablaSegmentos("Por tipo de mercado", seg.tipo)
      + _tablaSegmentos("Por rango de cuota", seg.rango_cuota)
      + _tablaSegmentos("Por liga", seg.liga)
      || `<p class="ed-note">Sin segmentos con cierre todavía.</p>`;
  }

  // ── Comparador de canales (best-effort: cada canal tiene SU PROPIA auth) ──────
  async function _cargarComparador() {
    if (_cmpCargando) return;
    _cmpCargando = true;
    const box = document.getElementById("edComparador");
    if (box) box.innerHTML = `<p class="ed-note">⏳ Consultando canales…</p>`;
    const entradas = Object.entries(CANALES);
    const resultados = await Promise.all(entradas.map(async ([key, canal]) => {
      try {
        const resp = await fetch(`${canal.apiUrl}/api/clv`, { headers: apiHeaders() });
        if (resp.status === 401 || resp.status === 403) {
          return { key, canal, error: "auth" };
        }
        const j = await safeJson(resp);
        return { key, canal, data: j };
      } catch (e) {
        return { key, canal, error: e.message || "red" };
      }
    }));
    _cmpCanales = resultados;
    _cmpCargando = false;
    if (box) box.innerHTML = _renderComparadorBox();
  }

  function _renderComparadorBox() {
    if (!_cmpCanales) return "";
    const activo = key => key === (_canalKey || "1");
    const filas = _cmpCanales.map(r => {
      const marcaActivo = activo(r.key) ? " · <b>este canal</b>" : "";
      if (r.error === "auth") {
        return `<tr><td>${esc(r.canal.label)}${marcaActivo}</td><td colspan="4" style="color:var(--text-3)">
          🔒 No autenticado en este canal (cada bot firma su propia sesión — ábrelo desde su WebApp para comparar)
        </td></tr>`;
      }
      if (r.error) {
        return `<tr><td>${esc(r.canal.label)}${marcaActivo}</td><td colspan="4" style="color:var(--text-3)">❌ ${esc(r.error)}</td></tr>`;
      }
      const g = r.data.global || {};
      return `<tr><td>${esc(r.canal.label)}${marcaActivo}</td>
        <td class="n">${g.n ?? 0}</td>
        <td class="n" style="color:${(g.clv_medio || 0) >= 0 ? "var(--win)" : "var(--loss)"}">${fmtPctS(g.clv_medio)}</td>
        <td class="n">${fmtPct1(g.beat_rate)}</td>
        <td>${_badgeVeredicto(g.veredicto)}</td>
      </tr>`;
    }).join("");
    return `<table class="ed-table"><thead><tr><th>Canal</th><th class="n">n</th><th class="n">CLV</th><th class="n">Beat</th><th>Veredicto</th></tr></thead>
      <tbody>${filas}</tbody></table>
      <p class="ed-note">La comparación entre canales es <b>best-effort</b>: cada canal es una instancia independiente con su propio bot y su propia sesión (INV-MINI-29); solo se lee el canal cuya autenticación coincide con la de esta pestaña. Cambia de canal con <code>?c=1/2/3</code> en la URL para ver los otros de cerca.</p>`;
  }

  function renderClv() {
    setTimeout(() => { _cargarClvDetalle(false); }, 0);
    return `<div class="section-header">Ventaja real <span>CLV · Precio · Sistema</span></div>
      ${_renderSalud()}
      ${_renderRoiReal()}
      ${_renderClvGlobal()}
      <div class="ed-card"><h4>🔎 CLV por segmento</h4>
        <div id="edClvDetalle">${_renderClvDetalleBox()}</div>
      </div>
      ${_renderPrecio()}
      ${_renderSistema()}
      <div class="ed-card"><h4>🆚 Comparar canales</h4>
        <p class="ed-note">¿Cuál de tus tipsters/canales rinde mejor? Compara por CLV (no por ROI: con historiales cortos el ROI es ruido).</p>
        <button class="ed-btn ghost small" data-ed-action="cmp-reload">🔄 Consultar canales</button>
        <div id="edComparador" style="margin-top:8px">${_cmpCanales ? _renderComparadorBox() : ""}</div>
      </div>`;
  }

  // ── Política pre-apuesta: reglas congeladas + evaluador de picks ──────────────
  function _chipsSet(grupo, valores, activos) {
    return valores.map(v => `<button class="ed-chip ${activos.has(v) ? "active" : ""}" data-ed-toggle="${grupo}" data-ed-value="${esc(v)}">${esc(v)}</button>`).join("");
  }

  function _deportesDisponibles() {
    return [...new Set((DATA?.apuestas || []).map(a => (a.deporte || "").trim()).filter(Boolean))].sort();
  }
  function _tiposDisponibles() {
    return [...new Set((DATA?.apuestas || []).map(a => normalizaTipo(a.tipo)).filter(Boolean))].sort();
  }

  function _renderReglaRow(r) {
    const m = r.meta || {};
    const accionCls = r.accion === "saltar" ? "loss" : "win";
    const accionTxt = r.accion === "saltar" ? "🔴 SALTAR" : "🟢 APOSTAR";
    const filtroTxt = Object.entries(r.filtro || {})
      .filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && !v.length))
      .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join("/") : v}`).join(" · ") || "(sin filtro)";
    return `<div class="ed-rule ${r.activa ? "" : "off"}">
      <div class="top">
        <span class="nm">${esc(r.nombre)}</span>
        <span class="ed-badge ${accionCls}">${accionTxt}</span>
        ${r.activa ? "" : `<span class="ed-badge">inactiva</span>`}
        ${m.forzada ? `<span class="ed-badge warn">forzada</span>` : ""}
      </div>
      <div class="ev">${esc(filtroTxt)}</div>
      <div class="ev">Visible: n=${m.n ?? "—"}, yield ${m.yield_visible == null ? "—" : (m.yield_visible >= 0 ? "+" : "") + m.yield_visible.toFixed(3)}u ·
        Holdout: n=${m.n_holdout ?? "—"}, yield ${m.yield_holdout == null ? "—" : (m.yield_holdout >= 0 ? "+" : "") + m.yield_holdout.toFixed(3)}u
        ${m.congelada_en ? ` · congelada ${esc(String(m.congelada_en).slice(0, 10))}` : ""}</div>
      <div class="ed-cand-actions">
        <button class="ed-btn ghost small" data-ed-action="regla-toggle" data-ed-id="${r.id}" data-ed-activa="${r.activa ? "0" : "1"}">${r.activa ? "Desactivar" : "Activar"}</button>
        <button class="ed-btn danger small" data-ed-action="regla-borrar" data-ed-id="${r.id}">Borrar</button>
      </div>
    </div>`;
  }

  function _renderReglas() {
    if (_reglasError) return `<p class="ed-note">❌ ${esc(_reglasError)} <button class="ed-btn ghost small" data-ed-action="reglas-reload">Reintentar</button></p>`;
    if (!_reglas) return `<p class="ed-note">⏳ Cargando…</p>`;
    const filas = (_reglas.reglas || []);
    if (!filas.length) return `<p class="ed-note">Sin reglas congeladas todavía. Descúbrelas en el <b>Simulador → Buscador</b> y congela las que sobrevivan al holdout, o créala manualmente abajo.</p>`;
    return filas.map(_renderReglaRow).join("");
  }

  function _renderConfigPolitica() {
    const c = _reglas?.config;
    if (!c) return "";
    return `<div class="ed-row">
      <div class="ed-kpi"><div class="l">Modo</div><div class="v" style="font-size:14px">${esc(c.modo)}</div></div>
      <div class="ed-kpi"><div class="l">Bankroll</div><div class="v" style="font-size:14px">${c.bankroll_definido ? "definido" : "no definido"}</div></div>
      <div class="ed-kpi"><div class="l">Kelly</div><div class="v" style="font-size:14px">${c.kelly_fraccion}× · tope ${c.kelly_tope_pct}%</div></div>
      <div class="ed-kpi"><div class="l">Holdout</div><div class="v" style="font-size:14px">${Math.round((c.holdout_frac || 0) * 100)}%</div></div>
    </div>`;
  }

  async function _cargarReglas(force) {
    if (_reglas && !force) return;
    _reglasError = null;
    try {
      _reglas = await _apiGet("/api/policy");
    } catch (e) {
      _reglasError = e.message;
    }
    const box = document.getElementById("edReglas");
    if (box) box.innerHTML = _renderReglas();
    const cfg = document.getElementById("edPoliticaConfig");
    if (cfg) cfg.innerHTML = _renderConfigPolitica();
  }

  function _renderNuevaReglaForm() {
    const n = _nuevaRegla;
    return `<div class="ed-card">
      <h4>➕ Nueva regla</h4>
      <div class="ed-form">
        <div class="full"><label>Nombre</label><input id="edRNombre" value="${esc(n.nombre)}" placeholder="Ej: Basket hándicap, cuota alta"></div>
        <div><label>Acción</label>
          <select id="edRAccion">
            <option value="saltar" ${n.accion === "saltar" ? "selected" : ""}>🔴 Saltar</option>
            <option value="apostar" ${n.accion === "apostar" ? "selected" : ""}>🟢 Apostar</option>
          </select>
        </div>
        <div><label>Cuota mín.</label><input id="edRCuotaMin" type="number" step="0.01" value="${esc(n.cuota_min)}"></div>
        <div><label>Cuota máx.</label><input id="edRCuotaMax" type="number" step="0.01" value="${esc(n.cuota_max)}"></div>
      </div>
      <div style="margin-top:8px"><label style="font-size:10.5px;color:var(--text-3)">Deportes (vacío = todos)</label>
        <div class="ed-chips">${_chipsSet("deportes", _deportesDisponibles(), n.deportes)}</div></div>
      <div style="margin-top:6px"><label style="font-size:10.5px;color:var(--text-3)">Tipos de mercado (vacío = todos)</label>
        <div class="ed-chips">${_chipsSet("tipos", _tiposDisponibles(), n.tipos)}</div></div>
      <div id="edRErr" class="ed-note" style="color:var(--loss)"></div>
      <button class="ed-btn" style="margin-top:8px" data-ed-action="regla-crear">Congelar regla</button>
      <p class="ed-note">La evidencia (rendimiento visible y en el holdout que el buscador nunca vio) se calcula en el servidor al congelar — no se puede inventar desde aquí.</p>
    </div>`;
  }

  async function _crearRegla() {
    const nombre = document.getElementById("edRNombre")?.value.trim() || "";
    const accion = document.getElementById("edRAccion")?.value || "saltar";
    const cuota_min = parseFloat(document.getElementById("edRCuotaMin")?.value);
    const cuota_max = parseFloat(document.getElementById("edRCuotaMax")?.value);
    const errBox = document.getElementById("edRErr");
    if (errBox) errBox.textContent = "";
    if (!nombre) { if (errBox) errBox.textContent = "Ingresa un nombre."; return; }
    const filtro = {};
    if (_nuevaRegla.deportes.size) filtro.deportes = [..._nuevaRegla.deportes];
    if (_nuevaRegla.tipos.size) filtro.tipos = [..._nuevaRegla.tipos];
    if (!isNaN(cuota_min)) filtro.cuota_min = cuota_min;
    if (!isNaN(cuota_max)) filtro.cuota_max = cuota_max;
    await _enviarRegla({ nombre, accion, filtro });
  }

  async function _enviarRegla(body, forzar) {
    const errBox = document.getElementById("edRErr");
    const btn = document.querySelector("[data-ed-action='regla-crear']");
    if (btn) { btn.disabled = true; btn.textContent = "⏳ Evaluando…"; }
    try {
      const payload = forzar ? { ...body, forzar: true } : body;
      const resp = await fetch(`${API_URL}/api/policy`, { method: "POST", headers: apiHeaders(), body: JSON.stringify(payload) });
      const j = await resp.json().catch(() => ({}));
      if (resp.status === 409 && j.error === "holdout_no_positivo") {
        if (errBox) {
          errBox.innerHTML = `⚠️ ${esc(j.detalle || "")} <button class="ed-btn ghost small" data-ed-action="regla-forzar" style="margin-top:6px">Congelar de todos modos</button>`;
          errBox.dataset.pending = JSON.stringify(body);
        }
        return;
      }
      if (!resp.ok || j.error) throw new Error(j.error || `HTTP ${resp.status}`);
      _nuevaRegla = { nombre: "", accion: "saltar", deportes: new Set(), tipos: new Set(), cuota_min: "", cuota_max: "" };
      haptic("success");
      await _cargarReglas(true);
      const sec = document.getElementById("politica");
      if (sec) sec.innerHTML = renderPolitica();
    } catch (e) {
      if (errBox) errBox.textContent = "❌ " + e.message;
      haptic("error");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Congelar regla"; }
    }
  }

  function _renderEvaluador() {
    const p = _evalPick;
    let resultadoHtml = "";
    if (_evalError) resultadoHtml = `<p class="ed-note" style="color:var(--loss)">❌ ${esc(_evalError)}</p>`;
    else if (_evalResultado) {
      const ev = _evalResultado.evaluacion;
      const cls = ev.decision === "saltar" ? "saltar" : ev.decision === "apostar" ? "apostar" : "";
      resultadoHtml = `<div class="ed-decision ${cls}">
        <b>${ev.decision === "saltar" ? "🔴 SALTAR" : ev.decision === "apostar" ? "🟢 APOSTAR" : ev.decision === "neutral" ? "🟡 Neutral" : "⚪ Sin datos"}</b><br>
        ${esc(ev.razon || "")}
        ${ev.decision === "apostar" ? `<br><b>Stake sugerido: ${fmt(ev.stake_sugerido)}</b>` : ""}
      </div>`;
    }
    return `<div class="ed-card">
      <h4>🔍 Consultar un pick</h4>
      <p class="ed-note">¿Qué diría el sistema de este pick, sin registrarlo?</p>
      <div class="ed-form">
        <div><label>Deporte</label><input id="edEDeporte" value="${esc(p.deporte)}" placeholder="Soccer"></div>
        <div><label>Liga</label><input id="edELiga" value="${esc(p.liga)}" placeholder="Opcional"></div>
        <div class="full"><label>Tipo de apuesta</label><input id="edETipo" value="${esc(p.tipo_apuesta)}" placeholder="Total Over 2.5"></div>
        <div><label>Cuota</label><input id="edECuota" type="number" step="0.01" value="${esc(p.cuota)}" placeholder="1.90"></div>
        <div><label>Fecha</label><input id="edEFecha" type="date" value="${esc(p.fecha_partido)}"></div>
        <div><label>Hora</label><input id="edEHora" type="time" value="${esc(p.hora_partido)}"></div>
      </div>
      <button class="ed-btn" style="margin-top:8px" data-ed-action="pick-evaluar">${_evalCargando ? "⏳ Consultando…" : "Consultar"}</button>
      <div style="margin-top:8px">${resultadoHtml}</div>
    </div>`;
  }

  async function _evaluarPick() {
    _evalPick.deporte = document.getElementById("edEDeporte")?.value.trim() || "";
    _evalPick.liga = document.getElementById("edELiga")?.value.trim() || "";
    _evalPick.tipo_apuesta = document.getElementById("edETipo")?.value.trim() || "";
    _evalPick.cuota = document.getElementById("edECuota")?.value.trim() || "";
    _evalPick.fecha_partido = document.getElementById("edEFecha")?.value || "";
    _evalPick.hora_partido = document.getElementById("edEHora")?.value || "";
    if (!(parseFloat(_evalPick.cuota) > 1.0)) {
      _evalError = "Ingresa una cuota decimal mayor que 1."; _evalResultado = null;
      const sec = document.getElementById("politica"); if (sec) sec.innerHTML = renderPolitica();
      return;
    }
    _evalCargando = true; _evalError = null;
    const sec0 = document.getElementById("politica"); if (sec0) sec0.innerHTML = renderPolitica();
    try {
      _evalResultado = await _apiPost("/api/policy/evaluate", _evalPick);
    } catch (e) {
      _evalError = e.message; _evalResultado = null;
    } finally {
      _evalCargando = false;
      const sec = document.getElementById("politica"); if (sec) sec.innerHTML = renderPolitica();
    }
  }

  function renderPolitica() {
    setTimeout(() => { _cargarReglas(false); }, 0);
    return `<div class="section-header">Política <span>pre-apuesta</span></div>
      <div class="ed-card"><h4>⚙️ Configuración activa</h4><div id="edPoliticaConfig">${_renderConfigPolitica()}</div>
        <p class="ed-note">Se ajusta con variables de entorno del bot (STAKE_POLICY_MODE, BANKROLL, KELLY_FRACTION…) — no desde aquí.</p></div>
      ${_renderEvaluador()}
      <div class="ed-card"><h4>🧊 Reglas congeladas</h4><div id="edReglas">${_renderReglas()}</div></div>
      ${_renderNuevaReglaForm()}`;
  }

  // ── Delegación de eventos propia (data-ed-*) ──────────────────────────────────
  document.addEventListener("click", e => {
    const el = e.target.closest("[data-ed-action]");
    if (!el) {
      const toggle = e.target.closest("[data-ed-toggle]");
      if (toggle) {
        const grupo = toggle.dataset.edToggle, valor = toggle.dataset.edValue;
        const set = _nuevaRegla[grupo];
        if (set) { set.has(valor) ? set.delete(valor) : set.add(valor); toggle.classList.toggle("active"); }
      }
      return;
    }
    const act = el.dataset.edAction;
    if (act === "clv-reload") { _cargarClvDetalle(true); return; }
    if (act === "cmp-reload") { haptic("light"); _cargarComparador(); return; }
    if (act === "reglas-reload") { _cargarReglas(true); return; }
    if (act === "regla-crear") { _crearRegla(); return; }
    if (act === "regla-forzar") {
      const box = document.getElementById("edRErr");
      const pending = box?.dataset.pending ? JSON.parse(box.dataset.pending) : null;
      if (pending) _enviarRegla(pending, true);
      return;
    }
    if (act === "regla-toggle") {
      const id = el.dataset.edId, activa = el.dataset.edActiva === "1";
      _apiPost(`/api/policy/${id}/active`, { activa }, "POST")
        .then(() => _cargarReglas(true)).catch(err => alert("❌ " + err.message));
      return;
    }
    if (act === "regla-borrar") {
      const id = el.dataset.edId;
      if (!confirm("¿Borrar esta regla?")) return;
      _apiDelete(`/api/policy/${id}`)
        .then(() => _cargarReglas(true)).catch(err => alert("❌ " + err.message));
      return;
    }
    if (act === "pick-evaluar") { _evaluarPick(); return; }
  });

  // ── Modal de alta/edición: campos opcionales de ventaja real (casa/cierre/mejor) ──
  // openModal/submitBet viven en app.js; aquí solo se ENGANCHA vía delegación propia
  // (no se toca su listener) leyendo/escribiendo los inputs que _extenderModal inserta.
  const _origOpenModal = window.openModal;
  window.openModal = function (rowId) {
    _origOpenModal(rowId);
    _extenderModal(rowId);
  };

  function _extenderModal(rowId) {
    const body = document.querySelector("#gModal .m-body");
    if (!body) return;
    const a = (rowId !== null) ? (_findApuestaByRowId(rowId) || {}) : {};
    const wrap = document.createElement("div");
    wrap.innerHTML = `<details class="ed-fold" style="margin-top:10px">
      <summary>💰 Ventaja real (opcional)</summary>
      <div class="ed-form" style="margin-top:8px">
        <div><label>Casa de apuestas</label><input id="edMCasa" class="m-input" value="${esc(a.casa || "")}" placeholder="Bet365"></div>
        <div><label>Cuota mejor vista</label><input id="edMCuotaMejor" class="m-input" type="number" step="0.01" value="${esc(a.cuota_mejor || "")}" placeholder="2.05"></div>
        <div><label>Casa de la mejor cuota</label><input id="edMCasaMejor" class="m-input" value="${esc(a.casa_mejor || "")}" placeholder="Pinnacle"></div>
        <div><label>Cuota de cierre</label><input id="edMCuotaCierre" class="m-input" type="number" step="0.01" value="${esc(a.cuota_cierre || "")}" placeholder="1.95"></div>
      </div>
      <p class="ed-note">La cuota de cierre es el precio del mercado justo antes de que empiece el partido — cárgala a mano si no tienes captura automática, para medir tu CLV.</p>
    </details>`;
    // `.m-foot` es HERMANO de `.m-body` (no su hijo) — basta con añadir al final
    // de `.m-body`, que ya precede al footer en el DOM.
    body.appendChild(wrap);
  }

  const _origSubmitBet = window.submitBet;
  window.submitBet = async function () {
    // Intercepta el payload justo antes del fetch: como app.js no expone un hook,
    // envolvemos fetch temporalmente para inyectar los campos extra en el body de
    // /api/bets ó /api/bets/:id, sin duplicar la lógica de validación/parlay/edición.
    const casa = document.getElementById("edMCasa")?.value.trim();
    const cuotaMejor = document.getElementById("edMCuotaMejor")?.value.trim();
    const casaMejor = document.getElementById("edMCasaMejor")?.value.trim();
    const cuotaCierre = document.getElementById("edMCuotaCierre")?.value.trim();
    const extra = {};
    if (casa) extra.casa = casa;
    if (cuotaMejor) extra.cuota_mejor = cuotaMejor;
    if (casaMejor) extra.casa_mejor = casaMejor;
    if (cuotaCierre) extra.cuota_cierre = cuotaCierre;

    if (!Object.keys(extra).length) return _origSubmitBet();

    const originalFetch = window.fetch;
    window.fetch = function (url, opts) {
      if (opts && typeof url === "string" && url.includes("/api/bets") && opts.body) {
        try {
          const body = JSON.parse(opts.body);
          Object.assign(body, extra);
          opts = { ...opts, body: JSON.stringify(body) };
        } catch (_) { /* body no era el payload de la apuesta: no tocar */ }
      }
      return originalFetch(url, opts);
    };
    try {
      await _origSubmitBet();
    } finally {
      window.fetch = originalFetch;
    }
  };
})();
