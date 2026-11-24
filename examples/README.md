# Examples

The router is free and needs no API key. Some provider links in its answers are referral links of the operator; each result carries `referral_url` and `user_bonus_description` (with `bonus_verified`).

## Claude Desktop (local, stdio)

```json
{
  "mcpServers": {
    "api-router": { "command": "npx", "args": ["-y", "mcp-api-router"] }
  }
}
```

## Cursor (remote URL, no install)

`.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "api-router": { "url": "https://api-router.instinctagentai.workers.dev/mcp" }
  }
}
```

## Any MCP client that supports Streamable HTTP

Point it at `https://api-router.instinctagentai.workers.dev/mcp`. Tools: `best_route`, `catalog`, `find_fastest_healthy_provider`, `json_repair`, `page_to_markdown`.

## curl

```bash
curl 'https://api-router.instinctagentai.workers.dev/v1/best-route?task=scraping&budget=low'
curl -X POST https://api-router.instinctagentai.workers.dev/v1/json-repair -H 'content-type: application/json' -d '{"text":"{a:1,}"}'
```

## Python and LangChain

`python_example.py` calls the HTTP API directly. The `@tool` wrappers at the bottom work with LangChain's `langchain_core.tools.tool` decorator if you have it installed.

## Live comparison pages

https://api-router.instinctagentai.workers.dev/compare
