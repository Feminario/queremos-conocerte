# Queremos conocerte · Formulario de leads Feminario

Formulario estático (HTML/CSS/JS) que guarda cada lead en la hoja **LEADS CLUB 365 - 3RA COHORTE** con `Origen = Formulario feminario`, abre el calendario de la llamada y luego muestra confeti y el botón **Habla con Emi 💜**.

## Activarlo (una sola vez)

1. **Apps Script**: abre la hoja → Extensiones → Apps Script → pega [apps-script/Code.gs](apps-script/Code.gs).
2. Implementar → Nueva implementación → *Aplicación web* → Ejecutar como **yo**, acceso **Cualquier persona** → copia la URL `.../exec`.
3. Pega esa URL en `SHEET_ENDPOINT` de [config.js](config.js).
4. Publica en GitHub Pages (Settings → Pages → rama `main`, carpeta `/`).

Sin el paso 3 el formulario se ve y funciona, pero **no guarda** en la hoja.

## Columnas

Se rellenan: Nombre (nombre + apellido), Whatsapp (código de país + número), Email, Salario, Por qué quieres unirte? (respuesta a "¿Qué quieres lograr con tu dinero?"), Fecha, Campaña / Ad Set / Anuncio (desde `utm_campaign`, `utm_term`, `utm_content` de la URL).
Se crean si faltan: **¿Tienes dinero disponible para invertir?** y **Origen**. El resto de columnas no se tocan.
