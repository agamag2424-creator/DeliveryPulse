import { Suspense } from "react";

import { ProjectInputBanner } from "@/components/projects/ProjectInputBanner";
import { ProjectInputPrefill } from "@/components/projects/ProjectInputPrefill";

export default function InputLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ProjectInputPrefill />
      <Suspense fallback={null}>
        <ProjectInputBanner />
      </Suspense>
      {children}
    </>
  );
}
