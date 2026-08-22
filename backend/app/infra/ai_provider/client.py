from __future__ import annotations

import json

import httpx

from app.core.config import get_settings


class AIProviderClient:
    def __init__(self) -> None:
        self._settings = get_settings()

    def generate(self, prompt: str, fallback_response: str | None = None) -> str:
        if self._settings.openai_api_key:
            try:
                return self._generate_with_openai(prompt)
            except Exception:
                # Keep generation available in local/dev environments even if provider fails.
                return fallback_response if fallback_response is not None else self._generate_fallback(prompt)

        return fallback_response if fallback_response is not None else self._generate_fallback(prompt)

    def _generate_with_openai(self, prompt: str) -> str:
        payload = {
            "model": self._settings.openai_model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an assistant that returns only valid JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }

        headers = {
            "Authorization": f"Bearer {self._settings.openai_api_key}",
            "Content-Type": "application/json",
        }
        url = f"{self._settings.openai_base_url.rstrip('/')}/chat/completions"

        with httpx.Client(timeout=30) as client:
            response = client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            body = response.json()

        return str(body["choices"][0]["message"]["content"])

    def _generate_fallback(self, prompt: str) -> str:
        candidates = self._extract_candidates(prompt)
        selected = candidates[:6]
        steps: list[dict[str, str]] = []
        for idx, item in enumerate(selected, start=1):
            steps.append(
                {
                    "content_item_id": item["id"],
                    "title": f"Step {idx}: {item['title']}",
                    "description": item["description"],
                }
            )

        return json.dumps(
            {
                "title": "Career Path Personalizada",
                "steps": steps,
            }
        )

    def _extract_candidates(self, prompt: str) -> list[dict[str, str]]:
        marker_start = "CANDIDATES_JSON_START"
        marker_end = "CANDIDATES_JSON_END"
        if marker_start not in prompt or marker_end not in prompt:
            return []

        start = prompt.index(marker_start) + len(marker_start)
        end = prompt.index(marker_end)
        payload_raw = prompt[start:end].strip()
        try:
            payload = json.loads(payload_raw)
        except json.JSONDecodeError:
            return []

        if not isinstance(payload, list):
            return []

        normalized: list[dict[str, str]] = []
        for item in payload:
            if not isinstance(item, dict):
                continue
            content_item_id = str(item.get("id") or "").strip()
            title = str(item.get("title") or "").strip()
            description = str(item.get("description") or "").strip()
            if not content_item_id or not title or not description:
                continue
            normalized.append(
                {
                    "id": content_item_id,
                    "title": title,
                    "description": description,
                }
            )

        return normalized