/**
 * detenciones.js — Módulo de Registro de Detenciones
 * -----------------------------------------------------------------------
 * Calcula automáticamente el total de minutos (considerando cruce de
 * medianoche), autocompleta descripción y tipo a partir del código SAP,
 * y sugiere causas ya existentes asociadas al tipo de detención.
 * -----------------------------------------------------------------------
 */

const Detenciones = (() => {
  let editandoId = null;
  let pagina = 1;
  const porPagina = 15;

  function render() {
    const cont = document.getElementById("page-detenciones");
    cont.innerHTML = `
      <div class="page-header">
        <h2>Registro de Detenciones</h2>
        <button class="btn btn-primary" id="btn-nueva-detencion">+ Nueva detención</button>
      </div>
      <form id="form-detencion" class="card form-grid hidden">
        <h3 id="form-detencion-titulo">Nueva detención</h3>
        <label>Fecha<input required type="date" name="fecha"></label>
        <label>Turno<select required name="turnoId"></select></label>
        <label>Supervisor<input required name="supervisor"></label>
        <label>Maquinista<input required name="maquinista"></label>
        <label>Línea<select required name="lineaId"></select></label>
        <label>Hora inicio detención<input required type="time" name="horaInicio"></label>
        <label>Hora fin detención<input required type="time" name="horaFin"></label>
        <label>Total minutos<input name="totalMinutos" readonly></label>
        <label>Código SAP<select name="codigoSAP"></select></label>
        <label>Tipo de detención<input required name="tipoDetencion" list="lista-tipos-detencion-reg"></label>
        <label>Descripción<input name="descripcion"></label>
        <label>Causa de detención<input required name="causaDetencion" list="lista-causas-sugeridas"></label>
        <label>Producto afectado<select name="productoId"></select></label>
        <label class="span-2">Observaciones<textarea name="observaciones" rows="2"></textarea></label>
        <div class="form-actions span-2">
          <button type="button" class="btn btn-ghost" id="btn-cancelar-detencion">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar detención</button>
        </div>
      </form>
      <datalist id="lista-tipos-detencion-reg"></datalist>
      <datalist id="lista-causas-sugeridas"></datalist>
      <div class="card">
        <div class="table-toolbar">
          <input type="date" id="filtro-det-fecha">
          <select id="filtro-det-linea"></select>
          <select id="filtro-det-tipo"></select>
          <input type="search" id="filtro-det-buscar" placeholder="Buscar causa, SAP, supervisor...">
          <button class="btn btn-ghost" id="btn-exportar-detenciones">Exportar CSV</button>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr>
              <th>Fecha</th><th>Línea</th><th>Turno</th><th>Inicio</th><th>Fin</th><th>Min.</th>
              <th>SAP</th><th>Tipo</th><th>Causa</th><th>Acciones</th>
            </tr></thead>
            <tbody id="tbody-detenciones"></tbody>
          </table>
        </div>
        <div class="pagination" id="paginacion-detenciones"></div>
      </div>`;

    poblarSelects();
    cont.querySelector("#btn-nueva-detencion").onclick = () => abrirFormulario();
    cont.querySelector("#btn-cancelar-detencion").onclick = cerrarFormulario;
    cont.querySelector("#form-detencion").onsubmit = guardar;
    cont.querySelector('[name="codigoSAP"]').onchange = autocompletarSAP;
    cont.querySelector('[name="tipoDetencion"]').addEventListener("input", actualizarCausasSugeridas);
    ["horaInicio", "horaFin"].forEach((n) =>
      cont.querySelector(`[name="${n}"]`).addEventListener("input", recalcularMinutos)
    );

    cont.querySelector("#filtro-det-fecha").onchange = () => { pagina = 1; renderTabla(); };
    cont.querySelector("#filtro-det-linea").onchange = () => { pagina = 1; renderTabla(); };
    cont.querySelector("#filtro-det-tipo").onchange = () => { pagina = 1; renderTabla(); };
    cont.querySelector("#filtro-det-buscar").oninput = Utils.debounce(() => { pagina = 1; renderTabla(); }, 250);
    cont.querySelector("#btn-exportar-detenciones").onclick = exportar;

    renderTabla();
  }

  function poblarSelects() {
    const cont = document.getElementById("page-detenciones");
    UI.llenarSelect(cont.querySelector('[name="turnoId"]'), Database.getCollection("turnos"), { placeholder: "Seleccionar turno" });
    UI.llenarSelect(cont.querySelector('[name="lineaId"]'), Database.getCollection("lineas"), { placeholder: "Seleccionar línea" });
    UI.llenarSelect(cont.querySelector('[name="productoId"]'), Database.getCollection("productos"), { placeholder: "No aplica" });
    UI.llenarSelect(
      cont.querySelector('[name="codigoSAP"]'),
      Database.getCollection("codigosSAP").map((c) => ({ id: c.codigo, nombre: `${c.codigo} - ${c.descripcion}` })),
      { placeholder: "Seleccionar código SAP" }
    );

    const tipos = new Set(Database.getCollection("codigosSAP").map((c) => c.tipoDetencion).filter(Boolean));
    document.getElementById("lista-tipos-detencion-reg").innerHTML = Array.from(tipos)
      .map((t) => `<option value="${Utils.escapeHtml(t)}">`)
      .join("");

    UI.llenarSelect(document.getElementById("filtro-det-linea"), Database.getCollection("lineas"), { placeholder: "Todas las líneas" });
    UI.llenarSelect(document.getElementById("filtro-det-tipo"), Array.from(tipos).map((t) => ({ id: t, nombre: t })), { placeholder: "Todos los tipos" });
  }

  function autocompletarSAP(e) {
    const form = document.getElementById("form-detencion");
    const sap = Database.getCollection("codigosSAP").find((c) => c.codigo === e.target.value);
    if (sap) {
      form.elements.descripcion.value = sap.descripcion;
      form.elements.tipoDetencion.value = sap.tipoDetencion;
      actualizarCausasSugeridas();
    }
  }

  function actualizarCausasSugeridas() {
    const form = document.getElementById("form-detencion");
    const tipo = form.elements.tipoDetencion.value;
    // Causas del catálogo + causas ya usadas dinámicamente en registros existentes
    const delCatalogo = Database.getCollection("causas")
      .filter((c) => c.tipoDetencion === tipo && c.estado === "activa")
      .map((c) => c.causa);
    const delHistorico = Pareto.causasPorTipo(Database.getCollection("detenciones"), tipo);
    const todas = Array.from(new Set([...delCatalogo, ...delHistorico]));
    document.getElementById("lista-causas-sugeridas").innerHTML = todas
      .map((c) => `<option value="${Utils.escapeHtml(c)}">`)
      .join("");
  }

  function recalcularMinutos() {
    const form = document.getElementById("form-detencion");
    const min = Utils.minutosEntreHoras(form.elements.horaInicio.value, form.elements.horaFin.value);
    form.elements.totalMinutos.value = min ? `${min} min (${Utils.minutosATexto(min)})` : "";
  }

  function abrirFormulario(item = null) {
    editandoId = item ? item.id : null;
    const form = document.getElementById("form-detencion");
    form.classList.remove("hidden");
    document.getElementById("form-detencion-titulo").textContent = item ? "Editar detención" : "Nueva detención";
    form.reset();
    if (item) {
      Object.entries(item).forEach(([k, v]) => form.elements[k] && (form.elements[k].value = v));
    }
    recalcularMinutos();
    actualizarCausasSugeridas();
  }

  function cerrarFormulario() {
    document.getElementById("form-detencion").classList.add("hidden");
    editandoId = null;
  }

  async function guardar(e) {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());
    data.totalMinutos = Utils.minutosEntreHoras(data.horaInicio, data.horaFin);
    data.mes = Utils.obtenerMesDeFecha(data.fecha);
    data.semana = Utils.obtenerSemanaISO(data.fecha);

    const errores = Utils.validarDetencion(data);
    if (errores.length) {
      UI.toast(errores[0], "error");
      return;
    }
    if (!data.codigoSAP) {
      UI.toast("Advertencia: la detención se guardará sin código SAP.", "info");
    }

    UI.loading(true);
    try {
      if (editandoId) {
        await Database.updateRecord("detenciones", editandoId, data);
        UI.toast("Detención actualizada.", "success");
      } else {
        await Database.createRecord("detenciones", "DET", data);
        UI.toast("Detención guardada.", "success");
      }
      cerrarFormulario();
      poblarSelects();
      renderTabla();
    } catch (err) {
      UI.toast(err.message, "error");
    } finally {
      UI.loading(false);
    }
  }

  async function eliminar(id) {
    const ok = await UI.confirmar({ mensaje: "¿Eliminar esta detención? Esta acción no se puede deshacer." });
    if (!ok) return;
    UI.loading(true);
    try {
      await Database.deleteRecord("detenciones", id);
      UI.toast("Detención eliminada.", "success");
      renderTabla();
    } catch (err) {
      UI.toast(err.message, "error");
    } finally {
      UI.loading(false);
    }
  }

  function obtenerFiltrados() {
    const fecha = document.getElementById("filtro-det-fecha")?.value;
    const lineaId = document.getElementById("filtro-det-linea")?.value;
    const tipo = document.getElementById("filtro-det-tipo")?.value;
    const buscar = (document.getElementById("filtro-det-buscar")?.value || "").toLowerCase();

    return Database.getCollection("detenciones")
      .filter((d) => !fecha || d.fecha === fecha)
      .filter((d) => !lineaId || d.lineaId === lineaId)
      .filter((d) => !tipo || d.tipoDetencion === tipo)
      .filter(
        (d) =>
          !buscar ||
          (d.causaDetencion || "").toLowerCase().includes(buscar) ||
          (d.codigoSAP || "").toLowerCase().includes(buscar) ||
          (d.supervisor || "").toLowerCase().includes(buscar)
      )
      .sort((a, b) => (b.fecha + b.horaInicio).localeCompare(a.fecha + a.horaInicio));
  }

  function renderTabla() {
    const lineas = new Map(Database.getCollection("lineas").map((l) => [l.id, l.nombre]));
    const turnos = new Map(Database.getCollection("turnos").map((t) => [t.id, t.nombre]));
    const items = obtenerFiltrados();
    const { pageItems, paginaActual, totalPaginas } = UI.paginar(items, pagina, porPagina);
    pagina = paginaActual;

    const tbody = document.getElementById("tbody-detenciones");
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="10" class="empty-row">No hay detenciones registradas para los filtros seleccionados.</td></tr>`;
    } else {
      tbody.innerHTML = pageItems
        .map(
          (d) => `<tr>
          <td>${d.fecha}</td><td>${Utils.escapeHtml(lineas.get(d.lineaId) || "—")}</td>
          <td>${Utils.escapeHtml(turnos.get(d.turnoId) || "—")}</td>
          <td>${d.horaInicio}</td><td>${d.horaFin}</td><td>${Utils.formatoNumero(d.totalMinutos)}</td>
          <td>${d.codigoSAP ? Utils.escapeHtml(d.codigoSAP) : '<span class="badge badge-amarillo">Sin SAP</span>'}</td>
          <td>${Utils.escapeHtml(d.tipoDetencion)}</td><td>${Utils.escapeHtml(d.causaDetencion)}</td>
          <td class="acciones">
            <button class="icon-btn" data-editar="${d.id}">✎</button>
            <button class="icon-btn icon-danger" data-eliminar="${d.id}">🗑</button>
          </td></tr>`
        )
        .join("");
    }

    tbody.querySelectorAll("[data-editar]").forEach((b) => (b.onclick = () => abrirFormulario(items.find((i) => i.id === b.dataset.editar))));
    tbody.querySelectorAll("[data-eliminar]").forEach((b) => (b.onclick = () => eliminar(b.dataset.eliminar)));

    UI.renderPaginacion(document.getElementById("paginacion-detenciones"), paginaActual, totalPaginas, (p) => {
      pagina = p;
      renderTabla();
    });
  }

  function exportar() {
    const items = obtenerFiltrados();
    if (!items.length) {
      UI.toast("No hay datos para exportar.", "error");
      return;
    }
    const csv = Utils.toCsv(items, [
      { key: "fecha", label: "Fecha" },
      { key: "lineaId", label: "Línea" },
      { key: "turnoId", label: "Turno" },
      { key: "horaInicio", label: "Hora inicio" },
      { key: "horaFin", label: "Hora fin" },
      { key: "totalMinutos", label: "Minutos" },
      { key: "codigoSAP", label: "Código SAP" },
      { key: "tipoDetencion", label: "Tipo" },
      { key: "causaDetencion", label: "Causa" },
    ]);
    Utils.descargarArchivo(csv, `detenciones_${Date.now()}.csv`);
  }

  return { render, poblarSelects, renderTabla };
})();
