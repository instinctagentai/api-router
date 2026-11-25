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
  { slug: "free-message-queue", cat: "queue", title: "Message queues and schedulers compared (2026): free plans", q: "Which serverless message queue has a free plan?", intro: "message queues we check" },
  { slug: "free-stack-for-vibe-coded-apps", cats: ["hosting", "database", "auth", "email", "llm", "storage", "search", "analytics", "error_monitoring", "queue", "image"], title: "Which free APIs and services should my vibe-coded app use? (2026)", q: "Which free API should my vibe-coded app use?", intro: "services we check for vibe-coded apps", prompts: true },
];
const FREE_IDS = new Set(["openrouter", "firecrawl", "modal", "pdfops", "uptimerobot", "gemini", "cloudflare-workers-ai", "cerebras", "supabase", "neon", "upstash-redis", "pinecone", "resend", "tavily", "cohere", "deepgram", "assemblyai", "elevenlabs", "ocrspace", "huggingface-spaces", "vercel", "netlify", "cloudflare-r2", "clerk", "exa", "railway", "voyage-ai", "qdrant-cloud", "turso", "mongodb-atlas", "firebase", "auth0", "brevo", "render", "stability-ai", "apify", "deno-deploy", "posthog", "sentry", "cloudinary", "upstash-qstash", "postmark", "mailgun"]);
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
  const li = (r) => `<li><strong><a href="/answers/${slugOf(r.x)}">${esc(r.x.name)}</a></strong>: ${esc(line(r))}. <small>Source: <a href="${esc(r.x.price_source)}" rel="nofollow noopener">${esc(r.x.price_source)}</a>, read ${esc(r.x.price_checked)}. Status: ${esc(state(r.h))}.</small> ${isRef(r.x) ? `<a href="${esc(r.x.referral_url)}" rel="sponsored nofollow noopener" aria-label="Sign up for ${esc(r.x.name)} (referral link)">Sign up (referral link)</a>` : `<a href="${esc(r.x.signup_url)}" rel="nofollow noopener">Provider site</a>`}</li>`;
  const grp = [["Free plan or credit stated in the source we read", free], ["Other " + b.intro, other]].filter(([, g]) => g.length).map(([t, g]) => `<h2>${esc(t)}</h2><ul>${g.map(li).join("")}</ul>`).join("");
  return shell(`${b.title} | api-router`, short.slice(0, 155), p, `<h1>${esc(b.title)}</h1><p><strong>Short answer:</strong> ${esc(short)}</p><p><small>${esc(note)}</small></p><p class="note"><strong>Disclosure:</strong> ${esc(DISC)}</p>${grp}${b.prompts ? promptsHtml() : ""}<p><small>All providers: <a href="/free-tiers">free-tier cheat sheet</a>. Plain-text version: <a href="${p}.md">${p}.md</a>.</small></p>`,
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: b.q, acceptedAnswer: { "@type": "Answer", text: short } }] });
}
export async function handleAnswers(u, env, getHealth, req) {
  let p = u.pathname.replace(/\/+$/, "");
  const wantMd = p.endsWith(".md") || /text\/markdown/i.test((req && req.headers.get("accept")) || "");
  if (p.endsWith(".md")) p = p.slice(0, -3);
  const bm = p.match(/^\/best\/([a-z-]+)$/);
  if (bm) { const b = BEST.find((y) => y.slug === bm[1]); return b ? bestPage(b, p, wantMd, env, getHealth) : null; }
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
      [{ "@context": "https://schema.org", "@type": "WebPage", name: "API free tiers, prices and limits", url: BASE + "/free-tiers", dateModified: newest }, { "@context": "https://schema.org", "@type": "WebAPI", name: "api-router", description: "Free-tier facts for AI and developer API providers as JSON, plus free utility endpoints. No API key.", url: BASE, documentation: BASE + "/llms.txt", provider: { "@type": "Organization", name: "instinctagentai", url: "https://github.com/instinctagentai" } }]);
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
