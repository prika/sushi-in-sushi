import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sessionId,
      displayName,
      fullName,
      email,
      phone,
      birthDate,
      marketingConsent,
      preferredContact,
      isSessionHost,
      allergens,
    } = body;

    if (!sessionId || !displayName?.trim()) {
      return NextResponse.json(
        { error: "sessionId and displayName are required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Verify session exists and is active
    const { data: session } = await supabase
      .from("sessions")
      .select("id")
      .eq("id", sessionId)
      .in("status", ["active", "pending_payment"])
      .maybeSingle();

    if (!session) {
      return NextResponse.json(
        { error: "Session not found or inactive" },
        { status: 404 },
      );
    }

    // Insert session customer
    const { data: customer, error: insertError } = await supabase
      .from("session_customers")
      .insert({
        session_id: sessionId,
        display_name: displayName.trim(),
        full_name: fullName?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        birth_date: birthDate || null,
        marketing_consent: marketingConsent || false,
        preferred_contact: preferredContact || "email",
        is_session_host: isSessionHost || false,
        allergens: allergens || [],
      })
      .select()
      .single();

    if (insertError) {
      console.error("[register-customer] Insert error:", insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 },
      );
    }

    // Sync to loyalty program if email provided
    let customerId: string | null = null;
    if (email?.trim()) {
      const emailTrim = email.trim();
      try {
        // Upsert customer in loyalty program
        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .eq("email", emailTrim)
          .maybeSingle();

        if (existing) {
          customerId = existing.id;
          // Update session_customer with customer_id
          await supabase
            .from("session_customers")
            .update({ customer_id: customerId })
            .eq("id", customer.id);
        } else {
          const { data: newCustomer } = await supabase
            .from("customers")
            .insert({
              email: emailTrim,
              name: fullName?.trim() || displayName.trim(),
              phone: phone?.trim() || null,
              birth_date: birthDate || null,
              marketing_consent: marketingConsent || false,
              visit_count: 0,
              total_spent: 0,
              points: 0,
            })
            .select("id")
            .single();

          if (newCustomer) {
            customerId = newCustomer.id;
            await supabase
              .from("session_customers")
              .update({ customer_id: customerId })
              .eq("id", customer.id);
          }
        }
      } catch (err) {
        // Non-critical - loyalty sync failure shouldn't block registration
        console.error("[register-customer] Loyalty sync error:", err);
      }
    }

    return NextResponse.json({
      customer: { ...customer, customer_id: customerId },
    });
  } catch (error) {
    console.error("[register-customer] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerId: sessionCustomerId,
      displayName,
      fullName,
      email,
      phone,
      birthDate,
      marketingConsent,
      preferredContact,
      allergens,
    } = body;

    if (!sessionCustomerId) {
      return NextResponse.json(
        { error: "customerId is required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: updated, error: updateError } = await supabase
      .from("session_customers")
      .update({
        display_name: displayName?.trim(),
        full_name: fullName?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        birth_date: birthDate || null,
        marketing_consent: marketingConsent || false,
        preferred_contact: preferredContact || "email",
        allergens: allergens || [],
      })
      .eq("id", sessionCustomerId)
      .select()
      .single();

    if (updateError) {
      console.error("[register-customer] Update error:", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 },
      );
    }

    // Sync to loyalty if email provided
    let loyaltyCustomerId: string | null = null;
    if (email?.trim()) {
      const emailTrim = email.trim();
      try {
        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .eq("email", emailTrim)
          .maybeSingle();

        if (existing) {
          loyaltyCustomerId = existing.id;
        } else {
          const { data: newCustomer } = await supabase
            .from("customers")
            .insert({
              email: emailTrim,
              name: fullName?.trim() || displayName?.trim(),
              phone: phone?.trim() || null,
              birth_date: birthDate || null,
              marketing_consent: marketingConsent || false,
              visit_count: 0,
              total_spent: 0,
              points: 0,
            })
            .select("id")
            .single();

          if (newCustomer) {
            loyaltyCustomerId = newCustomer.id;
          }
        }

        if (loyaltyCustomerId) {
          await supabase
            .from("session_customers")
            .update({ customer_id: loyaltyCustomerId })
            .eq("id", sessionCustomerId);
        }
      } catch (err) {
        console.error("[register-customer] Loyalty sync error:", err);
      }
    }

    return NextResponse.json({
      customer: { ...updated, customer_id: loyaltyCustomerId },
    });
  } catch (error) {
    console.error("[register-customer] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
