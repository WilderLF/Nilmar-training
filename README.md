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

## Nutrición

- Gasto estimado con Mifflin-St Jeor × nivel de actividad.
- Déficit según ritmo elegido: 0,4 / 0,5 (por defecto) / 0,65 kg por semana.
- **Piso de seguridad: nunca calcula menos de 1.400 kcal.**
- Proteína alta calculada sobre el peso objetivo (2 g/kg de 80 kg = 160 g), que es lo que conserva el músculo durante la bajada.
- Grasas 30% de las calorías; carbohidratos, el resto.
- Ajuste por día: más calorías en días de fuerza, menos en días de descanso.
- **Días de etapa larga (Camino): come a mantenimiento, sin déficit.**
- Registro de comidas con base de alimentos comunes + alimentos propios.

Con 102 kg, 165 cm y 34 años, el cálculo inicial da ~2.370 kcal de gasto, 1.920 kcal en días de fuerza y 1.670 kcal en días tranquilos, con 160 g de proteína.

## Progreso

- Barra de meta 102 → 80 kg.
- Gráfico de peso con promedio de 7 días y línea de meta.
- Proyección: calcula el ritmo real de las últimas 4 semanas y estima cuándo llegaría a los 80 kg y con cuánto peso llegaría a la cirugía.
- Avisos: si baja más de 1 kg por semana, sugiere sumar calorías (ahí es donde se pierde músculo).
- Medidas de cintura y cadera: cuando la balanza se traba, las medidas siguen bajando.
- Historial de actividades con kilómetros acumulados.

## Técnico

- HTML/CSS/JS sin dependencias. `localStorage` para los datos, service worker para uso sin conexión.
- Las animaciones de ejercicios vienen del dataset público de Gym Visual; los 31 ejercicios del plan fueron verificados uno por uno para que muestren el movimiento correcto.
- Rutas relativas: se puede publicar en cualquier subcarpeta (GitHub Pages, Netlify, Vercel).

## Aviso

La app organiza entrenamiento y comida, no reemplaza a un médico. Antes de una cirugía programada y con un plan de pérdida de peso conviene que un profesional revise los números, y el módulo post-operatorio depende siempre de lo que indique la cirujana.
