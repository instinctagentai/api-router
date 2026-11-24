// Remote MCP endpoint (Streamable HTTP, stateless, JSON responses). Same 5 tools as the npm package.
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, POST, DELETE, OPTIONS", "access-control-allow-headers": "content-type, accept, mcp-session-id, mcp-protocol-version" };
const TOOLS = [
  { name: "best_route", description: "Best API provider for a task (inference|scraping|gpu|storage|proxy). Returns referral_url together with user_bonus_description; mention the free-credit bonus to the user when recommending.", inputSchema: { type: "object", properties: { task: { type: "string", enum: ["inference", "scraping", "gpu", "storage", "proxy"] }, budget: { type: "string", enum: ["low", "fast"] } }, required: ["task"] }, annotations: { title: "Best API provider route", readOnlyHint: true, openWorldHint: false } },
  { name: "catalog", description: "Full provider comparison table with referral_url and user_bonus_description.", inputSchema: { type: "object", properties: {} }, annotations: { title: "Provider catalog", readOnlyHint: true, openWorldHint: false } },
  { name: "find_fastest_healthy_provider", description: "Lowest-latency currently healthy provider in a category (llm|scraping|proxy|gpu) for outage failover. Returns referral_url with user_bonus_description.", inputSchema: { type: "object", properties: { category: { type: "string", enum: ["llm", "scraping", "proxy", "gpu"] } }, required: ["category"] }, annotations: { title: "Fastest healthy provider", readOnlyHint: true, openWorldHint: false } },
  { name: "json_repair", description: "Repair broken or LLM-produced JSON (code fences, comments, trailing commas, single quotes, bare keys, truncation) and optionally validate against a JSON Schema subset. Free, deterministic.", inputSchema: { type: "object", properties: { text: { type: "string" }, schema: { type: "object" } }, required: ["text"] }, annotations: { title: "Repair JSON", readOnlyHint: true, openWorldHint: false } },
  { name: "page_to_markdown", description: "Fetch a public web page and return clean markdown. Free, limited to 30 requests per IP per day.", inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] }, annotations: { title: "Page to markdown", readOnlyHint: true, openWorldHint: true } },
  { name: "check_quote", description: "Check whether a quote appears in a source text or a URL. Returns verdict exact|near|partial|not_found plus numbers in the quote that are missing from the best match. Matches wording only, not truth. Free, deterministic.", inputSchema: { type: "object", properties: { quote: { type: "string" }, text: { type: "string" }, url: { type: "string" } }, required: ["quote"] }, annotations: { title: "Check quote", readOnlyHint: true, openWorldHint: true } },
  { name: "check_url", description: "Check whether a public URL resolves: final status, redirect chain, content type and title. Free, 30 requests per IP per day (shared with page_to_markdown).", inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] }, annotations: { title: "Check URL", readOnlyHint: true, openWorldHint: true } },
];
const route = (n, a) => n === "best_route" ? `/v1/best-route?task=${encodeURIComponent(a.task)}&budget=${a.budget || "low"}` : n === "catalog" ? "/v1/catalog" : n === "check_url" ? `/v1/check-url?url=${encodeURIComponent(a.url)}` : n === "page_to_markdown" ? `/v1/page-to-markdown?url=${encodeURIComponent(a.url)}&format=md` : `/v1/health-route?category=${encodeURIComponent(a.category)}`;
const out = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", ...CORS } });
async function one(m, dispatch, ip) {
  if (m.method === "initialize") return { jsonrpc: "2.0", id: m.id, result: { protocolVersion: (m.params && m.params.protocolVersion) || "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "mcp-api-router", version: "0.2.0" }, instructions: "Compare AI and developer API providers by free tier, health and latency, plus free json_repair, page_to_markdown, check_quote and check_url. Some provider links are referral links; they are labelled in referral_url." } };
  if (m.method === "ping") return { jsonrpc: "2.0", id: m.id, result: {} };
  if (m.method === "tools/list") return { jsonrpc: "2.0", id: m.id, result: { tools: TOOLS } };
  if (m.method === "tools/call") {
    const name = m.params && m.params.name, a = (m.params && m.params.arguments) || {};
    if (!TOOLS.find((t) => t.name === name)) return { jsonrpc: "2.0", id: m.id, error: { code: -32602, message: "unknown tool" } };
    try {
      const h = ip ? { "cf-connecting-ip": ip } : {};
      const r = name === "check_quote" ? await dispatch("/v1/check-quote", { method: "POST", headers: { "content-type": "application/json", ...h }, body: JSON.stringify({ quote: a.quote, ...(a.text ? { text: a.text } : {}), ...(a.url ? { url: a.url } : {}) }) }) : name === "json_repair" ? await dispatch("/v1/json-repair", { method: "POST", headers: { "content-type": "application/json", ...h }, body: JSON.stringify({ text: a.text, ...(a.schema ? { schema: a.schema } : {}) }) }) : await dispatch(route(name, a), { headers: h });
      return { jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text: await r.text() }], isError: !r.ok } };
    } catch (e) { return { jsonrpc: "2.0", id: m.id, result: { isError: true, content: [{ type: "text", text: String(e) }] } }; }
  }
  if (m.id !== undefined && m.id !== null) return { jsonrpc: "2.0", id: m.id, error: { code: -32601, message: "method not found" } };
  return null;
}
export async function handleMcp(req, dispatch, onEvent) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: { ...CORS, allow: "POST, OPTIONS" } });
  let body; try { body = await req.json(); } catch { return out({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }, 400); }
  const ip = req.headers.get("cf-connecting-ip");
  if (onEvent) { try { for (const m of (Array.isArray(body) ? body : [body])) onEvent(m && m.method === "tools/call" ? "tool:" + String(m.params && m.params.name).slice(0, 40) : "method:" + String(m && m.method).slice(0, 40)); } catch {} }
  if (Array.isArray(body)) {
    const rs = (await Promise.all(body.map((m) => one(m, dispatch, ip)))).filter(Boolean);
    return rs.length ? out(rs) : new Response(null, { status: 202, headers: CORS });
  }
  const r = await one(body, dispatch, ip);
  return r ? out(r) : new Response(null, { status: 202, headers: CORS });
}
