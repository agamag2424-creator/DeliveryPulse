function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  const fs = await import("fs");
  const path = await import("path");

  const onboarding = fs.readFileSync(
    path.join(process.cwd(), "src/components/onboarding/OnboardingFlow.tsx"),
    "utf8",
  );
  assert(onboarding.includes("OnboardingFlow"), "OnboardingFlow component exists");
  assert(!onboarding.includes("Skip for now"), "zero-project onboarding is not skippable");
  assert(onboarding.includes("Generate your first report"), "guide ends on first-report CTA");

  const schema = fs.readFileSync(path.join(process.cwd(), "prisma/schema.prisma"), "utf8");
  assert(schema.includes("onboardingManualChosen"), "Organization.onboardingManualChosen exists");

  const checklist = fs.readFileSync(
    path.join(process.cwd(), "src/components/onboarding/OnboardingChecklist.tsx"),
    "utf8",
  );
  assert(checklist.includes("OnboardingChecklist"), "checklist component exists");

  console.log("✓ onboarding structure verified (Epic 6: blocking guide + checklist)");
}

main();
