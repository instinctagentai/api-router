// Public comparison pages generated from the live catalog and health data. No LLM, no invented numbers.
import partners from "../partners.json";
const BASE = "https://api-router.instinctagentai.workers.dev";
const CATS = {
  llm: { title: "LLM inference APIs", task: "inference", blurb: "Hosted model APIs for chat and completion." },
  scraping: { title: "Web scraping APIs", task: "scraping", blurb: "APIs that fetch and render web pages for you." },
  proxy: { title: "Proxy networks", task: "proxy", blurb: "Rotating and residential proxy providers." },
  gpu: { title: "GPU cloud and serverless compute", task: "gpu", blurb: "GPU rentals and serverless GPU platforms." },
};
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CSS = "body{font:16px/1.5 system-ui,sans-serif;max-width:860px;margin:2rem auto;padding:0 1rem;color:#1a1a1a}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:.5rem;text-align:left;vertical-align:top}th{background:#f5f5f5}.note{background:#fff8e1;border:1px solid #f0d98c;padding:.75rem 1rem;border-radius:6px}.up{color:#0a7a2f}.down{color:#b00020}small{color:#555}";
const page = (title, desc, path, body) => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="canonical" href="${BASE}${path}"><style>${CSS}</style></head><body>${body}<hr><p><small>Machine-readable: <a href="/v1/catalog">/v1/catalog</a>, <a href="/mcp">MCP endpoint</a> (<a href="https://github.com/instinctagentai/api-router">source</a>). Free, no API key, no LLM in the request path.</small></p></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=900", "access-control-allow-origin": "*" } });
const DISCLOSURE = '<p class="note"><strong>Disclosure:</strong> some signup links below are referral links of the site operator (marked "referral link"). They may earn a commission or give you a bonus; they do not change the order of this list or the measured status. Bonus text is marked unverified unless the operator confirmed it on the provider\'s own page.</p>';
const fmt = (h) => !h ? "no data yet" : (h.is_healthy ? '<span class="up">up</span>' : '<span class="down">' + (h.rate_limited ? "rate limited" : "down or unreachable") + "</span>") + `, ${esc(h.latency_ms)} ms`;
export async function handlePages(u, env, getHealth) {
  const p = u.pathname.replace(/\/+$/, "");
  if (p === "/robots.txt") return new Response(`User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`, { headers: { "content-type": "text/plain" } });
  if (p === "/sitemap.xml") return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/compare"].concat(Object.keys(CATS).map((k) => "/compare/" + k)).map((x) => `<url><loc>${BASE}${x}</loc></url>`).join("")}</urlset>`, { headers: { "content-type": "application/xml" } });
  if (p === "/compare") {
    const li = Object.entries(CATS).map(([k, c]) => `<li><a href="/compare/${k}">${esc(c.title)}</a>: ${esc(c.blurb)}</li>`).join("");
    return page("API provider comparisons with live status | api-router", "Free-tier notes plus live uptime and latency for LLM, scraping, proxy and GPU APIs.", "/compare", `<h1>API provider comparisons with live status</h1>${DISCLOSURE}<ul>${li}</ul><p>Status and latency come from a probe that runs every 15 minutes. It checks that the provider's endpoint answers, not that the service is good or cheap.</p>`);
  }
  const m = p.match(/^\/compare\/(llm|scraping|proxy|gpu)$/);
  if (!m) return null;
  const k = m[1], c = CATS[k];
  const rows = [];
  for (const pr of partners.providers.filter((x) => x.category === k)) rows.push({ pr, h: await getHealth(env, pr.id) });
  const ok = rows.filter((r) => r.h && r.h.is_healthy).sort((a, b) => a.h.latency_ms - b.h.latency_ms);
  const best = ok[0];
  const last = rows.map((r) => r.h && r.h.last_checked_utc).filter(Boolean).sort().pop();
  const tr = rows.map(({ pr, h }) => {
    const ref = pr.referral_url && pr.referral_url !== pr.signup_url;
    const link = ref ? `<a href="${esc(pr.referral_url)}" rel="sponsored nofollow noopener">Sign up (referral link)</a>` : `<a href="${esc(pr.signup_url)}" rel="nofollow noopener">Provider site</a>`;
    return `<tr><td><strong>${esc(pr.name)}</strong></td><td>${esc(pr.pricing_note)}</td><td>${esc(pr.user_bonus_description)}${pr.bonus_verified || /unverified/i.test(pr.user_bonus_description) ? "" : " <small>(unverified)</small>"}</td><td>${fmt(h)}</td><td>${link}</td></tr>`;
  }).join("");
  const callout = best ? `<p>Lowest measured latency among providers that are up right now: <strong>${esc(best.pr.name)}</strong> (${esc(best.h.latency_ms)} ms to its API endpoint, last checked ${esc(best.h.last_checked_utc)}). Latency here is a single probe from Cloudflare's network, not a benchmark of real workloads.</p>` : "<p>No live status yet for this category. The probe runs every 15 minutes.</p>";
  return page(`${c.title} compared: free tier notes and live status | api-router`, `${c.title}: pricing model, free-tier notes and live uptime and latency, updated every 15 minutes.`, p,
    `<p><a href="/compare">All comparisons</a></p><h1>${esc(c.title)} compared</h1><p>${esc(c.blurb)} Pricing columns describe the pricing model only; we do not publish exact prices because they change and we have not verified them. Check the provider's own page before you buy.</p>${DISCLOSURE}${callout}<table><thead><tr><th>Provider</th><th>Pricing model</th><th>Free tier or bonus</th><th>Status and latency (live)</th><th>Link</th></tr></thead><tbody>${tr}</tbody></table><p><small>${last ? "Data last checked " + esc(last) + "." : ""} API: <a href="/v1/best-route?task=${c.task}">/v1/best-route?task=${c.task}</a> and <a href="/v1/health-route?category=${k}">/v1/health-route?category=${k}</a>.</small></p>`);
}
