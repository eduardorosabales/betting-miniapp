    // Anti-clickjacking (H-02, pentest 2026-06-06). GitHub Pages no permite enviar
    // X-Frame-Options ni CSP frame-ancestors por HTTP, y `frame-ancestors` en un
    // <meta> es ignorado por los navegadores. Este frame-buster es la defensa real:
    // si la página se carga embebida en un <iframe> de otro origen, rompe el marco.
    // Telegram abre la Mini-App en su propio WebView (no en un iframe ajeno), así que
    // no afecta el flujo legítimo.
    (function () {
      try {
        if (window.top !== window.self) {
          window.top.location = window.self.location.href;
        }
      } catch (e) {
        // Cross-origin: ni siquiera podemos leer top.location → estamos embebidos
        // en un sitio ajeno. Ocultamos el contenido como último recurso.
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
