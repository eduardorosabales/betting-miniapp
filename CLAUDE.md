@AGENTS.md

# Notas exclusivas de Claude Code — `betting-miniapp`

Comandos / flujo frecuentes:
- **Sin build:** se edita `index.html`, se hace commit y GitHub Pages lo sirve. No hay `npm install`.
- Previsualizar local: `python -m http.server 8000` y abrir `http://localhost:8000` (la app degrada con banner si no se abre desde Telegram).
- URL de producción: `https://eduardorosabales.github.io/betting-miniapp/`.
- Antes de `git push`: `git remote get-url origin` → debe ser `…/betting-miniapp.git` (repo **público**: revisar que no entren secretos).
