/* ============================================================
   Nutrición · Nilmar Montilla
   Objetivo: bajar de peso conservando masa muscular.
   - Gasto estimado: Mifflin-St Jeor × nivel de actividad
   - Déficit según el ritmo elegido (máx. 0,75 kg/semana)
   - Proteína alta, calculada sobre el peso objetivo
   - Piso de seguridad: nunca por debajo de 1.400 kcal
   ============================================================ */

const KCAL_FLOOR = 1400;

// Medidas corporales que registra la app (en cm)
const MEASURE_FIELDS = [
  { id: "cuello", label: "Cuello" },
  { id: "pecho", label: "Pecho / senos" },
  { id: "cintura", label: "Cintura" },
  { id: "abdomen", label: "Abdomen (ombligo)" },
  { id: "cadera", label: "Cadera" },
  { id: "brazo", label: "Brazo" },
  { id: "muslo", label: "Muslo" }
];

// Mediciones ya tomadas, cargadas como punto de partida.
const MEASURES_BASE = [
  { date: "2026-07-18", cuello: 38, pecho: 127, cintura: 108, cadera: 129, abdomen: 133,
    nota: "Referencia inicial (alrededor de 115 kg). El abdomen se había registrado como \"cadera + abdomen\"." },
  { date: "2026-08-29", cuello: 37, pecho: 121, cintura: 107, cadera: 126, abdomen: 126,
    nota: "Abdomen medido por el ombligo: el punto anatómico no es igual al de julio, así que los −7 cm no son comparación exacta." },
  { date: "2026-10-17", cuello: 38, pecho: 118, cintura: 106, cadera: 127, abdomen: 122, muslo: 78, brazo: 34,
    nota: "Primera vez que se miden brazo y muslo: desde acá se pueden comparar." }
];

// Subir este número vuelve a cargar las mediciones de arriba que falten.
const MEASURES_SEED = 2;
/* Calorías extra el día que entrena.
   El nivel de actividad del perfil es SOLO la vida diaria sin ejercicio,
   así que el entrenamiento se suma aparte: así un día sin entrenar come
   menos, sin que nada se cuente dos veces. */
const TRAINING_TYPES = [
  { id: "none", label: "No entrené", short: "Sin entrenar", kcal: 0, icon: "🛋️" },
  { id: "light", label: "Movimiento suave", short: "Suave", kcal: 120, icon: "🚶‍♀️", hint: "Caminata corta, movilidad, estiramientos." },
  { id: "cardio", label: "Caminata o cardio", short: "Cardio", kcal: 220, icon: "🏃‍♀️", hint: "Caminata de 40-60 min o cardio sostenido." },
  { id: "strength", label: "Gimnasio o fuerza", short: "Fuerza", kcal: 280, icon: "🏋️‍♀️", hint: "Sesión de pesas completa." },
  { id: "long", label: "Día muy activo", short: "Muy activo", kcal: 450, icon: "⛰️", hint: "Etapa del Camino, caminata de varias horas, turismo a pie todo el día." }
];
const trainingType = id => TRAINING_TYPES.find(t => t.id === id) || TRAINING_TYPES[0];

// Qué entrenamiento sugiere el plan para cada tipo de día del módulo activo.
const DAY_TYPE_TRAINING = { strength: "strength", walk: "cardio", trek: "long", mobility: "light", rest: "none" };

function defaultNutrition() {
  return {
    profile: {
      weight: 102, height: 165, age: 34, sex: "f",
      activity: 1.3, goal: "lose", rate: 0.5,
      proteinPerKgTarget: 2.0, carbCycling: true, kcalAdjust: 0, configured: true
    },
    days: {},
    planLog: {},
    training: {},      // { "2026-10-16": "strength" } — lo que realmente hizo
    customFoods: [],
    weights: [],
    measures: []
  };
}

const n = () => state.nutrition;
const round5 = v => Math.round(v / 5) * 5;
const round10 = v => Math.round(v / 10) * 10;
const fmt1 = v => (Math.round(v * 10) / 10).toLocaleString("es-AR");

function weightStats() {
  const list = [...(n().weights || [])].sort((a, b) => a.date.localeCompare(b.date));
  if (!list.length) return { list, avg7: null, prevAvg7: null, diff: null, first: null };
  const lastDate = parseDateKey(list[list.length - 1].date);
  const daysAgo = e => Math.round((lastDate - parseDateKey(e.date)) / 86400000);
  const avg = arr => arr.length ? arr.reduce((a, e) => a + e.kg, 0) / arr.length : null;
  const avg7 = avg(list.filter(e => daysAgo(e) <= 6));
  const prevAvg7 = avg(list.filter(e => daysAgo(e) >= 7 && daysAgo(e) <= 13));
  const avg28 = avg(list.filter(e => daysAgo(e) <= 27));
  const prev28 = avg(list.filter(e => daysAgo(e) >= 28 && daysAgo(e) <= 55));
  return {
    list, avg7, prevAvg7, avg28, prev28, first: list[0], last: list[list.length - 1],
    diff: avg7 != null && prevAvg7 != null ? avg7 - prevAvg7 : null,
    // ritmo semanal usando 4 semanas (más estable que 7 días)
    rate4w: avg28 != null && prev28 != null ? (avg28 - prev28) / 4 : (avg7 != null && prevAvg7 != null ? avg7 - prevAvg7 : null)
  };
}

/* El nivel de actividad cambió de significado: antes incluía el ejercicio,
   ahora es solo la vida diaria y el entrenamiento se suma por día. */
function migrateProfile() {
  const pr = n().profile;
  if (pr.activity > 1.45) pr.activity = 1.3;        // venía de "moderado 3-5 días"
  else if (pr.activity > 1.35) pr.activity = 1.3;   // venía de "ligero 1-3 días"
  if (!ACTIVITY_LEVELS.some(a => a.value === pr.activity)) pr.activity = 1.3;
  n().training ||= {};
  saveState();
}

