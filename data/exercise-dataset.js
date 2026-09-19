const EXERCISE_DATASET = {
  jsonUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json",
  rawBase: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/",
  attribution: "© Gym visual — https://gymvisual.com/",
  repository: "https://github.com/hasaneyldrm/exercises-dataset"
};

let exerciseDatasetPromise = null;

function normalizeExerciseText(value = "") {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function getExerciseDataset() {
  if (!exerciseDatasetPromise) {
    exerciseDatasetPromise = fetch(EXERCISE_DATASET.jsonUrl)
      .then(response => { if (!response.ok) throw new Error(`Dataset HTTP ${response.status}`); return response.json(); })
      .then(items => items.map(item => ({
        ...item,
        _name: normalizeExerciseText(item.name),
        _equipment: normalizeExerciseText(item.equipment),
        _target: normalizeExerciseText(item.target),
        _search: normalizeExerciseText([item.name,item.category,item.body_part,item.equipment,item.target,item.muscle_group,...(item.secondary_muscles||[])].join(" "))
      })))
      .catch(error => { exerciseDatasetPromise = null; throw error; });
  }
  return exerciseDatasetPromise;
}

// Curated query cleanup so generic words don't send users to an unrelated movement.
const QUERY_ALIASES = {
  "bodyweight full squat": ["dumbbell squat", "bodyweight squat"],
  "bodyweight rear lunge": ["dumbbell rear lunge", "rear lunge"],
  "single leg glute bridge": ["single leg bridge", "glute bridge"],
  "dumbbell romanian deadlift": ["dumbbell romanian deadlift", "romanian deadlift"],
  "standing calf raise body weight": ["bodyweight standing calf raise", "standing calf raise"],
  "front plank body weight": ["plank", "front plank"],
  "push-up body weight": ["push up", "push-up"],
  "dumbbell bent over row": ["dumbbell bent over row", "bent over row"],
  "side plank body weight": ["side bridge v. 2", "side plank"],
  "cable wood chop": ["cable wood chop", "wood chop"],
  "band shoulder external rotation": ["band external rotation", "shoulder external rotation"],
  "skater hops": ["skater hops", "skater jump"],
  "bulgarian split squat": ["dumbbell single leg split squat", "split squat"],
  "squat jump": ["squat jump"],
    "full body stretch": ["full body stretch", "stretching"],
  "lower body stretching": ["lower body stretch", "stretching"],
  "bird dog body weight": ["bird dog"],
  "dead bug body weight": ["dead bug"],
  "cat cow stretch": ["cat cow"],
  "90 90 hip stretch": ["90 90 hip", "hip stretch"],
  "deep squat stretch": ["deep squat", "squat stretch"],
  "side lunge body weight": ["side lunge", "lateral lunge"],
  "single leg balance": ["single leg balance", "one leg balance"],
  "wrist stretch": ["wrist stretch"],
  "pull-up": ["pull-up", "pull up"],
  "chin-up": ["chin-up", "chin up"],
  "chest dip": ["chest dip"],
  "inverted row": ["inverted row"],
  "scapular pull-up": ["scapular pull-up", "scapular pull up"],
  "push-up": ["push-up", "push up"],
  "hanging knee raise": ["hanging leg hip raise", "hanging knee raise"],
  "hanging oblique knee raise": ["hanging oblique knee raise"],
  "clap push up": ["clap push up", "plyo push up"],
  "decline push-up": ["decline push-up"],
  "jump squat": ["jump squat"],
  "mountain climber": ["mountain climber"],
  "single leg calf raise": ["bodyweight standing calf raise", "standing calf raise"],
  "dumbbell single leg deadlift": ["dumbbell single leg deadlift"],
  "band horizontal pallof press": ["band horizontal pallof press"],
  "kneeling hip flexor stretch": ["intermediate hip flexor and quad stretch", "hip flexor stretch"]
};

function queryVariants(query) {
  const q = normalizeExerciseText(query);
  return [q, ...(QUERY_ALIASES[q] || []).map(normalizeExerciseText)].filter(Boolean);
}

function scoreDatasetExercise(item, query) {
  const variants = queryVariants(query);
  let best = 0;
  for (const phrase of variants) {
    const tokens = phrase.split(" ").filter(Boolean);
    if (!tokens.length) continue;
    let score = 0;
    if (item._name === phrase) score += 100;
    else if (item._name.includes(phrase) || phrase.includes(item._name)) score += 42;
    let matched = 0;
    for (const token of tokens) {
      if (item._name.split(" ").includes(token)) { score += 10; matched++; }
      else if (item._name.includes(token)) { score += 6; matched++; }
      else if (item._search.includes(token)) { score += 1; matched++; }
    }
    const coverage = matched / tokens.length;
    score += coverage * 20;
    // Require most query terms to appear; this blocks "baseball swing" -> kettlebell swing style mistakes.
    if (tokens.length >= 2 && coverage < .66) score -= 45;
    if (phrase.includes("bodyweight") && item._equipment === "body weight") score += 10;
    if (phrase.includes("dumbbell") && item._equipment === "dumbbell") score += 10;
    if (phrase.includes("band") && item._equipment === "band") score += 10;
    if (phrase.includes("cable") && item._equipment === "cable") score += 10;
    best = Math.max(best, score);
  }
  return best;
}

async function findDatasetExercises(query, limit = 12, minScore = 28) {
  if (!normalizeExerciseText(query)) return [];
  const items = await getExerciseDataset();
  return items.map(item => ({ item, score: scoreDatasetExercise(item, query) }))
    .filter(result => result.score >= minScore)
    .sort((a,b) => b.score-a.score || a.item.name.localeCompare(b.item.name))
    .slice(0,limit).map(result => result.item);
}

function datasetMediaUrl(relativePath) {
  if (!relativePath) return "";
  if (/^https?:\/\//.test(relativePath)) return relativePath;
  return EXERCISE_DATASET.rawBase + relativePath.replace(/^\.\//, "");
}
