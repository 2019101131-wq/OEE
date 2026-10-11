/**
 * analisis.js — Análisis de Detenciones + Pareto por Tipo / Causa / SAP
 */

const Analisis = (() => {
  let filtros = { fecha: "", lineaId: "", turnoId: "", codigoSAP: "", tipo: "", causa: "", productoId: "" };

  function render() {
    const cont = document.getElementById("page-analisis");
    cont.innerHTML = `
      <div class="page-header"><h2>Análisis de Detenciones</h2></div>

      <div class="card filters-bar">
        <label>Fecha<input type="date" id="a-fecha"></label>
        <label>Línea<select id="a-linea"></select></label>
        <label>Turno<select id="a-turno"></select></label>
        <label>Código SAP<select id="a-sap"></select></label>
        <label>Tipo<select id="a-tipo"></select></label>
        <label>Causa<select id="a-causa"></select></label>
        <button class="btn btn-ghost" id="a-limpiar">Limpiar filtros</button>
      </div>

      <div class="kpi-grid" id="analisis-kpis"></div>

      <div class="chart-row-3">
        <div class="card"><h3>Pareto por Tipo</h3><div class="table-scroll" id="tabla-pareto-tipo"></div></div>
        <div class="card"><h3>Pareto por Causa</h3><div class="table-scroll" id="tabla-pareto-causa"></div></div>
        <div class="card"><h3>Pareto por Código SAP</h3><div class="table-scroll" id="tabla-pareto-sap"></div></div>
      </div>

      <div class="card">
        <h3>Detalle de detenciones</h3>
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr><th>Fecha</th><th>Línea</th><th>Turno</th><th>Inicio</th><th>Fin</th><th>Min.</th>
              <th>SAP</th><th>Tipo</th><th>Causa</th><th>Observaciones</th></tr></thead>
            <tbody id="tbody-analisis"></tbody>
          </table>
        </div>
      </div>`;

    poblarFiltros();
    ["a-fecha", "a-linea", "a-turno", "a-sap", "a-tipo", "a-causa"].forEach((id) => {
      document.getElementById(id).onchange = aplicarFiltros;
    });
    document.getElementById("a-limpiar").onclick = () => {
      filtros = { fecha: "", lineaId: "", turnoId: "", codigoSAP: "", tipo: "", causa: "", productoId: "" };
      poblarFiltros();
      actualizar();
    };
    actualizar();
  }

  function poblarFiltros() {
    UI.llenarSelect(document.getElementById("a-linea"), Database.getCollection("lineas"), { placeholder: "Todas las líneas" });
    UI.llenarSelect(document.getElementById("a-turno"), Database.getCollection("turnos"), { placeholder: "Todos los turnos" });
    UI.llenarSelect(
      document.getElementById("a-sap"),
      Database.getCollection("codigosSAP").map((c) => ({ id: c.codigo, nombre: c.codigo })),
      { placeholder: "Todos los SAP" }
    );
    const tipos = Array.from(new Set(Database.getCollection("detenciones").map((d) => d.tipoDetencion).filter(Boolean)));
    const causas = Array.from(new Set(Database.getCollection("detenciones").map((d) => d.causaDetencion).filter(Boolean)));
    UI.llenarSelect(document.getElementById("a-tipo"), tipos.map((t) => ({ id: t, nombre: t })), { placeholder: "Todos los tipos" });
    UI.llenarSelect(document.getElementById("a-causa"), causas.map((c) => ({ id: c, nombre: c })), { placeholder: "Todas las causas" });

    document.getElementById("a-fecha").value = filtros.fecha;
    document.getElementById("a-linea").value = filtros.lineaId;
    document.getElementById("a-turno").value = filtros.turnoId;
    document.getElementById("a-sap").value = filtros.codigoSAP;
    document.getElementById("a-tipo").value = filtros.tipo;
    document.getElementById("a-causa").value = filtros.causa;
  }

  function aplicarFiltros() {
    filtros = {
      fecha: document.getElementById("a-fecha").value,
      lineaId: document.getElementById("a-linea").value,
      turnoId: document.getElementById("a-turno").value,
      codigoSAP: document.getElementById("a-sap").value,
      tipo: document.getElementById("a-tipo").value,
      causa: document.getElementById("a-causa").value,
    };
    actualizar();
  }

  function obtenerFiltradas() {
    return Database.getCollection("detenciones")
      .filter((d) => !filtros.fecha || d.fecha === filtros.fecha)
      .filter((d) => !filtros.lineaId || d.lineaId === filtros.lineaId)
      .filter((d) => !filtros.turnoId || d.turnoId === filtros.turnoId)
      .filter((d) => !filtros.codigoSAP || d.codigoSAP === filtros.codigoSAP)
      .filter((d) => !filtros.tipo || d.tipoDetencion === filtros.tipo)
      .filter((d) => !filtros.causa || d.causaDetencion === filtros.causa)
      .sort((a, b) => (b.fecha + b.horaInicio).localeCompare(a.fecha + a.horaInicio));
  }

  function actualizar() {
    const detenciones = obtenerFiltradas();
    const lineas = new Map(Database.getCollection("lineas").map((l) => [l.id, l.nombre]));
    const turnos = new Map(Database.getCollection("turnos").map((t) => [t.id, t.nombre]));

    // KPIs resumen
    const totalMin = detenciones.reduce((s, d) => s + (Number(d.totalMinutos) || 0), 0);
    const numDet = detenciones.length;
    const promedio = numDet ? totalMin / numDet : 0;
    const porTipo = Pareto.porTipo(detenciones);
    const porCausa = Pareto.porCausa(detenciones);
    const porSap = Pareto.porCodigoSAP(detenciones, Database.getCollection("codigosSAP"));
    const porLinea = new Map();
    detenciones.forEach((d) => porLinea.set(d.lineaId, (porLinea.get(d.lineaId) || 0) + (Number(d.totalMinutos) || 0)));
    let lineaTop = "—", maxLinea = -1;
    porLinea.forEach((min, id) => { if (min > maxLinea) { maxLinea = min; lineaTop = lineas.get(id) || id; } });

    const kpis = [
      { label: "Total minutos detenidos", valor: Utils.minutosATexto(totalMin) },
      { label: "Número de detenciones", valor: Utils.formatoNumero(numDet) },
      { label: "Tiempo promedio por detención", valor: Utils.minutosATexto(promedio) },
      { label: "Principal tipo de detención", valor: porTipo[0]?.label || "—" },
      { label: "Principal causa", valor: porCausa[0]?.label || "—" },
      { label: "Código SAP con mayor impacto", valor: porSap[0]?.label || "—" },
      { label: "Línea con mayor tiempo detenido", valor: lineaTop },
    ];
    document.getElementById("analisis-kpis").innerHTML = kpis
      .map((k) => `<div class="kpi-card"><span class="kpi-label">${k.label}</span><span class="kpi-valor kpi-valor-sm">${Utils.escapeHtml(String(k.valor))}</span></div>`)
      .join("");

    // Tablas Pareto
    document.getElementById("tabla-pareto-tipo").innerHTML = tablaParetoHtml(porTipo, "Tipo");
    document.getElementById("tabla-pareto-causa").innerHTML = tablaParetoHtml(porCausa, "Causa");
    document.getElementById("tabla-pareto-sap").innerHTML = tablaParetoHtml(porSap, "Código SAP");

    // Tabla detalle
    const tbody = document.getElementById("tbody-analisis");
    if (!detenciones.length) {
      tbody.innerHTML = `<tr><td colspan="10" class="empty-row">No hay detenciones para los filtros seleccionados.</td></tr>`;
    } else {
      tbody.innerHTML = detenciones
        .map(
          (d) => `<tr>
          <td>${d.fecha}</td><td>${Utils.escapeHtml(lineas.get(d.lineaId) || "—")}</td>
          <td>${Utils.escapeHtml(turnos.get(d.turnoId) || "—")}</td>
          <td>${d.horaInicio}</td><td>${d.horaFin}</td><td>${Utils.formatoNumero(d.totalMinutos)}</td>
          <td>${d.codigoSAP ? Utils.escapeHtml(d.codigoSAP) : "—"}</td>
          <td>${Utils.escapeHtml(d.tipoDetencion)}</td><td>${Utils.escapeHtml(d.causaDetencion)}</td>
          <td>${Utils.escapeHtml(d.observaciones || "—")}</td></tr>`
        )
        .join("");
    }
  }

  function tablaParetoHtml(filas, etiquetaCol) {
    if (!filas.length) return `<p class="empty-row">Sin datos.</p>`;
    return `<table class="data-table data-table-sm">
      <thead><tr><th>${etiquetaCol}</th><th>Eventos</th><th>Minutos</th><th>% total</th><th>% acum.</th></tr></thead>
      <tbody>
        ${filas
          .map(
            (f) => `<tr>
            <td>${Utils.escapeHtml(f.label)}</td><td>${f.eventos}</td>
            <td>${Utils.formatoNumero(f.minutos, 1)}</td>
            <td>${f.porcentaje.toFixed(1)}%</td><td>${f.porcentajeAcumulado.toFixed(1)}%</td>
          </tr>`
          )
          .join("")}
      </tbody></table>`;
  }

  return { render };
})();
