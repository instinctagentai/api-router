# api-router

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
`npx mcp-api-router` (version 0.2.0)

Tools: best_route, catalog, find_fastest_healthy_provider, json_repair, page_to_markdown

Example client config:

```json
{ "mcpServers": { "api-router": { "command": "npx", "args": ["-y", "mcp-api-router"] } } }
```

Daily benchmark: benchmarks/latest.md
