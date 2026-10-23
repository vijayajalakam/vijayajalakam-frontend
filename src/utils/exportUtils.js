import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import PptxGenJS from "pptxgenjs";

/**
 * Helper to get safely exportable columns
 */
const getValidColumns = (columns) => {
  return columns.filter((col) => {
    if (typeof col.header !== "string") return false;
    const h = col.header.toLowerCase() || "";
    return h !== "action" && h !== "actions";
  });
};

/**
 * Utility to export data as CSV
 */
export const exportToCSV = (data, columns, filename = "report.csv") => {
  try {
    if (!data || data.length === 0) return;

    const validColumns = getValidColumns(columns);
    const headers = validColumns.map((col) => col.header).join(",");
    const rows = data.map((row) => {
      return validColumns
        .map((col) => {
          let value = "";
          if (col.exportValue) {
            value = col.exportValue(row);
          } else if (col.key) {
            value = row[col.key];
          }

          const stringValue = String(value || "").replace(/"/g, '""');
          return `"${stringValue}"`;
        })
        .join(",");
    });

    const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.body.appendChild(document.createElement("a"));
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      link.remove();
    }, 100);
  } catch (error) {
    console.error("CSV Export Error:", error);
    throw error;
  }
};

/**
 * Utility to export data as PDF
 */
