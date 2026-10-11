/**
 * reports.js — Módulo de Reportes
 */

const Reportes = (() => {
  function render() {
    const cont = document.getElementById("page-reportes");
    cont.innerHTML = `
      <div class="page-header"><h2>Reportes</h2></div>
      <div class="card filters-bar">
        <label>Desde<input type="date" id="rep-desde"></label>
        <label>Hasta<input type="date" id="rep-hasta"></label>
        <label>Línea<select id="rep-linea"></select></label>
        <label>Turno<select id="rep-turno"></select></label>
        <button class="btn btn-primary" id="rep-generar">Generar reporte</button>
        <button class="btn btn-ghost hidden" id="rep-imprimir">Imprimir / Guardar PDF</button>
      </div>
      <div id="rep-resultado"></div>`;

    UI.llenarSelect(document.getElementById("rep-linea"), Database.getCollection("lineas"), { placeholder: "Todas las líneas" });
    UI.llenarSelect(document.getElementById("rep-turno"), Database.getCollection("turnos"), { placeholder: "Todos los turnos" });
    document.getElementById("rep-generar").onclick = generar;
    document.getElementById("rep-imprimir").onclick = () => window.print();
  }

  function generar() {
    const desde = document.getElementById("rep-desde").value;
    const hasta = document.getElementById("rep-hasta").value;
    const lineaId = document.getElementById("rep-linea").value;
    const turnoId = document.getElementById("rep-turno").value;

    const lineas = Database.getCollection("lineas");
    const turnos = Database.getCollection("turnos");

    const produccion = Database.getCollection("produccion")
      .filter((p) => (!desde || p.fecha >= desde) && (!hasta || p.fecha <= hasta))
      .filter((p) => !lineaId || p.lineaId === lineaId)
      .filter((p) => !turnoId || p.turnoId === turnoId);
    const detenciones = Database.getCollection("detenciones")
      .filter((d) => (!desde || d.fecha >= desde) && (!hasta || d.fecha <= hasta))
      .filter((d) => !lineaId || d.lineaId === lineaId)
      .filter((d) => !turnoId || d.turnoId === turnoId);

    if (!produccion.length && !detenciones.length) {
      document.getElementById("rep-resultado").innerHTML = `<div class="card"><p class="empty-row">No hay información registrada para el período y filtros seleccionados.</p></div>`;
      document.getElementById("rep-imprimir").classList.add("hidden");
      return;
    }

    const ind = OEE.calcularIndicadoresConsolidados(produccion, detenciones, lineas, turnos);
    const lineasSel = lineaId ? lineas.filter((l) => l.id === lineaId) : lineas;
    const metaOee = lineasSel.length ? lineasSel.reduce((s, l) => s + Number(l.metaOee || 0), 0) / lineasSel.length / 100 : 0;
    const diferencia = ind.oee - metaOee;
    const cfg = Database.getConfiguracion();
    const estadoClase = Utils.claseEstado(ind.oee, cfg.rangosOEE);
    const estadoTexto = estadoClase === "estado-verde" ? "Meta alcanzada" : estadoClase === "estado-amarillo" ? "Cercano a la meta" : "Por debajo de la meta";

    const porTipo = Pareto.porTipo(detenciones).slice(0, 8);
    const porCausa = Pareto.porCausa(detenciones).slice(0, 8);

    document.getElementById("rep-resultado").innerHTML = `
      <div class="card report-sheet">
        <h3>Reporte OEE — ${desde || "Inicio"} a ${hasta || "Hoy"}</h3>
        <p class="hint">Línea: ${lineaId ? Utils.escapeHtml(lineas.find((l) => l.id === lineaId)?.nombre) : "Todas"} · Turno: ${turnoId ? Utils.escapeHtml(turnos.find((t) => t.id === turnoId)?.nombre) : "Todos"}</p>

        <div class="kpi-grid">
          ${kpi("OEE", Utils.formatoPorcentaje(ind.oee), estadoClase)}
          ${kpi("Meta OEE", Utils.formatoPorcentaje(metaOee))}
          ${kpi("Diferencia", (diferencia >= 0 ? "+" : "") + Utils.formatoPorcentaje(diferencia))}
          ${kpi("Estado", estadoTexto, estadoClase)}
          ${kpi("Disponibilidad", Utils.formatoPorcentaje(ind.disponibilidad))}
          ${kpi("Rendimiento", Utils.formatoPorcentaje(ind.rendimiento))}
          ${kpi("Calidad", Utils.formatoPorcentaje(ind.calidad))}
          ${kpi("TNI", Utils.formatoPorcentaje(ind.tni))}
          ${kpi("Producción total", Utils.formatoNumero(ind.produccionReal))}
          ${kpi("Producción buena", Utils.formatoNumero(ind.produccionBuena))}
          ${kpi("Tiempo detenido", Utils.minutosATexto(ind.tiempoDetenido))}
          ${kpi("N° detenciones", Utils.formatoNumero(ind.numeroDetenciones))}
        </div>

        <h4>Principales tipos de detención</h4>
        <table class="data-table data-table-sm">
          <thead><tr><th>Tipo</th><th>Eventos</th><th>Minutos</th><th>% acumulado</th></tr></thead>
          <tbody>${porTipo.map((f) => `<tr><td>${Utils.escapeHtml(f.label)}</td><td>${f.eventos}</td><td>${Utils.formatoNumero(f.minutos, 1)}</td><td>${f.porcentajeAcumulado.toFixed(1)}%</td></tr>`).join("") || '<tr><td colspan="4" class="empty-row">Sin detenciones registradas.</td></tr>'}</tbody>
        </table>

        <h4>Pareto de causas</h4>
        <table class="data-table data-table-sm">
          <thead><tr><th>Causa</th><th>Eventos</th><th>Minutos</th><th>% acumulado</th></tr></thead>
          <tbody>${porCausa.map((f) => `<tr><td>${Utils.escapeHtml(f.label)}</td><td>${f.eventos}</td><td>${Utils.formatoNumero(f.minutos, 1)}</td><td>${f.porcentajeAcumulado.toFixed(1)}%</td></tr>`).join("") || '<tr><td colspan="4" class="empty-row">Sin detenciones registradas.</td></tr>'}</tbody>
        </table>
      </div>`;

    document.getElementById("rep-imprimir").classList.remove("hidden");
  }

  function kpi(label, valor, clase = "") {
    return `<div class="kpi-card ${clase}"><span class="kpi-label">${label}</span><span class="kpi-valor kpi-valor-sm">${valor}</span></div>`;
  }

  return { render };
})();
