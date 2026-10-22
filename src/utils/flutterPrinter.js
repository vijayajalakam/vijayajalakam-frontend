/**
 * Flutter WebView bridge helpers for native printer scan & receipt printing.
 */

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export const isFlutterWebView = () =>
  !!(window.flutter_inappwebview?.callHandler);

export const isPdfPrinter = (printerId = "", printerName = "") => {
  const id = printerId.toLowerCase();
  const name = printerName.toLowerCase();
  return (
    id === "save-as-pdf" ||
    id === "pdf" ||
    name.includes("save as pdf") ||
    name.includes("microsoft print to pdf") ||
    name.includes("print to pdf")
  );
};

export const sanitizePdfFileName = (fileName = "receipt.pdf") => {
  const base = (fileName || "receipt.pdf")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .trim();
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
};

export const buildReceiptPrintHtml = (containerElement) => {
  if (!containerElement) return "";

  const styleTags = Array.from(document.querySelectorAll("style"))
    .map((s) => s.innerHTML)
    .join("\n");
  const linkTags = Array.from(
    document.querySelectorAll("link[rel='stylesheet']"),
  )
    .map((l) => l.outerHTML)
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt</title>
  ${linkTags}
  <style>${styleTags}</style>
  <style>
    @page { margin: 0; size: auto; }
    body { margin: 0; padding: 0; background: white; }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  </style>
</head>
<body>${containerElement.innerHTML}</body>
</html>`;
};

/** Find the inner receipt element to capture. */
export const getReceiptCaptureTarget = (containerElement) => {
  if (!containerElement) return null;
  return (
    containerElement.querySelector("#invoice-print-layout") ||
    containerElement.querySelector("#invoice-print-layout-container") ||
    containerElement.firstElementChild ||
    containerElement
  );
};

const unhideAncestors = (target) => {
  const restore = [];
  let node = target;
  while (node && node !== document.body) {
    const cs = window.getComputedStyle(node);
    const isHidden =
      cs.visibility === "hidden" ||
      cs.display === "none" ||
      parseFloat(cs.height) === 0 ||
      cs.opacity === "0";
    if (isHidden) {
      restore.push({
        el: node,
        visibility: node.style.visibility,
        height: node.style.height,
        display: node.style.display,
        overflow: node.style.overflow,
        opacity: node.style.opacity,
      });
      node.style.visibility = "visible";
      node.style.display = "block";
      node.style.height = "auto";
      node.style.overflow = "visible";
      node.style.opacity = "1";
    }
    node = node.parentElement;
  }
  return restore;
};

const restoreStyles = (restore) => {
  for (const item of restore) {
    item.el.style.visibility = item.visibility;
    item.el.style.height = item.height;
    item.el.style.display = item.display;
    item.el.style.overflow = item.overflow;
    item.el.style.opacity = item.opacity;
  }
};

const renderToCanvas = async (element) => {
  const options = {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    scrollX: 0,
    scrollY: 0,
  };

  try {
    const canvas = await html2canvas(element, options);
    if (canvas.width > 0 && canvas.height > 0) return canvas;
  } catch (err) {
    console.warn("html2canvas direct capture failed:", err);
  }

  const clone = element.cloneNode(true);
  clone.style.position = "fixed";
  clone.style.left = "0";
  clone.style.top = "0";
  clone.style.zIndex = "999999";
  clone.style.background = "#ffffff";
  clone.style.visibility = "visible";
  clone.style.opacity = "1";
  clone.style.pointerEvents = "none";
  document.body.appendChild(clone);

  try {
    await new Promise((r) => setTimeout(r, 200));
    const canvas = await html2canvas(clone, options);
    if (canvas.width > 0 && canvas.height > 0) return canvas;
  } finally {
    document.body.removeChild(clone);
  }

  return null;
};

/**
 * Capture receipt DOM as PNG base64.
 */
export const captureReceiptImage = async (containerElement) => {
  const target = getReceiptCaptureTarget(containerElement);
  if (!target) return null;

  const restore = unhideAncestors(target);
  await new Promise((resolve) => setTimeout(resolve, 350));

  try {
    const canvas = await renderToCanvas(target);
    if (!canvas) return null;
    const dataUrl = canvas.toDataURL("image/png");
    return dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  } catch (err) {
    console.error("captureReceiptImage failed:", err);
    return null;
  } finally {
    restoreStyles(restore);
  }
};

/** Build PDF as base64 string using jsPDF (runs inside WebView). */
export const buildReceiptPdfBase64 = async (containerElement) => {
  const imageBase64 = await captureReceiptImage(containerElement);
  if (!imageBase64) return null;

  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = `data:image/png;base64,${imageBase64}`;
  });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: [img.width, img.height],
    compress: true,
  });

  pdf.addImage(img, "PNG", 0, 0, img.width, img.height);
  const output = pdf.output("datauristring");
  return output.includes(",") ? output.split(",")[1] : output;
};

/** Save receipt PDF via Flutter native file download handler. */
export const saveReceiptAsPdfFlutter = async (
  containerElement,
  fileName = "receipt.pdf",
) => {
  if (!containerElement || !isFlutterWebView()) return false;

  try {
    const pdfBase64 = await buildReceiptPdfBase64(containerElement);
    if (!pdfBase64) {
      console.error("saveReceiptAsPdfFlutter: PDF generation failed");
      return false;
    }

    const safeName = sanitizePdfFileName(fileName);
    const result = await window.flutter_inappwebview.callHandler(
      "flutterDownload",
      {
        data: pdfBase64,
        fileName: safeName,
        mimeType: "application/pdf",
      },
    );

    return result === true;
  } catch (err) {
    console.error("saveReceiptAsPdfFlutter failed:", err);
    return false;
  }
};

export const scanPrinters = async (connectionTypes = {}) => {
  if (!isFlutterWebView()) return null;

  try {
    const result = await window.flutter_inappwebview.callHandler(
      "flutterScanPrinters",
      {
        usb: connectionTypes.usb ?? true,
        network: connectionTypes.network ?? true,
        bluetooth: connectionTypes.bluetooth ?? true,
      },
    );
    return Array.isArray(result) ? result : [];
  } catch (err) {
    console.error("flutterScanPrinters failed:", err);
    return [];
  }
};

export const saveReceiptAsPdfBrowser = async (
  containerElement,
  fileName = "receipt.pdf",
) => {
  if (!containerElement) return false;

  try {
    const pdfBase64 = await buildReceiptPdfBase64(containerElement);
    if (!pdfBase64) return false;

    const safeName = sanitizePdfFileName(fileName);
    const byteChars = atob(pdfBase64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([new Uint8Array(byteNumbers)], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = safeName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error("saveReceiptAsPdfBrowser failed:", err);
    return false;
  }
};

export const printReceiptViaFlutter = async ({
  containerId,
  containerElement,
  printerId = "",
  printerName = "",
  paperSize = "80mm",
  copies = 1,
  fileName = "",
}) => {
  if (!isFlutterWebView()) return false;

  const container =
    containerElement ||
    (containerId ? document.getElementById(containerId) : null);
  if (!container) {
    console.error("printReceiptViaFlutter: container not found");
    return false;
  }

  const html = buildReceiptPrintHtml(container);
  const imageBase64 = await captureReceiptImage(container);

  if (!imageBase64 && !html) {
    console.error("printReceiptViaFlutter: nothing to print");
    return false;
  }

  try {
    const result = await window.flutter_inappwebview.callHandler(
      "flutterPrintReceipt",
      {
        html,
        imageBase64: imageBase64 || "",
        printerId,
        printerName,
        paperSize,
        copies,
        fileName,
      },
    );

    if (result && typeof result === "object") {
      return result.success === true;
    }
    return result === true;
  } catch (err) {
    console.error("flutterPrintReceipt failed:", err);
    return false;
  }
};

/** Browser-only iframe print fallback. */
export const printReceiptViaBrowser = (containerElement) => {
  if (!containerElement) return;

  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const html = buildReceiptPrintHtml(containerElement);

  iframe.contentWindow.document.open();
  iframe.contentWindow.document.write(html);
  iframe.contentWindow.document.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 500);
};

export const printReceipt = async ({
  containerId,
  containerElement,
  printerId = "",
  printerName = "",
  paperSize = "80mm",
  copies = 1,
  fileName = "receipt.pdf",
}) => {
  const container =
    containerElement ||
    (containerId ? document.getElementById(containerId) : null);
  if (!container) return false;

  // Save as PDF — generate in JS, save via flutterDownload (most reliable).
  if (isPdfPrinter(printerId, printerName)) {
    if (isFlutterWebView()) {
      return saveReceiptAsPdfFlutter(container, fileName);
    }
    return saveReceiptAsPdfBrowser(container, fileName);
  }

  const printed = await printReceiptViaFlutter({
    containerElement: container,
    printerId,
    printerName,
    paperSize,
    copies,
    fileName,
  });

  if (!printed && !isFlutterWebView()) {
    printReceiptViaBrowser(container);
    return true;
  }

  return printed;
};
