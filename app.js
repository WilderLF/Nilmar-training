const STORE_KEY = "nilmar-training-state-v1";

let state = loadState();
let currentRoutineKey = null;   // "monday:0"
let currentModuleKey = null;    // módulo con el que se abrió la sesión
let currentExerciseIndex = 0;
let currentSet = 1;
let restTimer = null;
let restRemaining = 0;
let pendingLogActivity = null;
let selectedIntensity = null;
let deferredInstallPrompt = null;
let planPreviewModule = null;

const $ = (id) => document.getElementById(id);
const localDateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseDateKey = (key) => { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d); };
const formatShortDate = (key) => new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short" }).format(parseDateKey(key));
const formatLongDate = (key) => new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric" }).format(parseDateKey(key));
const todayKey = () => DAY_KEYS[new Date().getDay()];
const todayDateKey = () => localDateKey();
const daysBetween = (a, b) => Math.round((b - a) / 86400000);

function defaultState() {
  return {
    defaultModule: "home",
    blocks: [
      { id: "b-camino", module: "camino", start: "2026-09-26", end: "2026-10-01", label: "Camino de Santiago" },
      { id: "b-europa", module: "travel", start: "2026-10-02", end: "2026-10-14", label: "Europa" },
      { id: "b-vuelta", module: "home", start: "2026-10-15", end: "2026-10-31", label: "Vuelta a la rutina" },
      { id: "b-gym", module: "gym", start: "2026-11-01", end: "2027-03-31", label: "Gimnasio: fuerza" }
    ],
    goals: { startWeight: 102, targetWeight: 80, surgeryDate: "2027-04-15" },
    logs: [], completed: {}, mediaOverrides: {}, readiness: "normal",
    nutrition: defaultNutrition()
  };
}

function loadState() {
  const base = defaultState();
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (!saved) return base;
    const merged = { ...base, ...saved };
    merged.goals = { ...base.goals, ...(saved.goals || {}) };
    merged.nutrition = { ...base.nutrition, ...(saved.nutrition || {}) };
    merged.nutrition.profile = { ...base.nutrition.profile, ...(saved.nutrition?.profile || {}) };
    return merged;
  } catch { return base; }
}
function saveState() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* sin espacio */ } }

/* ---------------- Módulo activo por fecha ---------------- */

function blockForDate(d = new Date()) {
  const key = localDateKey(d);
  return (state.blocks || []).find(b => b.start <= key && key <= b.end) || null;
}
function moduleForDate(d = new Date()) {
  const b = blockForDate(d);
  return (b && MODULES[b.module]) ? b.module : (MODULES[state.defaultModule] ? state.defaultModule : "home");
}
const activeModuleKey = () => moduleForDate();
const activeWeek = () => buildWeek(activeModuleKey());
const todayDay = () => activeWeek()[todayKey()];
const dayForDate = (d) => buildWeek(moduleForDate(d))[DAY_KEYS[d.getDay()]];
const getSession = (routineKey, moduleKey = currentModuleKey) => {
  const [dayKey, slot] = routineKey.split(":");
  const d = buildWeek(moduleKey)[dayKey];
  return d.sessions[Number(slot)] || d.sessions[0];
};

function getWeekStart() {
  const now = new Date();
  const g = now.getDay();
  return localDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + (g === 0 ? -6 : 1 - g)));
}
const completionKey = (routineKey, moduleKey = activeModuleKey()) => `${getWeekStart()}-${moduleKey}-${routineKey}`;
const isDone = (routineKey, moduleKey) => !!state.completed?.[completionKey(routineKey, moduleKey)];

/* ---------------- Navegación ---------------- */

function navigate(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  $(viewId).classList.add("active");
  document.querySelectorAll(".bottom-nav button").forEach(btn => btn.classList.toggle("active", btn.dataset.nav === viewId));
  if (viewId === "nutrition-view") renderNutrition();
  if (viewId === "progress-view") renderProgress();
  if (viewId === "plan-view") renderPlan();
  window.scrollTo({ top: 0 });
}

/* ---------------- Inicio ---------------- */

