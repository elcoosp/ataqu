import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { waitlist } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, apps, name, role, companySize } = body;

    if (!email || !apps || !Array.isArray(apps) || apps.length === 0) {
      return NextResponse.json(
        { error: "Email and at least one app are required" },
        { status: 400 }
      );
    }

    // Check for existing entry
    const existing = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.email, email))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "This email is already on the waitlist" },
        { status: 409 }
      );
    }

    // Insert
    const inserted = await db
      .insert(waitlist)
      .values({
        email,
        apps: apps.join(","),
        name: name || null,
        role: role || null,
        companySize: companySize || null,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json({ success: true, id: inserted[0].id }, { status: 201 });
  } catch (error) {
    console.error("Waitlist API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
