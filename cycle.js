/* ============================================================
   Ciclo menstrual
   Guarda día por día (flujo, manchado, síntomas) y de ahí deduce
   los períodos, la fase y la próxima fecha estimada.

   Se guarda por fecha y no como "lista de períodos" a propósito:
   así se une solo entre teléfonos, igual que las comidas y los pesos.
   ============================================================ */

/* ---------- acceso al estado ---------- */

function defaultCycle() {
  return { days: {}, seed: 0, avisos: { peso: true } };
}

function cy() {
  if (!state.cycle || typeof state.cycle !== "object") state.cycle = defaultCycle();
  if (!state.cycle.days || typeof state.cycle.days !== "object") state.cycle.days = {};
  return state.cycle;
}

// Carga el historial del informe de Salud la primera vez.
function migrateCycle() {
  const c = cy();
  if ((c.seed || 0) >= CYCLE_SEED_VERSION) return;
  Object.entries(CYCLE_SEED).forEach(([fecha, datos]) => {
    // No pisa lo que ella ya haya cargado a mano.
    if (!c.days[fecha]) c.days[fecha] = { ...datos };
  });
  c.seed = CYCLE_SEED_VERSION;
}

const cycleDay = fecha => cy().days[fecha] || null;

function setCycleDay(fecha, cambios) {
  const c = cy();
  const actual = c.days[fecha] || {};
  const nuevo = { ...actual, ...cambios };
  // Un día sin nada no se guarda: deja el registro limpio.
  if (!nuevo.flow && !nuevo.spotting && !(nuevo.symptoms || []).length && !nuevo.note) {
    delete c.days[fecha];
    if (typeof Sync !== "undefined") Sync.marcarBorrado("cycle:" + fecha);
  } else {
    c.days[fecha] = nuevo;
  }
  saveState();
}

/* ---------- deducir los períodos ----------
   Un período arranca en un día con sangrado que no tiene otro día de
   sangrado en los 3 días previos. Esa tolerancia existe porque en
   agosto hubo un día sin registro en el medio del período. */

function detectPeriods() {
  const fechas = Object.keys(cy().days).filter(f => esSangrado(cy().days[f].flow)).sort();
  const periodos = [];
  fechas.forEach(f => {
    const ultimo = periodos[periodos.length - 1];
    if (ultimo && daysBetween(parseDateKey(ultimo.end), parseDateKey(f)) <= 3) {
      ultimo.end = f;
      ultimo.dias.push(f);
    } else {
      periodos.push({ start: f, end: f, dias: [f] });
    }
  });
  // Largo del período = del primer al último día de sangrado, inclusive.
  periodos.forEach((p, i) => {
    p.duracion = daysBetween(parseDateKey(p.start), parseDateKey(p.end)) + 1;
    const sig = periodos[i + 1];
    p.cicloLargo = sig ? daysBetween(parseDateKey(p.start), parseDateKey(sig.start)) : null;
  });
  return periodos;
}

