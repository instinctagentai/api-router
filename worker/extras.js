import partners from "../partners.json";
// Probe budget: Cloudflare free plan allows 50 subrequests per run. Each run uses at most MAX_PROBES HEAD probes (redirects are not followed) plus about 8 KV and GitHub calls.
export const MAX_PROBES = 36;
export const PROBE_GROUPS = Math.max(1, Math.ceil(partners.providers.length / MAX_PROBES));
export const REFRESH_MIN = 15 * PROBE_GROUPS;
// Deterministic helpers: JSON repair/validate, page-to-markdown, agent card, llms.txt. No LLM, no paid services.
export const HEALTH_RULE = "One HEAD request per provider every " + REFRESH_MIN + " minutes from a Cloudflare Worker. state=up: HTTP 200-399. state=degraded: the host answered but the probe URL returned a 4xx status (for example 401, 403, 404 or 405). That often just means the root path needs a key or does not exist, so it is a warning, not proof the API is broken. state=rate_limited: HTTP 429. state=down: HTTP 500 or higher, a timeout or no answer. is_healthy is true only for state=up. This measures whether the API host answers, not real workload success, price or quality.";
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

// ---------- More free checkers: email, time, units, currency ----------
const ROLE = new Set(["admin", "administrator", "postmaster", "hostmaster", "webmaster", "abuse", "noreply", "no-reply", "info", "support", "sales", "contact", "billing", "help", "office", "hello", "team"]);
const DISPOSABLE = new Set(["mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "yopmail.com", "trashmail.com", "sharklasers.com", "throwawaymail.com", "temp-mail.org", "getnada.com"]);
async function doh(name, type) {
  const r = await fetch("https://cloudflare-dns.com/dns-query?name=" + encodeURIComponent(name) + "&type=" + type, { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(5000) });
  if (!r.ok) throw new Error("dns " + r.status);
  return r.json();
}
export async function handleCheckEmail(req, u) {
  let email = u.searchParams.get("email");
  if (!email && req.method === "POST") { try { email = (await req.json()).email; } catch (e) {} }
  if (typeof email !== "string" || !email) return J({ usage: "GET /v1/check-email?email=name@example.com : syntax, domain DNS and mail server (MX) check. Does not contact the mailbox, so it cannot prove an address exists. Free, shares the " + DAILY_LIMIT + "/day limit." }, 400);
  email = email.trim();
  const out = { email, syntax_valid: false };
  const at = email.lastIndexOf("@");
  if (email.length > 254 || at < 1) return J({ ...out, reason: "must look like name@domain" });
  const local = email.slice(0, at), domain = email.slice(at + 1).toLowerCase();
  const labels = domain.split(".");
  const okLocal = local.length <= 64 && /^[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+(\.[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+)*$/.test(local);
  const okDomain = labels.length >= 2 && labels.every((l) => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(l)) && /^[a-z]{2,}$|^xn--/.test(labels[labels.length - 1]);
  if (!okLocal) return J({ ...out, reason: "invalid local part" });
  if (!okDomain) return J({ ...out, reason: "invalid domain" });
  out.syntax_valid = true; out.normalized = local + "@" + domain; out.domain = domain;
  out.role_account = ROLE.has(local.toLowerCase());
  out.known_disposable_domain = DISPOSABLE.has(domain);
  const rl = await rateLimit(req);
  if (!rl.ok) return J({ error: "daily free limit reached", limit_per_day: DAILY_LIMIT }, 429);
  try {
    const mx = await doh(domain, "MX");
    if (mx.Status === 3) { out.domain_exists = false; out.accepts_mail = false; out.reason = "domain does not exist (NXDOMAIN)"; }
    else {
      const recs = (mx.Answer || []).filter((a) => a.type === 15).map((a) => a.data.trim());
      out.domain_exists = true; out.mx = recs.slice(0, 5);
      if (recs.length === 1 && /^0\s+\.?$/.test(recs[0])) { out.accepts_mail = false; out.reason = "domain publishes a null MX (accepts no mail)"; }
      else if (recs.length) out.accepts_mail = true;
      else { const a = await doh(domain, "A"); out.accepts_mail = (a.Answer || []).some((x) => x.type === 1); out.reason = out.accepts_mail ? "no MX record, falls back to the domain's A record" : "no MX or A record"; }
    }
  } catch (e) { out.dns_error = "DNS lookup failed; syntax result still valid"; }
  out.note = "A passing check means the domain can receive mail, not that this mailbox exists. Disposable list is small and incomplete.";
  out.remaining_today = rl.remaining;
  return J(out);
}

function tzOffsetMs(ts, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(ts)).filter((x) => x.type !== "literal").map((x) => [x.type, +x.value]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ts / 1000) * 1000;
}
const fmtOff = (ms) => { const m = Math.round(ms / 60000), s = m < 0 ? "-" : "+", a = Math.abs(m); return s + String(Math.floor(a / 60)).padStart(2, "0") + ":" + String(a % 60).padStart(2, "0"); };
const validTz = (tz) => { try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch (e) { return false; } };
export function convertTime(time, from, to) {
  if (!validTz(to) || (from && !validTz(from))) return { error: "unknown time zone; use IANA names such as Asia/Qatar or America/New_York" };
  let utc;
  if (!time) utc = Date.now();
  else {
    const m = String(time).trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?\s*(Z|[+-]\d{2}:?\d{2})?$/);
    if (!m) return { error: "time must look like 2026-11-25T14:30 (optionally with Z or +03:00)" };
    const loc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
    if (m[7]) { const o = m[7] === "Z" ? 0 : (m[7][0] === "-" ? -1 : 1) * (+m[7].slice(1, 3) * 60 + +m[7].slice(-2)) * 60000; utc = loc - o; }
    else { if (!from) return { error: "give a from time zone, or an offset in the time" }; utc = loc - tzOffsetMs(loc, from); utc = loc - tzOffsetMs(utc, from); }
  }
  const f = (tz) => { const o = tzOffsetMs(utc, tz), d = new Date(utc + o).toISOString().slice(0, 19); return { time_zone: tz, local_time: d, offset: fmtOff(o), iso: d + fmtOff(o) }; };
  return { utc: new Date(utc).toISOString(), ...(from ? { from: f(from) } : {}), to: f(to), note: "Uses the IANA time zone rules built into the runtime. For a local time skipped or repeated by a DST change the result picks one valid instant." };
}
export function handleConvertTime(u) {
  const to = u.searchParams.get("to");
  if (!to) return J({ usage: "GET /v1/convert-time?time=2026-11-25T14:30&from=Asia/Qatar&to=America/New_York (time optional, defaults to now)" }, 400);
  const r = convertTime(u.searchParams.get("time"), u.searchParams.get("from"), to);
  return J(r, r.error ? 400 : 200);
}

const UNITS = {
  length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254, nmi: 1852 },
  mass: { kg: 1, g: 0.001, mg: 1e-6, t: 1000, lb: 0.45359237, oz: 0.028349523125 },
  volume: { l: 1, ml: 0.001, m3: 1000, gal: 3.785411784, qt: 0.946352946, pt: 0.473176473, cup: 0.2365882365, floz: 0.0295735295625 },
  area: { m2: 1, km2: 1e6, ha: 1e4, ft2: 0.09290304, ac: 4046.8564224 },
  speed: { "m/s": 1, "km/h": 1 / 3.6, mph: 0.44704, kn: 1852 / 3600 },
  data: { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 1024, MiB: 1048576, GiB: 1073741824 },
  time: { s: 1, min: 60, h: 3600, d: 86400 },
};
export function convertUnits(value, from, to) {
  if (!isFinite(value)) return { error: "value must be a number" };
  const tf = ["C", "F", "K"];
  if (tf.includes(from) || tf.includes(to)) {
    if (!tf.includes(from) || !tf.includes(to)) return { error: "cannot convert between temperature and other units" };
    const k = from === "C" ? value + 273.15 : from === "F" ? (value - 32) * 5 / 9 + 273.15 : value;
    if (k < 0) return { error: "below absolute zero" };
    const r = to === "C" ? k - 273.15 : to === "F" ? (k - 273.15) * 9 / 5 + 32 : k;
    return { value, from, to, result: +r.toPrecision(12), category: "temperature" };
  }
  for (const [cat, t] of Object.entries(UNITS)) if (from in t && to in t) return { value, from, to, result: +(value * t[from] / t[to]).toPrecision(12), category: cat, note: cat === "volume" ? "gal, qt, pt, cup, floz are US units" : cat === "data" ? "KB/MB/GB are decimal (1000); KiB/MiB/GiB are binary (1024)" : undefined };
  return { error: "unsupported or mismatched units", supported: { ...Object.fromEntries(Object.entries(UNITS).map(([k, v]) => [k, Object.keys(v)])), temperature: tf } };
}
export function handleConvertUnits(u) {
  const v = u.searchParams.get("value"), from = u.searchParams.get("from"), to = u.searchParams.get("to");
  if (v === null || !from || !to) return J({ usage: "GET /v1/convert-units?value=10&from=km&to=mi", supported: { ...Object.fromEntries(Object.entries(UNITS).map(([k, x]) => [k, Object.keys(x)])), temperature: ["C", "F", "K"] } }, 400);
  const r = convertUnits(Number(v), from, to);
  return J(r, r.error ? 400 : 200);
}

export async function handleConvertCurrency(req, u) {
  const amount = Number(u.searchParams.get("amount") ?? "1"), from = (u.searchParams.get("from") || "").toUpperCase(), to = (u.searchParams.get("to") || "").toUpperCase();
  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to) || !isFinite(amount)) return J({ usage: "GET /v1/convert-currency?amount=100&from=USD&to=EUR . Reference rates from central banks via frankfurter.dev, for information only, not a trading or payment rate. Free, shares the " + DAILY_LIMIT + "/day limit." }, 400);
  const rl = await rateLimit(req);
  if (!rl.ok) return J({ error: "daily free limit reached", limit_per_day: DAILY_LIMIT }, 429);
  if (from === to) return J({ amount, from, to, result: amount, rate: 1, remaining_today: rl.remaining });
  let j;
  try { const r = await fetch("https://api.frankfurter.dev/v1/latest?base=" + from + "&symbols=" + to, { signal: AbortSignal.timeout(6000), cf: { cacheTtl: 3600, cacheEverything: true } }); if (!r.ok) return J({ error: "currency not supported by the rate source (" + r.status + ")" }, 400); j = await r.json(); } catch (e) { return J({ error: "rate source unavailable" }, 502); }
  const rate = j.rates && j.rates[to];
  if (!rate) return J({ error: "currency not supported by the rate source" }, 400);
  return J({ amount, from, to, rate, result: +(amount * rate).toFixed(6), rate_date: j.date, source: "frankfurter.dev (central bank reference rates)", note: "Reference rate for information only. Not the rate a bank or exchange will give you.", remaining_today: rl.remaining });
}

