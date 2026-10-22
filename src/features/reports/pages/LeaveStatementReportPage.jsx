import React, { useState, useMemo } from "react";
import {
  RotateCcw,
  Download,
  Search,
  Calendar,
  UserCheck,
  Edit2,
  X,
  FileSpreadsheet,
  FileText,
  Printer,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  useGetLeaveStatementReportQuery,
  useUpdateStaffLeaveQuotaMutation,
} from "../../../store/api/tenantCrudEndpoints";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import ReportLayout from "../../../components/shared/ReportLayout";

// 3-letter month abbreviations for compact fit across financial year (Apr - Mar)
const MONTH_KEYS = [
  { key: "april", label: "Apr", fullLabel: "April" },
  { key: "may", label: "May", fullLabel: "May" },
  { key: "june", label: "Jun", fullLabel: "June" },
  { key: "july", label: "Jul", fullLabel: "July" },
  { key: "august", label: "Aug", fullLabel: "August" },
  { key: "september", label: "Sep", fullLabel: "September" },
  { key: "october", label: "Oct", fullLabel: "October" },
  { key: "november", label: "Nov", fullLabel: "November" },
  { key: "december", label: "Dec", fullLabel: "December" },
  { key: "january", label: "Jan", fullLabel: "January" },
  { key: "february", label: "Feb", fullLabel: "February" },
  { key: "march", label: "Mar", fullLabel: "March" },
];

// Helper to calculate ongoing Financial Year (April - March cycle)
const getOngoingFinancialYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 = Jan, 3 = Apr
  if (month >= 3) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
};

