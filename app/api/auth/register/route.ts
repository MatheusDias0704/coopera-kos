import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    error: "O Coopera Kós é uma comunidade fechada. Solicite um convite à equipe Kós.",
  }, { status: 403 });
}