export const exportToPDF = async (data, columns, filename = "report.pdf", options = {}) => {
  try {
    const { title = "", subtitle = "", startDate = "", endDate = "", shopDetails = null, summaryDataOverride = null, orientation = "p" } = options;
    const doc = new jsPDF(orientation, "pt", "a4");

    const filteredColumns = getValidColumns(columns);

    const headers = filteredColumns.map((col) => col.header);
    const rows = data.map((row) =>
      filteredColumns.map((col) => {
        let val = "";
        if (col.exportValue) val = col.exportValue(row);
        else if (col.key) val = row[col.key] || "";
        
        // Convert unsupported currency symbols to safe strings for jsPDF
        if (typeof val === 'string') {
          return val.replace(/₹/g, "Rs. ").replace(/€/g, "EUR ").replace(/£/g, "GBP ");
        }
        return val;
      }),
    );

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 40;

    let y = margin;

    // Load logo if shopDetails exists with caching
    let logoBase64 = null;
    if (shopDetails && (shopDetails.logo || shopDetails.image?.url)) {
      const imgUrl = shopDetails.logo || shopDetails.image?.url;
      
      if (window._cachedShopLogoUrl === imgUrl && window._cachedShopLogoBase64) {
        logoBase64 = window._cachedShopLogoBase64;
      } else {
        try {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.src = imgUrl;
          await new Promise((resolve, reject) => {
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const maxWidth = 500;
              const scale = img.width > maxWidth ? maxWidth / img.width : 1;
              canvas.width = img.width * scale;
              canvas.height = img.height * scale;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              logoBase64 = canvas.toDataURL("image/png", 0.8);
              
              window._cachedShopLogoUrl = imgUrl;
              window._cachedShopLogoBase64 = logoBase64;
              resolve();
            };
            img.onerror = () => resolve();
            setTimeout(() => resolve(), 3000);
          });
        } catch (e) {
          console.warn("Failed to load shop logo for PDF", e);
        }
      }
    }

    // Shop Info Header
    if (shopDetails) {
      const shopName = shopDetails.shopName || shopDetails.name || shopDetails.shopName || "";
      const addressParts = [
        shopDetails.address,
        shopDetails.area,
        shopDetails.state,
        shopDetails.country,
        shopDetails.zipCode,
      ].filter(part => part && String(part).trim() !== "" && String(part).trim().toUpperCase() !== "N/A");
      const shopAddress = addressParts.length > 0 ? addressParts.join(", ") : "";
      const shopPhone = shopDetails.phone || "";

      let headerY = y + 10;
      if (logoBase64) {
        doc.addImage(logoBase64, "PNG", margin, y, 50, 50, undefined, "FAST");
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(shopName.toUpperCase(), pageWidth / 2, headerY, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      
      let addressY = headerY + 15;
      if (shopAddress) {
        doc.text(shopAddress, pageWidth / 2, addressY, { align: "center" });
        addressY += 12;
      }
      if (shopPhone) {
        doc.text(`Phone: ${shopPhone}`, pageWidth / 2, addressY, { align: "center" });
      }

      y += 65;
      
      // Divider Line
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(1);
      doc.line(margin, y, pageWidth - margin, y);
      y += 15;
    }

    // 1. Title Banner
    const displayTitle = title || filename.replace(".pdf", "").replace(/_/g, " ");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(displayTitle.toUpperCase(), pageWidth / 2, y, { align: "center" });

    y += 20;

    // 2. Subtitle / Date Range
    let displaySubtitle = subtitle;
    if (!displaySubtitle && startDate && endDate) {
      displaySubtitle = `From ${startDate} to ${endDate}`;
    }
    if (displaySubtitle) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(displaySubtitle, pageWidth / 2, y, { align: "center" });
      y += 20;
    }

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: y,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 8, font: "helvetica", textColor: [31, 41, 55], lineColor: [229, 231, 235], lineWidth: 0.5 },
      headStyles: {
        fillColor: [243, 244, 246], // Gray-100 (matches section headers)
        textColor: [17, 24, 39],
        fontStyle: "bold",
        halign: "left",
        fontSize: 9,
        cellPadding: 8,
      },
      margin: { top: margin, left: margin, right: margin, bottom: margin + 30 },
      didParseCell: (hookData) => {
        const { cell, row, column } = hookData;
        if (row.raw && row.raw.length > 0) {
          const firstVal = String(row.raw[0] || '').trim();
          
          // Style empty separator rows
          if (firstVal === '' && String(row.raw[1] || '').trim() === '') {
            if (column.index === 0) {
              cell.styles.minCellHeight = 12;
              cell.styles.cellPadding = 0;
              cell.text = [];
              cell.styles.fillColor = [249, 250, 251]; // Very light gray to act as a divider block
              if (hookData.table.columns.length > 1) {
                cell.colSpan = hookData.table.columns.length;
              }
            }
            return;
          }

          // Style section headers (--- TEXT ---)
          if (firstVal.startsWith('---') && firstVal.endsWith('---')) {
            if (column.index === 0) {
              cell.styles.fontStyle = 'bold';
              cell.styles.fontSize = 9;
              cell.styles.fillColor = [243, 244, 246]; // Gray-100
              cell.styles.textColor = [17, 24, 39]; // Gray-900
              cell.styles.cellPadding = 8;
              cell.text = [firstVal.replace(/---/g, '').trim()];
              if (hookData.table.columns.length > 1) {
                cell.colSpan = hookData.table.columns.length;
              }
            }
          } else {
            // For 2-column key-value exports, format key and value
            if (hookData.table.columns.length === 2 && row.section === 'body') {
              if (column.index === 0) {
                cell.styles.fontStyle = 'bold';
                cell.styles.textColor = [107, 114, 128]; // Gray-500
              }
              if (column.index === 1) {
                cell.styles.fontStyle = 'bold';
                cell.styles.textColor = [17, 24, 39]; // Gray-900
              }
            }
          }
        }
      },
      didDrawPage: (data) => {
        // Footer
        const str = "Page " + doc.internal.getNumberOfPages();
        const generatedText = `Generated on ${new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })} on Vijayajalakam`;

        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.setLineWidth(0.5);
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, pageHeight - 35, pageWidth - margin, pageHeight - 35);

        doc.text(generatedText, margin, pageHeight - 20);
        doc.text(str, pageWidth - margin - doc.getTextWidth(str), pageHeight - 20);
      },
    });

    let finalY = doc.lastAutoTable.finalY + 20;

    // 3. Dynamic Summary Table
    const summaryData = summaryDataOverride || {};
    
    if (!summaryDataOverride) {
      filteredColumns.forEach((col, colIndex) => {
        const header = col.header || "";
        const lowerHeader = header.toLowerCase();
        if (
          lowerHeader.includes("sno") ||
          lowerHeader.includes("sl no") ||
          lowerHeader.includes("date") ||
          lowerHeader.includes("id") ||
          lowerHeader.includes("no.") ||
          lowerHeader.includes("name") ||
          lowerHeader.includes("status") ||
          lowerHeader.includes("invoice")
        ) {
          return;
        }

        let isNumeric = false;
        let sum = 0;
        let currency = "";
        let hasValidData = false;

        for (let i = 0; i < data.length; i++) {
          let val = rows[i][colIndex];
          if (val === "" || val == null) continue;
          
          hasValidData = true;
          const numStr = String(val).replace(/[^0-9.-]+/g, "");
          if (numStr !== "" && !isNaN(Number(numStr))) {
            isNumeric = true;
            sum += parseFloat(numStr);
            if (!currency) {
              const match = String(val).match(/^([^\d.-]+)/);
              if (match) currency = match[1].trim() + " ";
            }
          } else {
            isNumeric = false;
            break;
          }
        }

        if (hasValidData && isNumeric) {
          let label = header;
          if (!label.toLowerCase().includes("total")) {
            label = "Total " + label;
          }
          
          // Format with correct decimal places based on currency or value
          let formattedSum = sum.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
          if (String(rows[0]?.[colIndex] || "").includes(".00") || currency.includes("₹")) {
               formattedSum = sum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }
          
          summaryData[label] = `${currency}${formattedSum}`;
        }
      });
    }

    if (Object.keys(summaryData).length > 0) {
      const summaryRows = Object.entries(summaryData).map(([label, value]) => [
        { content: label, styles: { halign: "left" } },
        { content: String(value), styles: { halign: "right" } },
      ]);

      const tableWidth = 220;
      
      if (finalY + summaryRows.length * 20 > pageHeight - margin - 30) {
         doc.addPage();
         finalY = margin;
      }

      autoTable(doc, {
        startY: finalY,
        body: summaryRows,
        margin: { left: pageWidth - margin - tableWidth, right: margin },
        tableWidth: tableWidth,
        theme: "grid",
        styles: {
          fontSize: 9,
          cellPadding: 6,
          font: "helvetica",
          textColor: [0, 0, 0],
          lineColor: [220, 220, 220],
          lineWidth: 0.5,
        },
        didParseCell: function (data) {
          const rowIdx = data.row.index;
          const label = summaryRows[rowIdx][0].content.toLowerCase();
          
          if (data.column.index === 0) {
            data.cell.styles.fillColor = [248, 248, 248];
            data.cell.styles.fontStyle = "bold";
          } else {
            if (label === "total" || label === "total amount" || label === "total total" || label.includes("total value") || label.includes("sales") || label.includes("tax")) {
              data.cell.styles.fontStyle = "bold";
            }
          }
        },
      });
    }

    if (options.returnBase64) {
      return doc.output("datauristring");
    }

    if (options.returnBlob) {
      return doc.output("blob");
    }

    doc.save(filename);
  } catch (error) {
    console.error("PDF Export Error:", error);
    throw error;
  }
};

