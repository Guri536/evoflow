// EVFlow app shell — vanilla JS, no framework/build step (keeps the wrapped APK tiny).

const WHATSAPP_NUMBER = "911234567890"; // TODO: replace with the real site operator's WhatsApp number

let state = {
  view: localStorage.getItem("evflow_onboarded") ? "driver-home" : "lang-select",
  role: "driver",
  lastBooking: null
};

const root = document.getElementById("screen-content");

// Screens that feel more real with a brief "working on it" beat before landing —
// short and purposeful, not padding for its own sake.
const LOADING_COPY = {
  "driver-result": { en: "Building your schedule…", hi: "आपका शेड्यूल बन रहा है…", pa: "ਤੁਹਾਡਾ ਸ਼ਡਿਊਲ ਬਣ ਰਿਹਾ ਹੈ…", gu: "તમારું શેડ્યુલ બની રહ્યું છે…" },
  "operator": { en: "Reading site status…", hi: "साइट की स्थिति पढ़ी जा रही है…", pa: "ਸਾਈਟ ਦੀ ਸਥਿਤੀ ਪੜ੍ਹੀ ਜਾ ਰਹੀ ਹੈ…", gu: "સાઈટની સ્થિતિ વાંચાઈ રહી છે…" }
};

function showLoading(view) {
  const overlay = document.createElement("div");
  overlay.className = "loading-overlay";
  overlay.id = "loading-overlay";
  const copy = LOADING_COPY[view] ? (LOADING_COPY[view][CURRENT_LANG] || LOADING_COPY[view].en) : "";
  overlay.innerHTML = `<div class="spinner-bolt"></div>${copy ? `<div class="loading-text">${esc(copy)}</div>` : ""}`;
  document.body.appendChild(overlay);
  return overlay;
}

function go(view, opts) {
  const withLoading = opts && opts.loading;
  if (!withLoading) {
    state.view = view;
    render();
    return;
  }
  const overlay = showLoading(view);
  const delay = 420 + Math.random() * 260;
  setTimeout(() => {
    state.view = view;
    render();
    overlay.classList.add("leaving");
    setTimeout(() => overlay.remove(), 220);
  }, delay);
}

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function fmtTs(ts) {
  if (ts == null) return "—";
  const d = new Date(ts);
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

function renderTopbar() {
  document.getElementById("topbar-title").textContent = t("appName");
  document.getElementById("lang-pill").textContent = I18N[CURRENT_LANG]._label;
}

function renderLangSelect() {
  const langs = Object.keys(I18N);
  root.innerHTML = `
    <div class="screen">
      <h1>${t("chooseLanguage")}</h1>
      <div class="lang-grid" style="margin-top:20px;">
        ${langs.map(l => `<button class="lang-btn ${l === CURRENT_LANG ? "active" : ""}" data-lang="${l}">${I18N[l]._label}</button>`).join("")}
      </div>
      <button class="primary" id="lang-continue">${t("continueBtn")}</button>
    </div>`;
  root.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      setLang(btn.dataset.lang);
      renderTopbar();
      renderLangSelect();
    });
  });
  document.getElementById("lang-continue").addEventListener("click", () => go("role-select"));
}

function renderRoleSelect() {
  root.innerHTML = `
    <div class="screen stack">
      <h1>${t("appName")}</h1>
      <p class="sub">${t("tagline")}</p>
      <button class="role-card" id="pick-driver">
        <div class="rc-title">${t("roleDriver")}</div>
        <div class="rc-sub">${t("driverHomeSub")}</div>
      </button>
      <button class="role-card" id="pick-operator">
        <div class="rc-title">${t("roleOperator")}</div>
        <div class="rc-sub">${t("operatorTitle")}</div>
      </button>
    </div>`;
  document.getElementById("pick-driver").addEventListener("click", () => {
    state.role = "driver";
    localStorage.setItem("evflow_onboarded", "1");
    go("driver-home");
  });
  document.getElementById("pick-operator").addEventListener("click", () => {
    state.role = "operator";
    localStorage.setItem("evflow_onboarded", "1");
    go("operator", { loading: true });
  });
}

function renderDriverHome() {
  root.innerHTML = `
    <div class="screen stack">
      <h1>${t("driverHomeTitle")}</h1>
      <p class="sub">${t("driverHomeSub")}</p>
      <button class="primary" id="go-book">${t("newBooking")}</button>
      <button class="secondary" id="go-bookings">${t("myBookings")}</button>
      <div class="wa-block">
        <h2>${t("whatsappTitle")}</h2>
        <p>${t("whatsappBody")}</p>
        <button class="whatsapp" id="wa-generic">${t("whatsappButton")}</button>
      </div>
    </div>`;
  document.getElementById("go-book").addEventListener("click", () => go("driver-book"));
  document.getElementById("go-bookings").addEventListener("click", () => go("driver-bookings"));
  document.getElementById("wa-generic").addEventListener("click", () => {
    const msg = t("waMsgTemplate")("", SITE.name, "");
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
  });
}

