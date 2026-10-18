/* ============================================================
   Cargar comida sacando una foto

   Importante para entender cómo está pensado: la foto NO reemplaza
   a la balanza. Desde una imagen no se puede ver el aceite con el
   que se cocinó, ni la profundidad del plato, ni si el corte es
   magro. Por eso lo que vuelve es un borrador editable: ella ajusta
   los gramos y recién ahí se guarda. Cuando pueda pesar, que pese.
   ============================================================ */

const FOTO_ENDPOINT = "/api/analizar-comida";
const FOTO_MAX_LADO = 1000;   // achicar antes de subir: menos datos y menos costo
const FOTO_CALIDAD = 0.82;

let fotoResultado = null;     // lo último que devolvió el análisis
let fotoPreviewUrl = null;

/* Achica y comprime en el teléfono. Una foto de celular pesa 4 MB;
   así sube menos de 200 KB y el análisis sale más rápido y barato. */
function achicarImagen(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const escala = Math.min(1, FOTO_MAX_LADO / Math.max(img.width, img.height));
      const w = Math.round(img.width * escala), h = Math.round(img.height * escala);
      const lienzo = document.createElement("canvas");
      lienzo.width = w; lienzo.height = h;
      lienzo.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      const dataUrl = lienzo.toDataURL("image/jpeg", FOTO_CALIDAD);
      resolve({ base64: dataUrl.split(",")[1], preview: dataUrl });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la foto.")); };
    img.src = url;
  });
}

