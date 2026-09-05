"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Clock,
  ShieldCheck,
  Terminal,
  Activity,
} from "lucide-react";

interface ProductHistoryRecord {
  id: string;
  input: string;
  output: string;
  mode: string;
  durationMs: number;
  timestamp: string;
}

export default function ProductPreviewPage() {
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Live tool state
  const [inputVal, setInputVal] = useState("");
  const [mode, setMode] = useState<"fast" | "detailed" | "compact">("fast");
  const [result, setResult] = useState<{
    output: string;
    durationMs: number;
    inputLen: number;
    outputLen: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ProductHistoryRecord[]>([]);

  useEffect(() => {
    fetchProduct();
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);


  const fetchProduct = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
      }
    } catch (err) {
      console.error("Failed to load product", err);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = () => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(`abos_preview_${productId}`);
      if (saved) setHistory(JSON.parse(saved));
    } catch {
      // ignore
    }
  };

  const saveHistoryRecord = (rec: ProductHistoryRecord) => {
    if (typeof window === "undefined") return;
    try {
      const updated = [rec, ...history].slice(0, 30);
      setHistory(updated);
      localStorage.setItem(`abos_preview_${productId}`, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleClearHistory = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(`abos_preview_${productId}`);
    setHistory([]);
  };

  const handleExecute = () => {
    setError(null);
    const raw = inputVal.trim();
    if (!raw) {
      setError("Please enter input text or parameters before executing.");
      return;
    }

    const start = performance.now();
    let out = raw;

    if (mode === "compact") {
      out = raw.replace(/\s+/g, " ");
    } else if (mode === "detailed") {
      const words = raw.split(/\s+/).filter(Boolean).length;
      const lines = raw.split("\n").length;
      out = `--- PROCESSED RESULT ---\n${raw}\n\n[Analysis Summary]\n• Characters: ${raw.length}\n• Words: ${words}\n• Lines: ${lines}\n• Status: Validated & Transformed Locally\n• Execution Target: Zero-Cost Client Engine`;
    } else {
      // fast
      out = raw.toUpperCase();
    }

    const duration = Math.max(1, Math.round(performance.now() - start));
    const resData = {
      output: out,
      durationMs: duration,
      inputLen: raw.length,
      outputLen: out.length,
    };

    setResult(resData);

    saveHistoryRecord({
      id: "rec_" + Math.random().toString(36).substring(2, 8),
      input: raw,
      output: out,
      mode,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="p-12 text-center text-sm text-muted-foreground">Loading preview...</div>;
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href={`/products/${productId}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Product Control Center
        </Link>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            Live Client Preview
          </span>
        </div>
      </div>

      {/* Main Interactive Product Shell */}
      <div className="border border-border/50 rounded-2xl bg-card/60 backdrop-blur shadow-lg overflow-hidden">
        {/* Banner */}
        <div className="border-b border-border/40 p-6 bg-gradient-to-r from-card via-card/80 to-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {product.product_type} • v{product.version || "1.0.0"}
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-foreground mt-0.5">
                {product.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {product.description || product.value_proposition || "Autonomous digital product."}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
              ₹0 Free Forever
            </span>
          </div>
        </div>

        {/* Workspace */}
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Primary Input
            </label>
            <textarea
              rows={4}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Enter text, parameters, or data to process with this autonomous tool..."
              className="w-full bg-background border border-border/60 rounded-xl p-3.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Mode:</span>
              <div className="inline-flex rounded-lg border border-border/60 bg-background p-0.5">
                {(["fast", "detailed", "compact"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition ${
                      mode === m
                        ? "bg-primary text-primary-foreground font-semibold shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {inputVal && (
                <button
                  onClick={() => {
                    setInputVal("");
                    setResult(null);
                    setError(null);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-border/60 text-xs text-muted-foreground hover:text-foreground transition"
                >
                  Clear
                </button>
              )}
              <button
                onClick={handleExecute}
                className="inline-flex items-center gap-1.5 px-5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition shadow"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Execute Tool
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* Results Area */}
          {result && (
            <div className="mt-6 rounded-xl border border-border/60 bg-background/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Output Result
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                    <Activity className="h-3 w-3" />
                    {result.durationMs}ms
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    ({result.inputLen} chars in → {result.outputLen} chars out)
                  </span>
                </div>

                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-medium hover:opacity-90 transition"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy Output
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 rounded-lg bg-muted/40 border border-border/40 text-xs font-mono text-foreground whitespace-pre-wrap break-all max-h-80 overflow-y-auto">
                {result.output}
              </pre>
            </div>
          )}
        </div>

        {/* Local History Section */}
        {history.length > 0 && (
          <div className="border-t border-border/40 p-6 bg-card/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Recent Local Execution History ({history.length})
              </span>
              <button
                onClick={handleClearHistory}
                className="text-[11px] text-muted-foreground hover:text-foreground transition"
              >
                Clear History
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {history.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => {
                    setInputVal(rec.input);
                    setResult({
                      output: rec.output,
                      durationMs: rec.durationMs,
                      inputLen: rec.input.length,
                      outputLen: rec.output.length,
                    });
                  }}
                  className="p-2.5 rounded-lg border border-border/40 bg-background/50 text-xs flex items-center justify-between gap-3 cursor-pointer hover:border-primary/40 transition"
                >
                  <span className="truncate text-foreground font-mono text-[11px] flex-1">
                    {rec.input}
                  </span>
                  <div className="flex items-center gap-3 text-muted-foreground text-[10px] font-mono">
                    <span className="capitalize">{rec.mode}</span>
                    <span>{rec.durationMs}ms</span>
                    <span>{new Date(rec.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
