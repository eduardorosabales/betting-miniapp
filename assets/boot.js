    // Aplica no-blur antes del primer paint para evitar backdrop-filter en Linux/Desktop
    (function () {
      var ua = navigator.userAgent;
      if ((ua.includes("Linux") && !ua.includes("Android")) || ua.includes("Windows NT")) {
        document.documentElement.classList.add("no-blur");
      }
    })();
