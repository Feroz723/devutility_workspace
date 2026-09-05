/**
 * Database Seed Script
 * ====================
 * Seeds demo data with is_demo = true.
 * Demo records are NEVER included in real metrics.
 * Idempotent: skips if demo data already exists.
 */

import { query, queryOne, closePool } from "./client";

async function seed() {
  console.log("[seed] Checking for existing demo data...");

  const existing = await queryOne<{ count: string }>(
    "SELECT COUNT(*) as count FROM opportunities WHERE is_demo = true"
  );

  if (parseInt(existing?.count ?? "0", 10) > 0) {
    console.log("[seed] Demo data already exists. Skipping.");
    return;
  }

  console.log("[seed] Seeding demo opportunities...");

  // Demo Opportunity 1
  const opp1 = await queryOne<{ id: string }>(
    `INSERT INTO opportunities (
      title, problem, problem_statement, target_customer, target_market,
      source, source_url, demand_score, competition_score,
      monetization_score, automation_score, zero_cost_score,
      overall_score, decision, estimated_revenue, estimated_time_to_test,
      human_involvement, risk_level, status, is_demo
    ) VALUES (
      'AI Resume Builder for Indian Freshers',
      'Fresh graduates struggle to create ATS-friendly resumes',
      'Indian freshers applying for their first tech job waste hours on resume formatting and fail ATS scans',
      'Fresh CS/IT graduates in India',
      'India - Entry-level tech recruitment',
      'Reddit/LinkedIn research',
      'https://reddit.com/r/indian_academia',
      82, 45, 78, 85, 90,
      83, 'TEST', '₹15,000/month', '2 weeks',
      'minimal', 'low', 'testing', true
    ) RETURNING id`
  );

  // Demo Opportunity 2
  const opp2 = await queryOne<{ id: string }>(
    `INSERT INTO opportunities (
      title, problem, problem_statement, target_customer, target_market,
      source, demand_score, competition_score,
      monetization_score, automation_score, zero_cost_score,
      overall_score, decision, estimated_revenue, estimated_time_to_test,
      human_involvement, risk_level, status, is_demo
    ) VALUES (
      'Notion Template Pack for Freelancers',
      'Freelancers need organized project and invoice tracking',
      'Independent freelancers in India lose billable hours to disorganized project management',
      'Indian freelance designers and developers',
      'India - Freelance economy',
      'Twitter/IndieHackers research',
      68, 72, 65, 70, 85,
      64, 'RESEARCH_MORE', '₹8,000/month', '1 week',
      'moderate', 'medium', 'researching', true
    ) RETURNING id`
  );

  // Demo Opportunity 3
  const opp3 = await queryOne<{ id: string }>(
    `INSERT INTO opportunities (
      title, problem, problem_statement, target_customer, target_market,
      source, demand_score, competition_score,
      monetization_score, automation_score, zero_cost_score,
      overall_score, decision, estimated_revenue,
      human_involvement, risk_level, status, is_demo
    ) VALUES (
      'Crypto Tax Calculator for India',
      'Indian crypto traders lack compliant tax calculation tools',
      'New tax regulations for crypto in India confuse retail traders who need simple compliance',
      'Indian retail crypto traders',
      'India - Crypto/Finance',
      'Google Trends research',
      55, 60, 50, 40, 30,
      45, 'REJECT', '₹25,000/month',
      'significant', 'high', 'rejected', true
    ) RETURNING id`
  );

  // Demo Opportunity 4
  const opp4 = await queryOne<{ id: string }>(
    `INSERT INTO opportunities (
      title, problem, problem_statement, target_customer, target_market,
      source, demand_score, competition_score,
      monetization_score, automation_score, zero_cost_score,
      overall_score, decision, estimated_revenue, estimated_time_to_test,
      human_involvement, risk_level, status, is_demo
    ) VALUES (
      'WhatsApp Chatbot Templates for Small Business',
      'Small Indian businesses want to automate WhatsApp customer support',
      'Local businesses in India receive 50+ daily WhatsApp queries but cannot afford custom chatbots',
      'Small retail businesses in India',
      'India - SMB automation',
      'Direct research',
      75, 55, 72, 60, 75,
      71, 'RESEARCH_MORE', '₹12,000/month', '3 weeks',
      'moderate', 'medium', 'scored', true
    ) RETURNING id`
  );

  console.log("[seed] Seeding demo experiments...");

  if (opp1?.id) {
    await query(
      `INSERT INTO experiments (
        opportunity_id, title, hypothesis, target_customer,
        success_criteria, stage, status, start_date, is_demo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
      [
        opp1.id,
        "Resume Builder MVP Landing Page",
        "If we create a free AI-powered resume builder, 5% of visitors will upgrade to premium templates",
        "Fresh CS/IT graduates",
        "100 signups in first week, 5% conversion to paid",
        "BUILD",
        "active",
        new Date().toISOString().split("T")[0],
      ]
    );
  }

  if (opp2?.id) {
    await query(
      `INSERT INTO experiments (
        opportunity_id, title, hypothesis, target_customer,
        success_criteria, stage, status, is_demo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [
        opp2.id,
        "Freelancer Template Validation Survey",
        "At least 40% of surveyed freelancers would pay ₹499 for a comprehensive Notion template pack",
        "Indian freelance designers",
        "40% intent-to-purchase in survey responses",
        "RESEARCH",
        "active",
      ]
    );
  }

  console.log("[seed] Seeding demo products...");

  if (opp1?.id) {
    await query(
      `INSERT INTO products (
        opportunity_id, name, description, product_type,
        creation_status, publishing_status, price, currency,
        delivery_method, is_demo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
      [
        opp1.id,
        "AI Resume Builder - Free Tier",
        "AI-powered resume builder with ATS optimization for Indian freshers",
        "tool",
        "building",
        "draft",
        0,
        "INR",
        "access_link",
      ]
    );

    await query(
      `INSERT INTO products (
        opportunity_id, name, description, product_type,
        creation_status, publishing_status, price, currency,
        delivery_method, is_demo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
      [
        opp1.id,
        "AI Resume Builder - Premium Templates",
        "30+ premium ATS-optimized resume templates with industry-specific formatting",
        "template",
        "designing",
        "draft",
        499,
        "INR",
        "download",
      ]
    );
  }

  console.log("[seed] Seeding demo audit logs...");

  if (opp1?.id) {
    await query(
      `INSERT INTO audit_logs (event_type, entity_type, entity_id, actor, details)
       VALUES ('OPPORTUNITY_CREATED', 'opportunity', $1, 'seed-script', '{"is_demo": true}')`,
      [opp1.id]
    );
  }

  console.log("[seed] Demo data seeded successfully.");
}

// Run directly with: npx tsx database/seed.ts
if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  seed()
    .then(() => {
      console.log("[seed] Done.");
      return closePool();
    })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[seed] Fatal:", err);
      process.exit(1);
    });
}

export { seed };