function migrateMeasures() {
  const nu = n();
  nu.measures = (nu.measures || []).map(m => {
    if (m.waist != null || m.hip != null) {
      const { waist, hip, ...resto } = m;
      return { ...resto, cintura: resto.cintura ?? waist ?? null, cadera: resto.cadera ?? hip ?? null };
    }
    return m;
  });
  // Se siembra por versión, no por un sí/no: así una medición nueva
  // entra aunque la app ya haya cargado las anteriores. Nunca pisa lo
  // que haya cargado ella a mano en esa misma fecha.
  const sembrado = nu.seededMeasures === true ? 1 : (nu.measuresSeed || 0);
  if (sembrado < MEASURES_SEED) {
    MEASURES_BASE.forEach(base => {
      if (!nu.measures.some(m => m.date === base.date)) nu.measures.push({ ...base });
    });
    nu.measures.sort((a, b) => a.date.localeCompare(b.date));
    nu.measuresSeed = MEASURES_SEED;
    delete nu.seededMeasures;
    saveState();
  }
}

function currentWeight() {
  const s = weightStats();
  return s.avg7 || n().profile.weight;
}

/* ---------------- Entrenamiento del día ---------------- */

// Lo que el plan propone para esa fecha (sugerencia, no lo definitivo).
function suggestedTraining(dateKey = todayDateKey()) {
  try {
    const d = dayForDate(parseDateKey(dateKey));
    return DAY_TYPE_TRAINING[d.type] || "none";
  } catch { return "none"; }
}

// Lo que realmente hizo: lo que ella eligió, o la sugerencia del plan si
// ya registró actividad ese día, o "no entrené" si el día está en blanco.
function trainingForDate(dateKey = todayDateKey()) {
  const saved = (n().training || {})[dateKey];
  if (saved) return saved;
  const huboActividad = (state.logs || []).some(l => localDateKey(new Date(l.date)) === dateKey);
  return huboActividad ? suggestedTraining(dateKey) : "none";
}

function setTrainingForDate(id, dateKey = todayDateKey()) {
  n().training ||= {};
  n().training[dateKey] = id;
  const keys = Object.keys(n().training).sort();
  while (keys.length > 180) delete n().training[keys.shift()];
  saveState();
  renderNutrition();
  renderHome();
}

function nutritionTargets(trainingId = "none") {
  const pr = n().profile;
  const w = currentWeight();
  const bmr = 10 * w + 6.25 * pr.height - 5 * pr.age + (pr.sex === "f" ? -161 : 5);
  // Gasto de la vida diaria, SIN contar el entrenamiento.
  const baseTdee = bmr * pr.activity;
  const extra = pr.carbCycling ? trainingType(trainingId).kcal : Math.round(trainingType("cardio").kcal * 0.7);
  const tdee = baseTdee + extra;
  const deficit = pr.goal === "lose" ? pr.rate * 1100 : 0;

  let kcal = tdee - deficit + (pr.kcalAdjust || 0);
  const floored = kcal < KCAL_FLOOR;
  if (floored) kcal = KCAL_FLOOR;
  kcal = round10(kcal);

  // Calorías de un día sin entrenar: sirve de referencia en pantalla.
  const restKcal = round10(Math.max(KCAL_FLOOR, baseTdee - deficit + (pr.kcalAdjust || 0)));

  const target = state.goals?.targetWeight || 80;
  const protein = round5(pr.proteinPerKgTarget * Math.min(target, w));
  const fat = round5((kcal * 0.30) / 9);
  const carbs = Math.max(0, round5((kcal - protein * 4 - fat * 9) / 4));
  return {
    bmr: Math.round(bmr), baseTdee: round10(baseTdee), tdee: round10(tdee),
    extra, restKcal, kcal, protein, fat, carbs, weight: w,
    trainingId, floored, deficit: Math.round(deficit)
  };
}

const targetsForDate = (dateKey = todayDateKey()) => nutritionTargets(trainingForDate(dateKey));

function dayEntries(dateKey = todayDateKey()) { return n().days[dateKey] || []; }
function dayTotals(dateKey = todayDateKey()) {
  return dayEntries(dateKey).reduce((t, e) => ({ p: t.p + e.p, c: t.c + e.c, f: t.f + e.f, kcal: t.kcal + e.kcal }), { p: 0, c: 0, f: 0, kcal: 0 });
}
function allFoods() { return [...FOOD_DB, ...(n().customFoods || []).map(normalizeFood)]; }

// Da forma nueva (gBase + measures) a los alimentos guardados con el formato viejo.
function normalizeFood(f) {
  if (f.gBase && f.measures) return { ...f, group: "Mis alimentos" };
  return { ...f, group: "Mis alimentos", gBase: 1, measures: [{ label: f.unit || "porción", g: 1 }], defaultQty: 1 };
}

function selectedFood() { return allFoods().find(f => f.id === $("food-select").value); }
function selectedMeasure(food) {
  const idx = Number($("food-measure").value || 0);
  return (food?.measures || [{ label: "porción", g: 1 }])[idx] || food.measures[0];
}
const esPeso = m => m.label === "g" || m.label === "ml";

// Al cambiar de alimento se cargan sus medidas y la cantidad sugerida.
function syncFoodMeasures(resetQty = true) {
  const food = selectedFood();
  const sel = $("food-measure");
  if (!food) { sel.innerHTML = ""; return; }
  sel.innerHTML = (food.measures || []).map((m, i) => `<option value="${i}">${escapeHtml(m.label)}</option>`).join("");
  sel.value = "0";
  if (resetQty) $("food-qty").value = food.defaultQty ?? 1;
  updateFoodPreview();
}

function pruneNutritionDays() { const keys = Object.keys(n().days).sort(); while (keys.length > 90) delete n().days[keys.shift()]; }

