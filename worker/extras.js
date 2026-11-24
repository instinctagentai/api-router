// Deterministic helpers: JSON repair/validate, page-to-markdown, agent card, llms.txt. No LLM, no paid services.
export const BASE = "https://api-router.instinctagentai.workers.dev";
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type" };
export const J = (o, s = 200, extra = {}) => new Response(JSON.stringify(o, null, 2), { status: s, headers: { "content-type": "application/json", ...CORS, ...extra } });
const T = (t, ct, s = 200, extra = {}) => new Response(t, { status: s, headers: { "content-type": ct, ...CORS, ...extra } });

// ---------- JSON repair ----------
export function repairJson(input) {
  const fixes = [];
  let s = String(input);
  const fence = s.match(/```(?:json|JSON|js|javascript)?\s*([\s\S]*?)```/);
  if (fence) { s = fence[1]; fixes.push("removed code fence"); }
  const start = s.search(/[\[{]/);
  if (start === -1) { const t = s.trim(); if (/^(true|false|null|-?\d)/.test(t)) start0(); else throw new Error("no JSON object or array found"); }
  function start0() {}
  if (start > 0) { fixes.push("dropped text before JSON"); s = s.slice(start); }
  let i = 0;
  const n = s.length;
  const ws = () => {
    for (;;) {
      while (i < n && /\s/.test(s[i])) i++;
      if (s[i] === "/" && s[i + 1] === "/") { while (i < n && s[i] !== "\n") i++; fixes.push("removed // comment"); }
      else if (s[i] === "/" && s[i + 1] === "*") { const e = s.indexOf("*/", i + 2); i = e === -1 ? n : e + 2; fixes.push("removed /* comment */"); }
      else if (s[i] === "#") { while (i < n && s[i] !== "\n") i++; fixes.push("removed # comment"); }
      else break;
    }
  };
  const str = () => {
    const q = s[i]; i++;
    let out = "";
    if (q !== '"') fixes.push("converted quotes to double quotes");
    while (i < n && s[i] !== q) {
      if (s[i] === "\\") {
        const c = s[i + 1]; i += 2;
        if (c === "n") out += "\n"; else if (c === "t") out += "\t"; else if (c === "r") out += "\r"; else if (c === "b") out += "\b"; else if (c === "f") out += "\f";
        else if (c === "u") { const h = s.slice(i, i + 4); if (/^[0-9a-fA-F]{4}$/.test(h)) { out += String.fromCharCode(parseInt(h, 16)); i += 4; } else out += "u"; }
        else if (c === undefined) break; else out += c;
      } else { if (s[i] === "\n") fixes.push("escaped raw newline in string"); out += s[i]; i++; }
    }
    if (i >= n) fixes.push("closed unterminated string"); else i++;
    return out;
  };
  const bare = () => {
    let j = i;
    while (j < n && !/[,:\]\}\s]/.test(s[j])) j++;
    const w = s.slice(i, j); i = j; return w;
  };
  const val = () => {
    ws();
    const c = s[i];
    if (c === "{") return obj();
    if (c === "[") return arr();
    if (c === '"' || c === "'" || c === "`") return str();
    const w = bare();
    if (w === "") { fixes.push("filled missing value with null"); return null; }
    if (w === "true" || w === "True") { if (w !== "true") fixes.push("normalised " + w); return true; }
    if (w === "false" || w === "False") { if (w !== "false") fixes.push("normalised " + w); return false; }
    if (w === "null" || w === "None" || w === "undefined" || w === "NaN") { if (w !== "null") fixes.push("normalised " + w + " to null"); return null; }
    if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(w)) return Number(w);
    fixes.push("quoted bare word"); return w;
  };
  const obj = () => {
    i++; const o = {};
    for (;;) {
      ws();
      if (i >= n) { fixes.push("closed unterminated object"); return o; }
      if (s[i] === "}") { i++; return o; }
      if (s[i] === ",") { i++; fixes.push("removed extra comma"); continue; }
      let k;
      if (s[i] === '"' || s[i] === "'") k = str(); else { k = bare(); if (k === "") { i++; continue; } fixes.push("quoted bare key"); }
      ws();
      if (s[i] === ":" || s[i] === "=") i++; else fixes.push("inserted missing colon");
      o[k] = val();
      ws();
      if (s[i] === ",") { i++; ws(); if (s[i] === "}") fixes.push("removed trailing comma"); }
      else if (s[i] !== "}" && i < n) fixes.push("inserted missing comma");
    }
  };
  const arr = () => {
    i++; const a = [];
    for (;;) {
      ws();
      if (i >= n) { fixes.push("closed unterminated array"); return a; }
      if (s[i] === "]") { i++; return a; }
      if (s[i] === ",") { i++; fixes.push("removed extra comma"); continue; }
      if (s[i] === "}") { i++; continue; }
      a.push(val());
      ws();
      if (s[i] === ",") { i++; ws(); if (s[i] === "]") fixes.push("removed trailing comma"); }
      else if (s[i] !== "]" && i < n) fixes.push("inserted missing comma");
    }
  };
  const value = val();
  const uniq = [...new Set(fixes)];
  return { value, repaired: uniq.length > 0, fixes: uniq };
}

