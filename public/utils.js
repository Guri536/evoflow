function normalizePhone(input) {
  let d = String(input || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? "91" + d : null;
}
function fmtPhone(p) {
  return p && p.length === 12 ? `+91 ${p.slice(2, 7)} ${p.slice(7)}` : p || "";
}
