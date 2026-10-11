# Sistema OEE — Planta de Envasado (4 líneas)

Sistema web industrial para registrar, calcular y analizar el OEE
(Disponibilidad × Rendimiento × Calidad). HTML, CSS y JavaScript puro,
**Supabase** como base de datos REST centralizada (vía fetch, sin SDK).
Sin localStorage, sin frameworks y sin datos de ejemplo.

## 1. Crear la base de datos en Supabase

1. Cree un proyecto gratuito en https://supabase.com
2. Abra **SQL Editor > New query**, pegue el contenido de `supabase.sql` y ejecútelo.
3. En **Project Settings > API** copie la **Project URL** y la clave **anon / publishable**.
    
## 2. Configurar el sistema

En `js/config.js` reemplace `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
Es el único archivo con credenciales.

## 3. Publicar en GitHub Pages

Suba el proyecto a GitHub y active **Settings > Pages** sobre la rama principal.

## ⚠️ Limitación de seguridad

La clave anon queda visible en el navegador (es normal en Supabase). Con
las políticas de `supabase.sql`, cualquiera que la tenga puede leer,
modificar o borrar datos. Para uso real: agregue Supabase Auth (login) y
cambie las políticas RLS de `anon` a `authenticated`. **Nunca** ponga la
clave `service_role` en el código.

## Estructura del proyecto

```
index.html
css/  (style, dashboard, tables, forms)
js/
  config.js        URL y clave de Supabase
  api.js            REST contra Supabase (PostgREST)
  database.js       CRUD + caché en memoria
  utils.js          horas, formateo, validaciones
  oee.js            fórmulas de Disponibilidad/Rendimiento/Calidad/OEE/TNI
  pareto.js         cálculo de Pareto (tipo/causa/SAP)
  charts.js         gráficos Chart.js
  ui.js             toasts, confirmaciones, paginación
  productos.js, configuracion.js (líneas/turnos/SAP/causas/metas)
  produccion.js, detenciones.js
  dashboard.js, analisis.js, historico.js, reports.js
  app.js            enrutamiento y arranque
```

## Uso diario

Dashboard → Producción → Detenciones → los indicadores (Disponibilidad,
Rendimiento, Calidad, OEE, TNI, Pareto) se calculan automáticamente al
guardar cada registro, y se sincronizan cada 30 segundos entre todas
las computadoras.
