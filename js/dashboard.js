/**
 * dashboard.js — Dashboard General OEE
 */

const Dashboard = (() => {
  let filtros = {
    fechaInicial: "",
    fechaFinal: "",
    turnoId: "",
    lineaId: "",
    productoId: "",
    supervisor: "",
    maquinista: "",
  };
  let tipoParetoSeleccionado = null;
  let agrupacionTendencia = "dia";

  function render() {
    const cont = document.getElementById("page-dashboard");
    cont.innerHTML = `
      <div class="page-header"><h2>Dashboard General OEE</h2></div>

      <div class="card filters-bar">
        <label>Fecha inicial<input type="date" id="f-fecha-inicial"></label>
        <label>Fecha final<input type="date" id="f-fecha-final"></label>
        <label>Turno<select id="f-turno"></select></label>
        <label>Línea<select id="f-linea"></select></label>
        <label>Producto<select id="f-producto"></select></label>
        <label>Supervisor<input list="lista-supervisores" id="f-supervisor" placeholder="Todos"></label>
        <label>Maquinista<input list="lista-maquinistas" id="f-maquinista" placeholder="Todos"></label>
        <button class="btn btn-ghost" id="btn-limpiar-filtros">Limpiar filtros</button>
      </div>
      <datalist id="lista-supervisores"></datalist>
      <datalist id="lista-maquinistas"></datalist>

      <div class="kpi-grid" id="kpi-grid"></div>

      <div class="chart-row">
        <div class="card chart-card">
          <h3>OEE por línea vs. Meta</h3>
          <div class="chart-holder"><canvas id="chart-oee-linea"></canvas></div>
        </div>
        <div class="card chart-card">
          <h3>Tendencia OEE
            <select id="f-agrupacion-tendencia" class="inline-select">
              <option value="dia">Por día</option>
              <option value="semana">Por semana</option>
              <option value="mes">Por mes</option>
            </select>
          </h3>
          <div class="chart-holder"><canvas id="chart-tendencia-oee"></canvas></div>
        </div>
      </div>

      <div class="chart-row">
        <div class="card chart-card">
          <h3>Pareto de Tipos de Detención <span class="hint-inline">(clic en una barra para filtrar causas)</span></h3>
          <div class="chart-holder"><canvas id="chart-pareto-tipo"></canvas></div>
        </div>
        <div class="card chart-card">
          <h3>Pareto de Causas <span id="pareto-causa-subtitulo" class="hint-inline"></span></h3>
          <div class="chart-holder"><canvas id="chart-pareto-causa"></canvas></div>
        </div>
      </div>`;

    poblarFiltros();
    ["f-fecha-inicial", "f-fecha-final", "f-turno", "f-linea", "f-producto"].forEach((id) => {
      document.getElementById(id).onchange = aplicarFiltros;
    });
    ["f-supervisor", "f-maquinista"].forEach((id) => {
      document.getElementById(id).oninput = Utils.debounce(aplicarFiltros, 300);
    });
    document.getElementById("f-agrupacion-tendencia").onchange = (e) => {
      agrupacionTendencia = e.target.value;
      actualizarTendencia();
    };
    document.getElementById("btn-limpiar-filtros").onclick = () => {
      filtros = { fechaInicial: "", fechaFinal: "", turnoId: "", lineaId: "", productoId: "", supervisor: "", maquinista: "" };
      poblarFiltros();
      actualizarTodo();
    };

    actualizarTodo();
  }

  function poblarFiltros() {
    UI.llenarSelect(document.getElementById("f-turno"), Database.getCollection("turnos"), { placeholder: "Todos los turnos" });
    UI.llenarSelect(document.getElementById("f-linea"), Database.getCollection("lineas"), { placeholder: "Todas las líneas" });
    UI.llenarSelect(document.getElementById("f-producto"), Database.getCollection("productos"), { placeholder: "Todos los productos" });

    document.getElementById("f-fecha-inicial").value = filtros.fechaInicial;
    document.getElementById("f-fecha-final").value = filtros.fechaFinal;
    document.getElementById("f-turno").value = filtros.turnoId;
    document.getElementById("f-linea").value = filtros.lineaId;
    document.getElementById("f-producto").value = filtros.productoId;
    document.getElementById("f-supervisor").value = filtros.supervisor;
    document.getElementById("f-maquinista").value = filtros.maquinista;

    const supervisores = new Set(Database.getCollection("produccion").map((p) => p.supervisor).filter(Boolean));
    const maquinistas = new Set(Database.getCollection("produccion").map((p) => p.maquinista).filter(Boolean));
    document.getElementById("lista-supervisores").innerHTML = Array.from(supervisores).map((s) => `<option value="${Utils.escapeHtml(s)}">`).join("");
    document.getElementById("lista-maquinistas").innerHTML = Array.from(maquinistas).map((s) => `<option value="${Utils.escapeHtml(s)}">`).join("");
  }

  function aplicarFiltros() {
    filtros = {
      fechaInicial: document.getElementById("f-fecha-inicial").value,
      fechaFinal: document.getElementById("f-fecha-final").value,
      turnoId: document.getElementById("f-turno").value,
      lineaId: document.getElementById("f-linea").value,
      productoId: document.getElementById("f-producto").value,
      supervisor: document.getElementById("f-supervisor").value,
      maquinista: document.getElementById("f-maquinista").value,
    };
    tipoParetoSeleccionado = null;
    actualizarTodo();
  }

  function coincide(registro) {
    if (filtros.fechaInicial && registro.fecha < filtros.fechaInicial) return false;
    if (filtros.fechaFinal && registro.fecha > filtros.fechaFinal) return false;
    if (filtros.turnoId && registro.turnoId !== filtros.turnoId) return false;
    if (filtros.lineaId && registro.lineaId !== filtros.lineaId) return false;
    if (filtros.productoId && registro.productoId && registro.productoId !== filtros.productoId) return false;
    if (filtros.supervisor && registro.supervisor && registro.supervisor !== filtros.supervisor) return false;
    if (filtros.maquinista && registro.maquinista && registro.maquinista !== filtros.maquinista) return false;
    return true;
  }

  function datosFiltrados() {
    const produccion = Database.getCollection("produccion").filter(coincide);
    // las detenciones no tienen productoId siempre; se filtran por lo demás
    const detenciones = Database.getCollection("detenciones").filter((d) => {
      if (filtros.fechaInicial && d.fecha < filtros.fechaInicial) return false;
      if (filtros.fechaFinal && d.fecha > filtros.fechaFinal) return false;
      if (filtros.turnoId && d.turnoId !== filtros.turnoId) return false;
      if (filtros.lineaId && d.lineaId !== filtros.lineaId) return false;
      if (filtros.supervisor && d.supervisor && d.supervisor !== filtros.supervisor) return false;
      if (filtros.maquinista && d.maquinista && d.maquinista !== filtros.maquinista) return false;
      return true;
    });
    return { produccion, detenciones };
  }

  function actualizarTodo() {
    actualizarKpis();
    actualizarChartOeePorLinea();
    actualizarTendencia();
    actualizarParetos();
  }

  function actualizarKpis() {
    const { produccion, detenciones } = datosFiltrados();
    const lineas = Database.getCollection("lineas");
    const turnos = Database.getCollection("turnos");
    const ind = OEE.calcularIndicadoresConsolidados(produccion, detenciones, lineas, turnos);

    const lineasSeleccionadas = filtros.lineaId ? lineas.filter((l) => l.id === filtros.lineaId) : lineas;
    const metaOeeProm = lineasSeleccionadas.length
      ? lineasSeleccionadas.reduce((s, l) => s + Number(l.metaOee || 0), 0) / lineasSeleccionadas.length / 100
      : 0;
    const cumplimiento = metaOeeProm ? ind.oee / metaOeeProm : 0;
    const cfg = Database.getConfiguracion();

    const kpis = [
      { label: "OEE", valor: Utils.formatoPorcentaje(ind.oee), clase: Utils.claseEstado(ind.oee, cfg.rangosOEE) },
      { label: "Meta OEE", valor: Utils.formatoPorcentaje(metaOeeProm) },
      { label: "Disponibilidad", valor: Utils.formatoPorcentaje(ind.disponibilidad) },
      { label: "Rendimiento", valor: Utils.formatoPorcentaje(ind.rendimiento) },
      { label: "Calidad", valor: Utils.formatoPorcentaje(ind.calidad) },
      { label: "TNI", valor: Utils.formatoPorcentaje(ind.tni) },
      { label: "Producción total", valor: Utils.formatoNumero(ind.produccionReal, 0) },
      { label: "Producción buena", valor: Utils.formatoNumero(ind.produccionBuena, 0) },
      { label: "Producción rechazada", valor: Utils.formatoNumero(ind.produccionRechazada, 0) },
      { label: "Tiempo programado", valor: Utils.minutosATexto(ind.tiempoProgramado) },
      { label: "Tiempo productivo", valor: Utils.minutosATexto(ind.tiempoOperativo) },
      { label: "Tiempo detenido", valor: Utils.minutosATexto(ind.tiempoDetenido) },
      { label: "N° de detenciones", valor: Utils.formatoNumero(ind.numeroDetenciones, 0) },
      { label: "Cumplimiento de meta", valor: Utils.formatoPorcentaje(cumplimiento), clase: Utils.claseEstado(cumplimiento, cfg.rangosCumplimiento) },
    ];

    document.getElementById("kpi-grid").innerHTML = kpis
      .map(
        (k) => `<div class="kpi-card ${k.clase || ""}">
          <span class="kpi-label">${k.label}</span>
          <span class="kpi-valor">${k.valor}</span>
        </div>`
      )
      .join("");
  }

  function actualizarChartOeePorLinea() {
    const lineas = Database.getCollection("lineas");
    const turnos = Database.getCollection("turnos");
    const cfg = Database.getConfiguracion();
    const datos = lineas.map((l) => {
      const { produccion, detenciones } = datosFiltrados();
      const prodLinea = produccion.filter((p) => p.lineaId === l.id);
      const detLinea = detenciones.filter((d) => d.lineaId === l.id);
      const ind = OEE.calcularIndicadoresConsolidados(prodLinea, detLinea, [l], turnos);
      return { nombre: l.nombre, oee: ind.oee, metaOee: Number(l.metaOee || 0) / 100 };
    });
    Charts.renderOeePorLinea("chart-oee-linea", datos, cfg.rangosOEE);
  }

  function actualizarTendencia() {
    const { produccion, detenciones } = datosFiltrados();
    const lineas = Database.getCollection("lineas");
    const turnos = Database.getCollection("turnos");

    const claveDe = (fecha) => {
      if (agrupacionTendencia === "mes") return Utils.obtenerMesDeFecha(fecha) + "-" + fecha.slice(0, 4);
      if (agrupacionTendencia === "semana") return Utils.obtenerSemanaISO(fecha) + " (" + fecha.slice(0, 4) + ")";
      return fecha;
    };

    const claves = Array.from(new Set(produccion.map((p) => claveDe(p.fecha)))).sort();
    const valores = claves.map((clave) => {
      const prod = produccion.filter((p) => claveDe(p.fecha) === clave);
      const fechasClave = new Set(prod.map((p) => p.fecha));
      const det = detenciones.filter((d) => fechasClave.has(d.fecha));
      const ind = OEE.calcularIndicadoresConsolidados(prod, det, lineas, turnos);
      return ind.oee;
    });

    const lineasSeleccionadas = filtros.lineaId ? lineas.filter((l) => l.id === filtros.lineaId) : lineas;
    const metaProm = lineasSeleccionadas.length
      ? lineasSeleccionadas.reduce((s, l) => s + Number(l.metaOee || 0), 0) / lineasSeleccionadas.length / 100
      : 0;

    Charts.renderTendenciaOee("chart-tendencia-oee", claves, valores, metaProm);
  }

  function actualizarParetos() {
    const { detenciones } = datosFiltrados();
    const filasTipo = Pareto.porTipo(detenciones);
    Charts.renderPareto("chart-pareto-tipo", filasTipo, (tipo) => {
      tipoParetoSeleccionado = tipoParetoSeleccionado === tipo ? null : tipo;
      actualizarParetoCausas(detenciones);
    });
    actualizarParetoCausas(detenciones);
  }

  function actualizarParetoCausas(detenciones) {
    const filasCausa = Pareto.porCausa(detenciones, tipoParetoSeleccionado);
    document.getElementById("pareto-causa-subtitulo").textContent = tipoParetoSeleccionado
      ? `— Tipo: ${tipoParetoSeleccionado}`
      : "— Todos los tipos";
    Charts.renderPareto("chart-pareto-causa", filasCausa, null);
  }

  return { render };
})();
