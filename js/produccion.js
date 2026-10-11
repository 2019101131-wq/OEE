/**
 * produccion.js — Módulo de Registro de Producción
 * -----------------------------------------------------------------------
 * Permite registrar hasta 3 períodos de producción por turno/línea
 * (varios productos), con cálculo automático de tiempo de producción,
 * producción rechazada y producción en toneladas.
 * -----------------------------------------------------------------------
 */

const Produccion = (() => {
  let editandoId = null;
  let pagina = 1;
  const porPagina = 15;

  function render() {
    const cont = document.getElementById("page-produccion");
    cont.innerHTML = `
      <div class="page-header">
        <h2>Registro de Producción</h2>
        <button class="btn btn-primary" id="btn-nueva-produccion">+ Nuevo registro</button>
      </div>
      <form id="form-produccion" class="card form-grid hidden">
        <h3 id="form-produccion-titulo">Nuevo registro de producción</h3>
        <label>Fecha<input required type="date" name="fecha"></label>
        <label>Turno<select required name="turnoId"></select></label>
        <label>Supervisor<input required name="supervisor"></label>
        <label>Maquinista<input required name="maquinista"></label>
        <label>Línea<select required name="lineaId"></select></label>
        <label>Producto<select required name="productoId"></select></label>
        <label>Código de producto<input name="codigoProducto" readonly></label>
        <label>Peso<input name="peso" type="number" step="0.001" readonly></label>
        <label>Hora inicio producción<input required type="time" name="horaInicio"></label>
        <label>Hora fin producción<input required type="time" name="horaFin"></label>
        <label>Golpes por minuto<input required type="number" min="0" name="golpesPorMinuto"></label>
        <label>Velocidad estándar (unid/min)<input required type="number" min="0" step="0.01" name="velocidadEstandar"></label>
        <label>Producción real<input required type="number" min="0" step="0.01" name="produccionReal"></label>
        <label>Producción buena<input required type="number" min="0" step="0.01" name="produccionBuena"></label>
        <label>Producción rechazada<input type="number" min="0" step="0.01" name="produccionRechazada" readonly></label>
        <label>Producción (toneladas)<input type="number" step="0.0001" name="produccionToneladas" readonly></label>
        <label class="span-2">Observaciones<textarea name="observaciones" rows="2"></textarea></label>
        <div class="form-info span-2" id="produccion-info"></div>
        <div class="form-actions span-2">
          <button type="button" class="btn btn-ghost" id="btn-cancelar-produccion">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar registro</button>
        </div>
      </form>
      <div class="card">
        <div class="table-toolbar">
          <input type="date" id="filtro-prod-fecha">
          <select id="filtro-prod-linea"></select>
          <select id="filtro-prod-turno"></select>
          <input type="search" id="filtro-prod-buscar" placeholder="Buscar supervisor, maquinista, producto...">
          <button class="btn btn-ghost" id="btn-exportar-produccion">Exportar CSV</button>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr>
              <th>Fecha</th><th>Turno</th><th>Línea</th><th>Producto</th><th>Inicio</th><th>Fin</th>
              <th>T. producción</th><th>Real</th><th>Buena</th><th>Rechazada</th><th>Ton.</th><th>Acciones</th>
            </tr></thead>
            <tbody id="tbody-produccion"></tbody>
          </table>
        </div>
        <div class="pagination" id="paginacion-produccion"></div>
      </div>`;

    poblarSelects();
    cont.querySelector("#btn-nueva-produccion").onclick = () => abrirFormulario();
    cont.querySelector("#btn-cancelar-produccion").onclick = cerrarFormulario;
    cont.querySelector("#form-produccion").onsubmit = guardar;
    cont.querySelector('[name="productoId"]').onchange = autocompletarProducto;
    ["horaInicio", "horaFin"].forEach((n) =>
      cont.querySelector(`[name="${n}"]`).addEventListener("input", recalcular)
    );
    ["produccionReal", "produccionBuena"].forEach((n) =>
      cont.querySelector(`[name="${n}"]`).addEventListener("input", recalcular)
    );

    cont.querySelector("#filtro-prod-fecha").onchange = () => { pagina = 1; renderTabla(); };
    cont.querySelector("#filtro-prod-linea").onchange = () => { pagina = 1; renderTabla(); };
    cont.querySelector("#filtro-prod-turno").onchange = () => { pagina = 1; renderTabla(); };
    cont.querySelector("#filtro-prod-buscar").oninput = Utils.debounce(() => { pagina = 1; renderTabla(); }, 250);
    cont.querySelector("#btn-exportar-produccion").onclick = exportar;

    renderTabla();
  }

  function poblarSelects() {
    const cont = document.getElementById("page-produccion");
    UI.llenarSelect(cont.querySelector('[name="turnoId"]'), Database.getCollection("turnos"), { placeholder: "Seleccionar turno" });
    UI.llenarSelect(cont.querySelector('[name="lineaId"]'), Database.getCollection("lineas"), { placeholder: "Seleccionar línea" });
    UI.llenarSelect(cont.querySelector('[name="productoId"]'), Database.getCollection("productos"), { placeholder: "Seleccionar producto" });

    UI.llenarSelect(document.getElementById("filtro-prod-linea"), Database.getCollection("lineas"), { placeholder: "Todas las líneas" });
    UI.llenarSelect(document.getElementById("filtro-prod-turno"), Database.getCollection("turnos"), { placeholder: "Todos los turnos" });
  }

  function autocompletarProducto(e) {
    const form = document.getElementById("form-produccion");
    const producto = Database.getCollection("productos").find((p) => p.id === e.target.value);
    if (producto) {
      form.elements.codigoProducto.value = producto.codigo;
      form.elements.peso.value = producto.peso;
      form.elements.golpesPorMinuto.value = producto.golpesPorMinuto;
      form.elements.velocidadEstandar.value = producto.velocidadEstandar;
    }
    recalcular();
  }

  function recalcular() {
    const form = document.getElementById("form-produccion");
    const min = Utils.minutosEntreHoras(form.elements.horaInicio.value, form.elements.horaFin.value);
    const real = Number(form.elements.produccionReal.value) || 0;
    const buena = Number(form.elements.produccionBuena.value) || 0;
    const peso = Number(form.elements.peso.value) || 0;
    const rechazada = Math.max(0, real - buena);
    form.elements.produccionRechazada.value = rechazada.toFixed(2);
    form.elements.produccionToneladas.value = ((real * peso) / 1000).toFixed(4);
    document.getElementById("produccion-info").textContent = min
      ? `Tiempo de producción calculado: ${Utils.minutosATexto(min)}`
      : "";
  }

  function abrirFormulario(item = null) {
    editandoId = item ? item.id : null;
    const form = document.getElementById("form-produccion");
    form.classList.remove("hidden");
    document.getElementById("form-produccion-titulo").textContent = item ? "Editar registro de producción" : "Nuevo registro de producción";
    form.reset();
    if (item) {
      Object.entries(item).forEach(([k, v]) => form.elements[k] && (form.elements[k].value = v));
    }
    recalcular();
  }

  function cerrarFormulario() {
    document.getElementById("form-produccion").classList.add("hidden");
    editandoId = null;
  }

  async function guardar(e) {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());
    const producto = Database.getCollection("productos").find((p) => p.id === data.productoId);
    data.producto = producto ? producto.nombre : "";
    data.tiempoProduccion = Utils.minutosEntreHoras(data.horaInicio, data.horaFin);
    data.mes = Utils.obtenerMesDeFecha(data.fecha);
    data.semana = Utils.obtenerSemanaISO(data.fecha);
    data.produccionRechazada = Math.max(0, Number(data.produccionReal) - Number(data.produccionBuena));
    data.produccionToneladas = (Number(data.produccionReal) * Number(data.peso || 0)) / 1000;

    const errores = Utils.validarProduccion(data);
    if (errores.length) {
      UI.toast(errores[0], "error");
      return;
    }

    UI.loading(true);
    try {
      if (editandoId) {
        await Database.updateRecord("produccion", editandoId, data);
        UI.toast("Registro de producción actualizado.", "success");
      } else {
        await Database.createRecord("produccion", "PROD", data);
        UI.toast("Registro de producción guardado.", "success");
      }
      cerrarFormulario();
      renderTabla();
    } catch (err) {
      UI.toast(err.message, "error");
    } finally {
      UI.loading(false);
    }
  }

  async function eliminar(id) {
    const ok = await UI.confirmar({ mensaje: "¿Eliminar este registro de producción? Esta acción no se puede deshacer." });
    if (!ok) return;
    UI.loading(true);
    try {
      await Database.deleteRecord("produccion", id);
      UI.toast("Registro eliminado.", "success");
      renderTabla();
    } catch (err) {
      UI.toast(err.message, "error");
    } finally {
      UI.loading(false);
    }
  }

  function obtenerFiltrados() {
    const fecha = document.getElementById("filtro-prod-fecha")?.value;
    const lineaId = document.getElementById("filtro-prod-linea")?.value;
    const turnoId = document.getElementById("filtro-prod-turno")?.value;
    const buscar = (document.getElementById("filtro-prod-buscar")?.value || "").toLowerCase();

    return Database.getCollection("produccion")
      .filter((p) => !fecha || p.fecha === fecha)
      .filter((p) => !lineaId || p.lineaId === lineaId)
      .filter((p) => !turnoId || p.turnoId === turnoId)
      .filter(
        (p) =>
          !buscar ||
          (p.supervisor || "").toLowerCase().includes(buscar) ||
          (p.maquinista || "").toLowerCase().includes(buscar) ||
          (p.producto || "").toLowerCase().includes(buscar)
      )
      .sort((a, b) => (b.fecha + b.horaInicio).localeCompare(a.fecha + a.horaInicio));
  }

  function renderTabla() {
    const lineas = new Map(Database.getCollection("lineas").map((l) => [l.id, l.nombre]));
    const turnos = new Map(Database.getCollection("turnos").map((t) => [t.id, t.nombre]));
    const items = obtenerFiltrados();
    const { pageItems, paginaActual, totalPaginas } = UI.paginar(items, pagina, porPagina);
    pagina = paginaActual;

    const tbody = document.getElementById("tbody-produccion");
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="12" class="empty-row">No hay registros de producción para los filtros seleccionados.</td></tr>`;
    } else {
      tbody.innerHTML = pageItems
        .map(
          (p) => `<tr>
          <td>${p.fecha}</td><td>${Utils.escapeHtml(turnos.get(p.turnoId) || "—")}</td>
          <td>${Utils.escapeHtml(lineas.get(p.lineaId) || "—")}</td><td>${Utils.escapeHtml(p.producto)}</td>
          <td>${p.horaInicio}</td><td>${p.horaFin}</td>
          <td>${Utils.minutosATexto(p.tiempoProduccion || 0)}</td>
          <td>${Utils.formatoNumero(p.produccionReal, 1)}</td>
          <td>${Utils.formatoNumero(p.produccionBuena, 1)}</td>
          <td>${Utils.formatoNumero(p.produccionRechazada, 1)}</td>
          <td>${Utils.formatoNumero(p.produccionToneladas, 3)}</td>
          <td class="acciones">
            <button class="icon-btn" data-editar="${p.id}">✎</button>
            <button class="icon-btn icon-danger" data-eliminar="${p.id}">🗑</button>
          </td></tr>`
        )
        .join("");
    }

    tbody.querySelectorAll("[data-editar]").forEach((b) => (b.onclick = () => abrirFormulario(items.find((i) => i.id === b.dataset.editar))));
    tbody.querySelectorAll("[data-eliminar]").forEach((b) => (b.onclick = () => eliminar(b.dataset.eliminar)));

    UI.renderPaginacion(document.getElementById("paginacion-produccion"), paginaActual, totalPaginas, (p) => {
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
      { key: "turnoId", label: "Turno" },
      { key: "lineaId", label: "Línea" },
      { key: "producto", label: "Producto" },
      { key: "horaInicio", label: "Hora inicio" },
      { key: "horaFin", label: "Hora fin" },
      { key: "tiempoProduccion", label: "Tiempo producción (min)" },
      { key: "produccionReal", label: "Producción real" },
      { key: "produccionBuena", label: "Producción buena" },
      { key: "produccionRechazada", label: "Producción rechazada" },
      { key: "produccionToneladas", label: "Toneladas" },
    ]);
    Utils.descargarArchivo(csv, `produccion_${Date.now()}.csv`);
  }

  return { render, poblarSelects, renderTabla };
})();
