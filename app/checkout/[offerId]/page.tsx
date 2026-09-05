"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Package,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import type { Offer, OfferPrice } from "@/types/sales";

export default function PublicCheckoutPage({ params }: { params: { offerId: string } }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-400">Loading checkout...</div>}>
      <PublicCheckoutContent params={params} />
    </Suspense>
  );
}

function PublicCheckoutContent({ params }: { params: { offerId: string } }) {
  const searchParams = useSearchParams();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [prices, setPrices] = useState<OfferPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string>("STRIPE");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOffer();
  }, [params.offerId]);

  async function loadOffer() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales/offers/${params.offerId}`);
      const data = await res.json();
      if (data.offer) {
        setOffer(data.offer);
        setPrices(data.prices || []);
        if (data.offer.is_free) {
          setSelectedProvider("MANUAL");
        }
      } else {
        setError("Offer not found");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    setError(null);

    try {
      // Capture attribution from URL params
      const attribution = {
        utmSource: searchParams.get("utm_source") ?? "direct",
        utmMedium: searchParams.get("utm_medium") ?? "web",
        utmCampaign: searchParams.get("utm_campaign") ?? undefined,
        referrer: typeof document !== "undefined" ? document.referrer : undefined,
      };

      if (offer?.is_free) {
        // Free products complete directly via orders API
        // First upsert customer
        const custRes = await fetch("/api/sales/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name, source: attribution.utmSource }),
        });
        const custData = await custRes.json();
        if (!custRes.ok) throw new Error(custData.error);

        // Then create and fulfill free order
        const ordRes = await fetch("/api/sales/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            offer_id: offer.id,
            customer_id: custData.customer.id,
            customer_email: email,
            customer_name: name,
            amount_cents: 0,
            currency: "INR",
            is_free: true,
            provider: "MANUAL",
            attribution,
          }),
        });

        const ordData = await ordRes.json();
        if (!ordRes.ok) throw new Error(ordData.error);

        // Redirect to access link
        if (ordData.delivery?.accessLink) {
          window.location.href = ordData.delivery.accessLink;
        } else {
          window.location.href = `/customer?email=${encodeURIComponent(email)}`;
        }
        return;
      }

      // Paid checkout initiates provider session
      const res = await fetch("/api/sales/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offer_id: params.offerId,
          customer_email: email,
          customer_name: name,
          provider: selectedProvider,
          attribution,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert("Checkout initiated successfully.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs text-muted-foreground">
        Loading secure checkout...
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-center space-y-3">
          <div className="text-rose-400 font-bold">Offer Unavailable</div>
          <p className="text-xs text-muted-foreground">{error || "The requested offer could not be loaded."}</p>
        </div>
      </div>
    );
  }

  const isFree = offer.is_free;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left: Product Information & Guarantees */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              Verified Autonomous Product
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">{offer.title}</h1>
            <p className="text-sm text-slate-400">{offer.tagline || offer.description}</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Included Deliverables
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              {(offer.deliverables as string[])?.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <ShieldCheck className="h-4 w-4" />
              Risk Reversal Guarantee
            </div>
            <p className="text-[11px] text-slate-400">
              {isFree
                ? "This product is 100% free with instant digital access. No credit card required."
                : "Protected by our 30-day money-back guarantee. If you are not satisfied, request a full refund with one click."}
            </p>
          </div>
        </div>

        {/* Right: Checkout Form */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl space-y-6">
          <div className="flex items-baseline justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="text-xs text-slate-400">Total Price</div>
              <div className="text-2xl font-black text-white">
                {isFree ? "Free (₹0)" : `₹${(offer.primary_price_cents / 100).toLocaleString("en-IN")}`}
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
              <Lock className="h-3 w-3" /> Secure 256-bit Encryption
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Your Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
              />
              <div className="text-[10px] text-slate-500">Access link and deliverables will be tied to this email.</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Full Name (Optional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Mercer"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {!isFree && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">Payment Gateway</label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {["STRIPE", "RAZORPAY", "PAYPAL"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedProvider(p)}
                      className={`py-2 px-3 rounded-lg border font-semibold transition-all ${
                        selectedProvider === p
                          ? "bg-blue-600/20 border-blue-500 text-blue-400 shadow-sm"
                          : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
            >
              {submitting ? (
                "Processing..."
              ) : isFree ? (
                <>Get Instant Free Access <ArrowRight className="h-4 w-4" /></>
              ) : (
                <>Proceed to Secure Payment <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
