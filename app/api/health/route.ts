import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", service: "coopera-kos", timestamp: new Date().toISOString() });
}
