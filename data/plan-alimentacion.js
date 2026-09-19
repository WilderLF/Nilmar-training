/* ============================================================
   Plan de alimentación · Lic. Solana María Nacul (M.P. 336)
   SolNacul — Buena Nutrición
   Este plan es la referencia principal de la app. Los cálculos
   de macros quedan como información secundaria y opcional.
   ============================================================ */

const PLAN_PROFESIONAL = {
  nombre: "Lic. Solana María Nacul",
  matricula: "Matrícula profesional 336",
  estudio: "SolNacul · Buena Nutrición",
  contacto: "3865 696304",
  instagram: "SolNacul_BuenaNutricion"
};

const PLAN_DESAYUNOS = [
  "1 rebanada de pan integral con 2 cdas de ricota, 1 feta de jamón y 2 aceitunas",
  "Omelet de 1 huevo + queso cremoso + ½ fruta",
  "2 tostadas de arroz con 3 cdas de palta + 1 huevo + 3 nueces",
  "Panqueque de 1 huevo y 2 cdas de avena + ½ fruta y 2 cdas de frutos secos",
  "120 cc de yogur descremado + chía + 1 fruta y 2 cdas de frutos secos",
  "2 huevos revueltos + 1 tostada con ½ palta + 1 fruta"
];
const PLAN_DESAYUNO_BEBIDA = "Infusión con edulcorante. Podés cortarla con leche descremada.";

const PLAN_COLACIONES = [
  "1 fruta",
  "Licuado de frutas con 3 cdas de frutos secos",
  "1 barra de chocolate amargo",
  "5-6 aceitunas",
  "1 vaso de yogur descremado",
  "1 huevo"
];

const PLAN_COMIDAS = {
  monday: { almuerzo: "Bife de pollo gratinado con queso + puré de zapallo", cena: null },
  tuesday: { almuerzo: "Filet de atún o cerdo con cebollita, pimientos, zanahoria y zapallito", cena: null },
  wednesday: { almuerzo: "Ensalada de remolacha, chauchas y zanahoria + 1 huevo y 1 huevo sin yema", cena: null },
  thursday: { almuerzo: "Pollito al horno con berenjenas, cebollita, pimientos y coreano", cena: null },
  friday: { almuerzo: "Wok de arroz con zanahoria, cebollita, pimiento y queso", cena: null },
  saturday: { almuerzo: "Carne + zapallitos revueltos con cebolla y huevo", cena: "FLEX" },
  sunday: { almuerzo: "FLEX", cena: null }
};

const PLAN_CENAS = [
  "Lo mismo que el almuerzo, reduciendo la porción",
  "Sopa casera de verduras con huevo o queso",
  "Una merienda de la lista como \"merencena\"",
  "Omelet de 1 huevo con queso y vegetales + 1 fruta",
  "Ensalada con revuelto, o tortilla de verduras con huevo y queso"
];

const PLAN_RECOMENDACIONES = [
  "Tomar agua durante todo el día",
  "Usar poca sal",
  "Comer lento, sentada y tranquila: ¡masticar!",
  "Podés agregar un poquito de oliva y limón a las comidas, más especias suaves",
  "Ordenar tus comidas y comer con apetito",
  "¡Disfrutar de tu ciudad!"
];

const PLAN_SEMAFORO = {
  si: ["Agua", "Sal (poca)", "Té verde", "Semillas", "Aceite de oliva o coco", "Frutos secos",
       "Especias, ajo y ají", "Limón y vinagre", "Aceto y mostaza", "Agua con limón",
       "Soda y Clight*", "Gaseosas Zero*", "Infusiones", "Gelatina diet"],
  no: ["Azúcar", "Miel", "Aceite de mezcla", "Crema", "Margarina", "Jugo casero", "Jugo comercial",
       "Agua saborizada", "Aderezos", "Salsas comerciales", "Gaseosas comunes"],
  nota: "* Eventualmente o no consumirlos."
};

const PLAN_PLATOS = [
  { titulo: "Plato 1", partes: [["Animal", "animal"], ["Vegetal", "vegetal"]], detalle: "Mitad proteína animal (carne, pollo, pescado, huevo) y mitad vegetales." },
  { titulo: "Plato 2", partes: [["Animal", "animal"], ["Almidón", "almidon"], ["Vegetal", "vegetal"]], detalle: "Proteína animal, una porción de almidón (arroz, papa, choclo) y vegetales." },
  { titulo: "Plato 3", partes: [["Almidón", "almidon"], ["Queso y huevo", "animal"], ["Vegetal", "vegetal"]], detalle: "Sin carne: almidón, queso y huevo como proteína, y vegetales." }
];

const PLAN_CHECKS = [
  { id: "desayuno", label: "Desayuno" },
  { id: "colacion", label: "Colación" },
  { id: "almuerzo", label: "Almuerzo" },
  { id: "merienda", label: "Merienda" },
  { id: "cena", label: "Cena" },
  { id: "agua", label: "Agua del día" }
];

const PLAN_FLEX = "FLEX es la comida libre del plan: la elegís vos, sin culpa y sin que se salga de lo pactado con Solana. Está adentro del plan, no es romperlo.";
