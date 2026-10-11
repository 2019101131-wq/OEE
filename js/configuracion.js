/**
 * configuracion.js
 * -----------------------------------------------------------------------
 * Agrupa los módulos de catálogo/configuración: Líneas, Turnos,
 * Códigos SAP, Causas, Metas (vista consolidada) y Configuración
 * general (rangos de semáforo OEE / cumplimiento).
 * -----------------------------------------------------------------------
 */

// ---------------------------------------------------------------------
// LÍNEAS
// ---------------------------------------------------------------------
const Lineas = (() => {
  let editandoId = null;

  function render() {
    const cont = document.getElementById("page-lineas");
    cont.innerHTML = `
      <div class="page-header"><h2>Configuración de Líneas</h2>
        <button class="btn btn-primary" id="btn-nueva-linea">+ Nueva línea</button></div>
      <form id="form-linea" class="card form-grid hidden">
        <h3 id="form-linea-titulo">Nueva línea</h3>
        <label>Código de línea<input required name="codigo" placeholder="L1"></label>
        <label>Nombre<input required name="nombre" placeholder="Línea 1"></label>
        <label>Golpes por minuto estándar<input required type="number" min="0" name="golpesPorMinutoEstandar"></label>
        <label>Meta de eficiencia (%)<input required type="number" min="0" max="100" name="metaEficiencia"></label>
        <label>Meta OEE (%)<input required type="number" min="0" max="100" name="metaOee"></label>
        <label>Tiempo programado (min/turno)<input required type="number" min="0" name="tiempoProgramado"></label>
        <label>Estado<select name="estado"><option value="activa">Activa</option><option value="inactiva">Inactiva</option></select></label>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" id="btn-cancelar-linea">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar</button>
        </div>
      </form>
      <div class="card">
        <div class="table-scroll"><table class="data-table">
          <thead><tr><th>Código</th><th>Nombre</th><th>GPM estándar</th><th>Meta eficiencia</th>
            <th>Meta OEE</th><th>T. programado</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody id="tbody-lineas"></tbody>
        </table></div>
      </div>`;

    cont.querySelector("#btn-nueva-linea").onclick = () => abrir();
    cont.querySelector("#btn-cancelar-linea").onclick = () => cerrar();
    cont.querySelector("#form-linea").onsubmit = guardar;
    renderTabla();
  }

  function abrir(item = null) {
    editandoId = item ? item.id : null;
    const form = document.getElementById("form-linea");
    form.classList.remove("hidden");
    document.getElementById("form-linea-titulo").textContent = item ? "Editar línea" : "Nueva línea";
    form.reset();
    if (item) Object.entries(item).forEach(([k, v]) => form.elements[k] && (form.elements[k].value = v));
  }
  function cerrar() {
    document.getElementById("form-linea").classList.add("hidden");
    editandoId = null;
  }

  async function guardar(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    if (Number(data.metaOee) < 0 || Number(data.metaOee) > 100) {
      UI.toast("La meta OEE debe estar entre 0 y 100%.", "error");
      return;
    }
    UI.loading(true);
    try {
      if (editandoId) await Database.updateRecord("lineas", editandoId, data);
      else await Database.createRecord("lineas", "LIN", data);
      UI.toast("Línea guardada.", "success");
      cerrar();
      renderTabla();
      App.refrescarSelectoresGlobales();
    } catch (err) {
      UI.toast(err.message, "error");
    } finally {
      UI.loading(false);
    }
  }

  async function eliminar(id) {
    const ok = await UI.confirmar({ mensaje: "¿Eliminar esta línea?" });
    if (!ok) return;
    await Database.deleteRecord("lineas", id);
    UI.toast("Línea eliminada.", "success");
    renderTabla();
    App.refrescarSelectoresGlobales();
  }

  function renderTabla() {
    const items = Database.getCollection("lineas");
    const tbody = document.getElementById("tbody-lineas");
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-row">No hay líneas configuradas todavía.</td></tr>`;
      return;
    }
    tbody.innerHTML = items
      .map(
        (l) => `<tr>
        <td>${Utils.escapeHtml(l.codigo)}</td><td>${Utils.escapeHtml(l.nombre)}</td>
        <td>${Utils.formatoNumero(l.golpesPorMinutoEstandar)}</td>
        <td>${Utils.formatoNumero(l.metaEficiencia)}%</td><td>${Utils.formatoNumero(l.metaOee)}%</td>
        <td>${Utils.formatoNumero(l.tiempoProgramado)} min</td>
        <td><span class="badge ${l.estado === "activa" ? "badge-verde" : "badge-rojo"}">${l.estado}</span></td>
        <td class="acciones">
          <button class="icon-btn" data-editar="${l.id}">✎</button>
          <button class="icon-btn icon-danger" data-eliminar="${l.id}">🗑</button>
        </td></tr>`
      )
      .join("");
    tbody.querySelectorAll("[data-editar]").forEach((b) => (b.onclick = () => abrir(items.find((i) => i.id === b.dataset.editar))));
    tbody.querySelectorAll("[data-eliminar]").forEach((b) => (b.onclick = () => eliminar(b.dataset.eliminar)));
  }

  return { render };
})();

