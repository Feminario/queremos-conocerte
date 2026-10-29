(() => {
  const cfg = window.FEMINARIO_CONFIG;

  // [iso, nombre, código]
  const COUNTRIES = [
    ["co", "Colombia", "57"], ["mx", "México", "52"], ["ar", "Argentina", "54"],
    ["cl", "Chile", "56"], ["pe", "Perú", "51"], ["ec", "Ecuador", "593"],
    ["ve", "Venezuela", "58"], ["uy", "Uruguay", "598"], ["py", "Paraguay", "595"],
    ["bo", "Bolivia", "591"], ["br", "Brasil", "55"], ["pa", "Panamá", "507"],
    ["cr", "Costa Rica", "506"], ["gt", "Guatemala", "502"], ["sv", "El Salvador", "503"],
    ["hn", "Honduras", "504"], ["ni", "Nicaragua", "505"], ["do", "Rep. Dominicana", "1"],
    ["cu", "Cuba", "53"], ["us", "Estados Unidos", "1"], ["ca", "Canadá", "1"],
    ["es", "España", "34"], ["gb", "Reino Unido", "44"], ["fr", "Francia", "33"],
    ["de", "Alemania", "49"], ["it", "Italia", "39"], ["pt", "Portugal", "351"],
    ["nl", "Países Bajos", "31"], ["ch", "Suiza", "41"], ["au", "Australia", "61"],
  ];

  const $ = (s) => document.querySelector(s);
  const form = $("#leadForm");
  const errorEl = $("#formError");
  const submitBtn = $("#submitBtn");
  let country = COUNTRIES[0];

  // ---------- Selector de país ----------
  const flag = (iso) => `https://flagcdn.com/w40/${iso}.png`;
  const ccBtn = $("#ccBtn"), ccList = $("#ccList");

  function renderCountry() {
    $("#ccFlag").src = flag(country[0]);
    $("#ccCode").textContent = "+" + country[2];
  }
  COUNTRIES.forEach((c) => {
    const li = document.createElement("li");
    li.role = "option";
    li.dataset.iso = c[0];
    li.innerHTML = `<img src="${flag(c[0])}" width="22" height="16" alt="" loading="lazy"><span>${c[1]}</span><span>+${c[2]}</span>`;
    li.addEventListener("click", () => {
      country = c; renderCountry(); toggleList(false);
      form.telefono.focus();
    });
    ccList.appendChild(li);
  });
  function toggleList(open) {
    ccList.hidden = !open;
    ccBtn.setAttribute("aria-expanded", String(open));
    [...ccList.children].forEach((li) => li.setAttribute("aria-selected", String(li.dataset.iso === country[0])));
  }
  ccBtn.addEventListener("click", () => toggleList(ccList.hidden));
  document.addEventListener("click", (e) => { if (!$("#cc").contains(e.target)) toggleList(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggleList(false); });
  renderCountry();

  // ---------- Validación ----------
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  function validate() {
    const f = form.elements;
    const bad = [];
    const mark = (el, isBad) => { el.closest(".field").classList.toggle("invalid", isBad); if (isBad) bad.push(el); };
    ["nombre", "apellido"].forEach((n) => mark(f[n], !f[n].value.trim()));
    mark(f.email, !emailOk(f.email.value.trim()));
    const digits = f.telefono.value.replace(/\D/g, "");
    mark(f.telefono, digits.length < 6 || digits.length > 12);
    mark(f.salario, !f.salario.value);
    ["meta", "inversion"].forEach((g) => {
      const none = !form.querySelector(`input[name=${g}]:checked`);
      form.querySelector(`fieldset[data-group=${g}]`).classList.toggle("invalid", none);
      if (none) bad.push(form.querySelector(`input[name=${g}]`));
    });
    return bad;
  }

  // ---------- Envío ----------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    const bad = validate();
    if (bad.length) {
      errorEl.textContent = "Revisa los campos marcados para continuar.";
      errorEl.hidden = false;
      bad[0].focus();
      return;
    }

    // Debe abrirse dentro del clic para que el navegador no bloquee la ventana.
    const win = window.open(cfg.CALENDAR_URL, "_blank");

    const f = form.elements;
    const utm = new URLSearchParams(location.search);
    const nombre = f.nombre.value.trim();
    const payload = {
      "Nombre": `${nombre} ${f.apellido.value.trim()}`,
      "Whatsapp": country[2] + f.telefono.value.replace(/\D/g, "").replace(/^0+/, ""),
      "Email": f.email.value.trim(),
      "Salario": f.salario.value,
      "¿Qué quieres lograr con tu dinero?": [...form.querySelectorAll("input[name=meta]:checked")].map((i) => i.value).join(", "),
      "¿Tienes dinero disponible para invertir?": form.querySelector("input[name=inversion]:checked").value,
      "Fecha": new Date().toISOString(),
      "Origen": cfg.ORIGEN,
      "Campaña": utm.get("utm_campaign") || "",
      "Ad Set": utm.get("utm_term") || "",
      "Anuncio": utm.get("utm_content") || "",
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando…";
    try {
      if (!cfg.SHEET_ENDPOINT) {
        console.warn("SHEET_ENDPOINT vacío: el lead no se guardó en la hoja.", payload);
      } else {
        // text/plain evita el preflight CORS que Apps Script no soporta.
        await fetch(cfg.SHEET_ENDPOINT, {
          method: "POST", mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        });
      }
    } catch (err) {
      console.error(err);
      // El calendario ya se abrió; no bloqueamos a la usuaria por un fallo de red.
    }

    $("#doneName").textContent = nombre;
    $("#formView").hidden = true;
    $("#doneView").hidden = false;
    $("#card").scrollIntoView({ behavior: "smooth", block: "start" });
    if (!win) $("#calLink").style.fontWeight = "700"; // popup bloqueado: resalta el enlace manual
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) confetti();
  });

  form.addEventListener("input", (e) => e.target.closest(".field")?.classList.remove("invalid"));

  // ---------- Confeti con formas Feminario ----------
  const COLORS = ["#ddf0a8", "#ff8a5b", "#ff9fb5", "#c3c8ff", "#f8f6ea", "#8084b0"];
  const SHAPES = (() => {
    const star = new Path2D("M0-1l.16.66.64-.24-.4.54.6.18-.62.14.3.58-.56-.34-.12.66-.12-.66-.56.34.3-.58-.62-.14.6-.18-.4-.54.64.24z");
    const pin = new Path2D("M.08-.08V-.92A.84.84 0 0 1 .92-.08ZM.08.08H.92A.84.84 0 0 1 .08.92ZM-.08.08V.92A.84.84 0 0 1-.92.08ZM-.08-.08H-.92A.84.84 0 0 1-.08-.92Z");
    const spark = new Path2D("M0-1Q.12-.12 1 0Q.12.12 0 1Q-.12.12-1 0Q-.12-.12 0-1Z");
    const dots = new Path2D();
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { dots.moveTo(i * .66 + .28, j * .66); dots.arc(i * .66, j * .66, .28, 0, Math.PI * 2); }
    const burst = new Path2D();
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; burst.moveTo(Math.cos(a) * .35, Math.sin(a) * .35); burst.lineTo(Math.cos(a), Math.sin(a)); }
    const squig = new Path2D("M-.9.5C-.9-.5.1-.9.4-.4S.2.4-.2.1.2-.9.9-.6");
    return [
      { p: star, fill: true }, { p: pin, fill: true }, { p: spark, fill: true },
      { p: dots, fill: true }, { p: burst, fill: false, w: .16 }, { p: squig, fill: false, w: .2 },
    ];
  })();

  function confetti() {
    const cv = $("#confetti"), ctx = cv.getContext("2d");
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = (cv.width = innerWidth * dpr), H = (cv.height = innerHeight * dpr);
    const rnd = (a, b) => a + Math.random() * (b - a);
    const N = innerWidth < 600 ? 70 : 120;
    const bits = Array.from({ length: N }, (_, i) => {
      const fromLeft = i % 2 === 0;
      return {
        s: SHAPES[i % SHAPES.length], c: COLORS[(i * 5 + (i >> 2)) % COLORS.length],
        x: (fromLeft ? 0.1 : 0.9) * W, y: H * 0.75,
        vx: (fromLeft ? 1 : -1) * rnd(2, 9) * dpr, vy: -rnd(9, 20) * dpr,
        r: rnd(0, 6.28), vr: rnd(-.12, .12), size: rnd(13, 30) * dpr,
      };
    });
    const t0 = performance.now();
    (function frame(t) {
      const dt = t - t0;
      ctx.clearRect(0, 0, W, H);
      const fade = dt > 3200 ? Math.max(0, 1 - (dt - 3200) / 1000) : 1;
      for (const b of bits) {
        b.vy += .38 * dpr; b.vx *= .992; b.vy *= .992;
        b.x += b.vx; b.y += b.vy; b.r += b.vr;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.scale(b.size, b.size);
        ctx.fillStyle = ctx.strokeStyle = b.c;
        if (b.s.fill) ctx.fill(b.s.p);
        else { ctx.lineWidth = b.s.w; ctx.lineCap = "round"; ctx.stroke(b.s.p); }
        ctx.restore();
      }
      if (dt < 4200) requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
    })(t0);
  }
})();
