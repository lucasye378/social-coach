import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(req: NextRequest) {
  const { priceId, successUrl, cancelUrl } = await req.json();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl || `${req.headers.get("origin")}/?subscribed=true`,
    cancel_url: cancelUrl || `${req.headers.get("origin")}/`,
  });

  return NextResponse.json({ url: session.url });
}
