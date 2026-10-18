/* ============================================================
   Analizar una foto de comida  ·  función de Vercel
   Vive en el servidor, no en el navegador, por un motivo central:
   la clave de la API de Claude NO puede viajar al teléfono. La app
   es una página pública y cualquiera podría leerla del código y
   gastar plata ajena. Acá la clave sale de una variable de entorno
   y nunca se expone.

   Variables que hay que cargar en Vercel:
     ANTHROPIC_API_KEY   · la clave de console.anthropic.com
     SUPABASE_URL        · la dirección del proyecto de Supabase
     SUPABASE_ANON_KEY   · la clave publishable (la misma de la app)
   ============================================================ */

const MODELO = "claude-sonnet-5-5";
const MAX_IMAGEN_BYTES = 4 * 1024 * 1024;   // la app ya la achica antes de subirla

/* Lo que Claude tiene que devolver, con forma fija. Pidiéndolo como
   herramienta obligatoria no hay que adivinar nada del texto. */
const HERRAMIENTA = {
  name: "registrar_comida",
  description: "Devuelve los alimentos del plato con su porción estimada y sus macros.",
  input_schema: {
    type: "object",
    properties: {
      alimentos: {
        type: "array",
        description: "Un elemento por alimento distinguible. Si hay un guiso o mezcla, separá los ingredientes principales.",
        items: {
          type: "object",
          properties: {
            nombre: { type: "string", description: "Nombre corto y concreto en español rioplatense. Ej: 'Pechuga de pollo a la plancha'." },
            gramos: { type: "number", description: "Gramos estimados de la porción que se ve en la foto." },
            proteina: { type: "number", description: "Gramos de proteína de ESA porción." },
            carbos: { type: "number", description: "Gramos de carbohidratos de ESA porción." },
            grasa: { type: "number", description: "Gramos de grasa de ESA porción, incluyendo el aceite o la manteca con la que se habría cocinado." },
            confianza: { type: "string", enum: ["alta", "media", "baja"], description: "Qué tan seguro estás del alimento Y de la porción. Si no ves bien el tamaño, es baja." }
          },
          required: ["nombre", "gramos", "proteina", "carbos", "grasa", "confianza"]
        }
      },
      nota: {
        type: "string",
        description: "Una frase sobre lo que no se puede saber desde la foto y que más afecta las calorías (aceite de cocción, salsas, si el corte es magro o no). Vacío si el plato es simple y claro."
      }
    },
    required: ["alimentos"]
  }
};

const INSTRUCCIONES = `Sos un nutricionista estimando lo que hay en un plato a partir de una foto.

Cómo estimar la porción:
- Usá como referencia lo que haya alrededor: el tamaño del plato (uno playo común mide 26 cm), los cubiertos, un vaso, una mano.
- Si no hay nada que dé escala, asumí una porción de tamaño normal y marcá la confianza como "baja".
- El aceite y la manteca de cocción casi nunca se ven y son muchas calorías: una cucharada son 14 g de grasa, unas 126 kcal. Si el plato está salteado, frito o dorado, incluilo en la grasa y decilo en la nota.

Sé honesto con lo que no se puede saber. Es mejor una estimación con la confianza en "baja" que un número inventado con seguridad falsa. Si la foto no es comida, devolvé la lista vacía y explicá en la nota qué ves.

Valores de macros: usá los de alimentos reales, para la porción que estimaste (no por 100 g).`;

/* ---------- verificar que quien llama tiene sesión ----------
   Sin esto, cualquiera que encuentre la dirección podría usar la
   clave de API y dejar una factura. */
async function sesionValida(token) {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return { ok: false, motivo: "Falta configurar Supabase en el servidor." };
  if (!token) return { ok: false, motivo: "Entrá con tu cuenta antes de usar la cámara." };
  try {
    const r = await fetch(`${url.replace(/\/$/, "")}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anon }
    });
    if (!r.ok) return { ok: false, motivo: "Tu sesión venció. Volvé a conectarte desde Sincronización." };
    return { ok: true };
  } catch {
    return { ok: false, motivo: "No se pudo verificar la sesión." };
  }
}

// CommonJS a propósito: así Vercel la toma sin necesidad de un
// package.json en la raíz, que podría cambiar cómo publica el resto.
module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido." });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "Falta cargar ANTHROPIC_API_KEY en Vercel." });
  }

  const auth = (req.headers.authorization || "").replace(/^Bearer /, "");
  const sesion = await sesionValida(auth);
  if (!sesion.ok) return res.status(401).json({ error: sesion.motivo });

  const { imagen, tipo = "image/jpeg", pista = "" } = req.body || {};
  if (!imagen || typeof imagen !== "string") {
    return res.status(400).json({ error: "No llegó la foto." });
  }
  // base64 ocupa ~4/3 de los bytes reales
  if (imagen.length * 0.75 > MAX_IMAGEN_BYTES) {
    return res.status(413).json({ error: "La foto es muy pesada. Sacala de nuevo." });
  }

  const texto = pista.trim()
    ? `Analizá este plato. La persona agrega este dato: "${pista.trim().slice(0, 300)}"`
    : "Analizá este plato.";

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 1200,
        system: INSTRUCCIONES,
        tools: [HERRAMIENTA],
        tool_choice: { type: "tool", name: "registrar_comida" },
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: tipo, data: imagen } },
            { type: "text", text: texto }
          ]
        }]
      })
    });

    if (!r.ok) {
      const detalle = await r.text();
      console.error("Anthropic respondió", r.status, detalle.slice(0, 500));
      const amable = r.status === 401 ? "La clave de API no es válida."
        : r.status === 429 ? "Demasiadas fotos seguidas. Probá en un minuto."
        : r.status === 400 ? "La foto no se pudo procesar. Probá con otra."
        : "El analizador no respondió. Probá de nuevo.";
      return res.status(502).json({ error: amable });
    }

    const data = await r.json();
    const bloque = (data.content || []).find(c => c.type === "tool_use");
    if (!bloque) return res.status(502).json({ error: "No se pudo leer el plato. Probá con otra foto." });

    const alimentos = (bloque.input.alimentos || []).map(a => ({
      nombre: String(a.nombre || "Alimento").slice(0, 80),
      gramos: Math.max(0, Math.round(Number(a.gramos) || 0)),
      p: Math.max(0, Math.round((Number(a.proteina) || 0) * 10) / 10),
      c: Math.max(0, Math.round((Number(a.carbos) || 0) * 10) / 10),
      f: Math.max(0, Math.round((Number(a.grasa) || 0) * 10) / 10),
      confianza: ["alta", "media", "baja"].includes(a.confianza) ? a.confianza : "media"
    })).slice(0, 12);

    return res.status(200).json({
      alimentos,
      nota: String(bloque.input.nota || "").slice(0, 400),
      uso: data.usage || null
    });
  } catch (e) {
    console.error("Error analizando la comida:", e);
    return res.status(500).json({ error: "Algo falló al analizar la foto." });
  }
};
