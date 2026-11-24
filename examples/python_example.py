"""Minimal use of the api-router HTTP API. Needs: pip install requests"""
import requests

BASE = "https://api-router.instinctagentai.workers.dev"


def best_route(task: str, budget: str = "low") -> dict:
    """Best provider for a task: inference, scraping, gpu, storage or proxy."""
    return requests.get(f"{BASE}/v1/best-route", params={"task": task, "budget": budget}, timeout=20).json()


def repair_json(text: str, schema: dict | None = None) -> dict:
    """Fix broken JSON (fences, comments, trailing commas, truncation) and optionally validate."""
    body = {"text": text, **({"schema": schema} if schema else {})}
    return requests.post(f"{BASE}/v1/json-repair", json=body, timeout=20).json()


# Optional LangChain tools (pip install langchain-core):
try:
    from langchain_core.tools import tool

    best_route_tool = tool(best_route)
    repair_json_tool = tool(repair_json)
except ImportError:
    pass

if __name__ == "__main__":
    print(best_route("scraping")["best"]["name"])
    print(repair_json("{a:1,}")["json"])
