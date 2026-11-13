/**
 * Agenda de orientación — Feminario
 * Lee los horarios libres de un calendario SOLO de orientación (distinto al de ventas),
 * crea la cita con Google Meet, invita a la persona y guarda cada lead (con puntaje) en una hoja.
 *
 * INSTALACIÓN (una sola vez, ~5 minutos):
 *  1. Crea el calendario: Google Calendar > Otros calendarios > Crear calendario nuevo > "Orientación Feminario".
 *     En su configuración copia el "ID de calendario" y pégalo abajo en CALENDARIO_ID.
 *  2. Crea una hoja de Google nueva llamada "Citas de orientación" > Extensiones > Apps Script > pega este archivo.
 *  3. A la izquierda, "Servicios" (+) > agrega "Google Calendar API" (necesario para el enlace de Meet).
 *  4. Implementar > Nueva implementación > Aplicación web > Ejecutar como: yo · Quién tiene acceso: Cualquier persona.
 *     Autoriza los permisos y copia la URL que termina en /exec.
 *  5. Pega esa URL en CONFIG.APPS_SCRIPT_URL de index.html. Cada vez que cambies este código: Implementar > Administrar > Nueva versión.
 *
 * Si quieres que el horario respete también el calendario de ventas (para no cruzar citas de la misma persona),
 * agrega su ID en BLOQUEAR_CON.
 */

const CFG = {
  CALENDARIO_ID: "PEGA_AQUI_EL_ID_DEL_CALENDARIO_DE_ORIENTACION",   // calendario propio, no el de ventas
  BLOQUEAR_CON: [],             // ej: ["ventas@feminario.co"] — solo se lee si está ocupado, no se escribe
  ZONA: "America/Bogota",
  DURACION_MIN: 15,
  DESCANSO_MIN: 0,              // minutos libres entre citas
  DIAS_ADELANTE: 21,
  AVISO_MIN_HORAS: 12,          // no se agenda con menos de 12 horas de aviso
  // Horario de atención por día de la semana (0 = domingo ... 6 = sábado). Vacío = no atiende.
  HORARIO: {
    1: [["09:00","12:00"],["14:00","17:00"]],
    2: [["09:00","12:00"],["14:00","17:00"]],
    3: [["09:00","12:00"],["14:00","17:00"]],
    4: [["09:00","12:00"],["14:00","17:00"]],
    5: [["09:00","12:00"]]
  },
  TITULO: "Cita de orientación Feminario",
  HOJA: "Citas"
};

/* ---------- Utilidades de tiempo (siempre en la zona de Colombia) ---------- */
function fechaHora_(iso, hhmm) {          // "2026-11-18","09:30" -> Date
  return Utilities.parseDate(iso + " " + hhmm, CFG.ZONA, "yyyy-MM-dd HH:mm");
}
function isoDia_(date) { return Utilities.formatDate(date, CFG.ZONA, "yyyy-MM-dd"); }
function diaSemana_(iso) { return Number(Utilities.formatDate(fechaHora_(iso, "12:00"), CFG.ZONA, "u")) % 7; } // u: 1=lun..7=dom

function ocupados_(desde, hasta) {
  const ids = [CFG.CALENDARIO_ID].concat(CFG.BLOQUEAR_CON || []);
  const out = [];
  ids.forEach(function (id) {
    const cal = CalendarApp.getCalendarById(id);
    if (!cal) return;
    cal.getEvents(desde, hasta).forEach(function (ev) {
      if (ev.getMyStatus && ev.getMyStatus() === CalendarApp.GuestStatus.NO) return;
      out.push([ev.getStartTime().getTime(), ev.getEndTime().getTime() + CFG.DESCANSO_MIN * 60000]);
    });
  });
  return out;
}

function disponibilidad_() {
  const ahora = new Date();
  const minimo = ahora.getTime() + CFG.AVISO_MIN_HORAS * 3600000;
  const desde = new Date(ahora.getTime());
  const hasta = new Date(ahora.getTime() + (CFG.DIAS_ADELANTE + 1) * 86400000);
  const oc = ocupados_(desde, hasta);
  const dias = {};
  for (let i = 0; i <= CFG.DIAS_ADELANTE; i++) {
    const iso = isoDia_(new Date(ahora.getTime() + i * 86400000));
    const bloques = CFG.HORARIO[diaSemana_(iso)] || [];
    const libres = [];
    bloques.forEach(function (b) {
      let t = fechaHora_(iso, b[0]).getTime();
      const fin = fechaHora_(iso, b[1]).getTime();
      while (t + CFG.DURACION_MIN * 60000 <= fin) {
        const t2 = t + CFG.DURACION_MIN * 60000;
        const choca = oc.some(function (o) { return t < o[1] && t2 > o[0]; });
        if (!choca && t >= minimo) libres.push(Utilities.formatDate(new Date(t), CFG.ZONA, "HH:mm"));
        t = t2;
      }
    });
    if (libres.length) dias[iso] = libres;
  }
  return dias;
}

