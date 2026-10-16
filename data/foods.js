/* ============================================================
   Base de alimentos
   Cada alimento guarda sus macros por una cantidad de referencia
   (gBase, casi siempre 100 g o 100 ml). Con eso la app calcula
   cualquier cantidad: si cargás 125 g, escala solo.
   measures = formas de medirlo; la primera es la que aparece por
   defecto. p = proteína, c = carbohidratos, f = grasas (gramos).
   Valores en cocido salvo que se aclare.
   ============================================================ */

const G = { label: "g", g: 1 };
const ML = { label: "ml", g: 1 };

const FOOD_DB = [
  // ---------- Proteínas ----------
  { id: "pollo", group: "Proteínas", name: "Pechuga de pollo (cocida)", gBase: 100, p: 31, c: 0, f: 3.6, measures: [G, { label: "porción (150 g)", g: 150 }], defaultQty: 150 },
  { id: "carne", group: "Proteínas", name: "Carne vacuna magra (cocida)", gBase: 100, p: 28, c: 0, f: 8, measures: [G, { label: "porción (150 g)", g: 150 }], defaultQty: 150 },
  { id: "picada", group: "Proteínas", name: "Carne picada especial (cocida)", gBase: 100, p: 26, c: 0, f: 12, measures: [G], defaultQty: 120 },
  { id: "cerdo", group: "Proteínas", name: "Lomo de cerdo (cocido)", gBase: 100, p: 26, c: 0, f: 5, measures: [G], defaultQty: 150 },
  { id: "merluza", group: "Proteínas", name: "Merluza o pescado blanco", gBase: 100, p: 22, c: 0, f: 1.5, measures: [G], defaultQty: 150 },
  { id: "atun", group: "Proteínas", name: "Atún al natural (escurrido)", gBase: 100, p: 25, c: 0, f: 1.2, measures: [{ label: "lata (120 g)", g: 120 }, G], defaultQty: 1 },
  { id: "huevo", group: "Proteínas", name: "Huevo entero", gBase: 100, p: 12.6, c: 0.8, f: 10, measures: [{ label: "unidad (50 g)", g: 50 }, G], defaultQty: 2 },
  { id: "clara", group: "Proteínas", name: "Clara de huevo", gBase: 100, p: 11, c: 0.7, f: 0.2, measures: [{ label: "clara (33 g)", g: 33 }, G], defaultQty: 2 },
  { id: "jamon", group: "Proteínas", name: "Jamón cocido", gBase: 100, p: 18, c: 1.5, f: 4, measures: [{ label: "feta (25 g)", g: 25 }, G], defaultQty: 1 },
  { id: "whey", group: "Proteínas", name: "Proteína whey", gBase: 100, p: 80, c: 10, f: 5, measures: [{ label: "scoop (30 g)", g: 30 }, G], defaultQty: 1 },

  // ---------- Lácteos ----------
  { id: "yogur", group: "Lácteos", name: "Yogur descremado", gBase: 100, p: 4, c: 6, f: 0.2, measures: [{ label: "pote (120 g)", g: 120 }, { label: "pote (200 g)", g: 200 }, G], defaultQty: 1 },
  { id: "leche", group: "Lácteos", name: "Leche descremada", gBase: 100, p: 3.4, c: 5, f: 0.1, measures: [{ label: "vaso (250 ml)", g: 250 }, ML], defaultQty: 1 },
  { id: "queso-magro", group: "Lácteos", name: "Queso magro (port salut light)", gBase: 100, p: 23, c: 1.7, f: 13, measures: [{ label: "feta (30 g)", g: 30 }, G], defaultQty: 1 },
  { id: "queso-cremoso", group: "Lácteos", name: "Queso cremoso", gBase: 100, p: 21, c: 2, f: 27, measures: [{ label: "feta (30 g)", g: 30 }, G], defaultQty: 1 },
  { id: "ricota", group: "Lácteos", name: "Ricota descremada", gBase: 100, p: 11, c: 4, f: 3, measures: [{ label: "cda (25 g)", g: 25 }, G], defaultQty: 2 },

  // ---------- Carbohidratos ----------
  { id: "arroz", group: "Carbohidratos", name: "Arroz (cocido)", gBase: 100, p: 2.7, c: 28, f: 0.3, measures: [G, { label: "taza (160 g)", g: 160 }], defaultQty: 150 },
  { id: "fideos", group: "Carbohidratos", name: "Fideos (cocidos)", gBase: 100, p: 5.8, c: 31, f: 0.9, measures: [G, { label: "plato (200 g)", g: 200 }], defaultQty: 150 },
  { id: "papa", group: "Carbohidratos", name: "Papa (hervida)", gBase: 100, p: 1.9, c: 20, f: 0.1, measures: [G, { label: "unidad mediana (150 g)", g: 150 }], defaultQty: 150 },
  { id: "batata", group: "Carbohidratos", name: "Batata (hervida)", gBase: 100, p: 1.4, c: 20, f: 0.1, measures: [G], defaultQty: 150 },
  { id: "polenta", group: "Carbohidratos", name: "Polenta (cocida)", gBase: 100, p: 1.6, c: 15, f: 0.3, measures: [G], defaultQty: 200 },
  { id: "avena", group: "Carbohidratos", name: "Avena (cruda)", gBase: 100, p: 13.2, c: 67.7, f: 6.5, measures: [{ label: "cda (15 g)", g: 15 }, G], defaultQty: 2 },
  { id: "pan", group: "Carbohidratos", name: "Pan francés", gBase: 100, p: 8.5, c: 50, f: 1.5, measures: [{ label: "pan (60 g)", g: 60 }, G], defaultQty: 1 },
  { id: "panint", group: "Carbohidratos", name: "Pan integral", gBase: 100, p: 12, c: 44, f: 4, measures: [{ label: "rebanada (25 g)", g: 25 }, G], defaultQty: 1 },
  { id: "galletas", group: "Carbohidratos", name: "Tostadas de arroz", gBase: 100, p: 8, c: 81, f: 3, measures: [{ label: "unidad (9 g)", g: 9 }, G], defaultQty: 2 },
  { id: "lentejas", group: "Carbohidratos", name: "Lentejas (cocidas)", gBase: 100, p: 9, c: 20, f: 0.4, measures: [G, { label: "taza (200 g)", g: 200 }], defaultQty: 150 },
  { id: "garbanzos", group: "Carbohidratos", name: "Garbanzos (cocidos)", gBase: 100, p: 8.9, c: 27, f: 2.6, measures: [G], defaultQty: 150 },

  // ---------- Verduras ----------
  { id: "ensalada", group: "Verduras", name: "Ensalada mixta (hojas, tomate)", gBase: 100, p: 1.2, c: 4, f: 0.2, measures: [G, { label: "plato (200 g)", g: 200 }], defaultQty: 200 },
  { id: "zapallo", group: "Verduras", name: "Zapallo / calabaza", gBase: 100, p: 1, c: 10, f: 0.1, measures: [G], defaultQty: 200 },
  { id: "zapallito", group: "Verduras", name: "Zapallito / zucchini", gBase: 100, p: 1.2, c: 3.1, f: 0.3, measures: [G], defaultQty: 200 },
  { id: "berenjena", group: "Verduras", name: "Berenjena", gBase: 100, p: 1, c: 6, f: 0.2, measures: [G], defaultQty: 150 },
  { id: "remolacha", group: "Verduras", name: "Remolacha (hervida)", gBase: 100, p: 1.6, c: 10, f: 0.2, measures: [G], defaultQty: 100 },
  { id: "chauchas", group: "Verduras", name: "Chauchas", gBase: 100, p: 1.8, c: 7, f: 0.2, measures: [G], defaultQty: 150 },
  { id: "zanahoria", group: "Verduras", name: "Zanahoria", gBase: 100, p: 0.9, c: 9.6, f: 0.2, measures: [G], defaultQty: 100 },
  { id: "pimiento", group: "Verduras", name: "Pimiento / morrón", gBase: 100, p: 1, c: 6, f: 0.3, measures: [G], defaultQty: 100 },
  { id: "cebolla", group: "Verduras", name: "Cebolla", gBase: 100, p: 1.1, c: 9, f: 0.1, measures: [G], defaultQty: 80 },
  { id: "sopa", group: "Verduras", name: "Sopa casera de verduras", gBase: 100, p: 1.2, c: 5, f: 0.8, measures: [{ label: "plato (300 g)", g: 300 }, G], defaultQty: 1 },

  // ---------- Frutas ----------
  { id: "banana", group: "Frutas", name: "Banana", gBase: 100, p: 1.1, c: 23, f: 0.3, measures: [{ label: "unidad mediana (120 g)", g: 120 }, G], defaultQty: 1 },
  { id: "manzana", group: "Frutas", name: "Manzana", gBase: 100, p: 0.3, c: 14, f: 0.2, measures: [{ label: "unidad (180 g)", g: 180 }, G], defaultQty: 1 },
  { id: "naranja", group: "Frutas", name: "Naranja o mandarina", gBase: 100, p: 0.9, c: 12, f: 0.1, measures: [{ label: "unidad (150 g)", g: 150 }, G], defaultQty: 1 },
  { id: "frutilla", group: "Frutas", name: "Frutillas / arándanos", gBase: 100, p: 0.7, c: 8, f: 0.3, measures: [G, { label: "taza (150 g)", g: 150 }], defaultQty: 150 },
  { id: "pera", group: "Frutas", name: "Pera o durazno", gBase: 100, p: 0.5, c: 13, f: 0.2, measures: [{ label: "unidad (170 g)", g: 170 }, G], defaultQty: 1 },

  // ---------- Grasas ----------
  { id: "aceite", group: "Grasas", name: "Aceite de oliva", gBase: 100, p: 0, c: 0, f: 100, measures: [{ label: "cda (14 ml)", g: 14 }, { label: "cdita (5 ml)", g: 5 }, ML], defaultQty: 1 },
  { id: "palta", group: "Grasas", name: "Palta", gBase: 100, p: 2, c: 8.5, f: 15, measures: [{ label: "cda (20 g)", g: 20 }, { label: "media palta (100 g)", g: 100 }, G], defaultQty: 3 },
  { id: "aceitunas", group: "Grasas", name: "Aceitunas", gBase: 100, p: 0.8, c: 6, f: 15, measures: [{ label: "unidad (4 g)", g: 4 }, G], defaultQty: 5 },
  { id: "nueces", group: "Grasas", name: "Nueces", gBase: 100, p: 15, c: 14, f: 65, measures: [{ label: "unidad (5 g)", g: 5 }, G], defaultQty: 3 },
  { id: "frutos-secos", group: "Grasas", name: "Frutos secos mixtos", gBase: 100, p: 20, c: 20, f: 50, measures: [{ label: "cda (12 g)", g: 12 }, G], defaultQty: 2 },
  { id: "mani", group: "Grasas", name: "Maní tostado", gBase: 100, p: 25, c: 16, f: 50, measures: [G, { label: "puñado (30 g)", g: 30 }], defaultQty: 30 },
  { id: "pasta-mani", group: "Grasas", name: "Pasta de maní", gBase: 100, p: 25, c: 20, f: 50, measures: [{ label: "cda (16 g)", g: 16 }, G], defaultQty: 1 },
  { id: "chia", group: "Grasas", name: "Semillas de chía", gBase: 100, p: 17, c: 42, f: 31, measures: [{ label: "cda (12 g)", g: 12 }, G], defaultQty: 1 },

  // ---------- Otros ----------
  { id: "choco-amargo", group: "Otros", name: "Chocolate amargo (70%)", gBase: 100, p: 7.8, c: 46, f: 43, measures: [{ label: "barrita (20 g)", g: 20 }, G], defaultQty: 1 },
  { id: "gelatina", group: "Otros", name: "Gelatina diet", gBase: 100, p: 1, c: 0.5, f: 0, measures: [{ label: "porción (150 g)", g: 150 }, G], defaultQty: 1 }
];

const MEALS = ["Desayuno", "Colación", "Almuerzo", "Merienda", "Cena", "Snack"];

const ACTIVITY_LEVELS = [
  { value: 1.2, label: "Sedentaria (trabajo sentada, poco movimiento)" },
  { value: 1.3, label: "Movimiento normal del día — recomendado" },
  { value: 1.4, label: "Activa (mucho de pie o caminando todo el día)" }
];

// Factor por el que se multiplican los macros de referencia.
function foodFactor(food, qty, measure) {
  const m = measure || (food.measures || [G])[0];
  return (qty * (m.g || 1)) / (food.gBase || 1);
}
function foodMacros(food, qty, measure) {
  const k = foodFactor(food, qty, measure);
  return { p: food.p * k, c: food.c * k, f: food.f * k };
}
const macrosKcal = ({ p, c, f }) => Math.round(p * 4 + c * 4 + f * 9);
const kcalOf = (food, qty, measure) => macrosKcal(foodMacros(food, qty, measure));
