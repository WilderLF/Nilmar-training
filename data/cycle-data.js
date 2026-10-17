/* ============================================================
   Ciclo menstrual · datos base
   El historial viene del informe de Salud (Apple) del 17/10/2026:
   27 jun – 17 oct de 2026, 4 ciclos completos + el que está en curso.
   ============================================================ */

/* Cuánto flujo. El orden importa: se usa para dibujar la intensidad. */
const FLOW_LEVELS = [
  { key: "manchado", label: "Manchado", short: "Mancha", dots: 1, color: "#C9A7E0" },
  { key: "escaso", label: "Escaso", short: "Escaso", dots: 1, color: "#F4A9A0" },
  { key: "medio", label: "Medio", short: "Medio", dots: 2, color: "#EE7A6C" },
  { key: "abundante", label: "Abundante", short: "Abund.", dots: 3, color: "#D94F3D" },
  { key: "si", label: "Hubo flujo", short: "Flujo", dots: 2, color: "#EE7A6C" }
];
const flowInfo = k => FLOW_LEVELS.find(f => f.key === k) || null;
// "manchado" no cuenta como día de período: así lo separa Salud.
const esSangrado = k => !!k && k !== "manchado";

/* Síntomas: los mismos nombres que usa la app de Salud, para que
   lo que registre acá le sirva también cuando lo hable con el médico. */
const SYMPTOMS = [
  { key: "colicos", label: "Cólicos", icon: "🌀" },
  { key: "fatiga", label: "Fatiga", icon: "🔋" },
  { key: "dolor-senos", label: "Dolor en los senos", icon: "💗" },
  { key: "hinchazon", label: "Distensión abdominal", icon: "🎈" },
  { key: "dolor-cabeza", label: "Dolor de cabeza", icon: "🤕" },
  { key: "dolor-espalda", label: "Dolor en la espalda baja", icon: "🪑" },
  { key: "animo", label: "Cambios de humor", icon: "🌦️" },
  { key: "apetito", label: "Alteración del apetito", icon: "🍽️" },
  { key: "sueno", label: "Alteración del sueño", icon: "🌙" },
  { key: "acne", label: "Acné", icon: "🫧" },
  { key: "caida-cabello", label: "Caída del cabello", icon: "💇‍♀️" },
  { key: "nausea", label: "Náusea", icon: "🤢" },
  { key: "estrenimiento", label: "Estreñimiento", icon: "🧱" },
  { key: "diarrea", label: "Diarrea", icon: "💧" },
  { key: "dolor-pelvico", label: "Dolor pélvico", icon: "📍" },
  { key: "piel-seca", label: "Piel reseca", icon: "🏜️" }
];
const symptomInfo = k => SYMPTOMS.find(s => s.key === k) || { key: k, label: k, icon: "•" };

/* Las cuatro fases, con lo que suele pasar en cada una.
   Está escrito como tendencia, no como regla: el cuerpo de cada una
   responde distinto y lo que manda es cómo se siente ella ese día. */
const PHASES = {
  menstrual: {
    label: "Menstruación", icon: "🩸", color: "#D94F3D",
    cuerpo: "Los primeros días suele bajar la energía. Es el momento de menos exigencia.",
    entrenamiento: "Movete si te hace bien: caminar, elongar, pesas suaves. Si tenés cólicos fuertes, descansar no es perder el hilo.",
    comida: "Con el sangrado se pierde hierro. Carne roja magra, lentejas, espinaca y huevo ayudan a reponerlo.",
    peso: "Durante estos días suele irse el líquido que retenías: si la balanza baja de golpe, es agua, no grasa."
  },
  folicular: {
    label: "Folicular", icon: "🌱", color: "#5BA8A0",
    cuerpo: "Suele ser la mejor semana: más energía, mejor ánimo y mejor recuperación.",
    entrenamiento: "Buen momento para ir a buscar peso, intensidad o un entrenamiento largo.",
    comida: "El apetito suele estar tranquilo. Es la semana más fácil para sostener el plan.",
    peso: "El peso acá es el más confiable de todo el ciclo: casi no hay líquido retenido."
  },
  ovulacion: {
    label: "Ovulación", icon: "✨", color: "#E8A33D",
    cuerpo: "Pico de energía, aunque algunas sienten una puntada en un costado del abdomen.",
    entrenamiento: "Seguís fuerte. Cuidá la técnica: en estos días las articulaciones están un poco más laxas.",
    comida: "Sin cambios. Sostené el plan como viene.",
    peso: "Puede haber medio kilo de más por líquido. Nada para preocuparse."
  },
  lutea: {
    label: "Lútea", icon: "🌙", color: "#9B7FD4",
    cuerpo: "La semana previa al período: más hambre, más sueño, pechos sensibles e hinchazón.",
    entrenamiento: "Bajá un escalón si hace falta. Sostener el hábito vale más que el número que levantás.",
    comida: "Acá es donde más cuesta. El antojo de dulce es hormonal, no es falta de voluntad: comé la proteína primero y tomá más agua.",
    peso: "Es normal pesar entre 1 y 2 kg de más por retención de líquido. No te peses esta semana para sacar conclusiones."
  }
};

/* ---------- historial cargado desde el informe de Salud ----------
   Cada día: flujo, si hubo manchado y qué síntomas marcó. */
const CYCLE_SEED = {
  // Ciclo 27 jun – 16 jul (20 días · período 5 días)
  "2026-06-27": { flow: "si" },
  "2026-06-28": { flow: "si" },
  "2026-06-29": { flow: "si" },
  "2026-06-30": { flow: "si" },
  "2026-07-01": { flow: "si" },

  // Ciclo 17 jul – 13 ago (28 días · período 5 días)
  "2026-07-17": { flow: "si" },
  "2026-07-18": { flow: "abundante", spotting: true, symptoms: ["apetito", "sueno"] },
  "2026-07-19": { flow: "escaso", spotting: true, symptoms: ["colicos", "fatiga", "caida-cabello"] },
  "2026-07-20": { flow: "escaso", spotting: true },
  "2026-07-21": { flow: "escaso", spotting: true },

  // Ciclo 14 ago – 9 sept (27 días · período 8 días)
  "2026-08-14": { flow: "abundante", spotting: true, symptoms: ["colicos", "fatiga", "caida-cabello"] },
  "2026-08-15": { flow: "abundante" },
  "2026-08-16": { flow: "abundante" },
  "2026-08-17": { flow: "abundante" },
  "2026-08-19": { flow: "escaso" },
  "2026-08-20": { flow: "escaso" },
  "2026-08-21": { flow: "escaso" },

  // Ciclo 10 sept – 8 oct (29 días · período 2 días)
  "2026-09-10": { flow: "abundante" },
  "2026-09-11": { flow: "abundante", spotting: true, symptoms: ["colicos", "fatiga"] },

  // Ciclo en curso, desde el 9 oct (período 7 días)
  "2026-10-09": { flow: "si", spotting: true },
  "2026-10-10": { flow: "abundante", spotting: true },
  "2026-10-11": { flow: "medio", spotting: true },
  "2026-10-12": { flow: "medio", spotting: true },
  "2026-10-13": { flow: "medio", spotting: true },
  "2026-10-14": { flow: "escaso", spotting: true },
  "2026-10-15": { flow: "escaso", spotting: true }
};

// Si más adelante cargo más historial, subo este número y se vuelve a sembrar.
const CYCLE_SEED_VERSION = 1;
