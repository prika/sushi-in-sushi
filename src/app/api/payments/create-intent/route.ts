import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, tipAmount = 0, customerEmail, customerNif } =
      await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId obrigatorio" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // 1. Validate session exists and is active/pending_payment
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, status, total_amount, table_id, ordering_mode")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Sessao nao encontrada" },
        { status: 404 },
      );
    }

    if (session.status === "closed" || session.status === "paid") {
      return NextResponse.json(
        { error: "Sessao ja esta fechada ou paga" },
        { status: 400 },
      );
    }

    // 2. Check for existing pending payment (idempotency)
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("stripe_payment_intent_id, status")
      .eq("session_id", sessionId)
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPayment?.stripe_payment_intent_id) {
      // Retrieve existing PaymentIntent from Stripe
      const existingPI = await stripe.paymentIntents.retrieve(
        existingPayment.stripe_payment_intent_id,
      );

      if (
        existingPI.status === "requires_payment_method" ||
        existingPI.status === "requires_confirmation" ||
        existingPI.status === "requires_action"
      ) {
        return NextResponse.json({
          clientSecret: existingPI.client_secret,
          paymentId: existingPI.id,
          total: existingPI.amount / 100,
        });
      }
    }

    // 3. Calculate total (subtotal + tip)
    const subtotal = session.total_amount || 0;
    const tip = Math.max(0, Number(tipAmount) || 0);
    const total = subtotal + tip;

    if (total <= 0) {
      return NextResponse.json(
        { error: "Valor invalido" },
        { status: 400 },
      );
    }

    // 4. Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // cents
      currency: "eur",
      automatic_payment_methods: { enabled: true },
      metadata: {
        session_id: sessionId,
        table_id: session.table_id,
        subtotal: String(subtotal),
        tip_amount: String(tip),
        customer_nif: customerNif || "",
        ordering_mode: session.ordering_mode || "dine_in",
      },
      receipt_email: customerEmail || undefined,
    });

    // 5. Save payment record locally
    await supabase.from("payments").insert({
      session_id: sessionId,
      stripe_payment_intent_id: paymentIntent.id,
      subtotal,
      tip_amount: tip,
      total,
      currency: "eur",
      customer_nif: customerNif || null,
      customer_email: customerEmail || null,
      status: "pending",
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentId: paymentIntent.id,
      total,
    });
  } catch (error) {
    console.error("[Stripe] Error creating PaymentIntent:", error);
    return NextResponse.json(
      { error: "Erro ao criar pagamento" },
      { status: 500 },
    );
  }
}
