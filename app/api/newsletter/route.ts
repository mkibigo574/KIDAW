import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// POST /api/newsletter — subscribe an email address to the newsletter.
export async function POST(req: NextRequest) {
  const { email } = await req.json();
  const normalized = String(email ?? "").trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin()
    .from("newsletter_subscribers")
    .upsert({ email: normalized }, { onConflict: "email", ignoreDuplicates: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
