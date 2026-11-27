import { REFRESH_MIN } from "./extras.js";
// Question pages and a free-tier cheat sheet, generated only from partners.json (verified fields, dated, source-linked). No LLM, no invented numbers.
import partners from "../partners.json";
const BASE = "https://api-router.instinctagentai.workers.dev";
export const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CSS = "body{font:16px/1.5 system-ui,sans-serif;max-width:860px;margin:2rem auto;padding:0 1rem;color:#1a1a1a}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:.5rem;text-align:left;vertical-align:top}th{background:#f5f5f5}.note{background:#fff8e1;border:1px solid #f0d98c;padding:.75rem 1rem;border-radius:6px}.up{color:#0a7a2f}.down{color:#b00020}small{color:#555}.skip{position:absolute;left:-999px}.skip:focus{left:.5rem;top:.5rem;background:#fff;padding:.4rem .6rem;border:2px solid #1a1a1a}a:focus-visible{outline:3px solid #1a5fd0;outline-offset:2px}caption{text-align:left;font-weight:600;padding:.25rem 0}";
const DISC = 'Some signup links on this page are referral links of the site operator (marked "referral link"). They may earn a commission or give you a bonus. They do not change what we report. We count clicks on these links per provider, with no IP, cookie or identity stored.';
const withPrice = () => partners.providers.filter((p) => p.price_summary && p.price_source && p.price_checked);
export const slugOf = (p) => p.id + "-free-tier-and-pricing";
export const answerPaths = () => ["/free-tiers"].concat(withPrice().map((p) => "/answers/" + slugOf(p)));
const ageDays = (d) => Math.floor((Date.now() - Date.parse(d + "T00:00:00Z")) / 86400000);
const stale = (p) => ageDays(p.price_checked) > 14 ? ` This was read ${ageDays(p.price_checked)} days ago and may be out of date.` : "";
const isRef = (p) => p.referral_url && p.referral_url !== p.signup_url;
const bonus = (p) => p.bonus_verified ? p.user_bonus_description : `We have not verified a free tier or signup credit for ${p.name} beyond what is stated above. Check the provider's own page.`;
const state = (h) => !h ? "no live status yet" : h.is_healthy ? `up, ${h.latency_ms} ms (checked ${h.last_checked_utc})` : `${h.rate_limited ? "rate limited" : h.state === "degraded" ? "degraded (HTTP " + h.status_code + " on the probe URL)" : "down or unreachable"}, ${h.latency_ms} ms (checked ${h.last_checked_utc})`;
export const shell = (title, desc, path, body, ld) => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="canonical" href="${BASE}${path}"><link rel="alternate" type="text/markdown" href="${BASE}${path}.md">${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>` : ""}<link rel="icon" href="/logo.png" type="image/png"><meta property="og:site_name" content="Instinct Agent AI"><meta property="og:image" content="${BASE}/logo.png"><style>${CSS}</style></head><body><a class="skip" href="#main">Skip to main content</a><header><nav aria-label="Site"><a href="/" style="display:inline-flex;align-items:center;gap:.5rem;font-weight:700;text-decoration:none"><img src="/logo.png" width="28" height="28" alt="Instinct Agent AI logo">Instinct Agent AI</a> | <a href="/free-tiers">Free-tier cheat sheet</a> | <a href="/compare">All comparisons</a> | <a href="/v1/catalog">Catalog (JSON)</a> | <a href="/mcp">MCP endpoint</a></nav></header><main id="main">${body}</main><footer><hr><p><small>Free, no API key, no LLM in the request path. <a href="https://github.com/instinctagentai/api-router">Source</a>.</small></p></footer></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=900", "access-control-allow-origin": "*" } });
export const mdRes = (t) => new Response(t, { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=900", "access-control-allow-origin": "*" } });
const qa = (p) => {
  const q = (/free|no card|\$0/i.test(p.price_summary || "") && !/^no free/i.test(p.price_summary || "")) ? `Is ${p.name}'s free tier still free in 2026? What are the limits?` : `Does ${p.name} have a free tier in 2026?`;
  const a = `${p.price_summary}. Source: ${p.price_source} (read ${p.price_checked}).${stale(p)} ${bonus(p)}`;
  return [q, a];
};