/**
 * Utility to export data as Excel
 */
export const exportToExcel = (data, columns, filename = "report.xlsx") => {
  try {
    const validColumns = getValidColumns(columns);
    const rows = data.map((row) => {
      const obj = {};
      validColumns.forEach((col) => {
        let value = "";
        if (col.exportValue) value = col.exportValue(row);
        else if (col.key) value = row[col.key] || "";
        obj[col.header] = value;
      });
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error("Excel Export Error:", error);
    throw error;
  }
};

/**
 * Utility to export data as PowerPoint
 */
export const exportToPPT = async (data, columns, filename = "report.pptx") => {
  try {
    const pres = new PptxGenJS();
    const slide = pres.addSlide();

    const validColumns = getValidColumns(columns);

    const headers = validColumns.map((col) => ({
      text: col.header,
      options: { bold: true, fill: "3b82f6", color: "ffffff" },
    }));
    const rows = data.slice(0, 15).map((row) =>
      validColumns.map((col) => ({
        text: String(
          col.exportValue ? col.exportValue(row) : row[col.key] || "",
        ),
      })),
    );

    slide.addText(filename.replace(".pptx", "").replace(/_/g, " "), {
      x: 0.5,
      y: 0.5,
      fontSize: 18,
      color: "3b82f6",
      bold: true,
    });

    slide.addTable([headers, ...rows], {
      x: 0.5,
      y: 1.0,
      w: 9.0,
      colWidths: Array(columns.length).fill(9.0 / columns.length),
      border: { pt: 1, color: "eff6ff" },
      fontSize: 9,
    });

    if (data.length > 15) {
      slide.addText(`Showing first 15 of ${data.length} records...`, {
        x: 0.5,
        y: 5.2,
        fontSize: 10,
        color: "9ca3af",
      });
    }

    await pres.writeFile({ fileName: filename });
  } catch (error) {
    console.error("PPT Export Error:", error);
    throw error;
  }
};

// Helper to map unsupported currency symbols to safe strings for jsPDF standard fonts
const getSafePdfCurrency = (symbol) => {
  const map = {
    "₹": "Rs. ",
    "€": "EUR ",
    "£": "GBP ",
    "AED": "AED ",
    "SAR": "SAR ",
    "QR": "QR ",
    "KD": "KD ",
    "BD": "BD ",
    "OMR": "OMR ",
  };
  return map[symbol] || symbol;
};

/**
 * Utility to export payroll data as PDF (Simple & Clean Salary Slips)
 */
export const exportPayrollPDF = async (data, monthLabel, shopDetails, currencySymbol = "₹", selectedMonth = "", returnBase64 = false) => {
  try {
    const safeCurrency = getSafePdfCurrency(currencySymbol);
    const doc = new jsPDF("p", "pt", "a4");
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 40;

    // Helper to round amounts to 2 decimal places
    const fmt = (val) => {
      const num = Number(val) || 0;
      return parseFloat(num.toFixed(2));
    };

    // Format number with commas
    const fmtNum = (val) => {
      const num = fmt(val);
      return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Load logo
    // Load logo with caching to dramatically improve performance
    let logoBase64 = null;
    if (shopDetails?.logo || shopDetails?.image?.url) {
      const imgUrl = shopDetails?.logo || shopDetails?.image?.url;
      
      // Check cache first
      if (window._cachedShopLogoUrl === imgUrl && window._cachedShopLogoBase64) {
        logoBase64 = window._cachedShopLogoBase64;
      } else {
        try {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.src = imgUrl;
          await new Promise((resolve, reject) => {
            img.onload = () => {
              const canvas = document.createElement("canvas");
              // Limit size to prevent massive base64 strings
              const maxWidth = 500;
              const scale = img.width > maxWidth ? maxWidth / img.width : 1;
              canvas.width = img.width * scale;
              canvas.height = img.height * scale;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              logoBase64 = canvas.toDataURL("image/png", 0.8);
              
              // Cache for future use
              window._cachedShopLogoUrl = imgUrl;
              window._cachedShopLogoBase64 = logoBase64;
              resolve();
            };
            img.onerror = () => {
              console.warn("Failed to load shop logo for PDF");
              resolve(); // Resolve anyway so we don't block PDF generation
            };
            
            // Timeout to prevent hanging forever
            setTimeout(() => resolve(), 3000);
          });
        } catch (e) {
          console.warn("Failed to load shop logo for PDF", e);
        }
      }
    }

    // Shop info
    const shopName = shopDetails?.shopName || shopDetails?.name || shopDetails?.shopName || "";
    const addressParts = [
      shopDetails?.address,
      shopDetails?.area,
      shopDetails?.state,
      shopDetails?.country,
      shopDetails?.zipCode,
    ].filter(part => part && part.trim() !== "" && part.trim().toUpperCase() !== "N/A");
    const shopAddress = addressParts.length > 0 ? addressParts.join(", ") : "";
    const shopPhone = shopDetails?.phone || "";

    // Calculate days in month
    let daysInMonth = 30;
    if (selectedMonth) {
      try {
        const [year, month] = selectedMonth.split("-").map(Number);
        daysInMonth = new Date(year, month, 0).getDate();
      } catch (e) { /* fallback */ }
    }

    data.forEach((item, index) => {
      if (index > 0) {
        doc.addPage();
      }

      const outerMargin = 20;
      let y = margin + 10;

      // 1. Header (Logo & Shop Info)
      if (logoBase64) {
        doc.addImage(logoBase64, "PNG", margin, y, 60, 60, undefined, "FAST");
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text(shopName.toUpperCase(), pageWidth / 2, y + 20, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      
      let addressY = y + 35;
      if (shopAddress) {
        doc.text(shopAddress, pageWidth / 2, addressY, { align: "center" });
        addressY += 15;
      }
      if (shopPhone) {
        doc.text(`Phone: ${shopPhone}`, pageWidth / 2, addressY, { align: "center" });
      }

      y += 75;
      
      // Divider Line
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(1);
      doc.line(margin, y, pageWidth - margin, y);
      y += 25;

      // 2. Payslip Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`SALARY SLIP - ${monthLabel.toUpperCase()}`, pageWidth / 2, y, { align: "center" });
      y += 20;

      // 3. Employee Info (Inside a Box)
      const empId = item.staff?.employeeId || item.staff?._id?.substring(0, 8) || "N/A";
      const empName = (item.staff?.name || "N/A").toUpperCase();
      const designation = (item.staff?.designation || "Staff").toUpperCase();
      const paidDays = fmt((item.attendance?.presentDays || 0) + (item.attendance?.halfDays || 0) * 0.5);

      autoTable(doc, {
        startY: y,
        body: [
          [{ content: "Employee Name", styles: { fontStyle: "bold", fillColor: [248, 248, 248] } }, empName, { content: "Employee ID", styles: { fontStyle: "bold", fillColor: [248, 248, 248] } }, empId],
          [{ content: "Designation", styles: { fontStyle: "bold", fillColor: [248, 248, 248] } }, designation, { content: "Days in Month", styles: { fontStyle: "bold", fillColor: [248, 248, 248] } }, String(daysInMonth)],
          [{ content: "Paid Days", styles: { fontStyle: "bold", fillColor: [248, 248, 248] } }, String(paidDays), { content: "Monthly Pay", styles: { fontStyle: "bold", fillColor: [248, 248, 248] } }, `${safeCurrency}${fmtNum(item.basicSalary)}`]
        ],
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 6, textColor: [0, 0, 0], lineColor: [220, 220, 220], lineWidth: 0.5 },
        columnStyles: {
          0: { cellWidth: "20%" }, 1: { cellWidth: "30%" },
          2: { cellWidth: "20%" }, 3: { cellWidth: "30%" }
        },
        margin: { left: margin, right: margin }
      });

      y = doc.lastAutoTable.finalY + 15;

      // 4. Earnings and Deductions Table
      const earnings = [];
      earnings.push({ label: "Basic Salary", amount: fmt(item.calculatedSalary) });
      if (item.allowances && item.allowances.length > 0) {
        item.allowances.forEach(a => earnings.push({ label: String(a.name || "Allowance"), amount: fmt(a.finalAmount || a.amount) }));
      }
      if (item.totalOtHours > 0) earnings.push({ label: "Overtime Pay", amount: fmt(item.otPay) });

      const deductions = [];
      if (item.deductions && item.deductions.length > 0) {
        item.deductions.forEach(d => deductions.push({ label: String(d.name || "Deduction"), amount: fmt(d.finalAmount || d.amount) }));
      }

      const tableHead = [
        [
          { content: "EARNINGS", styles: { halign: "left" } },
          { content: "AMOUNT", styles: { halign: "right" } },
          { content: "DEDUCTIONS", styles: { halign: "left" } },
          { content: "AMOUNT", styles: { halign: "right" } },
        ]
      ];

      const maxRows = Math.max(earnings.length, deductions.length);
      const tableBody = [];
      for (let i = 0; i < maxRows; i++) {
        const e = earnings[i] || { label: "", amount: "" };
        const d = deductions[i] || { label: "", amount: "" };
        tableBody.push([
          { content: e.label },
          { content: e.amount !== "" ? `${safeCurrency}${fmtNum(e.amount)}` : "", styles: { halign: "right" } },
          { content: d.label },
          { content: d.amount !== "" ? `${safeCurrency}${fmtNum(d.amount)}` : "", styles: { halign: "right" } }
        ]);
      }

      tableBody.push([
        { content: "Gross Earnings", styles: { fontStyle: "bold" } },
        { content: `${safeCurrency}${fmtNum(item.grossSalary)}`, styles: { fontStyle: "bold", halign: "right" } },
        { content: "Total Deductions", styles: { fontStyle: "bold" } },
        { content: `${safeCurrency}${fmtNum(item.totalDeductions)}`, styles: { fontStyle: "bold", halign: "right" } }
      ]);

      tableBody.push([
        { content: "NET PAY", colSpan: 2, styles: { fontStyle: "bold", fontSize: 12, halign: "left", fillColor: [240, 240, 240] } },
        { content: `${safeCurrency}${fmtNum(item.netSalary)}`, colSpan: 2, styles: { fontStyle: "bold", fontSize: 13, halign: "right", fillColor: [240, 240, 240] } }
      ]);

      autoTable(doc, {
        startY: y,
        head: tableHead,
        body: tableBody,
        theme: "grid",
        styles: {
          fontSize: 10,
          cellPadding: 8,
          textColor: [0, 0, 0],
          lineColor: [220, 220, 220],
          lineWidth: 0.5,
        },
        headStyles: {
          fillColor: [248, 248, 248], // Light gray
          textColor: [0, 0, 0],
          fontStyle: "bold"
        },
        margin: { left: margin, right: margin }
      });


      // DRAW OUTER PAGE BORDER
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(1);
      doc.rect(outerMargin, outerMargin, pageWidth - 2 * outerMargin, pageHeight - 2 * outerMargin);
    });

    if (returnBase64) {
      return doc.output('datauristring');
    }

    const safeMonthLabel = monthLabel.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`Payroll_Slips_${safeMonthLabel}.pdf`);

  } catch (error) {
    console.error("PDF Payroll Export Error:", error);
    throw error;
  }
};
