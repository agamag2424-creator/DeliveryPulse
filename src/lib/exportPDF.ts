const EXPORT_FRAME_WIDTH = 1366;
const EXPORT_FRAME_HEIGHT = 966; // Match A4 landscape ratio to avoid vertical crop.

function inlineComputedStyles(sourceEl: HTMLElement, cloneEl: HTMLElement) {
  const computed = window.getComputedStyle(sourceEl);
  const styleText = Array.from(computed)
    .map((prop) => `${prop}: ${computed.getPropertyValue(prop)};`)
    .join(" ");
  cloneEl.setAttribute("style", styleText);
  cloneEl.removeAttribute("class");

  const sourceChildren = Array.from(sourceEl.children) as HTMLElement[];
  const cloneChildren = Array.from(cloneEl.children) as HTMLElement[];
  const count = Math.min(sourceChildren.length, cloneChildren.length);

  for (let i = 0; i < count; i += 1) {
    inlineComputedStyles(sourceChildren[i], cloneChildren[i]);
  }
}

export async function exportReportPDF(params: {
  projectName: string;
  reportingPeriodFrom: string;
  reportingPeriodTo: string;
}) {
  const slideNodes = Array.from(document.querySelectorAll<HTMLElement>("[data-export-slide='true']"));
  if (!slideNodes.length) {
    throw new Error("No slides found to export.");
  }

  const safeProjectName = params.projectName.replace(/[^a-z0-9-_]+/gi, "_");
  const safePeriod = `${params.reportingPeriodFrom}_to_${params.reportingPeriodTo}`.replace(/[^a-z0-9-_]+/gi, "_");
  const fileName = `DeliveryPulse_${safeProjectName}_${safePeriod}.pdf`;

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const sandbox = document.createElement("div");
  sandbox.style.position = "fixed";
  sandbox.style.left = "-10000px";
  sandbox.style.top = "0";
  sandbox.style.width = `${EXPORT_FRAME_WIDTH}px`;
  sandbox.style.height = `${EXPORT_FRAME_HEIGHT}px`;
  sandbox.style.zIndex = "-1";
  document.body.appendChild(sandbox);

  try {
    for (let index = 0; index < slideNodes.length; index += 1) {
      const node = slideNodes[index];
      console.log(`[PDF] Slide ${index + 1} element exists:`, Boolean(node));
      console.log(`[PDF] Slide ${index + 1} source height:`, node?.scrollHeight ?? 0);
      if (!node) {
        throw new Error(`Slide ${index + 1} not found for export.`);
      }
      if ((node?.scrollHeight ?? 0) <= 0) {
        throw new Error(`Slide ${index + 1} has invalid height for export.`);
      }
      const clone = node.cloneNode(true) as HTMLElement;
      inlineComputedStyles(node, clone);
      clone.querySelectorAll<HTMLElement>("[data-export-hide='true']").forEach((el) => el.remove());

      const sourceWidth = Math.max(node.scrollWidth, 1);
      const sourceHeight = Math.max(node.scrollHeight, 1);
      const fitScale = Math.min(EXPORT_FRAME_WIDTH / sourceWidth, EXPORT_FRAME_HEIGHT / sourceHeight, 1);
      const scale = fitScale * 0.96;
      const scaledWidth = sourceWidth * scale;
      const scaledHeight = sourceHeight * scale;

      const frame = document.createElement("div");
      frame.style.width = `${EXPORT_FRAME_WIDTH}px`;
      frame.style.height = `${EXPORT_FRAME_HEIGHT}px`;
      frame.style.overflow = "hidden";
      frame.style.position = "relative";
      frame.style.background = "#0A0F1C";

      clone.style.margin = "0";
      clone.style.padding = "0";
      clone.style.position = "absolute";
      clone.style.left = `${Math.max(0, (EXPORT_FRAME_WIDTH - scaledWidth) / 2)}px`;
      clone.style.top = `${Math.max(0, (EXPORT_FRAME_HEIGHT - scaledHeight) / 2)}px`;
      clone.style.width = `${sourceWidth}px`;
      clone.style.height = `${sourceHeight}px`;
      clone.style.transformOrigin = "top left";
      clone.style.transform = `scale(${scale})`;
      frame.appendChild(clone);

      if (index === 4) {
        const stamp = document.createElement("div");
        stamp.textContent = "CONFIDENTIAL";
        stamp.style.position = "absolute";
        stamp.style.top = "10px";
        stamp.style.left = "50%";
        stamp.style.transform = "translateX(-50%)";
        stamp.style.color = "#EF4444";
        stamp.style.fontWeight = "800";
        stamp.style.fontSize = "14px";
        stamp.style.letterSpacing = "0.18em";
        stamp.style.zIndex = "20";
        frame.appendChild(stamp);
      }

      sandbox.innerHTML = "";
      sandbox.appendChild(frame);

      const canvas = await html2canvas(frame, {
        scale: 2,
        backgroundColor: "#0A0F1C",
        useCORS: true,
        foreignObjectRendering: false,
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll<SVGElement>("svg").forEach((svg) => {
            const rect = svg.getBoundingClientRect();
            if (!svg.getAttribute("width") && rect.width > 0) {
              svg.setAttribute("width", `${Math.round(rect.width)}`);
            }
            if (!svg.getAttribute("height") && rect.height > 0) {
              svg.setAttribute("height", `${Math.round(rect.height)}`);
            }
          });
        },
      });
      const imageData = canvas.toDataURL("image/jpeg", 0.98);

      if (index > 0) {
        pdf.addPage("a4", "landscape");
      }
      pdf.addImage(imageData, "JPEG", 0, 0, pageWidth, pageHeight);
    }
  } finally {
    sandbox.remove();
  }

  pdf.save(fileName);
}