function addFoodEntry({ name, qtyText, grams, p, c, f, meal }) {
  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name, qtyText, grams: grams || null, meal,
    p: Math.round(p * 10) / 10, c: Math.round(c * 10) / 10, f: Math.round(f * 10) / 10
  };
  entry.kcal = Math.round(entry.p * 4 + entry.c * 4 + entry.f * 9);
  const key = todayDateKey();
  n().days[key] = [...(n().days[key] || []), entry];
  pruneNutritionDays(); saveState(); renderNutrition(); renderHome();

  const aviso = $("food-added");
  if (aviso) {
    const t = targetsForDate(), restan = Math.round(t.kcal - dayTotals().kcal);
    aviso.textContent = `Agregado: ${name} · ${entry.kcal} kcal. ${restan >= 0 ? `Te quedan ${restan} kcal.` : `Te pasaste por ${Math.abs(restan)} kcal.`}`;
    aviso.classList.remove("hidden");
    clearTimeout(addFoodTimer);
    addFoodTimer = setTimeout(() => aviso.classList.add("hidden"), 4000);
  }
}
let addFoodTimer = null;

// Las comidas guardadas con el formato viejo se siguen mostrando bien.
function entryQtyText(e) { return e.qtyText || `${fmt1(e.qty || 1)} × ${e.unit || "porción"}`; }
function removeFoodEntry(id) {
  const key = todayDateKey();
  Sync.marcarBorrado("meal:" + id);
  n().days[key] = dayEntries(key).filter(e => e.id !== id);
  saveState(); renderNutrition(); renderHome();
}

/* ---------------- Plan de la nutricionista ---------------- */

function planChecks(dateKey = todayDateKey()) { return (n().planLog || {})[dateKey] || {}; }

function togglePlanCheck(id) {
  const key = todayDateKey();
  n().planLog ||= {};
  const day = { ...(n().planLog[key] || {}) };
  day[id] = !day[id];
  n().planLog[key] = day;
  const keys = Object.keys(n().planLog).sort();
  while (keys.length > 120) delete n().planLog[keys.shift()];
  saveState(); renderPlanDiario(); renderHome();
}

function planProgress(dateKey = todayDateKey()) {
  const c = planChecks(dateKey);
  return { done: PLAN_CHECKS.filter(i => c[i.id]).length, total: PLAN_CHECKS.length };
}

function renderPlanDiario() {
  if (!$("plan-today")) return;
  const dk = todayKey();
  const comida = PLAN_COMIDAS[dk];
  const checks = planChecks();
  const prog = planProgress();

  $("plan-progress").textContent = `${prog.done}/${prog.total}`;
  $("plan-day-label").textContent = DAY_LABELS[dk];

  const flexAlmuerzo = comida.almuerzo === "FLEX";
  $("plan-today").innerHTML = `
    <div class="plan-meal">
      <p class="eyebrow">Desayuno o merienda · elegí una</p>
      <p class="plan-drink">${escapeHtml(PLAN_DESAYUNO_BEBIDA)}</p>
      <ul class="plan-options">${PLAN_DESAYUNOS.map(o => `<li>${escapeHtml(o)}</li>`).join("")}</ul>
    </div>
    <div class="plan-meal">
      <p class="eyebrow">Colación de mañana o tarde · elegí una</p>
      <ul class="plan-options">${PLAN_COLACIONES.map(o => `<li>${escapeHtml(o)}</li>`).join("")}</ul>
    </div>
    <div class="plan-meal highlight">
      <p class="eyebrow">Almuerzo de hoy</p>
      ${flexAlmuerzo ? `<p class="flex-badge">FLEX · comida libre</p><p class="muted">${escapeHtml(PLAN_FLEX)}</p>`
        : `<p class="plan-main">${escapeHtml(comida.almuerzo)}</p>`}
    </div>
    <div class="plan-meal">
      <p class="eyebrow">Cena de hoy</p>
      ${comida.cena === "FLEX"
        ? `<p class="flex-badge">FLEX · comida libre</p><p class="muted">${escapeHtml(PLAN_FLEX)}</p>`
        : `<ul class="plan-options">${PLAN_CENAS.map(o => `<li>${escapeHtml(o)}</li>`).join("")}</ul>`}
    </div>`;

  $("plan-checklist").innerHTML = PLAN_CHECKS.map(i => `
    <button class="plan-check ${checks[i.id] ? "done" : ""}" data-plan-check="${i.id}">
      <span class="tick">${checks[i.id] ? "✓" : ""}</span>${escapeHtml(i.label)}
    </button>`).join("");

  // Semana
  const rows = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(); dt.setDate(dt.getDate() - i);
    const key = localDateKey(dt);
    const pr = planProgress(key);
    if (!pr.done) continue;
    rows.push(`<div class="hist-row"><span>${formatShortDate(key)}</span><span class="${pr.done >= 5 ? "ok" : "warn"}">${pr.done}/${pr.total} comidas</span><span>${pr.done >= 5 ? "Día cumplido" : "Parcial"}</span></div>`);
  }
  $("plan-week").innerHTML = rows.length ? rows.reverse().join("") : '<p class="muted">Marcá cada comida a medida que la hacés y acá vas a ver la semana.</p>';
}

function renderPlanFijo() {
  if (!$("plan-semaforo-si")) return;
  $("plan-semaforo-si").innerHTML = PLAN_SEMAFORO.si.map(x => `<li>${escapeHtml(x)}</li>`).join("");
  $("plan-semaforo-no").innerHTML = PLAN_SEMAFORO.no.map(x => `<li>${escapeHtml(x)}</li>`).join("");
  $("plan-semaforo-nota").textContent = PLAN_SEMAFORO.nota;
  $("plan-platos").innerHTML = PLAN_PLATOS.map(p => `
    <div class="plato">
      <strong>${escapeHtml(p.titulo)}</strong>
      <div class="plato-bar">${p.partes.map(([txt, cls]) => `<span class="pt-${cls}">${escapeHtml(txt)}</span>`).join("")}</div>
      <small>${escapeHtml(p.detalle)}</small>
    </div>`).join("");
  $("plan-recomendaciones").innerHTML = PLAN_RECOMENDACIONES.map(x => `<li>${escapeHtml(x)}</li>`).join("");
  $("plan-profesional").innerHTML = `${escapeHtml(PLAN_PROFESIONAL.nombre)} · ${escapeHtml(PLAN_PROFESIONAL.matricula)}<br>
    <span class="muted">${escapeHtml(PLAN_PROFESIONAL.estudio)} · ${escapeHtml(PLAN_PROFESIONAL.contacto)}</span>`;
}

