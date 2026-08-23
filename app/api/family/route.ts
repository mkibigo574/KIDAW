import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// POST /api/family
// Signed-in members manage their next of kin and beneficiaries
// (nuclear family: spouse and children). One of:
//   { nextOfKin: { name_relationship, phone } }
//   { addBeneficiary: { fullName, relationship, dateOfBirth? } }
//   { removeBeneficiaryId: "<uuid>" }
export async function POST(req: NextRequest) {
  const body = await req.json();

  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "You are not signed in. Please sign in again." }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data: userData, error: authError } = await db.auth.getUser(token);
  if (authError || !userData.user?.email) {
    return NextResponse.json({ error: "Your session has expired. Please sign out and sign in again." }, { status: 401 });
  }

  const { data: member } = await db
    .from("members")
    .select("id")
    .eq("email", userData.user.email.toLowerCase())
    .maybeSingle();
  if (!member) {
    return NextResponse.json(
      { error: "No member record found for this email." },
      { status: 404 }
    );
  }

  if (body.nextOfKin) {
    const { name_relationship, phone } = body.nextOfKin;
    if (!name_relationship?.trim()) {
      return NextResponse.json(
        { error: "Next of kin name is required." },
        { status: 400 }
      );
    }
    const { error } = await db
      .from("members")
      .update({
        next_of_kin: {
          name_relationship: name_relationship.trim(),
          phone: phone?.trim() || null,
        },
      })
      .eq("id", member.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.addBeneficiary) {
    const { fullName, relationship, dateOfBirth } = body.addBeneficiary;
    if (!fullName?.trim()) {
      return NextResponse.json(
        { error: "Beneficiary name is required." },
        { status: 400 }
      );
    }
    if (!["spouse", "child"].includes(relationship)) {
      return NextResponse.json(
        { error: "Beneficiaries must be nuclear family: spouse or child." },
        { status: 400 }
      );
    }
    const { data, error } = await db
      .from("beneficiaries")
      .insert({
        member_id: member.id,
        full_name: fullName.trim(),
        relationship,
        date_of_birth: dateOfBirth?.trim() || null,
      })
      .select("id, full_name, relationship, date_of_birth")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, beneficiary: data });
  }

  if (body.removeBeneficiaryId) {
    const { error } = await db
      .from("beneficiaries")
      .delete()
      .eq("id", body.removeBeneficiaryId)
      .eq("member_id", member.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Nothing to do." }, { status: 400 });
}
