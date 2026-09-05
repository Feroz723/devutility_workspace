export interface KnowledgeArticle {
  id: string;
  product_id?: string;
  title: string;
  category: "GETTING_STARTED" | "TROUBLESHOOTING" | "BILLING" | "FAQS";
  content: string;
  tags: string[];
}

export function getProductKnowledgeBase(productName: string = "Product", productId?: string): KnowledgeArticle[] {
  return [
    {
      id: "kb_quickstart",
      product_id: productId,
      title: `Getting Started with ${productName}`,
      category: "GETTING_STARTED",
      content: `Welcome to ${productName}! To begin receiving value:
1. Log in using the email linked to your checkout order.
2. Complete the initial checklist in your onboarding dashboard.
3. Generate your first output using the core workflow.
4. If you have questions, our knowledge base and support team are here 24/7.`,
      tags: ["quickstart", "setup", "getting started"],
    },
    {
      id: "kb_troubleshooting_access",
      product_id: productId,
      title: "Troubleshooting Access & Entitlements",
      category: "TROUBLESHOOTING",
      content: `If you cannot view your entitlements or files:
- Confirm your payment status shows as PAID in your checkout summary.
- Ensure your browser allows storage tokens and cookies for the application.
- If you purchased on behalf of another team member, request an invite link from the admin.`,
      tags: ["access", "login", "permissions", "error"],
    },
    {
      id: "kb_billing_invoices",
      product_id: productId,
      title: "Billing, Receipts, and Invoicing",
      category: "BILLING",
      content: `Invoices and receipts are generated automatically upon successful payment.
You can download your GST invoice or payment receipt from the Orders page. For refund requests, our operators review each inquiry according to our standard 14-day refund policy.`,
      tags: ["billing", "invoice", "receipt", "refund"],
    },
    {
      id: "kb_export_data",
      product_id: productId,
      title: "Exporting and Sharing Your Work",
      category: "FAQS",
      content: `All reports, assets, and configurations created in ${productName} can be downloaded as JSON, PDF, or CSV. Select the 'Export' button on any report to download immediately.`,
      tags: ["export", "download", "sharing"],
    },
  ];
}

export function searchKnowledgeBase(query: string, articles: KnowledgeArticle[]): KnowledgeArticle[] {
  const q = query.toLowerCase().trim();
  if (!q) return articles;

  return articles.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.content.toLowerCase().includes(q) ||
      a.tags.some((t) => t.toLowerCase().includes(q))
  );
}
