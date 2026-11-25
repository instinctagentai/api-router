# api-router

[![mcp-api-router MCP server](https://glama.ai/mcp/servers/instinctagentai/api-router/badges/score.svg)](https://glama.ai/mcp/servers/instinctagentai/api-router)

Free JSON API and MCP server that compares AI and developer API providers (LLM inference, scraping, proxies, GPU) by free tier, health and latency, plus two free utilities for agents. Some signup links are referral links. No LLM runs in the request path.

Base URL: https://api-router.instinctagentai.workers.dev

## Endpoints
- GET /v1/catalog
- GET /v1/best-route?task=inference|scraping|gpu|storage|proxy&budget=low|fast
- GET /v1/health-route?category=llm|scraping|proxy|gpu
- POST /v1/json-repair with {"text":"...","schema":{optional}} : fixes broken JSON and validates against a JSON Schema subset
- GET /v1/page-to-markdown?url=...&format=md : clean markdown from a public page, 30 requests per IP per day
- /.well-known/agent-card.json : A2A agent card
- /llms.txt : discovery file for AI tools

## MCP
`npx mcp-api-router` (version 0.2.4)

Tools: best_route, catalog, find_fastest_healthy_provider, json_repair, page_to_markdown, check_quote, check_url, check_email, convert_time, convert_units, convert_currency

Example client config:

```json
{ "mcpServers": { "api-router": { "command": "npx", "args": ["-y", "mcp-api-router"] } } }
```

Daily benchmark: benchmarks/latest.md

## Use it from an agent (copy and paste)

Add the MCP server (no API key):

```json
{ "mcpServers": { "api-router": { "command": "npx", "args": ["-y", "mcp-api-router"] } } }
```

Or the remote endpoint: `https://api-router.instinctagentai.workers.dev/mcp` (agent tool names) or `https://api-router.instinctagentai.workers.dev/mcp/ask` (same tools, question-style names such as `fix_broken_json`, `does_this_url_work`). For the stdio server use `npx -y mcp-api-router --names=ask` for the question-style names.

One-line description for a tool list: "api-router: free, no-key tools for agents (fix broken JSON, check a URL or email, convert time zones, units and currency) and a dated, source-linked table of API free tiers. Some signup links are referral links and are labelled." JSON results include a `source` field with the service name and URL.

## Remote MCP endpoint

Streamable HTTP, no auth: https://api-router.instinctagentai.workers.dev/mcp

## Live comparison pages and examples

- https://api-router.instinctagentai.workers.dev/compare (LLM, scraping, proxy, GPU: pricing model, free-tier notes, live status; referral links are marked)
- https://api-router.instinctagentai.workers.dev/free-tiers (dated, source-linked free tiers, prices and limits) and /ask (short answers with example calls)
- examples/ : Claude Desktop, Cursor, curl, Python and LangChain

## Where it is listed
- npm: https://www.npmjs.com/package/mcp-api-router
- Official MCP Registry: io.github.instinctagentai/mcp-api-router (https://registry.modelcontextprotocol.io/v0/servers?search=instinctagentai)
- GitHub topics: mcp, mcp-server, model-context-protocol, a2a, ai-agents
- Discovery files: /llms.txt, /.well-known/agent-card.json
- Glama: https://glama.ai/mcp/servers/instinctagentai/api-router
- mcp.so: free submission comment posted on https://github.com/chatmcp/mcpso/issues/1 (pending their review)
- mcpservers.org: free submission sent (review up to 2 weeks)
- Docker MCP Catalog: pull request open (remote entry): https://github.com/docker/mcp-registry/pull/7644
- awesome-mcp-servers: pull request open, awaiting maintainers: https://github.com/punkpeye/awesome-mcp-servers/pull/20588