/* ---------------- Render: nutrición ---------------- */

function macroBar(label, value, target, unit, cls) {
  const pct = target ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const left = Math.round(target - value);
  return `<div class="macro-row ${cls}">
    <div class="macro-head"><strong>${label}</strong><span>${Math.round(value)} / ${target}${unit} · <em>${left >= 0 ? `faltan ${left}${unit}` : `+${Math.abs(left)}${unit}`}</em></span></div>
    <div class="macro-track"><i style="width:${pct}%"></i></div>
  </div>`;
}

function renderNutritionMini() {
  const box = $("nutrition-mini");
  if (!box) return;
  const t = targetsForDate();
  const tot = dayTotals();
  const restan = Math.round(t.kcal - tot.kcal);
  const pct = Math.min(100, Math.round((tot.kcal / t.kcal) * 100));
  const tr = trainingType(trainingForDate());
  const pr = planProgress();
  box.innerHTML = `
    <div class="section-title-row compact-row">
      <div><p class="eyebrow">Comida de hoy · ${escapeHtml(tr.short)}</p>
        <h3>${restan >= 0 ? `Te quedan ${restan} kcal` : `${Math.abs(restan)} kcal de más`}</h3></div>
      <button class="ghost-btn small-btn" data-nav="nutrition-view">Registrar</button>
    </div>
    <div class="macro-track mini"><i class="${restan < 0 ? "over" : ""}" style="width:${pct}%"></i></div>
    <p class="muted mini-line">${Math.round(tot.kcal)} de ${t.kcal} kcal · proteína ${Math.round(tot.p)}/${t.protein} g · plan ${pr.done}/${pr.total} comidas</p>`;
}

/* ---------------- Calorías del día ---------------- */

function kcalRingSvg(consumido, objetivo) {
  const R = 54, C = 2 * Math.PI * R;
  const pct = Math.max(0, Math.min(1, objetivo ? consumido / objetivo : 0));
  const over = consumido > objetivo;
  const restan = Math.round(objetivo - consumido);
  return `<svg viewBox="0 0 140 140" class="kcal-ring" role="img" aria-label="${Math.round(consumido)} de ${objetivo} kcal">
    <circle cx="70" cy="70" r="${R}" class="ring-bg"/>
    <circle cx="70" cy="70" r="${R}" class="ring-fill ${over ? "over" : ""}"
      stroke-dasharray="${(C * pct).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 70 70)"/>
    <text x="70" y="64" class="ring-num ${over ? "over" : ""}">${Math.abs(restan)}</text>
    <text x="70" y="84" class="ring-cap">${over ? "kcal de más" : "kcal libres"}</text>
  </svg>`;
}

function renderCalorias() {
  if (!$("kcal-card")) return;
  const dateKey = todayDateKey();
  const t = targetsForDate(dateKey);
  const tot = dayTotals();
  const actual = trainingForDate(dateKey);
  const sugerido = suggestedTraining(dateKey);

  $("kcal-ring-box").innerHTML = kcalRingSvg(tot.kcal, t.kcal);
  $("kcal-numbers").innerHTML = `
    <div class="kcal-num"><strong>${t.kcal}</strong><span>objetivo</span></div>
    <div class="kcal-num"><strong>${Math.round(tot.kcal)}</strong><span>comiste</span></div>`;

  $("training-chips").innerHTML = TRAINING_TYPES.map(tt => `
    <button class="train-chip ${tt.id === actual ? "active" : ""}" data-training="${tt.id}">
      <span class="tc-icon">${tt.icon}</span>
      <span class="tc-label">${escapeHtml(tt.short)}</span>
      <span class="tc-kcal">${tt.kcal ? "+" + tt.kcal : "base"}</span>
    </button>`).join("");

  // Días entrenados en los últimos 7, contra la meta semanal.
  let entrenados = 0;
  for (let i = 0; i < 7; i++) {
    const dt = new Date(); dt.setDate(dt.getDate() - i);
    if (trainingForDate(localDateKey(dt)) !== "none") entrenados++;
  }
  const metaSemanal = state.goals?.weeklyTrainings || 5;
  $("week-training").innerHTML = `Últimos 7 días: <strong>${entrenados} de ${metaSemanal}</strong> entrenamientos${entrenados >= metaSemanal ? " ✓" : ""}`;

  const tr = trainingType(actual);
  let nota;
  if (actual === "none") {
    nota = `Día sin entrenar: comés <strong>${t.kcal} kcal</strong>, el objetivo más bajo de la semana. ${sugerido !== "none" ? `El plan proponía ${escapeHtml(trainingType(sugerido).label.toLowerCase())}; si al final entrenás, cambialo acá y suben las calorías.` : ""}`;
  } else {
    nota = `${escapeHtml(tr.label)}: <strong>+${tr.kcal} kcal</strong> sobre las ${t.restKcal} de un día sin entrenar. ${tr.hint ? escapeHtml(tr.hint) : ""}`;
  }
  $("training-note").innerHTML = nota;
  $("nut-floor-warning").classList.toggle("hidden", !t.floored);

  $("nut-bars").innerHTML =
    macroBar("Proteína", tot.p, t.protein, "g", "m-p") +
    macroBar("Carbohidratos", tot.c, t.carbs, "g", "m-c") +
    macroBar("Grasas", tot.f, t.fat, "g", "m-f");
  $("protein-hint").textContent = tot.p >= t.protein * 0.9
    ? "Proteína cumplida ✓ Es lo que protege tu músculo mientras bajás."
    : `Te faltan ${Math.round(t.protein - tot.p)} g de proteína. Es el macro que más cuida el músculo: priorizalo antes que los carbohidratos.`;
}

