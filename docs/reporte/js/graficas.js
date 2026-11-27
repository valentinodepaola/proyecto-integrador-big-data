// Componentes de gráficas reutilizables. Cada uno recibe un contenedor y opciones, dibuja un SVG
// a la medida del contenedor, se redibuja si cambia el ancho y expone actualizar(...) para los filtros.
(() => {
  const { el, fmt, css, lineal, tooltip, alVer, sinMovimiento } = window.R;

  // Llama a dibujar(ancho) ahora y cada vez que el contenedor cambia de ancho
  const responsivo = (cont, dibujar) => {
    let ancho = 0;
    const ro = new ResizeObserver(() => {
      const w = Math.round(cont.clientWidth);
      if (Math.abs(w - ancho) > 24) { ancho = w; dibujar(w); }
    });
    ro.observe(cont);
    ancho = Math.round(cont.clientWidth); dibujar(ancho);
  };

  // Liga el tooltip a los hijos de un svg que tengan data-tip (delegación)
  const conTooltip = (svg, contenido) => {
    const mover = e => {
      const t = e.target.closest("[data-tip]");
      if (!t) return tooltip.ocultar();
      tooltip.mostrar(contenido(t), e.clientX, e.clientY);
    };
    svg.addEventListener("pointermove", mover);
    svg.addEventListener("pointerdown", mover);
    svg.addEventListener("pointerleave", () => tooltip.ocultar());
  };

  // ---------- Heatmap (filas × columnas) ----------
  const heatmap = (cont, op) => {
    let valores = op.valores, filaActiva = null, celdas = [], filasG = [], svg;
    const dibujar = w => {
      cont.innerHTML = "";
      const angosto = w < 600;
      const izq = angosto ? 34 : 44, arriba = 22, abajo = 4;
      const cw = (Math.max(w, 600) - izq) / op.columnas.length;   // en pantallas angostas el svg se desliza
      const ch = angosto ? 30 : Math.min(40, cw * 1.25);
      const W = izq + cw * op.columnas.length, H = arriba + ch * op.filas.length + abajo;
      svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": op.aria });
      op.columnas.forEach((c, j) => { if (j % (angosto ? 3 : 2) === 0) svg.append(el("text", { x: izq + cw * j + cw / 2, y: 13, "text-anchor": "middle", "font-size": 11 }, c)); });
      celdas = []; filasG = [];
      op.filas.forEach((f, i) => {
        const g = el("g", { class: "fila-hm" });
        g.append(el("text", { x: izq - 8, y: arriba + ch * i + ch / 2 + 4, "text-anchor": "end", "font-size": 12, "font-weight": 600, fill: css("--texto") }, f));
        celdas[i] = op.columnas.map((c, j) => {
          const r = el("rect", { x: izq + cw * j + 1, y: arriba + ch * i + 1, width: cw - 2, height: ch - 2, rx: 2, class: "celda-hm", "data-tip": `${i},${j}` });
          g.append(r); return r;
        });
        svg.append(g); filasG.push(g);
      });
      cont.append(svg);
      conTooltip(svg, t => { const [i, j] = t.dataset.tip.split(",").map(Number); return op.tooltip(i, j, valores); });
      pintar();
    };
    function pintar() {
      const plano = valores.flat(), min = Math.min(...plano), max = Math.max(...plano);
      celdas.forEach((fila, i) => fila.forEach((r, j) => r.setAttribute("fill", window.R.calor(.04 + .96 * (valores[i][j] - min) / (max - min || 1)))));
      filasG.forEach((g, i) => g.classList.toggle("fila-apagada", filaActiva !== null && filaActiva !== i));
    }
    responsivo(cont, dibujar);
    return {
      actualizar(v) { valores = v; pintar(); },
      resaltarFila(i) { filaActiva = i; pintar(); },
    };
  };

  // ---------- Barras verticales (una por categoría del eje x), con referencia opcional ----------
  const columnas = (cont, op) => {
    let valores = op.valores, referencia = op.referencia, barras = [], refs = [], y, H, abajo, svg, ejeY = [];
    const dibujar = w => {
      cont.innerHTML = "";
      const angosto = w < 600;
      const W = Math.max(w, 320), izq = 44, der = 6, arriba = 14; abajo = 26; H = op.alto ?? (angosto ? 190 : 230);
      const bw = (W - izq - der) / valores.length;
      svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": op.aria });
      ejeY = [0, 1, 2, 3].map(k => {
        const l = el("line", { x1: izq, x2: W - der, stroke: css("--linea") }), t = el("text", { x: izq - 6, "text-anchor": "end", "font-size": 11 });
        svg.append(l, t); return [l, t];
      });
      refs = []; barras = valores.map((v, i) => {
        const x = izq + bw * i;
        const b = el("rect", { x: x + 1.5, width: Math.max(1, bw - 3), rx: 1.5, class: "barra-hora", "data-tip": i, fill: op.color(i) });
        const r = el("line", { x1: x + 1, x2: x + bw - 1, stroke: css("--tinta"), "stroke-width": 1.5, class: "barra-hora" });
        svg.append(b); refs.push(r);
        if (i % (op.cada ?? (angosto ? 3 : 2)) === 0) svg.append(el("text", { x: x + bw / 2, y: H - 8, "text-anchor": "middle", "font-size": 11 }, op.etiquetas[i]));
        return b;
      });
      refs.forEach(r => svg.append(r));
      y = h => lineal([0, op.maximo()], [H - abajo, arriba])(h);
      cont.append(svg);
      conTooltip(svg, t => op.tooltip(+t.dataset.tip, valores, referencia));
      pintar(true);
    };
    function pintar(inicial) {
      const max = op.maximo();
      y = lineal([0, max], [H - abajo, 14]);
      const paso = op.pasoEje ?? (Math.ceil(max / 3 / 500) * 500 || 1);
      ejeY.forEach(([l, t], k) => { const v = paso * k; l.setAttribute("y1", y(v)); l.setAttribute("y2", y(v)); t.setAttribute("y", y(v) + 4); t.textContent = (op.fmtEje ?? fmt)(v); l.style.opacity = t.style.opacity = v <= max ? 1 : 0; });
      barras.forEach((b, i) => {
        const v = valores[i];
        if (inicial && !sinMovimiento) { b.setAttribute("y", H - abajo); b.setAttribute("height", 0); }
        const poner = () => { b.setAttribute("y", y(v)); b.setAttribute("height", Math.max(0, H - abajo - y(v))); b.setAttribute("fill", op.color(i)); };
        inicial ? alVer(b.ownerSVGElement, () => requestAnimationFrame(poner)) : poner();
        const r = refs[i];
        if (referencia) { r.setAttribute("y1", y(referencia[i])); r.setAttribute("y2", y(referencia[i])); r.style.opacity = 1; } else r.style.opacity = 0;
      });
    }
    responsivo(cont, dibujar);
    return { actualizar(v, ref) { valores = v; referencia = ref; pintar(false); } };
  };

  // ---------- Líneas (series sobre un eje x común) ----------
  const lineas = (cont, op) => {
    let series = op.series, svg, caminos = {}, x, y, guia, puntos = {}, W, H, m;
    const dibujar = w => {
      cont.innerHTML = "";
      const angosto = w < 600;
      W = Math.max(w, 320); H = angosto ? 260 : 340; m = { i: angosto ? 40 : 50, d: angosto ? 10 : 70, a: 16, b: 30 };
      svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": op.aria });
      x = lineal([0, op.n - 1], [m.i, W - m.d]);
      const fondo = el("g"), ejes = el("g"), capa = el("g", { class: "traza-grupo" });
      for (const b of op.bandas ?? []) {
        fondo.append(el("rect", { x: x(b.desde) , y: m.a, width: x(b.hasta) - x(b.desde), height: H - m.a - m.b, fill: b.color, opacity: b.opacidad ?? 1 }));
        fondo.append(el("text", { x: x(b.desde) + 6, y: m.a + 14, "font-size": 11, "font-weight": 600, fill: b.colorTexto ?? css("--texto-2") }, angosto ? b.corto ?? b.texto : b.texto));
      }
      for (const [i, t] of op.marcasX) ejes.append(el("text", { x: x(i), y: H - 8, "text-anchor": "middle", "font-size": 11 }, t));
      svg.append(fondo, ejes, capa);
      caminos = {}; puntos = {};
      for (const s of series) {
        caminos[s.id] = el("path", { fill: "none", stroke: s.color, "stroke-width": s.grosor ?? 2, "stroke-linejoin": "round", "stroke-linecap": "round", pathLength: 1, class: "traza" });
        capa.append(caminos[s.id]);
      }
      guia = el("line", { y1: m.a, y2: H - m.b, stroke: css("--tinta"), "stroke-width": 1, opacity: 0 });
      svg.append(guia);
      for (const s of series) { puntos[s.id] = el("circle", { r: 4, fill: s.color, stroke: "#fff", "stroke-width": 1.5, opacity: 0 }); svg.append(puntos[s.id]); }
      svg.ejesY = ejes;
      // Capa invisible para el tooltip: una franja por posición x
      const ancho = (W - m.i - m.d) / (op.n - 1);
      const zona = el("g");
      for (let i = 0; i < op.n; i++) zona.append(el("rect", { x: x(i) - ancho / 2, y: m.a, width: ancho, height: H - m.a - m.b, fill: "transparent", "data-tip": i }));
      svg.append(zona);
      cont.append(svg);
      svg.addEventListener("pointerleave", () => { guia.setAttribute("opacity", 0); Object.values(puntos).forEach(p => p.setAttribute("opacity", 0)); });
      conTooltip(svg, t => {
        const i = +t.dataset.tip;
        guia.setAttribute("x1", x(i)); guia.setAttribute("x2", x(i)); guia.setAttribute("opacity", .5);
        for (const s of series) { puntos[s.id].setAttribute("cx", x(i)); puntos[s.id].setAttribute("cy", y(s.valores[i])); puntos[s.id].setAttribute("opacity", 1); }
        return op.tooltip(i, series);
      });
      pintar();
      alVer(svg, () => requestAnimationFrame(() => capa.classList.add("dibujada")), .3);
    };
    function pintar() {
      const max = Math.max(...series.flatMap(s => s.valores)) * 1.08, min = op.desdeCero ? 0 : Math.min(...series.flatMap(s => s.valores)) * .9;
      y = lineal([min, max], [H - m.b, m.a]);
      svg.ejesY.querySelectorAll(".ey").forEach(n => n.remove());
      const paso = [100, 200, 500, 1000, 2000][[100, 200, 500, 1000, 2000].findIndex(p => (max - min) / p <= 5)] ?? 2000;
      for (let v = Math.ceil(min / paso) * paso; v <= max; v += paso) {
        svg.ejesY.append(el("line", { x1: m.i, x2: W - m.d, y1: y(v), y2: y(v), stroke: css("--linea"), class: "ey" }));
        svg.ejesY.append(el("text", { x: m.i - 6, y: y(v) + 4, "text-anchor": "end", "font-size": 11, class: "ey" }, fmt(v)));
      }
      for (const s of series) {
        caminos[s.id].setAttribute("d", s.valores.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(""));
        caminos[s.id].setAttribute("stroke", s.color); caminos[s.id].setAttribute("stroke-width", s.grosor ?? 2);
      }
      svg.querySelectorAll(".rotulo-serie").forEach(n => n.remove());
      if (W - m.d > 400) for (const s of series) {
        const v = s.valores[op.n - 1];
        svg.append(el("text", { x: x(op.n - 1) + 8, y: y(v) + 4, "font-size": 12, "font-weight": s.grosor > 2 ? 700 : 500, fill: s.color, class: "rotulo-serie" }, s.nombre));
      }
    }
    responsivo(cont, dibujar);
    return { actualizar(nuevas) { series = nuevas; pintar(); } };
  };

  // ---------- Barras horizontales con etiqueta ----------
  const barrasH = (cont, op) => {
    let filas = op.filas, svg, grupos = [];
    const dibujar = w => {
      cont.innerHTML = "";
      const angosto = w < 600;
      const W = Math.max(w, 300), izq = angosto ? 0 : 210, der = 120, alto = angosto ? 52 : 38;
      const H = filas.length * alto + 4;
      svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": op.aria });
      const x = v => (W - izq - der) * v / op.maximo();
      grupos = filas.map((f, i) => {
        const y0 = i * alto + (angosto ? 22 : 6);
        const g = el("g", { "data-tip": i, style: "cursor:default" });
        const nombre = el("text", { x: angosto ? 0 : izq - 12, y: angosto ? y0 - 6 : y0 + 16, "text-anchor": angosto ? "start" : "end", "font-size": 13.5, "font-weight": 600, fill: css("--texto") });
        const barra = el("rect", { x: izq, y: y0, height: 22, rx: 2, class: "bh-barra", style: `transition-delay:${i * 60}ms` });
        const valor = el("text", { y: y0 + 16, "font-size": 13, "font-weight": 700 });
        const cant = el("tspan", { "font-weight": 400, fill: css("--texto-2") });
        g.append(el("rect", { x: 0, y: y0 - (angosto ? 20 : 4), width: W, height: alto, fill: "transparent" }), nombre, barra, valor);
        svg.append(g);
        return { nombre, barra, valor, cant, x };
      });
      cont.append(svg);
      conTooltip(svg, t => op.tooltip(filas[+t.dataset.tip]));
      if (!sinMovimiento) { cont.classList.add("en-espera"); alVer(svg, () => requestAnimationFrame(() => cont.classList.remove("en-espera")), .3); }
      pintar();
    };
    function pintar() {
      grupos.forEach((g, i) => {
        const f = filas[i];
        g.nombre.textContent = f.nombre;
        g.barra.setAttribute("width", Math.max(1, g.x(f.valor)));
        g.barra.setAttribute("fill", f.color);
        g.valor.setAttribute("x", +g.barra.getAttribute("x") + g.x(f.valor) + 8);
        g.valor.setAttribute("fill", f.colorTexto ?? css("--tinta"));
        g.valor.textContent = f.etiqueta + " ";
        g.cant.textContent = f.detalle ?? ""; g.valor.append(g.cant);
      });
    }
    responsivo(cont, dibujar);
    return { actualizar(nuevas) { filas = nuevas; pintar(); } };
  };

  // ---------- Línea pequeña para pequeños múltiplos ----------
  // dominio: [mín, máx] común a todos los múltiplos, para que la misma pendiente signifique el mismo cambio
  const miniLinea = (cont, valores, etiquetas, color, aria, dominio, base) => {
    const W = 220, H = 70, m = 8;
    const x = lineal([0, valores.length - 1], [m + 14, W - m - 14]), y = lineal(dominio, [H - 18, 6]);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": aria });
    if (base !== undefined) svg.append(el("line", { x1: m, x2: W - m, y1: y(base), y2: y(base), stroke: css("--linea-2"), "stroke-dasharray": "2 3" }));
    svg.append(el("path", { d: valores.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(""), fill: "none", stroke: color, "stroke-width": 2.2, pathLength: 1, class: "traza" }));
    valores.forEach((v, i) => {
      svg.append(el("circle", { cx: x(i), cy: y(v), r: i === valores.length - 1 ? 4 : 2.6, fill: i === valores.length - 1 ? color : "#fff", stroke: color, "stroke-width": 1.6 }));
      svg.append(el("text", { x: x(i), y: H - 3, "text-anchor": "middle", "font-size": 10 }, etiquetas[i]));
    });
    cont.append(svg);
    alVer(svg, () => requestAnimationFrame(() => svg.classList.add("dibujada")), .4);
  };

  // ---------- Dispersión ----------
  const dispersion = (cont, op) => {
    let puntos = op.puntos, svg, circulos = [], x, y;
    const dibujar = w => {
      cont.innerHTML = "";
      const angosto = w < 600;
      const W = Math.max(w, 300), H = Math.min(W, angosto ? 340 : 460), m = { i: 44, d: 12, a: 12, b: 40 };
      x = lineal([0, op.max], [m.i, W - m.d]); y = lineal([0, op.max], [H - m.b, m.a]);
      svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": op.aria });
      for (let v = 0; v <= op.max; v += op.paso) {
        svg.append(el("line", { x1: m.i, x2: W - m.d, y1: y(v), y2: y(v), stroke: css("--linea") }));
        svg.append(el("text", { x: m.i - 6, y: y(v) + 4, "text-anchor": "end", "font-size": 11 }, v));
        svg.append(el("text", { x: x(v), y: H - m.b + 16, "text-anchor": "middle", "font-size": 11 }, v));
      }
      svg.append(el("text", { x: W - m.d, y: H - 4, "text-anchor": "end", "font-size": 12, "font-weight": 600, fill: css("--texto") }, op.ejeX));
      svg.append(el("text", { x: m.i + 4, y: m.a + 12, "font-size": 12, "font-weight": 600, fill: css("--texto") }, op.ejeY));
      svg.append(el("line", { x1: x(0), y1: y(0), x2: x(op.max), y2: y(op.max), stroke: css("--tinta"), "stroke-dasharray": "5 4", "stroke-width": 1.2 }));
      svg.append(el("text", { x: x(op.max * .97), y: y(op.max * .97) + 16, "text-anchor": "end", "font-size": 11, fill: css("--tinta") }, "predicción perfecta"));
      const g = el("g");
      circulos = puntos.map((p, i) => { const c = el("circle", { r: angosto ? 2.6 : 3.2, "data-tip": i, "fill-opacity": .5 }); g.append(c); return c; });
      svg.append(g);
      cont.append(svg);
      conTooltip(svg, t => op.tooltip(puntos[+t.dataset.tip]));
      pintar();
    };
    function pintar() {
      circulos.forEach((c, i) => {
        const p = puntos[i];
        c.setAttribute("cx", x(Math.min(p.x, op.max))); c.setAttribute("cy", y(Math.min(p.y, op.max))); c.setAttribute("fill", p.color);
      });
    }
    responsivo(cont, dibujar);
    return { actualizar(nuevos) { puntos = nuevos; pintar(); } };
  };

  window.R.G = { responsivo, conTooltip, heatmap, columnas, lineas, barrasH, miniLinea, dispersion };
})();