function sessionRowsHtml(dayKey, moduleKey) {
  const d = buildWeek(moduleKey)[dayKey];
  return `<div class="session-list">${d.sessions.map((s, i) => {
    const key = `${dayKey}:${i}`;
    const done = isDone(key, moduleKey);
    return `<div class="session-row ${done ? "done" : ""}">
      <div class="session-info"><strong>${escapeHtml(s.title)}</strong><small>${s.duration} · ${s.exercises.length} ${s.exercises.length === 1 ? "bloque" : "bloques"}</small></div>
      <div class="session-actions">
        <button class="primary-btn small-btn" data-start="${key}" data-module="${moduleKey}">${done ? "Repetir" : "Empezar"}</button>
        <button class="ghost-btn small-btn check-btn" data-complete="${key}" data-module="${moduleKey}" aria-label="Marcar hecho">${done ? "✓" : "○"}</button>
      </div></div>`;
  }).join("")}</div>`;
}

function renderHome() {
  const moduleKey = activeModuleKey();
  const mod = MODULES[moduleKey];
  const block = blockForDate();
  const d = todayDay();

  document.documentElement.style.setProperty("--accent", mod.accent);
  document.documentElement.style.setProperty("--on-accent", mod.onAccent || "#fff");
  $("date-label").textContent = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  $("today-module").innerHTML = `<span class="mod-chip" style="--mod:${mod.accent};--mod-text:${mod.onAccent || "#fff"}">${mod.emoji} ${escapeHtml(mod.label)}</span>${block ? `<span class="muted block-label">${escapeHtml(block.label)}</span>` : ""}`;
  $("today-title").textContent = d.title;
  $("today-goal").textContent = d.goal;
  $("today-duration").textContent = d.duration;
  $("today-intensity").textContent = d.intensity;
  $("today-sessions").innerHTML = sessionRowsHtml(todayKey(), moduleKey);
  $("medical-note").classList.toggle("hidden", !mod.medical);
  $("medical-note-text").textContent = mod.medical || "";

  // Semana en curso
  const week = activeWeek();
  const allKeys = DAY_ORDER.flatMap(k => week[k].sessions.map((_, i) => `${k}:${i}`));
  const strengthKeys = DAY_ORDER.filter(k => week[k].type === "strength").flatMap(k => week[k].sessions.map((_, i) => `${k}:${i}`));
  if (strengthKeys.length) {
    $("week-count").textContent = `${strengthKeys.filter(k => isDone(k, moduleKey)).length}/${strengthKeys.length}`;
    $("week-count-label").textContent = "Sesiones de fuerza";
  } else {
    // Módulos sin fuerza (Camino, post-operatorio): contamos días completos.
    const daysDone = DAY_ORDER.filter(k => week[k].sessions.every((_, i) => isDone(`${k}:${i}`, moduleKey))).length;
    $("week-count").textContent = `${daysDone}/7`;
    $("week-count-label").textContent = "Días completos";
  }

  const s = weightStats();
  const cur = s.avg7 || state.nutrition.profile.weight;
  $("weight-stat").textContent = `${fmt1(cur)} kg`;

  renderMilestones();
  renderNutritionMini();
  $("smart-note-text").textContent = getSmartNote();
  document.querySelectorAll("[data-readiness]").forEach(b => b.classList.toggle("active", b.dataset.readiness === (state.readiness || "normal")));
  $("readiness-label").textContent = ({ tired: "Cansada", normal: "Normal", energized: "Con energía" })[state.readiness || "normal"];
}

function renderMilestones() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const items = [];
  const camino = (state.blocks || []).find(b => b.module === "camino");
  if (camino) {
    const start = parseDateKey(camino.start), end = parseDateKey(camino.end);
    const dd = daysBetween(today, start);
    if (dd > 0) items.push({ icon: "🐚", text: `Faltan <strong>${dd} días</strong> para el Camino de Santiago` });
    else if (today <= end) items.push({ icon: "🐚", text: `Camino: <strong>etapa ${daysBetween(start, today) + 1} de ${daysBetween(start, end) + 1}</strong>` });
  }
  if (state.goals.surgeryDate) {
    const dd = daysBetween(today, parseDateKey(state.goals.surgeryDate));
    if (dd > 0) items.push({ icon: "🩺", text: `Faltan <strong>${Math.round(dd / 7)} semanas</strong> para la cirugía` });
  }
  const s = weightStats();
  const cur = s.avg7 || state.nutrition.profile.weight;
  const lost = Math.max(0, (s.first ? Math.max(s.first.kg, state.goals.startWeight) : state.goals.startWeight) - cur);
  items.push({ icon: "🎯", text: `Meta ${state.goals.targetWeight} kg: <strong>${fmt1(Math.max(0, cur - state.goals.targetWeight))} kg</strong> por bajar${lost > 0 ? ` · ya bajaste ${fmt1(lost)} kg` : ""}` });
  $("milestones").innerHTML = items.map(i => `<div class="milestone"><span>${i.icon}</span><p>${i.text}</p></div>`).join("");
}