function renderNutrition() {
  if (!$("nutrition-view")) return;
  renderCalorias();
  renderPlanDiario();
  renderPlanFijo();

  const sel = $("food-select");
  const current = sel.value;
  const groups = {};
  allFoods().forEach(f => { (groups[f.group] ||= []).push(f); });
  sel.innerHTML = Object.entries(groups).map(([g, items]) =>
    `<optgroup label="${escapeHtml(g)}">${items.map(f => `<option value="${escapeHtml(f.id)}">${escapeHtml(f.name)}</option>`).join("")}</optgroup>`).join("");
  if (current && allFoods().some(f => f.id === current)) sel.value = current;
  syncFoodMeasures(!current);
  $("meal-select").innerHTML = MEALS.map(m => `<option>${m}</option>`).join("");
  if (!$("meal-select").dataset.touched) $("meal-select").value = guessMeal();

  const entries = dayEntries();
  $("food-log").innerHTML = entries.length
    ? MEALS.filter(m => entries.some(e => e.meal === m)).map(m => {
        const items = entries.filter(e => e.meal === m);
        const sub = items.reduce((a, e) => a + e.kcal, 0);
        return `<div class="meal-group">
          <div class="meal-head"><p class="eyebrow">${m}</p><span>${sub} kcal</span></div>
          ${items.map(e => `
            <div class="food-item">
              <div><strong>${escapeHtml(e.name)}</strong><small>${escapeHtml(entryQtyText(e))} · P ${fmt1(e.p)} · C ${fmt1(e.c)} · G ${fmt1(e.f)}</small></div>
              <div class="food-kcal">${e.kcal}<small>kcal</small></div>
              <button class="icon-btn" data-remove-food="${e.id}" aria-label="Eliminar">✕</button>
            </div>`).join("")}
        </div>`;
      }).join("")
    : '<p class="muted">Todavía no registraste comidas hoy. Agregá la primera arriba.</p>';

  renderMacroHistory();
  renderProfileForm();
}

function guessMeal() {
  const h = new Date().getHours();
  if (h < 11) return "Desayuno";
  if (h < 15) return "Almuerzo";
  if (h < 19) return "Merienda";
  return "Cena";
}

function updateFoodPreview() {
  const food = selectedFood();
  const qty = parseFloat($("food-qty").value) || 0;
  if (!food) { $("food-preview").textContent = ""; return; }
  const m = selectedMeasure(food);
  const macros = foodMacros(food, qty, m);
  const grams = qty * (m.g || 1);
  $("food-preview").innerHTML = `<strong>${macrosKcal(macros)} kcal</strong> · P ${fmt1(macros.p)} g · C ${fmt1(macros.c)} g · G ${fmt1(macros.f)} g
    <span class="preview-sub">${esPeso(m) ? `valores por ${food.gBase} ${m.label}` : `≈ ${fmt1(grams)} g`}</span>`;
}

function renderMacroHistory() {
  const rows = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(); dt.setDate(dt.getDate() - i);
    const key = localDateKey(dt);
    if (!dayEntries(key).length) continue;
    const tot = dayTotals(key);
    const t = targetsForDate(key);
    const pOk = tot.p >= t.protein * 0.9;
    const kOk = tot.kcal <= t.kcal * 1.1;
    rows.push(`<div class="hist-row"><span>${formatShortDate(key)} ${trainingType(trainingForDate(key)).icon}</span><span class="${kOk ? "ok" : "warn"}">${Math.round(tot.kcal)} / ${t.kcal}</span><span class="${pOk ? "ok" : "warn"}">P ${Math.round(tot.p)} g</span></div>`);
  }
  $("macro-history").innerHTML = rows.length
    ? rows.reverse().join("") + '<p class="dataset-note">Verde: calorías dentro del objetivo y proteína cumplida. El ícono muestra si ese día entrenaste.</p>'
    : '<p class="muted">Acá vas a ver tus últimos 7 días registrados.</p>';
}

function renderProfileForm() {
  const pr = n().profile;
  const t = nutritionTargets("rest");
  $("pf-height").value = pr.height;
  $("pf-age").value = pr.age;
  $("pf-weight").value = pr.weight;
  $("pf-activity").innerHTML = ACTIVITY_LEVELS.map(a => `<option value="${a.value}">${a.label}</option>`).join("");
  $("pf-activity").value = String(pr.activity);
  $("pf-goal").value = pr.goal;
  $("pf-rate").value = String(pr.rate);
  $("pf-rate-row").classList.toggle("hidden", pr.goal !== "lose");
  $("pf-protein").value = pr.proteinPerKgTarget;
  $("pf-protein-label").textContent = `${fmt1(pr.proteinPerKgTarget)} g por kg de peso objetivo`;
  $("pf-carbcycle").checked = pr.carbCycling;
  $("pf-summary").innerHTML = `
    <p>Peso usado en el cálculo: <strong>${fmt1(t.weight)} kg</strong> ${weightStats().avg7 ? "(promedio de 7 días)" : "(del perfil)"}</p>
    <p>Metabolismo basal: <strong>${t.bmr} kcal</strong> · Vida diaria sin entrenar: <strong>${t.baseTdee} kcal</strong></p>
    ${t.deficit ? `<p>Déficit aplicado: <strong>−${t.deficit} kcal</strong> (≈ ${fmt1(pr.rate)} kg por semana)</p>` : ""}
    <div class="kcal-table">
      ${TRAINING_TYPES.map(tt => {
        const tg = nutritionTargets(tt.id);
        return `<div class="kcal-row"><span>${tt.icon} ${escapeHtml(tt.label)}</span><strong>${tg.kcal} kcal</strong><span>P ${tg.protein} · C ${tg.carbs} · G ${tg.fat}</span></div>`;
      }).join("")}
    </div>
    <p class="dataset-note">El nivel de actividad de acá arriba es solo tu vida diaria: el ejercicio se suma por día según lo que marques en "¿Entrenaste hoy?". Son estimaciones; el registro de peso te dice si hay que ajustar. Antes de una cirugía conviene que un médico o nutricionista revise el plan.</p>`;
}

