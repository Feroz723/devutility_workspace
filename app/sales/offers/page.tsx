"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  Plus,
  Play,
  Pause,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import type { Offer } from "@/types/sales";
import type { Product } from "@/types/product";

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [offersRes, prodsRes] = await Promise.all([
        fetch("/api/sales/offers?limit=100"),
        fetch("/api/products?limit=100"),
      ]);

      const offersData = await offersRes.json();
      const prodsData = await prodsRes.json();

      if (offersData.offers) setOffers(offersData.offers);
      if (prodsData.products) setProducts(prodsData.products);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProductId) return;
    setCreating(true);

    try {
      const res = await fetch("/api/sales/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: selectedProductId }),
      });

      if (res.ok) {
        setSelectedProductId("");
        await loadData();
      } else {
        const err = await res.json();
        alert(`Failed to create offer: ${err.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  }

  async function toggleStatus(offerId: string, currentStatus: string) {
    const endpoint = currentStatus === "ACTIVE"
      ? `/api/sales/offers/${offerId}/pause`
      : `/api/sales/offers/${offerId}/publish`;

    const res = await fetch(endpoint, { method: "POST" });
    if (res.ok) {
      await loadData();
    }
  }

  const filteredOffers = offers.filter((o) => {
    if (statusFilter === "ALL") return true;
    return o.status === statusFilter;
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-4">
        <div>
          <Link href="/sales" className="text-xs text-muted-foreground hover:text-white flex items-center gap-1 mb-1">
            <ArrowLeft className="h-3 w-3" /> Back to Sales Dashboard
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-[hsl(var(--primary))]" />
            Commercial & Free Offers
          </h1>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-xs font-medium hover:bg-[hsl(var(--accent))] flex items-center gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Offer Creator Card */}
      <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2 text-emerald-400">
          <Sparkles className="h-4 w-4" /> Package Product into New Offer
        </h2>
        <form onSubmit={handleCreateOffer} className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-[hsl(var(--accent))] border border-[hsl(var(--border))] text-xs text-white"
            required
          >
            <option value="">Select a validated product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.product_type} - {p.status})
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={creating || !selectedProductId}
            className="px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {creating ? "Packaging..." : "Generate Offer"}
          </button>
        </form>
      </div>

      {/* Offers Filter Tabs */}
      <div className="flex gap-2 text-xs">
        {["ALL", "ACTIVE", "DRAFT", "PAUSED"].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === tab
                ? "bg-[hsl(var(--primary))] text-white"
                : "bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-muted-foreground hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOffers.map((offer) => (
          <div key={offer.id} className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  offer.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"
                }`}>
                  {offer.status}
                </span>
                <span className="text-[10px] text-muted-foreground">{offer.pricing_model}</span>
              </div>

              <h3 className="font-bold text-sm text-[hsl(var(--foreground))]">{offer.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{offer.tagline || offer.description}</p>
            </div>

            <div className="border-t border-[hsl(var(--border))] pt-3 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Price</span>
                <span className="text-lg font-extrabold text-[hsl(var(--foreground))]">
                  {offer.is_free ? (
                    <span className="text-emerald-400">Free</span>
                  ) : (
                    `₹${(offer.primary_price_cents / 100).toLocaleString("en-IN")}`
                  )}
                </span>
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/checkout/${offer.id}`}
                  target="_blank"
                  className="flex-1 py-1.5 text-center text-xs font-medium rounded-lg bg-[hsl(var(--accent))] hover:bg-slate-700 text-white flex items-center justify-center gap-1"
                >
                  Checkout <ExternalLink className="h-3 w-3" />
                </Link>
                <button
                  onClick={() => toggleStatus(offer.id, offer.status)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] text-white"
                >
                  {offer.status === "ACTIVE" ? "Pause" : "Publish"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