const BEST = [
  { slug: "free-llm-api", cat: "llm", title: "Free LLM APIs compared (2026): limits and prices", q: "Which LLM API has a free tier?", intro: "LLM inference APIs we check" },
  { slug: "free-gpu-cloud", cat: "gpu", title: "Free GPU cloud options compared (2026)", q: "Is there a free GPU cloud for developers?", intro: "GPU clouds we check" },
  { slug: "web-scraping-api", cat: "scraping", title: "Web scraping APIs compared (2026): free plans and prices", q: "Which web scraping API has a free plan, and what do the paid plans cost?", intro: "scraping APIs we check" },
  { slug: "pdf-api", cat: "pdf", title: "PDF APIs compared (2026): free plans and prices", q: "Which PDF API has a free plan?", intro: "PDF APIs we check" },
  { slug: "free-uptime-monitoring", cat: "monitoring", title: "Uptime monitoring services compared (2026): free plans", q: "Which uptime monitoring service has a free plan?", intro: "uptime monitors we check" },
  { slug: "free-database", cat: "database", title: "Free databases for apps compared (2026): Postgres and Redis free plans", q: "Which hosted database has a free plan?", intro: "hosted databases we check" },
  { slug: "free-auth", cat: "auth", title: "Auth providers compared (2026): free plans", q: "Which auth service has a free plan?", intro: "auth services we check" },
  { slug: "free-app-hosting", cat: "hosting", title: "App hosting compared (2026): free plans and trials", q: "Where can I host an app for free?", intro: "hosting services we check" },
  { slug: "free-speech-api", cat: "speech", title: "Speech APIs compared (2026): free credits and plans", q: "Which speech to text or text to speech API has a free tier?", intro: "speech APIs we check" },
  { slug: "free-object-storage", cat: "storage", title: "Object storage compared (2026): free allowances", q: "Which object storage has a free tier?", intro: "storage services we check" },
  { slug: "free-search-api", cat: "search", title: "Search APIs for AI agents compared (2026): free plans", q: "Which search API for AI agents has a free plan?", intro: "search APIs we check" },
  { slug: "free-vector-database", cat: "vector_db", title: "Vector databases compared (2026): free plans", q: "Which vector database has a free plan?", intro: "vector databases we check" },
  { slug: "free-email-api", cat: "email", title: "Email APIs compared (2026): free plans", q: "Which transactional email API has a free plan?", intro: "email APIs we check" },
  { slug: "free-ocr-api", cat: "ocr", title: "OCR APIs compared (2026): free plans", q: "Which OCR API has a free plan?", intro: "OCR APIs we check" },
  { slug: "free-embeddings-api", cat: "embeddings", title: "Embeddings and rerank APIs compared (2026): free keys", q: "Which embeddings API has a free tier?", intro: "embeddings APIs we check" },
  { slug: "free-image-api", cat: "image", title: "Image generation APIs compared (2026): free credits", q: "Which image generation API has free credits?", intro: "image APIs we check" },
  { slug: "free-analytics", cat: "analytics", title: "Product analytics compared (2026): free plans", q: "Which product analytics tool has a free plan?", intro: "analytics tools we check" },
  { slug: "free-error-monitoring", cat: "error_monitoring", title: "Error monitoring compared (2026): free plans", q: "Which error monitoring tool has a free plan?", intro: "error monitoring tools we check" },
  { slug: "free-ci-cd", cat: "ci", title: "CI/CD services compared (2026): free plans", q: "Which CI/CD service has a free plan?", intro: "CI/CD services we check" },
  { slug: "free-form-backend", cat: "forms", title: "Form backends compared (2026): free plans for static sites", q: "Which form backend has a free plan?", intro: "form backends we check" },
  { slug: "free-message-queue", cat: "queue", title: "Message queues and schedulers compared (2026): free plans", q: "Which serverless message queue has a free plan?", intro: "message queues we check" },
  { slug: "free-stack-for-vibe-coded-apps", cats: ["hosting", "database", "auth", "email", "llm", "storage", "search", "analytics", "error_monitoring", "queue", "image", "forms", "maps", "cms", "backend", "background_jobs", "realtime", "notifications"], title: "Which free APIs and services should my vibe-coded app use? (2026)", q: "Which free API should my vibe-coded app use?", intro: "services we check for vibe-coded apps", prompts: true },
];
const FREE_IDS = new Set(["stytch", "kinde", "geoapify", "pexels", "pdflayer", "screenshotlayer", "weatherstack", "mailboxlayer", "numverify", "formspree", "web3forms", "backblaze-b2", "cloudflare-vectorize", "scrapestack", "serpstack", "mediastack", "positionstack", "ipapi", "grafana-cloud", "checkly", "healthchecks", "cloudflare-queues", "scrapingdog", "mixedbread", "circleci", "github-actions", "cloudflare-cdn", "openrouter", "firecrawl", "modal", "pdfops", "uptimerobot", "gemini", "cloudflare-workers-ai", "cerebras", "supabase", "neon", "upstash-redis", "pinecone", "resend", "tavily", "cohere", "deepgram", "assemblyai", "elevenlabs", "ocrspace", "huggingface-spaces", "vercel", "netlify", "cloudflare-r2", "clerk", "exa", "railway", "voyage-ai", "qdrant-cloud", "turso", "mongodb-atlas", "firebase", "auth0", "brevo", "render", "stability-ai", "apify", "deno-deploy", "posthog", "sentry", "cloudinary", "upstash-qstash", "postmark", "mailgun"]);
const PROMPTS = [
  ["Pick a free service for a feature", "Before you choose a database, auth, hosting, email, search or LLM service for this app, read https://api-router.instinctagentai.workers.dev/free-tiers.md. Prefer services with a free plan. For every limit you quote, give the source URL and read date from that page. If a row says not verified, say so and do not guess."],
  ["Connect the MCP server (Claude Code)", "Run: claude mcp add --transport http api-router https://api-router.instinctagentai.workers.dev/mcp/ask . Then, when I ask which API to use, call the compare_api_providers tool and show me the source and read date for each answer."],
  ["Keep it free", "Use only free plans for this project. List each paid-only feature you were about to use and ask me before you add it."],
];
const promptsMd = () => "## Copy-paste prompts for your AI coding tool\n\n" + PROMPTS.map(([t, p]) => `### ${t}\n\n\`\`\`\n${p}\n\`\`\``).join("\n\n") + "\n\nThese prompts only point your tool at our public pages. Nothing here is a guarantee of what a provider will charge.\n";
const promptsHtml = () => "<h2>Copy-paste prompts for your AI coding tool</h2>" + PROMPTS.map(([t, p]) => `<h3>${esc(t)}</h3><pre style="white-space:pre-wrap;background:#f5f5f5;padding:.75rem;border-radius:6px">${esc(p)}</pre>`).join("") + "<p><small>These prompts only point your tool at our public pages. Nothing here is a guarantee of what a provider will charge.</small></p>";
export const bestPaths = () => BEST.map((b) => "/best/" + b.slug);
async function bestPage(b, p, wantMd, env, getHealth) {
  const list = withPrice().filter((x) => b.cats ? b.cats.includes(x.category) : x.category === b.cat);
  const hs = await Promise.all(list.map((x) => getHealth(env, x.id)));
  const rows = list.map((x, i) => ({ x, h: hs[i] }));
  const free = rows.filter((r) => FREE_IDS.has(r.x.id)), other = rows.filter((r) => !FREE_IDS.has(r.x.id));
  const dates = list.map((x) => x.price_checked).sort();
  const short = free.length ? `${free.map((r) => r.x.name).join(", ")} ${free.length === 1 ? "has" : "have"} a free plan, free credit or free usage in the pricing source we read. ${other.length ? other.map((r) => r.x.name).join(", ") + " " + (other.length === 1 ? "is" : "are") + " listed below with the prices or limits we read; we have not verified a free plan for " + (other.length === 1 ? "it" : "them") + "." : ""}` : `We did not find a free plan in the pricing sources we read for these providers.`;
  const note = `Read from each provider's own page ${dates[0] === dates[dates.length - 1] ? "on " + dates[0] : "between " + dates[0] + " and " + dates[dates.length - 1]}. Prices change often, so check the source. We do not rank by price, and we make no "cheapest" claim, because plans are not comparable one to one. Providers where we could not verify a price are left out.`;
  const line = (r) => `${r.x.price_summary}${r.x.bonus_verified ? ". " + r.x.user_bonus_description : ""}`;
  if (wantMd) return mdRes(`# ${b.title}

**Short answer:** ${short}

${note}

> Disclosure: ${DISC}

${[["Free plan or credit stated in the source we read", free], ["Other " + b.intro, other]].filter(([, g]) => g.length).map(([t, g]) => `## ${t}

${g.map((r) => `- **${r.x.name}**: ${line(r)}. Source: ${r.x.price_source} (read ${r.x.price_checked}). Status: ${state(r.h)}. Sign up: ${isRef(r.x) ? r.x.referral_url + " (referral link)" : r.x.signup_url}. Details: ${BASE}/answers/${slugOf(r.x)}`).join("\n")}`).join("\n\n")}

${b.prompts ? "\n" + promptsMd() + "\n" : ""}All providers: ${BASE}/free-tiers
`);
  const li = (r) => `<li><strong><a href="/answers/${slugOf(r.x)}">${esc(r.x.name)}</a></strong>: ${esc(line(r))}. <small>Source: <a href="${esc(r.x.price_source)}" rel="nofollow noopener">${esc(r.x.price_source)}</a>, read ${esc(r.x.price_checked)}. Status: ${esc(state(r.h))}.</small> ${isRef(r.x) ? `<a href="/go/${esc(r.x.id)}" rel="sponsored nofollow noopener" aria-label="Sign up for ${esc(r.x.name)} (referral link)">Sign up (referral link)</a>` : `<a href="${esc(r.x.signup_url)}" rel="nofollow noopener">Provider site</a>`}</li>`;
  const grp = [["Free plan or credit stated in the source we read", free], ["Other " + b.intro, other]].filter(([, g]) => g.length).map(([t, g]) => `<h2>${esc(t)}</h2><ul>${g.map(li).join("")}</ul>`).join("");
  return shell(`${b.q} Free plans compared, 2026 | api-router`, short.slice(0, 155), p, `<h1>${esc(b.title)}</h1><p><strong>Short answer:</strong> ${esc(short)}</p><p><small>${esc(note)}</small></p><p class="note"><strong>Disclosure:</strong> ${esc(DISC)}</p>${grp}${b.prompts ? promptsHtml() : ""}<p><small>All providers: <a href="/free-tiers">free-tier cheat sheet</a>. Plain-text version: <a href="${p}.md">${p}.md</a>.</small></p>`,
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: b.q, acceptedAnswer: { "@type": "Answer", text: short } }] });
}

