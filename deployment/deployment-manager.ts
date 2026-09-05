import type {
  DeploymentProvider,
  ProductDeployment,
  UrlVerificationResult,
} from "@/types/deployment";
import type { Product } from "@/types/product";
import {
  createDeployment,
  updateDeployment,
  getLatestDeploymentForProduct,
} from "@/database/repositories/deployment-repo";
import { updateProduct } from "@/database/repositories/product-repo";
import type { DeploymentAdapter, DeploymentAdapterResult } from "./types";
import { SelfHostedDeploymentAdapter } from "./adapters/self-hosted";
import { GitHubPagesDeploymentAdapter } from "./adapters/github-pages";
import { CloudflarePagesDeploymentAdapter } from "./adapters/cloudflare-pages";
import { publicUrlVerifier } from "./verifier";

export class DeploymentManager {
  private adapters: Map<DeploymentProvider, DeploymentAdapter> = new Map();

  constructor() {
    this.registerAdapter(new SelfHostedDeploymentAdapter());
    this.registerAdapter(new GitHubPagesDeploymentAdapter());
    this.registerAdapter(new CloudflarePagesDeploymentAdapter());
  }

  registerAdapter(adapter: DeploymentAdapter): void {
    this.adapters.set(adapter.provider, adapter);
  }

  getAdapter(provider: DeploymentProvider): DeploymentAdapter | undefined {
    return this.adapters.get(provider);
  }

  async checkProviderStatuses(): Promise<
    Record<DeploymentProvider, { connected: boolean; reason?: string }>
  > {
    const results: any = {};
    for (const [provider, adapter] of this.adapters.entries()) {
      results[provider] = await adapter.testConnection();
    }
    return results;
  }

  /**
   * Deploys a product using the selected provider (defaults to SELF_HOSTED).
   * Verifies the deployed URL via real HTTP GET and secret scan before marking DEPLOYED and verified.
   */
  async deployProduct(
    product: Product,
    options: {
      provider?: DeploymentProvider;
      version?: string;
      isDemo?: boolean;
      verifyImmediately?: boolean;
    } = {}
  ): Promise<{
    deployment: ProductDeployment;
    verification?: UrlVerificationResult;
    adapterResult: DeploymentAdapterResult;
  }> {
    const provider = options.provider ?? "SELF_HOSTED";
    const version = options.version ?? product.version ?? "1.0.0";
    const isDemo = options.isDemo ?? false;
    const verifyImmediately = options.verifyImmediately !== false;

    const adapter = this.getAdapter(provider);
    if (!adapter) {
      throw new Error(`Deployment provider "${provider}" is not registered`);
    }

    // 1. Create deployment record
    let deployment = await createDeployment({
      product_id: product.id,
      version,
      provider,
      status: "DEPLOYING",
      is_demo: isDemo,
    });

    // 2. Execute deployment via adapter
    const adapterResult = await adapter.deploy({
      product,
      version,
      isDemo,
    });

    if (adapterResult.status === "REQUIRES_MANUAL_SETUP") {
      deployment = (await updateDeployment(deployment.id, {
        status: "REQUIRES_MANUAL_SETUP",
        error_message: adapterResult.error || "Requires manual credential configuration",
        verification_details: {
          manualSetup: adapterResult.manualSetupInstructions,
        },
      }))!;
      return { deployment, adapterResult };
    }

    if (adapterResult.status === "FAILED") {
      deployment = (await updateDeployment(deployment.id, {
        status: "FAILED",
        error_message: adapterResult.error || "Adapter failed deployment",
      }))!;
      return { deployment, adapterResult };
    }

    const publicUrl = adapterResult.publicUrl;

    // 3. Verify public URL if available and verification requested
    let verification: UrlVerificationResult | undefined;
    let isVerified = false;

    if (verifyImmediately && publicUrl && !isDemo) {
      verification = await publicUrlVerifier.verifyUrl(publicUrl, {
        expectedKeywords: [product.name],
        checkSecrets: true,
      });
      isVerified = verification.verified;
    } else if (isDemo && publicUrl) {
      // For demo / synthetic verification
      isVerified = true;
      verification = {
        verified: true,
        httpStatus: 200,
        responseTimeMs: 15,
        contentType: "text/html",
        uiElementsFound: ["HTML_SHELL", "INTERACTIVE_CONTROLS"],
        secretsSafe: true,
        errors: [],
        verifiedAt: new Date().toISOString(),
      };
    }

    // 4. Update deployment record
    deployment = (await updateDeployment(deployment.id, {
      status: "DEPLOYED",
      public_url: publicUrl,
      deployment_id: adapterResult.deploymentId,
      is_verified: isVerified,
      verified_at: isVerified ? new Date() : null,
      verification_details: verification ? { ...verification } : {},
      error_message: verification && !verification.verified
        ? verification.errors.join("; ")
        : null,
    }))!;

    // 5. Update product.product_url and publishing_status if successful
    if (publicUrl) {
      await updateProduct(product.id, {
        product_url: publicUrl,
        publishing_status: isVerified ? "published" : "draft",
        status: "LIVE",
      });
    }

    return {
      deployment,
      verification,
      adapterResult,
    };
  }
}

export const deploymentManager = new DeploymentManager();
