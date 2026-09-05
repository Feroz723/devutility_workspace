import { query, queryOne, queryMany } from "@/database/client";
import type {
  StrategicState,
  ProductLifecycleState,
  ObservationWindow,
  BusinessFunnelStage,
  StrategyBottleneck,
  StrategyPattern,
  StrategyRecommendation,
  StrategyAction,
  DailyStrategicBrief,
  StrategyChange,
  StrategyMemory,
} from "@/types/strategy";

export class StrategyRepository {
  // ==========================================
  // 1. STRATEGIC STATES
  // ==========================================

  async getStrategicState(isDemo: boolean = false): Promise<StrategicState | null> {
    const row = await queryOne<any>(
      `SELECT * FROM strategic_states
       WHERE is_demo = $1
       ORDER BY operating_period_date DESC, created_at DESC
       LIMIT 1`,
      [isDemo]
    );
    return row ? this.mapStrategicState(row) : null;
  }

  async upsertStrategicState(input: Partial<StrategicState>): Promise<StrategicState> {
    const period = input.operating_period_date || new Date().toISOString().split("T")[0];
    const isDemo = input.is_demo ?? false;

    const row = await queryOne<any>(
      `INSERT INTO strategic_states (
        primary_active_product_id, primary_active_experiment_id,
        primary_business_objective, primary_strategy_id, focus_horizon,
        status, operating_period_date, state_summary, is_demo, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (operating_period_date, is_demo) DO UPDATE SET
        primary_active_product_id = COALESCE(EXCLUDED.primary_active_product_id, strategic_states.primary_active_product_id),
        primary_active_experiment_id = COALESCE(EXCLUDED.primary_active_experiment_id, strategic_states.primary_active_experiment_id),
        primary_business_objective = EXCLUDED.primary_business_objective,
        primary_strategy_id = COALESCE(EXCLUDED.primary_strategy_id, strategic_states.primary_strategy_id),
        focus_horizon = EXCLUDED.focus_horizon,
        status = EXCLUDED.status,
        state_summary = EXCLUDED.state_summary,
        updated_at = NOW()
      RETURNING *`,
      [
        input.primary_active_product_id || null,
        input.primary_active_experiment_id || null,
        input.primary_business_objective || "ACHIEVE_FIRST_RETAINED_CUSTOMER",
        input.primary_strategy_id || null,
        input.focus_horizon || "TODAY",
        input.status || "ACTIVE",
        period,
        JSON.stringify(input.state_summary || {}),
        isDemo,
      ]
    );

    return this.mapStrategicState(row!);
  }

  // ==========================================
  // 2. PRODUCT LIFECYCLE STATES
  // ==========================================

  async getProductLifecycleState(productId: string): Promise<ProductLifecycleState | null> {
    const row = await queryOne<any>(
      `SELECT * FROM product_lifecycle_states WHERE product_id = $1`,
      [productId]
    );
    return row ? this.mapProductLifecycleState(row) : null;
  }

  async listProductLifecycleStates(isDemo: boolean = false): Promise<ProductLifecycleState[]> {
    const rows = await queryMany<any>(
      `SELECT * FROM product_lifecycle_states WHERE is_demo = $1 ORDER BY updated_at DESC`,
      [isDemo]
    );
    return rows.map((r) => this.mapProductLifecycleState(r));
  }

  async upsertProductLifecycleState(input: Partial<ProductLifecycleState> & { product_id: string }): Promise<ProductLifecycleState> {
    const row = await queryOne<any>(
      `INSERT INTO product_lifecycle_states (
        product_id, lifecycle_stage, launched_at, distribution_started_at,
        total_exposure_reach, active_channels, sample_sizes_summary,
        experiments_conducted_count, modifications_history, switching_evaluation,
        switching_rationale, evidence_maturity_score, is_demo, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      ON CONFLICT (product_id) DO UPDATE SET
        lifecycle_stage = EXCLUDED.lifecycle_stage,
        launched_at = COALESCE(EXCLUDED.launched_at, product_lifecycle_states.launched_at),
        distribution_started_at = COALESCE(EXCLUDED.distribution_started_at, product_lifecycle_states.distribution_started_at),
        total_exposure_reach = EXCLUDED.total_exposure_reach,
        active_channels = EXCLUDED.active_channels,
        sample_sizes_summary = EXCLUDED.sample_sizes_summary,
        experiments_conducted_count = EXCLUDED.experiments_conducted_count,
        modifications_history = EXCLUDED.modifications_history,
        switching_evaluation = EXCLUDED.switching_evaluation,
        switching_rationale = EXCLUDED.switching_rationale,
        evidence_maturity_score = EXCLUDED.evidence_maturity_score,
        updated_at = NOW()
      RETURNING *`,
      [
        input.product_id,
        input.lifecycle_stage || "DISCOVERED",
        input.launched_at || null,
        input.distribution_started_at || null,
        input.total_exposure_reach || 0,
        JSON.stringify(input.active_channels || []),
        JSON.stringify(input.sample_sizes_summary || {}),
        input.experiments_conducted_count || 0,
        JSON.stringify(input.modifications_history || []),
        input.switching_evaluation || "CONTINUE",
        input.switching_rationale || null,
        input.evidence_maturity_score || 0,
        input.is_demo ?? false,
      ]
    );

    return this.mapProductLifecycleState(row!);
  }