function getSmartNote() {
  const mod = MODULES[activeModuleKey()];
  const d = todayDay();
  const last = state.logs?.[0];
  if (last?.pain && last.pain !== "Ninguno") return `En tu último registro anotaste molestia en ${last.pain}. Bajá la carga en los ejercicios que la involucren y priorizá técnica; si sigue más de una semana, consultá.`;
  if (mod.key === "camino") return "Durante el Camino no busques bajar de peso: comé bien, hidratate y cuidá los pies. El déficit lo retomás al volver.";
  if (mod.key === "postop") return "Estás en recuperación: la referencia son las indicaciones de tu cirujana, no la app.";
  if (d.type === "strength") return mod.keys?.[0] || "Cada serie termina con 2-3 repeticiones en reserva.";
  if (d.type === "walk" || d.type === "trek") return "Caminar suma muchísimo: es el ejercicio con mejor relación entre gasto calórico y desgaste de articulaciones.";
  return "Descanso: dormir bien y comer suficiente proteína es la mitad del resultado.";
}

/* ---------------- Plan y bloques ---------------- */

function renderPlan() {
  const activeKey = activeModuleKey();
  planPreviewModule = planPreviewModule && MODULES[planPreviewModule] ? planPreviewModule : activeKey;

  $("module-cards").innerHTML = MODULE_ORDER.map(k => {
    const m = MODULES[k];
    return `<button class="module-card ${k === planPreviewModule ? "active" : ""}" data-preview="${k}" style="--mod:${m.accent}">
      <span class="mod-emoji">${m.emoji}</span>
      <strong>${escapeHtml(m.label)}</strong>
      <small>${escapeHtml(m.tagline)}</small>
    </button>`;
  }).join("");

  const mod = MODULES[planPreviewModule];
  $("module-detail-title").textContent = `${mod.emoji} ${mod.label}`;
  $("module-detail-desc").textContent = mod.description;
  $("module-keys").innerHTML = (mod.keys || []).map(k => `<li>${escapeHtml(k)}</li>`).join("");
  $("module-active-badge").classList.toggle("hidden", planPreviewModule !== activeKey);

  const week = buildWeek(planPreviewModule);
  $("week-list").innerHTML = DAY_ORDER.map(k => {
    const d = week[k];
    const isToday = k === todayKey() && planPreviewModule === activeKey;
    return `<article class="day-card ${isToday ? "today" : ""} ${d.type === "rest" ? "soft" : ""}">
      <div class="day-card-header"><div><p class="eyebrow">${d.label}${isToday ? " · hoy" : ""}</p><h3>${escapeHtml(d.title)}</h3></div><span class="chip">${d.intensity}</span></div>
      <p>${escapeHtml(d.goal)}</p>
      ${sessionRowsHtml(k, planPreviewModule)}
    </article>`;
  }).join("");

  // Bloques
  const blocks = [...(state.blocks || [])].sort((a, b) => a.start.localeCompare(b.start));
  const todayK = todayDateKey();
  $("block-list").innerHTML = blocks.length ? blocks.map(b => {
    const m = MODULES[b.module] || MODULES.home;
    const activeNow = b.start <= todayK && todayK <= b.end;
    const past = b.end < todayK;
    return `<div class="block-row ${activeNow ? "now" : ""} ${past ? "past" : ""}" style="--mod:${m.accent}">
      <div><strong>${m.emoji} ${escapeHtml(b.label || m.label)}</strong>
      <small>${formatLongDate(b.start)} → ${formatLongDate(b.end)} · ${escapeHtml(m.label)}${activeNow ? " · en curso" : ""}</small></div>
      <button class="icon-btn" data-remove-block="${b.id}" aria-label="Eliminar">✕</button>
    </div>`;
  }).join("") : '<p class="muted">Sin bloques: se usa siempre el módulo por defecto.</p>';

  $("block-module").innerHTML = MODULE_ORDER.map(k => `<option value="${k}">${MODULES[k].emoji} ${MODULES[k].label}</option>`).join("");
  $("default-module").innerHTML = MODULE_ORDER.map(k => `<option value="${k}">${MODULES[k].emoji} ${MODULES[k].label}</option>`).join("");
  $("default-module").value = state.defaultModule;
  $("block-start").value ||= todayDateKey();
}

