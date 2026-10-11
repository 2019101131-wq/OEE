/**
 * charts.js
 * -----------------------------------------------------------------------
 * Funciones para crear/actualizar los gráficos del sistema usando
 * Chart.js (única librería externa permitida, cargada vía CDN).
 * -----------------------------------------------------------------------
 */

const Charts = (() => {
  const instances = {};

  function destroy(id) {
    if (instances[id]) {
      instances[id].destroy();
      delete instances[id];
    }
  }

  function colorEstado(pct, cfg) {
    if (pct >= cfg.verde) return "#1E8E5A";
    if (pct >= cfg.amarillo) return "#D98C1B";
    return "#C0392B";
  }

  /**
   * Gráfico de barras OEE por línea + línea horizontal de meta.
   */
  function renderOeePorLinea(canvasId, datos, rangos) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    instances[canvasId] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: datos.map((d) => d.nombre),
        datasets: [
          {
            label: "OEE actual (%)",
            data: datos.map((d) => +(d.oee * 100).toFixed(1)),
            backgroundColor: datos.map((d) =>
              colorEstado(d.oee * 100, rangos)
            ),
            borderRadius: 4,
            order: 2,
          },
          {
            type: "line",
            label: "Meta OEE (%)",
            data: datos.map((d) => +(d.metaOee * 100).toFixed(1)),
            borderColor: "#14273D",
            borderDash: [6, 4],
            pointRadius: 4,
            pointBackgroundColor: "#14273D",
            fill: false,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, max: 110, ticks: { callback: (v) => v + "%" } } },
        plugins: { legend: { position: "bottom" } },
      },
    });
  }

  /**
   * Tendencia OEE a lo largo del tiempo (día/semana/mes).
   */
  function renderTendenciaOee(canvasId, labels, valores, metaPromedio) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    instances[canvasId] = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "OEE (%)",
            data: valores.map((v) => +(v * 100).toFixed(1)),
            borderColor: "#0B5FA5",
            backgroundColor: "rgba(11,95,165,0.12)",
            tension: 0.3,
            fill: true,
            pointRadius: 3,
          },
          {
            label: "Meta promedio (%)",
            data: labels.map(() => +(metaPromedio * 100).toFixed(1)),
            borderColor: "#C0392B",
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, max: 110, ticks: { callback: (v) => v + "%" } } },
        plugins: { legend: { position: "bottom" } },
      },
    });
  }

  /**
   * Gráfico de Pareto (barras de minutos + línea de % acumulado).
   * onBarClick(label) se invoca cuando el usuario hace clic en una barra,
   * para permitir la interacción entre gráficos (tipo -> causa).
   */
  function renderPareto(canvasId, filas, onBarClick) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    instances[canvasId] = new Chart(ctx, {
      data: {
        labels: filas.map((f) => f.label),
        datasets: [
          {
            type: "bar",
            label: "Minutos perdidos",
            data: filas.map((f) => +f.minutos.toFixed(1)),
            backgroundColor: "#0B5FA5",
            yAxisID: "y",
            order: 2,
          },
          {
            type: "line",
            label: "% acumulado",
            data: filas.map((f) => +f.porcentajeAcumulado.toFixed(1)),
            borderColor: "#D98C1B",
            yAxisID: "y1",
            pointRadius: 3,
            fill: false,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (evt, elements) => {
          if (elements.length && onBarClick) {
            const idx = elements[0].index;
            onBarClick(filas[idx].key);
          }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: "Minutos" } },
          y1: {
            beginAtZero: true,
            max: 100,
            position: "right",
            grid: { drawOnChartArea: false },
            ticks: { callback: (v) => v + "%" },
          },
        },
        plugins: { legend: { position: "bottom" } },
      },
    });
  }

  return { renderOeePorLinea, renderTendenciaOee, renderPareto, destroy };
})();