async function analizarFoto(file) {
  const estado = $("foto-estado");
  const resultado = $("foto-resultado");
  resultado.innerHTML = "";
  fotoResultado = null;

  const mostrar = (msg, tipo = "info") => {
    estado.className = `foto-estado ${tipo}`;
    estado.innerHTML = msg;
    estado.classList.remove("hidden");
  };

  try {
    mostrar("Preparando la foto…");
    const { base64, preview } = await achicarImagen(file);
    fotoPreviewUrl = preview;
    $("foto-preview").innerHTML = `<img src="${preview}" alt="Foto del plato" />`;
    $("foto-preview").classList.remove("hidden");

    const tok = typeof Sync !== "undefined" ? await Sync.token() : null;
    if (!tok) {
      mostrar(`Para usar la cámara primero tenés que conectar tu cuenta.
        <button class="ghost-btn small-btn" data-nav="sync-view">Ir a Sincronización</button>`, "warn");
      return;
    }

    mostrar("Mirando el plato… <i class=\"foto-spin\"></i>");
    const r = await fetch(FOTO_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${tok}` },
      body: JSON.stringify({ imagen: base64, tipo: "image/jpeg", pista: $("foto-pista").value || "" })
    });
    const data = await r.json().catch(() => ({}));

    if (!r.ok) { mostrar(escapeHtml(data.error || "No se pudo analizar la foto."), "error"); return; }
    if (!data.alimentos?.length) {
      mostrar(escapeHtml(data.nota || "No encontré comida en esa foto. Probá con otra."), "warn");
      return;
    }

    fotoResultado = data;
    estado.classList.add("hidden");
    renderFotoResultado();
  } catch (e) {
    mostrar(escapeHtml(e.message || "Algo falló con la foto."), "error");
  }
}

/* El resultado se muestra como borrador: cada alimento con sus gramos
   editables, y los macros se recalculan solos al cambiarlos. */
function renderFotoResultado() {
  if (!fotoResultado) return;
  const d = fotoResultado;
  const filas = d.alimentos.map((a, i) => {
    const kcal = Math.round(a.p * 4 + a.c * 4 + a.f * 9);
    return `<div class="foto-item" data-foto-i="${i}">
      <div class="foto-item-head">
        <input class="foto-nombre" type="text" value="${escapeHtml(a.nombre)}" data-foto-nombre="${i}" />
        <button class="foto-quitar" data-foto-quitar="${i}" aria-label="Quitar">✕</button>
      </div>
      <div class="foto-item-row">
        <label>
          <span>Gramos</span>
          <input class="foto-g" type="number" inputmode="numeric" min="0" step="5"
            value="${a.gramos}" data-foto-g="${i}" />
        </label>
        <div class="foto-macros">
          <b data-foto-kcal="${i}">${kcal}</b> kcal
          <small data-foto-pcf="${i}">P ${fmt1(a.p)} · C ${fmt1(a.c)} · G ${fmt1(a.f)}</small>
        </div>
        <span class="foto-conf ${a.confianza}">${a.confianza}</span>
      </div>
    </div>`;
  }).join("");

  const totalKcal = d.alimentos.reduce((s, a) => s + a.p * 4 + a.c * 4 + a.f * 9, 0);
  const bajas = d.alimentos.filter(a => a.confianza === "baja").length;

  $("foto-resultado").innerHTML = `
    <div class="foto-draft">
      <div class="foto-draft-head">
        <h4>Borrador · revisá antes de guardar</h4>
        <span class="foto-total"><b id="foto-total-kcal">${Math.round(totalKcal)}</b> kcal</span>
      </div>
      ${d.nota ? `<p class="foto-nota">⚠️ ${escapeHtml(d.nota)}</p>` : ""}
      ${bajas ? `<p class="foto-nota">${bajas === 1 ? "Un alimento tiene" : `${bajas} alimentos tienen`}
        confianza baja: no se veía bien el tamaño de la porción. Si lo podés pesar, corregí los gramos.</p>` : ""}
      ${filas}
      <label class="label top-gap" for="foto-meal">¿En qué comida?</label>
      <select id="foto-meal">${MEALS.map(m => `<option ${m === guessMeal() ? "selected" : ""}>${m}</option>`).join("")}</select>
      <button id="foto-guardar" class="primary-btn full top-gap">Agregar al día</button>
      <p class="dataset-note">Los gramos son una estimación hecha a ojo desde la foto.
        Cuando puedas usar la balanza, va a ser más exacto.</p>
    </div>`;
}

/* Al cambiar los gramos se reescalan los macros proporcionalmente. */
function recalcularFotoItem(i, nuevosGramos) {
  const a = fotoResultado?.alimentos[i];
  if (!a) return;
  const base = a.gramosBase || a.gramos;
  if (!a.gramosBase) { a.gramosBase = base; a.pBase = a.p; a.cBase = a.c; a.fBase = a.f; }
  const factor = base > 0 ? nuevosGramos / base : 0;
  a.gramos = nuevosGramos;
  a.p = Math.round(a.pBase * factor * 10) / 10;
  a.c = Math.round(a.cBase * factor * 10) / 10;
  a.f = Math.round(a.fBase * factor * 10) / 10;

  const kcal = Math.round(a.p * 4 + a.c * 4 + a.f * 9);
  const elKcal = document.querySelector(`[data-foto-kcal="${i}"]`);
  const elPcf = document.querySelector(`[data-foto-pcf="${i}"]`);
  if (elKcal) elKcal.textContent = kcal;
  if (elPcf) elPcf.textContent = `P ${fmt1(a.p)} · C ${fmt1(a.c)} · G ${fmt1(a.f)}`;
  const total = fotoResultado.alimentos.reduce((s, x) => s + x.p * 4 + x.c * 4 + x.f * 9, 0);
  const elTotal = $("foto-total-kcal");
  if (elTotal) elTotal.textContent = Math.round(total);
}

function guardarFoto() {
  if (!fotoResultado?.alimentos.length) return;
  const comida = $("foto-meal").value;
  fotoResultado.alimentos.forEach(a => {
    addFoodEntry({
      name: a.nombre, qtyText: `${a.gramos} g · por foto`, grams: a.gramos,
      p: a.p, c: a.c, f: a.f, meal: comida
    });
  });
  limpiarFoto();
  $("foto-estado").className = "foto-estado ok";
  $("foto-estado").textContent = "Listo, lo sumé al día.";
  $("foto-estado").classList.remove("hidden");
  setTimeout(() => $("foto-estado")?.classList.add("hidden"), 3500);
}

function limpiarFoto() {
  fotoResultado = null; fotoPreviewUrl = null;
  $("foto-resultado").innerHTML = "";
  $("foto-preview").innerHTML = "";
  $("foto-preview").classList.add("hidden");
  $("foto-pista").value = "";
}

function setupFotoEvents() {
  const input = $("foto-input");
  if (!input) return;

  input.addEventListener("change", e => {
    const file = e.target.files?.[0];
    // Se limpia el input enseguida: si no, elegir la MISMA foto otra vez
    // (por ejemplo después de un error) no dispara ningún evento.
    e.target.value = "";
    if (file) analizarFoto(file);
  });
  $("foto-limpiar")?.addEventListener("click", () => {
    limpiarFoto();
    $("foto-estado").classList.add("hidden");
  });

  const caja = $("foto-box");
  caja.addEventListener("click", e => {
    if (e.target.closest("#foto-guardar")) { guardarFoto(); return; }
    const quitar = e.target.closest("[data-foto-quitar]");
    if (quitar) {
      fotoResultado.alimentos.splice(Number(quitar.dataset.fotoQuitar), 1);
      fotoResultado.alimentos.length ? renderFotoResultado() : limpiarFoto();
    }
  });
  caja.addEventListener("input", e => {
    const g = e.target.closest("[data-foto-g]");
    if (g) { recalcularFotoItem(Number(g.dataset.fotoG), Math.max(0, Number(g.value) || 0)); return; }
    const nom = e.target.closest("[data-foto-nombre]");
    if (nom && fotoResultado) fotoResultado.alimentos[Number(nom.dataset.fotoNombre)].nombre = nom.value;
  });
}
