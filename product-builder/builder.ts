import crypto from "crypto";
import type {
  Product,
  ProductBuildPlan,
  ProductBuildTask,
  ProductArtifact,
  ArtifactType,
} from "@/types/product";
import type {
  ProductSpecification,
  BuildExecutionOptions,
  BuildExecutionResult,
} from "./types";
import { DeterministicTemplateProvider, type AIProvider } from "./ai-provider";
import { evaluateQualityGates } from "./quality";
import { hashSpecification, hashBuildPlan } from "./versioning";
import {
  createProductBuildJob,
  updateProductBuildJob,
  createProductBuildEvent,
  createProductArtifact,
  createProductVersion,
  updateProduct,
} from "@/database/repositories/product-repo";
import { logAudit } from "@/database/repositories/audit-repo";

/**
 * Maps task type to the appropriate Product ArtifactType.
 */
function getArtifactTypeForTask(taskType: ProductBuildTask["type"]): ArtifactType {
  switch (taskType) {
    case "SCHEMA":
    case "REPOSITORY":
    case "API":
    case "UI":
      return "SOURCE_CODE";
    case "DOCUMENTATION":
      return "README";
    case "TEST":
      return "TEST_SUITE";
    case "PACKAGING":
      return "CONFIGURATION";
    default:
      return "OTHER";
  }
}

/**
 * Executes an autonomous product build pipeline, generating real artifacts,
 * running quality gates, and persisting version records.
 */
export async function executeProductBuild(
  options: BuildExecutionOptions,
  aiProvider: AIProvider = new DeterministicTemplateProvider()
): Promise<BuildExecutionResult> {
  const { product, specification, buildPlan } = options;
  const productId = product.id;

  // 1. Create or resolve Build Job
  let jobId = options.jobId;
  if (!jobId) {
    try {
      const job = await createProductBuildJob({
        product_id: productId,
        status: "IN_PROGRESS",
        current_step: "PLANNING",
        total_steps: buildPlan.tasks.length,
        completed_steps: 0,
        started_at: new Date().toISOString(),
      });
      jobId = job?.id || crypto.randomUUID();
    } catch {
      jobId = crypto.randomUUID();
    }
  }

  // Update product to BUILDING / PLANNING
  await updateProduct(productId, {
    status: "BUILDING",
    build_status: "PLANNING",
  }).catch(() => null);

  const generatedArtifacts: Array<{
    artifact_type: ArtifactType;
    file_path: string;
    content: string;
    checksum: string;
  }> = [];

  // Add Spec & Build Plan as foundational artifacts
  const specContent = JSON.stringify(specification, null, 2);
  const planContent = JSON.stringify(buildPlan, null, 2);

  generatedArtifacts.push({
    artifact_type: "SPECIFICATION",
    file_path: `specifications/${specification.identity.slug}.json`,
    content: specContent,
    checksum: hashSpecification(specification),
  });

  generatedArtifacts.push({
    artifact_type: "BUILD_PLAN",
    file_path: `build-plans/${specification.identity.slug}.json`,
    content: planContent,
    checksum: hashBuildPlan(buildPlan),
  });

  // 2. Iterate through Build Tasks
  let completedCount = 0;
  let hasFailedTask = false;

  for (const task of buildPlan.tasks) {
    const stepStart = Date.now();

    // Map step to build status
    let currentBuildStatus: "GENERATING" | "TESTING" | "PACKAGING" = "GENERATING";
    if (task.type === "TEST") currentBuildStatus = "TESTING";
    if (task.type === "PACKAGING") currentBuildStatus = "PACKAGING";

    await updateProduct(productId, { build_status: currentBuildStatus }).catch(() => null);
    await updateProductBuildJob(jobId, {
      current_step: task.name,
      completed_steps: completedCount,
    }).catch(() => null);

    try {
      const content = await aiProvider.generateTaskAsset({
        spec: specification,
        task,
      });

      task.generated_code = content;
      task.status = "COMPLETED";

      const checksum = crypto.createHash("sha256").update(content).digest("hex");
      const artifactType = getArtifactTypeForTask(task.type);

      generatedArtifacts.push({
        artifact_type: artifactType,
        file_path: task.target_file,
        content,
        checksum,
      });

      // Persist artifact in DB
      await createProductArtifact({
        product_id: productId,
        artifact_type: artifactType,
        file_path: task.target_file,
        content,
        checksum,
      }).catch(() => null);

      completedCount++;
      const durationMs = Math.max(1, Date.now() - stepStart);

      await createProductBuildEvent({
        job_id: jobId,
        product_id: productId,
        step_name: task.name,
        status: "SUCCESS",
        details: { file_path: task.target_file, bytes: Buffer.byteLength(content, "utf8") },
        duration_ms: durationMs,
      }).catch(() => null);
    } catch (err: any) {
      task.status = "FAILED";
      task.error = err?.message || "Task generation error";
      hasFailedTask = true;

      await createProductBuildEvent({
        job_id: jobId,
        product_id: productId,
        step_name: task.name,
        status: "FAILED",
        details: { error: task.error },
        duration_ms: Date.now() - stepStart,
      }).catch(() => null);
      break;
    }
  }

  // 3. Evaluate 8 Quality Gates
  const qualityReport = evaluateQualityGates(specification, buildPlan, generatedArtifacts);

  // 4. Finalize Build State
  const buildSucceeded = !hasFailedTask && qualityReport.overall_passed;

  if (buildSucceeded) {
    // Create version snapshot
    const versionStr = specification.identity.version || "1.0.0";
    await createProductVersion({
      product_id: productId,
      version: versionStr,
      spec_hash: hashSpecification(specification),
      build_plan_hash: hashBuildPlan(buildPlan),
      specification: specification as any,
      build_plan: buildPlan as any,
      changelog: `Initial autonomous build of ${specification.identity.name} v${versionStr}`,
    }).catch(() => null);

    // Update product to READY_FOR_REVIEW and build_status READY
    await updateProduct(productId, {
      status: "READY_FOR_REVIEW",
      build_status: "READY",
      version: versionStr,
      build_plan: buildPlan as any,
      actual_cost_inr: 0,
    }).catch(() => null);

    await updateProductBuildJob(jobId, {
      status: "COMPLETED",
      completed_steps: completedCount,
      completed_at: new Date().toISOString(),
    }).catch(() => null);

    await logAudit({
      entity_type: "product",
      entity_id: productId,
      action: "PRODUCT_BUILD_COMPLETED",
      details: {
        job_id: jobId,
        artifacts_count: generatedArtifacts.length,
        quality_score: qualityReport.overall_score,
      },
    }).catch(() => null);

    return {
      success: true,
      job_id: jobId,
      status: "READY",
      artifacts_created: generatedArtifacts.length,
      quality_report: qualityReport,
    };
  } else {
    const errorMsg = qualityReport.blockers.join("; ") || "One or more build tasks failed.";

    await updateProduct(productId, {
      status: "FAILED",
      build_status: "FAILED",
    }).catch(() => null);

    await updateProductBuildJob(jobId, {
      status: "FAILED",
      error_message: errorMsg,
      completed_at: new Date().toISOString(),
    }).catch(() => null);

    return {
      success: false,
      job_id: jobId,
      status: "FAILED",
      artifacts_created: generatedArtifacts.length,
      quality_report: qualityReport,
      error: errorMsg,
    };
  }
}