export const agentCard = () => ({
  protocolVersion: "0.3.0",
  name: "API Router",
  description: "Free, deterministic API directory and utilities for AI agents: compare LLM, scraping, proxy and GPU providers by free tier, health and latency; repair broken JSON; convert web pages to clean markdown. No LLM runs in the request path.",
  url: BASE + "/",
  preferredTransport: "HTTP+JSON",
  additionalInterfaces: [{ url: BASE + "/mcp", transport: "MCP-STREAMABLE-HTTP" }, { url: BASE + "/mcp/ask", transport: "MCP-STREAMABLE-HTTP" }],
  version: "0.2.8",
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
    {"id":"check-email","name":"Email checker","description":"Syntax, domain and mail server (MX) check for an email address. Does not prove the mailbox exists.","tags":["verification","email"],"examples":["GET /v1/check-email?email=name@example.com"]},
    {"id":"convert-time","name":"Time zone converter","description":"Convert a date and time between IANA time zones.","tags":["time","timezone"],"examples":["GET /v1/convert-time?time=2026-11-25T14:30&from=Asia/Qatar&to=America/New_York"]},
    {"id":"convert-units","name":"Unit converter","description":"Convert length, mass, volume, area, speed, data, time and temperature units.","tags":["units","conversion"],"examples":["GET /v1/convert-units?value=10&from=km&to=mi"]},
    {"id":"convert-currency","name":"Currency converter","description":"Convert currencies with central bank reference rates (information only). 30 per IP per day.","tags":["currency","conversion"],"examples":["GET /v1/convert-currency?amount=100&from=USD&to=EUR"]},
    { id: "page-to-markdown", name: "Page to markdown", description: "Fetch a public web page and return clean markdown. Free, 30 requests per IP per day.", tags: ["web", "markdown", "extraction"], examples: ["GET /v1/page-to-markdown?url=https://example.com"] },
  ],
});