// ---------------------------------------------------------------------
// TURNOS
// ---------------------------------------------------------------------
const Turnos = (() => {
  let editandoId = null;

  function render() {
    const cont = document.getElementById("page-turnos");
    cont.innerHTML = `
      <div class="page-header"><h2>Configuración de Turnos</h2>
        <button class="btn btn-primary" id="btn-nuevo-turno">+ Nuevo turno</button></div>
      <form id="form-turno" class="card form-grid hidden">
        <h3 id="form-turno-titulo">Nuevo turno</h3>
        <label>Nombre del turno<input required name="nombre" placeholder="Turno A"></label>
        <label>Hora inicio<input required type="time" name="horaInicio"></label>
        <label>Hora fin<input required type="time" name="horaFin"></label>
        <label>Tiempo de descanso (min)<input required type="number" min="0" name="tiempoDescanso"></label>
        <label>Tiempo neto disponible (min)<input required type="number" min="0" name="tiempoNetoDisponible"></label>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" id="btn-cancelar-turno">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar</button>
        </div>
      </form>
      <div class="card"><div class="table-scroll"><table class="data-table">
        <thead><tr><th>Nombre</th><th>Inicio</th><th>Fin</th><th>Duración</th><th>Descanso</th><th>T. neto disp.</th><th>Acciones</th></tr></thead>
        <tbody id="tbody-turnos"></tbody>
      </table></div></div>`;

    cont.querySelector("#btn-nuevo-turno").onclick = () => abrir();
    cont.querySelector("#btn-cancelar-turno").onclick = () => cerrar();
    cont.querySelector("#form-turno").onsubmit = guardar;
    renderTabla();
  }

  function abrir(item = null) {
    editandoId = item ? item.id : null;
    const form = document.getElementById("form-turno");
    form.classList.remove("hidden");
    document.getElementById("form-turno-titulo").textContent = item ? "Editar turno" : "Nuevo turno";
    form.reset();
    if (item) Object.entries(item).forEach(([k, v]) => form.elements[k] && (form.elements[k].value = v));
  }
  function cerrar() {
    document.getElementById("form-turno").classList.add("hidden");
    editandoId = null;
  }

  async function guardar(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    data.duracionProgramada = Utils.minutosEntreHoras(data.horaInicio, data.horaFin);
    UI.loading(true);
    try {
      if (editandoId) await Database.updateRecord("turnos", editandoId, data);
      else await Database.createRecord("turnos", "TUR", data);
      UI.toast("Turno guardado.", "success");
      cerrar();
      renderTabla();
      App.refrescarSelectoresGlobales();
    } catch (err) {
      UI.toast(err.message, "error");
    } finally {
      UI.loading(false);
    }
  }

  async function eliminar(id) {
    const ok = await UI.confirmar({ mensaje: "¿Eliminar este turno?" });
    if (!ok) return;
    await Database.deleteRecord("turnos", id);
    UI.toast("Turno eliminado.", "success");
    renderTabla();
    App.refrescarSelectoresGlobales();
  }

  function renderTabla() {
    const items = Database.getCollection("turnos");
    const tbody = document.getElementById("tbody-turnos");
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No hay turnos configurados todavía.</td></tr>`;
      return;
    }
    tbody.innerHTML = items
      .map(
        (t) => `<tr>
        <td>${Utils.escapeHtml(t.nombre)}</td><td>${t.horaInicio}</td><td>${t.horaFin}</td>
        <td>${Utils.minutosATexto(t.duracionProgramada || 0)}</td>
        <td>${Utils.formatoNumero(t.tiempoDescanso)} min</td>
        <td>${Utils.formatoNumero(t.tiempoNetoDisponible)} min</td>
        <td class="acciones">
          <button class="icon-btn" data-editar="${t.id}">✎</button>
          <button class="icon-btn icon-danger" data-eliminar="${t.id}">🗑</button>
        </td></tr>`
      )
      .join("");
    tbody.querySelectorAll("[data-editar]").forEach((b) => (b.onclick = () => abrir(items.find((i) => i.id === b.dataset.editar))));
    tbody.querySelectorAll("[data-eliminar]").forEach((b) => (b.onclick = () => eliminar(b.dataset.eliminar)));
  }

  return { render };
})();

// ---------------------------------------------------------------------
// CÓDIGOS SAP
// ---------------------------------------------------------------------
const CodigosSAP = (() => {
  let editandoId = null;

  function render() {
    const cont = document.getElementById("page-sap");
    cont.innerHTML = `
      <div class="page-header"><h2>Catálogo de Códigos SAP</h2>
        <button class="btn btn-primary" id="btn-nuevo-sap">+ Nuevo código</button></div>
      <form id="form-sap" class="card form-grid hidden">
        <h3 id="form-sap-titulo">Nuevo código SAP</h3>
        <label>Código SAP<input required name="codigo" placeholder="Ej. 40015"></label>
        <label>Descripción<input required name="descripcion"></label>
        <label>Tipo de detención<input required name="tipoDetencion" list="lista-tipos-detencion" placeholder="Mecánica, Eléctrica, Calidad..."></label>
        <label>Categoría<input name="categoria" placeholder="Programada / No programada"></label>
        <label>Estado<select name="activo"><option value="true">Activo</option><option value="false">Inactivo</option></select></label>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" id="btn-cancelar-sap">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar</button>
        </div>
      </form>
      <datalist id="lista-tipos-detencion"></datalist>
      <div class="card">
        <div class="table-toolbar"><input type="search" id="buscar-sap" placeholder="Buscar código o descripción..."></div>
        <div class="table-scroll"><table class="data-table">
          <thead><tr><th>Código</th><th>Descripción</th><th>Tipo</th><th>Categoría</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody id="tbody-sap"></tbody>
        </table></div>
      </div>`;

    poblarTiposDatalist();
    cont.querySelector("#btn-nuevo-sap").onclick = () => abrir();
    cont.querySelector("#btn-cancelar-sap").onclick = () => cerrar();
    cont.querySelector("#form-sap").onsubmit = guardar;
    cont.querySelector("#buscar-sap").oninput = Utils.debounce(() => renderTabla(), 250);
    renderTabla();
  }

  function poblarTiposDatalist() {
    const tipos = new Set(Database.getCollection("codigosSAP").map((c) => c.tipoDetencion).filter(Boolean));
    const dl = document.getElementById("lista-tipos-detencion");
    if (dl) dl.innerHTML = Array.from(tipos).map((t) => `<option value="${Utils.escapeHtml(t)}">`).join("");
  }

  function abrir(item = null) {
    editandoId = item ? item.id : null;
    const form = document.getElementById("form-sap");
    form.classList.remove("hidden");
    document.getElementById("form-sap-titulo").textContent = item ? "Editar código SAP" : "Nuevo código SAP";
    form.reset();
    if (item) Object.entries(item).forEach(([k, v]) => form.elements[k] && (form.elements[k].value = v));
  }
  function cerrar() {
    document.getElementById("form-sap").classList.add("hidden");
    editandoId = null;
  }

  async function guardar(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    UI.loading(true);
    try {
      if (editandoId) await Database.updateRecord("codigosSAP", editandoId, data);
      else await Database.createRecord("codigosSAP", "SAP", data);
      UI.toast("Código SAP guardado.", "success");
      cerrar();
      renderTabla();
      poblarTiposDatalist();
    } catch (err) {
      UI.toast(err.message, "error");
    } finally {
      UI.loading(false);
    }
  }

  async function eliminar(id) {
    const ok = await UI.confirmar({ mensaje: "¿Eliminar este código SAP?" });
    if (!ok) return;
    await Database.deleteRecord("codigosSAP", id);
    UI.toast("Código eliminado.", "success");
    renderTabla();
  }

  function renderTabla() {
    const filtro = (document.getElementById("buscar-sap")?.value || "").toLowerCase();
    const items = Database.getCollection("codigosSAP").filter(
      (c) => !filtro || c.codigo.toLowerCase().includes(filtro) || (c.descripcion || "").toLowerCase().includes(filtro)
    );
    const tbody = document.getElementById("tbody-sap");
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-row">No hay códigos SAP registrados todavía.</td></tr>`;
      return;
    }
    tbody.innerHTML = items
      .map(
        (c) => `<tr>
        <td>${Utils.escapeHtml(c.codigo)}</td><td>${Utils.escapeHtml(c.descripcion)}</td>
        <td>${Utils.escapeHtml(c.tipoDetencion)}</td><td>${Utils.escapeHtml(c.categoria || "—")}</td>
        <td><span class="badge ${c.activo === "true" || c.activo === true ? "badge-verde" : "badge-rojo"}">${c.activo === "true" || c.activo === true ? "Activo" : "Inactivo"}</span></td>
        <td class="acciones">
          <button class="icon-btn" data-editar="${c.id}">✎</button>
          <button class="icon-btn icon-danger" data-eliminar="${c.id}">🗑</button>
        </td></tr>`
      )
      .join("");
    tbody.querySelectorAll("[data-editar]").forEach((b) => (b.onclick = () => abrir(items.find((i) => i.id === b.dataset.editar))));
    tbody.querySelectorAll("[data-eliminar]").forEach((b) => (b.onclick = () => eliminar(b.dataset.eliminar)));
  }

  return { render };
})();

