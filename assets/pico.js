/* pico.js — "Récord": máximo neto histórico del canal, capital usado, días en lograrlo y
   avisos de asegurar ganancias / cerrar el mes (INV-MINI-39, INV-XCUT-19).

   Carga DESPUÉS de app.js como <script> clásico (sin build step, INV-MINI-01) y reutiliza sus
   const/function de top-level (esc, fmt, fmts, mesLabel, DATA, ADVANCED, SECTION_LABELS,
   _RENDER_FNS, showTab, haptic). Eventos propios por delegación con `data-pc-*` (INV-MINI-13).

   Presentación pura (INV-MINI-02): toda la lógica (pico, capital, estados, textos de los avisos)
   vive en el bot (peak_analytics.py) y llega ya calculada en `DATA.pico_historico`. Aquí solo se
   pinta. Tolera backend viejo sin el campo (INV-MINI-06). */
(function () {
  "use strict";

  if (!ADVANCED.includes("pico")) ADVANCED.push("pico");
  SECTION_LABELS.pico = "Récord";
  _RENDER_FNS.pico = () => renderPico();

  const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const fechaCorta = iso => {
    if (!iso || iso.length < 10) return "—";
    return `${parseInt(iso.slice(8, 10), 10)} ${MESES[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}`;
  };
  const pct0 = n => n == null ? "—" : `${(n * 100).toFixed(0)}%`;
  const pct1 = n => n == null ? "—" : `${(n * 100).toFixed(1)}%`;

  const VEREDICTO = {
    parar:      { col: "var(--loss)", cls: "stop", icono: "🛑", titulo: "Asegura ganancias" },
    precaucion: { col: "#F5A623",     cls: "warn", icono: "🟡", titulo: "Precaución" },
    seguir:     { col: "var(--win)",  cls: "ok",   icono: "🟢", titulo: "Sin alertas" },
  };

  // ── Curva de neto acumulado con el pico marcado (SVG inline, sin librerías) ──────────
  function _curvaSvg(curva, pico) {
    if (!curva || curva.length < 2) return "";
    const W = 320, H = 110, P = 6;
    const ys = curva.map(p => p.n);
    const lo = Math.min(0, ...ys), hi = Math.max(0, ...ys);
    const span = (hi - lo) || 1;
    const x = i => P + (i / (curva.length - 1)) * (W - 2 * P);
    const y = v => H - P - ((v - lo) / span) * (H - 2 * P);
    const pts = curva.map((p, i) => `${x(i).toFixed(1)},${y(p.n).toFixed(1)}`).join(" ");
    const area = `${x(0).toFixed(1)},${y(0).toFixed(1)} ${pts} ${x(curva.length - 1).toFixed(1)},${y(0).toFixed(1)}`;
    let iPico = -1;
    if (pico) iPico = curva.findIndex(p => p.f === pico.fecha);
    const marca = iPico >= 0
      ? `<circle cx="${x(iPico).toFixed(1)}" cy="${y(curva[iPico].n).toFixed(1)}" r="4.5" fill="var(--win)" stroke="var(--card)" stroke-width="2"/>` : "";
    const last = curva[curva.length - 1];
    return `<svg class="pc-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Curva de neto acumulado con el máximo histórico marcado" preserveAspectRatio="none">
      <line x1="${P}" x2="${W - P}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" stroke="var(--border)" stroke-dasharray="3 3"/>
      <polygon points="${area}" fill="var(--accent)" opacity=".10"/>
      <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${marca}
      <circle cx="${x(curva.length - 1).toFixed(1)}" cy="${y(last.n).toFixed(1)}" r="3" fill="var(--accent)"/>
    </svg>`;
  }

  function _avisosHtml(avisos) {
    return (avisos || []).map(a =>
      `<div class="pc-alert ${esc(a.nivel)}"><div class="pc-ico">${esc(a.icono)}</div>
         <div><div class="pc-at">${esc(a.titulo)}</div><div class="pc-tx">${esc(a.texto)}</div></div></div>`).join("");
  }

  // ── Banner compacto para la pestaña Resumen (solo si hay algo que decir) ───────────────
  window.picoBanner = function () {
    const p = DATA && DATA.pico_historico;
    if (!p || !p.avisos || !p.avisos.length) return "";
    const v = VEREDICTO[p.veredicto] || VEREDICTO.seguir;
    if (p.veredicto === "seguir") return "";
    const top = p.avisos.find(a => a.nivel === "stop") || p.avisos.find(a => a.nivel === "warn") || p.avisos[0];
    return `<div class="pc-banner ${v.cls}" data-pc-go="pico" role="button" tabindex="0">
      <div class="pc-ico">${esc(top.icono)}</div>
      <div style="min-width:0"><div class="pc-at">${esc(top.titulo)}</div>
      <div class="pc-tx">${esc(top.texto)}</div><div class="pc-more">Ver récord y retiro ›</div></div></div>`;
  };

  function renderPico() {
    const p = DATA && DATA.pico_historico;
    if (!p) return '<div class="empty">Sin datos de récord todavía (o el bot aún no está actualizado).</div>';
    const v = VEREDICTO[p.veredicto] || VEREDICTO.seguir;
    const pk = p.pico, ac = p.actual, m = p.mes;

    const cabecera = `<div class="section-header">Récord y <span>retiro</span></div>
      <div class="pc-verdict ${v.cls}"><div class="pc-vico">${v.icono}</div>
        <div><div class="pc-vt" style="color:${v.col}">${v.titulo}</div>
        <div class="pc-vs">${p.veredicto === "parar" ? "Hay una señal para proteger la ganancia." :
          p.veredicto === "precaucion" ? "Revisa los avisos antes de seguir apostando." :
          "Ninguna regla de protección activa ahora mismo."}</div></div></div>`;

    let caso = "";
    if (pk) {
      const cap = pk.capital_necesario;
      caso = `<div class="card pc-case">
        <div class="card-title">🏆 Caso de referencia — máximo neto histórico</div>
        <div class="pc-big green" title="${fmts(pk.neto)}">${fmts(pk.neto)}</div>
        <p class="pc-story">El canal llegó a <b>${fmts(pk.neto)}</b> de ganancia neta el <b>${fechaCorta(pk.fecha)}</b>,
          usando solo <b>${fmt(cap)}</b> de capital, en <b>${pk.dias} días</b>
          (${pk.apuestas} apuestas${pk.retorno_capital ? ` · <b>${pk.retorno_capital.toFixed(2)}×</b> el capital` : ""}).</p>
        <div class="pc-kpis">
          <div class="pc-kpi"><div class="l">Capital necesario</div><div class="v">${fmt(cap)}</div><div class="s">exposición máx. ${fmt(pk.exposicion_max)}</div></div>
          <div class="pc-kpi"><div class="l">Tiempo</div><div class="v">${pk.dias} d</div><div class="s">${pk.dias_activos} con apuestas</div></div>
          <div class="pc-kpi"><div class="l">Winrate</div><div class="v">${pct1(pk.winrate)}</div><div class="s">${pk.wins}W · ${pk.losses}L</div></div>
          <div class="pc-kpi"><div class="l">Rendimiento</div><div class="v ${pk.yield >= 0 ? "green" : "red"}">${pk.yield == null ? "—" : (pk.yield >= 0 ? "+" : "") + pct1(pk.yield)}</div><div class="s">sobre ${fmt(pk.apostado)} apostado</div></div>
        </div>
        ${pk.desde_minimo ? `<p class="pc-note">Desde el piso del ${fechaCorta(pk.desde_minimo.fecha)} (${fmts(pk.desde_minimo.neto_piso)}): <b>+${fmt(pk.desde_minimo.subida)}</b> en ${pk.desde_minimo.dias} días.</p>` : ""}
        ${_curvaSvg(p.curva, pk)}
        <div class="pc-legend"><span><i class="pc-dot" style="background:var(--win)"></i>Máximo</span><span><i class="pc-dot" style="background:var(--accent)"></i>Hoy</span><span>${fechaCorta((p.curva[0] || {}).f)} → ${fechaCorta((p.curva[p.curva.length - 1] || {}).f)}</span></div>
      </div>`;
    } else {
      caso = `<div class="card"><div class="pc-tx">Aún no hay ganancia neta positiva acumulada: no existe un récord que proteger todavía.</div></div>`;
    }

    let hoy = "";
    if (pk && ac) {
      const pct = Math.max(0, Math.min(1, ac.retenido));
      const etq = { maximo: "En el máximo", cerca: "Cerca del máximo", retroceso: "Retroceso", profundo: "Retroceso profundo" }[ac.estado] || "";
      const col = ac.estado === "maximo" ? "var(--win)" : ac.estado === "cerca" ? "var(--accent)" : ac.estado === "retroceso" ? "#F5A623" : "var(--loss)";
      hoy = `<div class="card">
        <div class="card-title">📍 Dónde estás hoy</div>
        <div class="pc-row"><span>Neto actual</span><b class="${ac.neto >= 0 ? "green" : "red"}">${fmts(ac.neto)}</b></div>
        <div class="pc-bar"><div class="pc-bar-fill" style="width:${(pct * 100).toFixed(1)}%;background:${col}"></div></div>
        <div class="pc-row"><span style="color:${col};font-weight:700">${etq}</span><span>${pct0(ac.retenido)} del pico</span></div>
        ${ac.estado === "maximo"
          ? `<p class="pc-note">Retiro de referencia (${pct0(p.fraccion_retiro)} de la ganancia vigente): <b>${fmt(ac.retiro_sugerido)}</b>.</p>`
          : `<p class="pc-note">Para igualar el récord faltan <b>${fmt(ac.retroceso)}</b> · el pico fue hace ${ac.dias_desde_pico} días.</p>`}
        ${p.peor_retroceso && p.peor_retroceso.monto > 0
          ? `<p class="pc-note">Peor retroceso histórico del canal: <b>${fmt(p.peor_retroceso.monto)}</b> (${pct0(p.peor_retroceso.pct)} de un pico). Es lo que puede devolver una ganancia no retirada.</p>` : ""}
      </div>`;
    }

    const estMes = {
      meta: ["💰 Meta del mes alcanzada", "var(--loss)"], cerca_meta: ["🎯 Cerca de la meta del mes", "#F5A623"],
      record: ["🏆 Mes récord", "var(--win)"], cerca_record: ["🎯 Cerca del récord", "var(--accent)"],
      devolviendo: ["🔻 Devolviendo", "#F5A623"], positivo: ["✅ En positivo", "var(--win)"],
      negativo: ["🧊 En negativo", "var(--loss)"], sin_datos: ["Sin apuestas este mes", "var(--text-3)"],
    }[m.estado] || ["", "var(--text-3)"];
    // Meta del mes = pico neto promedio de los meses cerrados (INV-BIZ-49): al acercarse, retirar y parar.
    let meta = "";
    if (m.pico_medio) {
      const pm = Math.max(0, Math.min(1, m.pct_pico_medio || 0));
      const col = (m.pct_pico_medio || 0) >= 0.9 ? "var(--loss)" : (m.pct_pico_medio || 0) >= 0.7 ? "#F5A623" : "var(--accent)";
      const rg = m.regla;
      meta = `<div class="pc-meta">
        <div class="pc-row"><span>🎯 Meta del mes <small style="color:var(--text-3)">(pico medio de ${m.meses_referencia} meses)</small></span><b>${fmt(m.pico_medio)}</b></div>
        <div class="pc-bar"><div class="pc-bar-fill" style="width:${(pm * 100).toFixed(1)}%;background:${col}"></div></div>
        <div class="pc-row"><span style="color:${col};font-weight:700">${pct0(m.pct_pico_medio)} de la meta</span><span>${(m.falta_pico_medio || 0) > 0 ? `faltan ${fmt(m.falta_pico_medio)}` : "meta superada"}</span></div>
        <p class="pc-note">Al llegar a ~${pct0(0.9)} de la meta: retira (referencia ${pct0(p.fraccion_retiro)} ≈ <b>${fmt(m.retiro_sugerido)}</b>) y no apuestes más hasta <b>${esc(m.siguiente_mes)}</b>.</p>
        ${rg && rg.alcanzaron ? `<p class="pc-note">En tus ${rg.meses} meses cerrados, ${rg.alcanzaron} llegaron a ${fmt(rg.umbral)}. Parar al alcanzarlo habría dado <b>${fmt(rg.neto_con_regla)}</b> frente a <b>${fmt(rg.neto_real)}</b> reales <i>(calculado sobre el mismo historial: ilustra la regla, no la garantiza)</i>.</p>` : ""}
      </div>`;
    }

    // Cómo se logró el pico en cada mes cerrado (tabla + perfil típico).
    const det = (p.meses_detalle || []).slice().reverse();
    const pf = p.perfil_pico_mes;
    const filas = det.map(x => x.dia_pico
      ? `<tr><td>${esc(x.etiqueta)}</td><td class="n">${fmt(x.pico)}</td><td class="n">día ${x.dia_del_mes}</td><td class="n">${x.dias} d · ${x.apuestas}</td><td class="n">${pct0(x.winrate)}</td><td class="n">${fmt(x.capital_necesario)}</td><td class="n ${x.neto_cierre >= 0 ? "green" : "red"}">${fmts(x.neto_cierre)}</td></tr>`
      : `<tr class="low"><td>${esc(x.etiqueta)}</td><td class="n" colspan="6">nunca estuvo en positivo</td></tr>`).join("");
    const como = det.length ? `<div class="card">
      <div class="card-title">🧭 Cómo se logró el pico en cada mes</div>
      ${pf ? `<p class="pc-note" style="margin-top:0">Pico típico: hacia el <b>día ${pf.dia_del_mes.toFixed(0)}</b> del mes, en ~<b>${pf.dias.toFixed(0)} días</b> y ~<b>${pf.apuestas.toFixed(0)} apuestas</b>, con winrate ~<b>${pct0(pf.winrate)}</b> y ~<b>${fmt(pf.capital_necesario)}</b> de capital (mediana de ${pf.n} meses).</p>` : ""}
      <div class="pc-scroll"><table class="ed-table pc-table"><thead><tr><th>Mes</th><th class="n">Pico</th><th class="n">Cuándo</th><th class="n">Tiempo · apuestas</th><th class="n">WR</th><th class="n">Capital</th><th class="n">Cerró</th></tr></thead><tbody>${filas}</tbody></table></div>
      <p class="pc-note">«Cerró» es lo que quedó al final del mes: la diferencia con el pico es lo que se devolvió por seguir apostando.</p>
    </div>` : "";

    const mes = `<div class="card">
      <div class="card-title">📅 ${esc(mesLabel(m.clave))} — estado del mes</div>
      <div class="pc-row"><span style="color:${estMes[1]};font-weight:700">${estMes[0]}</span><b class="${m.neto >= 0 ? "green" : "red"}">${fmts(m.neto)}</b></div>
      ${meta}
      <div class="pc-kpis">
        <div class="pc-kpi"><div class="l">Pico del mes</div><div class="v">${fmt(m.pico)}</div><div class="s">${m.devuelto > 0 ? `devuelto ${fmt(m.devuelto)} (${pct0(m.pct_devuelto)})` : "sin devolver"}</div></div>
        <div class="pc-kpi"><div class="l">Mejor mes previo</div><div class="v">${m.mejor_previo ? fmt(m.mejor_previo.neto) : "—"}</div><div class="s">${m.mejor_previo ? esc(mesLabel(m.mejor_previo.mes)) : "sin historial"}</div></div>
        <div class="pc-kpi"><div class="l">Mes típico bueno</div><div class="v">${m.tipico_positivo != null ? fmt(m.tipico_positivo) : "—"}</div><div class="s">mediana de meses +</div></div>
        <div class="pc-kpi"><div class="l">Capital del mes</div><div class="v">${m.capital_necesario ? fmt(m.capital_necesario) : "—"}</div><div class="s">${m.retorno_capital ? m.retorno_capital.toFixed(2) + "× el capital" : m.apuestas + " apuestas"}</div></div>
      </div>
      ${p.historial_meses && p.historial_meses.devolucion_media != null
        ? `<p class="pc-note">En ${p.historial_meses.n} meses cerrados, el canal devolvió de media <b>${pct0(p.historial_meses.devolucion_media)}</b> de su pico mensual antes de cerrar.</p>` : ""}
    </div>`;

    const avisos = (p.avisos && p.avisos.length)
      ? `<div class="card"><div class="card-title">🔔 Avisos</div>${_avisosHtml(p.avisos)}</div>` : "";

    return `${cabecera}${avisos}${mes}${como}${caso}${hoy}
      <div class="explainer">
        <strong>Cómo leerlo:</strong> el <em>máximo</em> es el mayor neto acumulado (al cierre de cada día) de todo el historial; el <em>capital necesario</em> es el dinero que había que tener disponible para sostener las apuestas hasta ese punto (dinero vivo menos balance ya realizado). Los avisos son una regla de disciplina del bankroll —asegurar ganancias en máximos y cerrar meses récord—, <strong>no una predicción</strong>: un máximo no vuelve más probable una mala racha, pero la ganancia que no se retira sí puede devolverse.
        ${p.muestra_suficiente ? "" : `<br>⚠️ Muestra baja (${p.n_resueltas} resueltas &lt; 30): cifras orientativas.`}
      </div>`;
  }

  // ── Delegación propia (data-pc-*) ───────────────────────────────────────────────────
  document.addEventListener("click", e => {
    const el = e.target.closest("[data-pc-go]");
    if (!el) return;
    haptic("light");
    showTab(el.dataset.pcGo);
  });
  document.addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const el = e.target.closest && e.target.closest("[data-pc-go]");
    if (!el) return;
    e.preventDefault();
    showTab(el.dataset.pcGo);
  });
})();
