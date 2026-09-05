"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  Hammer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Filter,
} from "lucide-react";

interface ProductItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  product_type: string;
  status: string;
  build_status: string;
  estimated_cost_inr: number;
  actual_cost_inr: number;
  cost_classification: string;
  version: string;
  is_demo: boolean;
  experiment_id: string | null;
  opportunity_id: string | null;
  created_at: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error("Failed to load products", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (filterStatus !== "ALL" && p.status !== filterStatus) return false;
    if (filterType !== "ALL" && p.product_type !== filterType) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "READY":
      case "LIVE":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "READY_FOR_REVIEW":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "BUILDING":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse";
      case "FAILED":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  const getBuildStatusBadge = (buildStatus: string) => {
    switch (buildStatus) {
      case "READY":
        return "text-emerald-400";
      case "GENERATING":
      case "TESTING":
      case "PACKAGING":
      case "PLANNING":
        return "text-blue-400";
      case "FAILED":
        return "text-rose-400";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Autonomous Product Builder</h1>
            <p className="text-sm text-muted-foreground">
              Transforms validated experiment winners into production-ready, ₹0 digital products.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            ₹0 Budget Guard Active
          </span>
          <Link
            href="/experiments"
            className="px-3.5 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:opacity-90 flex items-center gap-1.5 transition"
          >
            View Experiments
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-border/40 bg-card/40 backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter by:</span>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-background border border-border/60 rounded-md px-2.5 py-1 text-xs text-foreground"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="BUILDING">Building</option>
            <option value="READY_FOR_REVIEW">Ready for Review</option>
            <option value="READY">Ready</option>
            <option value="LIVE">Live</option>
            <option value="FAILED">Failed</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-background border border-border/60 rounded-md px-2.5 py-1 text-xs text-foreground"
          >
            <option value="ALL">All Product Types</option>
            <option value="FREE_TOOL">Free Tool</option>
            <option value="MICRO_SAAS">Micro SaaS</option>
            <option value="DEVELOPER_TOOL">Developer Tool</option>
            <option value="DOWNLOADABLE_PRODUCT">Downloadable</option>
            <option value="TEMPLATE">Template</option>
            <option value="AUTOMATION">Automation</option>
            <option value="CONCIERGE_SERVICE">Concierge Service</option>
          </select>
        </div>

        <div className="text-xs text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filteredProducts.length}</span> of {products.length} products
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="p-12 text-center text-sm text-muted-foreground">
          Loading autonomous products...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-card/30 p-12 text-center">
          <Package className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground">No products found</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-4">
            Only experiments with WINNER or PROMISING results and real user signals are eligible to generate products.
          </p>
          <Link
            href="/experiments"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition"
          >
            <Sparkles className="h-4 w-4" />
            Check Validated Experiments
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              className="group block rounded-xl border border-border/50 bg-card/60 p-5 hover:border-primary/50 transition duration-200 shadow-sm hover:shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    {p.product_type} • v{p.version || "1.0.0"}
                  </span>
                  <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition mt-0.5">
                    {p.name}
                  </h3>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${getStatusBadge(
                    p.status
                  )}`}
                >
                  {p.status}
                </span>
              </div>

              {p.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {p.description}
                </p>
              )}

              <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Hammer className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Build:</span>
                  <span className={`font-medium ${getBuildStatusBadge(p.build_status)}`}>
                    {p.build_status}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-emerald-400 font-medium">
                  <span>₹{p.actual_cost_inr || 0}</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-sans">Cost</span>
                </div>
              </div>

              {p.experiment_id && (
                <div className="mt-2.5 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>From Experiment</span>
                  <span className="font-mono text-[10px] bg-muted/60 px-1.5 py-0.5 rounded">
                    {p.experiment_id.substring(0, 8)}...
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
