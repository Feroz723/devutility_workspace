"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Package,
  Hammer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Code,
  FileText,
  History,
  Activity,
  Play,
  Check,
  X,
  Archive,
  ArrowLeft,
  Eye,
  Layers,
  Sparkles,
  Terminal,
} from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<any>(null);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [qualityReport, setQualityReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "strategy" | "spec" | "plan" | "quality" | "artifacts" | "versions" | "events"
  >("overview");
  const [selectedArtifact, setSelectedArtifact] = useState<any>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAllProductData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);


  const loadAllProductData = async () => {
    setLoading(true);
    try {
      const [prodRes, artRes, verRes, evRes] = await Promise.all([
        fetch(`/api/products/${productId}`).then((r) => r.json()),
        fetch(`/api/products/${productId}/artifacts`).then((r) => r.json()).catch(() => ({ artifacts: [] })),
        fetch(`/api/products/${productId}/versions`).then((r) => r.json()).catch(() => ({ versions: [] })),
        fetch(`/api/products/${productId}/events`).then((r) => r.json()).catch(() => ({ events: [] })),
      ]);

      if (prodRes && !prodRes.error) {
        setProduct(prodRes);
      }
      setArtifacts(artRes.artifacts || []);
      setVersions(verRes.versions || []);
      setEvents(evRes.events || []);

      if (artRes.artifacts && artRes.artifacts.length > 0) {
        setSelectedArtifact(artRes.artifacts[0]);
      }
    } catch (err) {
      console.error("Failed to load product details", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuild = async () => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/products/${productId}/build`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setActionMessage("Build finished successfully!");
        await loadAllProductData();
      } else {
        setActionMessage(data.error || "Build failed.");
      }
    } catch (err: any) {
      setActionMessage(err?.message || "Failed to trigger build.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidate = async () => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/products/${productId}/validate`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setQualityReport(data.quality_report);
        setActiveTab("quality");
        setActionMessage("Quality gates evaluated successfully!");
      } else {
        setActionMessage(data.error || "Validation failed.");
      }
    } catch (err: any) {
      setActionMessage(err?.message || "Failed to validate quality gates.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}/approve`, { method: "POST" });
      if (res.ok) {
        setActionMessage("Product approved! Marked as READY.");
        await loadAllProductData();
      } else {
        const err = await res.json();
        setActionMessage(err.error || "Approval failed.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (res.ok) {
        setRejectModalOpen(false);
        setRejectReason("");
        setActionMessage("Product moved back to DRAFT.");
        await loadAllProductData();
      } else {
        const err = await res.json();
        setActionMessage(err.error || "Rejection failed.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm("Are you sure you want to archive this product?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}/archive`, { method: "POST" });
      if (res.ok) {
        setActionMessage("Product archived.");
        await loadAllProductData();
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-sm text-muted-foreground">Loading product...</div>;
  }

  if (!product) {
    return (
      <div className="p-12 text-center">
        <p className="text-sm text-destructive">Product not found.</p>
        <Link href="/products" className="mt-4 inline-block text-xs text-primary underline">
          Back to products
        </Link>
      </div>
    );
  }

  const spec = product.learning_data?.specification || {};
  const buildPlan = product.build_plan || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Products
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/products/${productId}/preview`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-semibold text-primary hover:bg-primary/20 transition"
          >
            <Eye className="h-3.5 w-3.5" />
            Launch Live Preview
          </Link>
        </div>
      </div>

      {/* Header Banner */}
      <div className="p-6 rounded-2xl border border-border/50 bg-card/60 backdrop-blur space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                {product.product_type} • v{product.version || "1.0.0"}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-background text-foreground">
                Status: {product.status}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                ₹{product.actual_cost_inr || 0} Cost
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">{product.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{product.description || product.problem}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBuild}
              disabled={actionLoading || product.status === "BUILDING"}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition"
            >
              <Hammer className="h-3.5 w-3.5" />
              {product.build_status === "NOT_STARTED" ? "Run Autonomous Build" : "Re-Build"}
            </button>

            <button
              onClick={handleValidate}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Verify Quality Gates
            </button>

            {product.status === "READY_FOR_REVIEW" && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition"
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve Product
                </button>
                <button
                  onClick={() => setRejectModalOpen(true)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-semibold hover:bg-rose-600/30 transition"
                >
                  <X className="h-3.5 w-3.5" />
                  Reject / Revise
                </button>
              </>
            )}

            {product.status !== "ARCHIVED" && (
              <button
                onClick={handleArchive}
                disabled={actionLoading}
                className="p-2 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground transition"
                title="Archive Product"
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {actionMessage && (
          <div className="p-3 bg-muted/40 border border-border/60 rounded-lg text-xs font-medium text-foreground">
            {actionMessage}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/50 gap-1 overflow-x-auto pb-px">
        {[
          { id: "overview", label: "Overview", icon: Package },
          { id: "strategy", label: "Strategy & Anti-Bloat", icon: Sparkles },
          { id: "spec", label: "Specification", icon: FileText },
          { id: "plan", label: "Build Plan (DAG)", icon: Layers },
          { id: "quality", label: "Quality Gates", icon: ShieldCheck },
          { id: "artifacts", label: `Artifacts (${artifacts.length})`, icon: Code },
          { id: "versions", label: `Versions (${versions.length})`, icon: History },
          { id: "events", label: `Build Events (${events.length})`, icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition ${
                isActive
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="mt-4">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="p-5 rounded-xl border border-border/50 bg-card/40 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Core Solution</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase">Validated Problem:</span>
                    <p className="text-xs text-foreground mt-0.5">{product.problem || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase">Autonomous Solution:</span>
                    <p className="text-xs text-foreground mt-0.5">{product.solution || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase">Value Proposition:</span>
                    <p className="text-xs text-foreground mt-0.5">{product.value_proposition || "N/A"}</p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl border border-border/50 bg-card/40 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Technology Stack & Zero-Cost Justification</h3>
                <div className="flex flex-wrap gap-2">
                  {(product.tech_stack || [
                    "Next.js 14",
                    "React 18",
                    "TypeScript",
                    "Tailwind CSS",
                    "LocalStorage",
                  ]).map((tech: string, i: number) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-md bg-muted/60 border border-border/50 text-[11px] text-foreground font-mono"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  100% free browser runtime. No monthly API fees, no paid SaaS dependencies.
                </p>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="space-y-5">
              <div className="p-5 rounded-xl border border-border/50 bg-card/40 space-y-3 text-xs">
                <h3 className="font-semibold text-foreground">Lifecycle & Metadata</h3>
                <div className="space-y-2 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Product Slug:</span>
                    <span className="font-mono text-foreground">{product.slug}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Build Status:</span>
                    <span className="font-semibold text-foreground">{product.build_status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Version:</span>
                    <span className="font-mono text-foreground">{product.version || "1.0.0"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cost Incurred:</span>
                    <span className="font-semibold text-emerald-400">₹{product.actual_cost_inr || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created At:</span>
                    <span>{new Date(product.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {product.experiment_id && (
                <div className="p-5 rounded-xl border border-border/50 bg-card/40 space-y-2 text-xs">
                  <h3 className="font-semibold text-foreground">Source Experiment</h3>
                  <p className="text-muted-foreground text-[11px]">
                    Generated autonomously from validated experiment winner.
                  </p>
                  <Link
                    href={`/experiments`}
                    className="inline-flex items-center gap-1.5 text-primary hover:underline font-mono text-[11px] mt-1"
                  >
                    View Experiment ID: {product.experiment_id.substring(0, 10)}...
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: STRATEGY */}
        {activeTab === "strategy" && (
          <div className="p-6 rounded-xl border border-border/50 bg-card/40 space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">Anti-Bloat & Scope Minimization Strategy</h3>
              <p className="text-xs text-muted-foreground">
                To guarantee zero-cost delivery and maximum user utility, the Autonomous Product Builder restricts scope to the smallest validated solution.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-lg bg-background/50 border border-emerald-500/20 space-y-3">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Included in v1 (MVP)
                </span>
                <ul className="space-y-2 text-xs text-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">•</span>
                    Single focused utility resolving the validated pain point
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">•</span>
                    Instant client-side execution with zero setup friction
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">•</span>
                    Export, copy-to-clipboard, and local history storage
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">•</span>
                    Responsive layout optimized for desktop and mobile
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-background/50 border border-rose-500/20 space-y-3">
                <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <X className="h-4 w-4" />
                  Explicit Non-Goals (Excluded)
                </span>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400">✕</span>
                    No user authentication or password management (frictionless)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400">✕</span>
                    No payment gateways or billing (strictly ₹0 in Phase 6)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400">✕</span>
                    No multi-tenant organization workspaces
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400">✕</span>
                    No paid external cloud APIs or proprietary LLM cost traps
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SPECIFICATION */}
        {activeTab === "spec" && (
          <div className="p-6 rounded-xl border border-border/50 bg-card/40 space-y-4">
            <h3 className="text-base font-semibold text-foreground">7-Part Product Specification</h3>
            <pre className="p-4 rounded-lg bg-background border border-border/50 text-xs font-mono overflow-x-auto text-foreground">
              {JSON.stringify(spec, null, 2)}
            </pre>
          </div>
        )}

        {/* TAB 4: BUILD PLAN */}
        {activeTab === "plan" && (
          <div className="p-6 rounded-xl border border-border/50 bg-card/40 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">Directed Acyclic Graph (DAG) Tasks</h3>
                <p className="text-xs text-muted-foreground">Ordered tasks executed autonomously during product build.</p>
              </div>
              <span className="px-2.5 py-1 rounded bg-muted text-xs font-mono">
                {buildPlan.tasks?.length || 0} Tasks
              </span>
            </div>

            <div className="space-y-3">
              {(buildPlan.tasks || []).map((task: any, idx: number) => (
                <div
                  key={task.id || idx}
                  className="p-4 rounded-lg border border-border/40 bg-background/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground">#{idx + 1}</span>
                      <span className="font-semibold text-foreground">{task.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted font-mono">{task.type}</span>
                    </div>
                    <p className="text-muted-foreground text-[11px]">{task.description}</p>
                    <p className="text-[10px] font-mono text-primary">{task.target_file}</p>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      task.status === "COMPLETED"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : task.status === "FAILED"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                    }`}
                  >
                    {task.status || "PENDING"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: QUALITY GATES */}
        {activeTab === "quality" && (
          <div className="space-y-6">
            {qualityReport ? (
              <div className="p-6 rounded-xl border border-border/50 bg-card/40 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">8-Point Quality Gate Report</h3>
                    <p className="text-xs text-muted-foreground">Evaluated at {new Date(qualityReport.evaluated_at).toLocaleTimeString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold font-mono">Score: {qualityReport.overall_score}/100</span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        qualityReport.overall_passed
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {qualityReport.overall_passed ? "ALL GATES PASSED" : "BLOCKERS DETECTED"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {qualityReport.gates.map((g: any, i: number) => (
                    <div
                      key={i}
                      className={`p-4 rounded-lg border bg-background/50 space-y-2 text-xs ${
                        g.passed ? "border-emerald-500/20" : "border-rose-500/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{g.gate}</span>
                        <span
                          className={`font-mono font-semibold ${
                            g.passed ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {g.score}/100
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[11px]">{g.details}</p>
                      {g.errors && g.errors.length > 0 && (
                        <div className="p-2 rounded bg-destructive/10 text-destructive text-[10px] space-y-1">
                          {g.errors.map((err: string, ei: number) => (
                            <div key={ei}>• {err}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-xl border border-border/50 bg-card/40 text-center space-y-3">
                <ShieldCheck className="h-8 w-8 text-primary mx-auto" />
                <h3 className="text-sm font-semibold text-foreground">Run Quality Gate Verification</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Click below to evaluate the 8 quality gates (build, typecheck, lint, tests, zero-secrets, ₹0-cost, security, MVP features).
                </p>
                <button
                  onClick={handleValidate}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition"
                >
                  Verify Now
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: ARTIFACTS */}
        {activeTab === "artifacts" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Generated Files ({artifacts.length})
              </h3>
              {artifacts.length === 0 ? (
                <p className="text-xs text-muted-foreground">No artifacts yet. Run build first.</p>
              ) : (
                artifacts.map((art) => (
                  <button
                    key={art.id}
                    onClick={() => setSelectedArtifact(art)}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition ${
                      selectedArtifact?.id === art.id
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border/40 bg-card/40 text-foreground hover:border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px]">{art.artifact_type}</span>
                      <span className="text-[10px] text-muted-foreground">{art.size_bytes}B</span>
                    </div>
                    <div className="font-mono text-[11px] truncate mt-1">{art.file_path}</div>
                  </button>
                ))
              )}
            </div>

            <div className="md:col-span-2">
              {selectedArtifact ? (
                <div className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {selectedArtifact.file_path}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      SHA-256: {selectedArtifact.checksum?.substring(0, 12)}...
                    </span>
                  </div>
                  <pre className="p-4 rounded-lg bg-background border border-border/40 text-xs font-mono overflow-x-auto text-foreground max-h-[500px]">
                    {selectedArtifact.content || "Empty artifact content"}
                  </pre>
                </div>
              ) : (
                <div className="p-12 text-center text-xs text-muted-foreground border border-border/40 rounded-xl">
                  Select an artifact on the left to inspect its generated contents.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: VERSIONS */}
        {activeTab === "versions" && (
          <div className="p-6 rounded-xl border border-border/50 bg-card/40 space-y-4">
            <h3 className="text-base font-semibold text-foreground">Version Snapshot History</h3>
            {versions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No versions recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {versions.map((ver) => (
                  <div
                    key={ver.id}
                    className="p-4 rounded-lg border border-border/40 bg-background/50 flex items-start justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">v{ver.version}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(ver.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{ver.changelog || "No changelog provided."}</p>
                      <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground mt-1">
                        <span>Spec Hash: {ver.spec_hash?.substring(0, 12)}...</span>
                        <span>Plan Hash: {ver.build_plan_hash?.substring(0, 12)}...</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 8: EVENTS */}
        {activeTab === "events" && (
          <div className="p-6 rounded-xl border border-border/50 bg-card/40 space-y-4">
            <h3 className="text-base font-semibold text-foreground">Autonomous Execution Timeline</h3>
            {events.length === 0 ? (
              <p className="text-xs text-muted-foreground">No build events recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-lg border border-border/40 bg-background/50 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          ev.status === "SUCCESS"
                            ? "bg-emerald-400"
                            : ev.status === "FAILED"
                            ? "bg-rose-400"
                            : "bg-blue-400"
                        }`}
                      />
                      <span className="font-medium text-foreground">{ev.step_name}</span>
                    </div>

                    <div className="flex items-center gap-4 text-muted-foreground font-mono text-[11px]">
                      {ev.duration_ms && <span>{ev.duration_ms}ms</span>}
                      <span>{new Date(ev.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border/60 rounded-xl p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-semibold text-foreground">Reject Product Build</h3>
            <p className="text-xs text-muted-foreground">
              Please enter the specific reason for rejecting this product. The product will be reverted to DRAFT so the build plan can be revised.
            </p>
            <textarea
              className="w-full bg-background border border-border/60 rounded-lg p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              rows={3}
              placeholder="E.g., Missing edge-case validation, UI copy requires clarification..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-border/60 text-xs text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
