import { NextRequest, NextResponse } from "next/server";
import { coachResponse, Message } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json() as { messages: Message[] };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    const reply = await coachResponse(messages);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Coach error:", error);
    return NextResponse.json(
      { error: "Coach response failed", details: String(error) },
      { status: 500 }
    );
  }
}