// La mediana aguanta mejor un ciclo raro que el promedio.
// (Con sus datos: 20, 27, 28 y 29 días → mediana 28, promedio 26.)
function mediana(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function cycleStats() {
  const periodos = detectPeriods();
  const largos = periodos.map(p => p.cicloLargo).filter(Boolean);
  const duraciones = periodos.map(p => p.duracion);
  const largoTipico = mediana(largos.slice(-6)) || 28;
  const duracionTipica = mediana(duraciones.slice(-6)) || 5;
  return {
    periodos,
    largoTipico,
    duracionTipica,
    variacion: largos.length > 1 ? Math.max(...largos) - Math.min(...largos) : 0,
    minimo: largos.length ? Math.min(...largos) : null,
    maximo: largos.length ? Math.max(...largos) : null,
    completos: largos.length
  };
}

/* ---------- dónde está hoy ---------- */

function cycleToday(fecha = todayDateKey()) {
  const st = cycleStats();
  const ultimo = st.periodos[st.periodos.length - 1];
  if (!ultimo) return { sinDatos: true, stats: st };

  const dia = daysBetween(parseDateKey(ultimo.start), parseDateKey(fecha)) + 1;
  const proximo = addDaysKey(ultimo.start, st.largoTipico);
  const faltan = daysBetween(parseDateKey(fecha), parseDateKey(proximo));

  // La ovulación cae unos 14 días ANTES del próximo período, no 14
  // después del anterior: es la parte del ciclo que casi no varía.
  const ovulacion = addDaysKey(proximo, -14);
  const fertilDesde = addDaysKey(ovulacion, -5);
  const fertilHasta = addDaysKey(ovulacion, 1);

  let fase;
  const sangrandoHoy = esSangrado(cycleDay(fecha)?.flow);
  if (sangrandoHoy || (dia >= 1 && dia <= ultimo.duracion)) fase = "menstrual";
  else if (fecha >= fertilDesde && fecha <= fertilHasta) fase = "ovulacion";
  else if (fecha > fertilHasta) fase = "lutea";
  else fase = "folicular";

  return {
    sinDatos: false, stats: st, ultimo, dia, fase, info: PHASES[fase],
    proximo, faltan, ovulacion, fertilDesde, fertilHasta,
    atrasado: faltan < 0 ? -faltan : 0
  };
}

const addDaysKey = (key, n) => {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return localDateKey(d);
};

/* ---------- pantalla ---------- */

let cycleMonth = null;   // mes que se está mirando en el calendario
let cycleSelected = null; // día abierto para editar

function renderCycle() {
  if (!$("cycle-view")) return;
  const hoy = cycleToday();
  $("cycle-today").innerHTML = cycleTodayHtml(hoy);
  $("cycle-calendar").innerHTML = cycleCalendarHtml(hoy);
  $("cycle-editor").innerHTML = cycleSelected ? cycleEditorHtml(cycleSelected, hoy) : "";
  $("cycle-insights").innerHTML = cycleInsightsHtml(hoy);
  $("cycle-history").innerHTML = cycleHistoryHtml(hoy.stats);
}

function cycleTodayHtml(h) {
  if (h.sinDatos) {
    return `<article class="panel">
      <h3>Todavía no hay registros</h3>
      <p class="muted cy-sub">Marcá en el calendario el primer día de tu período y la app empieza a calcular sola.</p>
    </article>`;
  }
  const f = h.info;
  const prox = h.atrasado
    ? `<strong>${h.atrasado} ${h.atrasado === 1 ? "día" : "días"} de atraso</strong> sobre lo estimado`
    : h.faltan === 0 ? `<strong>Podría empezar hoy</strong>`
    : `Faltan <strong>${h.faltan} ${h.faltan === 1 ? "día" : "días"}</strong> · ${formatShortDate(h.proximo)}`;

  return `<article class="panel cycle-hero" style="--fase:${f.color}">
    <div class="cycle-hero-top">
      <div>
        <p class="eyebrow" style="color:${f.color}">Día ${h.dia} del ciclo</p>
        <h2>${f.icon} ${f.label}</h2>
      </div>
      <div class="cycle-ring" style="--pct:${Math.min(100, Math.round(h.dia / h.stats.largoTipico * 100))}%">
        <span>${h.dia}</span><small>de ${h.stats.largoTipico}</small>
      </div>
    </div>
    <p class="lead">${f.cuerpo}</p>
    <div class="cycle-next">${prox}</div>
    <div class="cycle-tips">
      <div class="cycle-tip"><span>🏋️</span><div><strong>Entrenamiento</strong><p>${f.entrenamiento}</p></div></div>
      <div class="cycle-tip"><span>🍽️</span><div><strong>Comida</strong><p>${f.comida}</p></div></div>
      <div class="cycle-tip"><span>⚖️</span><div><strong>Balanza</strong><p>${f.peso}</p></div></div>
    </div>
  </article>`;
}

/* Calendario del mes, con el flujo pintado y la ventana fértil marcada. */
function cycleCalendarHtml(h) {
  const hoyKey = todayDateKey();
  if (!cycleMonth) cycleMonth = hoyKey.slice(0, 7);
  const [anio, mes] = cycleMonth.split("-").map(Number);
  const primero = new Date(anio, mes - 1, 1);
  const diasMes = new Date(anio, mes, 0).getDate();
  // Lunes primero, como el calendario de acá.
  const offset = (primero.getDay() + 6) % 7;
  const nombreMes = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(primero);

  let celdas = "";
  for (let i = 0; i < offset; i++) celdas += `<i class="cal-cell empty"></i>`;
  for (let d = 1; d <= diasMes; d++) {
    const fecha = `${anio}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const reg = cycleDay(fecha);
    const flujo = reg?.flow ? flowInfo(reg.flow) : null;
    const clases = ["cal-cell"];
    let estilo = "";
    if (flujo) { clases.push("flujo"); estilo = `style="--c:${flujo.color}"`; }
    else if (!h.sinDatos && fecha >= h.fertilDesde && fecha <= h.fertilHasta) clases.push("fertil");
    if (reg?.spotting && !flujo) clases.push("mancha");
    if (fecha === hoyKey) clases.push("hoy");
    if (fecha === cycleSelected) clases.push("sel");
    if (fecha > hoyKey) clases.push("futuro");
    const puntos = (reg?.symptoms || []).length ? `<b class="cal-dot"></b>` : "";
    celdas += `<button class="${clases.join(" ")}" ${estilo} data-cycle-day="${fecha}">${d}${puntos}</button>`;
  }

  return `<article class="panel">
    <div class="cal-head">
      <button class="icon-btn" data-cycle-month="-1" aria-label="Mes anterior">‹</button>
      <h3>${nombreMes[0].toUpperCase() + nombreMes.slice(1)}</h3>
      <button class="icon-btn" data-cycle-month="1" aria-label="Mes siguiente">›</button>
    </div>
    <div class="cal-dow">${["L", "M", "M", "J", "V", "S", "D"].map(x => `<span>${x}</span>`).join("")}</div>
    <div class="cal-grid">${celdas}</div>
    <div class="cal-legend">
      <span><i style="background:#D94F3D"></i>Período</span>
      <span><i class="leg-fertil"></i>Días fértiles (estimado)</span>
      <span><i class="leg-sint"></i>Con síntomas</span>
    </div>
    <p class="dataset-note">Tocá cualquier día para cargar o corregir lo que pasó.<br>
      Los días fértiles son una estimación a partir de tus ciclos anteriores: <strong>no sirven
      como método anticonceptivo</strong>, sobre todo con ciclos que varían como los tuyos.</p>
  </article>`;
}

/* Editor del día elegido. */
function cycleEditorHtml(fecha, h) {
  const reg = cycleDay(fecha) || {};
  const sintomas = reg.symptoms || [];
  const flujos = FLOW_LEVELS.filter(f => f.key !== "si" && f.key !== "manchado");

  return `<article class="panel cycle-editor">
    <div class="cy-ed-head">
      <h3>${formatLongDate(fecha)}</h3>
      <button class="ghost-btn small-btn" data-cycle-close>Cerrar</button>
    </div>

    <p class="cy-label">Flujo</p>
    <div class="cy-chips">
      ${flujos.map(f => `<button class="cy-chip ${reg.flow === f.key ? "on" : ""}"
        style="--c:${f.color}" data-cycle-flow="${f.key}">${f.label}</button>`).join("")}
      <button class="cy-chip ${!reg.flow ? "on" : ""}" data-cycle-flow="">Sin flujo</button>
    </div>

    <label class="cy-switch-row">
      <span>Manchado</span>
      <button role="switch" aria-checked="${!!reg.spotting}" class="cy-switch ${reg.spotting ? "on" : ""}"
        data-cycle-spot><i></i></button>
    </label>

    <p class="cy-label">Síntomas</p>
    <div class="cy-chips wrap">
      ${SYMPTOMS.map(s => `<button class="cy-chip sm ${sintomas.includes(s.key) ? "on" : ""}"
        data-cycle-symptom="${s.key}">${s.icon} ${s.label}</button>`).join("")}
    </div>

    <p class="cy-label">Nota</p>
    <input id="cycle-note" class="cy-input" type="text" maxlength="120"
      placeholder="Lo que quieras recordar de este día" value="${escapeHtml(reg.note || "")}" />
  </article>`;
}

/* Lo que de verdad le sirve: cómo se cruza el ciclo con el peso,
   con las medidas de la cirugía y con el entrenamiento. */
function cycleInsightsHtml(h) {
  if (h.sinDatos) return "";
  const tarjetas = [];
  const st = h.stats;

  /* 1 · La balanza. Es lo que más la puede desanimar sin motivo. */
  if (h.fase === "lutea") {
    tarjetas.push({
      icono: "⚖️", tono: "warn", titulo: "Ojo con la balanza esta semana",
      texto: `Estás en fase lútea, los días previos al período. Acá es normal retener entre 1 y 2 kg de líquido. Si la balanza sube, no es grasa: es agua. El número real lo vas a ver cuando baje el período.`
    });
  } else if (h.fase === "folicular") {
    tarjetas.push({
      icono: "⚖️", tono: "ok", titulo: "Buena semana para pesarte",
      texto: `En fase folicular casi no hay líquido retenido, así que el peso de estos días es el más confiable de todo el ciclo. Si querés comparar contra el mes pasado, compará con esta misma semana.`
    });
  }

  /* 2 · Las medidas y la cirugía. El pecho cambia de tamaño a lo
     largo del ciclo, así que medirlo en cualquier momento da ruido. */
  const buenosDias = h.dia >= 5 && h.dia <= 10;
  tarjetas.push({
    icono: "📏", tono: buenosDias ? "ok" : "info",
    titulo: buenosDias ? "Hoy es buen día para tomarte las medidas" : "Cuándo tomarte las medidas",
    texto: buenosDias
      ? `Estás en el día ${h.dia} del ciclo. Entre el día 5 y el 10 los senos están en su tamaño de base, sin hinchazón hormonal. Medir siempre en esta ventana hace que los centímetros se puedan comparar de verdad — y el contorno de pecho es justo el dato que va a mirar tu cirujano.`
      : `Los senos cambian de tamaño durante el ciclo: en la semana previa al período se hinchan y pueden medir varios centímetros de más. Tomate las medidas entre el día 5 y el 10 del ciclo (te faltan ${h.dia < 5 ? 5 - h.dia : st.largoTipico - h.dia + 5} días) y siempre en esa misma ventana, así comparás peras con peras de acá a abril de 2027.`
  });

  /* 3 · Entrenamiento, dicho con honestidad: es una guía, no una regla. */
  tarjetas.push({
    icono: "🏋️", tono: "info", titulo: `Entrenar en fase ${h.info.label.toLowerCase()}`,
    texto: `${h.info.entrenamiento} Dicho esto: la evidencia de que haya que entrenar distinto según la fase es floja y cada cuerpo responde a su manera. Usalo como pista, no como orden — lo que mande es cómo te sentís ese día.`
  });

  /* 4 · Hierro, si los períodos vienen largos o abundantes. */
  const ultimos = st.periodos.slice(-3);
  const abundantes = ultimos.filter(p =>
    p.duracion >= 7 || p.dias.some(d => cycleDay(d)?.flow === "abundante")).length;
  if (abundantes >= 2) {
    tarjetas.push({
      icono: "🥩", tono: "info", titulo: "Hierro",
      texto: `Tus últimos períodos vinieron largos o abundantes, y con el sangrado se pierde hierro. Como además estás comiendo en déficit, vale la pena que la carne roja magra, las lentejas, la espinaca y el huevo no falten. Si andás con mucho cansancio o te mareás, un análisis de sangre lo saca en limpio.`
    });
  }

  /* 5 · Regularidad. Vale decirlo sin asustar, pero sin maquillarlo. */
  if (st.completos >= 3 && st.variacion > 8) {
    tarjetas.push({
      icono: "📋", tono: "warn", titulo: "Para comentarle a tu ginecóloga",
      texto: `Entre tu ciclo más corto (${st.minimo} días) y el más largo (${st.maximo}) hay ${st.variacion} días de diferencia. Una variación de más de 8 días es algo que conviene mencionar en la próxima consulta — no es una urgencia ni quiere decir que algo ande mal. Dato que suma: bajar de peso suele hacer que los ciclos se vuelvan más regulares, así que esto puede acomodarse solo en el camino.`
    });
  }

  /* 6 · Atraso. */
  if (h.atrasado >= 3) {
    tarjetas.push({
      icono: "📅", tono: "warn", titulo: `${h.atrasado} días de atraso`,
      texto: `Sobre la fecha estimada. Un atraso suelto le pasa a cualquiera — el estrés, el déficit de calorías y el ejercicio fuerte pueden correrlo. Si pasa de una semana y hay chance de embarazo, un test lo despeja.`
    });
  }

  return `<article class="panel">
      <h3>Lo que esto significa para vos</h3>
      <div class="cy-insights">
        ${tarjetas.map(t => `<div class="cy-insight ${t.tono}">
          <span class="cy-insight-icon">${t.icono}</span>
          <div><strong>${t.titulo}</strong><p>${t.texto}</p></div>
        </div>`).join("")}
      </div>
    </article>`;
}

function cycleHistoryHtml(st) {
  if (!st.periodos.length) return "";
  const filas = [...st.periodos].reverse().map(p => {
    const sintomas = [...new Set(p.dias.flatMap(d => cycleDay(d)?.symptoms || []))];
    return `<div class="cy-hist">
      <div>
        <strong>${formatShortDate(p.start)}</strong>
        <small>${p.duracion} ${p.duracion === 1 ? "día" : "días"} de período${sintomas.length
          ? " · " + sintomas.slice(0, 3).map(s => symptomInfo(s).label.toLowerCase()).join(", ") : ""}</small>
      </div>
      <span>${p.cicloLargo ? p.cicloLargo + " días" : "en curso"}</span>
    </div>`;
  }).join("");

  return `<article class="panel">
    <h3>Historial</h3>
    <div class="stats-grid mini-stats cy-stats3">
      <div class="stat-card"><span>${st.largoTipico}</span><p>Ciclo típico (días)</p></div>
      <div class="stat-card"><span>${st.duracionTipica}</span><p>Período típico (días)</p></div>
      <div class="stat-card"><span>${st.completos}</span><p>Ciclos completos</p></div>
    </div>
    <div class="cy-hist head"><div>Período</div><span>Ciclo</span></div>
    ${filas}
    <p class="dataset-note">Cargado desde tu informe de Salud del 17/10/2026 y actualizado con lo que vayas marcando.</p>
  </article>`;
}

/* ---------- eventos ---------- */

function setupCycleEvents() {
  const vista = $("cycle-view");
  if (!vista) return;

  vista.addEventListener("click", e => {
    const dia = e.target.closest("[data-cycle-day]");
    if (dia) {
      const f = dia.dataset.cycleDay;
      cycleSelected = cycleSelected === f ? null : f;
      renderCycle();
      if (cycleSelected) $("cycle-editor").scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    const mes = e.target.closest("[data-cycle-month]");
    if (mes) {
      const [a, m] = cycleMonth.split("-").map(Number);
      const d = new Date(a, m - 1 + Number(mes.dataset.cycleMonth), 1);
      cycleMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      renderCycle();
      return;
    }
    if (e.target.closest("[data-cycle-close]")) { cycleSelected = null; renderCycle(); return; }

    const flujo = e.target.closest("[data-cycle-flow]");
    if (flujo && cycleSelected) {
      setCycleDay(cycleSelected, { flow: flujo.dataset.cycleFlow || null });
      renderCycle(); renderHome();
      return;
    }
    if (e.target.closest("[data-cycle-spot]") && cycleSelected) {
      setCycleDay(cycleSelected, { spotting: !cycleDay(cycleSelected)?.spotting });
      renderCycle();
      return;
    }
    const sint = e.target.closest("[data-cycle-symptom]");
    if (sint && cycleSelected) {
      const k = sint.dataset.cycleSymptom;
      const actuales = cycleDay(cycleSelected)?.symptoms || [];
      setCycleDay(cycleSelected, {
        symptoms: actuales.includes(k) ? actuales.filter(x => x !== k) : [...actuales, k]
      });
      renderCycle();
      return;
    }
  });

  vista.addEventListener("input", e => {
    if (e.target.id === "cycle-note" && cycleSelected) {
      setCycleDay(cycleSelected, { note: e.target.value.trim() });
    }
  });
}

/* Resumen de una línea para la pantalla de Hoy. */
function cycleChipHtml() {
  const h = cycleToday();
  if (h.sinDatos) return "";
  const extra = h.atrasado ? `${h.atrasado} d de atraso`
    : h.faltan <= 3 ? `período en ${h.faltan} d`
    : `día ${h.dia}`;
  return `<button class="cycle-chip" data-nav="cycle-view" style="--c:${h.info.color}">
    <span>${h.info.icon}</span><div><strong>${h.info.label}</strong><small>${extra}</small></div>
  </button>`;
}