// ---------------------------------------------------------------------
// CAUSAS
// ---------------------------------------------------------------------
const Causas = (() => {
  let editandoId = null;

  function render() {
    const cont = document.getElementById("page-causas");
    cont.innerHTML = `
      <div class="page-header"><h2>Catálogo de Causas</h2>
        <button class="btn btn-primary" id="btn-nueva-causa">+ Nueva causa</button></div>
      <form id="form-causa" class="card form-grid hidden">
        <h3 id="form-causa-titulo">Nueva causa</h3>
        <label>Tipo de detención<input required name="tipoDetencion" list="lista-tipos-detencion-causas"></label>
        <label>Causa<input required name="causa"></label>
        <label>Descripción<input name="descripcion"></label>
        <label>Estado<select name="estado"><option value="activa">Activa</option><option value="inactiva">Inactiva</option></select></label>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" id="btn-cancelar-causa">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar</button>
        </div>
      </form>
      <datalist id="lista-tipos-detencion-causas"></datalist>
      <div class="card">
        <div class="table-toolbar">
          <select id="filtro-tipo-causa"><option value="">Todos los tipos</option></select>
        </div>
        <div class="table-scroll"><table class="data-table">
          <thead><tr><th>Tipo</th><th>Causa</th><th>Descripción</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody id="tbody-causas"></tbody>
        </table></div>
      </div>`;

    poblarTipos();
    cont.querySelector("#btn-nueva-causa").onclick = () => abrir();
    cont.querySelector("#btn-cancelar-causa").onclick = () => cerrar();
    cont.querySelector("#form-causa").onsubmit = guardar;
    cont.querySelector("#filtro-tipo-causa").onchange = () => renderTabla();
    renderTabla();
  }

  function poblarTipos() {
    const tiposSAP = Database.getCollection("codigosSAP").map((c) => c.tipoDetencion);
    const tiposCausas = Database.getCollection("causas").map((c) => c.tipoDetencion);
    const tipos = Array.from(new Set([...tiposSAP, ...tiposCausas].filter(Boolean)));
    const dl = document.getElementById("lista-tipos-detencion-causas");
    if (dl) dl.innerHTML = tipos.map((t) => `<option value="${Utils.escapeHtml(t)}">`).join("");
    UI.llenarSelect(document.getElementById("filtro-tipo-causa"), tipos.map((t) => ({ id: t, nombre: t })), { placeholder: "Todos los tipos" });
  }

  function abrir(item = null) {
    editandoId = item ? item.id : null;
    const form = document.getElementById("form-causa");
    form.classList.remove("hidden");
    document.getElementById("form-causa-titulo").textContent = item ? "Editar causa" : "Nueva causa";
    form.reset();
    if (item) Object.entries(item).forEach(([k, v]) => form.elements[k] && (form.elements[k].value = v));
  }
  function cerrar() {
    document.getElementById("form-causa").classList.add("hidden");
    editandoId = null;
  }

  async function guardar(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    UI.loading(true);
    try {
      if (editandoId) await Database.updateRecord("causas", editandoId, data);
      else await Database.createRecord("causas", "CAU", data);
      UI.toast("Causa guardada.", "success");
      cerrar();
      poblarTipos();
      renderTabla();
    } catch (err) {
      UI.toast(err.message, "error");
    } finally {
      UI.loading(false);
    }
  }

  async function eliminar(id) {
    const ok = await UI.confirmar({ mensaje: "¿Eliminar esta causa?" });
    if (!ok) return;
    await Database.deleteRecord("causas", id);
    UI.toast("Causa eliminada.", "success");
    renderTabla();
  }

  function renderTabla() {
    const tipoFiltro = document.getElementById("filtro-tipo-causa")?.value || "";
    const items = Database.getCollection("causas").filter((c) => !tipoFiltro || c.tipoDetencion === tipoFiltro);
    const tbody = document.getElementById("tbody-causas");
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-row">No hay causas registradas todavía.</td></tr>`;
      return;
    }
    tbody.innerHTML = items
      .map(
        (c) => `<tr>
        <td>${Utils.escapeHtml(c.tipoDetencion)}</td><td>${Utils.escapeHtml(c.causa)}</td>
        <td>${Utils.escapeHtml(c.descripcion || "—")}</td>
        <td><span class="badge ${c.estado === "activa" ? "badge-verde" : "badge-rojo"}">${c.estado}</span></td>
        <td class="acciones">
          <button class="icon-btn" data-editar="${c.id}">✎</button>
          <button class="icon-btn icon-danger" data-eliminar="${c.id}">🗑</button>
        </td></tr>`
      )
      .join("");
    tbody.querySelectorAll("[data-editar]").forEach((b) => (b.onclick = () => abrir(items.find((i) => i.id === b.dataset.editar))));
    tbody.querySelectorAll("[data-eliminar]").forEach((b) => (b.onclick = () => eliminar(b.dataset.eliminar)));
  }

  return { render };
})();

