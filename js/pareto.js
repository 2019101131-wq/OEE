/**
 * pareto.js
 * -----------------------------------------------------------------------
 * Cálculo de tablas de Pareto (tipo de detención, causa, código SAP) a
 * partir de los registros de detenciones ya filtrados. Todas las
 * relaciones (p.ej. qué causas pertenecen a qué tipo) se generan
 * dinámicamente desde los datos existentes, no desde catálogos fijos.
 * -----------------------------------------------------------------------
 */

const Pareto = (() => {
  function agrupar(detenciones, keyFn, labelFn) {
    const mapa = new Map();
    detenciones.forEach((d) => {
      const key = keyFn(d);
      if (!key) return;
      if (!mapa.has(key)) {
        mapa.set(key, { key, label: labelFn(d), eventos: 0, minutos: 0 });
      }
      const item = mapa.get(key);
      item.eventos += 1;
      item.minutos += Number(d.totalMinutos) || 0;
    });

    const filas = Array.from(mapa.values()).sort((a, b) => b.minutos - a.minutos);
    const totalMinutos = filas.reduce((s, f) => s + f.minutos, 0);
    let acumulado = 0;
    filas.forEach((f) => {
      f.porcentaje = totalMinutos ? (f.minutos / totalMinutos) * 100 : 0;
      acumulado += f.porcentaje;
      f.porcentajeAcumulado = acumulado;
    });
    return filas;
  }

  function porTipo(detenciones) {
    return agrupar(
      detenciones,
      (d) => d.tipoDetencion,
      (d) => d.tipoDetencion
    );
  }

  function porCausa(detenciones, tipoFiltro = null) {
    const base = tipoFiltro
      ? detenciones.filter((d) => d.tipoDetencion === tipoFiltro)
      : detenciones;
    return agrupar(
      base,
      (d) => d.causaDetencion,
      (d) => d.causaDetencion
    );
  }

  function porCodigoSAP(detenciones, codigosSAP) {
    const descById = new Map(codigosSAP.map((c) => [c.codigo, c.descripcion]));
    return agrupar(
      detenciones,
      (d) => d.codigoSAP,
      (d) => `${d.codigoSAP}${descById.get(d.codigoSAP) ? " - " + descById.get(d.codigoSAP) : ""}`
    );
  }

  /**
   * Devuelve la lista de causas asociadas dinámicamente a un tipo de
   * detención, a partir de los registros existentes (para el módulo de
   * detenciones y el catálogo de causas).
   */
  function causasPorTipo(detenciones, tipo) {
    const set = new Set();
    detenciones
      .filter((d) => d.tipoDetencion === tipo && d.causaDetencion)
      .forEach((d) => set.add(d.causaDetencion));
    return Array.from(set);
  }

  return { porTipo, porCausa, porCodigoSAP, causasPorTipo };
})();
