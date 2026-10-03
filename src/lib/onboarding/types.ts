export const ONBOARDING_ITEM_IDS = ["project", "source", "report", "invite"] as const;
export type OnboardingItemId = (typeof ONBOARDING_ITEM_IDS)[number];

export type OnboardingItem = {
  id: OnboardingItemId;
  label: string;
  detail: string;
  done: boolean;
  href?: string;
};

export type OnboardingStatus = {
  ahaComplete: boolean;
  blocking: boolean;
  showChecklist: boolean;
  firstProjectId: string | null;
  canInvite: boolean;
  items: OnboardingItem[];
};