function addBlock() {
  const module = $("block-module").value;
  const start = $("block-start").value, end = $("block-end").value;
  if (!start || !end || end < start) { $("block-error").classList.remove("hidden"); return; }
  $("block-error").classList.add("hidden");
  const label = $("block-label").value.trim() || MODULES[module].label;
  state.blocks = [...(state.blocks || []), { id: "b-" + Date.now(), module, start, end, label }];
  saveState();
  $("block-label").value = ""; $("block-end").value = "";
  renderPlan(); renderHome();
}

/* ---------------- Entrenamiento ---------------- */

function startRoutine(routineKey, moduleKey) {
  currentModuleKey = moduleKey || activeModuleKey();
  currentRoutineKey = routineKey;
  currentExerciseIndex = 0;
  currentSet = 1;
  stopRestTimer();
  renderWorkout();
  navigate("workout-view");
}

const exerciseOverrideKey = () => `${currentModuleKey}:${currentRoutineKey}:${currentExerciseIndex}`;

async function renderWorkout() {
  const s = getSession(currentRoutineKey);
  const exercise = s.exercises[currentExerciseIndex];
  $("workout-progress").textContent = `${MODULES[currentModuleKey].emoji} ${s.title} · ${currentExerciseIndex + 1} de ${s.exercises.length}`;
  $("exercise-name").textContent = exercise.name;
  $("exercise-note").textContent = exercise.note;
  const targetSets = adjustedSets(exercise);
  $("set-counter").textContent = `${currentSet} / ${targetSets}`;
  $("exercise-reps").textContent = exercise.reps;
  $("exercise-rest").textContent = exercise.rest ? `${exercise.rest}s` : "—";
  $("complete-set").textContent = currentSet >= targetSets
    ? (currentExerciseIndex === s.exercises.length - 1 ? "Terminar sesión" : "Siguiente ejercicio")
    : "Completar serie";
  $("change-animation").classList.toggle("hidden", !!exercise.mediaDisabled);
  await resolveExerciseMedia(exercise);
}

async function resolveExerciseMedia(exercise) {
  const gif = $("exercise-gif"), fallback = $("video-fallback"), status = $("demo-status");
  const requestKey = exerciseOverrideKey();
  gif.style.display = "none";
  gif.removeAttribute("src");
  fallback.classList.remove("hidden");
  $("exercise-instructions").classList.add("hidden");
  $("media-attribution").classList.add("hidden");

  if (exercise.mediaDisabled) { status.textContent = "Seguí la indicación escrita"; return; }
  status.textContent = "Buscando animación…";
  try {
    const overrideId = (state.mediaOverrides || {})[requestKey];
    const dataset = await getExerciseDataset();
    let match = overrideId ? dataset.find(i => i.id === overrideId) : null;
    if (!match) match = (await findDatasetExercises(exercise.datasetQuery || exercise.name, 1, 30))[0];
    if (requestKey !== exerciseOverrideKey()) return;
    if (!match) { status.textContent = "Sin animación exacta · seguí la indicación escrita"; return; }
    gif.onload = () => { fallback.classList.add("hidden"); gif.style.display = "block"; };
    gif.onerror = () => { gif.style.display = "none"; fallback.classList.remove("hidden"); status.textContent = "No se pudo cargar la animación"; };
    gif.src = datasetMediaUrl(match.gif_url);
    gif.alt = `Animación: ${match.name}`;
    renderInstructions(match);
    $("media-attribution").classList.remove("hidden");
  } catch {
    status.textContent = navigator.onLine ? "Animación no encontrada" : "Conectate a internet para ver la animación";
  }
}

function renderInstructions(match) {
  const steps = match.instruction_steps?.es || [];
  const values = steps.length ? steps : (match.instructions?.es || "").split(/(?<=[.!?])\s+/).filter(Boolean);
  const list = $("instruction-list"); list.innerHTML = "";
  values.slice(0, 8).forEach(text => { const li = document.createElement("li"); li.textContent = text; list.appendChild(li); });
  $("exercise-instructions").classList.toggle("hidden", values.length === 0);
}

async function openExercisePicker() {
  const exercise = getSession(currentRoutineKey).exercises[currentExerciseIndex];
  $("exercise-search").value = exercise.datasetQuery || exercise.name;
  navigate("exercise-picker-view");
  await runExerciseSearch();
}

