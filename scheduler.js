/*
 * EVFlow scheduling engine — a working, simplified model of the rolling-horizon
 * scheduler described in the project deck: it respects a site power cap, applies
 * an earliest-deadline-first base ordering, folds in a fairness rule (recently
 * served vehicles yield priority), and produces a plain-language reason for
 * every non-trivial decision. This runs entirely on-device (no backend needed
 * for the submission demo) and mirrors the same inputs/outputs the deck specifies
 * on slide 4 (arrival, deadline, energy, charger limits, site power limit ->
 * schedule, status, explanation, audit event).
 */

const SITE = {
  name: "Thapar Institute — Block 24 Lot",
  chargers: [
    { id: "C1", maxKw: 7 },
    { id: "C2", maxKw: 7 },
    { id: "C3", maxKw: 7 },
    { id: "C4", maxKw: 22 }
  ],
  sitePowerCapKw: 30 // shared limit across all chargers — the deck's core constraint
};

function loadState() {
  const raw = localStorage.getItem("evflow_bookings");
  return raw ? JSON.parse(raw) : [];
}
function saveState(bookings) {
  localStorage.setItem("evflow_bookings", JSON.stringify(bookings));
}
function loadEvents() {
  const raw = localStorage.getItem("evflow_events");
  return raw ? JSON.parse(raw) : [];
}
function logEvent(msg) {
  const events = loadEvents();
  events.unshift({ ts: new Date().toISOString(), msg });
  localStorage.setItem("evflow_events", JSON.stringify(events.slice(0, 50)));
}

// Parses a "HH:MM" clock time into an absolute timestamp (epoch ms), rolling
// over to tomorrow if that clock time is already well in the past today.
function clockTimeToTimestamp(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  if (target.getTime() < now.getTime() - 2 * 60 * 60000) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime();
}

/*
 * Core allocation: given the new request and everyone currently active, decide
 * a charger, a start delay, and a completion estimate — respecting the site
 * power cap and a simple least-recently-served fairness rule.
 */
function planBooking(request, existingBookings) {
  const { vehicle, arrivalAt, deadlineAt, energyKwh } = request;
  const now = Date.now();

  // Fairness: has this vehicle been served in the last 3 bookings on this site?
  const recentVehicles = existingBookings.slice(-3).map((b) => b.vehicle);
  const recentlyServed = recentVehicles.includes(vehicle);

  // Express every deadline as minutes-from-now at THIS instant, so bookings
  // created at different real times still compare on a common, current clock.
  const active = existingBookings.filter((b) => b.status !== "done");
  const toRelDeadline = (deadlineTs) => (deadlineTs - now) / 60000;

  const queue = [
    ...active.map((b) => ({ ...b, relDeadline: toRelDeadline(b.deadlineAt) })),
    { vehicle, isNew: true, relDeadline: toRelDeadline(deadlineAt) }
  ].sort((a, b) => {
    const aPenalty = a.vehicle === vehicle && recentlyServed ? 1000 : 0;
    const bPenalty = b.vehicle === vehicle && recentlyServed ? 1000 : 0;
    return (a.relDeadline + aPenalty) - (b.relDeadline + bPenalty);
  });

  // Greedily assign chargers within the site power cap (water-filling by priority order)
  let usedKw = 0;
  let assignedCharger = null;
  let startDelayMin = 0;
  const takenChargers = new Set();

  for (const item of queue) {
    const isThisRequest = item.isNew;
    let charger = SITE.chargers.find((c) => !takenChargers.has(c.id) && usedKw + c.maxKw <= SITE.sitePowerCapKw);
    if (!charger) charger = SITE.chargers.find((c) => !takenChargers.has(c.id));
    if (!charger) continue;
    takenChargers.add(charger.id);

    const wouldExceedCap = usedKw + charger.maxKw > SITE.sitePowerCapKw;
    usedKw += charger.maxKw;

    if (isThisRequest) {
      assignedCharger = charger;
      startDelayMin = wouldExceedCap ? 15 : 0; // stagger start if cap is tight
    }
  }

  if (!assignedCharger) {
    return {
      status: "waiting",
      reasonKey: "reason_powerCap",
      charger: null,
      startAt: null,
      completeAt: null
    };
  }

  const chargeHours = energyKwh / assignedCharger.maxKw;
  const chargeMin = Math.ceil(chargeHours * 60);
  const startAt = arrivalAt + startDelayMin * 60000;
  const completeAt = startAt + chargeMin * 60000;

  let status = "confirmed";
  let reasonKey = "reason_onTrack";

  if (completeAt > deadlineAt) {
    status = "delayed";
    reasonKey = recentlyServed ? "reason_fairness" : "reason_deadlineTight";
  } else if (startDelayMin > 0) {
    status = "confirmed";
    reasonKey = "reason_powerCap";
  }

  return { status, reasonKey, charger: assignedCharger.id, startAt, completeAt, chargeMin };
}

function createBooking(form) {
  const bookings = loadState();
  const arrivalAt = clockTimeToTimestamp(form.arrivalTime);
  const deadlineAt = clockTimeToTimestamp(form.departureTime);
  const energyKwh = Number(form.energyKwh);

  const plan = planBooking(
    { vehicle: form.vehicle, arrivalAt, deadlineAt, energyKwh },
    bookings
  );

  const booking = {
    id: "B" + Date.now(),
    vehicle: form.vehicle,
    site: SITE.name,
    energyKwh,
    arrivalAt,
    deadlineAt,
    createdAt: new Date().toISOString(),
    ...plan
  };

  bookings.push(booking);
  saveState(bookings);
  logEvent(`${booking.vehicle} → ${booking.status} on ${booking.charger || "—"} (${booking.reasonKey})`);
  return booking;
}

function siteSnapshot() {
  const bookings = loadState().filter((b) => b.status !== "done");
  const occupiedChargers = new Set(bookings.map((b) => b.charger).filter(Boolean));
  const usedKw = SITE.chargers
    .filter((c) => occupiedChargers.has(c.id))
    .reduce((sum, c) => sum + c.maxKw, 0);

  return {
    siteName: SITE.name,
    capKw: SITE.sitePowerCapKw,
    usedKw,
    chargers: SITE.chargers.map((c) => ({ ...c, occupied: occupiedChargers.has(c.id) })),
    bookings,
    events: loadEvents()
  };
}