export const aiCatalog = () => ({
  name: "api-router",
  description: "Free, source-linked and dated free-tier facts for AI and developer API providers, plus free utility tools for agents. No API key, no LLM in the request path.",
  note: "Simple index of this site's resources. Not a formal standard we verified; read /llms.txt for the same list in prose.",
  url: BASE,
  entries: [
    { type: "mcp-server", name: "api-router (agent tool names)", url: BASE + "/mcp", transport: "streamable-http", auth: "none" },
    { type: "mcp-server", name: "api-router (question-style tool names)", url: BASE + "/mcp/ask", transport: "streamable-http", auth: "none" },
    { type: "dataset", name: "Provider catalog (JSON)", url: BASE + "/v1/catalog", media_type: "application/json" },
    { type: "feed", name: "New and re-verified rows (JSON)", url: BASE + "/v1/changes", media_type: "application/json" },
    { type: "feed", name: "New and re-verified rows (Atom)", url: BASE + "/feed.xml", media_type: "application/atom+xml" },
    { type: "openapi", name: "OpenAPI description", url: BASE + "/openapi.json", media_type: "application/json" },
    { type: "document", name: "Free-tier cheat sheet", url: BASE + "/free-tiers", markdown: BASE + "/free-tiers.md" },
    { type: "document", name: "Free stack for vibe-coded apps", url: BASE + "/best/free-stack-for-vibe-coded-apps", markdown: BASE + "/best/free-stack-for-vibe-coded-apps.md" },
    { type: "agent-card", name: "Agent card", url: BASE + "/.well-known/agent-card.json" },
    { type: "documentation", name: "llms.txt", url: BASE + "/llms.txt" },
    { type: "source", name: "Source code", url: "https://github.com/instinctagentai/api-router" }
  ]
});
export const llmsTxt = () => `# API Router

> Free, deterministic HTTP API and MCP server for AI agents. Compare LLM, scraping, proxy and GPU providers by free tier, health and latency; repair broken JSON; convert web pages to markdown. No LLM in the request path, no API key needed.

Base URL: ${BASE}

## Endpoints
- GET /v1/catalog : all providers with free-tier notes and health
- GET /v1/changes and /feed.xml : newest and re-verified catalog rows (JSON and Atom)
- GET /v1/pick?need=login%20for%20my%20app&limit=5 : keyword-matched catalog rows with source and read date (no LLM)
- GET /openapi.json : OpenAPI description of the main endpoints
- GET /v1/best-route?task=inference|scraping|gpu|storage|proxy&budget=low|fast : best provider for a task
- GET /v1/health-route?category=llm|scraping|proxy|gpu : fastest healthy provider
- POST /v1/json-repair : body {"text": "...", "schema": {optional}} returns repaired JSON and validation errors
- GET /v1/page-to-markdown?url=...&format=md : clean markdown of a public page (30 per IP per day)

- POST /v1/check-quote : body {"quote": "...", "text": "..."} or {"quote": "...", "url": "..."} returns exact|near|partial|not_found (wording match only, not truth)
- GET /v1/check-url?url=... : does a URL resolve, status, redirects, content type, title (30 per IP per day, shared)

- GET /v1/check-email?email=... : syntax, domain and MX check (does not prove the mailbox exists; 30 per IP per day, shared)
- GET /v1/convert-time?time=2026-11-25T14:30&from=Asia/Qatar&to=America/New_York : time zone conversion
- GET /v1/convert-units?value=10&from=km&to=mi : unit conversion
- GET /v1/convert-currency?amount=100&from=USD&to=EUR : central bank reference rates, information only (30 per IP per day, shared)

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

## Free-tier answers (HTML + .md, dated, source-linked)
- ${BASE}/free-tiers : cheat sheet of verified free tiers, prices and limits (also /free-tiers.md)
- ${BASE}/answers/<provider>-free-tier-and-pricing : one page per provider, for example ${BASE}/answers/openrouter-free-tier-and-pricing (add .md for markdown)
- Only providers with a price read from their own page are listed; each row has a source link and read date

## Comparison roundups (dated, source-linked, no rankings)
- ${BASE}/best/free-llm-api , /best/free-gpu-cloud , /best/web-scraping-api , /best/pdf-api , /best/free-uptime-monitoring (add .md for markdown)
- More categories: ${BASE}/best/free-database , /best/free-auth , /best/free-app-hosting , /best/free-speech-api , /best/free-object-storage , /best/free-search-api , /best/free-vector-database , /best/free-email-api , /best/free-ocr-api , /best/free-embeddings-api , /best/free-image-api , /best/free-analytics , /best/free-error-monitoring , /best/free-message-queue , /best/free-ci-cd
- For vibe coders (people building apps with AI tools): ${BASE}/best/free-stack-for-vibe-coded-apps (includes copy-paste prompts for your AI coding tool)
- Machine-readable index of these resources: ${BASE}/.well-known/ai-catalog.json

## Questions people ask (HTML + .md, with example calls)
- ${BASE}/ask : index (also /ask.md)
- ${BASE}/ask/how-do-i-fix-broken-json-from-an-llm , /ask/is-this-url-working , /ask/is-this-email-address-valid , /ask/how-do-i-convert-time-zones , /ask/how-do-i-convert-units , /ask/what-is-the-exchange-rate-between-two-currencies , /ask/which-ai-api-has-a-free-tier
- MCP with question-style tool names (same functions): ${BASE}/mcp/ask ; the agent-named version stays at ${BASE}/mcp

## Health rule
Provider status uses four states: up (HTTP 200-399), degraded (4xx on the probe URL), rate_limited (429), down (5xx or no answer). Only up counts as healthy. See ${BASE}/uptime.

## Notes
Some provider links are referral links of the operator. Each provider entry says whether a user bonus is verified (bonus_verified).
`;