// ---------------------------------------------------------------------
// METAS (vista consolidada por línea + rangos de semáforo)
// ---------------------------------------------------------------------
const Metas = (() => {
  function render() {
    const cont = document.getElementById("page-metas");
    const lineas = Database.getCollection("lineas");
    const cfg = Database.getConfiguracion();
    cont.innerHTML = `
      <div class="page-header"><h2>Metas de Eficiencia</h2></div>
      <div class="card">
        <p class="hint">Las metas de OEE y eficiencia se configuran por línea, desde el módulo <strong>Líneas</strong>. Aquí se muestra la vista consolidada.</p>
        <div class="table-scroll"><table class="data-table">
          <thead><tr><th>Línea</th><th>Meta eficiencia</th><th>Meta OEE</th></tr></thead>
          <tbody>
            ${
              lineas.length
                ? lineas
                    .map(
                      (l) => `<tr><td>${Utils.escapeHtml(l.nombre)}</td><td>${Utils.formatoNumero(l.metaEficiencia)}%</td><td>${Utils.formatoNumero(l.metaOee)}%</td></tr>`
                    )
                    .join("")
                : `<tr><td colspan="3" class="empty-row">No hay líneas configuradas todavía.</td></tr>`
            }
          </tbody>
        </table></div>
      </div>
      <div class="card form-grid" style="margin-top:16px;">
        <h3>Rangos de clasificación (semáforo)</h3>
        <label>OEE — Verde desde (%)<input type="number" id="rango-oee-verde" min="0" max="100" value="${cfg.rangosOEE.verde}"></label>
        <label>OEE — Amarillo desde (%)<input type="number" id="rango-oee-amarillo" min="0" max="100" value="${cfg.rangosOEE.amarillo}"></label>
        <label>Cumplimiento — Verde desde (%)<input type="number" id="rango-cump-verde" min="0" max="100" value="${cfg.rangosCumplimiento.verde}"></label>
        <label>Cumplimiento — Amarillo desde (%)<input type="number" id="rango-cump-amarillo" min="0" max="100" value="${cfg.rangosCumplimiento.amarillo}"></label>
        <div class="form-actions">
          <button class="btn btn-primary" id="btn-guardar-rangos">Guardar rangos</button>
        </div>
      </div>`;

    cont.querySelector("#btn-guardar-rangos").onclick = async () => {
      const patch = {
        rangosOEE: {
          verde: Number(document.getElementById("rango-oee-verde").value),
          amarillo: Number(document.getElementById("rango-oee-amarillo").value),
        },
        rangosCumplimiento: {
          verde: Number(document.getElementById("rango-cump-verde").value),
          amarillo: Number(document.getElementById("rango-cump-amarillo").value),
        },
      };
      UI.loading(true);
      try {
        await Database.saveConfiguracion(patch);
        UI.toast("Rangos guardados.", "success");
      } catch (err) {
        UI.toast(err.message, "error");
      } finally {
        UI.loading(false);
      }
    };
  }

  return { render };
})();