function saveProfile() {
  const pr = n().profile;
  const num = (id, min, max, fallback) => { const v = parseFloat($(id).value); return v >= min && v <= max ? v : fallback; };
  pr.height = num("pf-height", 120, 220, pr.height);
  pr.age = num("pf-age", 14, 90, pr.age);
  pr.weight = num("pf-weight", 35, 300, pr.weight);
  pr.activity = parseFloat($("pf-activity").value);
  pr.goal = $("pf-goal").value;
  pr.rate = parseFloat($("pf-rate").value);
  pr.proteinPerKgTarget = num("pf-protein", 1.6, 2.4, pr.proteinPerKgTarget);
  pr.carbCycling = $("pf-carbcycle").checked;
  saveState(); renderNutrition(); renderHome();
  $("pf-saved").classList.remove("hidden");
  setTimeout(() => $("pf-saved").classList.add("hidden"), 1800);
}

/* ---------------- Render: progreso (peso y medidas) ---------------- */

function renderProgress() {
  if (!$("progress-view")) return;
  const s = weightStats();
  const g = state.goals;
  const startW = s.first ? Math.max(s.first.kg, g.startWeight) : g.startWeight;
  const cur = s.avg7 || n().profile.weight;
  const lost = Math.max(0, startW - cur);
  const total = Math.max(1, startW - g.targetWeight);
  const pct = Math.min(100, Math.round((lost / total) * 100));

  $("goal-bar").style.width = `${pct}%`;
  $("goal-text").innerHTML = `<strong>${fmt1(cur)} kg</strong> · bajaste ${fmt1(lost)} kg · faltan ${fmt1(Math.max(0, cur - g.targetWeight))} kg para los ${g.targetWeight} kg`;

  // Proyección
  const rate = s.rate4w;
  let proj = "Registrá tu peso 2-3 veces por semana. Con unas semanas de datos calculo tu ritmo real y la fecha estimada.";
  if (rate != null && rate < -0.05) {
    const weeks = Math.ceil((cur - g.targetWeight) / Math.abs(rate));
    const date = new Date(); date.setDate(date.getDate() + weeks * 7);
    proj = `Tu ritmo actual es de ${fmt1(Math.abs(rate))} kg por semana. A ese paso llegarías a ${g.targetWeight} kg alrededor de ${new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(date)}.`;
    if (Math.abs(rate) > 0.9) proj += " Ojo: es un ritmo rápido. Bajar más de 0,8 kg por semana suele costar músculo y flacidez.";
  } else if (rate != null && rate >= -0.05) {
    proj = "El peso está estancado en las últimas semanas. Antes de bajar calorías, revisá el registro de comidas de una semana completa: casi siempre aparece ahí.";
  }
  const weeksToSurgery = g.surgeryDate ? Math.round((parseDateKey(g.surgeryDate) - new Date()) / (7 * 86400000)) : null;
  if (weeksToSurgery != null && weeksToSurgery > 0 && rate != null && rate < -0.05) {
    proj += ` Para la cirugía (faltan ${weeksToSurgery} semanas) estarías cerca de ${fmt1(Math.max(g.targetWeight, cur + rate * weeksToSurgery))} kg.`;
  }
  $("goal-projection").textContent = proj;

  $("weight-avg").textContent = s.avg7 ? `${fmt1(s.avg7)} kg` : "—";
  $("weight-diff").textContent = s.diff != null ? `${s.diff > 0 ? "+" : ""}${fmt1(s.diff)} kg` : "—";
  $("weight-date").value ||= todayDateKey();

  let msg = "Pesate 2-3 veces por semana, siempre a la misma hora (ideal: en ayunas y después del baño). El peso sube y baja por agua, sal y hormonas: lo que importa es el promedio.";
  let suggest = 0;
  const pr = n().profile;
  if (s.diff != null) {
    const d = s.diff;
    if (pr.goal === "lose") {
      if (d > -0.05) { msg = "El promedio no bajó esta semana. Si viene pasando hace 3 semanas seguidas, restá ~150 kcal o sumá una caminata."; suggest = -150; }
      else if (d < -1.0) { msg = `Bajaste ${fmt1(Math.abs(d))} kg en una semana: es demasiado rápido y ahí es donde se pierde músculo. Sumá ~150 kcal.`; suggest = 150; }
      else msg = `Ritmo saludable (${fmt1(d)} kg esta semana) ✓ Seguí así.`;
    } else {
      msg = Math.abs(d) <= 0.3 ? "Peso estable ✓" : `Cambio de ${fmt1(d)} kg esta semana.`;
    }
  }
  $("weight-feedback").textContent = msg;
  const btn = $("apply-kcal-adjust");
  btn.classList.toggle("hidden", !suggest);
  btn.dataset.adjust = suggest;
  btn.textContent = suggest > 0 ? "Sumar 150 kcal" : "Restar 150 kcal";
  $("kcal-adjust-note").textContent = pr.kcalAdjust ? `Ajuste manual activo: ${pr.kcalAdjust > 0 ? "+" : ""}${pr.kcalAdjust} kcal` : "";
  $("reset-kcal-adjust").classList.toggle("hidden", !pr.kcalAdjust);

  $("weight-chart").innerHTML = weightChartSvg(s.list.slice(-40), g.targetWeight);
  $("weight-list").innerHTML = s.list.slice(-8).reverse().map(e => `
    <div class="weight-item"><span>${formatShortDate(e.date)}</span><strong>${fmt1(e.kg)} kg</strong>
    <button class="icon-btn" data-remove-weight="${e.date}" aria-label="Eliminar">✕</button></div>`).join("");

  renderMeasures();

  renderActivityHistory();
}

