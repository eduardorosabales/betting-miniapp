# Ciberseguridad — extracto para `betting-miniapp`

> Extracto **verbatim** del master `CIBERSEGURIDAD.md` (raíz del workspace, fuente canónica).
> Reglas comunes + la sección específica de este repo. Roadmap, hallazgos (§7/§8) y recursos (§10) viven solo en el master.

## Filosofía (§0)
---

## 0. Filosofía: cómo pensamos la seguridad

No buscamos "blindaje perfecto" de un día para otro. Buscamos **subir el costo del ataque**
en cada capa, de forma incremental, para que a un atacante no le valga la pena y para que un
error humano no se convierta en un desastre. Tres principios rectores:

1. **Defensa en profundidad.** Si una capa falla (ej. el middleware), otra capa detiene el ataque
   (la verificación en la API). Nunca confiar en un solo control.
2. **Mínimo privilegio.** Cada token, clave, rol y servicio tiene SOLO los permisos que necesita,
   ni uno más. Una clave filtrada debe causar el menor daño posible.
3. **Asumir la brecha (zero trust).** Toda entrada es hostil hasta validarla. Todo secreto puede
   filtrarse, así que debe poder rotarse. Toda sesión puede robarse, así que debe expirar.

## Gestión de secretos (§2)
---

## 2. Gestión de secretos (la regla #1)

La causa más común de incidentes reales es un **secreto filtrado en git** o en logs. Aquí concentramos
el mayor esfuerzo.

### ✅ Acciones obligatorias

- **Nunca** poner claves, tokens o contraseñas en el código fuente. Siempre en variables de entorno.
- **`.gitignore` debe excluir TODO archivo de secretos.** Mínimo: `.env`, `.env.*`, `*.pem`, `*.key`,
  `dev.db`, `*.sqlite`. (Ver hallazgo crítico en §8 — esto NO está cubierto hoy en starlinkapp.)
- **`.env.example`** sí se versiona, con los nombres de las claves pero **valores vacíos o falsos**.
  starlinkapp ya lo hace bien.
- En producción (Railway), los secretos viven en el **gestor de variables del panel**, nunca en archivos.
- **Rotación:** si sospechas que un secreto se filtró, **rótalo de inmediato** (no "después"). Rotación
  programada recomendada: claves de pago y `NEXTAUTH_SECRET` cada 6-12 meses; `BACKUP_AES_KEY` anual
  (con mapeo histórico, ya documentado en `betting-stats-bot/SECURITY.md`).
- En Next.js: solo el prefijo `NEXT_PUBLIC_` se expone al navegador. **Cualquier secreto SIN ese prefijo.**
  Revisa que ninguna clave de pago lleve `NEXT_PUBLIC_` por error (los `PUBLIC_KEY`/`CLIENT_ID` públicos sí van).

### 🔍 Detección de fugas

- Antes de cada `git push`, escanear con una herramienta de secret-scanning:
  - **Gitleaks** (`gitleaks detect`) o **TruffleHog** — gratis, corren en local y en CI.
  - GitHub **Secret Scanning** (gratis en repos): actívalo en `eduardorosabales/starlinkapp`.
- Si un secreto **ya llegó a GitHub**, no basta con borrarlo en un commit nuevo: queda en el historial.

## Dependencias y cadena de suministro (§5)
---

## 5. Dependencias y cadena de suministro

Una librería vulnerable es una puerta abierta aunque tu código sea perfecto.

- **JS (starlinkapp):** corre `npm audit` regularmente; arregla vulnerabilidades altas/críticas.
  Activa **Dependabot** en GitHub para alertas y PRs automáticos de actualización.
- **Python (bots):** usa `pip-audit` para escanear `requirements.txt`. Mantén versiones fijadas (ya lo haces).
- **No instales paquetes random.** Verifica nombre exacto (cuidado con *typosquatting*), popularidad y

## Despliegue y operación (§6)
---

## 6. Despliegue y operación (Railway, GitHub)

- **GitHub:** activa Secret Scanning + Dependabot. Protege `main` si en algún proyecto adoptas PRs
  (en starlinkapp el flujo es directo a main por decisión tuya — ver [[starlinkapp-git-github]] — está bien,
  pero compénsalo con escaneo de secretos antes de push).
- **2FA obligatorio** en tu cuenta de GitHub, Railway, Stripe, PayPal y correo. Es la defensa más barata
  y efectiva contra el secuestro de cuentas.
- **HTTPS siempre** (Railway lo da). Nunca tráfico de pago/login en HTTP.
- **Principio de mínimo privilegio en tokens de plataforma:** el PAT de GitHub
  (ver [[starlinkapp-git-github]]) debería tener solo el scope necesario y caducidad, no acceso total

## Checklist antes de cada despliegue / push (§9)
---

## 9. Checklist antes de cada despliegue / push

Copia y pega esto antes de subir cambios:

```
[ ] ¿Ningún secreto en el código ni en los commits? (gitleaks / revisión)
[ ] ¿.env y archivos sensibles están en .gitignore?
[ ] ¿Todos los endpoints nuevos verifican auth Y rol Y ownership?
[ ] ¿Las entradas del usuario se validan en el servidor?
[ ] ¿Los webhooks de pago verifican firma y son idempotentes?
[ ] ¿npm audit / pip-audit sin vulnerabilidades críticas?
[ ] ¿Los secretos de prod están en Railway, no en archivos?

## betting-miniapp — específico (cliente estático público)
- Riesgo principal (§1): **XSS** y **datos expuestos en el cliente**. El repo es **público**:
  cero secretos/credenciales en el HTML/JS (coherente con `INV-MINI-10/11`).
- **XSS:** escapar todo dato renderizado; sin `eval`; CSP enumerando orígenes externos (`INV-MINI-09`).
- Almacenamiento en `sessionStorage` por defecto; `localStorage` prohibido salvo la excepción acotada (`INV-MINI-04`).
- La lógica/validación de negocio vive en el bot (`/api/*`); el frontend valida por UX, el servidor por seguridad.
