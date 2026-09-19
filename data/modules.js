/* ==========================================================
   Nilmar Montilla · Entrenamiento
   Módulos: cada uno define una semana tipo. Se activan por
   bloques de fechas (ver app.js), así puede hacer un mes de
   gimnasio, otro de casa o una semana de caminatas.
   ========================================================== */

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAY_LABELS = { monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles", thursday: "Jueves", friday: "Viernes", saturday: "Sábado", sunday: "Domingo" };

// Tipos de día: los usa la nutrición para ajustar calorías.
const DAY_TYPE_LABELS = {
  strength: "Día de fuerza",
  walk: "Día de caminata",
  trek: "Etapa larga",
  mobility: "Movilidad",
  rest: "Descanso"
};

const ex = (name, sets, reps, rest, datasetQuery, note, mediaDisabled = false) => ({ name, sets, reps, rest, datasetQuery, note, mediaDisabled });
const session = (title, duration, goal, exercises, extra = {}) => ({ title, duration, goal, exercises, ...extra });
const day = (type, title, intensity, goal, sessions) => ({ type, title, intensity, goal, sessions });
const rest = (title = "Descanso activo", goal = "Recuperar. El músculo crece y el cuerpo se adapta en el descanso.") =>
  day("rest", title, "Baja", goal, [session("Descanso", "10-15 min", "Movilidad suave y opcional.", [
    ex("Caminata muy suave (opcional)", 1, "15-20 min", 0, "", "Solo si te pide el cuerpo. Puede ser un paseo tranquilo.", true),
    ex("Estiramiento de cadera 90/90", 2, "6 por lado", 20, "90 90 hip stretch", "Sentada en el piso, girá el tronco de un lado al otro.", true),
    ex("Estiramiento de isquiotibiales", 2, "30 s por pierna", 20, "", "Pierna estirada sobre una silla, espalda recta, llevá el pecho adelante.", true)
  ])]);

/* ---------------- Bloques reutilizables ---------------- */

const MOVILIDAD_PIES = ex("Movilidad de tobillo contra pared", 2, "10 por lado", 20, "ankle dorsiflexion stretch", "Rodilla hacia la pared sin levantar el talón. Clave antes de caminar mucho.", true);
const ESTIRA_GEMELO = ex("Estiramiento de gemelo", 2, "30 s por pierna", 20, "calf stretch with hands against wall", "Manos en la pared, pierna de atrás estirada y talón apoyado.");
const ESTIRA_CUADRI = ex("Estiramiento de cuádriceps", 2, "30 s por pierna", 20, "", "De pie, tomá el tobillo y llevá el talón al glúteo. Sostenete de una pared.", true);
const ESTIRA_PSOAS = ex("Estiramiento de flexor de cadera", 2, "30 s por lado", 20, "kneeling hip flexor stretch", "Apoyá una rodilla en el piso y llevá la cadera adelante.", true);
const PLANCHA = ex("Plancha (desde rodillas o pies)", 3, "20-40 s", 45, "", "Apoyá antebrazos y rodillas. Cadera en línea con la espalda, abdomen firme. Cuando aguantes 40 s cómoda, pasá a apoyar los pies.", true);
const DEAD_BUG = ex("Dead bug", 3, "10 por lado", 30, "dead bug body weight", "Boca arriba: bajá brazo y pierna contrarios sin despegar la cintura del piso.");

const walkSession = (min, ritmo, goal, extra = []) => session(
  `Caminata ${min}`, `${min}`, goal,
  [
    ex("Caminata", 1, min, 0, "", ritmo, true),
    MOVILIDAD_PIES,
    ESTIRA_GEMELO,
    ...extra
  ]
);

/* ---------------- Módulo: GIMNASIO ---------------- */

const GYM_A = session("Fuerza A · Piernas y empuje", "50-60 min",
  "Máquinas y mancuernas. Las máquinas son ideales para empezar: te guían el movimiento.",
  [
    ex("Entrada en calor en cinta", 1, "8 min", 0, "walking on incline treadmill", "Ritmo cómodo, inclinación 3-5%. Subir temperatura antes de cargar peso."),
    ex("Prensa de piernas", 3, "10-12", 90, "sled 45 leg press", "Pies al ancho de cadera. Bajá hasta 90° de rodilla, sin despegar la cola del respaldo."),
    ex("Press de pecho en máquina", 3, "10-12", 75, "lever chest press", "Ajustá el asiento para que las manijas queden a la altura del pecho."),
    ex("Jalón al pecho en polea", 3, "10-12", 75, "cable lat pulldown full range of motion", "Llevá la barra al pecho, no a la nuca. Codos hacia abajo, pecho arriba."),
    ex("Curl femoral acostada", 3, "12", 60, "lever lying leg curl", "Isquiotibiales: equilibran la fuerza de los cuádriceps y protegen la rodilla."),
    ex("Elevaciones laterales", 2, "12-15", 45, "dumbbell lateral raise", "Peso liviano. Los hombros marcados hacen que la cintura se vea más chica."),
    DEAD_BUG,
    ex("Caminata o bici suave", 1, "12-15 min", 0, "", "Cardio corto al final. Ritmo conversado.", true)
  ]);

const GYM_B = session("Fuerza B · Cadera y tirón", "50-60 min",
  "El día de glúteos y espalda. Los glúteos son el músculo más grande: mucho gasto calórico y buena postura.",
  [
    ex("Entrada en calor en bici", 1, "8 min", 0, "stationary bike walk", "Resistencia baja."),
    ex("Sentadilla goblet", 3, "8-12", 90, "dumbbell goblet squat", "Mancuerna pegada al pecho. Bajá hasta donde puedas manteniendo la espalda recta."),
    ex("Peso muerto rumano con mancuernas", 3, "10", 90, "dumbbell romanian deadlift", "Cadera atrás, rodillas apenas dobladas. Sentí el estiramiento detrás del muslo."),
    ex("Remo sentado en polea", 3, "10-12", 75, "cable seated row", "Llevá los codos atrás y juntá los omóplatos. Espalda fuerte = mejor postura."),
    ex("Puente de glúteos con barra", 3, "10-12", 75, "barbell glute bridge", "Espalda apoyada en el banco, empujá con los talones y apretá arriba 1 segundo."),
    ex("Press de hombros sentada", 3, "10-12", 60, "dumbbell seated shoulder press", "Con respaldo. Subí sin arquear la espalda."),
    ex("Curl de bíceps", 2, "12", 45, "dumbbell biceps curl", "Codos pegados al cuerpo."),
    ex("Abdominales en el piso", 3, "12-15", 30, "crunch floor", "Movimiento corto, la zona lumbar no se despega.")
  ]);

const GYM_C = session("Fuerza C · Cuerpo completo", "45-55 min",
  "Tercera sesión: repasa todo el cuerpo con variantes distintas para no aburrirte.",
  [
    ex("Entrada en calor en cinta", 1, "8 min", 0, "walking on incline treadmill", "Inclinación media."),
    ex("Subidas al cajón (step-up)", 3, "8 por pierna", 75, "dumbbell step-up", "Empezá sin peso. Empujá con el talón de la pierna de arriba."),
    ex("Extensión de cuádriceps", 3, "12", 60, "lever leg extension", "Subí en 1 segundo, bajá en 2."),
    ex("Remo en máquina", 3, "10-12", 75, "lever seated row", "Pecho apoyado, codos hacia atrás."),
    ex("Press inclinado con mancuernas", 3, "10", 75, "dumbbell incline bench press", "Banco a 30-45°. Si el banco te incomoda, usá la máquina de press."),
    ex("Extensión de tríceps en polea", 2, "12-15", 45, "cable pushdown", "Codos fijos al costado del cuerpo."),
    ex("Elevación de talones", 3, "15", 30, "bodyweight standing calf raise", "Podés hacerlo en un escalón para más rango."),
    PLANCHA
  ]);

/* ---------------- Módulo: CASA ---------------- */

const SENTADILLA_SILLA = (sets, reps) => ex("Sentadilla sostenida de la silla", sets, reps, 60, "potty squat with support",
  "Sostenete del respaldo de una silla firme y bajá como si fueras a sentarte. El apoyo te permite bajar más y cuidar la rodilla. Cuando te salga fácil, soltá una mano.");
const FLEX_INCLINADA = (sets, reps) => ex("Flexiones inclinadas", sets, reps, 60, "incline push-up",
  "Manos en la mesada de la cocina o en el respaldo del sillón. Cuanto más alto el apoyo, más fácil: bajá la altura a medida que progresás.");
const REMO_TOALLA = (sets, reps) => ex("Remo con toalla", sets, reps, 60, "bodyweight standing row (with towel)",
  "Pasá una toalla por el picaporte de una puerta cerrada (o alrededor de una columna), agarrá las dos puntas y tirá llevando los codos atrás. Vos ponés la resistencia: cuanto más atrás los pies, más difícil.");
const PUENTE = (sets, reps) => ex("Puente de glúteos", sets, reps, 45, "low glute bridge on floor",
  "Empujá con los talones y apretá los glúteos 1 segundo arriba.");

const HOME_A = session("Casa A · Cuerpo completo", "30-35 min",
  "Sin equipamiento: una silla, una toalla, un escalón y la pared. Nada que comprar.",
  [
    ex("Movilidad de entrada en calor", 1, "5 min", 0, "", "Círculos de brazos, rotaciones de cadera, marcha en el lugar.", true),
    SENTADILLA_SILLA(3, "10-15"),
    FLEX_INCLINADA(3, "8-12"),
    REMO_TOALLA(3, "12"),
    PUENTE(3, "12-15"),
    ex("Subida a escalón", 3, "8 por pierna", 45, "dumbbell step-up", "Un escalón de tu casa alcanza y va sin peso. Sostenete de la pared si hace falta y empujá con el talón de la pierna de arriba."),
    DEAD_BUG
  ]);

const HOME_B = session("Casa B · Cadera y espalda", "30-35 min",
  "Glúteos, cadena posterior y espalda: postura y gasto calórico. La mochila cargada hace de peso.",
  [
    ex("Movilidad de entrada en calor", 1, "5 min", 0, "", "Gato-camello, rotaciones de cadera y hombros.", true),
    ex("Peso muerto rumano con mochila", 3, "10-12", 60, "dumbbell romanian deadlift", "Cargá una mochila con botellas de agua (cada litro es 1 kg) y sostenela contra los muslos. Cadera atrás, espalda recta."),
    ex("Puente de glúteos con marcha", 3, "10 por lado", 45, "glute bridge march", "Arriba en el puente, levantá una rodilla por vez sin que caiga la cadera."),
    ex("Remo a un brazo con toalla", 3, "12 por lado", 45, "one arm towel row", "Misma idea que el remo con toalla, pero de a un brazo: más carga en cada lado."),
    ex("Sentadilla isométrica en la pared", 3, "20-40 s", 45, "march sit (wall)", "Espalda apoyada en la pared, rodillas a 90° (o menos si es mucho). Sostené sin levantar las rodillas; cuando aguantes 40 s, sumá la marcha."),
    ex("Elevación de talones", 3, "15-20", 30, "bodyweight standing calf raise", "En el borde de un escalón para más recorrido."),
    ex("Plancha lateral desde rodillas", 2, "20-30 s por lado", 30, "side plank body weight", "Rodillas apoyadas, cadera arriba en línea con el cuerpo.")
  ]);

const HOME_C = session("Casa C · Circuito", "25-30 min",
  "Circuito: los ejercicios van uno detrás del otro y descansás 90 s al terminar la vuelta. 3 vueltas.",
  [
    ex("Movilidad de entrada en calor", 1, "5 min", 0, "", "Marcha en el lugar y círculos de brazos.", true),
    ex("Sentadilla sostenida de la silla", 3, "12", 0, "potty squat with support", "Vuelta 1 de 3: pasá al siguiente sin descansar."),
    ex("Flexiones inclinadas", 3, "8-10", 0, "incline push-up", "Seguí de largo."),
    ex("Remo con toalla", 3, "12", 0, "bodyweight standing row (with towel)", "Seguí de largo."),
    ex("Puente de glúteos", 3, "15", 0, "low glute bridge on floor", "Seguí de largo."),
    ex("Marcha rápida en el lugar", 3, "45 s", 90, "", "Al terminar descansá 90 segundos y arrancá la próxima vuelta.", true),
    ESTIRA_CUADRI
  ]);

/* ---------------- Módulo: CAMINATAS ---------------- */

const FUERZA_CORTA = session("Fuerza express", "20 min",
  "Dos sesiones cortas por semana alcanzan para no perder músculo mientras el foco está en caminar.",
  [
    SENTADILLA_SILLA(3, "12"),
    FLEX_INCLINADA(3, "8-12"),
    REMO_TOALLA(3, "12"),
    PUENTE(3, "15"),
    PLANCHA
  ]);

/* ---------------- Módulo: CAMINO DE SANTIAGO ---------------- */

const CAMINO_PRE = session("Antes de salir", "10 min",
  "Diez minutos que evitan molestias de rodilla, cadera y tendón de Aquiles.",
  [
    MOVILIDAD_PIES,
    ex("Círculos de tobillo y despertar del pie", 1, "10 por lado", 0, "", "Sentada: círculos con el tobillo, levantá dedos y talón alternando.", true),
    ex("Rotaciones de cadera", 1, "8 por lado", 0, "", "De pie, llevá la rodilla arriba y abrí la cadera hacia afuera.", true),
    ex("Puente de glúteos de activación", 2, "12", 20, "low glute bridge on floor", "Despierta los glúteos para que no cargue todo la rodilla."),
    ex("Revisión de pies y mochila", 1, "2 min", 0, "", "Vaselina o crema antirozaduras, medias sin costuras, uñas cortas. La mochila no debería pasar el 10% de tu peso.", true)
  ]);

const CAMINO_ETAPA = session("Etapa del día", "3-6 h",
  "Caminá a un ritmo en el que puedas conversar. El Camino no es una carrera.",
  [
    ex("Etapa", 1, "Registrá los km al terminar", 0, "", "Pausa de 5 minutos cada hora: sacate las zapatillas, revisá si hay puntos calientes y ponete algo si arde. Un punto caliente atendido a tiempo no se convierte en ampolla.", true),
    ex("Hidratación y comida", 1, "Cada 1-2 h", 0, "", "Agua seguido y algo de comer cada 2 horas. Este NO es un día para hacer déficit: si comés poco, caminás peor y perdés músculo.", true)
  ]);

const CAMINO_POST = session("Al llegar", "12-15 min",
  "Recuperación: hace la diferencia entre el día 2 y el día 5.",
  [
    ex("Piernas en alto", 1, "5 min", 0, "", "Acostada con las piernas apoyadas en la pared. Baja la hinchazón de los pies.", true),
    ESTIRA_GEMELO,
    ex("Estiramiento de isquiotibiales", 2, "30 s por pierna", 20, "", "Sentada, pierna estirada, pecho hacia adelante con la espalda recta.", true),
    ESTIRA_CUADRI,
    ESTIRA_PSOAS,
    ex("Proteína después de la etapa", 1, "Registralo", 0, "", "Comé proteína en la cena (carne, pescado, huevos, legumbres, yogur). Es lo que repara el músculo que usaste todo el día.", true)
  ]);

/* ---------------- Módulo: VIAJE ---------------- */

const HOTEL = session("Rutina de hotel", "15-20 min",
  "Sin equipamiento y en poco espacio: la silla del escritorio y la cama alcanzan.",
  [
    SENTADILLA_SILLA(3, "12-15"),
    ex("Flexiones inclinadas en el escritorio", 3, "8-12", 45, "incline push-up", "Manos en el escritorio o en el borde de la cama."),
    PUENTE(3, "15"),
    ex("Zancada sostenida de la pared", 2, "8 por pierna", 45, "bodyweight rear lunge", "Una mano en la pared para no perder el equilibrio."),
    PLANCHA
  ]);

const TURISMO = session("Turismo a pie", "Todo el día",
  "Caminar por la ciudad es entrenamiento real: apuntá a 8.000-12.000 pasos.",
  [
    ex("Caminata turística", 1, "8.000-12.000 pasos", 0, "", "Registrá los pasos o los km al final del día. Calzado cómodo, no zapatos nuevos.", true),
    ESTIRA_GEMELO,
    ESTIRA_PSOAS
  ]);

/* ---------------- Módulo: POST-OPERATORIO ---------------- */

const POSTOP_CAMINATA = session("Caminata suave", "10-25 min",
  "Caminar poco y seguido activa la circulación y ayuda a la cicatrización.",
  [
    ex("Caminata en llano", 1, "10-25 min", 0, "", "Ritmo de paseo, sin cargar nada, brazos relajados al costado. Si aparece dolor, tirantez o pinchazos, frená.", true),
    ex("Respiración diafragmática", 2, "8 respiraciones", 30, "", "Sentada: inspirá por la nariz llevando el aire al abdomen, exhalá lento por la boca.", true)
  ]);

const POSTOP_MOV = session("Movilidad autorizada", "10 min",
  "Solo lo que tu cirujana haya habilitado. Nada de brazos por encima del hombro hasta que te lo autorice.",
  [
    ex("Movilidad de tobillo y pie", 1, "10 por lado", 0, "", "Sentada, sin esfuerzo de tronco.", true),
    ex("Movilidad suave de cadera", 1, "8 por lado", 0, "", "Acostada, llevá una rodilla al pecho de a una.", true),
    ex("Consulta del día", 1, "Recordatorio", 0, "", "Anotá cualquier molestia para contarla en el control médico.", true)
  ]);

/* ---------------- Definición de módulos ---------------- */

const MODULES = {
  gym: {
    key: "gym", label: "Gimnasio · Fuerza", emoji: "🏋️‍♀️", accent: "#F21A3F", onAccent: "#FFFFFF",
    tagline: "3 días de pesas + caminatas",
    description: "El módulo principal para bajar de peso sin quedar flácida. Tres sesiones de fuerza con peso (máquinas y mancuernas) que conservan y construyen músculo, más caminatas los otros días. Lunes, miércoles y viernes; si un día se corre, corrés todo un día.",
    keys: ["Progresá el peso: cuando llegues al tope de repeticiones en las 3 series, subí la carga", "Cada serie debería terminar con 2-3 repeticiones en reserva", "El músculo que construís ahora es lo que sostiene la piel cuando bajás de peso"],
    week: {
      monday: day("strength", "Fuerza A", "Media", "Piernas y empuje con máquinas.", [GYM_A]),
      tuesday: day("walk", "Caminata", "Baja", "Cardio suave que suma gasto sin cansar las piernas para el miércoles.", [walkSession("40-50 min", "Ritmo en el que podés hablar pero no cantar.", "Cardio aeróbico y recuperación activa.")]),
      wednesday: day("strength", "Fuerza B", "Media", "Cadera, glúteos y espalda.", [GYM_B]),
      thursday: day("walk", "Caminata", "Baja", "Movimiento y cabeza despejada.", [walkSession("40 min", "Tranquilo. Si podés, con alguna subida.", "Mantener el movimiento diario.")]),
      friday: day("strength", "Fuerza C", "Media", "Cuerpo completo con variantes.", [GYM_C]),
      saturday: day("walk", "Caminata larga", "Media", "La caminata larga de la semana: el mayor gasto calórico del fin de semana.", [walkSession("60-75 min", "Ritmo sostenido, terreno variado. Llevá agua.", "Resistencia y gasto calórico.", [ESTIRA_PSOAS])]),
      sunday: rest()
    }
  },
  home: {
    key: "home", label: "En casa", emoji: "🏠", accent: "#2D93AD", onAccent: "#FFFFFF",
    tagline: "3 días de fuerza en casa + caminatas",
    description: "Misma lógica que el gimnasio pero sin comprar nada: una silla, una toalla, un escalón, la pared y una mochila cargada con botellas de agua. Para semanas sin gimnasio o cuando no llegás con los tiempos.",
    keys: ["Cada litro de agua en la mochila es 1 kg: así vas sumando peso de a poco", "Sin pesas, la progresión es: más repeticiones, bajada más lenta (3 segundos) o una variante más difícil", "Si más adelante querés más opciones, una banda elástica es lo más barato que podés sumar"],
    week: {
      monday: day("strength", "Casa A", "Media", "Cuerpo completo con lo que tengas en casa.", [HOME_A]),
      tuesday: day("walk", "Caminata", "Baja", "Salí a caminar el barrio.", [walkSession("30-45 min", "Ritmo cómodo y constante.", "Cardio diario.")]),
      wednesday: day("strength", "Casa B", "Media", "Cadera, espalda y hombros.", [HOME_B]),
      thursday: day("walk", "Caminata + movilidad", "Baja", "Caminar y soltar el cuerpo.", [walkSession("30-40 min", "Tranquilo.", "Movimiento y movilidad.", [ESTIRA_PSOAS])]),
      friday: day("strength", "Casa C", "Media", "Circuito: más ritmo cardíaco.", [HOME_C]),
      saturday: day("walk", "Caminata larga", "Media", "La salida larga de la semana.", [walkSession("60 min", "Sostenido. Buena música o un podcast.", "Resistencia y gasto calórico.")]),
      sunday: rest()
    }
  },
  walking: {
    key: "walking", label: "Caminatas", emoji: "🚶‍♀️", accent: "#8CB800", onAccent: "#FFFFFF",
    tagline: "Foco en caminar + 2 sesiones cortas",
    description: "Para etapas donde el plan es salir a caminar. Sumamos dos sesiones de fuerza de 20 minutos para no perder músculo mientras el foco está en el cardio.",
    keys: ["Caminar es el mejor cardio para empezar: bajo impacto en rodillas y tobillos", "Sumá cuestas o ritmo más rápido antes de sumar más tiempo"],
    week: {
      monday: day("walk", "Caminata media", "Baja", "Arrancá la semana moviéndote.", [walkSession("45 min", "Ritmo moderado, podés conversar.", "Base aeróbica.")]),
      tuesday: day("strength", "Fuerza express", "Media", "20 minutos que protegen tu músculo.", [FUERZA_CORTA]),
      wednesday: day("walk", "Caminata con cuestas", "Media", "Subidas: más gasto sin más impacto.", [walkSession("50-60 min", "Buscá subidas o inclinación. Pasos cortos al subir.", "Fuerza de piernas y cardio.")]),
      thursday: day("walk", "Caminata suave", "Baja", "Recuperación activa.", [walkSession("30 min", "Suave, solo para moverte.", "Recuperar.", [ESTIRA_PSOAS])]),
      friday: day("strength", "Fuerza express", "Media", "Segunda dosis de fuerza.", [FUERZA_CORTA]),
      saturday: day("trek", "Caminata larga", "Media", "La salida larga. Preparación perfecta para el Camino.", [walkSession("75-90 min", "Ritmo sostenido. Llevá agua y algo para comer.", "Resistencia.", [ESTIRA_CUADRI])]),
      sunday: rest()
    }
  },
  camino: {
    key: "camino", label: "Camino de Santiago", emoji: "🐚", accent: "#210124", onAccent: "#FFFFFF",
    tagline: "Etapa diaria + cuidado de pies",
    description: "Modo etapa: activación antes de salir, la caminata del día y la recuperación al llegar. Durante el Camino no buscamos bajar de peso, buscamos llegar entera y disfrutarlo.",
    keys: ["Durante el Camino comé normal: el déficit lo retomás después", "Pausa cada hora para revisar los pies: los puntos calientes se atienden antes de ser ampollas", "La mochila, menos del 10% de tu peso corporal"],
    week: Object.fromEntries(DAY_ORDER.map(k => [k,
      day("trek", "Etapa del Camino", "Media/alta", "Caminar, cuidar los pies y recuperar para el día siguiente.", [CAMINO_PRE, CAMINO_ETAPA, CAMINO_POST])
    ]))
  },
  travel: {
    key: "travel", label: "Viaje", emoji: "✈️", accent: "#1F7E96", onAccent: "#FFFFFF",
    tagline: "Turismo a pie + rutina de hotel",
    description: "Para las semanas de viaje: el turismo a pie ya es tu cardio y tres rutinas cortas de hotel mantienen la fuerza. El objetivo acá es sostener, no bajar.",
    keys: ["Sostener el peso durante un viaje ya es un buen resultado", "Proteína en cada comida principal: es lo más fácil de descuidar viajando"],
    week: {
      monday: day("walk", "Turismo a pie", "Baja", "Caminar la ciudad.", [TURISMO]),
      tuesday: day("strength", "Hotel + turismo", "Media", "15 minutos en la habitación antes de salir.", [HOTEL, TURISMO]),
      wednesday: day("walk", "Turismo a pie", "Baja", "Caminar la ciudad.", [TURISMO]),
      thursday: day("strength", "Hotel + turismo", "Media", "Segunda sesión corta de la semana.", [HOTEL, TURISMO]),
      friday: day("walk", "Turismo a pie", "Baja", "Caminar la ciudad.", [TURISMO]),
      saturday: day("strength", "Hotel + turismo", "Media", "Tercera y última sesión de la semana.", [HOTEL, TURISMO]),
      sunday: day("walk", "Día libre", "Baja", "Disfrutá. Caminá lo que salga.", [TURISMO])
    }
  },
  postop: {
    key: "postop", label: "Post-operatorio", emoji: "🩺", accent: "#9B6FA0", onAccent: "#FFFFFF",
    tagline: "Recuperación guiada por tu cirujana",
    description: "Módulo para después de la reducción mamaria. Todo lo que aparece acá está sujeto a lo que te autorice tu cirujana: las indicaciones médicas van siempre por encima de la app.",
    medical: "Este módulo no reemplaza las indicaciones de tu cirujana. Retomá cada actividad solo cuando ella te lo autorice, y consultá ante cualquier dolor, hinchazón o molestia.",
    keys: ["Semanas 1-2: caminatas cortas, sin levantar peso ni subir los brazos", "Semanas 3-6: caminatas más largas y tren inferior suave, si tu cirujana lo autoriza", "Desde la semana 6-8, con alta médica: volvé a la fuerza empezando con la mitad del peso que usabas"],
    week: Object.fromEntries(DAY_ORDER.map(k => [k,
      k === "sunday"
        ? rest("Descanso", "Descanso completo. La cicatrización también es trabajo.")
        : day("mobility", "Recuperación", "Muy baja", "Caminatas cortas y movilidad autorizada.", [POSTOP_CAMINATA, POSTOP_MOV])
    ]))
  }
};

const MODULE_ORDER = ["gym", "home", "walking", "camino", "travel", "postop"];

function buildWeek(moduleKey) {
  const mod = MODULES[moduleKey] || MODULES.home;
  const week = {};
  DAY_ORDER.forEach(k => {
    const d = mod.week[k];
    week[k] = {
      key: k, label: DAY_LABELS[k], type: d.type, title: d.title, intensity: d.intensity, goal: d.goal,
      duration: d.sessions.map(s => s.duration).join(" + "),
      sessions: d.sessions.map((s, i) => ({ ...s, slot: String(i) }))
    };
  });
  return week;
}