function renderMeasures() {
  const ms = [...(n().measures || [])].sort((a, b) => a.date.localeCompare(b.date));
  $("measure-date").value ||= todayDateKey();
  if (!ms.length) {
    $("measure-compare").innerHTML = '<p class="muted">Tomate las medidas y vas a poder comparar contra la primera vez.</p>';
    $("measure-list").innerHTML = "";
    return;
  }
  const first = ms[0], last = ms[ms.length - 1];
  const rows = MEASURE_FIELDS.filter(f => first[f.id] != null || last[f.id] != null).map(f => {
    const a = first[f.id], b = last[f.id];
    const diff = (a != null && b != null && ms.length > 1) ? b - a : null;
    const cls = diff == null ? "" : (diff < 0 ? "ok" : (diff > 0 ? "warn" : ""));
    return `<div class="measure-row">
      <span>${f.label}</span>
      <span>${a != null ? fmt1(a) + " cm" : "—"}</span>
      <span><strong>${b != null ? fmt1(b) + " cm" : "—"}</strong></span>
      <span class="${cls}">${diff == null ? "—" : (diff > 0 ? "+" : "") + fmt1(diff) + " cm"}</span>
    </div>`;
  }).join("");
  const totalCm = MEASURE_FIELDS.reduce((acc, f) => {
    const a = first[f.id], b = last[f.id];
    return acc + (a != null && b != null ? Math.max(0, a - b) : 0);
  }, 0);
  $("measure-compare").innerHTML = `
    <div class="measure-row head"><span>Medida</span><span>${formatShortDate(first.date)}</span><span>${formatShortDate(last.date)}</span><span>Cambio</span></div>
    ${rows}
    ${ms.length > 1 && totalCm > 0 ? `<p class="dataset-note"><strong>${fmt1(totalCm)} cm menos</strong> en total entre la primera y la última medición. Cuando la balanza se traba, esto sigue bajando: es la mejor señal de que estás perdiendo grasa y no músculo.</p>` : ""}
    ${last.nota ? `<p class="dataset-note">Última nota: ${escapeHtml(last.nota)}</p>` : ""}`;

  $("measure-list").innerHTML = [...ms].reverse().slice(0, 8).map(m => {
    const vals = MEASURE_FIELDS.filter(f => m[f.id] != null).map(f => `${f.label} ${fmt1(m[f.id])}`).join(" · ");
    return `<div class="measure-item">
      <div><strong>${formatShortDate(m.date)}</strong><small>${vals || "Sin datos"}</small>${m.nota ? `<small class="nota">${escapeHtml(m.nota)}</small>` : ""}</div>
      <button class="icon-btn" data-remove-measure="${m.date}" aria-label="Eliminar">✕</button>
    </div>`;
  }).join("");
}