const VS_KEEP = new Set("clerk-vs-auth0 supabase-vs-neon supabase-vs-upstash-redis neon-vs-turso resend-vs-postmark resend-vs-mailgun resend-vs-brevo vercel-vs-netlify vercel-vs-railway netlify-vs-railway openrouter-vs-groq groq-vs-gemini circleci-vs-github-actions firecrawl-vs-scraperapi firecrawl-vs-apify firecrawl-vs-scrapingbee scraperapi-vs-scrapingbee deepgram-vs-assemblyai cloudflare-r2-vs-backblaze-b2 posthog-vs-umami inngest-vs-trigger-dev uptimerobot-vs-healthchecks algolia-vs-meilisearch cohere-vs-voyage-ai runpod-vs-modal".split(" "));
const vsAll = () => { const by = {}; for (const p of withPrice()) (by[p.category] = by[p.category] || []).push(p); const out = []; for (const k of Object.keys(by).sort()) { const l = by[k].slice(0, 4); for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) out.push([l[i], l[j]]); } return out; };
const vsPairs = () => vsAll().filter(([x, y]) => VS_KEEP.has(x.id + "-vs-" + y.id));
export const vsPaths = () => vsPairs().map(([x, y]) => "/vs/" + x.id + "-vs-" + y.id);
async function vsPage(p, wantMd, env, getHealth) {
  const m = p.match(/^\/vs\/([a-z0-9-]+)-vs-([a-z0-9-]+)$/);
  const pr = m && vsPairs().find(([x, y]) => x.id === m[1] && y.id === m[2]);
  if (!pr) { const old = m && vsAll().find(([x, y]) => x.id === m[1] && y.id === m[2]); if (!old) return null; const bs = BEST.find((b) => b.cat === old[0].category); return new Response(null, { status: 301, headers: { location: BASE + (bs ? "/best/" + bs.slug : "/answers/" + slugOf(old[0])) } }); }
  const [x, y] = pr; const [hx, hy] = await Promise.all([getHealth(env, x.id), getHealth(env, y.id)]);
  const title = `${x.name} vs ${y.name} free tier: what does each include?`;
  const short = `${x.name}: ${x.price_summary}. ${y.name}: ${y.price_summary}. Each line is copied from the provider's own page on the read date shown. Plans are not comparable one to one, so we pick no winner and make no "cheapest" claim.`;
  if (wantMd) return mdRes(`# ${title}\n\n**Short answer:** ${short}\n\n> Disclosure: ${DISC}\n\n| | ${x.name} | ${y.name} |\n|---|---|---|\n| Category | ${x.category} | ${y.category} |\n| Free tier and price | ${x.price_summary} | ${y.price_summary} |\n| Source (read date) | ${x.price_source} (${x.price_checked}) | ${y.price_source} (${y.price_checked}) |\n| Live status | ${state(hx)} | ${state(hy)} |\n| Sign up | ${isRef(x) ? BASE + "/go/" + x.id + " (referral link)" : x.signup_url} | ${isRef(y) ? BASE + "/go/" + y.id + " (referral link)" : y.signup_url} |\n\nAll providers: ${BASE}/free-tiers\n`);
  const lk = (z) => isRef(z) ? `<a href="/go/${esc(z.id)}" rel="sponsored nofollow noopener" aria-label="Sign up for ${esc(z.name)} (referral link)">Sign up (referral link)</a>` : `<a href="${esc(z.signup_url)}" rel="nofollow noopener">${esc(z.name)} site</a>`;
  const col = (z, h) => `<td>${esc(z.price_summary)}${esc(stale(z))}</td>`;
  return shell(title + " | api-router", short.slice(0, 155), p,
    `<h1>${esc(title)}</h1><p><strong>Short answer:</strong> ${esc(short)}</p><p class="note"><strong>Disclosure:</strong> ${esc(DISC)}</p><table><caption>${esc(x.name)} and ${esc(y.name)}</caption><thead><tr><th scope="col"></th><th scope="col"><a href="/answers/${slugOf(x)}">${esc(x.name)}</a></th><th scope="col"><a href="/answers/${slugOf(y)}">${esc(y.name)}</a></th></tr></thead><tbody><tr><th scope="row">Free tier and price</th>${col(x)}${col(y)}</tr><tr><th scope="row">Source (read date)</th><td><a href="${esc(x.price_source)}" rel="nofollow noopener">source</a> (${esc(x.price_checked)})</td><td><a href="${esc(y.price_source)}" rel="nofollow noopener">source</a> (${esc(y.price_checked)})</td></tr><tr><th scope="row">Live status</th><td>${esc(state(hx))}</td><td>${esc(state(hy))}</td></tr><tr><th scope="row">Sign up</th><td>${lk(x)}</td><td>${lk(y)}</td></tr></tbody></table><p><small>Prices change often, so check the source before you rely on a number. <a href="/free-tiers">All providers</a>.</small></p>`,
    null);
}