/* ---------- Web app ---------- */
function doGet(e) {
  try {
    if (e.parameter.accion === "disponibilidad") return json_({ ok: true, dias: disponibilidad_() });
    return json_({ ok: true, mensaje: "Agenda de orientación activa" });
  } catch (err) { return json_({ ok: false, error: String(err) }); }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const d = JSON.parse(e.postData.contents);
    if (d.accion !== "reservar") return json_({ ok: false, error: "Acción no válida" });
    if (!d.email || !d.nombre || !d.fecha || !d.hora) return json_({ ok: false, error: "Faltan datos para agendar." });

    // Revalida que el horario siga libre justo antes de crear la cita
    const libres = disponibilidad_()[d.fecha] || [];
    if (libres.indexOf(d.hora) < 0) return json_({ ok: false, codigo: "ocupado", error: "Ese horario ya no está libre." });

    const ini = fechaHora_(d.fecha, d.hora);
    const fin = new Date(ini.getTime() + CFG.DURACION_MIN * 60000);
    const asistentes = [{ email: d.email }];
    if (d.invitada) asistentes.push({ email: d.invitada });

    const descripcion =
      "Lead: " + d.nombre + " · WhatsApp " + d.whatsapp + " · " + (d.ciudad || "") + "\n" +
      "Clasificación: " + String(d.nivel).toUpperCase() + " (" + d.puntaje + "/" + d.puntajeMax + " puntos)\n\n" +
      "Momento: " + d.momento + "\nMetas: " + d.metas + "\nTiempo/semana: " + d.tiempo + "\nAhorro mensual: " + d.ahorro +
      "\nPrograma Feminario: " + d.comunidad + "\nPodría invertir: " + d.inversion + "\nDecide con alguien: " + d.decide;

    // Evento con Google Meet (requiere el servicio avanzado "Google Calendar API")
    let meet = "", eventoId = "";
    try {
      const ev = Calendar.Events.insert({
        summary: CFG.TITULO + " — " + d.nombre,
        description: descripcion,
        start: { dateTime: ini.toISOString(), timeZone: CFG.ZONA },
        end: { dateTime: fin.toISOString(), timeZone: CFG.ZONA },
        attendees: asistentes,
        conferenceData: { createRequest: { requestId: Utilities.getUuid(), conferenceSolutionKey: { type: "hangoutsMeet" } } },
        reminders: { useDefault: false, overrides: [{ method: "email", minutes: 1440 }, { method: "popup", minutes: 30 }] }
      }, CFG.CALENDARIO_ID, { conferenceDataVersion: 1, sendUpdates: "all" });
      eventoId = ev.id; meet = ev.hangoutLink || "";
    } catch (errMeet) {
      // Sin el servicio avanzado: crea la cita igual (sin enlace de Meet) y la invita
      const ev2 = CalendarApp.getCalendarById(CFG.CALENDARIO_ID).createEvent(CFG.TITULO + " — " + d.nombre, ini, fin,
        { description: descripcion, guests: asistentes.map(function (a) { return a.email; }).join(","), sendInvites: true });
      eventoId = ev2.getId();
    }

    guardarFila_(d, ini, meet, eventoId);
    return json_({ ok: true, meet: meet });
  } catch (err) {
    return json_({ ok: false, error: "No pudimos agendar. " + String(err) });
  } finally { try { lock.releaseLock(); } catch (x) {} }
}

/* ---------- Hoja de leads ---------- */
const COLUMNAS = ["registrado", "cita", "nombre", "whatsapp", "email", "ciudad", "invitada", "nivel", "puntaje", "puntajeMax",
  "momento", "metas", "tiempo", "ahorro", "comunidad", "inversion", "decide", "whatsappConfirma",
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "meet", "eventoId", "estado"];

function guardarFila_(d, ini, meet, eventoId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let h = ss.getSheetByName(CFG.HOJA);
  if (!h) { h = ss.insertSheet(CFG.HOJA); h.appendRow(COLUMNAS); h.setFrozenRows(1); }
  const fila = {
    registrado: new Date(), cita: Utilities.formatDate(ini, CFG.ZONA, "yyyy-MM-dd HH:mm"), nombre: d.nombre, whatsapp: d.whatsapp,
    email: d.email, ciudad: d.ciudad, invitada: d.invitada || "", nivel: d.nivel, puntaje: d.puntaje, puntajeMax: d.puntajeMax,
    momento: d.momento, metas: d.metas, tiempo: d.tiempo, ahorro: d.ahorro, comunidad: d.comunidad, inversion: d.inversion,
    decide: d.decide, whatsappConfirma: d.confirmaWA || "", meet: meet, eventoId: eventoId, estado: "agendada"
  };
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(function (k) { fila[k] = d[k] || ""; });
  h.appendRow(COLUMNAS.map(function (c) { return fila[c] === undefined ? "" : fila[c]; }));
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** Ejecuta esta función una vez para probar que lee el calendario (menú Ejecutar > probarDisponibilidad). */
function probarDisponibilidad() { Logger.log(JSON.stringify(disponibilidad_())); }