async function runExerciseSearch() {
  const container = $("exercise-search-results"), query = $("exercise-search").value.trim();
  container.innerHTML = '<article class="panel"><p class="muted">Buscando…</p></article>';
  try {
    const results = await findDatasetExercises(query, 15);
    container.innerHTML = results.length
      ? results.map(item => `<article class="exercise-result"><img src="${datasetMediaUrl(item.gif_url)}" alt="${escapeHtml(item.name)}" loading="lazy"><div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.equipment)} · ${escapeHtml(item.target)}</p><button class="primary-btn" data-pick-exercise="${item.id}">Usar esta animación</button></div></article>`).join("")
      : '<article class="panel"><p class="muted">Sin coincidencias. Probá el nombre en inglés.</p></article>';
  } catch { container.innerHTML = '<article class="panel"><p class="muted">No pude cargar el catálogo. Revisá la conexión.</p></article>'; }
}

function pickDatasetExercise(id) {
  state.mediaOverrides ||= {};
  state.mediaOverrides[exerciseOverrideKey()] = id;
  saveState(); navigate("workout-view"); renderWorkout();
}
function escapeHtml(v = "") { return String(v).replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c])); }

function adjustedSets(exercise) {
  const r = state.readiness || "normal";
  if (r === "tired") return Math.min(2, exercise.sets);
  if (r === "energized" && exercise.sets === 3) return 4;
  return exercise.sets;
}

function completeSet() {
  const exercise = getSession(currentRoutineKey).exercises[currentExerciseIndex];
  if (currentSet < adjustedSets(exercise)) { currentSet++; startRest(exercise.rest || 0); renderWorkout(); }
  else nextExercise();
}
function nextExercise() {
  const s = getSession(currentRoutineKey);
  if (currentExerciseIndex < s.exercises.length - 1) { currentExerciseIndex++; currentSet = 1; stopRestTimer(); renderWorkout(); }
  else {
    stopRestTimer();
    markCompleted(currentRoutineKey, currentModuleKey);
    openLog(`${MODULES[currentModuleKey].label}: ${s.title}`);
  }
}
function startRest(seconds) {
  stopRestTimer(); if (!seconds) return;
  restRemaining = seconds; $("timer-box").classList.remove("hidden"); updateTimerDisplay();
  restTimer = setInterval(() => { restRemaining--; updateTimerDisplay(); if (restRemaining <= 0) { stopRestTimer(); navigator.vibrate?.(200); } }, 1000);
}
function stopRestTimer() { if (restTimer) clearInterval(restTimer); restTimer = null; $("timer-box").classList.add("hidden"); }
function updateTimerDisplay() { $("timer-display").textContent = `${String(Math.floor(restRemaining / 60)).padStart(2, "0")}:${String(restRemaining % 60).padStart(2, "0")}`; }

function markCompleted(routineKey, moduleKey, toggle = false) {
  state.completed ||= {};
  const k = completionKey(routineKey, moduleKey);
  if (toggle && state.completed[k]) delete state.completed[k]; else state.completed[k] = true;
  saveState(); renderHome(); if ($("plan-view").classList.contains("active")) renderPlan();
}

/* ---------------- Registro de actividad ---------------- */

function openLog(activity) {
  pendingLogActivity = activity; selectedIntensity = null;
  $("log-activity-title").textContent = activity;
  $("pain-select").value = "Ninguno"; $("log-note").value = ""; $("log-km").value = "";
  document.querySelectorAll("#intensity-grid button").forEach(b => b.classList.remove("active"));
  navigate("log-view");
}
function saveLog() {
  if (!pendingLogActivity) return;
  const km = parseFloat($("log-km").value);
  state.logs = [{
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    date: new Date().toISOString(), module: activeModuleKey(), activity: pendingLogActivity,
    intensity: selectedIntensity || 3, pain: $("pain-select").value, km: km > 0 ? km : null, note: $("log-note").value.trim()
  }, ...(state.logs || [])].slice(0, 300);
  saveState(); renderHome(); navigate("home-view");
}
function renderActivityHistory() {
  const logs = state.logs || [];
  const totalKm = logs.filter(l => l.km).reduce((a, l) => a + l.km, 0);
  $("km-total").textContent = totalKm ? `${fmt1(totalKm)} km` : "—";
  $("activity-history").innerHTML = logs.length
    ? logs.slice(0, 20).map(l => {
      const m = MODULES[l.module] || MODULES.home;
      const date = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(l.date));
      return `<article class="history-item"><p class="eyebrow">${m.emoji} ${escapeHtml(m.label)}</p><h3>${escapeHtml(l.activity)}</h3>
      <p class="meta">${date} · Intensidad ${l.intensity}/5${l.km ? ` · ${fmt1(l.km)} km` : ""} · Molestia: ${escapeHtml(l.pain)}</p>
      ${l.note ? `<p class="muted">${escapeHtml(l.note)}</p>` : ""}</article>`;
    }).join("")
    : '<p class="muted">Todavía no hay registros.</p>';
}