function weightChartSvg(list, target) {
  if (list.length < 2) return '<p class="muted chart-empty">El gráfico aparece con 2 o más registros.</p>';
  const W = 320, H = 130, P = 16;
  const kgs = list.map(e => e.kg);
  const min = Math.min(...kgs, target) - 0.5, max = Math.max(...kgs) + 0.5;
  const x = i => P + (i * (W - P * 2)) / (list.length - 1);
  const y = v => H - P - ((v - min) * (H - P * 2)) / (max - min);
  const raw = list.map((e, i) => `${x(i).toFixed(1)},${y(e.kg).toFixed(1)}`).join(" ");
  const ma = list.map((_, i) => {
    const win = list.slice(Math.max(0, i - 6), i + 1);
    return `${x(i).toFixed(1)},${y(win.reduce((a, e) => a + e.kg, 0) / win.length).toFixed(1)}`;
  }).join(" ");
  const ty = y(target);
  return `<svg viewBox="0 0 ${W} ${H}" class="weight-svg" role="img" aria-label="Evolución del peso">
    ${ty > 0 && ty < H ? `<line x1="${P}" x2="${W - P}" y1="${ty.toFixed(1)}" y2="${ty.toFixed(1)}" class="line-target"/><text x="${W - P}" y="${(ty - 4).toFixed(1)}" class="chart-label" text-anchor="end">meta ${target} kg</text>` : ""}
    <polyline points="${raw}" class="line-raw"/>
    <polyline points="${ma}" class="line-avg"/>
    ${list.map((e, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(e.kg).toFixed(1)}" r="2.4" class="dot"/>`).join("")}
  </svg>
  <p class="chart-legend"><span class="lg-raw"></span>Diario<span class="lg-avg"></span>Promedio 7 días</p>`;
}

function setupNutritionEvents() {
  $("food-select").addEventListener("change", () => syncFoodMeasures(true));
  $("food-measure").addEventListener("change", () => {
    const food = selectedFood();
    const m = selectedMeasure(food);
    const qty = parseFloat($("food-qty").value) || 1;
    // Al pasar a gramos sugerimos el equivalente de lo que había cargado.
    if (esPeso(m)) $("food-qty").value = Math.round(qty * ((food.measures[0]?.g) || 1)) || food.gBase;
    else $("food-qty").value = 1;
    updateFoodPreview();
  });
  $("food-qty").addEventListener("input", updateFoodPreview);
  $("meal-select").addEventListener("change", () => { $("meal-select").dataset.touched = "1"; });
  document.querySelectorAll("[data-qty-step]").forEach(b => b.addEventListener("click", () => {
    const m = selectedMeasure(selectedFood());
    const porGramo = esPeso(m);
    const paso = (porGramo ? 10 : 0.5) * Math.sign(parseFloat(b.dataset.qtyStep));
    const min = porGramo ? 5 : 0.25;
    $("food-qty").value = Math.max(min, Math.round(((parseFloat($("food-qty").value) || 0) + paso) * 100) / 100);
    updateFoodPreview();
  }));
  $("add-food").addEventListener("click", () => {
    const food = selectedFood();
    const qty = parseFloat($("food-qty").value);
    if (!food || !(qty > 0)) return;
    const m = selectedMeasure(food);
    const macros = foodMacros(food, qty, m);
    addFoodEntry({
      name: food.name,
      qtyText: esPeso(m) ? `${fmt1(qty)} ${m.label}` : `${fmt1(qty)} × ${m.label}`,
      grams: qty * (m.g || 1),
      p: macros.p, c: macros.c, f: macros.f,
      meal: $("meal-select").value
    });
  });
  $("add-custom-food").addEventListener("click", () => {
    const name = $("cf-name").value.trim();
    const p = parseFloat($("cf-p").value) || 0, c = parseFloat($("cf-c").value) || 0, f = parseFloat($("cf-f").value) || 0;
    const baseQty = parseFloat($("cf-base").value) || 0;
    const baseUnit = $("cf-unit-type").value;
    if (!name || p + c + f <= 0 || !(baseQty > 0)) { $("cf-error").classList.remove("hidden"); return; }
    $("cf-error").classList.add("hidden");
    const porPeso = baseUnit === "g" || baseUnit === "ml";
    const food = {
      id: "custom-" + Date.now(), name, p, c, f, gBase: baseQty,
      measures: porPeso
        ? [{ label: baseUnit, g: 1 }, { label: `porción (${fmt1(baseQty)} ${baseUnit})`, g: baseQty }]
        : [{ label: "unidad", g: 1 }],
      defaultQty: baseQty
    };
    if ($("cf-save").checked) n().customFoods = [...(n().customFoods || []), food];
    const macros = foodMacros(food, baseQty, food.measures[0]);
    addFoodEntry({
      name, qtyText: porPeso ? `${fmt1(baseQty)} ${baseUnit}` : `${fmt1(baseQty)} × unidad`,
      grams: porPeso ? baseQty : null, p: macros.p, c: macros.c, f: macros.f, meal: $("meal-select").value
    });
    ["cf-name", "cf-p", "cf-c", "cf-f"].forEach(id => { $(id).value = ""; });
  });
  $("pf-goal").addEventListener("change", e => $("pf-rate-row").classList.toggle("hidden", e.target.value !== "lose"));
  $("pf-protein").addEventListener("input", e => { $("pf-protein-label").textContent = `${fmt1(parseFloat(e.target.value))} g por kg de peso objetivo`; });
  $("save-profile").addEventListener("click", saveProfile);
  $("nutrition-view").addEventListener("click", e => {
    const rf = e.target.closest("[data-remove-food]"); if (rf) removeFoodEntry(rf.dataset.removeFood);
    const pc = e.target.closest("[data-plan-check]"); if (pc) togglePlanCheck(pc.dataset.planCheck);
    const tr = e.target.closest("[data-training]"); if (tr) setTrainingForDate(tr.dataset.training);
  });

  // Progreso
  $("save-weight").addEventListener("click", () => {
    const kg = parseFloat($("weight-input").value);
    const date = $("weight-date").value || todayDateKey();
    if (!(kg > 30 && kg < 300)) return;
    n().weights = [...(n().weights || []).filter(e => e.date !== date), { date, kg }]
      .sort((a, b) => a.date.localeCompare(b.date)).slice(-365);
    saveState(); $("weight-input").value = ""; renderProgress(); renderHome(); renderNutrition();
  });
  $("save-measure").addEventListener("click", () => {
    const date = $("measure-date").value || todayDateKey();
    const entry = { date };
    let any = false;
    MEASURE_FIELDS.forEach(f => {
      const v = parseFloat($(`m-${f.id}`).value);
      if (v > 0 && v < 300) { entry[f.id] = v; any = true; }
    });
    const nota = $("measure-note").value.trim();
    if (nota) entry.nota = nota;
    if (!any) { $("measure-error").classList.remove("hidden"); return; }
    $("measure-error").classList.add("hidden");
    // Si ya existe esa fecha, se completa en vez de pisarse.
    const prev = (n().measures || []).find(m => m.date === date) || {};
    n().measures = [...(n().measures || []).filter(m => m.date !== date), { ...prev, ...entry }]
      .sort((a, b) => a.date.localeCompare(b.date)).slice(-160);
    saveState();
    MEASURE_FIELDS.forEach(f => { $(`m-${f.id}`).value = ""; });
    $("measure-note").value = "";
    renderProgress();
  });

  $("apply-kcal-adjust").addEventListener("click", e => {
    n().profile.kcalAdjust = (n().profile.kcalAdjust || 0) + Number(e.currentTarget.dataset.adjust);
    saveState(); renderProgress(); renderNutrition(); renderHome();
  });
  $("reset-kcal-adjust").addEventListener("click", () => { n().profile.kcalAdjust = 0; saveState(); renderProgress(); renderNutrition(); renderHome(); });
  $("progress-view").addEventListener("click", e => {
    const rw = e.target.closest("[data-remove-weight]");
    if (rw) {
      Sync.marcarBorrado("weight:" + rw.dataset.removeWeight);
      n().weights = n().weights.filter(w => w.date !== rw.dataset.removeWeight);
      saveState(); renderProgress();
    }
    const rm = e.target.closest("[data-remove-measure]");
    if (rm) {
      Sync.marcarBorrado("measure:" + rm.dataset.removeMeasure);
      n().measures = n().measures.filter(m => m.date !== rm.dataset.removeMeasure);
      saveState(); renderProgress();
    }
  });
}
