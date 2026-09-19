// Valores aproximados por porción (p = proteína, c = carbohidratos, f = grasas, en gramos).
// Las calorías se calculan: p*4 + c*4 + f*9. Pesos en cocido salvo que se indique.
const FOOD_DB = [
  // Proteínas
  { id: "pollo", group: "Proteínas", name: "Pechuga de pollo (cocida)", unit: "100 g", p: 31, c: 0, f: 3.6 },
  { id: "carne", group: "Proteínas", name: "Carne vacuna magra (cocida)", unit: "100 g", p: 28, c: 0, f: 8 },
  { id: "picada", group: "Proteínas", name: "Carne picada especial (cocida)", unit: "100 g", p: 26, c: 0, f: 12 },
  { id: "cerdo", group: "Proteínas", name: "Lomo de cerdo (cocido)", unit: "100 g", p: 26, c: 0, f: 5 },
  { id: "merluza", group: "Proteínas", name: "Merluza (cocida)", unit: "100 g", p: 22, c: 0, f: 1.5 },
  { id: "atun", group: "Proteínas", name: "Atún al natural (escurrido)", unit: "1 lata (120 g)", p: 30, c: 0, f: 1.5 },
  { id: "huevo", group: "Proteínas", name: "Huevo entero", unit: "1 unidad", p: 6.3, c: 0.4, f: 5 },
  { id: "clara", group: "Proteínas", name: "Clara de huevo", unit: "1 unidad", p: 3.6, c: 0.2, f: 0 },
  { id: "whey", group: "Proteínas", name: "Proteína whey", unit: "1 scoop (30 g)", p: 24, c: 3, f: 1.5 },

  // Lácteos
  { id: "yogur", group: "Lácteos", name: "Yogur descremado", unit: "200 g", p: 8, c: 12, f: 0.4 },
  { id: "leche", group: "Lácteos", name: "Leche descremada", unit: "250 ml", p: 8.5, c: 12.5, f: 0.3 },
  { id: "queso", group: "Lácteos", name: "Queso magro (port salut light)", unit: "30 g", p: 7, c: 0.5, f: 4 },
  { id: "ricota", group: "Lácteos", name: "Ricota descremada", unit: "100 g", p: 11, c: 4, f: 3 },

  // Carbohidratos
  { id: "arroz", group: "Carbohidratos", name: "Arroz blanco (cocido)", unit: "100 g", p: 2.7, c: 28, f: 0.3 },
  { id: "fideos", group: "Carbohidratos", name: "Fideos (cocidos)", unit: "100 g", p: 5.8, c: 31, f: 0.9 },
  { id: "papa", group: "Carbohidratos", name: "Papa (hervida)", unit: "100 g", p: 1.9, c: 20, f: 0.1 },
  { id: "batata", group: "Carbohidratos", name: "Batata (hervida)", unit: "100 g", p: 1.4, c: 20, f: 0.1 },
  { id: "polenta", group: "Carbohidratos", name: "Polenta (cocida)", unit: "100 g", p: 1.6, c: 15, f: 0.3 },
  { id: "avena", group: "Carbohidratos", name: "Avena (cruda)", unit: "40 g", p: 5.3, c: 27, f: 2.6 },
  { id: "pan", group: "Carbohidratos", name: "Pan francés", unit: "1 pan (60 g)", p: 5.4, c: 30, f: 1 },
  { id: "panint", group: "Carbohidratos", name: "Pan integral", unit: "2 rebanadas (50 g)", p: 6, c: 22, f: 2 },
  { id: "galletas", group: "Carbohidratos", name: "Galletas de arroz", unit: "2 unidades", p: 1.4, c: 14, f: 0.5 },
  { id: "lentejas", group: "Carbohidratos", name: "Lentejas (cocidas)", unit: "100 g", p: 9, c: 20, f: 0.4 },
  { id: "garbanzos", group: "Carbohidratos", name: "Garbanzos (cocidos)", unit: "100 g", p: 8.9, c: 27, f: 2.6 },
  { id: "banana", group: "Carbohidratos", name: "Banana mediana", unit: "1 unidad", p: 1.3, c: 27, f: 0.4 },
  { id: "manzana", group: "Carbohidratos", name: "Manzana mediana", unit: "1 unidad", p: 0.5, c: 25, f: 0.3 },
  { id: "miel", group: "Carbohidratos", name: "Miel", unit: "1 cda (21 g)", p: 0, c: 17, f: 0 },
  { id: "verduras", group: "Carbohidratos", name: "Verduras / ensalada mixta", unit: "200 g", p: 3, c: 12, f: 0.4 },

  // Grasas
  { id: "aceite", group: "Grasas", name: "Aceite de oliva", unit: "1 cda (14 g)", p: 0, c: 0, f: 14 },
  { id: "palta", group: "Grasas", name: "Palta", unit: "50 g", p: 1, c: 4.3, f: 7.5 },
  { id: "mani", group: "Grasas", name: "Maní tostado", unit: "30 g", p: 7.5, c: 5, f: 15 },
  { id: "pasta-mani", group: "Grasas", name: "Pasta de maní", unit: "1 cda (16 g)", p: 4, c: 3.2, f: 8 },
  { id: "nueces", group: "Grasas", name: "Nueces", unit: "30 g", p: 4.6, c: 4, f: 19.6 }
];

const MEALS = ["Desayuno", "Almuerzo", "Merienda", "Cena", "Pre/post entreno", "Snack"];

const ACTIVITY_LEVELS = [
  { value: 1.375, label: "Ligero (1-3 días de ejercicio)" },
  { value: 1.55, label: "Moderado (3-5 días) — tu semana actual" },
  { value: 1.725, label: "Alto (6-7 días intensos)" }
];

const kcalOf = (item, qty = 1) => Math.round((item.p * 4 + item.c * 4 + item.f * 9) * qty);
