import {
  upsertCustomerOnboarding,
  getCustomerOnboarding,
} from "@/database/repositories/customer-success-repo";
import type { CustomerOnboarding } from "@/types/customer-success";
import type { OnboardingStep } from "./types";

export function getDefaultOnboardingSteps(productName?: string): OnboardingStep[] {
  const prod = productName || "Product";
  return [
    {
      id: "step_welcome",
      title: `Access ${prod} Workspace`,
      description: "Log in or open the delivered product package to verify access.",
      completed: false,
    },
    {
      id: "step_setup",
      title: "Complete Initial Configuration",
      description: "Input essential preferences or review the getting started guide.",
      completed: false,
    },
    {
      id: "step_first_action",
      title: "Perform First Key Action",
      description: "Use the primary feature to produce your initial output.",
      completed: false,
    },
    {
      id: "step_verify_outcome",
      title: "Verify Outcome & Value",
      description: "Confirm that the result satisfies your original objective.",
      completed: false,
    },
  ];
}

export async function initializeCustomerOnboarding(
  customerId: string,
  productId: string,
  customSteps?: OnboardingStep[],
  isDemo?: boolean
): Promise<CustomerOnboarding> {
  const existing = await getCustomerOnboarding(customerId, productId);
  if (existing) return existing;

  const steps = customSteps || getDefaultOnboardingSteps();
  return upsertCustomerOnboarding({
    customer_id: customerId,
    product_id: productId,
    steps: steps,
    current_step_index: 0,
    is_completed: false,
    is_demo: isDemo,
  });
}

export async function advanceOnboardingStep(
  customerId: string,
  productId: string,
  stepId: string
): Promise<CustomerOnboarding | null> {
  const onboarding = await getCustomerOnboarding(customerId, productId);
  if (!onboarding) return null;

  const steps = [...(onboarding.steps as OnboardingStep[])];
  const stepIndex = steps.findIndex((s) => s.id === stepId);

  if (stepIndex !== -1 && steps[stepIndex]) {
    steps[stepIndex]!.completed = true;
    steps[stepIndex]!.completed_at = new Date().toISOString();
  }

  const allCompleted = steps.every((s) => s.completed);
  const nextIncompleteIndex = steps.findIndex((s) => !s.completed);
  const currentStepIndex = nextIncompleteIndex === -1 ? steps.length : nextIncompleteIndex;

  return upsertCustomerOnboarding({
    customer_id: customerId,
    product_id: productId,
    steps: steps,
    current_step_index: currentStepIndex,
    is_completed: allCompleted,
    completed_at: allCompleted ? new Date().toISOString() : null,
  });
}

export function getNextRecommendedAction(onboarding: CustomerOnboarding | null): {
  step: OnboardingStep | null;
  message: string;
} {
  if (!onboarding || !onboarding.steps || onboarding.steps.length === 0) {
    return {
      step: null,
      message: "No active onboarding steps found.",
    };
  }

  const steps = onboarding.steps as OnboardingStep[];
  const nextStep = steps.find((s) => !s.completed);

  if (!nextStep) {
    return {
      step: null,
      message: "Onboarding completed! Customer is fully activated.",
    };
  }

  return {
    step: nextStep,
    message: `Next recommended action: ${nextStep.title}`,
  };
}
