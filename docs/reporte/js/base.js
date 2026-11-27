// Utilidades compartidas por todas las gráficas del reporte: SVG, formato, escalas, colores,
// tooltip, revelado al hacer scroll, contadores animados y pasos de scrollytelling.
// Todo queda en window.R para que graficas.js, mapa.js y reporte.js lo usen sin build.
(() => {
  const svgNS = "http://www.w3.org/2000/svg";
  const sinMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const el = (tag, attrs = {}, texto) => {
    const n = document.createElementNS(svgNS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) n.setAttribute(k, v);
    if (texto !== undefined) n.textContent = texto;
    return n;
  };
  const fmt = (n, d = 0) => n.toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = (n, d = 1) => `${fmt(n, d)} %`;
  const css = nombre => getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();

  // Escalas
  const lineal = ([d0, d1], [r0, r1]) => v => r0 + (v - d0) / (d1 - d0 || 1) * (r1 - r0);
  const logaritmica = ([d0, d1], [r0, r1]) => v => r0 + (Math.log(Math.max(v, d0)) - Math.log(d0)) / (Math.log(d1) - Math.log(d0) || 1) * (r1 - r0);

  // Rampa de calor: interpola entre los colores --calor-0 … --calor-5
  const hexARgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  let paradas = null;
  const calor = t => {
    paradas ??= [0, 1, 2, 3, 4, 5].map(i => hexARgb(css(`--calor-${i}`)));
    t = Math.min(1, Math.max(0, t));
    const x = t * (paradas.length - 1), i = Math.min(paradas.length - 2, Math.floor(x)), f = x - i;
    const [a, b] = [paradas[i], paradas[i + 1]];
    return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(",")})`;
  };

  // Tooltip único para todo el documento
  const tip = document.createElement("div");
  tip.className = "tooltip"; tip.setAttribute("role", "status"); tip.setAttribute("aria-live", "polite");
  document.addEventListener("DOMContentLoaded", () => document.body.append(tip));
  const tooltip = {
    mostrar(html, x, y) {
      tip.innerHTML = html; tip.classList.add("visible");
      const w = tip.offsetWidth, h = tip.offsetHeight;
      let left = x + 14, top = y - h - 12;
      if (left + w > innerWidth - 8) left = x - w - 14;
      if (left < 8) left = 8;
      if (top < 56) top = y + 18;
      tip.style.left = `${left}px`; tip.style.top = `${top}px`;
    },
    ocultar() { tip.classList.remove("visible"); },
  };
  addEventListener("scroll", () => tooltip.ocultar(), { passive: true });

  // Ejecuta fn la primera vez que el elemento entra a la pantalla
  const alVer = (nodo, fn, umbral = .25) => {
    if (sinMovimiento || !("IntersectionObserver" in window)) return fn();
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { obs.disconnect(); fn(); } }, { threshold: umbral });
    obs.observe(nodo);
  };

  // Cuenta desde 0 hasta el valor que trae el texto del elemento
  const contar = (nodo, dur = 1500) => {
    const texto = nodo.textContent.trim(), meta = parseFloat(texto.replace(/,/g, "")), dec = (texto.split(".")[1] || "").replace(/\D/g, "").length;
    const sufijo = texto.replace(/^[\d.,]+/, "");
    if (sinMovimiento || isNaN(meta)) return;
    nodo.textContent = fmt(0, dec) + sufijo;
    alVer(nodo, () => {
      const t0 = performance.now();
      const tic = t => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
        nodo.textContent = fmt(meta * e, dec) + sufijo;
        if (k < 1) requestAnimationFrame(tic); else nodo.textContent = texto;
      };
      requestAnimationFrame(tic);
    }, .6);
  };

  // Botones segmentados: devuelve un control con valor y aviso de cambio
  const segmentado = (cont, opciones, inicial, alCambiar) => {
    cont.classList.add("segmentado"); cont.setAttribute("role", "group");
    const botones = opciones.map(([valor, texto]) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = texto; b.dataset.valor = valor;
      b.setAttribute("aria-pressed", String(valor === inicial));
      b.addEventListener("click", () => poner(valor, true));
      cont.append(b);
      return b;
    });
    function poner(valor, avisar) {
      botones.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.valor === String(valor))));
      if (avisar) alCambiar(valor);
    }
    return { poner };
  };

  // Scrollytelling: activa cada paso al cruzar la mitad de la pantalla y llama a etapa(i)
  const escritorio = matchMedia("(min-width: 1100px)");
  const scrolly = (seccion, etapa) => {
    const pasos = [...seccion.querySelectorAll(".paso")];
    let actual = -1, obs = null;
    const activar = i => {
      if (i === actual) return;
      actual = i;
      pasos.forEach((p, j) => p.classList.toggle("activo", j === i));
      etapa(i, true);
    };
    const aplicar = () => {
      obs?.disconnect(); actual = -1;
      if (sinMovimiento) { pasos.forEach(p => p.classList.add("activo")); etapa(pasos.length - 1, false); return; }
      obs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) activar(pasos.indexOf(e.target)); }),
        { rootMargin: escritorio.matches ? "-45% 0px -45% 0px" : "-70% 0px -28% 0px" });
      etapa(0, false);
      pasos.forEach(p => obs.observe(p));
    };
    escritorio.addEventListener("change", aplicar);
    aplicar();
  };

  // Revelado general: todo lo que tenga .revela aparece al entrar a la pantalla
  const revelar = () => {
    const nodos = document.querySelectorAll(".revela");
    if (sinMovimiento) return nodos.forEach(n => n.classList.add("visto"));
    const obs = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("visto"); obs.unobserve(e.target); }
    }), { rootMargin: "0px 0px -8% 0px", threshold: .08 });
    nodos.forEach(n => obs.observe(n));
  };

  window.R = { el, fmt, pct, css, lineal, logaritmica, calor, tooltip, alVer, contar, segmentado, scrolly, revelar, sinMovimiento };
})();