// ---------- minimal JSON Schema validation (type, enum, const, required, properties, items, min/max, length, pattern) ----------
export function validateSchema(v, sc, path = "$", errs = []) {
  if (!sc || typeof sc !== "object") return errs;
  const tn = v === null ? "null" : Array.isArray(v) ? "array" : typeof v;
  if (sc.type) {
    const ts = [].concat(sc.type);
    const ok = ts.some((t) => t === tn || (t === "integer" && tn === "number" && Number.isInteger(v)));
    if (!ok) { errs.push({ path, error: `expected ${ts.join("|")}, got ${tn}` }); return errs; }
  }
  if (sc.enum && !sc.enum.some((e) => JSON.stringify(e) === JSON.stringify(v))) errs.push({ path, error: "value not in enum" });
  if ("const" in sc && JSON.stringify(sc.const) !== JSON.stringify(v)) errs.push({ path, error: "value does not match const" });
  if (tn === "number") {
    if (sc.minimum !== undefined && v < sc.minimum) errs.push({ path, error: "below minimum " + sc.minimum });
    if (sc.maximum !== undefined && v > sc.maximum) errs.push({ path, error: "above maximum " + sc.maximum });
  }
  if (tn === "string") {
    if (sc.minLength !== undefined && v.length < sc.minLength) errs.push({ path, error: "shorter than minLength " + sc.minLength });
    if (sc.maxLength !== undefined && v.length > sc.maxLength) errs.push({ path, error: "longer than maxLength " + sc.maxLength });
    if (sc.pattern) { try { if (!new RegExp(sc.pattern).test(v)) errs.push({ path, error: "does not match pattern" }); } catch (e) {} }
  }
  if (tn === "object") {
    for (const r of sc.required || []) if (!(r in v)) errs.push({ path: path + "." + r, error: "required property missing" });
    for (const [k, sub] of Object.entries(sc.properties || {})) if (k in v) validateSchema(v[k], sub, path + "." + k, errs);
    if (sc.additionalProperties === false) for (const k of Object.keys(v)) if (!(sc.properties || {})[k]) errs.push({ path: path + "." + k, error: "additional property not allowed" });
  }
  if (tn === "array") {
    if (sc.minItems !== undefined && v.length < sc.minItems) errs.push({ path, error: "fewer than minItems " + sc.minItems });
    if (sc.maxItems !== undefined && v.length > sc.maxItems) errs.push({ path, error: "more than maxItems " + sc.maxItems });
    if (sc.items) v.forEach((x, idx) => validateSchema(x, sc.items, `${path}[${idx}]`, errs));
  }
  return errs;
}

