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
const page = (title, desc, path, body, ld) => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="canonical" href="${BASE}${path}">${path.startsWith("/compare/") ? `<link rel="alternate" type="text/markdown" href="${BASE}${path}.md">` : ""}${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>` : ""}<style>${CSS}</style></head><body>${body}<hr><p><small>Machine-readable: <a href="/v1/catalog">/v1/catalog</a>, <a href="/mcp">MCP endpoint</a> (<a href="https://github.com/instinctagentai/api-router">source</a>). Free, no API key, no LLM in the request path.</small></p></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=900", "access-control-allow-origin": "*" } });
const DISCLOSURE = '<p class="note"><strong>Disclosure:</strong> some signup links below are referral links of the site operator (marked "referral link"). They may earn a commission or give you a bonus; they do not change the order of this list or the measured status. Bonus text is marked unverified unless the operator confirmed it on the provider\'s own page.</p>';
const fmt = (h) => !h ? "no data yet" : (h.is_healthy ? '<span class="up">up</span>' : '<span class="down">' + (h.rate_limited ? "rate limited" : "down or unreachable") + "</span>") + `, ${esc(h.latency_ms)} ms`;
const md = (text) => new Response(text, { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=900", "access-control-allow-origin": "*" } });
async function load(env, getHealth, k) {
  const list = partners.providers.filter((x) => x.category === k);
  const hs = await Promise.all(list.map((pr) => getHealth(env, pr.id)));
  const rows = list.map((pr, i) => ({ pr, h: hs[i] }));
  const ok = rows.filter((r) => r.h && r.h.is_healthy).sort((a, b) => a.h.latency_ms - b.h.latency_ms);
  const last = rows.map((r) => r.h && r.h.last_checked_utc).filter(Boolean).sort().pop();
  return { rows, best: ok[0], last, upCount: ok.length };
}
const answer = (c, d) => d.best ? `Right now ${d.best.pr.name} has the lowest measured latency among the ${d.upCount} ${c.title.toLowerCase()} we check that are up (${d.best.h.latency_ms} ms to its API endpoint, checked ${d.best.h.last_checked_utc}). This is one probe from Cloudflare's network, not a benchmark of real workloads, and it says nothing about price or quality.` : `We have no live status yet for ${c.title.toLowerCase()}. The probe runs every 15 minutes.`;
const FAQ = (c, k, d) => [
  [`Which ${c.title.toLowerCase()} are up and fastest right now?`, answer(c, d)],
  [`Do these ${c.title.toLowerCase()} have a free tier?`, d.rows.map(({ pr }) => `${pr.name}: ${pr.user_bonus_description}${pr.bonus_verified || /unverified/i.test(pr.user_bonus_description) ? "" : " (unverified)"}`).join(". ") + ". Check each provider's own page before you rely on it."],
  ["How is status and latency measured?", "A scheduled Cloudflare Worker sends one HEAD request to each provider's endpoint every 15 minutes and stores the status code and response time. A provider counts as up if it answers with a status below 500 and not 429. It does not test real workloads."],
  ["Are there affiliate or referral links?", "Yes. Some signup links are referral links of the site operator and are marked as such. They do not change the order of the list or the measured status."],
  ["Can an AI agent use this data directly?", `Yes. Use https://api-router.instinctagentai.workers.dev/v1/best-route?task=${c.task} and /v1/health-route?category=${k}, or the MCP server at https://api-router.instinctagentai.workers.dev/mcp. No API key needed.`],
];
const mdPage = (c, k, d) => `# ${c.title} compared: free tier notes and live status\n\nUpdated: ${d.last || "no data yet"} (status refreshed every 15 minutes)\n\n**Short answer:** ${answer(c, d)}\n\n> Disclosure: some signup links are referral links of the site operator and are marked. They do not change the order or the measured status.\n\n| Provider | Pricing model | Free tier or bonus | Status | Link |\n|---|---|---|---|---|\n${d.rows.map(({ pr, h }) => `| ${pr.name} | ${pr.pricing_note} | ${pr.user_bonus_description}${pr.bonus_verified || /unverified/i.test(pr.user_bonus_description) ? "" : " (unverified)"} | ${h ? (h.is_healthy ? "up" : h.rate_limited ? "rate limited" : "down") + ", " + h.latency_ms + " ms" : "no data yet"} | ${pr.referral_url && pr.referral_url !== pr.signup_url ? pr.referral_url + " (referral link)" : pr.signup_url} |`).join("\n")}\n\n${FAQ(c, k, d).map(([q, a]) => `## ${q}\n\n${a}`).join("\n\n")}\n\nSource: ${BASE}/compare/${k} . Machine-readable: ${BASE}/v1/catalog\n`;
export async function handlePages(u, env, getHealth, req) {
  let p = u.pathname.replace(/\/+$/, "");
  const wantMd = p.endsWith(".md") || /text\/markdown/i.test((req && req.headers.get("accept")) || "");
  if (p.endsWith(".md")) p = p.slice(0, -3);
  if (p === "/robots.txt") return new Response(`User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`, { headers: { "content-type": "text/plain" } });
  if (p === "/sitemap.xml") return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/compare"].concat(Object.keys(CATS).map((k) => "/compare/" + k)).map((x) => `<url><loc>${BASE}${x}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>`).join("")}</urlset>`, { headers: { "content-type": "application/xml" } });
  if (p === "/compare") {
    const li = Object.entries(CATS).map(([k, c]) => `<li><a href="/compare/${k}">${esc(c.title)}</a>: ${esc(c.blurb)}</li>`).join("");
    if (wantMd) return md(`# API provider comparisons with live status\n\n${Object.entries(CATS).map(([k, c]) => `- ${c.title}: ${BASE}/compare/${k}`).join("\n")}\n\nStatus and latency come from a probe that runs every 15 minutes. Some signup links are referral links and are marked.\n`);
    return page("API provider comparisons with live status | api-router", "Free-tier notes plus live uptime and latency for LLM, scraping, proxy and GPU APIs.", "/compare", `<h1>API provider comparisons with live status</h1><p><strong>Short answer:</strong> pick a category below. Each page lists providers with their pricing model, free-tier notes and a live up/down and latency reading refreshed every 15 minutes.</p>${DISCLOSURE}<ul>${li}</ul><p>The probe checks that the provider's endpoint answers. It does not measure real workloads, price or quality.</p>`);
  }
  const m = p.match(/^\/compare\/(llm|scraping|proxy|gpu)$/);
  if (!m) return null;
  const k = m[1], c = CATS[k];
  const d = await load(env, getHealth, k);
  if (wantMd) return md(mdPage(c, k, d));
  const tr = d.rows.map(({ pr, h }) => {
    const ref = pr.referral_url && pr.referral_url !== pr.signup_url;
    const link = ref ? `<a href="${esc(pr.referral_url)}" rel="sponsored nofollow noopener">Sign up (referral link)</a>` : `<a href="${esc(pr.signup_url)}" rel="nofollow noopener">Provider site</a>`;
    return `<tr><td><strong>${esc(pr.name)}</strong></td><td>${esc(pr.pricing_note)}</td><td>${esc(pr.user_bonus_description)}${pr.bonus_verified || /unverified/i.test(pr.user_bonus_description) ? "" : " <small>(unverified)</small>"}</td><td>${fmt(h)}</td><td>${link}</td></tr>`;
  }).join("");
  const faq = FAQ(c, k, d).map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("");
  const title = `${c.title} compared: free tier notes and live status | api-router`;
  const ld = { "@context": "https://schema.org", "@type": "WebPage", name: `${c.title} compared`, url: BASE + p, dateModified: d.last || undefined, description: `${c.title}: pricing model, free-tier notes and live uptime and latency, updated every 15 minutes.`, mainEntity: { "@type": "ItemList", itemListElement: d.rows.map(({ pr }, i) => ({ "@type": "ListItem", position: i + 1, name: pr.name, url: pr.signup_url })) } };
  return page(title, `${c.title}: pricing model, free-tier notes and live uptime and latency, updated every 15 minutes.`, p,
    `<p><a href="/compare">All comparisons</a></p><h1>${esc(c.title)} compared</h1><p><strong>Short answer:</strong> ${esc(answer(c, d))}</p><p><small>${d.last ? `Updated <time datetime="${esc(d.last)}">${esc(d.last)}</time>` : ""} (status refreshed every 15 minutes). Pricing columns describe the pricing model only; we do not publish exact prices because they change and we have not verified them.</small></p>${DISCLOSURE}<table><thead><tr><th>Provider</th><th>Pricing model</th><th>Free tier or bonus</th><th>Status and latency (live)</th><th>Link</th></tr></thead><tbody>${tr}</tbody></table><h2>Common questions</h2>${faq}<p><small>API: <a href="/v1/best-route?task=${c.task}">/v1/best-route?task=${c.task}</a> and <a href="/v1/health-route?category=${k}">/v1/health-route?category=${k}</a>. Plain-text version: <a href="${p}.md">${p}.md</a>.</small></p>`, ld);
}
