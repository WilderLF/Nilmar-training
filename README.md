# Nilmar Montilla · Entrenamiento

App (PWA) de entrenamiento y nutrición con el branding de Nilmar Montilla. Funciona sin conexión, se instala en el celular y guarda todo localmente.

## Branding aplicado

Tomado de la propuesta de Figúrattez:

| Elemento | Valor |
|---|---|
| Lima | `#B2E705` |
| Rojo | `#F21A3F` |
| Petróleo | `#2D93AD` |
| Off-white (fondo) | `#EAF2FA` |
| Tinta (texto) | `#210124` |
| Tipografía | Inter (equivalente web de Helvetica Neue) |
| Isologo | Monograma NM (extraído del manual, `assets/isologo.png`) e íconos de la PWA |

Cada módulo tiene su color dentro de la paleta, y la app entera se tiñe con el color del módulo activo.

## Módulos

En vez de un plan fijo, la app trabaja con **módulos**. Cada uno define una semana tipo:

| Módulo | Semana |
|---|---|
| 🏋️‍♀️ **Gimnasio · Fuerza** | 3 días de pesas (lun/mié/vie) con máquinas y mancuernas + caminatas mar/jue/sáb + domingo de descanso |
| 🏠 **En casa** | Misma estructura **sin equipamiento**: silla, toalla, escalón, pared y mochila con botellas |
| 🚶‍♀️ **Caminatas** | Foco en caminar + 2 sesiones cortas de fuerza (sin equipamiento) |
| 🐚 **Camino de Santiago** | Activación antes de salir, etapa del día y recuperación al llegar |
| ✈️ **Viaje** | Turismo a pie + 3 rutinas de hotel de 15-20 min |
| 🩺 **Post-operatorio** | Recuperación después de la reducción mamaria, siempre sujeta al alta de la cirujana |

### Sin equipamiento en casa

Las rutinas de casa no requieren comprar nada:

- **Sentadilla** sosteniéndose del respaldo de una silla (permite bajar más y cuidar la rodilla).
- **Flexiones inclinadas** en la mesada o el respaldo del sillón (a mayor altura, más fácil).
- **Remo con toalla** pasada por el picaporte de una puerta cerrada: ella regula la resistencia según dónde pone los pies.
- **Peso muerto rumano** con mochila cargada: cada litro de agua es 1 kg.
- **Sentadilla isométrica** contra la pared, puente de glúteos, subida a escalón y plancha.

## Bloques de fechas

En **Plan → Mis bloques** se asigna un módulo a un rango de fechas. Ya vienen cargados:

- 26/09 – 01/10/2026 · Camino de Santiago
- 02/10 – 14/10/2026 · Europa (módulo Viaje)
- 15/10 – 31/10/2026 · Vuelta a la rutina (En casa)
- 01/11/2026 – 31/03/2027 · Gimnasio: fuerza

Fuera de cualquier bloque se usa el módulo por defecto. Los bloques se agregan y borran desde la app: si un mes quiere hacer solo caminatas, crea el bloque y listo.

## Comida (calorías y registro)

La pantalla **Comida** arranca con el objetivo de calorías del día:

- **Anillo grande** con las calorías que le quedan, el objetivo y lo que lleva comido.
- **Barras de proteína, carbohidratos y grasas** con lo que falta de cada una.
- **Registro por gramos**: cada alimento guarda sus macros por 100 g y se puede cargar cualquier cantidad (125 g de pollo, 170 g de yogur). También admite medidas caseras (unidad, feta, cda, taza, lata, scoop) y muestra el equivalente en gramos.
- **Alimentos propios**: se cargan como vienen en la etiqueta ("estos valores corresponden a 100 g") y después se registran en cualquier cantidad.
- **Lo que comiste hoy**, agrupado por comida y con el subtotal de cada una.

### Calorías según si entrena o no

El nivel de actividad del perfil es **solo la vida diaria sin ejercicio**; el entrenamiento se suma por día. Así un día sin entrenar come menos y nada se cuenta dos veces.

| Día | Extra | Objetivo |
|---|---|---|
| 🛋️ No entrené | — | 1.690 kcal |
| 🚶‍♀️ Movimiento suave | +120 | 1.810 kcal |
| 🏃‍♀️ Caminata o cardio | +220 | 1.910 kcal |
| 🏋️‍♀️ Gimnasio o fuerza | +280 | 1.970 kcal |
| ⛰️ Día muy activo | +450 | 2.140 kcal |

Se elige con los botones de "¿Entrenaste hoy?". La app propone lo que indica el plan de ese día, pero manda lo que ella marque. Guarda el dato por fecha, así el histórico de 7 días muestra con qué objetivo se comparaba cada día.

Debajo aparece el contador **"Últimos 7 días: X de 5 entrenamientos"**, con la meta de 5 días por semana.

La proteína se mantiene fija en 160 g todos los días (2 g por kg de los 80 kg de meta): es lo que protege el músculo mientras baja de peso. Lo que cambia entre un día y otro son los carbohidratos.

**Piso de seguridad:** el cálculo nunca baja de 1.400 kcal.

## El plan de la nutricionista

Debajo del contador sigue el plan de la **Lic. Solana María Nacul (M.P. 336)**: el menú del día con checklist, el armado de platos, el semáforo y las recomendaciones. El plan es la referencia de qué comer; el contador de calorías es la referencia de cuánto.

## Progreso

- Barra de meta 102 → 80 kg.
- Gráfico de peso con promedio de 7 días y línea de meta.
- Proyección: calcula el ritmo real de las últimas 4 semanas y estima cuándo llegaría a los 80 kg y con cuánto peso llegaría a la cirugía.
- Avisos: si baja más de 1 kg por semana, sugiere sumar calorías (ahí es donde se pierde músculo).
- **Medidas**: cuello, pecho/senos, cintura, abdomen (ombligo), cadera, brazo y muslo, con nota opcional por medición. Tabla comparativa entre la primera y la última toma, con el total de centímetros perdidos.
- Vienen cargadas las mediciones del **18/07** (cuello 38, pecho 127, cintura 108, cadera 129, abdomen 133) y del **29/08** (37, 121, 107, 126, 126).
- Historial de actividades con kilómetros acumulados.

## Técnico

- HTML/CSS/JS sin dependencias. El plan de alimentación vive en `data/plan-alimentacion.js` y los módulos de entrenamiento en `data/modules.js`: se editan sin tocar el resto.
- HTML/CSS/JS sin dependencias. `localStorage` para los datos, service worker para uso sin conexión.
- Las animaciones de ejercicios vienen del dataset público de Gym Visual; los 31 ejercicios del plan fueron verificados uno por uno para que muestren el movimiento correcto.
- Rutas relativas: se puede publicar en cualquier subcarpeta (GitHub Pages, Netlify, Vercel).

## Aviso

El plan de alimentación es de la Lic. Solana María Nacul; la app solo lo muestra y ayuda a cumplirlo. El entrenamiento lo organiza la app, pero no reemplaza a un médico. Antes de una cirugía programada y con un plan de pérdida de peso conviene que un profesional revise los números, y el módulo post-operatorio depende siempre de lo que indique la cirujana.