const recentItems = () => partners.providers.slice().reverse().slice(0, 40).map((x) => ({ id: x.id, name: x.name, category: x.category, price_summary: x.price_summary, price_source: x.price_source, checked: x.price_checked, referral_link_is_ours: !!(x.referral_url && x.referral_url !== x.signup_url) }));
export const changesDoc = (since) => { const ok = /^\d{4}-\d{2}-\d{2}$/.test(since || ""); const items = recentItems().filter((i) => !ok || (i.checked || "") >= since); return { note: "Most recently added or re-verified catalog rows, newest first. checked is the date we read price_source. Rows with referral_link_is_ours true use an affiliate link of the operator.", since: ok ? since : null, count: items.length, items }; };
const xe = (s) => String(s == null ? "" : s).replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]));
export const feedXml = () => { const it = recentItems(); const upd = it.map((i) => i.checked).filter(Boolean).sort().pop() || "2026-11-25"; return `<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom"><title>api-router: new and re-verified free-tier rows</title><id>${BASE}/feed.xml</id><link href="${BASE}/feed.xml" rel="self"/><link href="${BASE}/free-tiers"/><updated>${upd}T00:00:00Z</updated>` + it.map((i) => `<entry><title>${xe(i.name)}</title><id>${BASE}/v1/changes#${xe(i.id)}</id><link href="${xe(i.price_source)}"/><updated>${xe(i.checked)}T00:00:00Z</updated><summary>${xe(i.price_summary)}</summary></entry>`).join("") + `</feed>`; };
export const openApi = () => ({ openapi: "3.0.3", info: { title: "api-router", version: "0.2.8", description: "Free, source-linked free-tier facts for AI and developer API providers, plus small utilities. No API key. Daily free limits apply to some utilities." }, servers: [{ url: BASE }], paths: {
  "/v1/catalog": { get: { summary: "All providers with free-tier notes, source links and health", responses: { 200: { description: "JSON catalog" } } } },
  "/v1/best-route": { get: { summary: "Pick a provider for a task", parameters: [{ name: "task", in: "query", schema: { type: "string" } }, { name: "budget", in: "query", schema: { type: "string", enum: ["low", "fast"] } }], responses: { 200: { description: "Recommendation" } } } },
  "/v1/health-route": { get: { summary: "Fastest healthy provider in a category", parameters: [{ name: "category", in: "query", schema: { type: "string" } }], responses: { 200: { description: "Provider" } } } },
  "/v1/pick": { get: { summary: "Keyword-matched catalog rows for a task, with source and read date", parameters: [{ name: "need", in: "query", schema: { type: "string" } }, { name: "limit", in: "query", schema: { type: "integer" } }], responses: { 200: { description: "Ranked rows" } } } },
  "/v1/changes": { get: { summary: "Newest and re-verified catalog rows; optional since=YYYY-MM-DD keeps rows checked on or after that date", parameters: [{ name: "since", in: "query", schema: { type: "string" } }], responses: { 200: { description: "JSON list" } } } },
  "/feed.xml": { get: { summary: "Atom feed of the same changes", responses: { 200: { description: "Atom" } } } },
  "/v1/json-repair": { post: { summary: "Repair broken JSON", responses: { 200: { description: "Repaired JSON" } } } },
  "/v1/convert-units": { get: { summary: "Convert units", responses: { 200: { description: "Result" } } } } } });

