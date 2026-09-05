"use client";

import React, { useState, useEffect, useRef } from "react";
import type { Product } from "@/types/product";
import {
  Sparkles,
  Zap,
  CheckCircle2,
  Send,
  MessageSquare,
  ShieldCheck,
  Activity,
  ArrowRight,
  Code,
  FileText,
  Copy,
  Check,
} from "lucide-react";

interface ProductClientViewProps {
  product: Product;
  searchParams: { [key: string]: string | string[] | undefined };
}

export function ProductPublicView({ product, searchParams }: ProductClientViewProps) {
  // Visitor & Session Identity
  const [visitorId, setVisitorId] = useState<string>("");
  const [sessionToken, setSessionToken] = useState<string>("");

  // Interactive Tool State
  const [activeTab, setActiveTab] = useState<"JSON" | "BASE64" | "UUID" | "TIMESTAMP" | "ANALYZE">("JSON");
  const [inputText, setInputText] = useState<string>(
    `{\n  "name": "${product.name}",\n  "version": "${product.version || "1.0.0"}",\n  "status": "online",\n  "features": ["json", "base64", "uuid", "timestamp", "analyzer"]\n}`
  );
  const [outputResult, setOutputResult] = useState<string>("");
  const [actionCount, setActionCount] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [uuidBatchSize, setUuidBatchSize] = useState<number>(1);
  const [timestampInput, setTimestampInput] = useState<string>(Math.floor(Date.now() / 1000).toString());
  const [currentEpoch, setCurrentEpoch] = useState<number>(Math.floor(Date.now() / 1000));

  // Live timer for current epoch
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentEpoch(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Feedback State
  const [rating, setRating] = useState<number>(5);
  const [feedbackCategory, setFeedbackCategory] = useState<string>("USABILITY");
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [feedbackLoading, setFeedbackLoading] = useState<boolean>(false);

  const initRef = useRef(false);

  // Extract UTMs
  const utmSource = typeof searchParams.utm_source === "string" ? searchParams.utm_source : "direct";
  const utmMedium = typeof searchParams.utm_medium === "string" ? searchParams.utm_medium : "none";
  const utmCampaign = typeof searchParams.utm_campaign === "string" ? searchParams.utm_campaign : "organic";

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    // Resolve or generate visitor ID
    let vid = localStorage.getItem("abos_visitor_id");
    if (!vid) {
      vid = "v_" + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      localStorage.setItem("abos_visitor_id", vid);
    }
    setVisitorId(vid);

    // Generate session token
    const stoken = "s_" + Math.random().toString(36).substring(2, 12) + "_" + Date.now();
    setSessionToken(stoken);

    // Emit Real PAGE_VIEW Event
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        visitorId: vid,
        sessionToken: stoken,
        eventType: "PAGE_VIEW",
        eventName: "product_page_viewed",
        properties: {
          productSlug: product.slug,
          productName: product.name,
          url: window.location.href,
          referrer: document.referrer || "direct",
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
        },
      }),
    }).catch((err) => console.error("Telemetry emission failed:", err));
  }, [product.id, product.name, product.slug, utmSource, utmMedium, utmCampaign]);

  // Helper: emit CORE_ACTION telemetry
  const recordCoreAction = (actionName: string, meta: Record<string, any> = {}) => {
    setActionCount((prev) => prev + 1);
    if (visitorId) {
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          visitorId,
          sessionToken,
          eventType: "CORE_ACTION",
          eventName: "utility_action_executed",
          properties: {
            actionName,
            activeTab,
            productSlug: product.slug,
            ...meta,
          },
        }),
      }).catch((err) => console.error("Telemetry CORE_ACTION failed:", err));
    }
  };

  // --- Tool Handlers ---
  // 1. JSON
  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(inputText);
      setOutputResult(JSON.stringify(parsed, null, 2));
      recordCoreAction("json_format", { length: inputText.length });
    } catch (err: any) {
      setOutputResult(`[JSON Syntax Error]: ${err.message}`);
    }
  };

  const handleMinifyJson = () => {
    try {
      const parsed = JSON.parse(inputText);
      setOutputResult(JSON.stringify(parsed));
      recordCoreAction("json_minify", { length: inputText.length });
    } catch (err: any) {
      setOutputResult(`[JSON Syntax Error]: ${err.message}`);
    }
  };

  // 2. Base64
  const handleBase64Encode = () => {
    try {
      const encoded = btoa(unescape(encodeURIComponent(inputText)));
      setOutputResult(encoded);
      recordCoreAction("base64_encode", { length: inputText.length });
    } catch (err: any) {
      setOutputResult(`[Encoding Error]: ${err.message}`);
    }
  };

  const handleBase64Decode = () => {
    try {
      const decoded = decodeURIComponent(escape(atob(inputText.trim())));
      setOutputResult(decoded);
      recordCoreAction("base64_decode", { length: inputText.length });
    } catch (err: any) {
      setOutputResult(`[Decoding Error]: Invalid Base64 string (${err.message})`);
    }
  };

  // 3. UUID Generator
  const handleGenerateUuids = () => {
    const list: string[] = [];
    for (let i = 0; i < uuidBatchSize; i++) {
      list.push(
        "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        })
      );
    }
    setOutputResult(list.join("\n"));
    recordCoreAction("uuid_generate", { count: uuidBatchSize });
  };

  // 4. Timestamp Converter
  const handleConvertTimestamp = (val?: string) => {
    const target = (val !== undefined ? val : timestampInput).trim();
    const num = Number(target);
    if (isNaN(num)) {
      setOutputResult(`[Invalid Timestamp]: "${target}" is not a valid number.`);
      return;
    }
    // Decide if seconds or milliseconds
    const date = num > 1e11 ? new Date(num) : new Date(num * 1000);
    const result = [
      `=== UNIX TIMESTAMP CONVERSION ===`,
      `Input Epoch: ${target}`,
      `UTC Date (ISO): ${date.toISOString()}`,
      `UTC String:     ${date.toUTCString()}`,
      `Local Date:     ${date.toLocaleString()}`,
      `Timezone Offset:${date.getTimezoneOffset()} minutes`,
    ].join("\n");
    setOutputResult(result);
    recordCoreAction("timestamp_convert", { input: target });
  };

  // 5. Content Analyzer
  const handleAnalyzeContent = () => {
    const charCount = inputText.length;
    const charCountNoSpaces = inputText.replace(/\s+/g, "").length;
    const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
    const lineCount = inputText ? inputText.split("\n").length : 0;
    const byteSize = new Blob([inputText]).size;
    const result = [
      `=== CONTENT & PAYLOAD INTELLIGENCE ===`,
      `Character Count (total):   ${charCount}`,
      `Character Count (no space):${charCountNoSpaces}`,
      `Word Count:                ${wordCount}`,
      `Line Count:                ${lineCount}`,
      `Byte Size:                 ${byteSize} bytes (${(byteSize / 1024).toFixed(2)} KB)`,
      `Complexity Estimate:       ${wordCount > 100 ? "High" : wordCount > 20 ? "Moderate" : "Compact"}`,
      `Analyzed At:               ${new Date().toISOString()}`,
    ].join("\n");
    setOutputResult(result);
    recordCoreAction("content_analyze", { charCount, wordCount });
  };

  // Submit Feedback
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim() || !visitorId) return;

    setFeedbackLoading(true);
    try {
      const res = await fetch("/api/analytics/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          visitorId,
          sessionToken,
          rating,
          category: feedbackCategory,
          comment: feedbackText,
          source: "PUBLIC_PRODUCT_PAGE",
        }),
      });
      if (res.ok) {
        setFeedbackSubmitted(true);
      }
    } catch (err) {
      console.error("Feedback submit error:", err);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleCopy = () => {
    if (!outputResult) return;
    navigator.clipboard.writeText(outputResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Banner */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/20">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold tracking-tight text-white">{product.name}</span>
              <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                v{product.version || "1.0.0"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              100% Free Public Tool
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              Zero-Cost Autonomous Build
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-12">
        {/* Hero Section */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-cyan-400 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Autonomous Business OS Production Release</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            {product.name}
          </h1>
          <p className="text-lg text-slate-300">
            {product.value_proposition || product.description || "Streamline your digital workflow with zero setup."}
          </p>
          {product.problem && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left text-sm space-y-1.5 text-slate-400 mt-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Problem Solved
              </div>
              <p>{product.problem}</p>
            </div>
          )}
        </section>

        {/* Core Interactive Tool */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-cyan-950/20 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                Live Interactive Workspace
              </h2>
              <p className="text-xs text-slate-400">
                Execute transformations and generate outputs in real-time.
              </p>
            </div>
            {/* Tool Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("JSON");
                  setOutputResult("");
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                  activeTab === "JSON"
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                JSON Formatter
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("BASE64");
                  setOutputResult("");
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                  activeTab === "BASE64"
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Base64
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("UUID");
                  setOutputResult("");
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                  activeTab === "UUID"
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                UUID Generator
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("TIMESTAMP");
                  setOutputResult("");
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                  activeTab === "TIMESTAMP"
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Timestamp
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("ANALYZE");
                  setOutputResult("");
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                  activeTab === "ANALYZE"
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Payload Analyzer
              </button>
            </div>
          </div>

          {/* Tab Specific Interface */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Column */}
            <div className="space-y-3">
              {/* TAB 1: JSON */}
              {activeTab === "JSON" && (
                <>
                  <label className="block text-xs font-medium text-slate-300 flex items-center justify-between">
                    <span>JSON Payload</span>
                    <span className="text-slate-500 font-mono text-[11px]">{inputText.length} chars</span>
                  </label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    rows={9}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                    placeholder="Paste JSON here..."
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleFormatJson}
                      className="py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50 transition"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Format / Validate
                    </button>
                    <button
                      type="button"
                      onClick={handleMinifyJson}
                      className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      Minify JSON
                    </button>
                  </div>
                </>
              )}

              {/* TAB 2: BASE64 */}
              {activeTab === "BASE64" && (
                <>
                  <label className="block text-xs font-medium text-slate-300 flex items-center justify-between">
                    <span>Text or Base64 String</span>
                    <span className="text-slate-500 font-mono text-[11px]">{inputText.length} chars</span>
                  </label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    rows={9}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                    placeholder="Enter string to encode or Base64 to decode..."
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleBase64Encode}
                      className="py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50 transition"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Encode Base64
                    </button>
                    <button
                      type="button"
                      onClick={handleBase64Decode}
                      className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      Decode Base64
                    </button>
                  </div>
                </>
              )}

              {/* TAB 3: UUID */}
              {activeTab === "UUID" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <label className="block text-xs font-medium text-slate-300">
                      Select Quantity of UUIDs (v4)
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 5, 10, 20].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setUuidBatchSize(size)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
                            uuidBatchSize === size
                              ? "bg-cyan-600 text-white"
                              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                          }`}
                        >
                          {size} {size === 1 ? "UUID" : "UUIDs"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateUuids}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 transition"
                  >
                    <Zap className="w-4 h-4" />
                    Generate UUID v4
                  </button>
                </div>
              )}

              {/* TAB 4: TIMESTAMP */}
              {activeTab === "TIMESTAMP" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="text-[11px] text-slate-400 font-medium">Current Live Epoch (Seconds)</div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xl font-bold text-cyan-400">{currentEpoch}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setTimestampInput(currentEpoch.toString());
                          handleConvertTimestamp(currentEpoch.toString());
                        }}
                        className="text-xs text-slate-400 hover:text-cyan-300 underline"
                      >
                        Use Current Time
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-300">
                      Convert Epoch to Human Date
                    </label>
                    <input
                      type="text"
                      value={timestampInput}
                      onChange={(e) => setTimestampInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                      placeholder="e.g. 1788600462"
                    />
                    <button
                      type="button"
                      onClick={() => handleConvertTimestamp()}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      Convert Timestamp
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: ANALYZE */}
              {activeTab === "ANALYZE" && (
                <>
                  <label className="block text-xs font-medium text-slate-300 flex items-center justify-between">
                    <span>Payload / Code / Text to Analyze</span>
                    <span className="text-slate-500 font-mono text-[11px]">{inputText.length} chars</span>
                  </label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    rows={9}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                    placeholder="Enter code, text, or payload to analyze..."
                  />
                  <button
                    type="button"
                    onClick={handleAnalyzeContent}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 transition"
                  >
                    <Sparkles className="w-4 h-4" />
                    Run Comprehensive Analysis
                  </button>
                </>
              )}
            </div>

            {/* Output Column */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Result / Output</span>
                {outputResult && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy Output"}
                  </button>
                )}
              </label>
              <div className="w-full h-[255px] bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-cyan-300 overflow-auto whitespace-pre-wrap">
                {outputResult ? (
                  outputResult
                ) : (
                  <span className="text-slate-600 italic">
                    Output will appear here after executing a tool action above.
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>Actions Executed This Session: {actionCount}</span>
                <span className="text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 100% Client-Side Verified
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Real User Feedback Widget */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-white">Give Direct User Feedback</h3>
          </div>
          <p className="text-xs text-slate-400">
            Your real feedback is fed directly into the ABOS Strategy Governor to steer the next autonomous product sprint.
          </p>

          {feedbackSubmitted ? (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Thank you! Your feedback has been recorded in the production feedback repository.</span>
            </div>
          ) : (
            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Rating */}
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Rating</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`text-lg transition ${
                          star <= rating ? "text-amber-400" : "text-slate-700"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Category</label>
                  <select
                    value={feedbackCategory}
                    onChange={(e) => setFeedbackCategory(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="USABILITY">Usability</option>
                    <option value="FEATURE">Feature Request</option>
                    <option value="BUG">Bug Report</option>
                    <option value="PRAISE">Praise</option>
                  </select>
                </div>
              </div>

              <div>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={3}
                  required
                  placeholder="What worked well? What should be improved in the next release?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={feedbackLoading || !feedbackText.trim()}
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 transition"
              >
                <Send className="w-3.5 h-3.5" />
                {feedbackLoading ? "Submitting..." : "Submit Real Feedback"}
              </button>
            </form>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            Powered by <span className="text-slate-300 font-semibold">Autonomous Business OS (ABOS)</span> — ₹0 Spending Guaranteed
          </div>
          <div className="font-mono text-[11px] text-slate-600">
            Session: {sessionToken ? sessionToken.substring(0, 16) + "..." : "init"}
          </div>
        </div>
      </footer>
    </div>
  );
}
