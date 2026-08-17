import { auth } from "@clerk/nextjs/server";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function proxyRequest(request: Request, path: string[]) {
    const authState = await auth();
    const token = await authState.getToken();

    if (!token) {
        return Response.json({ detail: "Missing bearer token." }, { status: 401 });
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
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
        init.body = await request.text();
    }

    const upstream = await fetch(targetUrl, init);
    const body = await upstream.text();

    const responseHeaders = new Headers();
    const upstreamContentType = upstream.headers.get("content-type");
    if (upstreamContentType) {
        responseHeaders.set("content-type", upstreamContentType);
    }

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