export async function handleJsonRepair(req) {
  let body;
  if (req.method === "POST") {
    const raw = await req.text();
    if (raw.length > 200000) return J({ error: "input too large (max 200000 chars)" }, 413);
    try { body = JSON.parse(raw); } catch (e) { body = { text: raw }; }
    if (typeof body !== "object" || body === null || Array.isArray(body) || typeof body.text !== "string") body = { text: raw };
  } else return J({ usage: "POST /v1/json-repair with {\"text\": \"<broken json>\", \"schema\": {optional JSON Schema subset}}", free: true }, 200);
  let r;
  try { r = repairJson(body.text); } catch (e) { return J({ ok: false, error: String(e.message || e) }, 422); }
  const out = { ok: true, repaired: r.repaired, fixes: r.fixes, json: r.value };
  if (body.schema) { const errs = validateSchema(r.value, body.schema); out.valid = errs.length === 0; out.errors = errs; }
  return J(out);
}

// ---------- page to markdown ----------
const ent = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", mdash: "-", ndash: "-", hellip: "...", rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', copy: "(c)" };
const unent = (t) => t.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === "#") { const c = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); try { return String.fromCodePoint(c); } catch (x) { return ""; } }
  return ent[e.toLowerCase()] ?? m;
});
export function htmlToMarkdown(html, baseUrl) {
  const title = unent((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ""])[1]).replace(/\s+/g, " ").trim();
  let h = html.replace(/<!--[\s\S]*?-->/g, "");
  for (const t of ["script", "style", "noscript", "svg", "template", "iframe", "form", "nav", "footer", "aside", "head"]) h = h.replace(new RegExp(`<${t}\\b[\\s\\S]*?</${t}>`, "gi"), "");
  const main = h.match(/<main\b[\s\S]*?<\/main>/i) || h.match(/<article\b[\s\S]*?<\/article>/i);
  if (main) h = main[0];
  const abs = (u) => { try { return new URL(unent(u), baseUrl).href; } catch (e) { return u; } };
  h = h.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (m, c) => "\n\n```\n" + unent(c.replace(/<[^>]+>/g, "")).replace(/\n+$/, "") + "\n```\n\n");
  h = h.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (m, c) => "`" + c.replace(/<[^>]+>/g, "") + "`");
  h = h.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (m, l, c) => "\n\n" + "#".repeat(+l) + " " + c.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() + "\n\n");
  h = h.replace(/<a\b[^>]*?href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (m, href, c) => { const t = c.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(); return t && !/^(#|javascript:)/i.test(href) ? `[${t}](${abs(href)})` : t; });
  h = h.replace(/<img\b[^>]*?alt=["']([^"']+)["'][^>]*?src=["']([^"']+)["'][^>]*>/gi, (m, a, s) => `![${a}](${abs(s)})`);
  h = h.replace(/<img\b[^>]*?src=["']([^"']+)["'][^>]*?alt=["']([^"']+)["'][^>]*>/gi, (m, s, a) => `![${a}](${abs(s)})`);
  h = h.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (m, t, c) => (c.trim() ? "**" + c.trim() + "**" : ""));
  h = h.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (m, t, c) => (c.trim() ? "*" + c.trim() + "*" : ""));
  h = h.replace(/<li\b[^>]*>/gi, "\n- ").replace(/<\/li>/gi, "");
  h = h.replace(/<br\s*\/?>/gi, "  \n").replace(/<hr\s*\/?>/gi, "\n\n---\n\n");
  h = h.replace(/<blockquote\b[^>]*>/gi, "\n\n> ").replace(/<\/(p|div|section|blockquote|ul|ol|table|tr|header|figure|figcaption|dl)>/gi, "\n\n");
  h = h.replace(/<\/(td|th)>/gi, " | ").replace(/<(p|div|section|ul|ol|table|tr|dt|dd)\b[^>]*>/gi, "\n");
  h = h.replace(/<[^>]+>/g, "");
  h = unent(h).replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return { title, markdown: h };
}

