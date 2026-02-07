import { NextRequest, NextResponse } from "next/server";

const UPSTREAM_URL = "https://smirksteveyt--goken-web-app.modal.run/stream";

export async function POST(request: NextRequest) {
    const apiKey = process.env.GOKEN_API_KEY || process.env.NEXT_PUBLIC_GOKEN_API_KEY;
    if (!apiKey?.trim()) {
        return NextResponse.json(
            { error: "Missing GOKEN_API_KEY (or NEXT_PUBLIC_GOKEN_API_KEY) on server" },
            { status: 500 }
        );
    }

    let body: { text?: string; voice?: string; speed?: number };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const text = typeof body.text === "string" ? body.text : "";
    const voice = typeof body.voice === "string" ? body.voice : "am_puck";
    const speed = typeof body.speed === "number" ? body.speed : 1;

    if (!text.trim()) {
        return NextResponse.json({ error: "Missing or empty text" }, { status: 400 });
    }

    try {
        const res = await fetch(UPSTREAM_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": apiKey.trim(),
            },
            body: JSON.stringify({ text: text.trim(), voice, speed }),
        });

        if (!res.ok) {
            const errText = await res.text();
            return NextResponse.json(
                { error: `Upstream error: ${res.status}`, details: errText },
                { status: res.status }
            );
        }

        const buffer = await res.arrayBuffer();
        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "application/octet-stream",
            },
        });
    } catch (err) {
        console.error("[api/tts/stream]", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Upstream request failed" },
            { status: 502 }
        );
    }
}
