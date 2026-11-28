import partners from "../partners.json";
import ledger from "../events.json";
import { esc, shell, slugOf } from "./answers.js";
import { BASE, J } from "./extras.js";

const DISC = 'Some signup links below are referral links of the site operator (marked "referral link"). They may earn a commission or give you a bonus. They do not change which providers we list or their order (alphabetical).';
const events = () => ledger.events.slice().sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
const FREE_RE = /\b(free|\$0)\b/i, NOT_FREE = /\bno (permanent |ongoing )?free|^pay per|free trial|trial credit/i;
const FREE = { test: (t) => FREE_RE.test(t) && !NOT_FREE.test(t) };
const isRef = (p) => p.referral_url && p.referral_url !== p.signup_url;
const priced = () => partners.providers.filter((p) => p.price_summary && p.price_source && p.price_checked);
export const KINDS = { no_free_tier_found: "No free tier found", free_tier_ended: "Free tier ended", free_tier_shrunk: "Free tier shrunk", free_tier_added: "Free tier added" };
export const replacementsFor = (e) => priced().filter((p) => p.id !== e.provider_id && p.category === e.category && FREE.test(p.price_summary)).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 5)
  .map((p) => ({ id: p.id, name: p.name, free_tier_and_limits: p.price_summary, limits_source: p.price_source, last_checked: p.price_checked, signup_url: isRef(p) ? BASE + "/go/" + p.id : p.signup_url, signup_url_is_referral: !!isRef(p), answer_page: BASE + "/answers/" + slugOf(p) }));
const withRepl = (e) => ({ ...e, page: BASE + "/alerts/" + e.provider_id, replacements: replacementsFor(e) });
export const alertPaths = () => ["/alerts"].concat([...new Set(events().map((e) => "/alerts/" + e.provider_id))]);
const xe = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const T = (b, t, extra = {}) => new Response(b, { headers: { "content-type": t, "cache-control": "public, max-age=900", "access-control-allow-origin": "*", ...extra } });
const replHtml = (e) => { const r = replacementsFor(e); return r.length ? `<p>Other providers in this category with a free tier or $0 plan in our catalog (alphabetical, not ranked; read dates shown):</p><ul>${r.map((x) => `<li><a href="/answers/${esc(slugOf(x))}">${esc(x.name)}</a>: ${esc(x.free_tier_and_limits)} (<a href="${esc(x.limits_source)}" rel="nofollow noopener">source</a>, read ${esc(x.last_checked)}). <a href="${esc(x.signup_url.replace(BASE, ""))}" rel="${x.signup_url_is_referral ? "sponsored nofollow noopener" : "nofollow noopener"}">Sign up${x.signup_url_is_referral ? " (referral link)" : ""}</a></li>`).join("")}</ul>` : "<p>No other provider in this category has a read free tier in our catalog yet.</p>"; };
const evHtml = (e) => `<h3 id="${esc(e.id)}">${esc(KINDS[e.kind] || e.kind)}: ${esc(e.provider_name)} (${esc(e.date)})</h3><p>${esc(e.summary)} Source: <a href="${esc(e.source)}" rel="nofollow noopener">${esc(e.source)}</a> (read ${esc(e.source_read)}).</p>${replHtml(e)}`;