function blockedHost(host) {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal") || !h.includes(".") && !h.includes(":")) return true;
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) { const a = +m[1], b = +m[2]; return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127); }
  if (h.includes(":")) return true; // block raw IPv6 literals
  if (/^\d+$/.test(h) || /^0x/i.test(h)) return true;
  return false;
}

export const DAILY_LIMIT = 30;
async function rateLimit(req) {
  const ip = req.headers.get("cf-connecting-ip") || "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const key = new Request(`https://rl.invalid/${day}/${encodeURIComponent(ip)}`);
  const cache = caches.default;
  const hit = await cache.match(key);
  const used = hit ? parseInt(await hit.text(), 10) || 0 : 0;
  if (used >= DAILY_LIMIT) return { ok: false, used, remaining: 0 };
  await cache.put(key, new Response(String(used + 1), { headers: { "cache-control": "max-age=86400" } }));
  return { ok: true, used: used + 1, remaining: DAILY_LIMIT - used - 1 };
}

export async function handleMarkdown(req, u) {
  let target = u.searchParams.get("url");
  if (!target && req.method === "POST") { try { target = (await req.json()).url; } catch (e) {} }
  if (!target) return J({ usage: "GET /v1/page-to-markdown?url=https://example.com/page  (free, " + DAILY_LIMIT + " requests per IP per day)" }, 400);
  let t;
  try { t = new URL(target); } catch (e) { return J({ error: "invalid url" }, 400); }
  if (!/^https?:$/.test(t.protocol) || t.username || t.password || blockedHost(t.hostname) || (t.port && !["80", "443"].includes(t.port))) return J({ error: "url not allowed (public http/https hosts on default ports only)" }, 400);
  const rl = await rateLimit(req);
  const hd = { "x-ratelimit-limit": String(DAILY_LIMIT), "x-ratelimit-remaining": String(rl.remaining) };
  if (!rl.ok) return J({ error: "daily free limit reached", limit_per_day: DAILY_LIMIT, resets: "00:00 UTC" }, 429, hd);
  let r;
  try { r = await fetch(t.href, { redirect: "manual", headers: { "user-agent": "api-router-markdown/1.0 (+" + BASE + ")", accept: "text/html,application/xhtml+xml" }, signal: AbortSignal.timeout(8000) }); }
  catch (e) { return J({ error: "fetch failed" }, 502, hd); }
  if (r.status >= 300 && r.status < 400) {
    const loc = r.headers.get("location");
    let nt; try { nt = new URL(loc, t.href); } catch (e) { return J({ error: "bad redirect" }, 502, hd); }
    if (!/^https?:$/.test(nt.protocol) || blockedHost(nt.hostname) || (nt.port && !["80", "443"].includes(nt.port))) return J({ error: "redirect target not allowed" }, 400, hd);
    try { r = await fetch(nt.href, { redirect: "manual", headers: { "user-agent": "api-router-markdown/1.0", accept: "text/html" }, signal: AbortSignal.timeout(8000) }); t = nt; }
    catch (e) { return J({ error: "fetch failed" }, 502, hd); }
    if (r.status >= 300 && r.status < 400) return J({ error: "too many redirects" }, 502, hd);
  }
  if (!r.ok) return J({ error: "upstream returned " + r.status }, 502, hd);
  const ct = r.headers.get("content-type") || "";
  if (!/text\/html|application\/xhtml|text\/plain/i.test(ct)) return J({ error: "unsupported content type: " + ct.split(";")[0] }, 415, hd);
  const buf = await r.arrayBuffer();
  if (buf.byteLength > 1500000) return J({ error: "page too large (max 1.5 MB)" }, 413, hd);
  const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  const out = /text\/plain/i.test(ct) ? { title: "", markdown: html } : htmlToMarkdown(html, t.href);
  const fmt = u.searchParams.get("format");
  if (fmt === "md" || fmt === "text") return T((out.title ? "# " + out.title + "\n\n" : "") + out.markdown, "text/markdown; charset=utf-8", 200, hd);
  return J({ url: t.href, title: out.title, markdown: out.markdown, chars: out.markdown.length, remaining_today: rl.remaining }, 200, hd);
}

