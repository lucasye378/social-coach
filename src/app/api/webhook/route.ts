import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY ?? "";

const supabaseAdmin =
  supabaseUrl && supabaseServiceKey && supabaseUrl !== "placeholder.supabase.co"
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log("Subscription started:", session.customer);

    if (supabaseAdmin) {
      await supabaseAdmin.from("subscriptions").insert({
        customer_id: session.customer,
        customer_email: session.customer_details?.email ?? null,
        subscription_id: session.subscription,
        price_id: session.line_items?.data[0]?.price?.id ?? null,
        status: "active",
        period_start: new Date().toISOString(),
      });
      await supabaseAdmin.from("analytics_events").insert({
        event_type: "checkout_completed",
        feature: "social-coach",
        metadata: JSON.stringify({
          customer_id: session.customer,
          price_id: session.line_items?.data[0]?.price?.id,
        }),
      });
    }
  }

  return NextResponse.json({ received: true });
}
