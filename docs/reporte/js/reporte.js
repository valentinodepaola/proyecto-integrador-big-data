// Arma cada sección del reporte con los datos: agregados de la capa limpia (window.AGREGADOS),
// predicciones de las 10 semanas de prueba (window.PREDICCIONES) y polígonos de las zonas (window.BEATS).
(() => {
  const { el, fmt, pct, css, lineal, logaritmica, calor, tooltip, alVer, contar, segmentado, scrolly, revelar, sinMovimiento, G, Mapa } = window.R;
  const A = window.AGREGADOS, PRED = window.PREDICCIONES, BEATS = window.BEATS;
  const $ = id => document.getElementById(id);
  const ANIOS = A.anios.map(String);
  const OPC_ANIOS = [...ANIOS.map(a => [a, a]), ["todos", "2022–2025"]];
  const etqAnio = a => a === "todos" ? "2022 a 2025" : a;
  const sumaAnios = (lista, anio) => anio === "todos" ? lista.reduce((s, v) => s + v, 0) : lista[ANIOS.indexOf(anio)];

  const TIPOS_ES = {
    "THEFT": "Robo sin violencia", "BATTERY": "Agresión física", "CRIMINAL DAMAGE": "Daño a la propiedad",
    "ASSAULT": "Amenaza o ataque", "MOTOR VEHICLE THEFT": "Robo de vehículo", "DECEPTIVE PRACTICE": "Fraude",
    "OTHER OFFENSE": "Otras faltas", "ROBBERY": "Robo con violencia", "BURGLARY": "Robo a inmueble",
    "NARCOTICS": "Drogas", "WEAPONS VIOLATION": "Armas", "CRIMINAL TRESPASS": "Allanamiento",
  };
  const nombreTipo = t => TIPOS_ES[t] ?? t.charAt(0) + t.slice(1).toLowerCase();
  const DISTRITOS = { 1: "Central", 2: "Wentworth", 3: "Grand Crossing", 4: "South Chicago", 5: "Calumet", 6: "Gresham",
    7: "Englewood", 8: "Chicago Lawn", 9: "Deering", 10: "Ogden", 11: "Harrison", 12: "Near West", 14: "Shakespeare",
    15: "Austin", 16: "Jefferson Park", 17: "Albany Park", 18: "Near North", 19: "Town Hall", 20: "Lincoln",
    22: "Morgan Park", 24: "Rogers Park", 25: "Grand Central" };
  const TURNOS = ["Madrugada (00 a 06 h)", "Mañana (06 a 12 h)", "Tarde (12 a 18 h)", "Noche (18 a 24 h)"];
  const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const DIAS_LARGOS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
  const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const proy = Mapa.proyeccion(BEATS);

  // ---------- Barra superior: progreso de lectura y capítulo actual ----------
  (() => {
    const barra = $("barra"), prog = $("barra-progreso"), nombre = $("barra-capitulo");
    const secciones = [...document.querySelectorAll("[data-capitulo]")];
    new IntersectionObserver(([e]) => barra.classList.toggle("visible", !e.isIntersecting), { threshold: .05 }).observe($("inicio"));
    let pendiente = false;
    const alScroll = () => {
      pendiente = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      prog.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
      let actual = secciones[0];
      for (const s of secciones) if (s.getBoundingClientRect().top < innerHeight * .4) actual = s;
      nombre.textContent = actual.dataset.capitulo;
    };
    addEventListener("scroll", () => { if (!pendiente) { pendiente = true; requestAnimationFrame(alScroll); } }, { passive: true });
    alScroll();
  })();

  // Celdas de ~500 m por año, como mapa "i,j" → conteo
  const celdasPor = {};
  for (const a of ANIOS) celdasPor[a] = new Map(A.celdas.por_anio[a].map(([i, j, n]) => [`${i},${j}`, n]));
  celdasPor.todos = new Map();
  for (const a of ANIOS) for (const [k, n] of celdasPor[a]) celdasPor.todos.set(k, (celdasPor.todos.get(k) ?? 0) + n);
  const todasLasCeldas = [...celdasPor.todos.keys()].map(k => k.split(",").map(Number));

  // Color por posición: el cuadro más activo es el más oscuro. Con una escala por conteo casi toda la ciudad
  // saldría oscura (unos cuantos cuadros tienen muchísimos incidentes), así que se colorea por rango.
  const colorPorRango = (r, total) => calor(.04 + .96 * Math.pow(1 - r / total, 1.8));

  // ---------- Portada: el mapa se arma cuadro por cuadro, de lo menos a lo más intenso ----------
  (() => {
    const cont = $("mapa-portada");
    const svg = el("svg", { viewBox: `-4 -4 ${proy.W + 8} ${proy.H + 8}`, "aria-hidden": "true" });
    const gC = el("g"), gZ = el("g", { class: "contorno" });
    const lista = todasLasCeldas.map(([i, j]) => [i, j, celdasPor.todos.get(`${i},${j}`)]);
    const rects = Mapa.celdas(gC, lista, A.celdas, proy);
    const orden = lista.map((c, k) => [c[2], k]).sort((a, b) => a[0] - b[0]);
    orden.forEach(([n, k], rango) => {
      rects[k].setAttribute("fill", colorPorRango(orden.length - 1 - rango, orden.length));
      rects[k].setAttribute("class", "celda");
      rects[k].style.setProperty("--d", Math.round(200 + rango / orden.length * 1800));
    });
    Mapa.zonas(gZ, BEATS, proy);
    svg.append(gC, gZ);
    cont.append(svg);
    if (!sinMovimiento) document.querySelector(".portada").classList.add("animar");
  })();

  document.querySelectorAll(".contador").forEach(n => contar(n));

  // ---------- Reportes por año ----------
  (() => {
    const cont = $("grafica-anios"), max = Math.max(...Object.values(A.por_anio));
    cont.innerHTML = ANIOS.map(a => `<div class="a${a === "2025" ? " actual" : ""}"><span class="v">${fmt(A.por_anio[a])}</span><div class="b" style="--h:${(A.por_anio[a] / max * 100).toFixed(1)}%"></div><span class="e">${a}</span></div>`).join("");
    cont.setAttribute("role", "img");
    cont.setAttribute("aria-label", ANIOS.map(a => `${a}: ${fmt(A.por_anio[a])} reportes`).join("; "));
    alVer(cont, () => cont.classList.remove("en-espera"), .5);
  })();

  // ---------- Mapa explorable ----------
  (() => {
    const svg = $("mapa-explorar");
    const base = { x: -4, y: -4, w: proy.W + 8, h: proy.H + 8 };
    const gCeldas = el("g", { class: "capa-celdas" }), gZonas = el("g", { class: "capa-zonas" }), gCont = el("g", { class: "contorno" });
    const hover = el("path", { class: "hover-mapa", d: "" });
    const rects = Mapa.celdas(gCeldas, todasLasCeldas, A.celdas, proy);
    const paths = Mapa.zonas(gZonas, BEATS, proy);
    Mapa.zonas(gCont, BEATS, proy);
    svg.append(gZonas, gCeldas, gCont, hover);
    const zoom = Mapa.zoomable(svg, base);
    svg.addEventListener("zoom", e => { svg.style.touchAction = e.detail > 1.01 ? "none" : "pan-y"; });
    $("zoom-mas").onclick = () => zoom.zoom(1.6);
    $("zoom-menos").onclick = () => zoom.zoom(1 / 1.6);
    $("zoom-reset").onclick = () => zoom.reiniciar();
    if (matchMedia("(pointer: coarse)").matches) $("mapa-pista").textContent = "Pellizca o usa + y − para acercar · toca una zona para ver su dato";

    const estado = { vista: "celdas", anio: "2025", top: true };
    let rangoCelda = new Map(), rangoZona = new Map(), totalAnio = 0;

    function pintar() {
      const vC = celdasPor[estado.anio];
      const zonasN = Object.fromEntries(Object.entries(A.zonas).map(([b, l]) => [b, sumaAnios(l, estado.anio)]));
      totalAnio = estado.anio === "todos" ? A.total : A.por_anio[estado.anio];
      let datoTexto;
      if (estado.vista === "celdas") {
        const ordenadas = [...vC.entries()].sort((a, b) => b[1] - a[1]);
        rangoCelda = new Map(ordenadas.map(([k], r) => [k, r]));
        const nTop = Math.floor(ordenadas.length / 10), suma = ordenadas.reduce((s, c) => s + c[1], 0);
        const enTop = ordenadas.slice(0, nTop).reduce((s, c) => s + c[1], 0);
        const max = ordenadas[0][1];
        rects.forEach((r, k) => {
          const [i, j] = todasLasCeldas[k], n = vC.get(`${i},${j}`) ?? 0;
          r.setAttribute("fill", n ? colorPorRango(rangoCelda.get(`${i},${j}`), ordenadas.length) : "transparent");
          r.classList.toggle("top", estado.top && rangoCelda.get(`${i},${j}`) < nTop);
        });
        $("mapa-dato").textContent = pct(enTop / suma * 100);
        datoTexto = `de los incidentes de ${etqAnio(estado.anio)} cae en el 10&nbsp;% de los cuadros con más actividad (${fmt(nTop)} de ${fmt(ordenadas.length)}).`;
        $("mapa-leyenda-max").textContent = `más (hasta ${fmt(max)})`;
      } else {
        const ordenadas = Object.entries(paths).map(([b]) => [b, zonasN[b] ?? 0]).sort((a, b) => b[1] - a[1]);
        rangoZona = new Map(ordenadas.filter(o => o[1] > 0).map(([b], r) => [b, r]));
        const nTop = Math.floor(rangoZona.size / 10), suma = ordenadas.reduce((s, c) => s + c[1], 0);
        const enTop = ordenadas.slice(0, nTop).reduce((s, c) => s + c[1], 0);
        const max = ordenadas[0][1];
        for (const [b, n] of ordenadas) {
          paths[b].setAttribute("fill", n ? colorPorRango(rangoZona.get(b), rangoZona.size) : css("--papel-2"));
          paths[b].classList.toggle("top", estado.top && rangoZona.get(b) < nTop);
        }
        $("mapa-dato").textContent = pct(enTop / suma * 100);
        datoTexto = `de los incidentes de ${etqAnio(estado.anio)} cae en el 10&nbsp;% de las zonas de patrullaje con más actividad (${nTop} de ${rangoZona.size}).`;
        $("mapa-leyenda-max").textContent = `más (hasta ${fmt(max)})`;
      }
      $("mapa-dato-texto").innerHTML = datoTexto;
      gCeldas.style.opacity = estado.vista === "celdas" ? 1 : 0;
      gCeldas.style.pointerEvents = estado.vista === "celdas" ? "auto" : "none";
      gZonas.style.opacity = estado.vista === "zonas" ? 1 : 0;
      gCont.style.opacity = estado.vista === "celdas" ? 1 : 0;

      // Distritos con más incidentes en el año elegido
      const dist = Object.entries(A.distritos).map(([d, l]) => [d, sumaAnios(l, estado.anio)]).sort((a, b) => b[1] - a[1]).slice(0, 5);
      $("mapa-distritos").innerHTML = dist.map(([d, n]) => `<li><span>${d} · ${DISTRITOS[d] ?? "Distrito " + d}</span><em>${pct(n / totalAnio * 100)}</em><span class="barra-li"><i style="--w:${(n / dist[0][1] * 100).toFixed(1)}%"></i></span></li>`).join("");
      svg.setAttribute("aria-label", `Mapa de incidentes en Chicago, ${etqAnio(estado.anio)}, por ${estado.vista === "celdas" ? "cuadros de 500 metros" : "zona de patrullaje"}. ${$("mapa-dato").textContent} ${$("mapa-dato-texto").textContent}`);
    }

    segmentado($("mapa-vista"), [["celdas", "Cuadros de 500 m"], ["zonas", "Zonas de patrullaje"]], estado.vista, v => { estado.vista = v; hover.setAttribute("d", ""); pintar(); });
    segmentado($("mapa-anio"), OPC_ANIOS, estado.anio, v => { estado.anio = v; pintar(); });
    $("mapa-top").addEventListener("change", e => { estado.top = e.target.checked; pintar(); });

    // Tooltip y contorno del elemento bajo el puntero
    const mostrar = e => {
      if (zoom.arrastrado() && e.type === "pointermove" && e.buttons) return tooltip.ocultar();
      const t = e.target;
      if (estado.vista === "celdas" && t.dataset.ij) {
        const n = celdasPor[estado.anio].get(t.dataset.ij);
        if (!n) return salir();
        const r = rangoCelda.get(t.dataset.ij), total = rangoCelda.size;
        const x = +t.getAttribute("x"), y = +t.getAttribute("y"), w = +t.getAttribute("width"), h = +t.getAttribute("height");
        hover.setAttribute("d", `M${x},${y}h${w}v${h}h${-w}Z`);
        tooltip.mostrar(`<span class="t-titulo">Cuadro de unos 500 m</span><span class="t-num">${fmt(n)}</span> incidentes en ${etqAnio(estado.anio)}<br>Puesto ${fmt(r + 1)} de ${fmt(total)} cuadros · ${r < total / 10 ? "<b>dentro del 10&nbsp;% más activo</b>" : `más que el ${fmt(Math.round((1 - r / total) * 100))}&nbsp;% de los cuadros`}`, e.clientX, e.clientY);
      } else if (estado.vista === "zonas" && t.dataset.beat) {
        const b = t.dataset.beat, d = t.dataset.distrito, n = sumaAnios(A.zonas[b] ?? [0, 0, 0, 0], estado.anio);
        hover.setAttribute("d", t.getAttribute("d"));
        tooltip.mostrar(`<span class="t-titulo">Zona ${b}</span>Distrito ${d}${DISTRITOS[d] ? " · " + DISTRITOS[d] : ""}<br><span class="t-num">${fmt(n)}</span> incidentes en ${etqAnio(estado.anio)}${n ? `<br>Puesto ${rangoZona.get(b) + 1} de ${rangoZona.size} zonas` : ""}`, e.clientX, e.clientY);
      } else salir();
    };
    const salir = () => { hover.setAttribute("d", ""); tooltip.ocultar(); };
    svg.addEventListener("pointermove", mostrar);
    svg.addEventListener("click", mostrar);
    svg.addEventListener("pointerleave", salir);
    pintar();
  })();

  // ---------- Día por hora ----------
  (() => {
    const estado = { anio: "2025", dia: null };
    const matriz = anio => anio === "todos"
      ? DIAS.map((_, i) => Array.from({ length: 24 }, (_, h) => ANIOS.reduce((s, a) => s + A.dia_hora[a][i][h], 0)))
      : A.dia_hora[anio];
    const horas = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
    let M = matriz(estado.anio);

    const hm = G.heatmap($("grafica-heatmap"), {
      filas: DIAS, columnas: horas, valores: M,
      aria: "Mapa de calor de incidentes por día de la semana y hora del día: el pico es por la tarde entre semana y en la madrugada del fin de semana.",
      tooltip: (i, j, V) => {
        const totDia = V[i].reduce((s, v) => s + v, 0), promHora = V.reduce((s, f) => s + f[j], 0) / 7;
        const dif = (V[i][j] / promHora - 1) * 100;
        return `<span class="t-titulo">${DIAS_LARGOS[i][0].toUpperCase() + DIAS_LARGOS[i].slice(1)}, de ${horas[j]}:00 a ${horas[j]}:59</span><span class="t-num">${fmt(V[i][j])}</span> incidentes en ${etqAnio(estado.anio)}<br>${pct(V[i][j] / totDia * 100)} de los del día · ${dif >= 0 ? "+" : "−"}${fmt(Math.abs(dif), 0)}&nbsp;% contra el promedio de esa hora`;
      },
    });
    const serieHoras = () => estado.dia === null ? horas.map((_, h) => M.reduce((s, f) => s + f[h], 0)) : M[estado.dia];
    const referencia = () => estado.dia === null ? null : horas.map((_, h) => M.reduce((s, f) => s + f[h], 0) / 7);
    const colorBarra = i => i === pico ? css("--incidente") : css("--calor-2");
    let pico = 15;
    const barras = G.columnas($("grafica-horas"), {
      valores: serieHoras(), etiquetas: horas, color: i => colorBarra(i),
      maximo: () => Math.max(...serieHoras(), ...(referencia() ?? [0])) * 1.06,
      aria: "Incidentes por hora del día.",
      tooltip: (i, V, ref) => `<span class="t-titulo">${horas[i]}:00 a ${horas[i]}:59</span><span class="t-num">${fmt(V[i])}</span> incidentes${ref ? `<br>Promedio de un día cualquiera: ${fmt(ref[i])}` : ""}`,
    });

    function actualizar() {
      M = matriz(estado.anio);
      const s = serieHoras(), total = s.reduce((a, v) => a + v, 0);
      pico = s.indexOf(Math.max(...s));
      hm.actualizar(M); hm.resaltarFila(estado.dia);
      barras.actualizar(s, referencia());
      const cuando = estado.dia === null ? "" : ` los ${DIAS_LARGOS[estado.dia]}${estado.dia >= 5 ? "s" : ""}`.replace("ss", "s");
      $("horas-titulo").textContent = `Incidentes por hora, ${estado.dia === null ? "todos los días" : "los " + DIAS_LARGOS[estado.dia] + (estado.dia >= 5 ? "s" : "")} · ${etqAnio(estado.anio)}`;
      $("horas-leyenda").innerHTML = estado.dia === null ? "" : `<span><i style="background:var(--calor-2)"></i>${DIAS_LARGOS[estado.dia]}</span><span><i class="linea" style="background:var(--tinta)"></i>promedio de un día cualquiera</span>`;
      $("h-pico").textContent = `${pico} h`;
      $("h-pico-t").textContent = `la hora con más incidentes${cuando}`;
      $("h-tarde").textContent = pct(s.slice(12).reduce((a, v) => a + v, 0) / total * 100);
      const porDia = M.map(f => f.reduce((a, v) => a + v, 0)), dMax = porDia.indexOf(Math.max(...porDia)), dMin = porDia.indexOf(Math.min(...porDia));
      $("h-dia").textContent = DIAS_LARGOS[dMax][0].toUpperCase() + DIAS_LARGOS[dMax].slice(1);
      $("h-dia-t").textContent = `el día más activo de ${etqAnio(estado.anio)}: ${fmt((porDia[dMax] / porDia[dMin] - 1) * 100, 0)} % más que el ${DIAS_LARGOS[dMin]}, el más tranquilo`;
    }
    segmentado($("hm-anio"), OPC_ANIOS, estado.anio, v => { estado.anio = v; actualizar(); });
    const dias = segmentado($("hm-dia"), [["", "Todos"], ...DIAS.map((d, i) => [String(i), d])], "", v => { estado.dia = v === "" ? null : +v; actualizar(); });
    // Clic en una fila del heatmap = elegir ese día
    $("grafica-heatmap").addEventListener("click", e => {
      const t = e.target.closest("[data-tip]"); if (!t) return;
      const i = +t.dataset.tip.split(",")[0];
      estado.dia = estado.dia === i ? null : i; dias.poner(estado.dia === null ? "" : String(i)); actualizar();
    });
    actualizar();
  })();

  // ---------- Serie semanal, un año encima del otro ----------
  (() => {
    const colores = { 2022: "#c9d3dc", 2023: "#9fb0bf", 2024: "#5d7286", 2025: css("--incidente") };
    const inicio = k => new Date(2025, 0, 1 + 7 * k);
    const marcas = MESES.map((m, i) => [Math.floor((new Date(2025, i, 1) - new Date(2025, 0, 1)) / 864e5 / 7), m]).filter((_, i) => i % 2 === 0 || innerWidth > 700);
    let tipo = "TOTAL";
    const series = () => ANIOS.map(a => ({ id: a, nombre: a, valores: A.semanal[a][tipo], color: colores[a], grosor: a === "2025" ? 3.2 : 1.8 }));
    const leyenda = () => {
      $("serie-leyenda").innerHTML = ANIOS.map(a => `<span><i class="linea" style="background:${colores[a]}"></i>${a} · ${fmt(A.semanal[a][tipo].reduce((s, v) => s + v, 0))}</span>`).join("");
    };
    const g = G.lineas($("grafica-serie"), {
      n: 52, series: series(), marcasX: marcas,
      bandas: [
        { desde: 21.5, hasta: 34.5, color: "#fbe6cc", texto: "Verano (junio a agosto)", corto: "Verano", colorTexto: "#a85a12" },
        { desde: 41.5, hasta: 51, color: css("--linea"), texto: "Semanas de prueba", corto: "Prueba" },
      ],
      aria: "Delitos por semana de 2022 a 2025: suben cada verano y 2025 queda por debajo de 2023 y 2024.",
      tooltip: (i, S) => {
        const d = inicio(i);
        return `<span class="t-titulo">Semana ${i + 1}: desde el ${d.getDate()} de ${MESES_LARGOS[d.getMonth()]}</span>` +
          [...S].reverse().map(s => `<span style="color:${s.color === css("--incidente") ? "#ffb39f" : "#c9d3dc"}">${s.nombre}</span> <b>${fmt(s.valores[i])}</b>`).join("<br>");
      },
    });
    leyenda();
    segmentado($("serie-tipo"), [["TOTAL", "Todos"], ["THEFT", "Robo sin violencia"], ["BATTERY", "Agresión física"], ["CRIMINAL DAMAGE", "Daño a la propiedad"]], tipo,
      v => { tipo = v; g.actualizar(series()); leyenda(); });
  })();

  // ---------- Tipos de delito ----------
  (() => {
    let anio = "2025";
    const filas = () => {
      const total = anio === "todos" ? A.total : A.por_anio[anio];
      return Object.entries(A.tipos).map(([t, l]) => [t, sumaAnios(l, anio)]).sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([t, n]) => {
          const excl = A.tipos_excluidos.includes(t);
          return { tipo: t, nombre: nombreTipo(t), valor: n / total * 100, etiqueta: pct(n / total * 100), detalle: fmt(n),
            color: excl ? css("--linea-2") : css("--incidente"), colorTexto: excl ? css("--texto-2") : css("--tinta"), excl, n };
        });
    };
    const b = G.barrasH($("grafica-tipos"), {
      filas: filas(), maximo: () => 26, aria: "Los 10 tipos de delito más frecuentes y su porcentaje del total.",
      tooltip: f => `<span class="t-titulo">${f.nombre}</span><span class="t-num">${fmt(f.n)}</span> reportes en ${etqAnio(anio)} (${f.etiqueta})<br>En el catálogo: ${f.tipo.toLowerCase()}${f.excl ? "<br><b>Excluido del modelo</b>: se registra más donde hay más patrullas" : ""}`,
    });
    segmentado($("tipos-anio"), OPC_ANIOS, anio, v => { anio = v; b.actualizar(filas()); });

    // Pequeños múltiplos: los seis tipos más frecuentes de 2025
    const cont = $("multiples");
    Object.entries(A.tipos).sort((a, b) => b[1][3] - a[1][3]).slice(0, 6).forEach(([t, l]) => {
      const cambio = (l[3] / l[0] - 1) * 100, sube = cambio >= 0;
      const d = document.createElement("div");
      d.innerHTML = `<p class="m-tit">${nombreTipo(t)}</p><p class="m-cambio ${sube ? "sube" : "baja"}">${sube ? "+" : "−"}${fmt(Math.abs(cambio), 0)}&nbsp;%</p>`;
      cont.append(d);
      // Índice con 2022 = 100 y la misma escala en los seis, para no exagerar cambios chicos
      G.miniLinea(d, l.map(v => v / l[0] * 100), ANIOS.map(a => "’" + a.slice(2)), sube ? css("--incidente") : css("--secundario"),
        `${nombreTipo(t)}: ${ANIOS.map((a, i) => `${a}, ${fmt(l[i])}`).join("; ")}. Cambio de 2022 a 2025: ${fmt(cambio, 0)} por ciento.`, [75, 140], 100);
      d.title = ANIOS.map((a, i) => `${a}: ${fmt(l[i])}`).join(" · ");
    });
  })();

  // ---------- Error promedio: los puntos llegan a su lugar paso a paso ----------
  (() => {
    const filas = [
      ["Repetir el promedio del último mes", 1.722, "", "1.72"],
      ["Nuestro primer modelo", 1.642, "", "1.64"],
      ["Repetir el promedio histórico", 1.614, "", "1.61"],
      ["Repetir el promedio del último año", 1.609, "", "1.61"],
      ["Modelo mejorado", 1.585, "modelo", "1.59"],
      ["Límite: lo que deja el azar", 1.53, "limite", "≈ 1.53"],
    ];
    const visiblesPorPaso = [[1], [0, 1, 2], [0, 1, 2], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4, 5]];
    const destacadaPorPaso = [1, 2, 2, 4, 5];
    const cont = $("grafica-error");
    let grupos = [], izq = 0, pasoActual = 0;
    const dibujar = w => {
      cont.innerHTML = "";
      const angosto = w < 560;
      const W = angosto ? 380 : 760, der = angosto ? 52 : 56, alto = angosto ? 48 : 50, arriba = 8;
      izq = angosto ? 6 : 280;
      const H = arriba + filas.length * alto + 52;
      const x0 = 1.75, x1 = 1.50, x = v => izq + (x0 - v) / (x0 - x1) * (W - izq - der);
      const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Error promedio: último mes 1.72, primer modelo 1.64, promedio histórico 1.61, promedio del último año 1.61, modelo mejorado 1.59, límite por azar 1.53." });
      for (const t of [1.75, 1.70, 1.65, 1.60, 1.55, 1.50]) {
        svg.append(el("line", { x1: x(t), x2: x(t), y1: arriba, y2: H - 46, stroke: css("--linea") }));
        svg.append(el("text", { x: x(t), y: H - 26, "text-anchor": "middle", "font-size": angosto ? 11 : 12 }, t.toFixed(2)));
      }
      svg.append(el("text", { x: x(1.50) + 14, y: H - 4, "font-size": 11.5, "font-weight": 600, "text-anchor": "end", fill: css("--texto") }, "menos error, mejor →"));
      grupos = filas.map(([nombre, v, tipo, rotulo], i) => {
        const yc = arriba + i * alto + (angosto ? 30 : alto / 2);
        const color = tipo === "modelo" ? css("--incidente") : tipo === "limite" ? css("--tinta") : css("--secundario");
        const g = el("g", { class: "fila-error" });
        const etiqueta = el("text", { x: angosto ? izq : izq - 16, y: angosto ? yc - 13 : yc + 5, "text-anchor": angosto ? "start" : "end",
          "font-size": angosto ? 13 : 14, "font-weight": tipo ? 700 : 500, fill: tipo === "modelo" ? css("--incidente") : css("--texto") }, nombre);
        const riel = el("line", { x1: izq, x2: x(v), y1: yc, y2: yc, stroke: tipo === "modelo" ? css("--incidente") : css("--linea-2"),
          "stroke-width": tipo === "modelo" ? 2.5 : 1.2, pathLength: 1, class: "riel" });
        const punto = el("g", { class: "punto" });
        if (tipo === "limite") punto.append(el("circle", { cx: 0, cy: yc, r: 8, fill: css("--papel"), stroke: color, "stroke-width": 2, "stroke-dasharray": "3 3" }));
        else punto.append(el("circle", { cx: 0, cy: yc, r: tipo === "modelo" ? 10 : 7.5, fill: color }));
        punto.append(el("text", { x: 15, y: yc + 5, "font-size": angosto ? 13 : 15, "font-weight": 800, fill: color }, rotulo));
        g.append(etiqueta, riel, punto);
        svg.append(g);
        return { g, punto, riel, destino: x(v) };
      });
      cont.append(svg);
      etapa(pasoActual);
    };
    function etapa(paso) {
      pasoActual = paso;
      const vis = visiblesPorPaso[Math.min(paso, visiblesPorPaso.length - 1)];
      grupos.forEach((f, i) => {
        const ve = vis.includes(i);
        f.g.style.opacity = ve ? (i === destacadaPorPaso[paso] || paso >= 4 ? 1 : .5) : 0;
        f.punto.style.transform = `translateX(${ve ? f.destino : izq}px)`;
        f.riel.style.strokeDashoffset = ve ? 0 : 1;
      });
    }
    G.responsivo(cont, dibujar);
    scrolly($("scrolly-error"), etapa);
  })();

  // ---------- Predicciones de prueba: utilidades ----------
  const col = Object.fromEntries(PRED.columnas.map((c, i) => [c, i]));
  const porSemana = {};
  for (const f of PRED.filas) (porSemana[f[col.semana]] ??= []).push(f);
  const semanas = PRED.semanas.map(s => porSemana[s]);
  const N = semanas[0].length;   // 1,096 zonas y turnos
  const ordenar = (fs, clave) => [...fs].sort((x, y) => y[col[clave]] - x[col[clave]] || x[col.beat] - y[col.beat] || x[col.turno] - y[col.turno]);
  const ordenModelo = Object.fromEntries(PRED.semanas.map(s => [s, ordenar(porSemana[s], "rf")]));
  const ordenFuturo = Object.fromEntries(PRED.semanas.map(s => [s, ordenar(porSemana[s], "real")]));
  const totalSemana = semanas.reduce((a, fs) => a + fs.reduce((b, f) => b + f[col.real], 0), 0) / semanas.length;

  // ---------- Dispersión: predicho contra real ----------
  (() => {
    const acum = {};
    for (const f of PRED.filas) {
      const k = `${f[col.beat]}-${f[col.turno]}`;
      const a = acum[k] ??= { beat: f[col.beat], turno: f[col.turno], real: 0, rf: 0, historico: 0, n: 0 };
      a.real += f[col.real]; a.rf += f[col.rf]; a.historico += f[col.historico]; a.n++;
    }
    const lista = Object.values(acum).map(a => ({ ...a, real: a.real / a.n, rf: a.rf / a.n, historico: a.historico / a.n }));
    const max = Math.ceil(Math.max(...lista.flatMap(a => [a.real, a.rf, a.historico])) / 5) * 5;
    let metodo = "rf";
    const nombres = { rf: "Random Forest (primer modelo)", historico: "Promedio histórico" };
    const puntos = () => lista.map(a => ({ x: a[metodo], y: a.real, color: metodo === "rf" ? css("--incidente") : css("--secundario"), a }));
    const d = G.dispersion($("grafica-dispersion"), {
      puntos: puntos(), max, paso: 5, ejeX: "predicho, delitos por semana →", ejeY: "↑ real",
      aria: "Dispersión de 1,096 zonas y turnos: lo predicho contra lo real sigue la diagonal con bastante dispersión, igual para el modelo y para el promedio histórico.",
      tooltip: p => `<span class="t-titulo">Zona ${p.a.beat} · ${TURNOS[p.a.turno]}</span>${nombres[metodo]}: <b>${fmt(p.x, 1)}</b> por semana<br>Lo que pasó: <b>${fmt(p.y, 1)}</b> por semana`,
    });
    segmentado($("disp-metodo"), [["rf", "Random Forest"], ["historico", "Promedio histórico"]], metodo, v => { metodo = v; d.actualizar(puntos()); });
  })();

  // ---------- Curva de cobertura y lo que depende del porcentaje elegido ----------
  const cobertura = (() => {
    const cubiertos = (p, orden) => PRED.semanas.reduce((a, s) => {
      const k = Math.ceil(N * p / 100);
      return a + orden[s].slice(0, k).reduce((b, f) => b + f[col.real], 0);
    }, 0) / PRED.semanas.length;
    const modelo = [0], futuro = [0];
    for (let p = 1; p <= 50; p++) { modelo[p] = cubiertos(p, ordenModelo) / totalSemana * 100; futuro[p] = cubiertos(p, ordenFuturo) / totalSemana * 100; }

    const cont = $("grafica-curva"), rango = $("rango");
    let actual = 10, animacion = null, partes = null;
    const oyentes = [];
    const dibujar = w => {
      cont.innerHTML = "";
      const angosto = w < 560, fs = angosto ? 11 : 12;
      const W = Math.max(w, 300), H = angosto ? 300 : 420, m = { i: angosto ? 38 : 48, d: 12, a: 16, b: 40 };
      const x = p => m.i + p / 50 * (W - m.i - m.d), y = v => H - m.b - v / 80 * (H - m.a - m.b);
      const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Curva de cobertura: con el 10 por ciento de zonas y turnos, el modelo cubre alrededor del 20 por ciento de los delitos, el azar el 10 y sabiendo el futuro el 26." });
      for (const v of [0, 20, 40, 60, 80]) {
        svg.append(el("line", { x1: m.i, x2: W - m.d, y1: y(v), y2: y(v), stroke: css("--linea") }));
        svg.append(el("text", { x: m.i - 8, y: y(v) + 4, "text-anchor": "end", "font-size": fs }, `${v} %`));
      }
      for (const p of [0, 10, 20, 30, 40, 50]) svg.append(el("text", { x: x(p), y: H - m.b + 18, "text-anchor": "middle", "font-size": fs }, `${p} %`));
      svg.append(el("text", { x: W - m.d, y: H - 4, "text-anchor": "end", "font-size": fs, "font-weight": 600, fill: css("--texto") }, "zonas y turnos reforzados →"));
      svg.append(el("text", { x: m.i + 6, y: m.a + 4, "font-size": fs, "font-weight": 600, fill: css("--texto") }, "↑ delitos cubiertos"));
      const camino = vals => vals.map((v, p) => `${p ? "L" : "M"}${x(p).toFixed(1)},${y(v).toFixed(1)}`).join("");
      const g = el("g");
      g.append(el("path", { d: camino(modelo) + [...modelo.keys()].reverse().map(p => `L${x(p).toFixed(1)},${y(p).toFixed(1)}`).join("") + "Z", fill: css("--incidente-claro"), opacity: .7 }));
      g.append(el("path", { d: camino([...modelo.keys()]), fill: "none", stroke: css("--secundario"), "stroke-width": 2, pathLength: 1, class: "traza" }));
      g.append(el("path", { d: camino(futuro), fill: "none", stroke: css("--tinta"), "stroke-width": 1.6, "stroke-dasharray": "6 4" }));
      g.append(el("path", { d: camino(modelo), fill: "none", stroke: css("--incidente"), "stroke-width": 3.2, pathLength: 1, class: "traza" }));
      const guia = el("line", { y1: m.a, y2: H - m.b, stroke: css("--tinta"), "stroke-width": 1, "stroke-opacity": .5 });
      const pA = el("circle", { r: 5, fill: css("--secundario") }), pF = el("circle", { r: 5, fill: css("--tinta") }), pM = el("circle", { r: 7, fill: css("--incidente"), stroke: "#fff", "stroke-width": 2 });
      const tM = el("text", { "font-size": fs + 3, "font-weight": 800, fill: css("--incidente") });
      const tF = el("text", { "font-size": fs, "font-weight": 600, fill: css("--tinta") });
      svg.append(g, guia, pA, pF, pM, tM, tF);
      cont.append(svg);
      partes = { x, y, guia, pA, pF, pM, tM, tF };
      alVer(svg, () => requestAnimationFrame(() => g.classList.add("dibujada")), .3);
      poner(actual);
    };
    function poner(p) {
      actual = p;
      const q = Math.round(p), { x, y, guia, pA, pF, pM, tM, tF } = partes;
      const xp = x(p);
      guia.setAttribute("x1", xp); guia.setAttribute("x2", xp);
      pM.setAttribute("cx", xp); pM.setAttribute("cy", y(modelo[q]));
      pA.setAttribute("cx", xp); pA.setAttribute("cy", y(q));
      pF.setAttribute("cx", xp); pF.setAttribute("cy", y(futuro[q]));
      const izqda = q > 38;
      tM.setAttribute("x", xp + (izqda ? -12 : 12)); tM.setAttribute("y", y(modelo[q]) + 24); tM.setAttribute("text-anchor", izqda ? "end" : "start");
      tM.textContent = `${fmt(modelo[q], 0)} %`;
      tF.setAttribute("x", xp + (izqda ? -10 : 10)); tF.setAttribute("y", y(futuro[q]) - 10); tF.setAttribute("text-anchor", izqda ? "end" : "start");
      tF.textContent = `techo ${fmt(futuro[q], 0)} %`;
      rango.value = q;
      rango.style.setProperty("--lleno", `${(q - 1) / 49 * 100}%`);
      $("rango-valor").textContent = `${q} %`;
      const zonas = Math.ceil(N * q / 100), semM = modelo[q] / 100 * totalSemana, semA = q / 100 * totalSemana;
      $("m-modelo").textContent = `${fmt(modelo[q], 0)} %`;
      $("m-azar").textContent = `${q} %`;
      $("m-techo").textContent = `${fmt(futuro[q], 0)} %`;
      $("m-del-techo").textContent = `${fmt(modelo[q] / futuro[q] * 100, 0)} %`;
      $("m-zonas").textContent = fmt(zonas);
      $("m-zonas-t").textContent = `zonas y turnos de ${fmt(N)}`;
      $("m-semana").textContent = fmt(Math.round(semM / 10) * 10);
      $("m-semana-t").textContent = `delitos por semana cubiertos (al azar, unos ${fmt(Math.round(semA / 10) * 10)})`;
      $("lectura-curva").innerHTML = `Reforzando el <b>${q}&nbsp;%</b> de las zonas y turnos, el modelo cubre <b>${(modelo[q] / q).toFixed(1).replace(".0", "")} veces</b> lo que cubriría el azar.`;
      oyentes.forEach(f => f(q));
    }
    function llevarA(meta) {
      cancelAnimationFrame(animacion);
      if (sinMovimiento) return poner(meta);
      const desde = actual, t0 = performance.now(), dur = 800;
      const tic = t => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        poner(desde + (meta - desde) * e);
        if (k < 1) animacion = requestAnimationFrame(tic);
      };
      animacion = requestAnimationFrame(tic);
    }
    rango.addEventListener("input", () => { cancelAnimationFrame(animacion); poner(+rango.value); });
    segmentado($("rango-atajos"), [["5", "5 %"], ["10", "10 %"], ["20", "20 %"], ["30", "30 %"]], "10", v => llevarA(+v));
    G.responsivo(cont, dibujar);
    // Al entrar a la pantalla, el marcador recorre la curva hasta el 10 %
    if (!sinMovimiento) { poner(1); alVer(cont, () => setTimeout(() => llevarA(10), 500), .4); }
    return { alCambiar: f => oyentes.push(f), actual: () => Math.round(actual) };
  })();

  // ---------- Captura semana por semana (10 %) ----------
  (() => {
    const vals = PRED.semanas.map(s => PRED.captura_semanal[s] * 100);
    G.columnas($("grafica-semanas"), {
      valores: vals, etiquetas: PRED.semanas.map(s => `S${s}`), cada: 1, alto: 240, pasoEje: 10, fmtEje: v => `${v} %`,
      referencia: vals.map(() => 10), color: () => css("--incidente"), maximo: () => 30,
      aria: `Delitos cubiertos con el 10 por ciento de las zonas, por semana de prueba: entre ${fmt(Math.min(...vals), 1)} y ${fmt(Math.max(...vals), 1)} por ciento; al azar serían 10.`,
      tooltip: (i, V) => `<span class="t-titulo">Semana ${PRED.semanas[i]} de 2025</span><span class="t-num">${pct(V[i])}</span> de los delitos cayó en las 110 zonas y turnos señalados<br>Al azar: 10&nbsp;%`,
    });
    const nota = document.createElement("p");
    nota.className = "fig-nota";
    nota.innerHTML = `Barras: siguiendo al modelo, entre ${pct(Math.min(...vals))} y ${pct(Math.max(...vals))} según la semana (${pct(PRED.captura_total * 100)} en total). Línea negra: el 10&nbsp;% que cubriría el azar.`;
    $("grafica-semanas").after(nota);
  })();

  // ---------- Mini mapa: zonas señaladas en la semana y el porcentaje elegidos ----------
  (() => {
    const svg = $("mapa-mini");
    svg.setAttribute("viewBox", `-4 -4 ${proy.W + 8} ${proy.H + 8}`);
    const g = el("g", { class: "capa-zonas" });
    const paths = Mapa.zonas(g, BEATS, proy);
    svg.append(g);
    const hover = el("path", { class: "hover-mapa", d: "" });
    svg.append(hover);
    const colores = [css("--papel-2"), calor(.3), calor(.5), calor(.75), calor(1)];
    $("mini-leyenda").innerHTML = colores.map((c, i) => `<span><i style="background:${c};border:1px solid var(--linea)"></i>${i === 0 ? "ningún turno" : i === 1 ? "1 turno" : i + " turnos"}</span>`).join("");
    let semana = PRED.semanas[0], q = 10, señaladas = {};
    function pintar() {
      const k = Math.ceil(N * q / 100);
      señaladas = {};
      for (const f of ordenModelo[semana].slice(0, k)) (señaladas[f[col.beat]] ??= []).push(f);
      for (const [b, p] of Object.entries(paths)) p.setAttribute("fill", colores[(señaladas[b] ?? []).length]);
      $("mini-sub").innerHTML = `Semana ${semana} de 2025, con el ${q}&nbsp;% de las zonas y turnos (${fmt(k)}) repartidos en ${Object.keys(señaladas).length} zonas. Entre más oscura la zona, más turnos señalados.`;
    }
    segmentado($("mini-semana"), PRED.semanas.map(s => [String(s), String(s)]), String(semana), v => { semana = +v; pintar(); });
    cobertura.alCambiar(v => { if (v !== q) { q = v; pintar(); } });
    const mostrar = e => {
      const b = e.target.dataset?.beat;
      if (!b) { hover.setAttribute("d", ""); return tooltip.ocultar(); }
      hover.setAttribute("d", e.target.getAttribute("d"));
      const fs = (señaladas[b] ?? []).sort((x, y) => x[col.turno] - y[col.turno]);
      tooltip.mostrar(`<span class="t-titulo">Zona ${b}</span>${fs.length ? `Turnos señalados: <b>${fs.map(f => TURNOS[f[col.turno]].split(" ")[0].toLowerCase()).join(", ")}</b><br>Predicción: ${fmt(fs.reduce((s, f) => s + f[col.rf], 0), 1)} delitos · pasaron ${fs.reduce((s, f) => s + f[col.real], 0)}` : "Ningún turno señalado esta semana"}`, e.clientX, e.clientY);
    };
    svg.addEventListener("pointermove", mostrar); svg.addEventListener("click", mostrar);
    svg.addEventListener("pointerleave", () => { hover.setAttribute("d", ""); tooltip.ocultar(); });
    q = cobertura.actual(); pintar();
  })();

  // ---------- Clasificador del tipo de delito ----------
  G.barrasH($("grafica-clasificador"), {
    maximo: () => 34, aria: "Acierto del tipo de delito: regresión logística 29.4 por ciento, Random Forest 29.3, tipo más común de la zona 29.1, tipo más común de la ciudad 24.6.",
    filas: [
      ["Regresión logística", 29.4, css("--incidente")], ["Random Forest", 29.3, css("--incidente")],
      ["Tipo más común de la zona", 29.1, css("--secundario")], ["Tipo más común de la ciudad", 24.6, css("--secundario-claro")],
    ].map(([nombre, v, color]) => ({ nombre, valor: v, etiqueta: pct(v), color })),
    tooltip: f => `<span class="t-titulo">${f.nombre}</span>Acierta el tipo en el <b>${f.etiqueta}</b> de los delitos de prueba`,
  });

  // ---------- Mezcla de tipos en la zona 1834 ----------
  (() => {
    const filas = [["Robo sin violencia", 54.4, 55.7], ["Agresión física", 9.6, 10.0], ["Amenaza o ataque", 4.5, 5.2], ["Daño a la propiedad", 3.8, 1.9], ["Otros", 27.7, 27.2]];
    const cont = $("grafica-mezcla");
    G.responsivo(cont, w => {
      cont.innerHTML = "";
      const angosto = w < 480;
      const W = Math.max(w, 300), izq = angosto ? 0 : 150, der = 34, alto = angosto ? 60 : 50;
      const H = filas.length * alto + 4;
      const x = v => (W - izq - der) * v / 60;
      const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Mezcla esperada contra real en la zona 1834: robo 54 contra 56, agresión 10 contra 10, amenaza 5 contra 5, daño 4 contra 2, otros 28 contra 27." });
      filas.forEach(([nombre, esp, real], i) => {
        const y0 = i * alto + (angosto ? 22 : 6);
        svg.append(el("text", { x: angosto ? 0 : izq - 12, y: angosto ? y0 - 6 : y0 + 18, "text-anchor": angosto ? "start" : "end", "font-size": 13.5, "font-weight": 600, fill: css("--texto") }, nombre));
        svg.append(el("rect", { x: izq, y: y0, width: x(esp), height: 14, rx: 2, fill: css("--incidente"), class: "bh-barra", style: `transition-delay:${i * 80}ms` }));
        svg.append(el("rect", { x: izq, y: y0 + 17, width: x(real), height: 14, rx: 2, fill: css("--secundario-claro"), class: "bh-barra", style: `transition-delay:${i * 80 + 50}ms` }));
        svg.append(el("text", { x: izq + x(esp) + 8, y: y0 + 12, "font-size": 12.5, "font-weight": 800, fill: css("--incidente") }, Math.round(esp)));
        svg.append(el("text", { x: izq + x(real) + 8, y: y0 + 29, "font-size": 12.5, fill: css("--texto-2") }, Math.round(real)));
      });
      cont.append(svg);
      if (!sinMovimiento) { cont.classList.add("en-espera"); alVer(svg, () => requestAnimationFrame(() => cont.classList.remove("en-espera")), .4); }
    });
  })();

  // ---------- Cierre ----------
  alVer($("barras-final"), () => $("barras-final").classList.remove("en-espera"), .5);
  revelar();
})();