// ---------- discovery ----------

// ---------- Deterministic checkers (free, no LLM) ----------
const normTxt = (s) => String(s).normalize("NFKC").toLowerCase().replace(/[\u2018\u2019\u201B]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[*_`#>\[\]()]/g, " ").replace(/[^\p{L}\p{N}%.$,']+/gu, " ").replace(/(?<![\p{N}])[.,']+|[.,']+(?![\p{N}])/gu, " ").replace(/\s+/g, " ").trim();
export function checkQuote(quote, source) {
  const q = normTxt(quote), s = normTxt(source);
  if (!q) return { verdict: "invalid", error: "empty quote" };
  if (s.includes(q)) { const i = s.indexOf(q); return { verdict: "exact", coverage: 1, missing_numbers: [], best_match: s.slice(Math.max(0, i - 60), i + q.length + 60) }; }
  const qw = q.split(" "), sw = s.split(" "), need = new Map();
  for (const w of qw) need.set(w, (need.get(w) || 0) + 1);
  const win = Math.min(sw.length, Math.ceil(qw.length * 1.3) + 2), have = new Map();
  let matched = 0, best = -1, bestAt = 0;
  const add = (w) => { if (need.has(w)) { const h = have.get(w) || 0; if (h < need.get(w)) matched++; have.set(w, h + 1); } };
  const del = (w) => { if (need.has(w)) { const h = have.get(w); if (h <= need.get(w)) matched--; have.set(w, h - 1); } };
  for (let i = 0; i < sw.length; i++) { add(sw[i]); if (i >= win) del(sw[i - win]); if (i >= win - 1 || i === sw.length - 1) { if (matched > best) { best = matched; bestAt = Math.max(0, i - win + 1); } } }
  const coverage = Math.round((Math.max(best, 0) / qw.length) * 100) / 100;
  const region = sw.slice(bestAt, bestAt + win);
  const set = new Set(region);
  const nums = [...new Set(qw.filter((w) => /\p{N}/u.test(w)))];
  const missing_numbers = nums.filter((n) => !set.has(n));
  let verdict = coverage >= 0.9 && !missing_numbers.length ? "near" : coverage >= 0.6 ? "partial" : "not_found";
  return { verdict, coverage, missing_numbers, best_match: region.join(" ").slice(0, 400) };
}
export async function handleCheckQuote(req) {
  if (req.method !== "POST") return J({ usage: "POST /v1/check-quote {\"quote\": \"...\", \"text\": \"source text\"} or {\"quote\": \"...\", \"url\": \"https://...\"}. verdict: exact|near|partial|not_found. Compares after normalizing case, spacing, quotes and markdown. Deterministic, free. url mode uses the page-to-markdown daily limit.", free: true });
  let b; try { b = await req.json(); } catch (e) { return J({ error: "send JSON" }, 400); }
  if (!b || typeof b.quote !== "string") return J({ error: "quote (string) required" }, 400);
  if (b.quote.length > 5000) return J({ error: "quote too long (max 5000 chars)" }, 413);
  let text = typeof b.text === "string" ? b.text : null, source = "text";
  if (text !== null && text.length > 1500000) return J({ error: "text too large (max 1.5M chars)" }, 413);
  if (text === null && typeof b.url === "string") {
    const r = await handleMarkdown(new Request(BASE + "/v1/page-to-markdown", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": req.headers.get("cf-connecting-ip") || "unknown" }, body: JSON.stringify({ url: b.url }) }), new URL(BASE + "/v1/page-to-markdown"));
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return J({ error: "could not fetch url: " + (j.error || r.status) }, r.status === 429 ? 429 : 502);
    text = j.markdown || ""; source = j.url;
  }
  if (text === null) return J({ error: "provide text or url" }, 400);
  return J({ source, ...checkQuote(b.quote, text), note: "Matches wording, not truth. A page can contain a quote and still be wrong." });
}
export async function handleCheckUrl(req, u) {
  let target = u.searchParams.get("url");
  if (!target && req.method === "POST") { try { target = (await req.json()).url; } catch (e) {} }
  if (!target) return J({ usage: "GET /v1/check-url?url=https://example.com : does it resolve, final status, redirects, content type, title. Free, shares the " + DAILY_LIMIT + "/day limit." }, 400);
  let t; try { t = new URL(target); } catch (e) { return J({ error: "invalid url" }, 400); }
  const ok = (x) => /^https?:$/.test(x.protocol) && !x.username && !x.password && !blockedHost(x.hostname) && (!x.port || ["80", "443"].includes(x.port));
  if (!ok(t)) return J({ error: "url not allowed (public http/https hosts on default ports only)" }, 400);
  const rl = await rateLimit(req);
  if (!rl.ok) return J({ error: "daily free limit reached", limit_per_day: DAILY_LIMIT }, 429);
  const chain = []; let r, cur = t, t0 = Date.now();
  for (let i = 0; i < 4; i++) {
    try { r = await fetch(cur.href, { redirect: "manual", headers: { "user-agent": "api-router-check/1.0 (+" + BASE + ")", accept: "text/html,*/*" }, signal: AbortSignal.timeout(8000) }); }
    catch (e) { return J({ url: t.href, resolves: false, error: "fetch failed", redirects: chain }, 200); }
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) {
      let nx; try { nx = new URL(r.headers.get("location"), cur.href); } catch (e) { return J({ url: t.href, resolves: false, error: "bad redirect", redirects: chain }); }
      chain.push({ status: r.status, to: nx.href });
      if (!ok(nx)) return J({ url: t.href, resolves: false, error: "redirect target not allowed", redirects: chain });
      cur = nx; continue;
    }
    break;
  }
  if (r.status >= 300 && r.status < 400) return J({ url: t.href, resolves: false, error: "too many redirects", redirects: chain });
  const ct = r.headers.get("content-type") || "";
  let title = null;
  if (/text\/html/i.test(ct)) { const txt = (await r.text()).slice(0, 200000); const m = txt.match(/<title[^>]*>([\s\S]*?)<\/title>/i); if (m) title = m[1].replace(/\s+/g, " ").trim().slice(0, 200); }
  return J({ url: t.href, resolves: r.status < 400, status: r.status, final_url: cur.href, redirects: chain, content_type: ct.split(";")[0] || null, title, ms: Date.now() - t0, checked_at: new Date().toISOString(), remaining_today: rl.remaining });
}

export const agentCard = () => ({
  protocolVersion: "0.3.0",
  name: "API Router",
  description: "Free, deterministic API directory and utilities for AI agents: compare LLM, scraping, proxy and GPU providers by free tier, health and latency; repair broken JSON; convert web pages to clean markdown. No LLM runs in the request path.",
  url: BASE + "/",
  preferredTransport: "HTTP+JSON",
  additionalInterfaces: [{ url: BASE + "/mcp", transport: "MCP-STREAMABLE-HTTP" }],
  version: "0.2.0",
  provider: { organization: "instinctagentai", url: "https://github.com/instinctagentai/api-router" },
  documentationUrl: "https://github.com/instinctagentai/api-router#readme",
  capabilities: { streaming: false, pushNotifications: false },
  defaultInputModes: ["application/json", "text/plain"],
  defaultOutputModes: ["application/json", "text/markdown"],
  skills: [
    { id: "best-route", name: "Best route", description: "Pick the best provider for a task (inference|scraping|gpu|storage|proxy).", tags: ["routing", "api", "pricing"], examples: ["GET /v1/best-route?task=inference&budget=low"] },
    { id: "catalog", name: "Provider catalog", description: "List providers with free tier notes and health.", tags: ["catalog", "api"], examples: ["GET /v1/catalog"] },
    { id: "health-route", name: "Fastest healthy provider", description: "Fastest healthy provider in a category (llm|scraping|proxy|gpu).", tags: ["health", "latency"], examples: ["GET /v1/health-route?category=llm"] },
    { id: "json-repair", name: "JSON repair and validate", description: "Fix broken JSON (comments, trailing commas, single quotes, fences, truncation) and optionally validate against a JSON Schema subset.", tags: ["json", "validation"], inputModes: ["application/json", "text/plain"], examples: ["POST /v1/json-repair {\"text\":\"{a:1,}\"}"] },
    { id: "check-quote", name: "Quote checker", description: "Check whether a quote appears in a source text or URL. Returns exact, near, partial or not_found, with missing numbers. Matches wording only, not truth.", tags: ["verification", "citation", "hallucination"], inputModes: ["application/json"], examples: ["POST /v1/check-quote {\"quote\":\"...\",\"url\":\"https://example.com\"}"] },
    { id: "check-url", name: "URL checker", description: "Does a URL resolve: final status, redirect chain, content type and title. Free, 30 per IP per day.", tags: ["verification", "links"], examples: ["GET /v1/check-url?url=https://example.com"] },
    { id: "page-to-markdown", name: "Page to markdown", description: "Fetch a public web page and return clean markdown. Free, 30 requests per IP per day.", tags: ["web", "markdown", "extraction"], examples: ["GET /v1/page-to-markdown?url=https://example.com"] },
  ],
});

export const llmsTxt = () => `# API Router

> Free, deterministic HTTP API and MCP server for AI agents. Compare LLM, scraping, proxy and GPU providers by free tier, health and latency; repair broken JSON; convert web pages to markdown. No LLM in the request path, no API key needed.

Base URL: ${BASE}

## Endpoints
- GET /v1/catalog : all providers with free-tier notes and health
- GET /v1/best-route?task=inference|scraping|gpu|storage|proxy&budget=low|fast : best provider for a task
- GET /v1/health-route?category=llm|scraping|proxy|gpu : fastest healthy provider
- POST /v1/json-repair : body {"text": "...", "schema": {optional}} returns repaired JSON and validation errors
- GET /v1/page-to-markdown?url=...&format=md : clean markdown of a public page (30 per IP per day)

- POST /v1/check-quote : body {"quote": "...", "text": "..."} or {"quote": "...", "url": "..."} returns exact|near|partial|not_found (wording match only, not truth)
- GET /v1/check-url?url=... : does a URL resolve, status, redirects, content type, title (30 per IP per day, shared)

## Discovery
- Agent card: ${BASE}/.well-known/agent-card.json
- MCP server (local, stdio): npx mcp-api-router
- MCP server (remote, streamable HTTP, no auth): ${BASE}/mcp
- Source: https://github.com/instinctagentai/api-router

## Comparison pages (HTML, live status)
- ${BASE}/compare
- ${BASE}/compare/llm , /compare/scraping , /compare/proxy , /compare/gpu , /compare/pdf , /compare/monitoring
- Each category page also has a plain markdown version: add .md (for example ${BASE}/compare/scraping.md) or send Accept: text/markdown
- Pages start with a short answer, show when the data was last checked, and mark referral links

## Notes
Some provider links are referral links of the operator. Each provider entry says whether a user bonus is verified (bonus_verified).
`;

export function routeExtras(req, u) {
  const p = u.pathname;
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (p === "/.well-known/agent-card.json" || p === "/.well-known/agent.json") return J(agentCard());
  if (p === "/llms.txt") return T(llmsTxt(), "text/plain; charset=utf-8");
  if (p === "/v1/json-repair") return handleJsonRepair(req);
  if (p === "/v1/page-to-markdown") return handleMarkdown(req, u);
  if (p === "/v1/check-quote") return handleCheckQuote(req);
  if (p === "/v1/check-url") return handleCheckUrl(req, u);
  return null;
}
