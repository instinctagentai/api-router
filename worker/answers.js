// Question pages and a free-tier cheat sheet, generated only from partners.json (verified fields, dated, source-linked). No LLM, no invented numbers.
import partners from "../partners.json";
const BASE = "https://api-router.instinctagentai.workers.dev";
export const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CSS = "body{font:16px/1.5 system-ui,sans-serif;max-width:860px;margin:2rem auto;padding:0 1rem;color:#1a1a1a}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:.5rem;text-align:left;vertical-align:top}th{background:#f5f5f5}.note{background:#fff8e1;border:1px solid #f0d98c;padding:.75rem 1rem;border-radius:6px}.up{color:#0a7a2f}.down{color:#b00020}small{color:#555}.skip{position:absolute;left:-999px}.skip:focus{left:.5rem;top:.5rem;background:#fff;padding:.4rem .6rem;border:2px solid #1a1a1a}a:focus-visible{outline:3px solid #1a5fd0;outline-offset:2px}caption{text-align:left;font-weight:600;padding:.25rem 0}";
const DISC = 'Some signup links on this page are referral links of the site operator (marked "referral link"). They may earn a commission or give you a bonus. They do not change what we report.';
const withPrice = () => partners.providers.filter((p) => p.price_summary && p.price_source && p.price_checked);
export const slugOf = (p) => p.id + "-free-tier-and-pricing";
export const answerPaths = () => ["/free-tiers"].concat(withPrice().map((p) => "/answers/" + slugOf(p)));
const ageDays = (d) => Math.floor((Date.now() - Date.parse(d + "T00:00:00Z")) / 86400000);
const stale = (p) => ageDays(p.price_checked) > 14 ? ` This was read ${ageDays(p.price_checked)} days ago and may be out of date.` : "";
const isRef = (p) => p.referral_url && p.referral_url !== p.signup_url;
const bonus = (p) => p.bonus_verified ? p.user_bonus_description : `We have not verified a free tier or signup credit for ${p.name} beyond what is stated above. Check the provider's own page.`;
const state = (h) => !h ? "no live status yet" : h.is_healthy ? `up, ${h.latency_ms} ms (checked ${h.last_checked_utc})` : `${h.rate_limited ? "rate limited" : h.state === "degraded" ? "degraded (HTTP " + h.status_code + " on the probe URL)" : "down or unreachable"}, ${h.latency_ms} ms (checked ${h.last_checked_utc})`;
export const shell = (title, desc, path, body, ld) => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="canonical" href="${BASE}${path}"><link rel="alternate" type="text/markdown" href="${BASE}${path}.md">${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>` : ""}<style>${CSS}</style></head><body><a class="skip" href="#main">Skip to main content</a><header><nav aria-label="Site"><a href="/free-tiers">Free-tier cheat sheet</a> | <a href="/compare">All comparisons</a> | <a href="/v1/catalog">Catalog (JSON)</a> | <a href="/mcp">MCP endpoint</a></nav></header><main id="main">${body}</main><footer><hr><p><small>Free, no API key, no LLM in the request path. <a href="https://github.com/instinctagentai/api-router">Source</a>.</small></p></footer></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=900", "access-control-allow-origin": "*" } });
export const mdRes = (t) => new Response(t, { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=900", "access-control-allow-origin": "*" } });
const qa = (p) => {
  const q = `What is ${p.name}'s free tier, pricing and rate limits?`;
  const a = `${p.price_summary}. Source: ${p.price_source} (read ${p.price_checked}).${stale(p)} ${bonus(p)}`;
  return [q, a];
};
export async function handleAnswers(u, env, getHealth, req) {
  let p = u.pathname.replace(/\/+$/, "");
  const wantMd = p.endsWith(".md") || /text\/markdown/i.test((req && req.headers.get("accept")) || "");
  if (p.endsWith(".md")) p = p.slice(0, -3);
  const list = withPrice();
  if (p === "/free-tiers") {
    const hs = await Promise.all(list.map((x) => getHealth(env, x.id)));
    const dates = list.map((x) => x.price_checked).sort();
    const oldest = dates[0], newest = dates[dates.length - 1];
    const short = `Free-tier and pricing facts for ${list.length} API providers, each copied from the provider's own page on the date shown (oldest read ${oldest}, newest ${newest}). Providers with no verified price are left out. Plans are not comparable one to one, so we make no "cheapest" claim.`;
    if (wantMd) return mdRes(`# API free tiers, prices and limits (cheat sheet)\n\n**Short answer:** ${short}\n\n> Disclosure: ${DISC}\n\n| Provider | Free tier, price and limits | Source (read date) | Live status | Link |\n|---|---|---|---|---|\n${list.map((x, i) => `| [${x.name}](${BASE}/answers/${slugOf(x)}) | ${x.price_summary}${x.bonus_verified ? ". " + x.user_bonus_description : ""} | ${x.price_source} (${x.price_checked}) | ${state(hs[i])} | ${isRef(x) ? x.referral_url + " (referral link)" : x.signup_url} |`).join("\n")}\n\nProviders change prices often. Check the source before you rely on a number. Data: ${BASE}/v1/catalog\n`);
    const tr = list.map((x, i) => `<tr><th scope="row"><a href="/answers/${slugOf(x)}">${esc(x.name)}</a></th><td>${esc(x.price_summary)}${x.bonus_verified ? "<br><small>" + esc(x.user_bonus_description) + "</small>" : ""}</td><td><a href="${esc(x.price_source)}" rel="nofollow noopener">source</a> <small>(read ${esc(x.price_checked)})</small></td><td>${esc(state(hs[i]))}</td><td>${isRef(x) ? `<a href="${esc(x.referral_url)}" rel="sponsored nofollow noopener" aria-label="Sign up for ${esc(x.name)} (referral link)">Sign up (referral link)</a>` : `<a href="${esc(x.signup_url)}" rel="nofollow noopener">Provider site</a>`}</td></tr>`).join("");
    return shell("API free tiers, prices and limits: cheat sheet | api-router", `Verified free tiers, prices and rate limits for ${list.length} API providers, with source links and read dates.`, "/free-tiers",
      `<h1>API free tiers, prices and limits (cheat sheet)</h1><p><strong>Short answer:</strong> ${esc(short)}</p><p class="note"><strong>Disclosure:</strong> ${esc(DISC)}</p><table><caption>Free tier, price and limits per provider</caption><thead><tr><th scope="col">Provider</th><th scope="col">Free tier, price and limits</th><th scope="col">Source (read date)</th><th scope="col">Live status</th><th scope="col">Link</th></tr></thead><tbody>${tr}</tbody></table><p><small>Prices and limits change often. Each row shows the date we read the provider's page. Plain-text version: <a href="/free-tiers.md">/free-tiers.md</a>.</small></p>`,
      { "@context": "https://schema.org", "@type": "WebPage", name: "API free tiers, prices and limits", url: BASE + "/free-tiers", dateModified: newest });
  }
  const m = p.match(/^\/answers\/([a-z0-9-]+)-free-tier-and-pricing$/);
  if (!m) return null;
  const x = list.find((y) => y.id === m[1]);
  if (!x) return null;
  const [q, a] = qa(x);
  const h = await getHealth(env, x.id);
  const others = list.filter((y) => y.id !== x.id && y.category === x.category);
  if (wantMd) return mdRes(`# ${q}\n\n**Short answer:** ${a}\n\n> Disclosure: ${DISC}\n\nLive status of ${x.name}'s API endpoint: ${state(h)}. One HEAD request every 15 minutes, not a test of real workloads. See ${BASE}/uptime for the rule.\n\nSign up: ${isRef(x) ? x.referral_url + " (referral link)" : x.signup_url}\n\n${others.length ? "Same category: " + others.map((y) => `${y.name} ${BASE}/answers/${slugOf(y)}`).join(", ") + "\n\n" : ""}All providers: ${BASE}/free-tiers\n`);
  const link = isRef(x) ? `<a href="${esc(x.referral_url)}" rel="sponsored nofollow noopener" aria-label="Sign up for ${esc(x.name)} (referral link)">Sign up for ${esc(x.name)} (referral link)</a>` : `<a href="${esc(x.signup_url)}" rel="nofollow noopener">${esc(x.name)} site</a>`;
  return shell(`${x.name} free tier, pricing and limits | api-router`, `${x.name}: ${x.price_summary}. Source and read date included.`, p,
    `<h1>${esc(q)}</h1><p><strong>Short answer:</strong> ${esc(x.price_summary)}. Source: <a href="${esc(x.price_source)}" rel="nofollow noopener">${esc(x.price_source)}</a> (read ${esc(x.price_checked)}).${esc(stale(x))} ${esc(bonus(x))}</p><p class="note"><strong>Disclosure:</strong> ${esc(DISC)}</p><p>Live status of ${esc(x.name)}'s API endpoint: ${esc(state(h))}. This is one HEAD request every 15 minutes, not a test of real workloads. <a href="/uptime">How we rate status</a>.</p><p>${link}</p><p><small>Prices change often, so check the source before you rely on a number. ${others.length ? "Same category: " + others.map((y) => `<a href="/answers/${slugOf(y)}">${esc(y.name)}</a>`).join(", ") + ". " : ""}All providers: <a href="/free-tiers">free-tier cheat sheet</a>. Plain-text version: <a href="${p}.md">${p}.md</a>.</small></p>`,
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } }] });
}