const LeaveStatementReportPage = () => {
  const { hasPermission, isAdmin, salonProfile } = useAuth();

  const ongoingFY = useMemo(() => getOngoingFinancialYear(), []);
  const [selectedFY, setSelectedFY] = useState(ongoingFY);
  const [searchQuery, setSearchQuery] = useState("");
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Leave Quota Edit Modal state
  const [editingStaff, setEditingStaff] = useState(null);
  const [newQuotaValue, setNewQuotaValue] = useState("");

  // Generate list of selectable financial years (current + previous 4)
  const fyOptions = useMemo(() => {
    const startYr = parseInt(ongoingFY.split("-")[0], 10);
    const options = [];
    for (let i = 0; i < 5; i++) {
      const y = startYr - i;
      options.push(`${y}-${y + 1}`);
    }
    return options;
  }, [ongoingFY]);

  // Query leave statement data
  const {
    data: reportData,
    isLoading,
    isFetching,
    refetch,
  } = useGetLeaveStatementReportQuery({
    financialYear: selectedFY,
  });

  const [updateQuotaMut, { isLoading: isUpdatingQuota }] =
    useUpdateStaffLeaveQuotaMutation();

  const statementRows = useMemo(
    () => reportData?.rows || [],
    [reportData?.rows]
  );

  // Filter rows by search query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return statementRows;
    const q = searchQuery.toLowerCase().trim();
    return statementRows.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.designation?.toLowerCase().includes(q) ||
        r.employeeId?.toLowerCase().includes(q)
    );
  }, [statementRows, searchQuery]);

  // Calculate dynamic totals for the filtered subset
  const displayTotals = useMemo(() => {
    if (!filteredRows.length) return null;

    const totalCasualEarnedLeaves = filteredRows.reduce(
      (sum, r) => sum + (r.casualEarnedLeaveForYear || 0),
      0
    );
    const totalElBalance = filteredRows.reduce(
      (sum, r) => sum + (r.elBalance || 0),
      0
    );
    const totalLop = filteredRows.reduce(
      (sum, r) => sum + (r.lopTotal || 0),
      0
    );
    const totalElUsed = filteredRows.reduce(
      (sum, r) => sum + (r.elTotal || 0),
      0
    );

    const monthTotals = {};
    MONTH_KEYS.forEach((m) => {
      monthTotals[m.key] = {
        el: filteredRows.reduce(
          (sum, r) => sum + (r.months?.[m.key]?.el || 0),
          0
        ),
        lop: filteredRows.reduce(
          (sum, r) => sum + (r.months?.[m.key]?.lop || 0),
          0
        ),
      };
    });

    return {
      totalStaff: filteredRows.length,
      totalCasualEarnedLeaves,
      totalElBalance,
      totalLop,
      totalElUsed,
      months: monthTotals,
    };
  }, [filteredRows]);

  // Handle open quota editor
  const handleOpenEditQuota = (staffRow) => {
    setEditingStaff(staffRow);
    setNewQuotaValue(String(staffRow.casualEarnedLeaveForYear ?? 0));
  };

  // Submit quota update
  const handleSaveQuota = async (e) => {
    e.preventDefault();
    if (!editingStaff) return;
    const num = Number(newQuotaValue);
    if (isNaN(num) || num < 0) {
      toast.error("Please enter a valid non-negative number of days");
      return;
    }

    try {
      await updateQuotaMut({
        staffId: editingStaff.staffId,
        paidLeaves: num,
      }).unwrap();
      toast.success(
        `Leave quota for ${editingStaff.name} updated to ${num} days`
      );
      setEditingStaff(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update leave quota");
    }
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    try {
      if (!filteredRows.length) {
        toast.error("No data available to export");
        return;
      }

      const headerRow1 = [
        "SI NO",
        "NAME",
        "DESIGNATION",
        "CASUAL/EARNED LEAVE FOR YEAR",
      ];
      const headerRow2 = ["", "", "", ""];

      MONTH_KEYS.forEach((m) => {
        headerRow1.push(m.label.toUpperCase(), "");
        headerRow2.push("EL", "LOP");
      });

      headerRow1.push("EL BALANCE", "LOP TOTAL");
      headerRow2.push("", "");

      const dataRows = filteredRows.map((r, idx) => {
        const row = [
          idx + 1,
          r.name,
          r.designation || "Staff",
          r.casualEarnedLeaveForYear || 0,
        ];
        MONTH_KEYS.forEach((m) => {
          row.push(r.months?.[m.key]?.el ?? 0);
          row.push(r.months?.[m.key]?.lop ?? 0);
        });
        row.push(r.elBalance ?? 0);
        row.push(r.lopTotal ?? 0);
        return row;
      });

      if (displayTotals) {
        const totalRow = [
          "TOTAL",
          `Total Staff: ${displayTotals.totalStaff}`,
          "",
          displayTotals.totalCasualEarnedLeaves,
        ];
        MONTH_KEYS.forEach((m) => {
          totalRow.push(
            displayTotals.months[m.key]?.el ?? 0,
            displayTotals.months[m.key]?.lop ?? 0
          );
        });
        totalRow.push(displayTotals.totalElBalance, displayTotals.totalLop);
        dataRows.push(totalRow);
      }

      const ws = XLSX.utils.aoa_to_sheet([
        [`LEAVE STATEMENT FOR FINANCIAL YEAR ${selectedFY}`],
        [],
        headerRow1,
        headerRow2,
        ...dataRows,
      ]);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Leave Statement");
      XLSX.writeFile(wb, `Leave_Statement_FY_${selectedFY}.xlsx`);
      toast.success("Excel sheet exported successfully");
      setIsExportMenuOpen(false);
    } catch (err) {
      console.error("Excel Export Error:", err);
      toast.error("Failed to export Excel file");
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    try {
      if (!filteredRows.length) {
        toast.error("No data available to export");
        return;
      }

      const headers = [
        "SI NO",
        "NAME",
        "DESIGNATION",
        "CASUAL/EARNED LEAVE FOR YEAR",
        ...MONTH_KEYS.flatMap((m) => [
          `${m.label} (EL)`,
          `${m.label} (LOP)`,
        ]),
        "EL BALANCE",
        "LOP TOTAL",
      ];

      const csvRows = filteredRows.map((r, idx) => {
        const row = [
          idx + 1,
          `"${(r.name || "").replace(/"/g, '""')}"`,
          `"${(r.designation || "Staff").replace(/"/g, '""')}"`,
          r.casualEarnedLeaveForYear || 0,
        ];
        MONTH_KEYS.forEach((m) => {
          row.push(r.months?.[m.key]?.el ?? 0);
          row.push(r.months?.[m.key]?.lop ?? 0);
        });
        row.push(r.elBalance ?? 0);
        row.push(r.lopTotal ?? 0);
        return row.join(",");
      });

      const csvContent =
        "\uFEFF" +
        `"LEAVE STATEMENT FOR FINANCIAL YEAR ${selectedFY}"\n\n` +
        headers.join(",") +
        "\n" +
        csvRows.join("\n");

      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Leave_Statement_FY_${selectedFY}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("CSV file exported successfully");
      setIsExportMenuOpen(false);
    } catch (err) {
      console.error("CSV Export Error:", err);
      toast.error("Failed to export CSV file");
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    try {
      if (!filteredRows.length) {
        toast.error("No data available to export");
        return;
      }

      const doc = new jsPDF("landscape", "pt", "a3");

      const title = `LEAVE STATEMENT FOR FINANCIAL YEAR ${selectedFY}`;
      const subtitle = salonProfile?.name
        ? `${salonProfile.name} - Generated on ${new Date().toLocaleDateString()}`
        : `Generated on ${new Date().toLocaleDateString()}`;

      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text(title, 40, 40);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(subtitle, 40, 56);

      const head1 = [
        { content: "SI NO", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "NAME", rowSpan: 2, styles: { halign: "left", valign: "middle" } },
        { content: "DESIGNATION", rowSpan: 2, styles: { halign: "left", valign: "middle" } },
        { content: "Casual/Earned", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        ...MONTH_KEYS.map((m) => ({
          content: m.label,
          colSpan: 2,
          styles: { halign: "center", valign: "middle" },
        })),
        { content: "EL BAL", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "LOP TOT", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
      ];

      const head2 = [];
      MONTH_KEYS.forEach(() => {
        head2.push(
          { content: "EL", styles: { halign: "center", fontSize: 8 } },
          { content: "LOP", styles: { halign: "center", fontSize: 8 } }
        );
      });

      const body = filteredRows.map((r, idx) => {
        const row = [
          idx + 1,
          r.name,
          r.designation || "Staff",
          r.casualEarnedLeaveForYear || 0,
        ];
        MONTH_KEYS.forEach((m) => {
          row.push(r.months?.[m.key]?.el ?? 0);
          row.push(r.months?.[m.key]?.lop ?? 0);
        });
        row.push(r.elBalance ?? 0);
        row.push(r.lopTotal ?? 0);
        return row;
      });

      if (displayTotals) {
        const footRow = [
          "TOTAL",
          `Staff: ${displayTotals.totalStaff}`,
          "",
          displayTotals.totalCasualEarnedLeaves,
        ];
        MONTH_KEYS.forEach((m) => {
          footRow.push(
            displayTotals.months[m.key]?.el ?? 0,
            displayTotals.months[m.key]?.lop ?? 0
          );
        });
        footRow.push(displayTotals.totalElBalance, displayTotals.totalLop);
        body.push(footRow);
      }

      autoTable(doc, {
        head: [head1, head2],
        body: body,
        startY: 75,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [248, 250, 252],
          textColor: [15, 23, 42],
          fontStyle: "bold",
          lineWidth: 0.5,
          lineColor: [226, 232, 240],
        },
        alternateRowStyles: {
          fillColor: [253, 253, 254],
        },
      });

      doc.save(`Leave_Statement_FY_${selectedFY}.pdf`);
      toast.success("PDF report generated successfully");
      setIsExportMenuOpen(false);
    } catch (err) {
      console.error("PDF Export Error:", err);
      toast.error("Failed to generate PDF");
    }
  };


  return (
    <ReportLayout
      title={`Leave Statement — FY ${selectedFY}`}
      subtitle="Leave statement for financial year"
    >
      {/* Main Table Card (Clean, flat UI without heavy shadows) */}
      <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-2xl overflow-hidden flex flex-col">
        {/* Table Toolbar: Search on left, Controls on right */}
        <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-dark-border/60 bg-white dark:bg-dark-surface flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Search input + Staff Count */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search staff or designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-gray-50/80 dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/40 shrink-0">
              {filteredRows.length} Staff
            </span>
          </div>

          {/* Right: Actions (FY Selector, Reload, Export) */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {/* Financial Year Selector */}
            <div className="flex items-center gap-1.5 bg-gray-50/80 dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl px-2.5 py-1.5 text-xs">
              <Calendar size={13} className="text-gray-400" />
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                FY:
              </span>
              <select
                value={selectedFY}
                onChange={(e) => setSelectedFY(e.target.value)}
                className="bg-transparent font-bold text-xs text-gray-800 dark:text-white focus:outline-none cursor-pointer"
              >
                {fyOptions.map((opt) => (
                  <option
                    key={opt}
                    value={opt}
                    className="bg-white dark:bg-dark-card text-gray-800 dark:text-white"
                  >
                    {opt} {opt === ongoingFY ? "(Ongoing)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Reload Button */}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              title="Reload Data"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50/80 dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-border/50 transition-colors active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              <RotateCcw
                size={13}
                className={`text-gray-500 dark:text-gray-400 ${
                  isFetching ? "animate-spin text-purple-600 dark:text-purple-400" : ""
                }`}
              />
              <span className="hidden sm:inline">Reload</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsExportMenuOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50/80 dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-border/50 transition-colors active:scale-95 cursor-pointer"
              >
                <Download size={13} className="text-gray-500 dark:text-gray-400" />
                <span>Export</span>
                <ChevronDown size={12} className="text-gray-400" />
              </button>

              {isExportMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsExportMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-44 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl z-50 py-1 text-xs">
                    <button
                      onClick={handleExportExcel}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet size={14} className="text-emerald-600" />
                      <span>Excel (.xlsx)</span>
                    </button>
                    <button
                      onClick={handleExportCSV}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors cursor-pointer"
                    >
                      <FileText size={14} className="text-blue-600" />
                      <span>CSV (.csv)</span>
                    </button>
                    <button
                      onClick={handleExportPDF}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors cursor-pointer"
                    >
                      <Printer size={14} className="text-purple-600" />
                      <span>PDF / Print</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Table Viewport - Auto-fits the screen on desktop without congestion */}
        <div className="overflow-x-auto">
          <table className="w-full table-fixed min-w-[1040px] border-collapse text-left text-xs">
            {/* Column Width Definitions: Restrain Staff, Role, Quota so months get spacious room */}
            <colgroup>
              <col style={{ width: "36px" }} /> {/* # */}
              <col style={{ width: "115px" }} /> {/* Staff (Name & ID) */}
              <col style={{ width: "75px" }} /> {/* Role */}
              <col style={{ width: "48px" }} /> {/* Quota */}
              {/* 12 Months x 2 (EL & LOP) = 24 subcolumns */}
              {MONTH_KEYS.map((m) => (
                <React.Fragment key={m.key}>
                  <col />
                  <col />
                </React.Fragment>
              ))}
              <col style={{ width: "48px" }} /> {/* EL Bal */}
              <col style={{ width: "48px" }} /> {/* LOP Tot */}
            </colgroup>

            {/* Table Header (2 Tiers) */}
            <thead>
              {/* Row 1: SI NO, NAME, ROLE, QUOTA, 12 Month columns, EL BAL, LOP TOT */}
              <tr className="bg-gray-50/90 dark:bg-dark-card/60 border-b border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 font-bold uppercase text-[10px] tracking-wider">
                <th
                  rowSpan={2}
                  className="py-2.5 px-1 border-r border-gray-200 dark:border-dark-border text-center sticky left-0 bg-gray-50 dark:bg-dark-card z-10"
                >
                  #
                </th>
                <th
                  rowSpan={2}
                  className="py-2.5 px-2 border-r border-gray-200 dark:border-dark-border sticky left-[36px] bg-gray-50 dark:bg-dark-card z-10"
                >
                  Staff
                </th>
                <th
                  rowSpan={2}
                  className="py-2.5 px-2 border-r border-gray-200 dark:border-dark-border"
                >
                  Role
                </th>
                <th
                  rowSpan={2}
                  title="Annual Casual/Earned Leave Quota"
                  className="py-2.5 px-1 border-r border-gray-200 dark:border-dark-border text-center"
                >
                  Quota
                </th>

                {/* 12 Months: Apr to Mar */}
                {MONTH_KEYS.map((m) => (
                  <th
                    key={m.key}
                    colSpan={2}
                    className="py-1.5 px-1 border-r border-gray-200 dark:border-dark-border text-center text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase"
                  >
                    {m.label}
                  </th>
                ))}

                <th
                  rowSpan={2}
                  title="Remaining Earned Leave Balance"
                  className="py-2.5 px-1 border-r border-gray-200 dark:border-dark-border text-center"
                >
                  EL Bal
                </th>
                <th
                  rowSpan={2}
                  title="Total Loss of Pay (Unpaid absences)"
                  className="py-2.5 px-1 text-center bg-red-50/40 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-black"
                >
                  LOP Tot
                </th>
              </tr>

              {/* Row 2: EL & LOP Subheaders for Each Month */}
              <tr className="bg-gray-50/50 dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border text-[9px] font-bold text-gray-500 dark:text-gray-400 tracking-tight">
                {MONTH_KEYS.map((m) => (
                  <React.Fragment key={`sub-${m.key}`}>
                    <th className="py-1 px-0.5 border-r border-gray-100 dark:border-dark-border/40 text-center font-semibold text-gray-500 dark:text-gray-400">
                      EL
                    </th>
                    <th className="py-1 px-0.5 border-r border-gray-200 dark:border-dark-border text-center font-semibold text-red-600 dark:text-red-400">
                      LOP
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-gray-100 dark:divide-dark-border/60">
              {isLoading ? (
                // Skeleton Rows
                [1, 2, 3, 4, 5, 6].map((n) => (
                  <tr key={`skel-${n}`} className="animate-pulse">
                    <td className="py-2.5 px-1 text-center border-r border-gray-100 dark:border-dark-border">
                      <div className="h-3 w-3 mx-auto bg-gray-200 dark:bg-dark-border rounded" />
                    </td>
                    <td className="py-2.5 px-2 border-r border-gray-100 dark:border-dark-border">
                      <div className="space-y-1">
                        <div className="h-3 w-16 bg-gray-200 dark:bg-dark-border rounded" />
                        <div className="h-2 w-10 bg-gray-200 dark:bg-dark-border rounded" />
                      </div>
                    </td>
                    <td className="py-2.5 px-2 border-r border-gray-100 dark:border-dark-border">
                      <div className="h-3 w-12 bg-gray-200 dark:bg-dark-border rounded" />
                    </td>
                    <td className="py-2.5 px-1 border-r border-gray-100 dark:border-dark-border">
                      <div className="h-3 w-5 mx-auto bg-gray-200 dark:bg-dark-border rounded" />
                    </td>
                    {MONTH_KEYS.map((m) => (
                      <React.Fragment key={`skel-m-${m.key}`}>
                        <td className="py-2.5 px-0.5 border-r border-gray-100 dark:border-dark-border">
                          <div className="h-3 w-3 mx-auto bg-gray-200 dark:bg-dark-border rounded" />
                        </td>
                        <td className="py-2.5 px-0.5 border-r border-gray-100 dark:border-dark-border">
                          <div className="h-3 w-3 mx-auto bg-gray-200 dark:bg-dark-border rounded" />
                        </td>
                      </React.Fragment>
                    ))}
                    <td className="py-2.5 px-1 border-r border-gray-100 dark:border-dark-border">
                      <div className="h-3 w-5 mx-auto bg-gray-200 dark:bg-dark-border rounded" />
                    </td>
                    <td className="py-2.5 px-1">
                      <div className="h-3 w-5 mx-auto bg-gray-200 dark:bg-dark-border rounded" />
                    </td>
                  </tr>
                ))
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={30}
                    className="py-12 text-center text-gray-400 dark:text-gray-500"
                  >
                    <UserCheck size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-xs text-gray-600 dark:text-gray-300">
                      {searchQuery
                        ? "No staff match your search query"
                        : "No staff records found for this financial year"}
                    </p>
                    <p className="text-[11px] mt-0.5 text-gray-400">
                      Try selecting another financial year or checking HRM staff records.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((staff, idx) => {
                  return (
                    <tr
                      key={staff.staffId || idx}
                      className="hover:bg-purple-50/20 dark:hover:bg-purple-950/10 transition-colors group"
                    >
                      {/* SI NO */}
                      <td className="py-2.5 px-1 border-r border-gray-100 dark:border-dark-border/60 text-center font-semibold text-gray-500 dark:text-gray-400 sticky left-0 bg-white dark:bg-dark-surface group-hover:bg-purple-50/30 dark:group-hover:bg-dark-card z-10 text-[11px]">
                        {idx + 1}
                      </td>

                      {/* STAFF (NAME & ID ONLY) */}
                      <td className="py-2.5 px-2 border-r border-gray-100 dark:border-dark-border/60 sticky left-[36px] bg-white dark:bg-dark-surface group-hover:bg-purple-50/30 dark:group-hover:bg-dark-card z-10">
                        <div className="min-w-0">
                          <span
                            className="font-bold text-gray-900 dark:text-white block truncate text-[11px] leading-tight"
                            title={staff.name}
                          >
                            {staff.name}
                          </span>
                          {staff.employeeId && (
                            <span className="text-[9px] text-gray-400 font-mono block leading-none mt-0.5 truncate">
                              #{staff.employeeId}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* DESIGNATION */}
                      <td className="py-2.5 px-2 border-r border-gray-100 dark:border-dark-border/60">
                        <span
                          className="font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-tight text-[10px] truncate block"
                          title={staff.designation || "Staff"}
                        >
                          {staff.designation || "Staff"}
                        </span>
                      </td>

                      {/* Casual/Earned leave for year (with quick edit) */}
                      <td className="py-2.5 px-1 border-r border-gray-100 dark:border-dark-border/60 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-bold text-gray-800 dark:text-gray-200 text-xs">
                            {staff.casualEarnedLeaveForYear}
                          </span>
                          {(isAdmin || hasPermission("hrm:staff:edit")) && (
                            <button
                              onClick={() => handleOpenEditQuota(staff)}
                              title="Edit annual leave quota"
                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-100 dark:hover:bg-dark-hover rounded text-gray-400 hover:text-purple-600 transition-all cursor-pointer"
                            >
                              <Edit2 size={10} />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* 12 Months: EL & LOP */}
                      {MONTH_KEYS.map((m) => {
                        const mData = staff.months?.[m.key] || { el: 0, lop: 0 };
                        const hasLop = mData.lop > 0;
                        const hasEl = mData.el > 0;

                        return (
                          <React.Fragment key={`${staff.staffId}-${m.key}`}>
                            {/* EL */}
                            <td className="py-2.5 px-0.5 border-r border-gray-100 dark:border-dark-border/40 text-center text-xs">
                              <span
                                className={
                                  hasEl
                                    ? "font-bold text-purple-600 dark:text-purple-400"
                                    : "text-gray-300 dark:text-gray-600 font-normal"
                                }
                              >
                                {mData.el}
                              </span>
                            </td>

                            {/* LOP */}
                            <td className="py-2.5 px-0.5 border-r border-gray-200 dark:border-dark-border text-center text-xs">
                              <span
                                className={
                                  hasLop
                                    ? "font-black text-red-600 dark:text-red-400"
                                    : "text-gray-300 dark:text-gray-600 font-normal"
                                }
                              >
                                {mData.lop}
                              </span>
                            </td>
                          </React.Fragment>
                        );
                      })}

                      {/* EL BALANCE */}
                      <td className="py-2.5 px-1 border-r border-gray-100 dark:border-dark-border/60 text-center font-bold text-xs text-gray-800 dark:text-gray-200">
                        {staff.elBalance}
                      </td>

                      {/* LOP TOTAL */}
                      <td className="py-2.5 px-1 text-center bg-red-50/20 dark:bg-red-950/10">
                        <span
                          className={`font-black text-xs ${
                            staff.lopTotal > 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-gray-300 dark:text-gray-600 font-normal"
                          }`}
                        >
                          {staff.lopTotal}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer: Totals Row */}
            {displayTotals && !isLoading && (
              <tfoot>
                <tr className="bg-gray-50/90 dark:bg-dark-card/70 border-t-2 border-gray-200 dark:border-dark-border font-bold text-xs text-gray-900 dark:text-white">
                  <td className="py-2.5 px-1 text-center border-r border-gray-200 dark:border-dark-border sticky left-0 bg-gray-50 dark:bg-dark-card z-10 text-[11px] text-gray-400">
                    -
                  </td>
                  <td className="py-2.5 px-2 border-r border-gray-200 dark:border-dark-border sticky left-[36px] bg-gray-50 dark:bg-dark-card z-10 uppercase tracking-wider text-[10px] font-black truncate">
                    TOTAL ({displayTotals.totalStaff})
                  </td>
                  <td className="py-2.5 px-2 border-r border-gray-200 dark:border-dark-border text-gray-400 font-normal text-[10px] truncate">
                    All
                  </td>
                  <td className="py-2.5 px-1 border-r border-gray-200 dark:border-dark-border text-center text-purple-700 dark:text-purple-300 font-bold text-xs">
                    {displayTotals.totalCasualEarnedLeaves}
                  </td>

                  {/* 12 Months Totals */}
                  {MONTH_KEYS.map((m) => {
                    const elSum = displayTotals.months?.[m.key]?.el || 0;
                    const lopSum = displayTotals.months?.[m.key]?.lop || 0;

                    return (
                      <React.Fragment key={`tot-${m.key}`}>
                        <td className="py-2.5 px-0.5 border-r border-gray-100 dark:border-dark-border/40 text-center text-xs">
                          <span
                            className={
                              elSum > 0
                                ? "font-bold text-purple-600 dark:text-purple-400"
                                : "text-gray-300 dark:text-gray-600 font-normal"
                            }
                          >
                            {elSum}
                          </span>
                        </td>
                        <td className="py-2.5 px-0.5 border-r border-gray-200 dark:border-dark-border text-center text-xs">
                          <span
                            className={
                              lopSum > 0
                                ? "font-black text-red-600 dark:text-red-400"
                                : "text-gray-300 dark:text-gray-600 font-normal"
                            }
                          >
                            {lopSum}
                          </span>
                        </td>
                      </React.Fragment>
                    );
                  })}

                  {/* EL BALANCE Total */}
                  <td className="py-2.5 px-1 border-r border-gray-200 dark:border-dark-border text-center font-black text-gray-900 dark:text-white text-xs">
                    {displayTotals.totalElBalance}
                  </td>

                  {/* LOP Total */}
                  <td
                    className={`py-2.5 px-1 text-center text-xs ${
                      displayTotals.totalLop > 0
                        ? "font-black text-red-600 dark:text-red-400 bg-red-100/40 dark:bg-red-950/30"
                        : "font-semibold text-gray-400"
                    }`}
                  >
                    {displayTotals.totalLop}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Bottom Legend & Note */}
        <div className="py-2.5 px-4 bg-gray-50/50 dark:bg-dark-surface border-t border-gray-100 dark:border-dark-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" />
              <span className="text-[11px]">
                <strong>EL</strong> = Earned / Paid Leave used
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
              <span className="text-[11px]">
                <strong>LOP</strong> = Loss of Pay (Unpaid absences)
              </span>
            </div>
          </div>
          <div className="text-[10px] text-gray-400">
            Financial Year cycle runs from April 1 to March 31
          </div>
        </div>
      </div>

      {/* Edit Quota Modal (Clean, flat UI without heavy shadows) */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-2xl p-5 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Edit2 size={15} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                    Update Annual Leave Quota
                  </h3>
                  <p className="text-xs text-gray-500">{editingStaff.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveQuota} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Casual / Earned Leave for Year (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={newQuotaValue}
                  onChange={(e) => setNewQuotaValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="e.g. 12"
                  autoFocus
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Absences are deducted from this quota first throughout the financial year.
                  Remaining absences become Loss of Pay (LOP).
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingQuota}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {isUpdatingQuota ? "Saving..." : "Save Quota"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ReportLayout>
  );
};

export default LeaveStatementReportPage;