export const endPaths = () => [];
const llmRows = () => partners.providers.filter((p) => p.category === "llm");
async function llmPage(p, wantMd, env, getHealth) {
  const rows = llmRows(); const hs = await Promise.all(rows.map((x) => getHealth(env, x.id)));
  const short = `Free-tier facts for ${rows.length} LLM API providers, copied from each provider's own page on the read date shown. Limits change often and per-model limits differ, so check the source before you build on a number. Providers without a verified figure say so. No "cheapest" or "best" claim.`;
  const line = (x) => x.price_summary ? x.price_summary : "No verified free-tier figure yet. Check the provider's page.";
  if (wantMd) return mdRes(`# Free LLM API limits tracker\n\n**Short answer:** ${short}\n\n> Disclosure: ${DISC}\n\n| Provider | Free tier and limits | Source (read date) | Age | Live status | Sign up |\n|---|---|---|---|---|---|\n${rows.map((x, i) => `| ${x.name} | ${line(x)} | ${x.price_source || "not verified"} (${x.price_checked || "n/a"}) | ${x.price_checked ? ageDays(x.price_checked) + " days" : "n/a"} | ${state(hs[i])} | ${isRef(x) ? BASE + "/go/" + x.id + " (referral link)" : x.signup_url} |`).join("\n")}\n\nChanges feed: ${BASE}/v1/changes\n`);
  const tr = rows.map((x, i) => `<tr><th scope="row">${x.price_summary ? `<a href="/answers/${slugOf(x)}">${esc(x.name)}</a>` : esc(x.name)}</th><td>${esc(line(x))}</td><td>${x.price_source ? `<a href="${esc(x.price_source)}" rel="nofollow noopener">source</a> (read ${esc(x.price_checked)})` : "not verified"}</td><td>${x.price_checked ? ageDays(x.price_checked) + " days" : "n/a"}</td><td>${esc(state(hs[i]))}</td><td>${isRef(x) ? `<a href="/go/${esc(x.id)}" rel="sponsored nofollow noopener" aria-label="Sign up for ${esc(x.name)} (referral link)">Sign up (referral link)</a>` : `<a href="${esc(x.signup_url)}" rel="nofollow noopener">site</a>`}</td></tr>`).join("");
  return shell("Free LLM API limits tracker | api-router", short.slice(0, 155), p, `<h1>Free LLM API limits tracker</h1><p><strong>Short answer:</strong> ${esc(short)}</p><p class="note"><strong>Disclosure:</strong> ${esc(DISC)}</p><table><caption>Free LLM API tiers</caption><thead><tr><th scope="col">Provider</th><th scope="col">Free tier and limits</th><th scope="col">Source</th><th scope="col">Age of read</th><th scope="col">Live status</th><th scope="col">Link</th></tr></thead><tbody>${tr}</tbody></table><p><small>Status is one HEAD request every ${REFRESH_MIN} minutes, not a test of real workloads. Machine-readable: <a href="/v1/catalog">/v1/catalog</a>, changes: <a href="/v1/changes">/v1/changes</a>.</small></p>`, null);
}
async function endPage(p, wantMd, env, getHealth) {
  { const mm = p.match(/^\/ending\/([a-z0-9-]+)$/); const xx = mm && partners.providers.find((y) => y.id === mm[1]); return xx ? new Response(null, { status: 301, headers: { location: BASE + "/answers/" + slugOf(xx) } }) : null; }
  const m = p.match(/^\/ending\/([a-z0-9-]+)$/); const x = m && withPrice().find((y) => y.id === m[1]);
  if (!x) return null;
  const alts = withPrice().filter((y) => y.id !== x.id && y.category === x.category).slice(0, 5);
  const title = `If ${x.name}'s free tier changes or ends: what to do`;
  const short = `We have no news that ${x.name} is ending its free tier. This is a checklist for if that happens. Last read: ${x.price_summary} (read ${x.price_checked}).`;
  const steps = ["Re-read the provider's pricing page and changelog to see exactly what changed and when it starts.", "Check whether your usage fits the new free limits. Look at your own usage dashboard, not a guess.", "Export your data and config now (database dump, API keys list, settings), before any cutoff.", "Pick an alternative below and test it on a small slice first. Free tiers differ in limits, so compare the source pages, not the headlines.", "Add a usage alert or a hard cap so a paid plan can never start without you choosing it."];
  const altLine = (y) => `${y.name}: ${y.price_summary} (source ${y.price_source}, read ${y.price_checked})`;
  if (wantMd) return mdRes(`# ${title}\n\n**Short answer:** ${short}\n\n> Disclosure: ${DISC}\n\n## Steps\n\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n## Alternatives in the same category\n\n${alts.length ? alts.map((y) => `- ${altLine(y)}${isRef(y) ? " " + BASE + "/go/" + y.id + " (referral link)" : ""}`).join("\n") : "No other verified provider in this category in our catalog yet."}\n\nCurrent facts: ${BASE}/answers/${slugOf(x)}\n`);
  const al = alts.length ? `<ul>${alts.map((y) => `<li><a href="/answers/${slugOf(y)}">${esc(y.name)}</a>: ${esc(y.price_summary)} <small>(<a href="${esc(y.price_source)}" rel="nofollow noopener">source</a>, read ${esc(y.price_checked)})</small> ${isRef(y) ? `<a href="/go/${esc(y.id)}" rel="sponsored nofollow noopener" aria-label="Sign up for ${esc(y.name)} (referral link)">Sign up (referral link)</a>` : ""}</li>`).join("")}</ul>` : "<p>No other verified provider in this category in our catalog yet.</p>";
  return shell(title + " | api-router", short.slice(0, 155), p, `<h1>${esc(title)}</h1><p><strong>Short answer:</strong> ${esc(short)}</p><p class="note"><strong>Disclosure:</strong> ${esc(DISC)}</p><h2>Steps</h2><ol>${steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol><h2>Alternatives in the same category</h2>${al}<p><small>Current facts for ${esc(x.name)}: <a href="/answers/${slugOf(x)}">/answers/${esc(slugOf(x))}</a>. Prices change often, so check each source.</small></p>`, null);
}

