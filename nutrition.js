/* ============================================================
   Nutrición · Nilmar Montilla
   Objetivo: bajar de peso conservando masa muscular.
   - Gasto estimado: Mifflin-St Jeor × nivel de actividad
   - Déficit según el ritmo elegido (máx. 0,75 kg/semana)
   - Proteína alta, calculada sobre el peso objetivo
   - Piso de seguridad: nunca por debajo de 1.400 kcal
   ============================================================ */

const KCAL_FLOOR = 1400;
const DAY_ADJ = { strength: 100, walk: 50, mobility: -100, rest: -150, trek: 0 };

function defaultNutrition() {
  return {
    profile: {
      weight: 102, height: 165, age: 34, sex: "f",
      activity: 1.375, goal: "lose", rate: 0.5,
      proteinPerKgTarget: 2.0, carbCycling: true, kcalAdjust: 0, configured: true
    },
    days: {},
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

function currentWeight() {
  const s = weightStats();
  return s.avg7 || n().profile.weight;
}

function nutritionTargets(dayType = "rest") {
  const pr = n().profile;
  const w = currentWeight();
  const bmr = 10 * w + 6.25 * pr.height - 5 * pr.age + (pr.sex === "f" ? -161 : 5);
  const tdee = bmr * pr.activity;
  const deficit = pr.goal === "lose" ? pr.rate * 1100 : 0;
  let base = tdee - deficit + (pr.kcalAdjust || 0);
  const floored = base < KCAL_FLOOR;
  if (floored) base = KCAL_FLOOR;

  let kcal;
  if (dayType === "trek") kcal = round10(tdee + 350);          // etapas largas: se come a mantenimiento o más
  else kcal = round10(base + (pr.carbCycling ? (DAY_ADJ[dayType] || 0) : 0));
  if (kcal < KCAL_FLOOR) kcal = KCAL_FLOOR;

  const target = state.goals?.targetWeight || 80;
  const protein = round5(pr.proteinPerKgTarget * Math.min(target, w));
  const fat = round5((base * 0.30) / 9);
  const carbs = Math.max(0, round5((kcal - protein * 4 - fat * 9) / 4));
  return { bmr: Math.round(bmr), tdee: round10(tdee), base: round10(base), kcal, protein, fat, carbs, weight: w, dayType, floored, deficit: Math.round(deficit) };
}

function dayEntries(dateKey = todayDateKey()) { return n().days[dateKey] || []; }
function dayTotals(dateKey = todayDateKey()) {
  return dayEntries(dateKey).reduce((t, e) => ({ p: t.p + e.p, c: t.c + e.c, f: t.f + e.f, kcal: t.kcal + e.kcal }), { p: 0, c: 0, f: 0, kcal: 0 });
}
function allFoods() { return [...FOOD_DB, ...(n().customFoods || []).map(f => ({ ...f, group: "Mis alimentos" }))]; }
function pruneNutritionDays() { const keys = Object.keys(n().days).sort(); while (keys.length > 90) delete n().days[keys.shift()]; }

function addFoodEntry({ name, unit, qty, p, c, f, meal }) {
  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name, unit, qty, meal,
    p: Math.round(p * qty * 10) / 10, c: Math.round(c * qty * 10) / 10, f: Math.round(f * qty * 10) / 10
  };
  entry.kcal = Math.round(entry.p * 4 + entry.c * 4 + entry.f * 9);
  const key = todayDateKey();
  n().days[key] = [...(n().days[key] || []), entry];
  pruneNutritionDays(); saveState(); renderNutrition(); renderHome();
}
function removeFoodEntry(id) {
  const key = todayDateKey();
  n().days[key] = dayEntries(key).filter(e => e.id !== id);
  saveState(); renderNutrition(); renderHome();
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
  const t = nutritionTargets(todayDay().type);
  const tot = dayTotals();
  box.innerHTML = `
    <div class="section-title-row compact-row">
      <div><p class="eyebrow">Comida de hoy</p><h3>${Math.round(tot.kcal)} / ${t.kcal} kcal</h3></div>
      <button class="ghost-btn small-btn" data-nav="nutrition-view">Registrar</button>
    </div>
    ${macroBar("Proteína", tot.p, t.protein, "g", "m-p")}`;
}

function renderNutrition() {
  if (!$("nutrition-view")) return;
  const d = todayDay();
  const t = nutritionTargets(d.type);
  const tot = dayTotals();
  const pr = n().profile;

  $("nut-day-type").textContent = `${DAY_LABELS[todayKey()]} · ${DAY_TYPE_LABELS[d.type]}`;
  $("nut-kcal").textContent = `${Math.round(tot.kcal)} / ${t.kcal}`;
  let note = `Gasto estimado ${t.tdee} kcal · objetivo base ${t.base} kcal.`;
  if (t.dayType === "trek") note += " Hoy caminás muchas horas: comés a mantenimiento, sin déficit.";
  else if (pr.carbCycling && DAY_ADJ[t.dayType] > 0) note += ` Día activo: +${DAY_ADJ[t.dayType]} kcal.`;
  else if (pr.carbCycling && DAY_ADJ[t.dayType] < 0) note += ` Día tranquilo: ${DAY_ADJ[t.dayType]} kcal.`;
  $("nut-day-note").textContent = note;
  $("nut-floor-warning").classList.toggle("hidden", !t.floored);
  $("nut-bars").innerHTML =
    macroBar("Proteína", tot.p, t.protein, "g", "m-p") +
    macroBar("Carbohidratos", tot.c, t.carbs, "g", "m-c") +
    macroBar("Grasas", tot.f, t.fat, "g", "m-f");

  const sel = $("food-select");
  const current = sel.value;
  const groups = {};
  allFoods().forEach(f => { (groups[f.group] ||= []).push(f); });
  sel.innerHTML = Object.entries(groups).map(([g, items]) =>
    `<optgroup label="${escapeHtml(g)}">${items.map(f => `<option value="${escapeHtml(f.id)}">${escapeHtml(f.name)} — ${escapeHtml(f.unit)}</option>`).join("")}</optgroup>`).join("");
  if (current && allFoods().some(f => f.id === current)) sel.value = current;
  $("meal-select").innerHTML = MEALS.map(m => `<option>${m}</option>`).join("");
  if (!$("meal-select").dataset.touched) $("meal-select").value = guessMeal();
  updateFoodPreview();

  const entries = dayEntries();
  $("food-log").innerHTML = entries.length
    ? MEALS.filter(m => entries.some(e => e.meal === m)).map(m => `
        <div class="meal-group"><p class="eyebrow">${m}</p>
        ${entries.filter(e => e.meal === m).map(e => `
          <div class="food-item">
            <div><strong>${escapeHtml(e.name)}</strong><small>${fmt1(e.qty)} × ${escapeHtml(e.unit)} · P ${fmt1(e.p)} · C ${fmt1(e.c)} · G ${fmt1(e.f)}</small></div>
            <div class="food-kcal">${e.kcal}<small>kcal</small></div>
            <button class="icon-btn" data-remove-food="${e.id}" aria-label="Eliminar">✕</button>
          </div>`).join("")}</div>`).join("")
    : '<p class="muted">Todavía no registraste comidas hoy.</p>';

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
  const food = allFoods().find(f => f.id === $("food-select").value);
  const qty = parseFloat($("food-qty").value) || 0;
  $("food-preview").textContent = food
    ? `${kcalOf(food, qty)} kcal · P ${fmt1(food.p * qty)} g · C ${fmt1(food.c * qty)} g · G ${fmt1(food.f * qty)} g`
    : "";
}

function renderMacroHistory() {
  const rows = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(); dt.setDate(dt.getDate() - i);
    const key = localDateKey(dt);
    if (!dayEntries(key).length) continue;
    const tot = dayTotals(key);
    const t = nutritionTargets(dayForDate(dt).type);
    const pOk = tot.p >= t.protein * 0.9;
    const kOk = tot.kcal <= t.kcal * 1.1;
    rows.push(`<div class="hist-row"><span>${formatShortDate(key)}</span><span class="${kOk ? "ok" : "warn"}">${Math.round(tot.kcal)} kcal</span><span class="${pOk ? "ok" : "warn"}">P ${Math.round(tot.p)} g</span></div>`);
  }
  $("macro-history").innerHTML = rows.length
    ? rows.reverse().join("") + '<p class="dataset-note">Verde: calorías dentro del objetivo y proteína cumplida.</p>'
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
  const strong = nutritionTargets("strength"), restD = nutritionTargets("rest");
  $("pf-summary").innerHTML = `
    <p>Peso usado en el cálculo: <strong>${fmt1(t.weight)} kg</strong> ${weightStats().avg7 ? "(promedio de 7 días)" : "(del perfil)"}</p>
    <p>Metabolismo basal: <strong>${t.bmr} kcal</strong> · Gasto diario estimado: <strong>${t.tdee} kcal</strong></p>
    ${t.deficit ? `<p>Déficit aplicado: <strong>−${t.deficit} kcal</strong> (≈ ${fmt1(n().profile.rate)} kg por semana)</p>` : ""}
    <p>Días de fuerza: <strong>${strong.kcal} kcal</strong> · P ${strong.protein} g · C ${strong.carbs} g · G ${strong.fat} g</p>
    <p>Días tranquilos: <strong>${restD.kcal} kcal</strong> · P ${restD.protein} g · C ${restD.carbs} g · G ${restD.fat} g</p>
    <p class="dataset-note">Son estimaciones: el registro de peso te dice si hay que ajustar. Antes de una cirugía conviene que un médico o nutricionista revise el plan.</p>`;
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

  const ms = [...(n().measures || [])].sort((a, b) => b.date.localeCompare(a.date));
  $("measure-date").value ||= todayDateKey();
  $("measure-list").innerHTML = ms.length
    ? `<div class="hist-row head"><span>Fecha</span><span>Cintura</span><span>Cadera</span></div>` +
      ms.slice(0, 6).map(m => `<div class="hist-row"><span>${formatShortDate(m.date)}</span><span>${m.waist ? fmt1(m.waist) + " cm" : "—"}</span><span>${m.hip ? fmt1(m.hip) + " cm" : "—"}</span></div>`).join("") +
      (ms.length > 1 ? `<p class="dataset-note">Cuando la balanza se traba, las medidas siguen bajando: ahí se ve la recomposición.</p>` : "")
    : '<p class="muted">Tomate cintura y cadera una vez por mes.</p>';

  renderActivityHistory();
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
  $("food-select").addEventListener("change", updateFoodPreview);
  $("food-qty").addEventListener("input", updateFoodPreview);
  $("meal-select").addEventListener("change", () => { $("meal-select").dataset.touched = "1"; });
  document.querySelectorAll("[data-qty-step]").forEach(b => b.addEventListener("click", () => {
    $("food-qty").value = Math.max(0.25, (parseFloat($("food-qty").value) || 0) + parseFloat(b.dataset.qtyStep));
    updateFoodPreview();
  }));
  $("add-food").addEventListener("click", () => {
    const food = allFoods().find(f => f.id === $("food-select").value);
    const qty = parseFloat($("food-qty").value);
    if (!food || !(qty > 0)) return;
    $("food-qty").value = 1;
    addFoodEntry({ name: food.name, unit: food.unit, qty, p: food.p, c: food.c, f: food.f, meal: $("meal-select").value });
  });
  $("add-custom-food").addEventListener("click", () => {
    const name = $("cf-name").value.trim();
    const p = parseFloat($("cf-p").value) || 0, c = parseFloat($("cf-c").value) || 0, f = parseFloat($("cf-f").value) || 0;
    if (!name || p + c + f <= 0) { $("cf-error").classList.remove("hidden"); return; }
    $("cf-error").classList.add("hidden");
    const unit = $("cf-unit").value.trim() || "1 porción";
    if ($("cf-save").checked) n().customFoods = [...(n().customFoods || []), { id: "custom-" + Date.now(), name, unit, p, c, f }];
    addFoodEntry({ name, unit, qty: 1, p, c, f, meal: $("meal-select").value });
    ["cf-name", "cf-unit", "cf-p", "cf-c", "cf-f"].forEach(id => { $(id).value = ""; });
  });
  $("pf-goal").addEventListener("change", e => $("pf-rate-row").classList.toggle("hidden", e.target.value !== "lose"));
  $("pf-protein").addEventListener("input", e => { $("pf-protein-label").textContent = `${fmt1(parseFloat(e.target.value))} g por kg de peso objetivo`; });
  $("save-profile").addEventListener("click", saveProfile);
  $("nutrition-view").addEventListener("click", e => {
    const rf = e.target.closest("[data-remove-food]"); if (rf) removeFoodEntry(rf.dataset.removeFood);
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
    const waist = parseFloat($("waist-input").value), hip = parseFloat($("hip-input").value);
    const date = $("measure-date").value || todayDateKey();
    if (!(waist > 0) && !(hip > 0)) return;
    n().measures = [...(n().measures || []).filter(e => e.date !== date), { date, waist: waist > 0 ? waist : null, hip: hip > 0 ? hip : null }]
      .sort((a, b) => a.date.localeCompare(b.date)).slice(-120);
    saveState(); $("waist-input").value = ""; $("hip-input").value = ""; renderProgress();
  });
  $("apply-kcal-adjust").addEventListener("click", e => {
    n().profile.kcalAdjust = (n().profile.kcalAdjust || 0) + Number(e.currentTarget.dataset.adjust);
    saveState(); renderProgress(); renderNutrition(); renderHome();
  });
  $("reset-kcal-adjust").addEventListener("click", () => { n().profile.kcalAdjust = 0; saveState(); renderProgress(); renderNutrition(); renderHome(); });
  $("progress-view").addEventListener("click", e => {
    const rw = e.target.closest("[data-remove-weight]");
    if (rw) { n().weights = n().weights.filter(w => w.date !== rw.dataset.removeWeight); saveState(); renderProgress(); }
  });
}