  // ==========================================
  // 3. OBSERVATION WINDOWS
  // ==========================================

  async getObservationWindow(productId: string): Promise<ObservationWindow | null> {
    const row = await queryOne<any>(
      `SELECT * FROM observation_windows WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [productId]
    );
    return row ? this.mapObservationWindow(row) : null;
  }

  async upsertObservationWindow(input: Partial<ObservationWindow> & { product_id: string }): Promise<ObservationWindow> {
    const row = await queryOne<any>(
      `INSERT INTO observation_windows (
        product_id, channel, window_start, target_review_date,
        min_sample_size_required, actual_sample_size_collected, timing_basis,
        window_status, waiting_reasons, next_decision_preview, is_demo, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *`,
      [
        input.product_id,
        input.channel || null,
        input.window_start || new Date().toISOString(),
        input.target_review_date || null,
        input.min_sample_size_required || 50,
        input.actual_sample_size_collected || 0,
        input.timing_basis || "UNKNOWN",
        input.window_status || "IN_PROGRESS",
        JSON.stringify(input.waiting_reasons || []),
        input.next_decision_preview || null,
        input.is_demo ?? false,
      ]
    );

    return this.mapObservationWindow(row!);
  }

  async listObservationWindows(productId?: string, isDemo: boolean = false): Promise<ObservationWindow[]> {
    let sql = `SELECT * FROM observation_windows WHERE is_demo = $1`;
    const params: any[] = [isDemo];

    if (productId) {
      params.push(productId);
      sql += ` AND product_id = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC`;
    const rows = await queryMany<any>(sql, params);
    return rows.map((r) => this.mapObservationWindow(r));
  }

  async createObservationWindow(input: Partial<ObservationWindow> & { product_id: string }): Promise<ObservationWindow> {
    return this.upsertObservationWindow(input);
  }

  async updateObservationWindow(id: string, patch: Partial<ObservationWindow>): Promise<ObservationWindow | null> {
    const updates: string[] = ["updated_at = NOW()"];
    const params: any[] = [id];

    if (patch.actual_sample_size_collected !== undefined) {
      params.push(patch.actual_sample_size_collected);
      updates.push(`actual_sample_size_collected = $${params.length}`);
    }
    if (patch.window_status !== undefined) {
      params.push(patch.window_status);
      updates.push(`window_status = $${params.length}`);
    }
    if (patch.waiting_reasons !== undefined) {
      params.push(JSON.stringify(patch.waiting_reasons));
      updates.push(`waiting_reasons = $${params.length}`);
    }

    const row = await queryOne<any>(
      `UPDATE observation_windows SET ${updates.join(", ")} WHERE id = $1 RETURNING *`,
      params
    );
    return row ? this.mapObservationWindow(row) : null;
  }

  // ==========================================
  // 4. BUSINESS FUNNEL STAGES
  // ==========================================

  async recordFunnelStages(stages: Partial<BusinessFunnelStage>[]): Promise<void> {
    for (const s of stages) {
      await query(
        `INSERT INTO business_funnel_stages (
          product_id, stage_name, stage_order, raw_count,
          conversion_rate_to_next, sample_size_status, confidence,
          evaluated_period_days, bottleneck_candidate, hypothesis, is_demo, recorded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
        [
          s.product_id || null,
          s.stage_name || "REACH",
          s.stage_order || 1,
          s.raw_count || 0,
          s.conversion_rate_to_next ?? null,
          s.sample_size_status || "INSUFFICIENT_DATA",
          s.confidence || "INSUFFICIENT_DATA",
          s.evaluated_period_days || 14,
          s.bottleneck_candidate ?? false,
          s.hypothesis || null,
          s.is_demo ?? false,
        ]
      );
    }
  }

  async recordFunnelStage(stage: Partial<BusinessFunnelStage>): Promise<BusinessFunnelStage> {
    const row = await queryOne<any>(
      `INSERT INTO business_funnel_stages (
        product_id, stage_name, stage_order, raw_count,
        conversion_rate_to_next, sample_size_status, confidence,
        evaluated_period_days, bottleneck_candidate, hypothesis, is_demo, recorded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *`,
      [
        stage.product_id || null,
        stage.stage_name || "REACH",
        stage.stage_order || 1,
        stage.raw_count || 0,
        stage.conversion_rate_to_next ?? null,
        stage.sample_size_status || "INSUFFICIENT_DATA",
        stage.confidence || "INSUFFICIENT_DATA",
        stage.evaluated_period_days || 14,
        stage.bottleneck_candidate ?? false,
        stage.hypothesis || null,
        stage.is_demo ?? false,
      ]
    );
    return this.mapFunnelStage(row!);
  }

  async getLatestFunnelStages(productId?: string, isDemo: boolean = false): Promise<BusinessFunnelStage[]> {
    let sql = `SELECT * FROM business_funnel_stages WHERE is_demo = $1`;
    const params: any[] = [isDemo];

    if (productId) {
      sql += ` AND product_id = $2`;
      params.push(productId);
    }

    sql += ` ORDER BY recorded_at DESC, stage_order ASC LIMIT 9`;
    const rows = await queryMany<any>(sql, params);
    return rows.map((r) => this.mapFunnelStage(r));
  }

  // ==========================================
  // 5. STRATEGY BOTTLENECKS
  // ==========================================

  async createBottleneck(input: Partial<StrategyBottleneck>): Promise<StrategyBottleneck> {
    const row = await queryOne<any>(
      `INSERT INTO strategy_bottlenecks (
        bottleneck_type, product_id, severity, magnitude_score,
        business_impact_score, evidence_strength, sample_size, reversibility,
        resource_requirement, is_primary, evidence_data, description,
        recommended_focus, is_resolved, is_demo, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      RETURNING *`,
      [
        input.bottleneck_type,
        input.product_id || null,
        input.severity || "MEDIUM",
        input.magnitude_score || 0,
        input.business_impact_score || 0,
        input.evidence_strength || "LOW",
        input.sample_size || 0,
        input.reversibility || "HIGH",
        input.resource_requirement || "LOW",
        input.is_primary ?? false,
        JSON.stringify(input.evidence_data || {}),
        input.description || "",
        input.recommended_focus || null,
        input.is_resolved ?? false,
        input.is_demo ?? false,
      ]
    );

    return this.mapBottleneck(row!);
  }

  async listBottlenecks(options?: {
    isPrimary?: boolean;
    isResolved?: boolean;
    isDemo?: boolean;
    limit?: number;
  }): Promise<StrategyBottleneck[]> {
    const limit = options?.limit || 20;
    let sql = `SELECT * FROM strategy_bottlenecks WHERE 1=1`;
    const params: any[] = [];

    if (options?.isDemo !== undefined) {
      params.push(options.isDemo);
      sql += ` AND is_demo = $${params.length}`;
    }
    if (options?.isPrimary !== undefined) {
      params.push(options.isPrimary);
      sql += ` AND is_primary = $${params.length}`;
    }
    if (options?.isResolved !== undefined) {
      params.push(options.isResolved);
      sql += ` AND is_resolved = $${params.length}`;
    }

    sql += ` ORDER BY is_primary DESC, business_impact_score DESC, created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const rows = await queryMany<any>(sql, params);
    return rows.map((r) => this.mapBottleneck(r));
  }

  async resolveBottleneck(id: string): Promise<void> {
    await query(`UPDATE strategy_bottlenecks SET is_resolved = true, updated_at = NOW() WHERE id = $1`, [id]);
  }

  async getPrimaryBottleneck(isDemo: boolean = false): Promise<StrategyBottleneck | null> {
    const rows = await this.listBottlenecks({ isPrimary: true, isDemo, limit: 1 });
    return rows.length > 0 && rows[0] ? rows[0] : null;
  }

  // ==========================================
  // 6. STRATEGY PATTERNS
  // ==========================================

  async createPattern(input: Partial<StrategyPattern>): Promise<StrategyPattern> {
    const row = await queryOne<any>(
      `INSERT INTO strategy_patterns (
        pattern_name, category, description, supporting_observations,
        sample_size, time_period_days, causality_type, confidence,
        limitations, is_active, is_demo, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *`,
      [
        input.pattern_name || "General Business Pattern",
        input.category || "GENERAL",
        input.description || "",
        JSON.stringify(input.supporting_observations || []),
        input.sample_size || 0,
        input.time_period_days || 30,
        input.causality_type || "CORRELATED",
        input.confidence || "LOW",
        input.limitations || null,
        input.is_active ?? true,
        input.is_demo ?? false,
      ]
    );

    return this.mapPattern(row!);
  }

  async listPatterns(options?: { category?: string; isDemo?: boolean; limit?: number }): Promise<StrategyPattern[]> {
    const limit = options?.limit || 20;
    let sql = `SELECT * FROM strategy_patterns WHERE is_active = true`;
    const params: any[] = [];

    if (options?.isDemo !== undefined) {
      params.push(options.isDemo);
      sql += ` AND is_demo = $${params.length}`;
    }
    if (options?.category) {
      params.push(options.category);
      sql += ` AND category = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const rows = await queryMany<any>(sql, params);
    return rows.map((r) => this.mapPattern(r));
  }

  // ==========================================
  // 7. STRATEGY RECOMMENDATIONS
  // ==========================================

  async createStrategyRecommendation(input: Partial<StrategyRecommendation>): Promise<StrategyRecommendation> {
    const row = await queryOne<any>(
      `INSERT INTO strategy_recommendations (
        objective, problem_addressed, proposed_action, strategy_type,
        horizon, evidence_provenance, evidence_summary, confidence,
        expected_outcome, assumptions, resource_requirements, risks,
        reversibility, observation_requirements, success_criteria,
        failure_criteria, rank_order, is_primary, status, is_demo, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW())
      RETURNING *`,
      [
        input.objective || "Strategic Objective",
        input.problem_addressed || "",
        input.proposed_action || "",
        input.strategy_type || "IMPROVE",
        input.horizon || "TODAY",
        input.evidence_provenance || "CALCULATED",
        JSON.stringify(input.evidence_summary || {}),
        input.confidence || "MEDIUM",
        input.expected_outcome || "",
        JSON.stringify(input.assumptions || []),
        JSON.stringify(input.resource_requirements || { compute: 1, time_weight: 1 }),
        JSON.stringify(input.risks || []),
        input.reversibility || "HIGH",
        JSON.stringify(input.observation_requirements || {}),
        input.success_criteria || null,
        input.failure_criteria || null,
        input.rank_order || 1,
        input.is_primary ?? false,
        input.status || "PROPOSED",
        input.is_demo ?? false,
      ]
    );

    return this.mapRecommendation(row!);
  }

  async listStrategyRecommendations(options?: {
    isPrimary?: boolean;
    status?: string;
    isDemo?: boolean;
    limit?: number;
  }): Promise<StrategyRecommendation[]> {
    const limit = options?.limit || 20;
    let sql = `SELECT * FROM strategy_recommendations WHERE 1=1`;
    const params: any[] = [];

    if (options?.isDemo !== undefined) {
      params.push(options.isDemo);
      sql += ` AND is_demo = $${params.length}`;
    }
    if (options?.isPrimary !== undefined) {
      params.push(options.isPrimary);
      sql += ` AND is_primary = $${params.length}`;
    }
    if (options?.status) {
      params.push(options.status);
      sql += ` AND status = $${params.length}`;
    }

    sql += ` ORDER BY is_primary DESC, rank_order ASC, created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const rows = await queryMany<any>(sql, params);
    return rows.map((r) => this.mapRecommendation(r));
  }

  async setPrimaryStrategy(strategyId: string): Promise<void> {
    await query(`UPDATE strategy_recommendations SET is_primary = false WHERE is_primary = true`);
    await query(`UPDATE strategy_recommendations SET is_primary = true, status = 'ACCEPTED', updated_at = NOW() WHERE id = $1`, [strategyId]);
  }

  async getRecommendation(id: string): Promise<StrategyRecommendation | null> {
    const row = await queryOne<any>(`SELECT * FROM strategy_recommendations WHERE id = $1`, [id]);
    return row ? this.mapRecommendation(row) : null;
  }

  async createRecommendation(input: Partial<StrategyRecommendation>): Promise<StrategyRecommendation> {
    return this.createStrategyRecommendation(input);
  }

  // ==========================================
  // 8. STRATEGY ACTIONS
  // ==========================================

  async createStrategyActions(actions: Partial<StrategyAction>[]): Promise<StrategyAction[]> {
    const results: StrategyAction[] = [];
    for (const a of actions) {
      const row = await queryOne<any>(
        `INSERT INTO strategy_actions (
          strategy_id, priority_order, action_name, description,
          target_module, target_action, execution_type, status,
          estimated_cost_inr, payload, linked_job_id, is_demo, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING *`,
        [
          a.strategy_id,
          a.priority_order || 1,
          a.action_name,
          a.description || "",
          a.target_module || "OPERATIONS",
          a.target_action || "RUN",
          a.execution_type || "AUTOMATIC",
          a.status || "PENDING",
          a.estimated_cost_inr || 0,
          JSON.stringify(a.payload || {}),
          a.linked_job_id || null,
          a.is_demo ?? false,
        ]
      );
      if (row) results.push(this.mapAction(row));
    }
    return results;
  }

  async listStrategyActions(strategyId: string): Promise<StrategyAction[]> {
    const rows = await queryMany<any>(
      `SELECT * FROM strategy_actions WHERE strategy_id = $1 ORDER BY priority_order ASC`,
      [strategyId]
    );
    return rows.map((r) => this.mapAction(r));
  }

  async updateStrategyAction(id: string, patch: Partial<StrategyAction>): Promise<StrategyAction | null> {
    const updates: string[] = ["updated_at = NOW()"];
    const params: any[] = [id];

    if (patch.status !== undefined) {
      params.push(patch.status);
      updates.push(`status = $${params.length}`);
    }
    if (patch.linked_job_id !== undefined) {
      params.push(patch.linked_job_id);
      updates.push(`linked_job_id = $${params.length}`);
    }

    const row = await queryOne<any>(
      `UPDATE strategy_actions SET ${updates.join(", ")} WHERE id = $1 RETURNING *`,
      params
    );
    return row ? this.mapAction(row) : null;
  }

  async getAction(id: string): Promise<StrategyAction | null> {
    const row = await queryOne<any>(`SELECT * FROM strategy_actions WHERE id = $1`, [id]);
    return row ? this.mapAction(row) : null;
  }

  async createAction(input: Partial<StrategyAction>): Promise<StrategyAction> {
    const actions = await this.createStrategyActions([input]);
    if (!actions[0]) throw new Error("Failed to create strategy action");
    return actions[0];
  }

  async updateActionStatus(id: string, status: any, jobId?: string | null): Promise<StrategyAction | null> {
    return this.updateStrategyAction(id, {
      status,
      linked_job_id: jobId || undefined,
    });
  }

  // ==========================================
  // 9. DAILY STRATEGIC BRIEFS
  // ==========================================

  async createDailyBrief(brief: Partial<DailyStrategicBrief>): Promise<DailyStrategicBrief> {
    const briefDate = brief.brief_date || new Date().toISOString().split("T")[0];
    const isDemo = brief.is_demo ?? false;

    const row = await queryOne<any>(
      `INSERT INTO daily_strategic_briefs (
        brief_date, current_business_state, what_changed, what_data_says,
        what_we_know, what_we_do_not_know, important_patterns, current_bottleneck,
        primary_strategy, today_priority, next_actions, what_we_are_waiting_for,
        what_would_change_strategy, risks, confidence, evidence_provenance, is_demo, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
      ON CONFLICT (brief_date, is_demo) DO UPDATE SET
        current_business_state = EXCLUDED.current_business_state,
        what_changed = EXCLUDED.what_changed,
        what_data_says = EXCLUDED.what_data_says,
        what_we_know = EXCLUDED.what_we_know,
        what_we_do_not_know = EXCLUDED.what_we_do_not_know,
        important_patterns = EXCLUDED.important_patterns,
        current_bottleneck = EXCLUDED.current_bottleneck,
        primary_strategy = EXCLUDED.primary_strategy,
        today_priority = EXCLUDED.today_priority,
        next_actions = EXCLUDED.next_actions,
        what_we_are_waiting_for = EXCLUDED.what_we_are_waiting_for,
        what_would_change_strategy = EXCLUDED.what_would_change_strategy,
        risks = EXCLUDED.risks,
        confidence = EXCLUDED.confidence,
        evidence_provenance = EXCLUDED.evidence_provenance
      RETURNING *`,
      [
        briefDate,
        JSON.stringify(brief.current_business_state || {}),
        brief.what_changed || "Routine operational checks completed.",
        brief.what_data_says || "Data remains consistent with current baselines.",
        JSON.stringify(brief.what_we_know || []),
        JSON.stringify(brief.what_we_do_not_know || []),
        JSON.stringify(brief.important_patterns || []),
        JSON.stringify(brief.current_bottleneck || {}),
        JSON.stringify(brief.primary_strategy || {}),
        brief.today_priority || "Maintain controlled distribution and observe conversion evidence.",
        JSON.stringify(brief.next_actions || []),
        brief.what_we_are_waiting_for || null,
        brief.what_would_change_strategy || "Statistically significant change in funnel metrics.",
        JSON.stringify(brief.risks || []),
        brief.confidence || "MEDIUM",
        JSON.stringify(brief.evidence_provenance || []),
        isDemo,
      ]
    );

    return this.mapDailyBrief(row!);
  }

  async getLatestDailyBrief(isDemo: boolean = false): Promise<DailyStrategicBrief | null> {
    const row = await queryOne<any>(
      `SELECT * FROM daily_strategic_briefs WHERE is_demo = $1 ORDER BY brief_date DESC, created_at DESC LIMIT 1`,
      [isDemo]
    );
    return row ? this.mapDailyBrief(row) : null;
  }

  // ==========================================
  // 10. STRATEGY CHANGES
  // ==========================================

  async recordStrategyChange(change: Partial<StrategyChange>): Promise<StrategyChange> {
    const row = await queryOne<any>(
      `INSERT INTO strategy_changes (
        old_strategy_id, new_strategy_id, old_strategy_name, new_strategy_name,
        trigger_reason, evidence_diff, confidence, is_demo, recorded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *`,
      [
        change.old_strategy_id || null,
        change.new_strategy_id || null,
        change.old_strategy_name || null,
        change.new_strategy_name || "New Strategy",
        change.trigger_reason || "Evidence threshold reached",
        JSON.stringify(change.evidence_diff || {}),
        change.confidence || "MEDIUM",
        change.is_demo ?? false,
      ]
    );

    return this.mapChange(row!);
  }

  async listStrategyChanges(limit: number = 20): Promise<StrategyChange[]> {
    const rows = await queryMany<any>(
      `SELECT * FROM strategy_changes ORDER BY recorded_at DESC LIMIT $1`,
      [limit]
    );
    return rows.map((r) => this.mapChange(r));
  }

  async createStrategyChange(change: Partial<StrategyChange>): Promise<StrategyChange> {
    return this.recordStrategyChange(change);
  }

  // ==========================================
  // 11. STRATEGY MEMORY
  // ==========================================

  async recordStrategyMemory(memory: Partial<StrategyMemory>): Promise<StrategyMemory> {
    const row = await queryOne<any>(
      `INSERT INTO strategy_memory (
        strategy_id, action_name, conditions_description, expected_outcome,
        actual_outcome, variance_analysis, learnings, confidence, is_demo, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *`,
      [
        memory.strategy_id || null,
        memory.action_name || "Strategic Initiative",
        memory.conditions_description || "",
        memory.expected_outcome || "",
        memory.actual_outcome || null,
        memory.variance_analysis || null,
        JSON.stringify(memory.learnings || []),
        memory.confidence || "MEDIUM",
        memory.is_demo ?? false,
      ]
    );

    return this.mapMemory(row!);
  }

  async listStrategyMemories(limit: number = 30): Promise<StrategyMemory[]> {
    const rows = await queryMany<any>(
      `SELECT * FROM strategy_memory ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return rows.map((r) => this.mapMemory(r));
  }

  async updateStrategyMemory(id: string, patch: Partial<StrategyMemory>): Promise<StrategyMemory | null> {
    const updates: string[] = ["updated_at = NOW()"];
    const params: any[] = [id];

    if (patch.actual_outcome !== undefined) {
      params.push(patch.actual_outcome);
      updates.push(`actual_outcome = $${params.length}`);
    }
    if (patch.variance_analysis !== undefined) {
      params.push(patch.variance_analysis);
      updates.push(`variance_analysis = $${params.length}`);
    }
    if (patch.learnings !== undefined) {
      params.push(JSON.stringify(patch.learnings));
      updates.push(`learnings = $${params.length}::jsonb`);
    }

    const row = await queryOne<any>(
      `UPDATE strategy_memory SET ${updates.join(", ")} WHERE id = $1 RETURNING *`,
      params
    );
    return row ? this.mapMemory(row) : null;
  }

  async getMemoryById(id: string): Promise<StrategyMemory | null> {
    const row = await queryOne<any>(`SELECT * FROM strategy_memory WHERE id = $1`, [id]);
    return row ? this.mapMemory(row) : null;
  }

  async createMemory(memory: Partial<StrategyMemory>): Promise<StrategyMemory> {
    return this.recordStrategyMemory(memory);
  }

  async updateMemory(id: string, patch: Partial<StrategyMemory>): Promise<StrategyMemory | null> {
    return this.updateStrategyMemory(id, patch);
  }

  // ==========================================
  // MAPPER HELPERS
  // ==========================================

  private mapStrategicState(r: any): StrategicState {
    return {
      id: r.id,
      primary_active_product_id: r.primary_active_product_id,
      primary_active_experiment_id: r.primary_active_experiment_id,
      primary_business_objective: r.primary_business_objective,
      primary_strategy_id: r.primary_strategy_id,
      focus_horizon: r.focus_horizon,
      status: r.status,
      operating_period_date: r.operating_period_date instanceof Date 
        ? r.operating_period_date.toISOString().split("T")[0] 
        : String(r.operating_period_date).split("T")[0],
      state_summary: r.state_summary || {},
      is_demo: Boolean(r.is_demo),
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
    };
  }

  private mapProductLifecycleState(r: any): ProductLifecycleState {
    return {
      id: r.id,
      product_id: r.product_id,
      lifecycle_stage: r.lifecycle_stage,
      discovered_at: new Date(r.discovered_at).toISOString(),
      launched_at: r.launched_at ? new Date(r.launched_at).toISOString() : null,
      distribution_started_at: r.distribution_started_at ? new Date(r.distribution_started_at).toISOString() : null,
      total_exposure_reach: Number(r.total_exposure_reach) || 0,
      active_channels: Array.isArray(r.active_channels) ? r.active_channels : [],
      sample_sizes_summary: r.sample_sizes_summary || {},
      experiments_conducted_count: Number(r.experiments_conducted_count) || 0,
      modifications_history: Array.isArray(r.modifications_history) ? r.modifications_history : [],
      switching_evaluation: r.switching_evaluation,
      switching_rationale: r.switching_rationale || null,
      evidence_maturity_score: Number(r.evidence_maturity_score) || 0,
      is_demo: Boolean(r.is_demo),
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
    };
  }

  private mapObservationWindow(r: any): ObservationWindow {
    return {
      id: r.id,
      product_id: r.product_id,
      channel: r.channel || null,
      window_start: new Date(r.window_start).toISOString(),
      target_review_date: r.target_review_date ? new Date(r.target_review_date).toISOString() : null,
      min_sample_size_required: Number(r.min_sample_size_required) || 50,
      actual_sample_size_collected: Number(r.actual_sample_size_collected) || 0,
      timing_basis: r.timing_basis,
      window_status: r.window_status,
      waiting_reasons: Array.isArray(r.waiting_reasons) ? r.waiting_reasons : [],
      next_decision_preview: r.next_decision_preview || null,
      is_demo: Boolean(r.is_demo),
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
    };
  }

  private mapFunnelStage(r: any): BusinessFunnelStage {
    return {
      id: r.id,
      product_id: r.product_id,
      stage_name: r.stage_name,
      stage_order: Number(r.stage_order) || 1,
      raw_count: Number(r.raw_count) || 0,
      conversion_rate_to_next: r.conversion_rate_to_next !== null ? Number(r.conversion_rate_to_next) : null,
      sample_size_status: r.sample_size_status,
      confidence: r.confidence,
      evaluated_period_days: Number(r.evaluated_period_days) || 14,
      bottleneck_candidate: Boolean(r.bottleneck_candidate),
      hypothesis: r.hypothesis || null,
      is_demo: Boolean(r.is_demo),
      recorded_at: new Date(r.recorded_at).toISOString(),
    };
  }

  private mapBottleneck(r: any): StrategyBottleneck {
    return {
      id: r.id,
      bottleneck_type: r.bottleneck_type,
      product_id: r.product_id,
      severity: r.severity,
      magnitude_score: Number(r.magnitude_score) || 0,
      business_impact_score: Number(r.business_impact_score) || 0,
      evidence_strength: r.evidence_strength,
      sample_size: Number(r.sample_size) || 0,
      reversibility: r.reversibility,
      resource_requirement: r.resource_requirement,
      is_primary: Boolean(r.is_primary),
      evidence_data: r.evidence_data || {},
      description: r.description,
      recommended_focus: r.recommended_focus || null,
      is_resolved: Boolean(r.is_resolved),
      is_demo: Boolean(r.is_demo),
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
    };
  }

  private mapPattern(r: any): StrategyPattern {
    return {
      id: r.id,
      pattern_name: r.pattern_name,
      category: r.category,
      description: r.description,
      supporting_observations: Array.isArray(r.supporting_observations) ? r.supporting_observations : [],
      sample_size: Number(r.sample_size) || 0,
      time_period_days: Number(r.time_period_days) || 30,
      causality_type: r.causality_type,
      confidence: r.confidence,
      limitations: r.limitations || null,
      is_active: Boolean(r.is_active),
      is_demo: Boolean(r.is_demo),
      created_at: new Date(r.created_at).toISOString(),
    };
  }

  private mapRecommendation(r: any): StrategyRecommendation {
    return {
      id: r.id,
      objective: r.objective,
      problem_addressed: r.problem_addressed,
      proposed_action: r.proposed_action,
      strategy_type: r.strategy_type,
      horizon: r.horizon,
      evidence_provenance: r.evidence_provenance,
      evidence_summary: r.evidence_summary || {},
      confidence: r.confidence,
      expected_outcome: r.expected_outcome,
      assumptions: Array.isArray(r.assumptions) ? r.assumptions : [],
      resource_requirements: r.resource_requirements || {},
      risks: Array.isArray(r.risks) ? r.risks : [],
      reversibility: r.reversibility,
      observation_requirements: r.observation_requirements || {},
      success_criteria: r.success_criteria || null,
      failure_criteria: r.failure_criteria || null,
      rank_order: Number(r.rank_order) || 1,
      is_primary: Boolean(r.is_primary),
      status: r.status,
      is_demo: Boolean(r.is_demo),
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
    };
  }

  private mapAction(r: any): StrategyAction {
    return {
      id: r.id,
      strategy_id: r.strategy_id,
      priority_order: Number(r.priority_order) || 1,
      action_name: r.action_name,
      description: r.description,
      target_module: r.target_module,
      target_action: r.target_action,
      execution_type: r.execution_type,
      status: r.status,
      estimated_cost_inr: Number(r.estimated_cost_inr) || 0,
      payload: r.payload || {},
      linked_job_id: r.linked_job_id || null,
      is_demo: Boolean(r.is_demo),
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
    };
  }

  private mapDailyBrief(r: any): DailyStrategicBrief {
    return {
      id: r.id,
      brief_date: r.brief_date instanceof Date 
        ? r.brief_date.toISOString().split("T")[0] 
        : String(r.brief_date).split("T")[0],
      current_business_state: r.current_business_state || {},
      what_changed: r.what_changed,
      what_data_says: r.what_data_says,
      what_we_know: Array.isArray(r.what_we_know) ? r.what_we_know : [],
      what_we_do_not_know: Array.isArray(r.what_we_do_not_know) ? r.what_we_do_not_know : [],
      important_patterns: Array.isArray(r.important_patterns) ? r.important_patterns : [],
      current_bottleneck: r.current_bottleneck || {},
      primary_strategy: r.primary_strategy || {},
      today_priority: r.today_priority,
      next_actions: Array.isArray(r.next_actions) ? r.next_actions : [],
      what_we_are_waiting_for: r.what_we_are_waiting_for || null,
      what_would_change_strategy: r.what_would_change_strategy,
      risks: Array.isArray(r.risks) ? r.risks : [],
      confidence: r.confidence,
      evidence_provenance: Array.isArray(r.evidence_provenance) ? r.evidence_provenance : [],
      is_demo: Boolean(r.is_demo),
      created_at: new Date(r.created_at).toISOString(),
    };
  }

  private mapChange(r: any): StrategyChange {
    return {
      id: r.id,
      old_strategy_id: r.old_strategy_id,
      new_strategy_id: r.new_strategy_id,
      old_strategy_name: r.old_strategy_name || null,
      new_strategy_name: r.new_strategy_name,
      trigger_reason: r.trigger_reason,
      evidence_diff: r.evidence_diff || {},
      confidence: r.confidence,
      is_demo: Boolean(r.is_demo),
      recorded_at: new Date(r.recorded_at).toISOString(),
    };
  }

  private mapMemory(r: any): StrategyMemory {
    return {
      id: r.id,
      strategy_id: r.strategy_id,
      action_name: r.action_name,
      conditions_description: r.conditions_description,
      expected_outcome: r.expected_outcome,
      actual_outcome: r.actual_outcome || null,
      variance_analysis: r.variance_analysis || null,
      learnings: Array.isArray(r.learnings) ? r.learnings : [],
      confidence: r.confidence,
      is_demo: Boolean(r.is_demo),
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
    };
  }
}

export const strategyRepo = new StrategyRepository();
