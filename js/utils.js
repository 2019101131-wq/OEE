/**
 * utils.js
 * -----------------------------------------------------------------------
 * Funciones utilitarias reutilizables: manejo de horas, formateo,
 * validaciones y helpers generales de UI.
 * -----------------------------------------------------------------------
 */

const Utils = (() => {
  /**
   * Calcula los minutos transcurridos entre dos horas "HH:MM",
   * considerando correctamente el caso en que el rango cruza medianoche.
   * Ejemplo: inicio 23:50, fin 00:20 -> 30 minutos.
   */
  function minutosEntreHoras(horaInicio, horaFin) {
    if (!horaInicio || !horaFin) return 0;
    const [h1, m1] = horaInicio.split(":").map(Number);
    const [h2, m2] = horaFin.split(":").map(Number);
    let inicio = h1 * 60 + m1;
    let fin = h2 * 60 + m2;
    if (fin < inicio) fin += 24 * 60; // cruza medianoche
    return fin - inicio;
  }

  function minutosATexto(min) {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    if (h === 0) return `${m} min`;
    return `${h}h ${m}min`;
  }

  function formatoPorcentaje(valorDecimal, decimales = 1) {
    if (valorDecimal === null || valorDecimal === undefined || isNaN(valorDecimal))
      return "—";
    return `${(valorDecimal * 100).toFixed(decimales)}%`;
  }

  function formatoNumero(valor, decimales = 0) {
    if (valor === null || valor === undefined || isNaN(valor)) return "—";
    return Number(valor).toLocaleString("es-PE", {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    });
  }

  function formatoFecha(fechaIso) {
    if (!fechaIso) return "—";
    const d = new Date(fechaIso);
    if (isNaN(d.getTime())) return fechaIso;
    return d.toLocaleString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function obtenerMesDeFecha(fechaStr) {
    if (!fechaStr) return "";
    const d = new Date(fechaStr + "T00:00:00");
    const meses = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
    ];
    return meses[d.getMonth()];
  }

  function obtenerSemanaISO(fechaStr) {
    if (!fechaStr) return "";
    const d = new Date(fechaStr + "T00:00:00");
    const target = new Date(d.valueOf());
    const dayNr = (d.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    const week = 1 + Math.ceil((firstThursday - target) / (7 * 24 * 3600 * 1000));
    return `Semana ${week}`;
  }

  function claseEstado(valorDecimal, rangos) {
    const pct = valorDecimal * 100;
    if (pct >= rangos.verde) return "estado-verde";
    if (pct >= rangos.amarillo) return "estado-amarillo";
    return "estado-rojo";
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function debounce(fn, delay = 300) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  function toCsv(rows, columns) {
    const header = columns.map((c) => `"${c.label}"`).join(",");
    const lines = rows.map((row) =>
      columns
        .map((c) => {
          const val = row[c.key] === undefined || row[c.key] === null ? "" : row[c.key];
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    return [header, ...lines].join("\n");
  }

  function descargarArchivo(contenido, nombreArchivo, tipo = "text/csv;charset=utf-8;") {
    const blob = new Blob(["\uFEFF" + contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ---- Validaciones -----------------------------------------------------

  function validarProduccion(data) {
    const errores = [];
    if (!data.fecha) errores.push("La fecha es obligatoria.");
    if (!data.turnoId) errores.push("El turno es obligatorio.");
    if (!data.lineaId) errores.push("La línea es obligatoria.");
    if (!data.productoId) errores.push("El producto es obligatorio.");
    if (!data.horaInicio || !data.horaFin)
      errores.push("La hora de inicio y fin son obligatorias.");
    if (Number(data.produccionReal) < 0)
      errores.push("La producción real no puede ser negativa.");
    if (Number(data.produccionBuena) < 0)
      errores.push("La producción buena no puede ser negativa.");
    if (Number(data.produccionBuena) > Number(data.produccionReal))
      errores.push("La producción buena no puede ser mayor a la producción real.");
    return errores;
  }

  function validarDetencion(data) {
    const errores = [];
    if (!data.fecha) errores.push("La fecha es obligatoria.");
    if (!data.turnoId) errores.push("El turno es obligatorio.");
    if (!data.lineaId) errores.push("La línea es obligatoria.");
    if (!data.horaInicio || !data.horaFin)
      errores.push("La hora de inicio y fin de la detención son obligatorias.");
    if (!data.tipoDetencion) errores.push("El tipo de detención es obligatorio.");
    if (minutosEntreHoras(data.horaInicio, data.horaFin) <= 0)
      errores.push("El rango de horas de la detención no es válido.");
    return errores;
  }

  return {
    minutosEntreHoras,
    minutosATexto,
    formatoPorcentaje,
    formatoNumero,
    formatoFecha,
    obtenerMesDeFecha,
    obtenerSemanaISO,
    claseEstado,
    escapeHtml,
    debounce,
    toCsv,
    descargarArchivo,
    validarProduccion,
    validarDetencion,
  };
})();
