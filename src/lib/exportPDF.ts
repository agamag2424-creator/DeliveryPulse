// PHASE 1 FROZEN — DO NOT MODIFY WITHOUT EXPLICIT WRITTEN INSTRUCTION FROM AGAM
// This file is part of the Phase 1 foundation and contains deliberate design decisions.
// Phase 2 extends this file only where absolutely necessary.
// Permitted Phase 2 additions: auth session check at route level, saveReport() call after generation.
// Everything else: unchanged.

export function exportToPDF(projectName: string, period: string): void {
  const originalTitle = document.title;
  document.title = `DeliveryPulse_${projectName}_${period}`;

  window.print();

  setTimeout(() => {
    document.title = originalTitle;
  }, 1000);
}
