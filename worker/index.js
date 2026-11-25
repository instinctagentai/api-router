import partners from "../partners.json";
import { routeExtras, BASE, HEALTH_RULE } from "./extras.js";
import { handleMcp } from "./mcp.js";
import { Counter } from "./counter.js";
import { handlePages } from "./pages.js";
import { handleAnswers } from "./answers.js";
export { Counter };
const KNOWN = new Set(["/", "/v1/status", "/v1/catalog", "/v1/best-route", "/v1/health-route", "/v1/json-repair", "/v1/page-to-markdown", "/v1/check-quote", "/v1/check-url", "/v1/check-email", "/v1/convert-time", "/v1/convert-units", "/v1/convert-currency", "/mcp", "/v1/stats", "/llms.txt", "/.well-known/agent-card.json", "/.well-known/agent.json"]);
const family = (ua) => /bot|crawl|spider|slurp/i.test(ua) ? "bot" : /mcp|claude|cursor|smithery|glama|docker|a2a|agent|openai|anthropic|gemini/i.test(ua) ? "agent-client" : /curl|wget|python|node|undici|axios|go-http|okhttp|java|ruby|php|deno|bun/i.test(ua) ? "script" : /mozilla|safari|chrome|firefox/i.test(ua) ? "browser" : ua ? "other" : "no-ua";
const counter = (env) => env.COUNTER && env.COUNTER.get(env.COUNTER.idFromName("global"));
const record = (env, ctx, items) => { const c = counter(env); if (c && ctx) ctx.waitUntil(c.fetch("https://counter/hit", { method: "POST", body: JSON.stringify(items) }).catch(() => {})); };
const J = (o, s = 200) => new Response(JSON.stringify(o, null, 2), { status: s, headers: { "content-type": "application/json", "access-control-allow-origin": "*" } });
const CATS = ["llm", "scraping", "proxy", "gpu", "pdf", "monitoring"];
const TASK = { inference: "llm", scraping: "scraping", gpu: "gpu", proxy: "proxy", storage: "gpu", pdf: "pdf", monitoring: "monitoring" };
const shape = (p, h) => ({ id: p.id, name: p.name, category: p.category, signup_url: p.signup_url, referral_url: p.referral_url, user_bonus_description: p.user_bonus_description, bonus_verified: p.bonus_verified, pricing_note: p.pricing_note, health: h || null });
async function getHealth(env, id) { if (!env.HEALTH) return null; const v = await env.HEALTH.get("h:" + id); return v ? JSON.parse(v) : null; }
async function probe(p) {
  const t = Date.now();
  try {
    const r = await fetch(p.probe_url, { method: "HEAD", signal: AbortSignal.timeout(8000), redirect: "follow" });
    const s = r.status;
    const state = s === 429 ? "rate_limited" : s >= 500 ? "down" : s >= 200 && s < 400 ? "up" : "degraded";
    return { state, status_code: s, latency_ms: Date.now() - t, is_healthy: state === "up", reachable: s < 500 && s !== 429, rate_limited: s === 429, last_checked_utc: new Date().toISOString() };
  } catch (e) { return { state: "down", status_code: 0, latency_ms: Date.now() - t, is_healthy: false, reachable: false, rate_limited: false, last_checked_utc: new Date().toISOString() }; }
}
const worker = {
  async fetch(req, env, ctx) {
    const u = new URL(req.url);
    if (u.pathname === "/v1/stats") { const c = counter(env); return c ? c.fetch("https://counter/stats?days=" + (u.searchParams.get("days") || "14")) : J({ error: "counters not enabled" }, 503); }
    // Count only top-level requests (ctx is set); internal self-dispatch calls carry no ctx. Known paths only, no IPs or user agents stored.
    let evt = null;
    if (ctx && req.method !== "OPTIONS" && (KNOWN.has(u.pathname) || u.pathname === "/free-tiers" || u.pathname.startsWith("/answers/") || /^\/compare(\/(llm|scraping|proxy|gpu|pdf|monitoring))?(\.md)?$/.test(u.pathname.replace(/\/+$/, "")))) {
      const ua = req.headers.get("user-agent") || "";
      const who = ua.startsWith("api-router-internal") ? "internal" : "outside";
      const cip = req.headers.get("cf-connecting-ip") || "", cls = family(ua);
      const caller = (calls, mcp) => who === "outside" && cip ? [{ kind: "caller", cls, ip: cip, ua: ua.slice(0, 200), calls, mcp }] : [];
      record(env, ctx, [{ kind: "path:" + who, key: u.pathname }, { kind: "client:" + who, key: cls }, ...caller(1, 0)]);
      evt = (key) => record(env, ctx, [{ kind: "mcp:" + who, key }, ...(key.startsWith("tool:") ? caller(0, 1) : [])]);
    }
    if (u.pathname.replace(/\/+$/, "").replace(/\.md$/, "") === "/free-tiers" || u.pathname.startsWith("/answers/")) { const an = await handleAnswers(u, env, getHealth, req); if (an) return an; }
    if (u.pathname === "/compare" || u.pathname.replace(/\/+$/, "") === "/uptime" || u.pathname === "/uptime.md" || u.pathname.startsWith("/compare/") || u.pathname === "/sitemap.xml" || u.pathname === "/robots.txt") { const pg = await handlePages(u, env, getHealth, req); if (pg) return pg; }
    if (u.pathname === "/mcp") return handleMcp(req, (p, init) => worker.fetch(new Request(BASE + p, init), env), evt);
    const extra = routeExtras(req, u); if (extra) return extra;
    if (u.pathname === "/" || u.pathname === "/v1/status") return J({ name: "api-router", endpoints: ["/v1/best-route", "/v1/catalog", "/v1/health-route", "/v1/json-repair", "/v1/page-to-markdown", "/v1/check-quote", "/v1/check-url", "/v1/check-email", "/v1/convert-time", "/v1/convert-units", "/v1/convert-currency", "/mcp", "/llms.txt", "/.well-known/agent-card.json"], x402_mode: "standby" });
    if (u.pathname === "/v1/catalog") {
      const out = []; for (const p of partners.providers) out.push(shape(p, await getHealth(env, p.id)));
      return J({ health_rule: HEALTH_RULE, providers: out });
    }
    if (u.pathname === "/v1/best-route") {
      const cat = TASK[u.searchParams.get("task")]; if (!cat) return J({ error: "task must be one of inference|scraping|gpu|storage|proxy|pdf|monitoring" }, 400);
      const scored = [];
      for (const p of partners.providers.filter((x) => x.category === cat)) scored.push(shape(p, await getHealth(env, p.id)));
      const budget = u.searchParams.get("budget") || "low";
      if (budget === "fast") scored.sort((a, b) => (a.health?.latency_ms ?? 1e9) - (b.health?.latency_ms ?? 1e9));
      return J({ task: u.searchParams.get("task"), budget, best: scored[0] || null, alternatives: scored.slice(1) });
    }
    if (u.pathname === "/v1/health-route") {
      const cat = u.searchParams.get("category"); if (!CATS.includes(cat)) return J({ error: "category must be one of " + CATS.join("|") }, 400);
      const c = [];
      for (const p of partners.providers.filter((x) => x.category === cat)) c.push(shape(p, await getHealth(env, p.id)));
      const ok = c.filter((x) => x.health?.is_healthy).sort((a, b) => a.health.latency_ms - b.health.latency_ms);
      const deg = c.filter((x) => x.health?.state === "degraded").sort((a, b) => a.health.latency_ms - b.health.latency_ms);
      return J({ category: cat, fastest_healthy: ok[0] || null, others: c.filter((x) => x !== ok[0]), fallback_degraded: ok.length ? undefined : deg[0] || null, health_rule: HEALTH_RULE, note: ok.length ? undefined : deg.length ? "no provider is fully up; fallback_degraded answered with a 4xx on the probe URL, see health_rule" : "no healthy data yet; telemetry runs every 15 minutes" });
    }
    if (u.pathname === "/v2/metered-proxy") return J({ error: "not active", x402_mode: "standby" }, 501);
    return J({ error: "not found" }, 404);
  },
  async scheduled(evt, env) {
    if (!env.HEALTH) return;
    const all = [];
    for (const p of partners.providers) { const h = await probe(p); await env.HEALTH.put("h:" + p.id, JSON.stringify(h)); all.push({ id: p.id, ...h }); }
    try { const day = new Date().toISOString().slice(0, 10); const cur = JSON.parse((await env.HEALTH.get("d:" + day)) || "{}"); for (const h of all) { const c = cur[h.id] || { n: 0, up: 0, lat: 0 }; c.n++; c.up += h.reachable ? 1 : 0; c.n2 = (c.n2 || 0) + 1; c.ok = (c.ok || 0) + (h.is_healthy ? 1 : 0); c.lat += h.latency_ms; cur[h.id] = c; } await env.HEALTH.put("d:" + day, JSON.stringify(cur), { expirationTtl: 60 * 86400 }); } catch (e) {}
    if (evt.cron === "0 3 * * *" && env.GITHUB_TOKEN && env.GITHUB_REPO) {
      const md = ["# State of AI APIs (auto-updated daily)", "", "| Provider | Category | Status | Latency ms | Free-credit link |", "|---|---|---|---|---|"]
        .concat(partners.providers.map((p) => { const h = all.find((x) => x.id === p.id); return `| ${p.name} | ${p.category} | ${h.state} | ${h.latency_ms} | [${p.user_bonus_description}](${p.referral_url}) |`; })).join("\n") + `\n\nGenerated ${new Date().toISOString()}\n`;
      const put = async (path, content) => {
        const api = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`; const hd = { authorization: "Bearer " + env.GITHUB_TOKEN, "user-agent": "api-router", accept: "application/vnd.github+json" };
        const cur = await fetch(api, { headers: hd }); const sha = cur.ok ? (await cur.json()).sha : undefined;
        await fetch(api, { method: "PUT", headers: hd, body: JSON.stringify({ message: "chore: daily benchmark", content: btoa(unescape(encodeURIComponent(content))), sha }) });
      };
      await put("benchmarks/latest.md", md); await put("benchmarks/latest.json", JSON.stringify({ generated: new Date().toISOString(), results: all }, null, 2));
    }
  },
};
export default worker;