function renderDriverBook() {
  const now = new Date();
  const nowStr = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
  const later = new Date(now.getTime() + 90 * 60000);
  const laterStr = String(later.getHours()).padStart(2, "0") + ":" + String(later.getMinutes()).padStart(2, "0");

  root.innerHTML = `
    <div class="screen">
      <h1>${t("newBooking")}</h1>
      <p class="sub">${esc(SITE.name)}</p>
      <div class="stack">
        <div class="field">
          <label>${t("vehicleNumber")}</label>
          <input id="f-vehicle" type="text" placeholder="PB10 AB 1234" />
        </div>
        <div class="row">
          <div class="field">
            <label>${t("arrivalTime")}</label>
            <input id="f-arrival" type="time" value="${nowStr}" />
          </div>
          <div class="field">
            <label>${t("departureDeadline")}</label>
            <input id="f-deadline" type="time" value="${laterStr}" />
          </div>
        </div>
        <div class="field">
          <label>${t("energyNeeded")}</label>
          <div class="toggle-group">
            <button type="button" class="e-mode active" data-mode="partial">${t("energyPartial")}</button>
            <button type="button" class="e-mode" data-mode="full">${t("energyFull")}</button>
          </div>
        </div>
        <div class="field" id="kwh-field">
          <label>${t("kwhLabel")}</label>
          <input id="f-kwh" type="number" min="1" max="80" value="12" />
        </div>
        <button class="primary" id="submit-booking" style="margin-top:8px;">${t("getSchedule")}</button>
        <button class="secondary" id="back-home">${t("back")}</button>
      </div>
    </div>`;

  root.querySelectorAll(".e-mode").forEach(btn => {
    btn.addEventListener("click", () => {
      root.querySelectorAll(".e-mode").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("kwh-field").style.display = btn.dataset.mode === "full" ? "none" : "flex";
      if (btn.dataset.mode === "full") document.getElementById("f-kwh").value = 40;
    });
  });

  document.getElementById("back-home").addEventListener("click", () => go("driver-home"));
  document.getElementById("submit-booking").addEventListener("click", () => {
    const vehicle = document.getElementById("f-vehicle").value.trim() || "Unregistered vehicle";
    const arrivalTime = document.getElementById("f-arrival").value || nowStr;
    const departureTime = document.getElementById("f-deadline").value || laterStr;
    const energyKwh = Number(document.getElementById("f-kwh").value) || 12;

    const booking = createBooking({ vehicle, arrivalTime, departureTime, energyKwh });
    state.lastBooking = booking;
    go("driver-result", { loading: true });
  });
}

function renderDriverResult() {
  const b = state.lastBooking;
  if (!b) { go("driver-home"); return; }

  const statusLabelKey = { confirmed: "statusConfirmed", delayed: "statusDelayed", waiting: "statusWaiting" }[b.status];

  root.innerHTML = `
    <div class="screen">
      <h1>${t("resultTitle")}</h1>
      <div class="status-banner ${b.status}">
        <div class="st-label">${esc(b.vehicle)} · ${esc(SITE.name)}</div>
        <div class="st-value">${b.status === "confirmed" ? '<span class="check-pop"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,13 9,18 20,6"/></svg></span>' : ""}${t(statusLabelKey)}</div>
      </div>
      ${b.charger ? `
      <div class="detail-row"><span class="dr-label">${t("chargerAssigned")}</span><span class="dr-value">${b.charger}</span></div>
      <div class="detail-row"><span class="dr-label">${t("expectedStart")}</span><span class="dr-value">${fmtTs(b.startAt)}</span></div>
      <div class="detail-row"><span class="dr-label">${t("expectedComplete")}</span><span class="dr-value">${fmtTs(b.completeAt)}</span></div>
      ` : ""}
      <div class="reason-box">
        <div class="rb-label">${t("reasonLabel")}</div>
        <div>${t(b.reasonKey)}</div>
      </div>
      <div class="wa-block">
        <h2>${t("confirmWhatsapp")}</h2>
        <button class="whatsapp" id="wa-confirm">${t("whatsappButton")}</button>
      </div>
      <div class="stack" style="margin-top:16px;">
        <button class="secondary" id="book-another">${t("bookAnother")}</button>
        <button class="secondary" id="view-bookings">${t("viewBookings")}</button>
      </div>
    </div>`;

  document.getElementById("wa-confirm").addEventListener("click", () => {
    const msg = t("waMsgTemplate")(b.vehicle, SITE.name, b.energyKwh);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
  });
  document.getElementById("book-another").addEventListener("click", () => go("driver-book"));
  document.getElementById("view-bookings").addEventListener("click", () => go("driver-bookings"));
}

