// Mapas de Chicago en SVG: proyección simple (equirectangular corregida por la latitud de la ciudad),
// zonas de patrullaje, cuadros de ~500 m y zoom con arrastre, botones, rueda (con Ctrl/⌘) y pellizco.
(() => {
  const { el } = window.R;
  const K = 1000;                                        // unidades SVG por grado
  const COSLAT = Math.cos(41.84 * Math.PI / 180);        // un grado de longitud mide ~0.745 de uno de latitud

  const proyeccion = beats => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const f of beats.features) for (const pol of f.geometry.coordinates) for (const [x, y] of pol[0]) {
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    const px = lon => (lon - minX) * COSLAT * K, py = lat => (maxY - lat) * K;
    return { px, py, W: px(maxX), H: py(minY), minY, maxY };
  };

  const caminoZona = (f, p) => f.geometry.coordinates
    .map(pol => pol.map(anillo => "M" + anillo.map(([x, y]) => `${p.px(x).toFixed(1)},${p.py(y).toFixed(1)}`).join("L") + "Z").join(""))
    .join("");

  // Dibuja las zonas dentro de g y devuelve { beat: path }. Algunas zonas vienen en varias piezas
  // (varios features con el mismo beat): se juntan en un solo path para pintarlas de una vez.
  const zonas = (g, beats, p, clase) => {
    const porBeat = {};
    for (const f of beats.features) {
      const b = f.properties.beat, d = caminoZona(f, p);
      if (porBeat[b]) { porBeat[b].setAttribute("d", porBeat[b].getAttribute("d") + d); continue; }
      porBeat[b] = el("path", { d, "data-beat": b, "data-distrito": f.properties.district, class: clase });
      g.append(porBeat[b]);
    }
    return porBeat;
  };

  // Dibuja los cuadros [i, j, n] y devuelve los rect en el mismo orden
  const celdas = (g, lista, meta, p) => {
    const w = meta.paso * COSLAT * K, h = meta.paso * K;
    return lista.map(([i, j]) => {
      const lat = meta.lat0 + (i + 1) * meta.paso, lon = meta.lon0 + j * meta.paso;
      const r = el("rect", { x: p.px(lon).toFixed(1), y: p.py(lat).toFixed(1), width: (w + .15).toFixed(2), height: (h + .15).toFixed(2), "data-ij": `${i},${j}` });
      g.append(r);
      return r;
    });
  };

  // Zoom y arrastre sobre el viewBox del svg
  const zoomable = (svg, base, { maximo = 8 } = {}) => {
    let vb = { ...base };
    const aplicar = () => svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    const limitar = () => {
      vb.w = Math.min(base.w, Math.max(base.w / maximo, vb.w)); vb.h = vb.w * base.h / base.w;
      vb.x = Math.min(base.x + base.w - vb.w, Math.max(base.x, vb.x));
      vb.y = Math.min(base.y + base.h - vb.h, Math.max(base.y, vb.y));
    };
    const aSvg = (cx, cy) => {
      const r = svg.getBoundingClientRect();
      // preserveAspectRatio meet: calcula la escala real y el margen
      const s = Math.min(r.width / vb.w, r.height / vb.h);
      const ox = (r.width - vb.w * s) / 2, oy = (r.height - vb.h * s) / 2;
      return [vb.x + (cx - r.left - ox) / s, vb.y + (cy - r.top - oy) / s, s];
    };
    const zoom = (factor, cx, cy) => {
      const r = svg.getBoundingClientRect();
      const [sx, sy] = aSvg(cx ?? r.left + r.width / 2, cy ?? r.top + r.height / 2);
      const nw = vb.w / factor;
      const fx = (sx - vb.x) / vb.w, fy = (sy - vb.y) / vb.h;
      vb.w = nw; vb.h = nw * base.h / base.w;
      vb.x = sx - fx * vb.w; vb.y = sy - fy * vb.h;
      limitar(); aplicar(); svg.dispatchEvent(new CustomEvent("zoom", { detail: base.w / vb.w }));
    };
    const reiniciar = () => { vb = { ...base }; aplicar(); svg.dispatchEvent(new CustomEvent("zoom", { detail: 1 })); };

    svg.addEventListener("wheel", e => {
      if (!(e.ctrlKey || e.metaKey)) return;       // la rueda sola sigue haciendo scroll en la página
      e.preventDefault();
      zoom(Math.exp(-e.deltaY * .01), e.clientX, e.clientY);
    }, { passive: false });
    svg.addEventListener("dblclick", e => zoom(1.8, e.clientX, e.clientY));

    const punteros = new Map();
    let ultimo = null, distancia = null, movido = 0;
    svg.addEventListener("pointerdown", e => {
      punteros.set(e.pointerId, [e.clientX, e.clientY]); movido = 0;
      if (punteros.size === 1) ultimo = [e.clientX, e.clientY];
    });
    svg.addEventListener("pointermove", e => {
      if (!punteros.has(e.pointerId)) return;
      punteros.set(e.pointerId, [e.clientX, e.clientY]);
      if (punteros.size === 2) {
        const [[ax, ay], [bx, by]] = [...punteros.values()];
        const d = Math.hypot(ax - bx, ay - by);
        if (distancia) zoom(d / distancia, (ax + bx) / 2, (ay + by) / 2);
        distancia = d; movido += 10;
      } else if (ultimo && vb.w < base.w) {
        const [, , s] = aSvg(e.clientX, e.clientY);
        vb.x -= (e.clientX - ultimo[0]) / s; vb.y -= (e.clientY - ultimo[1]) / s;
        movido += Math.abs(e.clientX - ultimo[0]) + Math.abs(e.clientY - ultimo[1]);
        ultimo = [e.clientX, e.clientY]; limitar(); aplicar();
      }
    });
    const soltar = e => { punteros.delete(e.pointerId); if (punteros.size < 2) distancia = null; if (!punteros.size) ultimo = null; };
    svg.addEventListener("pointerup", soltar); svg.addEventListener("pointercancel", soltar); svg.addEventListener("pointerleave", soltar);

    aplicar();
    return { zoom, reiniciar, arrastrado: () => movido > 6 };
  };

  window.R.Mapa = { proyeccion, zonas, celdas, zoomable, COSLAT, K };
})();
