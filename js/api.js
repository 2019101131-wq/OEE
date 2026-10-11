/**
 * api.js
 * -----------------------------------------------------------------------
 * CAPA DE ACCESO REST A SUPABASE (PostgREST) — solo fetch, sin SDK.
 * Ningún otro módulo debe llamar a fetch(); todo pasa por database.js.
 *
 * Modelo: una tabla "registros" (coleccion, id, data jsonb). Cada
 * registro del sistema es una fila; la configuración es la fila
 * coleccion='configuracion', id='config'.
 * -----------------------------------------------------------------------
 */

const Api = (() => {
  const PAGE = 1000;

  function baseUrl() {
    return `${CONFIG.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${CONFIG.TABLE}`;
  }

  function headers(extra = {}) {
    const h = {
      "Content-Type": "application/json",
      apikey: CONFIG.SUPABASE_ANON_KEY,
      ...extra,
    };
    // Las claves JWT clásicas (eyJ...) también van como Bearer;
    // las nuevas "sb_publishable_..." solo usan el header apikey.
    if (CONFIG.SUPABASE_ANON_KEY.startsWith("eyJ")) {
      h.Authorization = `Bearer ${CONFIG.SUPABASE_ANON_KEY}`;
    }
    return h;
  }

  function validarConfig() {
    if (!CONFIG.SUPABASE_URL || CONFIG.SUPABASE_URL.startsWith("PEGAR") ||
        !CONFIG.SUPABASE_ANON_KEY || CONFIG.SUPABASE_ANON_KEY.startsWith("PEGAR")) {
      throw new Error("Falta configurar SUPABASE_URL y SUPABASE_ANON_KEY en js/config.js.");
    }
  }

  async function request(url, options) {
    validarConfig();
    let response;
    try {
      response = await fetch(url, options);
    } catch (e) {
      throw new Error("No hay conexión con Supabase. Revise su Internet y la URL del proyecto.");
    }
    if (!response.ok) {
      let detalle = "";
      try { detalle = (await response.json()).message || ""; } catch (_) {}
      throw new Error(`Error de Supabase (HTTP ${response.status}). ${detalle}`.trim());
    }
    return response;
  }

  const enc = encodeURIComponent;

  /** Descarga todas las filas y las agrupa por colección. */
  async function getDatabase() {
    const filas = [];
    for (let offset = 0; ; offset += PAGE) {
      const url = `${baseUrl()}?select=coleccion,id,data&order=creado_en.asc&limit=${PAGE}&offset=${offset}`;
      const res = await request(url, { method: "GET", headers: headers() });
      const lote = await res.json();
      filas.push(...lote);
      if (lote.length < PAGE) break;
    }
    const db = {};
    filas.forEach((f) => {
      if (f.coleccion === "configuracion") {
        db.configuracion = f.data;
      } else {
        (db[f.coleccion] = db[f.coleccion] || []).push({ ...f.data, id: f.id });
      }
    });
    return db;
  }

  async function createRecord(coleccion, record) {
    await request(baseUrl(), {
      method: "POST",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify({ coleccion, id: record.id, data: record }),
    });
  }

  async function updateRecord(coleccion, id, record) {
    const url = `${baseUrl()}?coleccion=eq.${enc(coleccion)}&id=eq.${enc(id)}`;
    await request(url, {
      method: "PATCH",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify({ data: record, actualizado_en: new Date().toISOString() }),
    });
  }

  async function deleteRecord(coleccion, id) {
    const url = `${baseUrl()}?coleccion=eq.${enc(coleccion)}&id=eq.${enc(id)}`;
    await request(url, { method: "DELETE", headers: headers({ Prefer: "return=minimal" }) });
  }

  async function clearCollection(coleccion) {
    const url = `${baseUrl()}?coleccion=eq.${enc(coleccion)}`;
    await request(url, { method: "DELETE", headers: headers({ Prefer: "return=minimal" }) });
  }

  /** Inserta o actualiza la fila de configuración global. */
  async function saveConfiguracion(config) {
    const url = `${baseUrl()}?on_conflict=coleccion,id`;
    await request(url, {
      method: "POST",
      headers: headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({
        coleccion: "configuracion",
        id: "config",
        data: config,
        actualizado_en: new Date().toISOString(),
      }),
    });
  }

  return { getDatabase, createRecord, updateRecord, deleteRecord, clearCollection, saveConfiguracion };
})();
