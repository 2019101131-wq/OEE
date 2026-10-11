/**
 * app.js — Inicialización y enrutamiento del sistema
 */

const App = (() => {
  const PAGES = {
    dashboard: { label: "Dashboard", render: Dashboard.render },
    produccion: { label: "Producción", render: Produccion.render },
    detenciones: { label: "Detenciones", render: Detenciones.render },
    analisis: { label: "Análisis de Detenciones", render: Analisis.render },
    productos: { label: "Productos", render: Productos.render },
    sap: { label: "Códigos SAP", render: CodigosSAP.render },
    causas: { label: "Causas", render: Causas.render },
    lineas: { label: "Líneas", render: Lineas.render },
    turnos: { label: "Turnos", render: Turnos.render },
    metas: { label: "Metas", render: Metas.render },
    historico: { label: "Histórico", render: Historico.render },
    reportes: { label: "Reportes", render: Reportes.render },
    configuracion: { label: "Configuración", render: ConfiguracionGeneral.render },
  };

  let paginaActual = "dashboard";
  let syncTimer = null;

  async function init() {
    UI.loading(true);
    try {
      await Database.init();
      renderShell();
      irA("dashboard");
      iniciarSincronizacionPeriodica();
    } catch (err) {
      mostrarErrorConexion(err);
    } finally {
      UI.loading(false);
    }
  }

  function mostrarErrorConexion(err) {
    document.getElementById("app").innerHTML = `
      <div class="conn-error-screen">
        <h2>No fue posible sincronizar con la base de datos</h2>
        <p>${Utils.escapeHtml(err.message)}</p>
        <p>Verifique la configuración de <code>SUPABASE_URL</code> y <code>SUPABASE_ANON_KEY</code> en <code>js/config.js</code>, que la tabla exista (<code>supabase.sql</code>) y su conexión a Internet.</p>
        <button class="btn btn-primary" id="btn-reintentar">Reintentar</button>
      </div>`;
    document.getElementById("btn-reintentar").onclick = init;
  }

  function renderShell() {
    document.getElementById("app").innerHTML = `
      <aside class="sidebar">
        <div class="sidebar-brand">
          <span class="brand-mark">OEE</span>
          <span class="brand-text">Planta · 4 Líneas</span>
        </div>
        <nav class="sidebar-nav" id="sidebar-nav"></nav>
        <div class="sidebar-footer">
          <span id="sync-indicator" class="sync-indicator">● Sincronizado</span>
        </div>
      </aside>
      <div class="main-area">
        <header class="topbar">
          <button class="menu-toggle" id="menu-toggle">☰</button>
          <h1 id="page-title">Dashboard</h1>
          <button class="btn btn-ghost btn-sm" id="btn-sync-ahora">Actualizar ahora</button>
        </header>
        <main class="content" id="content">
          ${Object.keys(PAGES).map((key) => `<section class="page" id="page-${key}"></section>`).join("")}
        </main>
      </div>`;

    document.getElementById("sidebar-nav").innerHTML = Object.entries(PAGES)
      .map(([key, p]) => `<button class="nav-item" data-page="${key}">${p.label}</button>`)
      .join("");
    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.onclick = () => irA(btn.dataset.page);
    });
    document.getElementById("menu-toggle").onclick = () => {
      document.querySelector(".sidebar").classList.toggle("open");
    };
    document.getElementById("btn-sync-ahora").onclick = sincronizarAhora;
  }

  function irA(pageKey) {
    if (!PAGES[pageKey]) return;
    paginaActual = pageKey;
    document.querySelectorAll(".page").forEach((el) => el.classList.remove("visible"));
    document.getElementById(`page-${pageKey}`).classList.add("visible");
    document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.page === pageKey));
    document.getElementById("page-title").textContent = PAGES[pageKey].label;
    document.querySelector(".sidebar")?.classList.remove("open");
    PAGES[pageKey].render();
  }

  /**
   * Refresca los <select> de línea/turno/producto en los formularios de
   * los módulos que dependen de esos catálogos, sin perder el estado
   * de la página actual.
   */
  function refrescarSelectoresGlobales() {
    if (PAGES[paginaActual]) PAGES[paginaActual].render();
  }

  function iniciarSincronizacionPeriodica() {
    if (syncTimer) clearInterval(syncTimer);
    syncTimer = setInterval(sincronizarAhora, CONFIG.SYNC_INTERVAL_MS);
  }

  async function sincronizarAhora() {
    const indicador = document.getElementById("sync-indicator");
    try {
      if (indicador) { indicador.textContent = "● Sincronizando…"; indicador.className = "sync-indicator syncing"; }
      await Database.syncDatabase();
      if (indicador) { indicador.textContent = "● Sincronizado"; indicador.className = "sync-indicator"; }
      if (PAGES[paginaActual]) PAGES[paginaActual].render();
    } catch (err) {
      if (indicador) { indicador.textContent = "● Sin conexión"; indicador.className = "sync-indicator error"; }
      UI.toast("No fue posible sincronizar la información. Se mostrarán los últimos datos disponibles.", "error");
    }
  }

  return { init, irA, refrescarSelectoresGlobales };
})();

document.addEventListener("DOMContentLoaded", App.init);
