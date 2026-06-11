    // Anti-clickjacking (H-02, pentest 2026-06-06). GitHub Pages no permite enviar
    // X-Frame-Options ni CSP frame-ancestors por HTTP, y `frame-ancestors` en un
    // <meta> es ignorado por los navegadores. Este frame-buster es la defensa real:
    // si la página se carga embebida en un <iframe> de otro origen, rompe el marco.
    //
    // EXCEPCIÓN OBLIGATORIA — Telegram Desktop / Web (fix 2026-06-11):
    // contra lo que se creía, Telegram NO siempre usa un webview propio. Solo el móvil
    // (iOS/Android) carga la Mini-App como documento top vía `TelegramWebviewProxy`
    // (window.top === window.self). Telegram **Desktop** y **Web** la cargan DENTRO de
    // un <iframe> + postMessage (ver telegram-web-app.js: `isIframe = window != window.parent`),
    // por lo que window.top !== window.self y el frame-buster se disparaba: al ser el
    // padre cross-origin, `window.top.location = …` lanzaba SecurityError → la rama catch
    // ocultaba todo → la Mini-App "no abría" en la PC (sí en el móvil). Por eso NO
    // frame-busteamos cuando la app fue lanzada por Telegram, detectado por los params
    // `tgWebApp*` que Telegram añade a la URL (Desktop/Web) o el proxy nativo (móvil).
    (function () {
      try {
        var href = String(window.location.href);
        var launchedByTelegram =
          /[#?&]tgWebApp[A-Za-z]/.test(href) ||
          typeof window.TelegramWebviewProxy !== "undefined" ||
          (window.external && "notify" in window.external);
        if (!launchedByTelegram && window.top !== window.self) {
          window.top.location = window.self.location.href;
        }
      } catch (e) {
        // Cross-origin y NO lanzada por Telegram: ni siquiera podemos leer/escribir
        // top.location → estamos embebidos en un sitio ajeno. Ocultamos como último recurso.
        document.documentElement.style.display = "none";
      }
    })();

    // Aplica no-blur antes del primer paint para evitar backdrop-filter en Linux/Desktop
    (function () {
      var ua = navigator.userAgent;
      if ((ua.includes("Linux") && !ua.includes("Android")) || ua.includes("Windows NT")) {
        document.documentElement.classList.add("no-blur");
      }
    })();
