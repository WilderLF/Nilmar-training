/* ============================================================
   Sincronización entre dispositivos
   La app sigue guardando primero en el teléfono (rápida y sin
   conexión) y además sube a Supabase. Al abrirla en otro lado,
   baja lo que falte y lo une con lo local.

   El punto delicado es unir: si cargaste comidas en el celular y
   el peso en la compu, tienen que quedar las dos cosas. Por eso
   no se pisa un dispositivo con el otro — se unen registro por
   registro, y lo que borraste queda borrado gracias a las marcas
   de borrado.
   ============================================================ */

const SYNC_KEY = "nilmar-sync-config";
const DOC_KEY = "nilmar-state";

const Sync = (() => {
  let supabase = null;
  let config = null;
  let userId = null;
  let online = navigator.onLine;
  let sincronizando = false;
  let pendiente = false;
  let subidaTimer = null;
  let ultimaSync = null;

  const leerConfig = () => { try { return JSON.parse(localStorage.getItem(SYNC_KEY)); } catch { return null; } };
  const guardarConfig = c => { localStorage.setItem(SYNC_KEY, JSON.stringify(c)); config = c; };

  /* ---------- marcas de borrado ----------
     Sin esto, algo que borrás en un dispositivo reaparece desde el
     otro en la próxima unión. */
  function marcarBorrado(clave) {
    state.deleted ||= {};
    state.deleted[clave] = new Date().toISOString();
    // 90 días alcanza: después ya no hay con qué resucitarlo.
    const corte = new Date(Date.now() - 90 * 86400000).toISOString();
    Object.keys(state.deleted).forEach(k => { if (state.deleted[k] < corte) delete state.deleted[k]; });
  }
  const estaBorrado = (d, clave) => !!(d && d[clave]);

  /* ---------- unión de los dos estados ---------- */

  // Une dos listas de objetos que se identifican por un campo.
  function unirPorId(local = [], remoto = [], campo, prefijo, borrados) {
    const mapa = new Map();
    [...remoto, ...local].forEach(item => {
      if (!item || item[campo] == null) return;
      if (estaBorrado(borrados, `${prefijo}:${item[campo]}`)) return;
      // Lo local llega último, así que gana si el mismo id está en los dos.
      mapa.set(String(item[campo]), item);
    });
    return [...mapa.values()];
  }

  // Une objetos cuyas claves son fechas: { "2026-10-17": [...] }
  function unirPorFecha(local = {}, remoto = {}, prefijo, borrados) {
    const out = { ...remoto };
    Object.entries(local || {}).forEach(([fecha, valor]) => {
      const previo = out[fecha];
      if (Array.isArray(valor) && Array.isArray(previo)) {
        out[fecha] = unirPorId(valor, previo, "id", prefijo, borrados);
      } else if (valor && typeof valor === "object" && previo && typeof previo === "object" && !Array.isArray(valor)) {
        out[fecha] = { ...previo, ...valor };
      } else {
        out[fecha] = valor;
      }
    });
    // Saca lo que se borró entero (un día de comidas, por ejemplo)
    Object.keys(out).forEach(f => {
      if (estaBorrado(borrados, `${prefijo}dia:${f}`) || estaBorrado(borrados, `${prefijo}:${f}`)) delete out[f];
    });
    return out;
  }

  /* Une el estado remoto con el local.
     Regla: las colecciones se suman (no se pierde nada), y la
     configuración sigue al dispositivo que guardó más tarde. */
  function unirEstados(local, remoto, remotoEsMasNuevo) {
    if (!remoto || typeof remoto !== "object") return local;
    const borrados = { ...(remoto.deleted || {}), ...(local.deleted || {}) };
    const out = remotoEsMasNuevo ? { ...local, ...remoto } : { ...remoto, ...local };

    out.deleted = borrados;
    out.logs = unirPorId(local.logs, remoto.logs, "id", "log", borrados)
      .sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 300);
    out.completed = { ...(remoto.completed || {}), ...(local.completed || {}) };
    out.mediaOverrides = { ...(remoto.mediaOverrides || {}), ...(local.mediaOverrides || {}) };

    const ln = local.nutrition || {}, rn = remoto.nutrition || {};
    out.nutrition = remotoEsMasNuevo ? { ...ln, ...rn } : { ...rn, ...ln };
    out.nutrition.profile = remotoEsMasNuevo
      ? { ...(ln.profile || {}), ...(rn.profile || {}) }
      : { ...(rn.profile || {}), ...(ln.profile || {}) };

    out.nutrition.days = unirPorFecha(ln.days, rn.days, "meal", borrados);
    out.nutrition.planLog = unirPorFecha(ln.planLog, rn.planLog, "plan", borrados);
    out.nutrition.training = { ...(rn.training || {}), ...(ln.training || {}) };
    out.nutrition.weights = unirPorId(ln.weights, rn.weights, "date", "weight", borrados)
      .sort((a, b) => a.date.localeCompare(b.date)).slice(-365);
    out.nutrition.measures = unirPorId(ln.measures, rn.measures, "date", "measure", borrados)
      .sort((a, b) => a.date.localeCompare(b.date)).slice(-160);
    out.nutrition.customFoods = unirPorId(ln.customFoods, rn.customFoods, "id", "food", borrados);

    // El ciclo se guarda por fecha: se une día por día, igual que las comidas.
    const lc = local.cycle || {}, rc = remoto.cycle || {};
    out.cycle = remotoEsMasNuevo ? { ...lc, ...rc } : { ...rc, ...lc };
    out.cycle.days = unirPorFecha(lc.days, rc.days, "cycle", borrados);

    // Los bloques del plan se identifican por su id.
    out.blocks = unirPorId(local.blocks, remoto.blocks, "id", "block", borrados);
    out.goals = remotoEsMasNuevo
      ? { ...(local.goals || {}), ...(remoto.goals || {}) }
      : { ...(remoto.goals || {}), ...(local.goals || {}) };

    return out;
  }

  /* ---------- Supabase ---------- */

  async function cargarSdk() {
    if (window.supabase?.createClient) return window.supabase;
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
      s.onload = res; s.onerror = () => rej(new Error("No se pudo cargar el conector de Supabase"));
      document.head.appendChild(s);
    });
    return window.supabase;
  }

  async function conectar(c = config) {
    if (!c?.url || !c?.anonKey || !c?.email || !c?.password) {
      return { ok: false, error: "Faltan datos de conexión." };
    }
    try {
      const sdk = await cargarSdk();
      const cliente = sdk.createClient(c.url.trim().replace(/\/$/, ""), c.anonKey.trim(), {
        auth: { persistSession: true, storageKey: "nilmar-auth" }
      });

      let { data, error } = await cliente.auth.signInWithPassword({ email: c.email.trim(), password: c.password });
      if (error) {
        const alta = await cliente.auth.signUp({ email: c.email.trim(), password: c.password });
        if (alta.error) return { ok: false, error: traducir(alta.error.message) };
        if (!alta.data.session) {
          return { ok: false, error: "Cuenta creada. Confirmá el mail que te llegó y volvé a tocar Conectar." };
        }
        data = alta.data;
      }

      supabase = cliente;
      userId = data.user.id;
      guardarConfig(c);
      await sincronizar();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || "No se pudo conectar." };
    }
  }

  function traducir(msg = "") {
    const m = msg.toLowerCase();
    if (m.includes("invalid login")) return "Email o contraseña incorrectos.";
    if (m.includes("password") && m.includes("6")) return "La contraseña necesita al menos 6 caracteres.";
    if (m.includes("already registered")) return "Ese email ya existe: revisá la contraseña.";
    if (m.includes("failed to fetch")) return "No se pudo contactar a Supabase. Revisá la dirección del proyecto.";
    if (m.includes("invalid api key")) return "La clave no es válida. Copiá la publishable (sb_publishable_…) o la anon (eyJ…).";
    return msg;
  }

  function desconectar() {
    localStorage.removeItem(SYNC_KEY);
    config = null; supabase = null; userId = null;
    renderSyncUI();
  }

  /* ---------- subir y bajar ---------- */

  async function subir() {
    if (!supabase || !userId) return { ok: false };
    try {
      const { error } = await supabase.from("app_data").upsert({
        user_id: userId, key: DOC_KEY, value: state, updated_at: new Date().toISOString()
      }, { onConflict: "user_id,key" });
      if (error) throw error;
      pendiente = false;
      localStorage.setItem("nilmar-last-sync", new Date().toISOString());
      ultimaSync = new Date().toISOString();
      renderSyncUI();
      return { ok: true };
    } catch (e) {
      pendiente = true;
      renderSyncUI();
      return { ok: false, error: e.message };
    }
  }

  async function sincronizar() {
    if (!supabase || !userId || sincronizando || !online) return { ok: false };
    sincronizando = true;
    renderSyncUI();
    try {
      const { data, error } = await supabase
        .from("app_data").select("value, updated_at").eq("user_id", userId).eq("key", DOC_KEY).maybeSingle();
      if (error) throw error;

      if (data?.value) {
        const guardadoLocal = localStorage.getItem("nilmar-last-save") || "";
        const remotoEsMasNuevo = (data.updated_at || "") > guardadoLocal;
        const unido = unirEstados(state, data.value, remotoEsMasNuevo);
        Object.keys(state).forEach(k => { if (!(k in unido)) delete state[k]; });
        Object.assign(state, unido);
        localStorage.setItem(STORE_KEY, JSON.stringify(state));
        redibujarTodo();
      }
      await subir();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    } finally {
      sincronizando = false;
      renderSyncUI();
    }
  }

  // Se llama en cada saveState: agrupa las subidas para no saturar.
  function programarSubida() {
    localStorage.setItem("nilmar-last-save", new Date().toISOString());
    if (!supabase || !userId) return;
    pendiente = true;
    clearTimeout(subidaTimer);
    subidaTimer = setTimeout(() => subir(), 1500);
  }

  function estado() {
    return {
      configurado: !!config, conectado: !!(supabase && userId),
      sincronizando, online, pendiente,
      ultimaSync: ultimaSync || localStorage.getItem("nilmar-last-sync"),
      email: config?.email || null
    };
  }

  /* El token de la sesión: lo usa la función que analiza las fotos
     para confirmar que quien llama es ella y no un desconocido. */
  async function token() {
    if (!supabase) return null;
    try {
      const { data } = await supabase.auth.getSession();
      return data?.session?.access_token || null;
    } catch { return null; }
  }

  /* ---------- respaldo manual ---------- */
  const exportar = () => ({ app: "Nilmar Training", exportado: new Date().toISOString(), estado: state });

  async function importar(json) {
    const entrante = json?.estado || json?.datos || json;
    if (!entrante || typeof entrante !== "object") throw new Error("El archivo no tiene el formato esperado.");
    const unido = unirEstados(state, entrante, true);
    Object.assign(state, unido);
    saveState();
    redibujarTodo();
    if (supabase) await sincronizar();
  }

  async function init() {
    config = leerConfig();
    ultimaSync = localStorage.getItem("nilmar-last-sync");
    window.addEventListener("online", () => { online = true; renderSyncUI(); sincronizar(); });
    window.addEventListener("offline", () => { online = false; renderSyncUI(); });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) sincronizar(); });
    setInterval(() => sincronizar(), 4 * 60 * 1000);
    if (config) {
      const r = await conectar(config);
      if (!r.ok) console.warn("Nilmar · sincronización:", r.error);
    }
    renderSyncUI();
  }

  return { init, conectar, desconectar, sincronizar, programarSubida, estado, token, exportar, importar, marcarBorrado, unirEstados };
})();
