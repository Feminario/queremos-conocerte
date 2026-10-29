// Recibe los leads del formulario y los agrega a la hoja "LEADS CLUB 365 - 3RA COHORTE".
// Escribe por NOMBRE de columna, así que no importa el orden. Si falta una columna
// (p. ej. "Origen"), la crea al final de la fila de encabezados.

const SHEET_ID = "1D9tDfr-ABr-0PomegBH1DSnFyUXkZR4MVsGqHqvugkc";
const SHEET_NAME = "Hoja 1";

// Columnas del formulario que la hoja aún no tiene.
const EXTRA_HEADERS = ["¿Qué quieres lograr con tu dinero?", "¿Tienes pensado algo para invertir?", "Origen"];

// La hoja ya tiene "Por qué quieres unirte?"; la respuesta de "meta" va ahí también.
const ALIASES = { "¿Qué quieres lograr con tu dinero?": "Por qué quieres unirte?" };

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);

    let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
    // En la hoja actual los encabezados están en la fila 2 si la fila 1 está vacía.
    let headerRow = 1;
    if (headers.every((h) => h.trim() === "")) {
      headerRow = 2;
      headers = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
    }

    EXTRA_HEADERS.forEach((h) => {
      if (ALIASES[h] && headers.some((x) => x.trim() === ALIASES[h])) return;
      if (!headers.some((x) => x.trim() === h)) {
        headers.push(h);
        sheet.getRange(headerRow, headers.length).setValue(h);
      }
    });

    const row = headers.map((h) => {
      const key = h.trim();
      const alias = Object.keys(ALIASES).find((k) => ALIASES[k] === key);
      const v = data[key] !== undefined ? data[key] : alias ? data[alias] : "";
      // Evita que Sheets interprete el teléfono como número/fórmula.
      return key === "Whatsapp" ? "'" + v : v;
    });

    sheet.appendRow(row);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() { return json({ ok: true, service: "feminario-leads" }); }

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
