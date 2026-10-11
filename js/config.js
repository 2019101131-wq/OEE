/**
 * config.js
 * -----------------------------------------------------------------------
 * CONFIGURACIÓN CENTRALIZADA DE LA BASE DE DATOS (Supabase)
 * -----------------------------------------------------------------------
 * Único lugar del proyecto donde se colocan las credenciales.
 *
 * SUPABASE_URL      -> Project Settings > API > Project URL
 * SUPABASE_ANON_KEY -> Project Settings > API > anon / publishable key
 *
 * IMPORTANTE - LIMITACIÓN DE SEGURIDAD:
 * Esta aplicación corre 100% en el navegador y se publica en GitHub
 * Pages, por lo que la clave "anon/publishable" es VISIBLE para cualquiera
 * que abra el código. En Supabase esto es normal: la clave anon no es un
 * secreto, la protección real la dan las políticas RLS (Row Level
 * Security) de la base de datos. Con las políticas incluidas en
 * supabase.sql (acceso abierto al rol anon), CUALQUIER persona que
 * conozca la URL y la clave puede leer, modificar o borrar datos.
 * NUNCA uses la clave "service_role" en este archivo.
 * Para seguridad real, el siguiente paso es agregar Supabase Auth
 * (login de usuarios) y restringir las políticas RLS al rol
 * "authenticated". Solo api.js necesitaría cambios.
 * -----------------------------------------------------------------------
 */

const CONFIG = {
  SUPABASE_URL: "https://vpxffecldyjygegcdnqj.supabase.co", // ej: https://abcdxyz.supabase.co
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweGZmZWNsZHlqeWdlZ2NkbnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NTQ4NjcsImV4cCI6MjEwNzMzMDg2N30.3W-_4DrXrrrGgCysUrxJ18bIG5UJxZURtuC_1f6Kx38",

  // Nombre de la tabla creada con supabase.sql
  TABLE: "registros",

  // Intervalo (ms) para refrescar cambios hechos desde otras computadoras.
  SYNC_INTERVAL_MS: 30000,

  // Valores por defecto de configuración (NO son datos de ejemplo:
  // solo los rangos del semáforo, editables en la página Metas).
  EMPTY_DATABASE: {
    configuracion: {
      rangosOEE: { verde: 85, amarillo: 70 },
      rangosCumplimiento: { verde: 95, amarillo: 80 },
    },
  },
};
