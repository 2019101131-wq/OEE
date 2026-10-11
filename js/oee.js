/**
 * oee.js
 * -----------------------------------------------------------------------
 * MOTOR DE CÁLCULO DE INDICADORES OEE
 * -----------------------------------------------------------------------
 * Cada fórmula vive en su propia función, comentada, para poder ser
 * ajustada fácilmente si cambia la metodología de la planta, sin tener
 * que tocar el resto del sistema.
 * -----------------------------------------------------------------------
 */

const OEE = (() => {
  /**
   * Tiempo Operativo = Tiempo Programado - Tiempo de Detenciones
   */
  function calcularTiempoOperativo(tiempoProgramadoMin, tiempoDetenidoMin) {
    return Math.max(0, tiempoProgramadoMin - tiempoDetenidoMin);
  }

  /**
   * Disponibilidad = Tiempo Operativo / Tiempo Programado
   */
  function calcularDisponibilidad(tiempoOperativoMin, tiempoProgramadoMin) {
    if (!tiempoProgramadoMin) return 0;
    return Math.min(1, tiempoOperativoMin / tiempoProgramadoMin);
  }

  /**
   * Producción Teórica.
   * Se calcula a partir del tiempo operativo (minutos) y la velocidad
   * estándar del producto (unidades por minuto, derivada de golpes por
   * minuto y configuración de la máquina/producto).
   *
   * Esta función es intencionalmente modular: si la planta define la
   * velocidad estándar de otra forma (p.ej. cajas/hora, golpes x
   * cavidades del molde, etc.) basta con ajustar este cálculo.
   */
  function calcularProduccionTeorica(tiempoOperativoMin, velocidadEstandarUnidMin) {
    const velocidad = Number(velocidadEstandarUnidMin) || 0;
    return tiempoOperativoMin * velocidad;
  }

  /**
   * Rendimiento = Producción Real / Producción Teórica
   */
  function calcularRendimiento(produccionReal, produccionTeorica) {
    if (!produccionTeorica) return 0;
    return Math.min(1, produccionReal / produccionTeorica);
  }

  /**
   * Calidad = Producción Buena / Producción Total
   */
  function calcularCalidad(produccionBuena, produccionTotal) {
    if (!produccionTotal) return 0;
    return Math.min(1, produccionBuena / produccionTotal);
  }

  /**
   * OEE = Disponibilidad x Rendimiento x Calidad
   */
  function calcularOEE(disponibilidad, rendimiento, calidad) {
    return disponibilidad * rendimiento * calidad;
  }

  /**
   * TNI (Tiempo No Involucrado / índice de tiempo no productivo).
   * Fórmula por defecto: proporción del tiempo programado que se
   * perdió por detenciones. Función aislada y documentada para poder
   * sustituirla si la planta utiliza una metodología distinta de TNI.
   */
  function calcularTNI(tiempoDetenidoMin, tiempoProgramadoMin) {
    if (!tiempoProgramadoMin) return 0;
    return Math.min(1, tiempoDetenidoMin / tiempoProgramadoMin);
  }

  /**
   * Determina el tiempo programado (minutos) para una combinación
   * fecha+turno+línea a partir de la configuración de turnos. Si no
   * existe configuración de turno, usa la meta de tiempo programado
   * configurada en la línea.
   */
  function obtenerTiempoProgramado(turno, linea) {
    if (turno && turno.tiempoNetoDisponible) {
      return Number(turno.tiempoNetoDisponible);
    }
    if (linea && linea.tiempoProgramado) {
      return Number(linea.tiempoProgramado);
    }
    return 0;
  }

  /**
   * Agrega un conjunto de registros de producción + detenciones
   * (ya filtrados) y calcula todos los indicadores consolidados.
   * Se agrupa por combinación única de fecha+turno+línea para no
   * duplicar el tiempo programado cuando existen varios productos en
   * el mismo turno.
   */
  function calcularIndicadoresConsolidados(produccion, detenciones, lineas, turnos) {
    const lineaById = new Map(lineas.map((l) => [l.id, l]));
    const turnoById = new Map(turnos.map((t) => [t.id, t]));

    // Agrupar producción por fecha+turno+línea para el tiempo programado
    const gruposTurnoLinea = new Map();
    produccion.forEach((p) => {
      const key = `${p.fecha}|${p.turnoId}|${p.lineaId}`;
      if (!gruposTurnoLinea.has(key)) {
        gruposTurnoLinea.set(key, {
          fecha: p.fecha,
          turnoId: p.turnoId,
          lineaId: p.lineaId,
        });
      }
    });

    let tiempoProgramadoTotal = 0;
    gruposTurnoLinea.forEach((g) => {
      const turno = turnoById.get(g.turnoId);
      const linea = lineaById.get(g.lineaId);
      tiempoProgramadoTotal += obtenerTiempoProgramado(turno, linea);
    });

    const tiempoDetenidoTotal = detenciones.reduce(
      (sum, d) => sum + (Number(d.totalMinutos) || 0),
      0
    );

    const tiempoOperativoTotal = calcularTiempoOperativo(
      tiempoProgramadoTotal,
      tiempoDetenidoTotal
    );

    const produccionRealTotal = produccion.reduce(
      (sum, p) => sum + (Number(p.produccionReal) || 0),
      0
    );
    const produccionBuenaTotal = produccion.reduce(
      (sum, p) => sum + (Number(p.produccionBuena) || 0),
      0
    );
    const produccionRechazadaTotal = produccion.reduce(
      (sum, p) => sum + (Number(p.produccionRechazada) || 0),
      0
    );

    // Producción teórica: se calcula registro por registro usando el
    // tiempo de producción propio de cada período (permite hasta 3
    // productos distintos por turno) y se suma.
    const produccionTeoricaTotal = produccion.reduce((sum, p) => {
      const minutos = Utils.minutosEntreHoras(p.horaInicio, p.horaFin);
      return (
        sum + calcularProduccionTeorica(minutos, p.velocidadEstandar)
      );
    }, 0);

    const disponibilidad = calcularDisponibilidad(
      tiempoOperativoTotal,
      tiempoProgramadoTotal
    );
    const rendimiento = calcularRendimiento(
      produccionRealTotal,
      produccionTeoricaTotal
    );
    const calidad = calcularCalidad(produccionBuenaTotal, produccionRealTotal);
    const oee = calcularOEE(disponibilidad, rendimiento, calidad);
    const tni = calcularTNI(tiempoDetenidoTotal, tiempoProgramadoTotal);

    return {
      tiempoProgramado: tiempoProgramadoTotal,
      tiempoOperativo: tiempoOperativoTotal,
      tiempoDetenido: tiempoDetenidoTotal,
      produccionReal: produccionRealTotal,
      produccionBuena: produccionBuenaTotal,
      produccionRechazada: produccionRechazadaTotal,
      produccionTeorica: produccionTeoricaTotal,
      disponibilidad,
      rendimiento,
      calidad,
      oee,
      tni,
      numeroDetenciones: detenciones.length,
    };
  }

  return {
    calcularTiempoOperativo,
    calcularDisponibilidad,
    calcularProduccionTeorica,
    calcularRendimiento,
    calcularCalidad,
    calcularOEE,
    calcularTNI,
    obtenerTiempoProgramado,
    calcularIndicadoresConsolidados,
  };
})();
