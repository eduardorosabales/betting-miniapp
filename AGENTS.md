# `betting-miniapp` — Reglas del proyecto (AGENTS.md canónico)

Mini-App web (Telegram WebApp) del ecosistema **Betting Stats**. Las **reglas globales** viven en
`~/.gemini/AGENTS.md` / `~/.claude/CLAUDE.md` y **no se repiten aquí**. Gobierno y seguridad
(`CIBERSEGURIDAD.md`) en la raíz del workspace.

## Identidad

- **Qué es:** superficie visual embebida en Telegram WebApp. **Solo presenta y formatea**; toda la
  lógica de negocio vive en `betting-stats-bot` y se consume vía `/api/*`.
- **Stack:** HTML5 + CSS embebido + **JavaScript vanilla** (sin framework SPA) + Chart.js (CDN) +
  `telegram-web-app.js`. **Sin build step**: lo que se commitea es lo que se sirve.
- **Visibilidad:** **Public** ⇒ prohibición absoluta de credenciales hardcodeadas (`INV-MINI-10/11`).
- **Hosting:** **GitHub Pages** desde `main` → `https://eduardorosabales.github.io/betting-miniapp/`
  (configurado como `web_app` en BotFather).
- **Storage cliente:** `sessionStorage` por defecto; `localStorage` **prohibido** salvo la excepción
  acotada del caché IA (`INV-MINI-04`).

## Reglas del proyecto (índice de invariantes)

Decisiones cerradas; si una propuesta contradice un invariante, **avisar y pedir confirmación**.
Texto íntegro (verbatim del antiguo `instrucciones.txt`) en:

- @docs/agent-rules/miniapp.md — stack (§2.2), arquitectura (§3.2), `INV-MINI-01..18`, config (§6.3), resiliencia (§7.2)
- @docs/agent-rules/cross-repo.md — `INV-XCUT-01, 02, 07, 09` (contrato `/api/*`, regex `Total O/U`, resolución de selección, campo `neto_mensual`)
- @docs/agent-rules/ciberseguridad.md — extracto de seguridad (fuente canónica: `CIBERSEGURIDAD.md` en la raíz); repo **público** → cero secretos, foco XSS

## Restricciones explícitas

- ❌ No introducir un **build step** (Webpack/Vite/esbuild) ni un framework SPA (`INV-MINI-01`).
- ❌ No usar `localStorage` (vector XSS persistente) salvo la única excepción documentada del caché IA (`INV-MINI-04`).
- ❌ No introducir **credenciales hardcodeadas** ni archivos `.env`/sesiones en el repo (es **público**) (`INV-MINI-10/11`).
- ❌ No usar **eventos inline** en el HTML: todo por delegación de eventos (`INV-MINI-13`).
- ❌ No cambiar campos/tipos/endpoints del contrato `/api/*` sin coordinar con `betting-stats-bot` (`INV-MINI-06`/`INV-XCUT-01`).
- ❌ No mover la media query de escritorio (`@media(min-width:768px)`) fuera del final del `<style>` (`INV-MINI-12`).

## Mantenimiento

Al cerrar una decisión en producción, **registra proactivamente** el `INV-MINI-NN` (o el `INV-XCUT-NN`
correspondiente) en `docs/agent-rules/`, sin pedir confirmación para ese registro.