export const rss = () => { const ev = events(); return `<?xml version="1.0" encoding="utf-8"?>\n<rss version="2.0"><channel><title>api-router: free-tier change alerts</title><link>${BASE}/alerts</link><description>Free-tier changes found by re-reading providers' own pages. Few events so far. Not a complete or real-time monitor.</description>${ev.map((e) => `<item><title>${xe((KINDS[e.kind] || e.kind) + ": " + e.provider_name)}</title><link>${BASE}/alerts/${xe(e.provider_id)}#${xe(e.id)}</link><guid isPermaLink="false">${xe(e.id)}</guid><pubDate>${new Date(e.date + "T00:00:00Z").toUTCString()}</pubDate><description>${xe(e.summary + " Source: " + e.source + " (read " + e.source_read + "). " + (replacementsFor(e).length ? "Free-tier alternatives in this category (alphabetical, some links are referral links): " + replacementsFor(e).map((x) => x.name + (x.signup_url_is_referral ? " [referral link]" : "")).join(", ") + "." : ""))}</description></item>`).join("")}</channel></rss>`; };

export async function handleAlerts(req, u, env) {
  const p = u.pathname.replace(/\/+$/, "");
  if (p === "/alerts.xml") return T(rss(), "application/rss+xml; charset=utf-8");
  if (p === "/alerts.json" || p === "/v1/alerts") return J({ note: ledger.note, disclosure: DISC, count: events().length, events: events().map(withRepl) }, 200, { "cache-control": "public, max-age=900" });
  if (p === "/v1/alerts/subscribe" && req.method === "POST") return subscribe(req, env);
  if (p === "/v1/alerts/unsubscribe" && req.method === "POST") return unsubscribe(req, env);
  if (p === "/alerts") {
    const ev = events();
    const body = `<h1>Free-tier change alerts</h1><p><strong>Short answer:</strong> this feed lists free-tier changes we found by re-reading providers' own pages. ${ev.length} event${ev.length === 1 ? "" : "s"} so far. It is not a real-time or complete monitor, and each event shows its source and read date.</p><p class="note"><strong>Disclosure:</strong> ${esc(DISC)}</p><h2>Follow</h2><ul><li>RSS: <a href="/alerts.xml">/alerts.xml</a></li><li>JSON: <a href="/alerts.json">/alerts.json</a> (also <a href="/v1/changes">/v1/changes</a> for newest and re-verified rows, <a href="/feed.xml">Atom</a>)</li><li>Webhook: POST JSON {"url":"https://your.host/path","provider":"optional-id"} to <code>/v1/alerts/subscribe</code>. We send one verification POST, then one signed POST per new event (header x-api-router-signature, HMAC-SHA256 of the body with your secret). Your secret is returned once. Stop with POST /v1/alerts/unsubscribe {"id","secret"}.</li></ul><h2>Events</h2>${ev.map(evHtml).join("") || "<p>None yet.</p>"}<h2>Ask about one provider</h2><p>Each provider has a page: <code>/alerts/&lt;provider-id&gt;</code>, for example <a href="/alerts/neon">/alerts/neon</a>.</p>`;
    return shell("Free-tier change alerts: which API free tiers ended or shrank? | api-router", "Free-tier changes found by re-reading provider pages, with source links, read dates and free alternatives. RSS, JSON and webhook.", "/alerts", body, { "@context": "https://schema.org", "@type": "CollectionPage", name: "Free-tier change alerts", url: BASE + "/alerts" });
  }
  const m = p.match(/^\/alerts\/([a-z0-9-]+)$/);
  if (m) {
    const id = m[1], x = priced().find((y) => y.id === id), evs = events().filter((e) => e.provider_id === id);
    if (!x && !evs.length) return null;
    const name = x ? x.name : evs[0].provider_name;
    const q = "Did " + name + " end or shrink its free tier?";
    let body = `<h1>${esc(q)}</h1>`;
    if (evs.length) body += `<p><strong>Short answer:</strong> ${esc(evs[0].summary)}</p><p class="note"><strong>Disclosure:</strong> ${esc(DISC)}</p>${evs.map(evHtml).join("")}`;
    else body += `<p><strong>Short answer:</strong> we have recorded no change for ${esc(name)}. Current read: ${esc(x.price_summary)}. Source: <a href="${esc(x.price_source)}" rel="nofollow noopener">${esc(x.price_source)}</a> (read ${esc(x.price_checked)}). ${x.watch && x.watch.monitored_since ? "Watched since " + esc(x.watch.monitored_since) + ", by comparing the price and limit text between reads." : ""} No event does not guarantee no change, only that none was found on the dates read.</p><p>See the full <a href="/answers/${esc(slugOf(x))}">free-tier answer</a>.</p>`;
    const res = shell(q + " | api-router", evs.length ? evs[0].summary.slice(0, 150) : `No recorded free-tier change for ${name}; current read and source included.`, p, body, null);
    if (!evs.length) { const h = new Headers(res.headers); h.set("x-robots-tag", "noindex"); return new Response(res.body, { status: 200, headers: h }); }
    return res;
  }
  return null;
}

const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sign = async (secret, body) => { const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); return hex(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(body))); };
const rnd = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
const okUrl = (s) => { try { const u = new URL(s); const h = u.hostname; return u.protocol === "https:" && (!u.port || u.port === "443") && !u.username && !u.password && h.includes(".") && !/^[\d.]+$/.test(h) && !h.includes(":") && !/(^|\.)(localhost|local|internal|lan|home|corp)$/i.test(h) && s.length <= 300; } catch { return false; } };
const post = (url, body, secret, type) => sign(secret, body).then((sig) => fetch(url, { method: "POST", redirect: "manual", headers: { "content-type": "application/json", "user-agent": "api-router-alerts", "x-api-router-signature": sig, "x-api-router-event": type }, body, signal: AbortSignal.timeout(5000) }));
async function subscribe(req, env) {
  if (!env.HEALTH) return J({ error: "storage unavailable" }, 503);
  let b; try { b = await req.json(); } catch { return J({ error: "send JSON: {\"url\":\"https://...\",\"provider\":\"optional id\"}" }, 400); }
  if (!b || !okUrl(b.url)) return J({ error: "url must be a public https URL on port 443" }, 400);
  if (b.provider && !partners.providers.some((p) => p.id === b.provider) && !ledger.events.some((e) => e.provider_id === b.provider)) return J({ error: "unknown provider id" }, 400);
  const day = new Date().toISOString().slice(0, 10), tk = "al:try:" + day, tries = parseInt((await env.HEALTH.get(tk)) || "0", 10);
  if (tries >= 20) return J({ error: "daily subscribe limit reached, try tomorrow" }, 429);
  await env.HEALTH.put(tk, String(tries + 1), { expirationTtl: 172800 });
  const subs = JSON.parse((await env.HEALTH.get("al:subs")) || "[]");
  if (subs.length >= 100) return J({ error: "subscriber limit reached" }, 503);
  if (subs.some((s) => s.url === b.url && (s.provider || "") === (b.provider || ""))) return J({ error: "already subscribed" }, 409);
  const id = rnd(6), secret = rnd(16);
  let r; try { r = await post(b.url, JSON.stringify({ type: "verification", id }), secret, "verification"); } catch { return J({ error: "verification POST failed or timed out" }, 400); }
  if (!r.ok) return J({ error: "verification POST must return HTTP 2xx", got: r.status }, 400);
  subs.push({ id, url: b.url, provider: b.provider || "", secret, sent: events().map((e) => e.id), created: day });
  await env.HEALTH.put("al:subs", JSON.stringify(subs));
  return J({ subscribed: true, id, secret, note: "Secret is shown once. Only events recorded after now are sent. Stop with POST /v1/alerts/unsubscribe {id, secret}." }, 201);
}
async function unsubscribe(req, env) {
  if (!env.HEALTH) return J({ error: "storage unavailable" }, 503);
  let b; try { b = await req.json(); } catch { return J({ error: "send JSON {id, secret}" }, 400); }
  const subs = JSON.parse((await env.HEALTH.get("al:subs")) || "[]"), s = subs.find((x) => x.id === (b && b.id));
  if (!s || s.secret !== b.secret) return J({ error: "no match" }, 404);
  await env.HEALTH.put("al:subs", JSON.stringify(subs.filter((x) => x !== s)));
  return J({ unsubscribed: true });
}
// Called from the scheduled handler. At most 3 outbound POSTs per run (free plan subrequest limit).
export async function deliverAlerts(env) {
  if (!env.HEALTH) return;
  const subs = JSON.parse((await env.HEALTH.get("al:subs")) || "[]"); if (!subs.length) return;
  let budget = 3, dirty = false;
  for (const s of subs) for (const e of events()) {
    if (budget <= 0 || s.sent.includes(e.id) || (s.provider && s.provider !== e.provider_id)) { if (!s.sent.includes(e.id) && s.provider && s.provider !== e.provider_id) { s.sent.push(e.id); dirty = true; } continue; }
    budget--; s.sent.push(e.id); dirty = true;
    try { await post(s.url, JSON.stringify({ type: "free_tier_alert", disclosure: DISC, event: withRepl(e) }), s.secret, "free_tier_alert"); } catch {}
  }
  if (dirty) await env.HEALTH.put("al:subs", JSON.stringify(subs));
}