// ---------------------------------------------------------------------
// CONFIGURACIÓN GENERAL
// ---------------------------------------------------------------------
const ConfiguracionGeneral = (() => {
  function render() {
    const cont = document.getElementById("page-configuracion");
    cont.innerHTML = `
      <div class="page-header"><h2>Configuración</h2></div>
      <div class="card">
        <h3>Conexión a la base de datos (Supabase)</h3>
        <p class="hint">La URL y la clave anon se configuran en <code>js/config.js</code>. Por tratarse de una aplicación 100% del lado del cliente publicada en GitHub Pages, la clave <strong>es visible para cualquiera</strong>; la protección real depende de las políticas RLS de Supabase (con las políticas por defecto el acceso es abierto). Nunca use la clave service_role.</p>
        <div class="conn-status" id="conn-status">Verificando conexión…</div>
        <button class="btn btn-secondary" id="btn-test-conn">Probar conexión</button>
      </div>
      <div class="card" style="margin-top:16px;">
        <h3>Acerca del sistema</h3>
        <p class="hint">Sistema de gestión OEE — 4 líneas de envasado. Construido con HTML, CSS y JavaScript puro, sin frameworks. Los datos se almacenan de forma centralizada en Supabase y se sincronizan automáticamente entre dispositivos cada ${CONFIG.SYNC_INTERVAL_MS / 1000} segundos.</p>
        <p class="hint">Arquitectura preparada para migrar en el futuro a un backend propio (Supabase, Firebase o API serverless) sin modificar la lógica de negocio, gracias a la separación entre <code>api.js</code> y el resto de los módulos.</p>
      </div>`;

    document.getElementById("btn-test-conn").onclick = probarConexion;
    probarConexion();
  }

  async function probarConexion() {
    const el = document.getElementById("conn-status");
    el.textContent = "Verificando conexión…";
    el.className = "conn-status";
    try {
      await Api.getDatabase();
      el.textContent = "✓ Conexión con Supabase correcta.";
      el.className = "conn-status conn-ok";
    } catch (err) {
      el.textContent = "✗ No fue posible conectar con Supabase: " + err.message;
      el.className = "conn-status conn-error";
    }
  }

  return { render };
})();