const PICK_SYN = { auth: ["auth", "login", "signin", "sign", "oauth", "users", "authentication", "sso", "passwordless"], email: ["email", "mail", "smtp", "newsletter", "transactional", "emails"], database: ["database", "postgres", "sql", "redis", "db", "sqlite", "mongo", "nosql", "storage"], hosting: ["host", "hosting", "deploy", "deployment", "serverless", "app", "website", "frontend", "backend"], llm: ["llm", "inference", "model", "models", "gpt", "chat", "completion", "ai", "language"], scraping: ["scrape", "scraping", "crawl", "crawler", "extract", "html", "serp"], search: ["search", "retrieval", "rag"], storage: ["storage", "files", "file", "bucket", "object", "upload", "s3"], vector_db: ["vector", "embeddings", "embedding", "similarity", "rag"], embeddings: ["embedding", "embeddings", "rerank", "vector"], analytics: ["analytics", "tracking", "events"], error_monitoring: ["error", "errors", "crash", "exceptions", "bugs", "monitoring"], monitoring: ["uptime", "monitor", "monitoring", "cron", "heartbeat", "status"], queue: ["queue", "queues", "jobs", "background", "scheduler", "cron", "tasks"], ci: ["ci", "cd", "build", "pipeline", "actions", "deploy"], speech: ["speech", "voice", "tts", "stt", "transcribe", "transcription", "audio"], image: ["generate", "generation", "art", "diffusion"], stock_media: ["stock", "photo", "photos", "video", "pictures"], pdf: ["pdf", "document", "documents"], ocr: ["ocr", "scan", "text", "recognition"], forms: ["form", "forms", "contact", "submission", "submissions"], maps: ["map", "maps", "geocoding", "geocode", "location", "places", "address"], geoip: ["ip", "geolocation", "geoip"], weather: ["weather", "forecast"], news: ["news", "headlines", "articles"], screenshot: ["screenshot", "screenshots", "snapshot", "capture"], email_validation: ["validate", "validation", "verify"], phone_validation: ["phone", "number", "validation"], proxy: ["proxy", "proxies", "ip"], gpu: ["gpu", "training", "compute", "cuda"], cdn: ["cdn", "cache", "caching", "assets"] };
const PICK_STOP = new Set(["a", "an", "the", "for", "to", "of", "and", "or", "in", "on", "my", "i", "need", "want", "free", "api", "service", "tool", "with", "that", "can", "app", "use", "using", "best", "good", "which", "what", "how", "something"]);
export function pickProviders(need, limit) {
  const toks = String(need || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w && !PICK_STOP.has(w)).slice(0, 20);
  const lim = Math.min(Math.max(parseInt(limit, 10) || 5, 1), 8);
  const scored = partners.providers.map((x, idx) => {
    let s = 0; const why = [];
    const syn = PICK_SYN[x.category] || [x.category];
    for (const t of toks) {
      if (syn.includes(t) || x.category === t) { s += 5; why.push("category:" + x.category); }
      if (String(x.name).toLowerCase().includes(t)) { s += 3; why.push("name:" + t); }
      else if (String(x.price_summary || "").toLowerCase().includes(t)) { s += 1; why.push("summary:" + t); }
    }
    return { x, idx, s, why: [...new Set(why)] };
  }).filter((r) => r.s > 0).sort((a, b) => b.s - a.s || a.idx - b.idx).slice(0, lim);
  return { need, keywords: toks, matches: scored.map(({ x, s, why }) => ({ id: x.id, name: x.name, category: x.category, score: s, matched_on: why, price_summary: x.price_summary, price_source: x.price_source, checked: x.price_checked, signup_url: x.referral_url || x.signup_url, referral_link_is_ours: !!(x.referral_url && x.referral_url !== x.signup_url) })), categories_available: [...new Set(partners.providers.map((x) => x.category))].sort(), recheck: { why: "Free plans change. Each row carries the date we last read its source.", newest_rows: BASE + "/v1/changes", feed: BASE + "/feed.xml", suggestion: "If you reuse this pick later, call /v1/changes?since=YYYY-MM-DD with the checked date to see rows read or added after it, or follow the feed." }, note: "Keyword match against our catalog categories, names and price notes. Not a quality ranking. Each row's price_summary comes from the page in price_source on the checked date; anything unread says not verified. Some signup links are the operator's affiliate links (referral_link_is_ours)." };
}