function renderDriverBookings() {
  const bookings = loadState().slice().reverse();
  root.innerHTML = `
    <div class="screen">
      <h1>${t("bookingsTitle")}</h1>
      ${bookings.length === 0 ? `<div class="empty-state">${t("noBookings")}</div>` : bookings.map(b => `
        <div class="booking-item">
          <div class="bi-top">
            <span class="bi-vehicle">${esc(b.vehicle)}</span>
            <span class="badge ${b.status}">${t({ confirmed: "statusConfirmed", delayed: "statusDelayed", waiting: "statusWaiting" }[b.status])}</span>
          </div>
          <div class="bi-meta">${t("station")}: ${esc(SITE.name)} · ${b.charger || "—"} · ${fmtTs(b.startAt)}–${fmtTs(b.completeAt)}</div>
        </div>
      `).join("")}
      <button class="secondary" id="back-home" style="margin-top:16px;">${t("back")}</button>
    </div>`;
  document.getElementById("back-home").addEventListener("click", () => go("driver-home"));
}

function renderOperator() {
  const snap = siteSnapshot();
  const pct = Math.min(100, Math.round((snap.usedKw / snap.capKw) * 100));

  root.innerHTML = `
    <div class="screen">
      <h1>${t("operatorTitle")}</h1>
      <p class="sub">${esc(snap.siteName)}</p>

      <div class="gauge-wrap">
        <div class="st-label">${t("powerUsage")}</div>
        <div class="gauge-nums">${snap.usedKw} <span>${t("ofWord")} ${snap.capKw} ${t("kw")}</span></div>
        <div class="gauge-track"><div class="gauge-fill" style="width:${pct}%"></div></div>
      </div>

      <h2>${t("chargerOccupancy")}</h2>
      <div class="charger-grid">
        ${snap.chargers.map(c => `
          <div class="charger-tile ${c.occupied ? "occ" : ""}">
            <div class="ct-id">${c.id}</div>
            <div class="ct-kw">${c.maxKw}${t("kw")}</div>
          </div>
        `).join("")}
      </div>

      <h2>${t("currentSchedule")}</h2>
      <table class="sched-table">
        <thead><tr><th>${t("vehicle")}</th><th>${t("charger")}</th><th>${t("etaDone")}</th></tr></thead>
        <tbody>
          ${snap.bookings.length === 0 ? `<tr><td colspan="3" style="color:var(--grey);padding:14px 8px;">${t("noBookings")}</td></tr>` :
            snap.bookings.map(b => `<tr><td>${esc(b.vehicle)}</td><td>${b.charger || "—"}</td><td>${fmtTs(b.completeAt)}</td></tr>`).join("")}
        </tbody>
      </table>

      <h2>${t("eventLog")}</h2>
      ${snap.events.length === 0 ? `<div class="empty-state">${t("noAlerts")}</div>` : snap.events.slice(0, 8).map(e => `
        <div class="event-item">${esc(e.msg)}<span class="ev-ts">${new Date(e.ts).toLocaleTimeString()}</span></div>
      `).join("")}

      <button class="secondary" id="to-driver" style="margin-top:20px;">${t("switchToDriver")}</button>
    </div>`;
  document.getElementById("to-driver").addEventListener("click", () => go("driver-home"));
}

function renderFooterNav() {
  const nav = document.getElementById("footer-nav");
  if (state.view.startsWith("driver") && state.view !== "lang-select" && state.view !== "role-select") {
    nav.style.display = "flex";
    nav.innerHTML = `
      <button class="${state.view === "driver-home" || state.view === "driver-book" || state.view === "driver-result" ? "active" : ""}" id="nav-book">${t("newBooking")}</button>
      <button class="${state.view === "driver-bookings" ? "active" : ""}" id="nav-list">${t("myBookings")}</button>
      <button id="nav-op">${t("roleOperator")}</button>
    `;
    document.getElementById("nav-book").addEventListener("click", () => go("driver-home"));
    document.getElementById("nav-list").addEventListener("click", () => go("driver-bookings"));
    document.getElementById("nav-op").addEventListener("click", () => go("operator", { loading: true }));
  } else if (state.view === "operator") {
    nav.style.display = "none";
  } else {
    nav.style.display = "none";
  }
}

function render() {
  renderTopbar();
  const views = {
    "lang-select": renderLangSelect,
    "role-select": renderRoleSelect,
    "driver-home": renderDriverHome,
    "driver-book": renderDriverBook,
    "driver-result": renderDriverResult,
    "driver-bookings": renderDriverBookings,
    "operator": renderOperator
  };
  (views[state.view] || renderDriverHome)();
  const screenEl = root.querySelector(".screen");
  if (screenEl) screenEl.classList.add("screen-enter");
  renderFooterNav();
}

document.getElementById("lang-pill").addEventListener("click", () => go("lang-select"));

// Boot splash — a single deliberate entrance moment, not repeated anywhere else
const splash = document.createElement("div");
splash.className = "splash";
splash.innerHTML = `<div class="splash-bolt"></div><div class="splash-name">EVFlow</div>`;
document.body.appendChild(splash);
setTimeout(() => splash.remove(), 1500);

render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
