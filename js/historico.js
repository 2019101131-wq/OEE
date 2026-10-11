/**
 * historico.js — Tabla Histórica (todas las colecciones)
 * -----------------------------------------------------------------------
 * Vista genérica de consulta/edición/eliminación/exportación para todas
 * las colecciones del sistema, organizada en pestañas.
 * -----------------------------------------------------------------------
 */

const Historico = (() => {
  const TABS = [
    { key: "produccion", label: "Producción", idPrefix: "PROD",
      columnas: [
        { key: "fecha", label: "Fecha" }, { key: "turnoId", label: "Turno" }, { key: "lineaId", label: "Línea" },
        { key: "producto", label: "Producto" }, { key: "horaInicio", label: "Inicio" }, { key: "horaFin", label: "Fin" },
        { key: "produccionReal", label: "Real" }, { key: "produccionBuena", label: "Buena" },
      ] },
    { key: "detenciones", label: "Detenciones", idPrefix: "DET",
      columnas: [
        { key: "fecha", label: "Fecha" }, { key: "lineaId", label: "Línea" }, { key: "horaInicio", label: "Inicio" },
        { key: "horaFin", label: "Fin" }, { key: "totalMinutos", label: "Min." }, { key: "tipoDetencion", label: "Tipo" },
        { key: "causaDetencion", label: "Causa" },
      ] },
    { key: "productos", label: "Productos", idPrefix: "PRD",
      columnas: [
        { key: "codigo", label: "Código" }, { key: "nombre", label: "Nombre" }, { key: "peso", label: "Peso" },
        { key: "unidad", label: "Unidad" }, { key: "estado", label: "Estado" },
      ] },
    { key: "lineas", label: "Líneas", idPrefix: "LIN",
      columnas: [
        { key: "codigo", label: "Código" }, { key: "nombre", label: "Nombre" },
        { key: "metaOee", label: "Meta OEE" }, { key: "estado", label: "Estado" },
      ] },
    { key: "codigosSAP", label: "Códigos SAP", idPrefix: "SAP",
      columnas: [
        { key: "codigo", label: "Código" }, { key: "descripcion", label: "Descripción" },
        { key: "tipoDetencion", label: "Tipo" }, { key: "activo", label: "Activo" },
      ] },
    { key: "causas", label: "Causas", idPrefix: "CAU",
      columnas: [
        { key: "tipoDetencion", label: "Tipo" }, { key: "causa", label: "Causa" }, { key: "estado", label: "Estado" },
      ] },
  ];

  let tabActiva = "produccion";
  let busqueda = "";
  let ordenColumna = null;
  let ordenAsc = true;
  let pagina = 1;
  const porPagina = 20;

  function render() {
    const cont = document.getElementById("page-historico");
    cont.innerHTML = `
      <div class="page-header"><h2>Histórico</h2></div>
      <div class="tabs" id="historico-tabs">
        ${TABS.map((t) => `<button class="tab-btn ${t.key === tabActiva ? "active" : ""}" data-tab="${t.key}">${t.label}</button>`).join("")}
      </div>
      <div class="card">
        <div class="table-toolbar">
          <input type="search" id="hist-buscar" placeholder="Buscar en todas las columnas...">
          <button class="btn btn-ghost" id="hist-exportar">Exportar CSV</button>
          <button class="btn btn-danger-outline" id="hist-limpiar">Limpiar colección</button>
        </div>
        <div class="table-scroll"><table class="data-table"><thead id="hist-thead"></thead><tbody id="hist-tbody"></tbody></table></div>
        <div class="pagination" id="hist-paginacion"></div>
      </div>
      <div id="hist-modal-editar" class="modal-overlay hidden"></div>`;

    cont.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.onclick = () => {
        tabActiva = btn.dataset.tab;
        busqueda = "";
        ordenColumna = null;
        pagina = 1;
        render();
      };
    });
    document.getElementById("hist-buscar").oninput = Utils.debounce((e) => {
      busqueda = e.target.value.toLowerCase();
      pagina = 1;
      renderTabla();
    }, 250);
    document.getElementById("hist-exportar").onclick = exportar;
    document.getElementById("hist-limpiar").onclick = limpiarColeccion;

    renderTabla();
  }

  function tabActual() {
    return TABS.find((t) => t.key === tabActiva);
  }

  function obtenerFiltrados() {
    const tab = tabActual();
    let items = Database.getCollection(tab.key);
    if (busqueda) {
      items = items.filter((item) =>
        tab.columnas.some((c) => String(item[c.key] ?? "").toLowerCase().includes(busqueda))
      );
    }
    if (ordenColumna) {
      items = [...items].sort((a, b) => {
        const va = a[ordenColumna] ?? "";
        const vb = b[ordenColumna] ?? "";
        const cmp = String(va).localeCompare(String(vb), "es", { numeric: true });
        return ordenAsc ? cmp : -cmp;
      });
    } else {
      items = [...items].sort((a, b) => (b.actualizadoEn || "").localeCompare(a.actualizadoEn || ""));
    }
    return items;
  }

  function renderTabla() {
    const tab = tabActual();
    const items = obtenerFiltrados();
    const { pageItems, paginaActual, totalPaginas } = UI.paginar(items, pagina, porPagina);
    pagina = paginaActual;

    document.getElementById("hist-thead").innerHTML = `<tr>
      ${tab.columnas.map((c) => `<th class="sortable" data-col="${c.key}">${c.label} ${ordenColumna === c.key ? (ordenAsc ? "▲" : "▼") : ""}</th>`).join("")}
      <th>Acciones</th></tr>`;

    document.getElementById("hist-thead").querySelectorAll("[data-col]").forEach((th) => {
      th.onclick = () => {
        if (ordenColumna === th.dataset.col) ordenAsc = !ordenAsc;
        else { ordenColumna = th.dataset.col; ordenAsc = true; }
        renderTabla();
      };
    });

    const tbody = document.getElementById("hist-tbody");
    if (!pageItems.length) {
      tbody.innerHTML = `<tr><td colspan="${tab.columnas.length + 1}" class="empty-row">No hay registros todavía.</td></tr>`;
    } else {
      tbody.innerHTML = pageItems
        .map(
          (item) => `<tr>
          ${tab.columnas.map((c) => `<td>${Utils.escapeHtml(item[c.key] ?? "—")}</td>`).join("")}
          <td class="acciones">
            <button class="icon-btn" data-editar="${item.id}">✎</button>
            <button class="icon-btn icon-danger" data-eliminar="${item.id}">🗑</button>
          </td></tr>`
        )
        .join("");
    }

    tbody.querySelectorAll("[data-editar]").forEach((b) => (b.onclick = () => abrirEdicion(items.find((i) => i.id === b.dataset.editar))));
    tbody.querySelectorAll("[data-eliminar]").forEach((b) => (b.onclick = () => eliminar(b.dataset.eliminar)));

    UI.renderPaginacion(document.getElementById("hist-paginacion"), paginaActual, totalPaginas, (p) => {
      pagina = p;
      renderTabla();
    });
  }

  function abrirEdicion(item) {
    const tab = tabActual();
    const modal = document.getElementById("hist-modal-editar");
    const camposEditables = Object.keys(item).filter((k) => !["id", "creadoEn", "actualizadoEn"].includes(k));
    modal.innerHTML = `
      <div class="modal-box">
        <h3>Editar registro ${Utils.escapeHtml(item.id)}</h3>
        <form id="hist-form-editar" class="form-grid">
          ${camposEditables
            .map(
              (k) => `<label>${Utils.escapeHtml(k)}<input name="${k}" value="${Utils.escapeHtml(item[k])}"></label>`
            )
            .join("")}
          <div class="form-actions span-2">
            <button type="button" class="btn btn-ghost" id="hist-cancelar-edicion">Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar cambios</button>
          </div>
        </form>
      </div>`;
    modal.classList.remove("hidden");
    modal.onclick = (e) => { if (e.target === modal) modal.classList.add("hidden"); };
    document.getElementById("hist-cancelar-edicion").onclick = () => modal.classList.add("hidden");
    document.getElementById("hist-form-editar").onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      UI.loading(true);
      try {
        await Database.updateRecord(tab.key, item.id, data);
        UI.toast("Registro actualizado.", "success");
        modal.classList.add("hidden");
        renderTabla();
      } catch (err) {
        UI.toast(err.message, "error");
      } finally {
        UI.loading(false);
      }
    };
  }

  async function eliminar(id) {
    const ok = await UI.confirmar({ mensaje: "¿Eliminar este registro? Esta acción no se puede deshacer." });
    if (!ok) return;
    UI.loading(true);
    try {
      await Database.deleteRecord(tabActual().key, id);
      UI.toast("Registro eliminado.", "success");
      renderTabla();
    } catch (err) {
      UI.toast(err.message, "error");
    } finally {
      UI.loading(false);
    }
  }

  async function limpiarColeccion() {
    const tab = tabActual();
    const ok = await UI.confirmar({
      titulo: "Limpiar colección completa",
      mensaje: `Esto eliminará TODOS los registros de "${tab.label}" de forma permanente. ¿Desea continuar?`,
      textoBoton: "Limpiar todo",
    });
    if (!ok) return;
    UI.loading(true);
    try {
      await Database.clearCollection(tab.key);
      UI.toast(`Colección "${tab.label}" limpiada.`, "success");
      renderTabla();
    } catch (err) {
      UI.toast(err.message, "error");
    } finally {
      UI.loading(false);
    }
  }

  function exportar() {
    const tab = tabActual();
    const items = obtenerFiltrados();
    if (!items.length) {
      UI.toast("No hay datos para exportar.", "error");
      return;
    }
    const csv = Utils.toCsv(items, tab.columnas);
    Utils.descargarArchivo(csv, `${tab.key}_${Date.now()}.csv`);
  }

  return { render };
})();
