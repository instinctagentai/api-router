// Public comparison pages generated from the live catalog and health data. No LLM, no invented numbers.
import partners from "../partners.json";
import { HEALTH_RULE } from "./extras.js";
const BASE = "https://api-router.instinctagentai.workers.dev";
const CATS = {
  llm: { title: "LLM inference APIs", task: "inference", blurb: "Hosted model APIs for chat and completion." },
  scraping: { title: "Web scraping APIs", task: "scraping", blurb: "APIs that fetch and render web pages for you." },
  proxy: { title: "Proxy networks", task: "proxy", blurb: "Rotating and residential proxy providers." },
  gpu: { title: "GPU cloud and serverless compute", task: "gpu", blurb: "GPU rentals and serverless GPU platforms." },
  pdf: { title: "PDF APIs", task: "pdf", blurb: "APIs that fill, merge, extract and generate PDFs." },
  monitoring: { title: "Uptime monitoring", task: "monitoring", blurb: "Services that watch your site or API and alert you when it goes down." },
};
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CSS = "body{font:16px/1.5 system-ui,sans-serif;max-width:860px;margin:2rem auto;padding:0 1rem;color:#1a1a1a}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:.5rem;text-align:left;vertical-align:top}th{background:#f5f5f5}.note{background:#fff8e1;border:1px solid #f0d98c;padding:.75rem 1rem;border-radius:6px}.up{color:#0a7a2f}.down{color:#b00020}small{color:#555}.skip{position:absolute;left:-999px}.skip:focus{left:.5rem;top:.5rem;background:#fff;padding:.4rem .6rem;border:2px solid #1a1a1a}a:focus-visible{outline:3px solid #1a5fd0;outline-offset:2px}caption{text-align:left;font-weight:600;padding:.25rem 0}";
const page = (title, desc, path, body, ld) => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="canonical" href="${BASE}${path}">${path.startsWith("/compare/") ? `<link rel="alternate" type="text/markdown" href="${BASE}${path}.md">` : ""}${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>` : ""}<style>${CSS}</style></head><body><a class="skip" href="#main">Skip to main content</a><header><nav aria-label="Site"><a href="/compare">All comparisons</a> | <a href="/v1/catalog">Catalog (JSON)</a> | <a href="/mcp">MCP endpoint</a></nav></header><main id="main">${body}</main><footer><hr><p><small>Machine-readable: <a href="/v1/catalog">/v1/catalog</a>, <a href="/mcp">MCP endpoint</a> (<a href="https://github.com/instinctagentai/api-router">source</a>). Free, no API key, no LLM in the request path.</small></p></footer></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=900", "access-control-allow-origin": "*" } });
const DISCLOSURE = '<p class="note"><strong>Disclosure:</strong> some signup links below are referral links of the site operator (marked "referral link"). They may earn a commission or give you a bonus; they do not change the order of this list or the measured status. Bonus text is marked unverified unless the operator confirmed it on the provider\'s own page.</p>';
const fmt = (h) => !h ? "no data yet" : (h.is_healthy ? '<span class="up">up</span>' : '<span class="down">' + (h.rate_limited ? "rate limited" : h.state === "degraded" ? "degraded (HTTP " + esc(h.status_code) + " on probe URL)" : "down or unreachable") + "</span>") + `, ${esc(h.latency_ms)} ms`;
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
const mdPage = (c, k, d) => `# ${c.title} compared: free tier notes and live status\n\nUpdated: ${d.last || "no data yet"} (status refreshed every 15 minutes)\n\n**Short answer:** ${answer(c, d)}\n\n> Disclosure: some signup links are referral links of the site operator and are marked. They do not change the order or the measured status.\n\n| Provider | Pricing model | Entry plan price | Free tier or bonus | Status | Link |\n|---|---|---|---|---|---|\n${d.rows.map(({ pr, h }) => `| ${pr.name} | ${pr.pricing_note} | ${pr.price_summary ? pr.price_summary + " (" + pr.price_source + ", read " + pr.price_checked + ")" : "not verified"} | ${pr.user_bonus_description}${pr.bonus_verified || /unverified/i.test(pr.user_bonus_description) ? "" : " (unverified)"} | ${h ? (h.is_healthy ? "up" : h.rate_limited ? "rate limited" : h.state === "degraded" ? "degraded (HTTP " + h.status_code + " on probe URL)" : "down") + ", " + h.latency_ms + " ms" : "no data yet"} | ${pr.referral_url && pr.referral_url !== pr.signup_url ? pr.referral_url + " (referral link)" : pr.signup_url} |`).join("\n")}\n\n${FAQ(c, k, d).map(([q, a]) => `## ${q}\n\n${a}`).join("\n\n")}\n\nSource: ${BASE}/compare/${k} . Machine-readable: ${BASE}/v1/catalog\n`;
const UP = { lh: "Uptime history" };
async function uptimePage(env, wantMd) {
  const days = []; for (let i = 0; i < 7; i++) days.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  const data = await Promise.all(days.map(async (d) => { const v = env.HEALTH ? await env.HEALTH.get("d:" + d) : null; return [d, v ? JSON.parse(v) : {}]; }));
  const have = data.filter(([, o]) => Object.keys(o).length).map(([d]) => d).sort();
  const rows = partners.providers.map((pr) => { let n = 0, up = 0, lat = 0, n2 = 0, ok = 0; for (const [, o] of data) { const c = o[pr.id]; if (c) { n += c.n; up += c.up; lat += c.lat; n2 += c.n2 || 0; ok += c.ok || 0; } } return { pr, n, up, avg: n ? Math.round(lat / n) : null, pct: n ? (100 * up / n).toFixed(1) : null, n2, pct2: n2 ? (100 * ok / n2).toFixed(1) : null }; });
  const since = have.length ? have[0] : null;
  const note = since ? `Data covers UTC days ${have[0]} to ${have[have.length - 1]} (${have.length} of the last 7 days have data). Counts only include checks since we started recording history, so early figures rest on few checks.` : "History recording has just started; no data yet.";
  const meth = HEALTH_RULE + " Columns: Reachable % counts any answer below HTTP 500 that is not 429 (the rule used before 2026-11-25). Fully up % counts only HTTP 200-399 and starts on 2026-11-25; a 401 or 404 on the probe URL counts as reachable but not fully up. Latency is the average of all probes.";
  if (wantMd) return md(`# Provider uptime, last 7 days\n\n${note}\n\n${meth}\n\n| Provider | Category | Checks | Reachable % | Fully up % (checks) | Avg latency ms |\n|---|---|---|---|---|---|\n${rows.map((r) => `| ${r.pr.name} | ${r.pr.category} | ${r.n} | ${r.pct === null ? "no data" : r.pct} | ${r.pct2 === null ? "no data" : r.pct2 + " (" + r.n2 + ")"} | ${r.avg === null ? "no data" : r.avg} |`).join("\n")}\n`);
  const tr = rows.map((r) => `<tr><th scope="row">${esc(r.pr.name)}</th><td>${esc(r.pr.category)}</td><td>${r.n}</td><td>${r.pct === null ? "no data" : r.pct + "%"}</td><td>${r.pct2 === null ? "no data" : r.pct2 + "% (" + r.n2 + " checks)"}</td><td>${r.avg === null ? "no data" : r.avg + " ms"}</td></tr>`).join("");
  return page("Provider uptime, last 7 days | api-router", "Measured uptime and average latency of API providers over the last 7 days, from a probe every 15 minutes.", "/uptime", `<h1>Provider uptime, last 7 days</h1><p><strong>Short answer:</strong> ${esc(note)}</p><p><small>${esc(meth)}</small></p><table><caption>Uptime and average latency per provider</caption><thead><tr><th scope="col">Provider</th><th scope="col">Category</th><th scope="col">Checks</th><th scope="col">Reachable</th><th scope="col">Fully up</th><th scope="col">Avg latency</th></tr></thead><tbody>${tr}</tbody></table><p><small>Per-category pages: <a href="/compare">comparisons</a>.</small></p>`);
}
export async function handlePages(u, env, getHealth, req) {
  let p = u.pathname.replace(/\/+$/, "");
  const wantMd = p.endsWith(".md") || /text\/markdown/i.test((req && req.headers.get("accept")) || "");
  if (p.endsWith(".md")) p = p.slice(0, -3);
  if (p === "/uptime") return uptimePage(env, wantMd);
  if (p === "/robots.txt") return new Response(`User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`, { headers: { "content-type": "text/plain" } });
  if (p === "/sitemap.xml") return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/compare", "/uptime"].concat(Object.keys(CATS).map((k) => "/compare/" + k)).map((x) => `<url><loc>${BASE}${x}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>`).join("")}</urlset>`, { headers: { "content-type": "application/xml" } });
  if (p === "/compare") {
    const li = Object.entries(CATS).map(([k, c]) => `<li><a href="/compare/${k}">${esc(c.title)}</a>: ${esc(c.blurb)}</li>`).join("");
    if (wantMd) return md(`# API provider comparisons with live status\n\n${Object.entries(CATS).map(([k, c]) => `- ${c.title}: ${BASE}/compare/${k}`).join("\n")}\n\nStatus and latency come from a probe that runs every 15 minutes. Some signup links are referral links and are marked.\n`);
    return page("API provider comparisons with live status | api-router", "Free-tier notes plus live uptime and latency for LLM, scraping, proxy and GPU APIs.", "/compare", `<h1>API provider comparisons with live status</h1><p><strong>Short answer:</strong> pick a category below. Each page lists providers with their pricing model, free-tier notes and a live up/down and latency reading refreshed every 15 minutes.</p>${DISCLOSURE}<ul aria-label="Comparison categories">${li}</ul><p>The probe checks that the provider's endpoint answers. It does not measure real workloads, price or quality.</p>`);
  }
  const m = p.match(/^\/compare\/(llm|scraping|proxy|gpu|pdf|monitoring)$/);
  if (!m) return null;
  const k = m[1], c = CATS[k];
  const d = await load(env, getHealth, k);
  if (wantMd) return md(mdPage(c, k, d));
  const tr = d.rows.map(({ pr, h }) => {
    const ref = pr.referral_url && pr.referral_url !== pr.signup_url;
    const link = ref ? `<a href="${esc(pr.referral_url)}" rel="sponsored nofollow noopener" aria-label="Sign up for ${esc(pr.name)} (referral link)">Sign up (referral link)</a>` : `<a href="${esc(pr.signup_url)}" rel="nofollow noopener" aria-label="${esc(pr.name)} provider site">Provider site</a>`;
    return `<tr><th scope="row">${esc(pr.name)}</th><td>${esc(pr.pricing_note)}</td><td>${pr.price_summary ? `${esc(pr.price_summary)} <small>(<a href="${esc(pr.price_source)}" rel="nofollow noopener">source</a>, read ${esc(pr.price_checked)})</small>` : "not verified"}</td><td>${esc(pr.user_bonus_description)}${pr.bonus_verified || /unverified/i.test(pr.user_bonus_description) ? "" : " <small>(unverified)</small>"}</td><td>${fmt(h)}</td><td>${link}</td></tr>`;
  }).join("");
  const faq = FAQ(c, k, d).map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("");
  const title = `${c.title} compared: free tier notes and live status | api-router`;
  const ld = { "@context": "https://schema.org", "@type": "WebPage", name: `${c.title} compared`, url: BASE + p, dateModified: d.last || undefined, description: `${c.title}: pricing model, free-tier notes and live uptime and latency, updated every 15 minutes.`, mainEntity: { "@type": "ItemList", itemListElement: d.rows.map(({ pr }, i) => ({ "@type": "ListItem", position: i + 1, name: pr.name, url: pr.signup_url })) } };
  return page(title, `${c.title}: pricing model, free-tier notes and live uptime and latency, updated every 15 minutes.`, p,
    `<h1>${esc(c.title)} compared</h1><p><strong>Short answer:</strong> ${esc(answer(c, d))}</p><p><small>${d.last ? `Updated <time datetime="${esc(d.last)}">${esc(d.last)}</time>` : ""} (status refreshed every 15 minutes). Entry plan prices are copied from each provider's own pricing page on the date shown and change often; providers without a price are marked "not verified". Plans are not directly comparable, so we make no "cheapest" claim.</small></p>${DISCLOSURE}<table><caption>${esc(c.title)}: pricing model, free tier notes and live status</caption><thead><tr><th scope="col">Provider</th><th scope="col">Pricing model</th><th scope="col">Entry plan price (source, date)</th><th scope="col">Free tier or bonus</th><th scope="col">Status and latency (live)</th><th scope="col">Link</th></tr></thead><tbody>${tr}</tbody></table><section aria-labelledby="faq"><h2 id="faq">Common questions</h2>${faq}</section><p><small>API: <a href="/v1/best-route?task=${c.task}">/v1/best-route?task=${c.task}</a> and <a href="/v1/health-route?category=${k}">/v1/health-route?category=${k}</a>. Plain-text version: <a href="${p}.md">${p}.md</a>.</small></p>`, ld);
}
