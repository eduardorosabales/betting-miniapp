# betting-miniapp

Mini-App web (Telegram WebApp) del ecosistema **Betting Stats**. Superficie visual
embebida en Telegram que consume la API HTTP del bot (`betting-stats-bot`).

## Stack

- **HTML5 + JavaScript vanilla (ES2020+)** — sin framework SPA.
- **CSS embebido** en `<style>` — sin Tailwind ni preprocesadores.
- **Chart.js** (vía CDN cdnjs) para gráficos.
- **Telegram WebApp SDK** (`telegram-web-app.js`) — provee `window.Telegram.WebApp`.
- **Sin build step**: lo que se commitea es lo que se sirve.

## Estructura

```
betting-miniapp/
├── index.html   ← toda la app (markup + estilos + lógica)
├── assets/      ← favicon-32.png, apple-touch-icon-180.png
└── .gitignore
```

## Configuración

No tiene variables de entorno propias (es estática). La config viaja por dos vías:

1. **Hardcoded en `index.html`**: la URL del backend del bot
   (`https://<servicio>.up.railway.app`). Cambiarla requiere PR + redeploy.
2. **Provista por Telegram en runtime**: `window.Telegram.WebApp.initData`.

## Autenticación

- **Preferida**: header `X-Telegram-Init-Data` (HMAC-SHA256 validado server-side).
- **Legacy**: header `X-Api-Key` con `MINIAPP_SECRET` (en retiro — ver `TODO-2`).

Los gates de escritura aceptan cualquiera de los dos.

## Seguridad (repo PÚBLICO)

- **Prohibido** hardcodear tokens, claves de API o secretos (`INV-MINI-10`).
- Almacenamiento cliente **solo** en `sessionStorage`; `localStorage` prohibido (`INV-MINI-04`).
- Sin eventos inline en el HTML — todo por delegación de eventos (`INV-MINI-13`).
- CSP en `<meta>` enumera exactamente los orígenes consumidos (`INV-MINI-09`).

## Hosting

Servido por **GitHub Pages** desde este repositorio público (rama `main`).

- **URL canónica:** `https://eduardorosabales.github.io/betting-miniapp/`
- Configurada como `web_app` en **BotFather** (botón/menú de la Mini-App del bot).
- Cualquier cambio en `main` se publica automáticamente vía GitHub Pages.

> Si la URL del backend cambia, actualizar la constante `API_URL` en `index.html`
> (no hay variables de entorno — es estático).

## Despliegue

Sin build: `git push` a la rama de despliegue y el hosting estático sirve `index.html`.
