/**
 * productos.js — Módulo de Gestión de Productos
 */

const Productos = (() => {
  let editandoId = null;

  function render() {
    const lineas = Database.getCollection("lineas");
    const cont = document.getElementById("page-productos");
    cont.innerHTML = `
      <div class="page-header">
        <h2>Productos</h2>
        <button class="btn btn-primary" id="btn-nuevo-producto">+ Nuevo producto</button>
      </div>
      <form id="form-producto" class="card form-grid hidden">
        <h3 id="form-producto-titulo">Nuevo producto</h3>
        <label>Código de producto<input required name="codigo" placeholder="Ej. PRD-1001"></label>
        <label>Nombre del producto<input required name="nombre"></label>
        <label>Peso<input required type="number" step="0.001" min="0" name="peso"></label>
        <label>Unidad
          <select name="unidad">
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="ton">ton</option>
            <option value="L">L</option>
            <option value="unidad">unidad</option>
          </select>
        </label>
        <label>Golpes por minuto<input required type="number" min="0" name="golpesPorMinuto"></label>
        <label>Velocidad estándar (unid/min)<input required type="number" min="0" step="0.01" name="velocidadEstandar"></label>
        <label>Línea compatible
          <select name="lineaId" required></select>
        </label>
        <label>Estado
          <select name="estado"><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select>
        </label>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" id="btn-cancelar-producto">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar</button>
        </div>
      </form>
      <div class="card">
        <div class="table-toolbar">
          <input type="search" id="buscar-producto" placeholder="Buscar producto...">
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr>
              <th>Código</th><th>Nombre</th><th>Peso</th><th>Unidad</th>
              <th>GPM</th><th>Vel. estándar</th><th>Línea</th><th>Estado</th><th>Acciones</th>
            </tr></thead>
            <tbody id="tbody-productos"></tbody>
          </table>
        </div>
      </div>`;

    UI.llenarSelect(cont.querySelector('[name="lineaId"]'), lineas, { placeholder: "Seleccionar línea" });

    cont.querySelector("#btn-nuevo-producto").onclick = () => abrirFormulario();
    cont.querySelector("#btn-cancelar-producto").onclick = () => cerrarFormulario();
    cont.querySelector("#form-producto").onsubmit = guardar;
    cont.querySelector("#buscar-producto").oninput = Utils.debounce(() => renderTabla(), 250);

    renderTabla();
  }

  function abrirFormulario(producto = null) {
    editandoId = producto ? producto.id : null;
    const form = document.getElementById("form-producto");
    form.classList.remove("hidden");
    document.getElementById("form-producto-titulo").textContent = producto ? "Editar producto" : "Nuevo producto";
    form.reset();
    if (producto) {
      Object.entries(producto).forEach(([k, v]) => {
        if (form.elements[k]) form.elements[k].value = v;
      });
    }
  }

  function cerrarFormulario() {
    document.getElementById("form-producto").classList.add("hidden");
    editandoId = null;
  }

  async function guardar(e) {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.codigo || !data.nombre) {
      UI.toast("Complete los campos obligatorios.", "error");
      return;
    }
    if (Number(data.peso) < 0 || Number(data.golpesPorMinuto) < 0 || Number(data.velocidadEstandar) < 0) {
      UI.toast("No se permiten valores negativos.", "error");
      return;
    }
    UI.loading(true);
    try {
      if (editandoId) {
        await Database.updateRecord("productos", editandoId, data);
        UI.toast("Producto actualizado.", "success");
      } else {
        await Database.createRecord("productos", "PRD", data);
        UI.toast("Producto creado.", "success");
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
    const ok = await UI.confirmar({
      mensaje: "¿Eliminar este producto? Esta acción no se puede deshacer.",
    });
    if (!ok) return;
    UI.loading(true);
    try {
      await Database.deleteRecord("productos", id);
      UI.toast("Producto eliminado.", "success");
      renderTabla();
    } catch (err) {
      UI.toast(err.message, "error");
    } finally {
      UI.loading(false);
    }
  }

  async function toggleEstado(producto) {
    const nuevo = producto.estado === "activo" ? "inactivo" : "activo";
    await Database.updateRecord("productos", producto.id, { estado: nuevo });
    UI.toast(`Producto ${nuevo === "activo" ? "activado" : "desactivado"}.`, "success");
    renderTabla();
  }

  function renderTabla() {
    const lineas = Database.getCollection("lineas");
    const lineaById = new Map(lineas.map((l) => [l.id, l.nombre]));
    const filtro = (document.getElementById("buscar-producto")?.value || "").toLowerCase();
    const productos = Database.getCollection("productos").filter(
      (p) => !filtro || p.nombre.toLowerCase().includes(filtro) || p.codigo.toLowerCase().includes(filtro)
    );
    const tbody = document.getElementById("tbody-productos");
    if (!productos.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-row">No hay productos registrados todavía.</td></tr>`;
      return;
    }
    tbody.innerHTML = productos
      .map(
        (p) => `
      <tr>
        <td>${Utils.escapeHtml(p.codigo)}</td>
        <td>${Utils.escapeHtml(p.nombre)}</td>
        <td>${Utils.formatoNumero(p.peso, 3)}</td>
        <td>${Utils.escapeHtml(p.unidad)}</td>
        <td>${Utils.formatoNumero(p.golpesPorMinuto)}</td>
        <td>${Utils.formatoNumero(p.velocidadEstandar, 2)}</td>
        <td>${Utils.escapeHtml(lineaById.get(p.lineaId) || "—")}</td>
        <td><span class="badge ${p.estado === "activo" ? "badge-verde" : "badge-rojo"}">${p.estado}</span></td>
        <td class="acciones">
          <button class="icon-btn" data-editar="${p.id}" title="Editar">✎</button>
          <button class="icon-btn" data-toggle="${p.id}" title="Activar/Desactivar">⇆</button>
          <button class="icon-btn icon-danger" data-eliminar="${p.id}" title="Eliminar">🗑</button>
        </td>
      </tr>`
      )
      .join("");

    tbody.querySelectorAll("[data-editar]").forEach((btn) => {
      btn.onclick = () => abrirFormulario(productos.find((p) => p.id === btn.dataset.editar));
    });
    tbody.querySelectorAll("[data-toggle]").forEach((btn) => {
      btn.onclick = () => toggleEstado(productos.find((p) => p.id === btn.dataset.toggle));
    });
    tbody.querySelectorAll("[data-eliminar]").forEach((btn) => {
      btn.onclick = () => eliminar(btn.dataset.eliminar);
    });
  }

  return { render };
})();