/* ---------------- Eventos ---------------- */

function setupEvents() {
  $("complete-set").addEventListener("click", completeSet);
  $("skip-exercise").addEventListener("click", nextExercise);
  $("skip-rest").addEventListener("click", stopRestTimer);
  $("add-rest").addEventListener("click", () => { restRemaining += 30; updateTimerDisplay(); });
  $("back-to-home").addEventListener("click", () => { stopRestTimer(); navigate("home-view"); });
  $("save-log").addEventListener("click", saveLog);
  $("change-animation").addEventListener("click", openExercisePicker);
  $("run-exercise-search").addEventListener("click", runExerciseSearch);
  $("exercise-search").addEventListener("keydown", e => { if (e.key === "Enter") runExerciseSearch(); });
  $("close-picker").addEventListener("click", () => { navigate("workout-view"); renderWorkout(); });
  $("add-block").addEventListener("click", addBlock);
  $("default-module").addEventListener("change", e => { state.defaultModule = e.target.value; saveState(); renderPlan(); renderHome(); });
  $("save-goals").addEventListener("click", () => {
    const t = parseFloat($("goal-target").value), s = parseFloat($("goal-start").value);
    if (t >= 40 && t <= 200) state.goals.targetWeight = t;
    if (s >= 40 && s <= 300) state.goals.startWeight = s;
    if ($("goal-surgery").value) state.goals.surgeryDate = $("goal-surgery").value;
    saveState(); renderProgress(); renderHome(); renderNutrition();
    $("goals-saved").classList.remove("hidden");
    setTimeout(() => $("goals-saved").classList.add("hidden"), 1800);
  });

  document.querySelectorAll("#intensity-grid button").forEach(btn => btn.addEventListener("click", () => {
    selectedIntensity = Number(btn.dataset.value);
    document.querySelectorAll("#intensity-grid button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }));
  document.querySelectorAll("[data-readiness]").forEach(btn => btn.addEventListener("click", () => {
    state.readiness = btn.dataset.readiness; saveState(); renderHome();
  }));

  document.body.addEventListener("click", e => {
    const nav = e.target.closest("[data-nav]"); if (nav) { navigate(nav.dataset.nav); return; }
    const start = e.target.closest("[data-start]"); if (start) { startRoutine(start.dataset.start, start.dataset.module); return; }
    const complete = e.target.closest("[data-complete]"); if (complete) markCompleted(complete.dataset.complete, complete.dataset.module, true);
    const preview = e.target.closest("[data-preview]"); if (preview) { planPreviewModule = preview.dataset.preview; renderPlan(); }
    const activity = e.target.closest("[data-activity]"); if (activity) openLog(activity.dataset.activity);
    const pick = e.target.closest("[data-pick-exercise]"); if (pick) pickDatasetExercise(pick.dataset.pickExercise);
    const rb = e.target.closest("[data-remove-block]");
    if (rb) { state.blocks = state.blocks.filter(b => b.id !== rb.dataset.removeBlock); saveState(); renderPlan(); renderHome(); }
  });

  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredInstallPrompt = e; $("install-btn").classList.remove("hidden"); });
  $("install-btn").addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null; $("install-btn").classList.add("hidden");
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) renderHome(); });
  setupNutritionEvents();
}

function renderGoalsForm() {
  $("goal-target").value = state.goals.targetWeight;
  $("goal-start").value = state.goals.startWeight;
  $("goal-surgery").value = state.goals.surgeryDate || "";
}

function init() {
  migrateMeasures();
  setupEvents();
  renderGoalsForm();
  renderHome();
  renderPlan();
  renderNutrition();
  renderProgress();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js").catch(() => {});
}
init();