export function routeExtras(req, u) {
  const p = u.pathname;
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (p === "/.well-known/agent-card.json" || p === "/.well-known/agent.json") return J(agentCard());
  if (p === "/.well-known/ai-catalog.json") return J(aiCatalog());
  if (p === "/v1/pick") return J(pickProviders(u.searchParams.get("need"), u.searchParams.get("limit")), 200, { "cache-control": "public, max-age=300" });
  if (p === "/v1/changes") return J(changesDoc(u.searchParams.get("since")), 200, { "cache-control": "public, max-age=900" });
  if (p === "/feed.xml") return T(feedXml(), "application/atom+xml; charset=utf-8");
  if (p === "/openapi.json") return J(openApi());
  if (p === "/llms.txt") return T(llmsTxt(), "text/plain; charset=utf-8");
  if (p === "/v1/json-repair") return handleJsonRepair(req);
  if (p === "/v1/page-to-markdown") return handleMarkdown(req, u);
  if (p === "/v1/check-quote") return handleCheckQuote(req);
  if (p === "/v1/check-url") return handleCheckUrl(req, u);
  if (p === "/v1/check-email") return handleCheckEmail(req, u);
  if (p === "/v1/convert-time") return handleConvertTime(u);
  if (p === "/v1/convert-units") return handleConvertUnits(u);
  if (p === "/v1/convert-currency") return handleConvertCurrency(req, u);
  return null;
}
