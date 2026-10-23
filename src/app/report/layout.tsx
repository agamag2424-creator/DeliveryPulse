import { ReportSaveIndicator } from "@/components/reports/ReportSaveIndicator";

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ReportSaveIndicator />
      {children}
    </>
  );
}
