import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../api/axiosInstance";
import { Download, Filter } from "lucide-react";
import CustomTable from "../../../components/shared/CustomTable";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import Snackbar from "../../../components/shared/Snackbar";
import TaxReportFilterModal from "../../../components/shared/TaxReportFilterModal";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { usePagination } from "../../../hooks/usePagination";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  getUnifiedInvoicePayableTotal,
  getUnifiedInvoiceRoundOff,
} from "../../../utils/unifiedInvoiceTotals";

const SalesTaxReport = () => {
  const { currencySymbol, country, hasPermission, enableRoundOff } = useAuth();
  const { formatDisplayNumber } = useCurrency();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [taxes, setTaxes] = useState([]);
  const [reportSummary, setReportSummary] = useState(null);
  const { pagination, onPageChange, updatePagination, resetPagination } =
    usePagination({ initialLimit: 20 });

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const todayDate = new Date();
  const today = todayDate.toLocaleDateString("en-CA");

  const [filters, setFilters] = useState({
    tax: [],
    startDate: today,
    endDate: today,
  });

  const taxLabel = useMemo(() => {
    const c = (country || "").toLowerCase();
    if (c === "india") return "GST";
    if (["uae", "uk", "united kingdom", "bahrain", "oman"].includes(c))
      return "VAT";
    if (["usa", "united states"].includes(c)) return "Sales Tax";
    return "Tax";
  }, [country]);

  const fetchTaxes = useCallback(async () => {
    try {
      const res = await api.get("/taxes");
      if (res.data.success) {
        setTaxes(
          res.data.data.filter(
            (t) =>
              t.isActive &&
              t.name.toUpperCase().includes(taxLabel.toUpperCase()),
          ),
        );
      }
    } catch (err) {
      console.error(err);
    }
  }, [taxLabel]);

  useEffect(() => {
    fetchTaxes();
  }, [fetchTaxes]);

  const taxFilterOptions = useMemo(() => {
    const dbTaxes = taxes.map((t) => ({
      id: `${t.percentage}%`,
      label: `${t.percentage}% ${taxLabel}`,
      value: t.percentage.toString(),
    }));

    const options = [];
    if (!dbTaxes.some((t) => t.value === "0")) {
      options.push({ id: "0%", label: `0% ${taxLabel}`, value: "0" });
    }
    return [...options, ...dbTaxes];
  }, [taxes, taxLabel]);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", pagination.page);
      params.append("limit", pagination.limit);
      if (searchTerm) params.append("search", searchTerm);
      // We do not append "taxType" so that ALL invoices (including zero tax) show up

      if (filters.tax && filters.tax.length > 0) {
        const taxValues = filters.tax.map((t) => t.replace("%", ""));
        params.append("taxPercent", taxValues.join(","));
      }

      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await api.get(`/invoices?${params.toString()}`);
      if (res.data.success) {
        setInvoices(res.data.data || []);
        if (res.data.summary) setReportSummary(res.data.summary);
        updatePagination(res.data.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [
    filters,
    pagination.page,
    pagination.limit,
    searchTerm,
    updatePagination,
  ]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    resetPagination();
  }, [searchTerm, filters, resetPagination]);

  const handleDownload = async (id) => {
    try {
      const res = await api.get(`/invoices/${id}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Invoice-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      showSnack("Failed to download invoice", "error");
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append("page", 1);
      params.append("limit", 100000);
      if (searchTerm) params.append("search", searchTerm);
      // We do not append "taxType" so that ALL invoices (including zero tax) show up

      if (filters.tax && filters.tax.length > 0) {
        const taxValues = filters.tax.map((t) => t.replace("%", ""));
        params.append("taxPercent", taxValues.join(","));
      }

      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await api.get(`/invoices?${params.toString()}`);
      if (!res.data.success) return [];
      
      const exportData = res.data.data;
      const summary = res.data.summary || {};
      
      const summaryDataOverride = {
        "Total Taxable Value": `${currencySymbol}${formatDisplayNumber(summary.taxable || 0)}`,
        [`Total ${taxLabel} Amount`]: `${currencySymbol}${formatDisplayNumber(summary.tax || 0)}`,
      };
      
      if (taxLabel === 'GST') {
        summaryDataOverride["Total CGST Amount"] = `${currencySymbol}${formatDisplayNumber((summary.tax || 0) / 2)}`;
        summaryDataOverride["Total SGST Amount"] = `${currencySymbol}${formatDisplayNumber((summary.tax || 0) / 2)}`;
      }
      
      summaryDataOverride["Total Amount"] = `${currencySymbol}${formatDisplayNumber(summary.total || 0)}`;

      return { data: exportData, summaryDataOverride };
    } catch (err) {
      console.error("Export fetch failed", err);
      return [];
    }
  };

  const summaryData = useMemo(() => {
    const totalSelectedTotal = reportSummary?.total || 0;
    const totalSelectedTax = reportSummary?.tax || 0;
    const totalSelectedTaxable = reportSummary?.taxable || 0;

    return {
      total: totalSelectedTotal,
      count: pagination.total,
      segments: [
        {
          id: "TaxAmount",
          label: `${taxLabel} Amount`,
          count: pagination.total, // Approximated
          value: totalSelectedTax,
          color: "#f59e0b",
          textColor: "text-gray-900 dark:text-white",
          inProgressBar: true,
        },
        {
          id: "TaxableAmount",
          label: "Taxable Value",
          count: pagination.total,
          value: totalSelectedTaxable,
          color: "#10b981",
          textColor: "text-gray-900 dark:text-white",
          inProgressBar: true,
        },
      ],
    };
  }, [reportSummary, pagination.total, taxLabel]);

  const getItemTaxPercent = (item) => {
    if (item.taxPercent) return item.taxPercent;
    if (item.taxPercentage) return item.taxPercentage;
    const baseAmt = item.amount || (item.price * (item.quantity || 1)) || 0;
    if (item.taxAmount > 0 && baseAmt > 0) {
      return item.isTaxInclusive
        ? Math.round((item.taxAmount / (baseAmt - item.taxAmount)) * 100)
        : Math.round((item.taxAmount / baseAmt) * 100);
    }
    return 0;
  };

  const columns = [
    {
      header: "Invoice",
      exportValue: (row) =>
        `#${row.invoiceNumber} (${new Date(row.createdAt).toLocaleDateString()})`,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs text-gray-400 group-hover:text-brand-primary dark:text-blue-400 transition-colors uppercase tracking-tight">
            #{row.invoiceNumber}
          </span>
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
            {new Date(row.createdAt).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      header: "Customer",
      exportValue: (row) => row.customer?.name || row.user?.name || "LOCAL CUSTOMER",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 font-bold text-[10px] border border-blue-100/50">
            {(row.customer?.name || row.user?.name)?.charAt(0).toUpperCase() || "W"}
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
            {row.customer?.name || row.user?.name || "LOCAL CUSTOMER"}
          </span>
        </div>
      ),
    },
    {
      header: "Tax %",
      exportValue: (row) => {
        const percents = [...new Set((row.items || []).map(getItemTaxPercent))].filter(
          (p) => p !== undefined && p !== null
        );
        return percents.length > 0 ? percents.join(", ") + "%" : "0%";
      },
      render: (row) => {
        const percents = [...new Set((row.items || []).map(getItemTaxPercent))].filter(
          (p) => p !== undefined && p !== null
        );
        return (
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-dark-card px-2 py-1 rounded-full">
            {percents.length > 0 ? percents.join(", ") : "0"}%
          </span>
        );
      },
    },
    {
      header: "Taxable Value",
      align: "right",
      exportValue: (row) => {
        const taxable = row.items?.reduce((sum, item) => {
          if (item.isTaxInclusive) {
            const tPct = item.taxPercent || 0;
            const amt = item.amount || (item.price * item.quantity);
            return sum + (amt / (1 + tPct / 100));
          }
          return sum + (item.amount || (item.price * item.quantity));
        }, 0) || 0;
        return taxable - (row.discount || 0);
      },
      render: (row) => {
        const taxable = row.items?.reduce((sum, item) => {
          if (item.isTaxInclusive) {
            const tPct = item.taxPercent || 0;
            const amt = item.amount || (item.price * item.quantity);
            return sum + (amt / (1 + tPct / 100));
          }
          return sum + (item.amount || (item.price * item.quantity));
        }, 0) || 0;
        const finalTaxable = Math.max(0, taxable - (row.discount || 0));
        return (
          <span className="text-sm font-bold text-gray-900 dark:text-white notranslate">
            {currencySymbol}
            {formatDisplayNumber(finalTaxable)}
          </span>
        );
      },
    },
    {
      header: `${taxLabel} Amount`,
      exportValue: (row) => row.taxAmount || 0,
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-amber-600 notranslate">
            {currencySymbol}
            {formatDisplayNumber(row.taxAmount || 0)}
          </span>
        </div>
      ),
    },
    ...(taxLabel === 'GST'
      ? [
          {
            header: "CGST",
            exportValue: (row) => {
              const percents = [...new Set((row.items || []).map(getItemTaxPercent))].filter(p => p !== undefined && p !== null);
              const pStr = percents.length > 0 ? percents.map(p => p/2).join(", ") + "%" : "0%";
              return `${pStr} - ${(row.taxAmount || 0) / 2}`;
            },
            render: (row) => {
              const percents = [...new Set((row.items || []).map(getItemTaxPercent))].filter(p => p !== undefined && p !== null);
              const pStr = percents.length > 0 ? percents.map(p => p/2).join(", ") + "%" : "0%";
              return (
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 font-bold">{pStr}</span>
                  <span className="text-sm font-bold text-orange-500 notranslate">
                    {currencySymbol}
                    {formatDisplayNumber((row.taxAmount || 0) / 2)}
                  </span>
                </div>
              );
            },
          },
          {
            header: "SGST",
            exportValue: (row) => {
              const percents = [...new Set((row.items || []).map(getItemTaxPercent))].filter(p => p !== undefined && p !== null);
              const pStr = percents.length > 0 ? percents.map(p => p/2).join(", ") + "%" : "0%";
              return `${pStr} - ${(row.taxAmount || 0) / 2}`;
            },
            render: (row) => {
              const percents = [...new Set((row.items || []).map(getItemTaxPercent))].filter(p => p !== undefined && p !== null);
              const pStr = percents.length > 0 ? percents.map(p => p/2).join(", ") + "%" : "0%";
              return (
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 font-bold">{pStr}</span>
                  <span className="text-sm font-bold text-orange-500 notranslate">
                    {currencySymbol}
                    {formatDisplayNumber((row.taxAmount || 0) / 2)}
                  </span>
                </div>
              );
            },
          },
        ]
      : []),
    ...(enableRoundOff
      ? [
          {
            header: "Round-off",
            exportValue: (row) => {
              const r = getUnifiedInvoiceRoundOff(row);
              return Math.abs(r) < 0.0001 ? "" : formatDisplayNumber(r);
            },
            render: (row) => {
              const r = getUnifiedInvoiceRoundOff(row);
              if (Math.abs(r) < 0.0001) {
                return <span className="text-xs text-gray-400 dark:text-gray-500">—</span>;
              }
              return (
                <span className="text-sm font-bold text-slate-600 notranslate">
                  {r > 0 ? "+" : ""}
                  {currencySymbol}
                  {formatDisplayNumber(r)}
                </span>
              );
            },
          },
        ]
      : []),
    {
      header: "Total Amount",
      exportValue: (row) => formatDisplayNumber(getUnifiedInvoicePayableTotal(row)),
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-black text-gray-900 dark:text-white notranslate">
            {currencySymbol}
            {formatDisplayNumber(getUnifiedInvoicePayableTotal(row))}
          </span>
        </div>
      ),
    },
    {
      header: "Action",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {hasPermission('reports:sales:sales_tax_report:download') && (
            <button
              onClick={() => handleDownload(row._id)}
              title="Download PDF"
              className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-dark-card text-gray-400 dark:text-gray-500 flex items-center justify-center hover:bg-brand-primary hover:text-white transition-all active:scale-95"
            >
              <Download size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const filterCount = useMemo(() => {
    return (filters.tax?.length || 0);
  }, [filters.tax]);

  const renderExpandedRow = (row) => {
    return (
      <div className="bg-gray-50/50 dark:bg-dark-card/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-gray-100/50 dark:bg-dark-border/50 border-y border-gray-200/50 dark:border-dark-border/80 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-6">Item/Service</th>
                <th className="py-3 px-6">HSN Code</th>
                <th className="py-3 px-6 text-right">Qty</th>
                <th className="py-3 px-6 text-right">Price</th>
                <th className="py-3 px-6 text-right">Discount</th>
                <th className="py-3 px-6 text-right">Taxable</th>
                <th className="py-3 px-6 text-right">Tax %</th>
                <th className="py-3 px-6 text-right">{taxLabel} Amt</th>
                {taxLabel === 'GST' && (
                  <>
                    <th className="py-3 px-6 text-right">CGST</th>
                    <th className="py-3 px-6 text-right">SGST</th>
                  </>
                )}
                <th className="py-3 px-6 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium">
              {(row.items || []).map((item, idx) => {
                const qty = item.quantity || 1;
                const price = item.price || 0;
                const amount = item.amount || (price * qty);
                const discount = item.discount || 0;
                
                const tPct = getItemTaxPercent(item);
                let taxableAmount = amount;
                if (item.isTaxInclusive) {
                  taxableAmount = amount / (1 + tPct / 100);
                }
                taxableAmount = taxableAmount - discount;
                
                const taxAmount = item.taxAmount || 0;
                const totalItemAmount = taxableAmount + taxAmount;

                return (
                  <tr key={idx} className="border-b border-gray-100/50 dark:border-dark-border/30 last:border-0 hover:bg-gray-50 dark:hover:bg-dark-border/20 transition-colors">
                    <td className="py-3 px-6 text-gray-900 dark:text-white font-semibold">
                      {item.productName || item.serviceName || item.product?.name || "Item"}
                    </td>
                    <td className="py-3 px-6 text-gray-500 font-medium">
                      {item.hsnCode || "-"}
                    </td>
                    <td className="py-3 px-6 text-right text-gray-500">x{qty}</td>
                    <td className="py-3 px-6 text-right text-gray-600 dark:text-gray-400 notranslate">{currencySymbol}{formatDisplayNumber(price)}</td>
                    <td className="py-3 px-6 text-right text-red-500 notranslate">{discount > 0 ? `-${currencySymbol}${formatDisplayNumber(discount)}` : "-"}</td>
                    <td className="py-3 px-6 text-right text-gray-700 dark:text-gray-300 notranslate">{currencySymbol}{formatDisplayNumber(taxableAmount)}</td>
                    <td className="py-3 px-6 text-right">
                      <span className="text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-500/10 px-2 py-0.5 rounded font-bold text-xs">
                        {tPct}%
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right text-amber-600 dark:text-amber-500 font-bold notranslate">{currencySymbol}{formatDisplayNumber(taxAmount)}</td>
                    {taxLabel === 'GST' && (
                      <>
                        <td className="py-3 px-6 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-gray-400 font-bold">{tPct / 2}%</span>
                            <span className="text-orange-500 font-bold notranslate">{currencySymbol}{formatDisplayNumber(taxAmount / 2)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-6 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-gray-400 font-bold">{tPct / 2}%</span>
                            <span className="text-orange-500 font-bold notranslate">{currencySymbol}{formatDisplayNumber(taxAmount / 2)}</span>
                          </div>
                        </td>
                      </>
                    )}
                    <td className="py-3 px-6 text-right text-emerald-600 dark:text-emerald-400 font-black notranslate">{currencySymbol}{formatDisplayNumber(totalItemAmount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <ReportLayout
      title={`Sales ${taxLabel} Report`}
      subtitle={`Analyze sales filtered by ${taxLabel} percentage`}
    >
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />
      <ReportSummaryCard
        title={`Sales ${taxLabel} Analysis`}
        totalValue={summaryData.total}
        totalCount={summaryData.count}
        segments={summaryData.segments}
        loading={loading}
        currencySymbol={currencySymbol}
      />

      <CustomTable
        columns={columns}
        data={invoices}
        loading={loading}
        onRefresh={fetchInvoices}
        isRefreshing={loading}
        onExport={hasPermission('reports:sales:sales_tax_report:export') ? handleExport : undefined}
        pagination={{
          ...pagination,
          onPageChange,
        }}
        onFilterClick={() => setIsFilterOpen(true)}
        filterCount={filterCount}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={(val) => setFilters((prev) => ({ ...prev, startDate: val }))}
        onEndDateChange={(val) => setFilters((prev) => ({ ...prev, endDate: val }))}
        expandable={true}
        expandedContent={renderExpandedRow}
        flushExpandedContent={true}
        mobileMapper={{
          leading: (row) => (
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-400 border border-blue-100 font-bold">
              {row.invoiceNumber?.slice(-2) || "IN"}
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              {row.invoiceNumber}
            </div>
          ),
          subtitle: (row) => (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              {row.customer?.name || "LOCAL CUSTOMER"} •{" "}
              {new Date(row.createdAt).toLocaleDateString()}
            </div>
          ),
          trailing: (row) => {
            const totalPayable = getUnifiedInvoicePayableTotal(row);
            return (
              <div className="text-right">
                <div className="text-sm font-black text-gray-900 dark:text-white notranslate">
                  {currencySymbol}{formatDisplayNumber(totalPayable)}
                </div>
                <span className="text-[8px] font-black uppercase tracking-wider text-amber-500 notranslate">
                  {taxLabel}: {currencySymbol}{Math.round(row.taxAmount || 0).toLocaleString()}
                </span>
              </div>
            );
          },
        }}
      />
      <TaxReportFilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={(tax) => setFilters((prev) => ({ ...prev, tax }))}
        taxOptions={taxFilterOptions}
        taxLabel={taxLabel}
        initialFilters={filters}
      />
    </ReportLayout>
  );
};

export default SalesTaxReport;
