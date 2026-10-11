/**
 * database.js
 * -----------------------------------------------------------------------
 * Copia en memoria (NO localStorage) de los datos + funciones CRUD que
 * usan todos los módulos. Cada operación se escribe primero en Supabase
 * y, si el servidor confirma, se refleja en pantalla. Como cada registro
 * es una fila independiente, dos usuarios que guardan registros distintos
 * al mismo tiempo ya no se pisan entre sí.
 * -----------------------------------------------------------------------
 */

const Database = (() => {
  let DB = null;
  const listeners = [];
  const COLLECTIONS = ["produccion", "detenciones", "productos", "lineas", "turnos", "codigosSAP", "causas", "metas"];

  function onChange(cb) { listeners.push(cb); }

  function notify() {
    listeners.forEach((cb) => {
      try { cb(DB); } catch (e) { console.error("Error en listener de Database:", e); }
    });
  }

  function ensureShape(remote) {
    const db = remote && typeof remote === "object" ? remote : {};
    COLLECTIONS.forEach((c) => { if (!Array.isArray(db[c])) db[c] = []; });
    const defaults = JSON.parse(JSON.stringify(CONFIG.EMPTY_DATABASE.configuracion));
    db.configuracion = { ...defaults, ...(db.configuracion || {}) };
    return db;
  }

  async function init() {
    DB = ensureShape(await Api.getDatabase());
    notify();
    return DB;
  }

  function generateId(prefix) {
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    const time = Date.now().toString(36).toUpperCase().slice(-4);
    return `${prefix}-${time}${rand}`;
  }

  function getCollection(name) { return DB && DB[name] ? DB[name] : []; }
  function getConfiguracion() { return DB ? DB.configuracion : {}; }
  function getAll() { return DB; }

  async function saveConfiguracion(patch) {
    const nueva = { ...DB.configuracion, ...patch };
    await Api.saveConfiguracion(nueva);
    DB.configuracion = nueva;
    notify();
    return nueva;
  }

  async function createRecord(collection, idPrefix, record) {
    const now = new Date().toISOString();
    const nuevo = { ...record, id: generateId(idPrefix), creadoEn: now, actualizadoEn: now };
    await Api.createRecord(collection, nuevo);
    DB[collection].push(nuevo);
    notify();
    return nuevo;
  }

  async function updateRecord(collection, id, changes) {
    const idx = DB[collection].findIndex((r) => r.id === id);
    if (idx === -1) throw new Error("Registro no encontrado: " + id);
    const actualizado = { ...DB[collection][idx], ...changes, id, actualizadoEn: new Date().toISOString() };
    await Api.updateRecord(collection, id, actualizado);
    DB[collection][idx] = actualizado;
    notify();
    return actualizado;
  }

  /** Siempre debe llamarse tras una confirmación explícita del usuario. */
  async function deleteRecord(collection, id) {
    await Api.deleteRecord(collection, id);
    DB[collection] = DB[collection].filter((r) => r.id !== id);
    notify();
  }

  /** "Limpiar": borra toda una colección. Requiere confirmación previa. */
  async function clearCollection(collection) {
    await Api.clearCollection(collection);
    DB[collection] = [];
    notify();
  }

  /** Refresca desde el servidor los cambios de otras computadoras. */
  async function syncDatabase() {
    DB = ensureShape(await Api.getDatabase());
    notify();
    return DB;
  }

  return {
    init, onChange, getCollection, getConfiguracion, saveConfiguracion,
    createRecord, updateRecord, deleteRecord, clearCollection, syncDatabase, getAll, generateId,
  };
})();
