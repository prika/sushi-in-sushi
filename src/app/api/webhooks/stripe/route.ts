import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { createInvoice } from "@/lib/vendus/invoices";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return NextResponse.json(
      { error: "Assinatura invalida" },
      { status: 401 },
    );
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await handlePaymentSuccess(pi);
      break;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await handlePaymentFailed(pi);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSuccess(pi: Stripe.PaymentIntent) {
  const supabase = createAdminClient();
  const sessionId = pi.metadata.session_id;
  const subtotal = parseFloat(pi.metadata.subtotal);
  const customerNif = pi.metadata.customer_nif || undefined;
  const orderingMode = pi.metadata.ordering_mode || "dine_in";

  if (!sessionId) {
    console.error("[Stripe Webhook] Missing session_id in metadata");
    return;
  }

  // 1. Check idempotency — skip if already processed
  const { data: existingPayment } = await supabase
    .from("payments")
    .select("id, status")
    .eq("stripe_payment_intent_id", pi.id)
    .single();

  if (existingPayment?.status === "succeeded") {
    return; // Already processed
  }

  // 2. Get charge details for receipt URL
  let receiptUrl: string | null = null;
  let paymentMethodType = "card";
  if (pi.latest_charge) {
    try {
      const charge = await stripe.charges.retrieve(
        pi.latest_charge as string,
      );
      receiptUrl = charge.receipt_url ?? null;
      paymentMethodType =
        charge.payment_method_details?.type || "card";
    } catch {
      // Non-critical — continue without receipt URL
    }
  }

  // 3. Update payment record
  await supabase
    .from("payments")
    .update({
      status: "succeeded",
      stripe_charge_id: (pi.latest_charge as string) || null,
      stripe_receipt_url: receiptUrl,
      payment_method_type: paymentMethodType,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", pi.id);

  // 4. Get session + restaurant for invoice
  const { data: session } = await supabase
    .from("sessions")
    .select(
      "id, table_id, ordering_mode, tables!inner(restaurant_id, location)",
    )
    .eq("id", sessionId)
    .single();

  const tables = session?.tables as unknown as
    | { restaurant_id: string; location: string }
    | undefined;
  const locationSlug = tables?.location;

  // 5. Create Vendus invoice (if configured)
  if (locationSlug) {
    // Get the Stripe payment method ID from payment_methods table
    const { data: stripeMethod } = await supabase
      .from("payment_methods")
      .select("id")
      .eq("slug", "stripe")
      .single();

    if (stripeMethod) {
      const invoiceResult = await createInvoice({
        sessionId,
        locationSlug,
        paymentMethodId: stripeMethod.id,
        paidAmount: subtotal, // Invoice without tip (tip is not taxable)
        customerNif: customerNif || undefined,
        issuedBy: "system",
      });

      if (invoiceResult.success && invoiceResult.invoiceId) {
        await supabase
          .from("payments")
          .update({ invoice_id: invoiceResult.invoiceId })
          .eq("stripe_payment_intent_id", pi.id);
      }
    }
  }

  // 6. Close session via RPC
  await supabase.rpc("close_session_transactional", {
    p_session_id: sessionId,
    p_cancel_orders: false,
    p_close_reason: "Pagamento online (Stripe)",
  });

  // 7. Update session with payment reference
  const paymentId = existingPayment?.id;
  await supabase
    .from("sessions")
    .update({
      paid_via: "stripe",
      ...(paymentId ? { payment_id: paymentId } : {}),
    })
    .eq("id", sessionId);

  // 8. Clean up waiter assignment
  if (session?.table_id) {
    await supabase
      .from("waiter_tables")
      .delete()
      .eq("table_id", session.table_id);
  }

  // eslint-disable-next-line no-console
  console.info(
    `[Stripe Webhook] Payment succeeded for session ${sessionId} (${orderingMode})`,
  );
}

async function handlePaymentFailed(pi: Stripe.PaymentIntent) {
  const supabase = createAdminClient();

  await supabase
    .from("payments")
    .update({
      status: "failed",
      error_message:
        pi.last_payment_error?.message || "Pagamento falhou",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", pi.id);
}
