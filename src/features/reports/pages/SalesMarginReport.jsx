import { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { useCurrency } from "../../../hooks/useCurrency";
import { usePagination } from "../../../hooks/usePagination";

const SalesMarginReport = () => {
  const { hasPermission } = useAuth();
  const { format, formatDisplayNumber, currencySymbol } = useCurrency();

  const [invoices, setInvoices] = useState([]);
  const [serverSummary, setServerSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const { pagination, onPageChange, updatePagination, resetPagination } =
    usePagination({ initialLimit: 20 });

  const todayDate = new Date();
  const today = todayDate.toLocaleDateString("en-CA");

  const [filters, setFilters] = useState({ startDate: today, endDate: today });

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", pagination.page);
      params.append("limit", pagination.limit);
      if (searchTerm) params.append("search", searchTerm);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      // Only fetch invoices that have a staff commission
      params.append("isCommissionReport", "true");

      const res = await api.get(`/invoices?${params.toString()}`);
      if (res.data.success) {
        setInvoices(res.data.data || []);
        setServerSummary(res.data.summary || null);
        
        // Update pagination with the response data
        const paginationData = {
          page: res.data.pagination?.page || pagination.page,
          limit: res.data.pagination?.limit || pagination.limit,
          total: res.data.total || res.data.pagination?.total || 0,
          totalPages: res.data.pagination?.totalPages || Math.ceil((res.data.total || 0) / pagination.limit),
        };
        updatePagination(paginationData);
      }
    } catch (err) {
      console.error("Error fetching margin report:", err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit, searchTerm, updatePagination]);

  useEffect(() => { resetPagination(); }, [searchTerm, filters, resetPagination]);
  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append("page", 1);
      params.append("limit", 100000);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      params.append("isCommissionReport", "true");
      const res = await api.get(`/invoices?${params.toString()}`);
      return res.data.success ? res.data.data : [];
    } catch {
      return [];
    }
  };

  const tableData = useMemo(() => {
    return invoices.map((inv, index) => {
      const rawBaseAmt = inv.amount || 0;
      const rawCommission = inv.commissionAmount || 0;
      
      let commissionPct = "0";
      if (rawBaseAmt > 0) {
        commissionPct = ((rawCommission / rawBaseAmt) * 100).toFixed(1);
        if (commissionPct.endsWith('.0')) {
          commissionPct = commissionPct.replace('.0', '');
        }
      }

      const saleAmt = Math.round((inv.amount || 0) + (inv.taxAmount || 0));
      const commission = Math.round(rawCommission);
      const netAmt = Math.max(0, saleAmt - commission);
      return {
        ...inv,
        slNo: (pagination.page - 1) * pagination.limit + index + 1,
        _saleAmt: saleAmt,
        _commission: commission,
        _commissionPct: commissionPct,
        _netAmt: netAmt,
      };
    });
  }, [invoices, pagination.page, pagination.limit]);

  const summaryData = useMemo(() => {
    let totalSale = 0;
    let totalCommission = 0;
    let totalNet = 0;

    if (serverSummary) {
      totalSale = serverSummary.total || 0;
      totalCommission = serverSummary.commission || 0;
      totalNet = Math.max(0, totalSale - totalCommission);
    } else {
      totalSale = tableData.reduce((s, r) => s + r._saleAmt, 0);
      totalCommission = tableData.reduce((s, r) => s + r._commission, 0);
      totalNet = tableData.reduce((s, r) => s + r._netAmt, 0);
    }

    return {
      total: totalNet,
      count: pagination.total || tableData.length,
      segments: [
        {
          label: "Total Sale",
          value: totalSale,
          color: "#3b82f6",
          inProgressBar: true,
        },
        {
          label: "Commission",
          value: totalCommission,
          color: "#8b5cf6",
          inProgressBar: true,
        },
        {
          label: "Net Amount",
          value: totalNet,
          color: "#10b981",
          inProgressBar: true,
        },
      ],
    };
  }, [tableData, serverSummary, pagination.total]);

  const columns = [
    {
      header: "Sl No",
      render: (row) => (
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{row.slNo}</span>
      ),
    },
    {
      header: "Date",
      exportValue: (row) => new Date(row.createdAt).toLocaleDateString(),
      render: (row) => (
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "Invoice No",
      exportValue: (row) => `#${row.invoiceNumber}`,
      render: (row) => (
        <span className="font-mono text-xs text-brand-primary dark:text-blue-400 uppercase tracking-tight">
          #{row.invoiceNumber}
        </span>
      ),
    },
    {
      header: "Customer",
      exportValue: (row) => row.user?.name || "Walk-in Customer",
      render: (row) => (
        <span className="text-sm font-bold text-gray-900 dark:text-white">
          {row.user?.name || "Walk-in Customer"}
        </span>
      ),
    },
    {
      header: "Staff",
      exportValue: (row) => row.staff?.name || row.createdBy?.name || "Owner",
      render: (row) => (
        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
          {row.staff?.name || row.createdBy?.name || "Owner"}
        </span>
      ),
    },
    {
      header: "Sale Amount",
      exportValue: (row) => row._saleAmt,
      render: (row) => (
        <span className="text-sm font-black text-gray-900 dark:text-white notranslate">
          {format(row._saleAmt, false)}
        </span>
      ),
    },
    {
      header: "Commission",
      exportValue: (row) =>
        row._commission > 0 ? `${row._commissionPct}% = ${currencySymbol}${row._commission}` : "No Commission",
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          {row._commission > 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-50 text-purple-600 border border-purple-100">
                {row._commissionPct}%
              </span>
              <span className="text-xs font-black text-purple-600 notranslate">
                {format(row._commission, false)}
              </span>
            </div>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">No Commission</span>
          )}
        </div>
      ),
    },
    {
      header: "Net Amount",
      exportValue: (row) => row._netAmt,
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 notranslate">
            {format(row._netAmt, false)}
          </span>
          <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
            After commission
          </span>
        </div>
      ),
    },
    {
      header: "Comm. Status",
      exportValue: (row) => 
        row._commission > 0 
          ? (row.isCommissionPaid ? "Settled" : "Pending")
          : "N/A",
      render: (row) => (
        row._commission > 0 ? (
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
              row.isCommissionPaid
                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100"
                : "bg-amber-50 text-amber-600 border-amber-100"
            }`}
          >
            {row.isCommissionPaid ? "Settled" : "Pending"}
          </span>
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">N/A</span>
        )
      ),
    },
  ];

  const renderExpandedRow = (row) => {
    const defaultStaffName = row.staff?.name || row.createdBy?.name || "Admin";

    // 1. Calculate staff totals (base amount ex-tax)
    const staffTotals = {};
    (row.items || []).forEach(item => {
      const staffName = item.staffId?.name || item.staff?.name || defaultStaffName;
      const qty = item.quantity || item.qty || 1;
      const price = item.price || 0;
      const amount = item.amount || (price * qty);
      
      if (!staffTotals[staffName]) {
        staffTotals[staffName] = 0;
      }
      staffTotals[staffName] += amount;
    });

    // 2. Map staff to their precise commission percentage
    const staffCommPctMap = {};
    if (row.staffCommissions && row.staffCommissions.length > 0) {
      row.staffCommissions.forEach(sc => {
        const sName = sc.staffName || defaultStaffName;
        if (sc.commissionType === 'percentage' && sc.commissionValue) {
          staffCommPctMap[sName] = sc.commissionValue;
        } else {
          const totalBase = staffTotals[sName] || 0;
          if (totalBase > 0) {
            let pct = ((sc.amount || 0) / totalBase) * 100;
            // Round if very close to integer (e.g. 50.07 -> 50)
            if (Math.abs(pct - Math.round(pct)) < 0.2) {
              pct = Math.round(pct);
            }
            staffCommPctMap[sName] = pct;
          } else {
            staffCommPctMap[sName] = 0;
          }
        }
      });
    } else if (row._commission > 0) {
       const totalBase = staffTotals[defaultStaffName] || 0;
       if (totalBase > 0) {
         let pct = (row._commission / totalBase) * 100;
         if (Math.abs(pct - Math.round(pct)) < 0.2) {
           pct = Math.round(pct);
         }
         staffCommPctMap[defaultStaffName] = pct;
       } else {
         staffCommPctMap[defaultStaffName] = 0;
       }
    }

    return (
      <div className="bg-gray-50/50 dark:bg-dark-card/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-gray-100/50 dark:bg-dark-border/50 border-y border-gray-200/50 dark:border-dark-border/80 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-6">Item/Service</th>
                <th className="py-3 px-6 text-right">Qty</th>
                <th className="py-3 px-6 text-right">Price</th>
                <th className="py-3 px-6 text-right">Tax Amt</th>
                <th className="py-3 px-6 text-right">Total</th>
                <th className="py-3 px-6 text-left">Staff</th>
                <th className="py-3 px-6 text-right">Comm. %</th>
                <th className="py-3 px-6 text-right">Comm. Amt</th>
                <th className="py-3 px-6 text-right">Net Margin</th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium">
              {(row.items || []).map((item, idx) => {
                const qty = item.quantity || item.qty || 1;
                const price = item.price || 0;
                const amount = item.amount || (price * qty);
                const taxAmount = item.taxAmount || 0;
                const totalAmount = amount + taxAmount;
                
                // Get Staff Name
                const staffName = item.staffId?.name || item.staff?.name || defaultStaffName;

                // Calculate Commission
                let commissionPct = staffCommPctMap[staffName] || 0;

                const commissionAmt = (amount * commissionPct) / 100;
                const netMargin = totalAmount - commissionAmt;

                return (
                  <tr key={idx} className="border-b border-gray-100/50 dark:border-dark-border/30 last:border-0 hover:bg-gray-50 dark:hover:bg-dark-border/20 transition-colors">
                    <td className="py-3 px-6 text-gray-900 dark:text-white font-semibold">
                      {item.productName || item.serviceName || item.product?.name || item.name || "Item"}
                    </td>
                    <td className="py-3 px-6 text-right text-gray-500">x{qty}</td>
                    <td className="py-3 px-6 text-right text-gray-600 dark:text-gray-400 notranslate">{currencySymbol}{formatDisplayNumber(price)}</td>
                    <td className="py-3 px-6 text-right text-gray-500 notranslate">{currencySymbol}{formatDisplayNumber(taxAmount)}</td>
                    <td className="py-3 px-6 text-right font-black text-gray-900 dark:text-white notranslate">{currencySymbol}{formatDisplayNumber(totalAmount)}</td>
                    <td className="py-3 px-6 text-left">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        {staffName}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right">
                      {commissionPct > 0 ? (
                        <span className="text-purple-600 dark:text-purple-400 bg-purple-50/80 dark:bg-purple-500/10 px-2 py-0.5 rounded font-bold text-xs">
                          {commissionPct % 1 === 0 ? commissionPct : commissionPct.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-right font-black text-purple-600 dark:text-purple-400 notranslate">
                      {commissionAmt > 0 ? `${currencySymbol}${formatDisplayNumber(commissionAmt)}` : "-"}
                    </td>
                    <td className="py-3 px-6 text-right font-black text-emerald-600 dark:text-emerald-400 notranslate">
                      {currencySymbol}{formatDisplayNumber(netMargin)}
                    </td>
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
      title="Sales Margin Report"
      subtitle="Staff commission and net amount breakdown per invoice"
    >
      <ReportSummaryCard
        title="Margin Overview"
        totalValue={summaryData.total}
        totalLabel="Total Net Amount"
        totalCount={summaryData.count}
        segments={summaryData.segments}
        loading={loading}
        currencySymbol={currencySymbol}
        hideCountLabel={true}
      />

      <CustomTable
        columns={columns}
        data={tableData}
        expandable={true}
        expandedContent={renderExpandedRow}
        flushExpandedContent={true}
        loading={loading}
        onRefresh={fetchInvoices}
        isRefreshing={loading}
        onExport={hasPermission("reports:sales:margin_report:export") ? handleExport : undefined}
        pagination={{ ...pagination, onPageChange }}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={(val) =>
          setFilters((prev) => ({ ...prev, startDate: val }))
        }
        onEndDateChange={(val) =>
          setFilters((prev) => ({ ...prev, endDate: val }))
        }
        emptyMessage="No invoices found for this period."
        mobileMapper={{
          leading: (row) => (
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-400 border border-purple-100 font-bold text-sm">
              {row.invoiceNumber?.slice(-2) || "MR"}
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              #{row.invoiceNumber}
            </div>
          ),
          subtitle: (row) => (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              {row.staff?.name || row.createdBy?.name || "Owner"} •{" "}
              {new Date(row.createdAt).toLocaleDateString()} •{" "}
              {row._commission > 0 ? (
                <span className="text-purple-500">
                  Comm: {format(row._commission, false)} ({row._commissionPct}%)
                </span>
              ) : (
                <span className="text-gray-400 dark:text-gray-500">No Commission</span>
              )}
            </div>
          ),
          trailing: (row) => (
            <div className="text-right flex flex-col items-end gap-1">
              <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 notranslate">
                {format(row._netAmt, false)}
              </div>
              {row._commission > 0 ? (
                <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${row.isCommissionPaid ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "bg-amber-50 text-amber-600"}`}>
                  {row.isCommissionPaid ? "Settled" : "Pending"}
                </span>
              ) : (
                <span className="text-[8px] text-gray-400 dark:text-gray-500 font-medium">No Comm.</span>
              )}
            </div>
          ),
        }}
      />
    </ReportLayout>
  );
};

export default SalesMarginReport;
