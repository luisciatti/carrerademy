import { auth } from "@clerk/nextjs/server";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN_CACHE_TTL_MS = 5_000;

type CachedToken = {
    token: string;
    expiresAt: number;
};

const tokenCache = new Map<string, CachedToken>();

export const runtime = "nodejs";

function tokenCacheKey(userId: string | null, sessionId: string | null): string | null {
    if (!userId || !sessionId) {
        return null;
    }
    return `${userId}:${sessionId}`;
}

function getTokenFromCache(key: string | null): string | null {
    if (!key) {
        return null;
    }
    const item = tokenCache.get(key);
    if (!item) {
        return null;
    }
    if (item.expiresAt <= Date.now()) {
        tokenCache.delete(key);
        return null;
    }
    return item.token;
}

function setTokenCache(key: string | null, token: string | null): void {
    if (!key || !token) {
        return;
    }
    tokenCache.set(key, {
        token,
        expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
    });
}

function trimExpiredTokenCache() {
    if (tokenCache.size < 100) {
        return;
    }
    const now = Date.now();
    for (const [key, item] of tokenCache.entries()) {
        if (item.expiresAt <= now) {
            tokenCache.delete(key);
        }
    }
}

async function proxyRequest(request: Request, path: string[]) {
    const totalStart = performance.now();
    const authState = await auth();
    const cacheKey = tokenCacheKey(authState.userId, authState.sessionId);
    let tokenCacheHit = false;

    const tokenStart = performance.now();
    let token = getTokenFromCache(cacheKey);
    if (!token) {
        token = await authState.getToken();
        setTokenCache(cacheKey, token);
    } else {
        tokenCacheHit = true;
    }
    trimExpiredTokenCache();
    const tokenMs = performance.now() - tokenStart;

    if (!token) {
        const headers = new Headers();
        headers.set("x-proxy-token-ms", tokenMs.toFixed(1));
        headers.set("x-proxy-token-cache", tokenCacheHit ? "hit" : "miss");
        headers.set("x-proxy-total-ms", (performance.now() - totalStart).toFixed(1));
        return Response.json({ detail: "Missing bearer token." }, { status: 401, headers });
    }

    const incomingUrl = new URL(request.url);
    const search = incomingUrl.search || "";
    const targetUrl = `${BACKEND_BASE_URL}/${path.join("/")}${search}`;

    const headers = new Headers();
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Accept", request.headers.get("accept") ?? "application/json");

    const contentType = request.headers.get("content-type");
    if (contentType) {
        headers.set("Content-Type", contentType);
    }

    const init: RequestInit = {
        method: request.method,
        headers,
        cache: "no-store",
        keepalive: true,
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
        init.body = await request.text();
    }

    const upstreamStart = performance.now();
    const upstream = await fetch(targetUrl, init);
    const upstreamMs = performance.now() - upstreamStart;
    const body = await upstream.text();

    const responseHeaders = new Headers();
    const upstreamContentType = upstream.headers.get("content-type");
    if (upstreamContentType) {
        responseHeaders.set("content-type", upstreamContentType);
    }
    responseHeaders.set("x-proxy-token-ms", tokenMs.toFixed(1));
    responseHeaders.set("x-proxy-upstream-ms", upstreamMs.toFixed(1));
    responseHeaders.set("x-proxy-token-cache", tokenCacheHit ? "hit" : "miss");
    responseHeaders.set("x-proxy-total-ms", (performance.now() - totalStart).toFixed(1));

    console.info(
        `[proxy] ${request.method} /${path.join("/")} status=${upstream.status} token=${tokenMs.toFixed(1)}ms upstream=${upstreamMs.toFixed(1)}ms cache=${tokenCacheHit ? "hit" : "miss"}`,
    );

    return new Response(body, {
        status: upstream.status,
        headers: responseHeaders,
    });
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
    const { path } = await context.params;
    return proxyRequest(request, path);
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
    const { path } = await context.params;
    return proxyRequest(request, path);
}

export async function PUT(request: Request, context: { params: Promise<{ path: string[] }> }) {
    const { path } = await context.params;
    return proxyRequest(request, path);
}

export async function PATCH(request: Request, context: { params: Promise<{ path: string[] }> }) {
    const { path } = await context.params;
    return proxyRequest(request, path);
}

export async function DELETE(request: Request, context: { params: Promise<{ path: string[] }> }) {
    const { path } = await context.params;
    return proxyRequest(request, path);
}
