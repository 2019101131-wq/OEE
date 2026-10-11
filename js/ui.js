/**
 * ui.js
 * -----------------------------------------------------------------------
 * Helpers de interfaz compartidos por todos los módulos de página:
 * notificaciones (toast), modal de confirmación antes de eliminar,
 * indicador de carga y utilidades para poblar tablas/selects.
 * -----------------------------------------------------------------------
 */

const UI = (() => {
  function toast(mensaje, tipo = "info") {
    const cont = document.getElementById("toast-container");
    const el = document.createElement("div");
    el.className = `toast toast-${tipo}`;
    el.textContent = mensaje;
    cont.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 300);
    }, 4200);
  }

  function loading(show) {
    document.getElementById("loading-overlay").classList.toggle("visible", show);
  }

  function confirmar({ titulo = "Confirmar acción", mensaje, textoBoton = "Eliminar" }) {
    return new Promise((resolve) => {
      const overlay = document.getElementById("confirm-overlay");
      overlay.innerHTML = `
        <div class="confirm-box">
          <h3>${Utils.escapeHtml(titulo)}</h3>
          <p>${Utils.escapeHtml(mensaje)}</p>
          <div class="confirm-actions">
            <button class="btn btn-ghost" data-action="cancel">Cancelar</button>
            <button class="btn btn-danger" data-action="ok">${Utils.escapeHtml(textoBoton)}</button>
          </div>
        </div>`;
      overlay.classList.add("visible");
      overlay.onclick = (e) => {
        if (e.target === overlay) cerrar(false);
      };
      overlay.querySelector('[data-action="cancel"]').onclick = () => cerrar(false);
      overlay.querySelector('[data-action="ok"]').onclick = () => cerrar(true);
      function cerrar(result) {
        overlay.classList.remove("visible");
        overlay.innerHTML = "";
        resolve(result);
      }
    });
  }

  function llenarSelect(selectEl, opciones, { valueKey = "id", labelKey = "nombre", placeholder = "Todos" } = {}) {
    const valorActual = selectEl.value;
    selectEl.innerHTML = "";
    if (placeholder !== null) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = placeholder;
      selectEl.appendChild(opt);
    }
    opciones.forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o[valueKey];
      opt.textContent = o[labelKey];
      selectEl.appendChild(opt);
    });
    if ([...selectEl.options].some((o) => o.value === valorActual)) {
      selectEl.value = valorActual;
    }
  }

  function badgeEstado(pct, rangos) {
    let clase = "badge-rojo", texto = "Crítico";
    if (pct >= rangos.verde) { clase = "badge-verde"; texto = "Meta alcanzada"; }
    else if (pct >= rangos.amarillo) { clase = "badge-amarillo"; texto = "Cercano a meta"; }
    return `<span class="badge ${clase}">${texto}</span>`;
  }

  function paginar(items, pagina, porPagina) {
    const total = items.length;
    const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
    const p = Math.min(Math.max(1, pagina), totalPaginas);
    const inicio = (p - 1) * porPagina;
    return {
      pageItems: items.slice(inicio, inicio + porPagina),
      paginaActual: p,
      totalPaginas,
      total,
    };
  }

  function renderPaginacion(container, paginaActual, totalPaginas, onChange) {
    container.innerHTML = "";
    if (totalPaginas <= 1) return;
    const mkBtn = (label, page, disabled = false, active = false) => {
      const b = document.createElement("button");
      b.className = "page-btn" + (active ? " active" : "");
      b.textContent = label;
      b.disabled = disabled;
      b.onclick = () => onChange(page);
      return b;
    };
    container.appendChild(mkBtn("‹", paginaActual - 1, paginaActual === 1));
    for (let i = 1; i <= totalPaginas; i++) {
      if (totalPaginas > 7 && Math.abs(i - paginaActual) > 2 && i !== 1 && i !== totalPaginas) {
        if (i === 2 || i === totalPaginas - 1) {
          const span = document.createElement("span");
          span.textContent = "…";
          span.className = "page-ellipsis";
          container.appendChild(span);
        }
        continue;
      }
      container.appendChild(mkBtn(String(i), i, false, i === paginaActual));
    }
    container.appendChild(mkBtn("›", paginaActual + 1, paginaActual === totalPaginas));
  }

  return { toast, loading, confirmar, llenarSelect, badgeEstado, paginar, renderPaginacion };
})();