export const arPaths = () => ["/ar", "/ar/llm-limits", "/newsletter"];
const DISC_AR = 'بعض روابط التسجيل في هذه الصفحة هي روابط إحالة يملكها مشغّل الموقع (مكتوب عليها "رابط إحالة"). قد تمنحه عمولة أو تمنحك مكافأة. لا تغيّر ما نذكره. نحسب النقرات على هذه الروابط لكل مزوّد، دون تخزين عنوان IP أو ملف تعريف ارتباط أو أي هوية.';
const bd = (s) => `<bdi dir="ltr">${esc(s)}</bdi>`;
async function arShell(title, desc, p, body) { const r = shell(title, desc, p, body, null); const t = (await r.text()).replace('<html lang="en">', '<html lang="ar" dir="rtl">'); return new Response(t, { status: 200, headers: r.headers }); }
async function arPage(p, env, getHealth) {
  if (p === "/ar") {
    const items = withPrice().map((x) => `<li><a href="/answers/${esc(slugOf(x))}">${bd(x.name)}</a></li>`).join("");
    return arShell("أدلة الواجهات المجانية بالعربية | api-router", "صفحات عربية عن حدود الطبقات المجانية للواجهات وماذا تفعل إذا تغيّرت.", p, `<h1>أدلة الواجهات المجانية بالعربية</h1><p>الشرح بالعربية. الأرقام وأسماء الخطط تبقى بالإنجليزية كما وردت في صفحة المزوّد الرسمية، مع رابط المصدر وتاريخ القراءة.</p><p class="note"><strong>إفصاح:</strong> ${esc(DISC_AR)}</p><ul><li><a href="/ar/llm-limits">متتبّع حدود واجهات LLM المجانية</a></li>${Object.keys(AR_BEST).map((k) => `<li><a href="/ar/best/${k}">${esc(AR_BEST[k])}</a></li>`).join("")}<li><a href="/newsletter">متابعة تغييرات الأسعار عبر RSS</a></li></ul><h2>ماذا تفعل إذا تغيّرت الطبقة المجانية</h2><ul>${items}</ul>`);
  }
  if (p === "/ar/llm-limits") {
    const rows = llmRows(); const hs = await Promise.all(rows.map((x) => getHealth(env, x.id)));
    const short = `ملخص: حقائق الطبقات المجانية لـ ${rows.length} مزوّدين لواجهات LLM، منقولة من صفحة كل مزوّد الرسمية بتاريخ القراءة الموضّح. الحدود تتغير كثيرا وتختلف حسب النموذج، فتحقق من المصدر قبل أن تبني على أي رقم. من لا رقم موثّق عنده مكتوب ذلك بجانبه. لا ندّعي "الأرخص" ولا "الأفضل". الأرقام والأسماء تبقى بالإنجليزية كما وردت في المصدر.`;
    const tr = rows.map((x, i) => `<tr><th scope="row">${bd(x.name)}</th><td>${x.price_summary ? bd(x.price_summary) : "لا يوجد رقم موثّق بعد. راجع صفحة المزوّد."}</td><td>${x.price_source ? `<a href="${esc(x.price_source)}" rel="nofollow noopener">المصدر</a> (قُرئ ${esc(x.price_checked)})` : "غير موثّق"}</td><td>${x.price_checked ? ageDays(x.price_checked) + " يوم" : "-"}</td><td>${bd(state(hs[i]))}</td><td>${isRef(x) ? `<a href="/go/${esc(x.id)}" rel="sponsored nofollow noopener" aria-label="تسجيل في ${esc(x.name)} (رابط إحالة)">تسجيل (رابط إحالة)</a>` : `<a href="${esc(x.signup_url)}" rel="nofollow noopener">الموقع</a>`}</td></tr>`).join("");
    return arShell("متتبّع حدود واجهات LLM المجانية | api-router", short.slice(0, 155), p, `<h1>متتبّع حدود واجهات LLM المجانية</h1><p><strong>الخلاصة:</strong> ${esc(short)}</p><p class="note"><strong>إفصاح:</strong> ${esc(DISC_AR)}</p><table><caption>الطبقات المجانية لواجهات LLM</caption><thead><tr><th scope="col">المزوّد</th><th scope="col">الطبقة المجانية والحدود</th><th scope="col">المصدر</th><th scope="col">عمر القراءة</th><th scope="col">الحالة</th><th scope="col">الرابط</th></tr></thead><tbody>${tr}</tbody></table><p><small>الحالة طلب HEAD واحد كل ${REFRESH_MIN} دقيقة، وليست اختبارا لحمل عمل حقيقي. النسخة الإنجليزية: <a href="/llm-limits">/llm-limits</a>.</small></p>`);
  }
  const m = p.match(/^\/ar\/ending\/([a-z0-9-]+)$/); const x = m && partners.providers.find((y) => y.id === m[1]); if (x) return new Response(null, { status: 301, headers: { location: BASE + "/answers/" + slugOf(x) } });
  if (!x) return null;
  const alts = withPrice().filter((y) => y.id !== x.id && y.category === x.category).slice(0, 5);
  const title = `إذا تغيّرت الطبقة المجانية في ${x.name} أو انتهت: ماذا تفعل`;
  const short = `لا نعلم بأي خبر عن إنهاء ${x.name} لطبقته المجانية. هذه خطوات تفيدك إن حدث ذلك. آخر قراءة: ${x.price_summary} (بتاريخ ${x.price_checked}).`;
  const steps = ["أعد قراءة صفحة الأسعار وسجل التغييرات عند المزوّد لتعرف ما الذي تغيّر وموعد سريانه.", "تحقق من أن استخدامك يناسب الحدود الجديدة. انظر إلى لوحة استخدامك أنت، لا إلى التخمين.", "صدّر بياناتك وإعداداتك الآن (نسخة قاعدة البيانات، قائمة مفاتيح API، الإعدادات) قبل أي موعد إيقاف.", "اختر بديلا من القائمة أدناه وجرّبه على جزء صغير أولا. الطبقات المجانية تختلف في حدودها، فقارن صفحات المصدر لا العناوين.", "فعّل تنبيه استخدام أو سقفا صارما حتى لا تبدأ خطة مدفوعة دون قرارك."];
  const al = alts.length ? `<ul>${alts.map((y) => `<li>${bd(y.name)}: ${bd(y.price_summary)} <small>(<a href="${esc(y.price_source)}" rel="nofollow noopener">المصدر</a>، قُرئ ${esc(y.price_checked)})</small> ${isRef(y) ? `<a href="/go/${esc(y.id)}" rel="sponsored nofollow noopener" aria-label="تسجيل في ${esc(y.name)} (رابط إحالة)">تسجيل (رابط إحالة)</a>` : ""}</li>`).join("")}</ul>` : "<p>لا يوجد مزوّد موثّق آخر في هذه الفئة ضمن فهرسنا حتى الآن.</p>";
  return arShell(title + " | api-router", short.slice(0, 155), p, `<h1>${esc(title)}</h1><p><strong>الخلاصة:</strong> ${esc(short)}</p><p class="note"><strong>إفصاح:</strong> ${esc(DISC_AR)}</p><h2>الخطوات</h2><ol>${steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol><h2>بدائل في الفئة نفسها</h2>${al}<p><small>الحقائق الحالية لـ ${bd(x.name)}: <a href="/answers/${slugOf(x)}">/answers/${esc(slugOf(x))}</a>. الأسعار تتغير كثيرا، فتحقق من كل مصدر. <a href="/ending/${esc(x.id)}">النسخة الإنجليزية</a>.</small></p>`);
}
function newsletterPage(p) {
  return shell("Free API price changes: follow by RSS | api-router", "Follow free-tier and pricing changes by RSS. No email, no account.", p, `<h1>Free API price changes: follow by RSS</h1><p><strong>Short answer:</strong> we publish new and re-verified free-tier rows as an RSS feed. There is no email signup and no account, and we collect no personal data. Add the feed to any feed reader.</p><ul><li><a href="/feed.xml">RSS feed</a></li><li><a href="/v1/changes">Changes as JSON</a> (for scripts and agents)</li><li><a href="/free-tiers">All free tiers with sources and read dates</a></li></ul><p class="note"><strong>Disclosure:</strong> ${esc(DISC)}</p><p><small>An email version is not offered. If we add one later it will be opt-in only.</small></p>`, null);
}

