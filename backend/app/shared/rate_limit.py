from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, status


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._storage: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str, max_requests: int, window_seconds: int) -> bool:
        now = time.time()
        window_start = now - window_seconds

        with self._lock:
            bucket = self._storage[key]
            while bucket and bucket[0] < window_start:
                bucket.popleft()

            if len(bucket) >= max_requests:
                return False

            bucket.append(now)
            return True


_limiter = InMemoryRateLimiter()


def enforce_rate_limit(key: str, max_requests: int, window_seconds: int) -> None:
    allowed = _limiter.allow(key=key, max_requests=max_requests, window_seconds=window_seconds)
    if allowed:
        return

    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail="Rate limit exceeded.",
    )