const AR_BEST = { "free-gpu-cloud": "سحابة GPU: الخيارات المجانية للمطورين (2026)", "pdf-api": "واجهات PDF: الخطط المجانية والأسعار (2026)", "free-uptime-monitoring": "خدمات مراقبة التوفّر: الخطط المجانية (2026)", "free-speech-api": "واجهات الكلام: الأرصدة والخطط المجانية (2026)", "free-object-storage": "تخزين الكائنات: الحصص المجانية (2026)", "free-search-api": "واجهات البحث لوكلاء الذكاء الاصطناعي: الخطط المجانية (2026)", "free-vector-database": "قواعد البيانات المتجهية: الخطط المجانية (2026)", "free-ocr-api": "واجهات التعرّف الضوئي على الحروف OCR: الخطط المجانية (2026)", "free-embeddings-api": "واجهات التضمين وإعادة الترتيب: مفاتيح مجانية (2026)", "free-image-api": "واجهات توليد الصور: أرصدة مجانية (2026)", "free-analytics": "أدوات تحليلات المنتج: الخطط المجانية (2026)", "free-error-monitoring": "مراقبة الأخطاء: الخطط المجانية (2026)", "free-ci-cd": "خدمات التكامل والنشر المستمر CI/CD: الخطط المجانية (2026)", "free-form-backend": "خلفيات النماذج للمواقع الثابتة: الخطط المجانية (2026)", "free-message-queue": "طوابير الرسائل والجدولة: الخطط المجانية (2026)", "free-llm-api": "واجهات LLM المجانية: الحدود والأسعار (2026)", "web-scraping-api": "واجهات استخلاص بيانات الويب: الخطط المجانية والأسعار (2026)", "free-database": "قواعد بيانات مجانية للتطبيقات: خطط Postgres وRedis المجانية (2026)", "free-app-hosting": "استضافة التطبيقات: الخطط المجانية والتجريبية (2026)", "free-auth": "خدمات المصادقة: الخطط المجانية (2026)", "free-email-api": "واجهات البريد الإلكتروني: الخطط المجانية (2026)" };
export const arBestPaths = () => Object.keys(AR_BEST).map((k) => "/ar/best/" + k);
const isoDay = (d) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
async function arBestPage(p, env, getHealth) {
  const m = p.match(/^\/ar\/best\/([a-z-]+)$/); const b = m && BEST.find((y) => y.slug === m[1] && AR_BEST[y.slug]);
  if (!b) return null;
  const rows = withPrice().filter((x) => x.category === b.cat); const hs = await Promise.all(rows.map((x) => getHealth(env, x.id)));
  const title = AR_BEST[b.slug];
  const short = `ملخص: حقائق الخطط المجانية والأسعار لـ ${rows.length} مزوّدين، منقولة من صفحة كل مزوّد الرسمية بتاريخ القراءة الموضّح. لا نرتّب المزوّدين ولا ندّعي "الأرخص" أو "الأفضل" لأن الخطط لا تقارَن واحدة بواحدة. الأرقام وأسماء الخطط تبقى بالإنجليزية كما وردت في المصدر.`;
  const tr = rows.map((x, i) => `<tr><th scope="row"><a href="/answers/${esc(slugOf(x))}">${bd(x.name)}</a></th><td>${bd(x.price_summary)}</td><td><a href="${esc(x.price_source)}" rel="nofollow noopener">المصدر</a> (قُرئ ${esc(x.price_checked)})</td><td>${bd(state(hs[i]))}</td><td>${isRef(x) ? `<a href="/go/${esc(x.id)}" rel="sponsored nofollow noopener" aria-label="تسجيل في ${esc(x.name)} (رابط إحالة)">تسجيل (رابط إحالة)</a>` : `<a href="${esc(x.signup_url)}" rel="nofollow noopener">الموقع</a>`}</td></tr>`).join("");
  return arShell(title + " | api-router", short.slice(0, 155), p, `<h1>${esc(title)}</h1><p><strong>الخلاصة:</strong> ${esc(short)}</p><p class="note"><strong>إفصاح:</strong> ${esc(DISC_AR)}</p><table><caption>${esc(title)}</caption><thead><tr><th scope="col">المزوّد</th><th scope="col">الطبقة المجانية والسعر</th><th scope="col">المصدر</th><th scope="col">الحالة</th><th scope="col">الرابط</th></tr></thead><tbody>${tr}</tbody></table><p><small>الأسعار تتغير كثيرا، فتحقق من المصدر قبل أي قرار. النسخة الإنجليزية: <a href="/best/${esc(b.slug)}">/best/${esc(b.slug)}</a>.</small></p>`);
}
export const weeklyPath = () => ["/weekly"];
async function weeklyPage(p, wantMd) {
  const since = isoDay(7);
  const rows = withPrice().filter((x) => x.price_checked >= since).sort((x, y) => y.price_checked.localeCompare(x.price_checked));
  const short = `${rows.length} catalog rows were added or re-read from the provider's own page in the last 7 days (since ${since}). We record the date we read each source, not a before and after diff, so this list says "re-read", not "changed". Open the source to see the current terms.`;
  if (wantMd) return mdRes(`# Free API tiers: added or re-read this week\\n\\n**Short answer:** ${short}\\n\\n> Disclosure: ${DISC}\\n\\n${rows.map((x) => `- ${x.name} (${x.category}), read ${x.price_checked}: ${x.price_summary} Source: ${x.price_source}`).join("\\n")}\\n\\nFeed: ${BASE}/feed.xml\\n`);
  return shell("Free API tiers: added or re-read this week | api-router", short.slice(0, 155), p, `<h1>Free API tiers: added or re-read this week</h1><p><strong>Short answer:</strong> ${esc(short)}</p><p class="note"><strong>Disclosure:</strong> ${esc(DISC)}</p><ul>${rows.map((x) => `<li><a href="/answers/${slugOf(x)}">${esc(x.name)}</a> (${esc(x.category)}), read ${esc(x.price_checked)}: ${esc(x.price_summary)} <small><a href="${esc(x.price_source)}" rel="nofollow noopener">source</a></small></li>`).join("")}</ul><p><small>Follow by RSS: <a href="/feed.xml">/feed.xml</a>. Machine-readable: <a href="/v1/changes">/v1/changes</a>. See also <a href="/newsletter">/newsletter</a>.</small></p>`, null);
}
export async function handleAnswers(u, env, getHealth, req) {
  let p = u.pathname.replace(/\/+$/, "");
  const wantMd = p.endsWith(".md") || /text\/markdown/i.test((req && req.headers.get("accept")) || "");
  if (p.endsWith(".md")) p = p.slice(0, -3);
  if (p === "/newsletter") return newsletterPage(p);
  if (p === "/weekly") return weeklyPage(p, wantMd);
  if (p.startsWith("/ar/best/")) return arBestPage(p, env, getHealth);
  if (p === "/ar" || p.startsWith("/ar/")) return arPage(p, env, getHealth);
  if (p === "/llm-limits") return llmPage(p, wantMd, env, getHealth);
  if (p.startsWith("/ending/")) return endPage(p, wantMd, env, getHealth);
  if (p.startsWith("/vs/")) return vsPage(p, wantMd, env, getHealth);
  const bm = p.match(/^\/best\/([a-z-]+)$/);
  if (bm) { const b = BEST.find((y) => y.slug === bm[1]); return b ? bestPage(b, p, wantMd, env, getHealth) : null; }
  const list = withPrice();
  if (p === "/free-tiers") {
    const hs = await Promise.all(list.map((x) => getHealth(env, x.id)));
    const dates = list.map((x) => x.price_checked).sort();
    const oldest = dates[0], newest = dates[dates.length - 1];
    const short = `Free-tier and pricing facts for ${list.length} API providers, each copied from the provider's own page on the date shown (oldest read ${oldest}, newest ${newest}). Providers with no verified price are left out. Plans are not comparable one to one, so we make no "cheapest" claim.`;
    if (wantMd) return mdRes(`# API free tiers, prices and limits (cheat sheet)\n\n**Short answer:** ${short}\n\n> Disclosure: ${DISC}\n\n| Provider | Free tier, price and limits | Source (read date) | Live status | Link |\n|---|---|---|---|---|\n${list.map((x, i) => `| [${x.name}](${BASE}/answers/${slugOf(x)}) | ${x.price_summary}${x.bonus_verified ? ". " + x.user_bonus_description : ""} | ${x.price_source} (${x.price_checked}) | ${state(hs[i])} | ${isRef(x) ? x.referral_url + " (referral link)" : x.signup_url} |`).join("\n")}\n\nProviders change prices often. Check the source before you rely on a number. Data: ${BASE}/v1/catalog\n`);
    const tr = list.map((x, i) => `<tr><th scope="row"><a href="/answers/${slugOf(x)}">${esc(x.name)}</a></th><td>${esc(x.price_summary)}${x.bonus_verified ? "<br><small>" + esc(x.user_bonus_description) + "</small>" : ""}</td><td><a href="${esc(x.price_source)}" rel="nofollow noopener">source</a> <small>(read ${esc(x.price_checked)})</small></td><td>${esc(state(hs[i]))}</td><td>${isRef(x) ? `<a href="/go/${esc(x.id)}" rel="sponsored nofollow noopener" aria-label="Sign up for ${esc(x.name)} (referral link)">Sign up (referral link)</a>` : `<a href="${esc(x.signup_url)}" rel="nofollow noopener">Provider site</a>`}</td></tr>`).join("");
    return shell("API free tiers, prices and limits: cheat sheet | api-router", `Verified free tiers, prices and rate limits for ${list.length} API providers, with source links and read dates.`, "/free-tiers",
      `<h1>API free tiers, prices and limits (cheat sheet)</h1><p><strong>Short answer:</strong> ${esc(short)}</p><p class="note"><strong>Disclosure:</strong> ${esc(DISC)}</p><table><caption>Free tier, price and limits per provider</caption><thead><tr><th scope="col">Provider</th><th scope="col">Free tier, price and limits</th><th scope="col">Source (read date)</th><th scope="col">Live status</th><th scope="col">Link</th></tr></thead><tbody>${tr}</tbody></table><p><small>Prices and limits change often. Each row shows the date we read the provider's page. Plain-text version: <a href="/free-tiers.md">/free-tiers.md</a>.</small></p>`,
      [{ "@context": "https://schema.org", "@type": "WebPage", name: "API free tiers, prices and limits", url: BASE + "/free-tiers", dateModified: newest }, { "@context": "https://schema.org", "@type": "WebAPI", name: "api-router", description: "Free-tier facts for AI and developer API providers as JSON, plus free utility endpoints. No API key.", url: BASE, documentation: BASE + "/llms.txt", provider: { "@type": "Organization", name: "instinctagentai", url: "https://github.com/instinctagentai" } }]);
  }
  const m = p.match(/^\/answers\/([a-z0-9-]+)-free-tier-and-pricing$/);
  if (!m) return null;
  const x = list.find((y) => y.id === m[1]);
  if (!x) return null;
  const [q, a] = qa(x);
  const h = await getHealth(env, x.id);
  const others = list.filter((y) => y.id !== x.id && y.category === x.category);
  if (wantMd) return mdRes(`# ${q}\n\n**Short answer:** ${a}\n\n> Disclosure: ${DISC}\n\nLive status of ${x.name}'s API endpoint: ${state(h)}. One HEAD request every ${REFRESH_MIN} minutes, not a test of real workloads. See ${BASE}/uptime for the rule.\n\nSign up: ${isRef(x) ? x.referral_url + " (referral link)" : x.signup_url}\n\n${others.length ? "Same category: " + others.map((y) => `${y.name} ${BASE}/answers/${slugOf(y)}`).join(", ") + "\n\n" : ""}All providers: ${BASE}/free-tiers\n`);
  const link = isRef(x) ? `<a href="/go/${esc(x.id)}" rel="sponsored nofollow noopener" aria-label="Sign up for ${esc(x.name)} (referral link)">Sign up for ${esc(x.name)} (referral link)</a>` : `<a href="${esc(x.signup_url)}" rel="nofollow noopener">${esc(x.name)} site</a>`;
  return shell(`${q.slice(0, 70)} Read ${x.price_checked} | api-router`, `${x.name}: ${x.price_summary}. Source and read date included.`, p,
    `<h1>${esc(q)}</h1><p><strong>Short answer:</strong> ${esc(x.price_summary)}. Source: <a href="${esc(x.price_source)}" rel="nofollow noopener">${esc(x.price_source)}</a> (read ${esc(x.price_checked)}).${esc(stale(x))} ${esc(bonus(x))}</p><p class="note"><strong>Disclosure:</strong> ${esc(DISC)}</p><p>Live status of ${esc(x.name)}'s API endpoint: ${esc(state(h))}. This is one HEAD request every ${REFRESH_MIN} minutes, not a test of real workloads. <a href="/uptime">How we rate status</a>.</p><p>${link}</p><p><small>Prices change often, so check the source before you rely on a number. ${others.length ? "Same category: " + others.map((y) => `<a href="/answers/${slugOf(y)}">${esc(y.name)}</a>`).join(", ") + ". " : ""}All providers: <a href="/free-tiers">free-tier cheat sheet</a>. Plain-text version: <a href="${p}.md">${p}.md</a>.</small></p>`,
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } }] });
}
