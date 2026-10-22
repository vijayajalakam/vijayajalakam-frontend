import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Receipt, Store, Phone } from "lucide-react";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import LedgerFilterModal from "../../../components/shared/LedgerFilterModal";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { usePagination } from "../../../hooks/usePagination";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  getUnifiedInvoicePayableTotal,
  getUnifiedInvoiceRoundOff,
} from "../../../utils/unifiedInvoiceTotals";

const CustomerInvoiceReport = () => {
  const { currencySymbol, hasPermission, enableRoundOff } = useAuth();
  const { formatDisplayNumber } = useCurrency();
  const [shops, setShops] = useState([]);
  const [services, setServices] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { pagination, onPageChange, updatePagination, resetPagination } =
    usePagination({ initialLimit: 20 });
  const [reportSummary, setReportSummary] = useState(null);
  const today = new Date().toLocaleDateString("en-CA");
  const [filters, setFilters] = useState({
    startDate: today,
    endDate: today,
    customers: [],
    shops: [],
    services: [],
    staff: [],
    paymentMethod: [],
  });

  const loadInitialData = useCallback(async () => {
    try {
      const [custRes, shopRes, servRes, staffRes, pmRes] = await Promise.all([
        api.get("/admin/customers"),
        api.get("/shops"),
        api.get("/admin/services"),
        api.get("/admin/staff"),
        api.get("/payment-methods"),
      ]);

      if (custRes.data.success) setCustomers(custRes.data.data);
      if (shopRes.data.success) setShops(shopRes.data.data);
      if (servRes.data.success) setServices(servRes.data.data);
      if (staffRes.data.success) setStaffList(staffRes.data.data);
      if (pmRes.data.success) setPaymentMethods(pmRes.data.data);
    } catch (err) {
      console.error("Failed to fetch initial data:", err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", pagination.page);
      params.append("limit", pagination.limit);
      if (searchTerm) params.append("search", searchTerm);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.customers?.length > 0)
        params.append("customerId", filters.customers.join(","));
      if (filters.shops?.length > 0)
        params.append("shops", filters.shops.join(","));
      if (filters.services?.length > 0)
        params.append("services", filters.services.join(","));
      if (filters.staff?.length > 0)
        params.append("staffId", filters.staff.join(","));
      if (filters.paymentMethod?.length > 0) {
        const pms = filters.paymentMethod;
        if (!pms.includes("DUE")) {
          params.append("paymentStatus", "Paid");
          params.append("paymentMethod", pms.join(","));
        } else if (pms.length === 1 && pms[0] === "DUE") {
          params.append("isPendingOnly", "true");
        } else {
          params.append("paymentMethod", pms.join(","));
        }
      }

      const res = await api.get(`/invoices?${params.toString()}`);
      if (res.data.success) {
        setInvoices(res.data.data || []);
        if (res.data.summary) setReportSummary(res.data.summary);
        updatePagination(res.data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch ledger report:", err);
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

  // Reset page when filters or searchTerm changes
  useEffect(() => {
    resetPagination();
  }, [filters, searchTerm, resetPagination]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append("page", 1);
      params.append("limit", 100000);
      if (searchTerm) params.append("search", searchTerm);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.customers?.length > 0)
        params.append("customerId", filters.customers.join(","));
      if (filters.shops?.length > 0)
        params.append("shops", filters.shops.join(","));
      if (filters.services?.length > 0)
        params.append("services", filters.services.join(","));
      if (filters.staff?.length > 0)
        params.append("staffId", filters.staff.join(","));
      if (filters.paymentMethod?.length > 0) {
        const pms = filters.paymentMethod;
        if (!pms.includes("DUE")) {
          params.append("paymentStatus", "Paid");
          params.append("paymentMethod", pms.join(","));
        } else if (pms.length === 1 && pms[0] === "DUE") {
          params.append("isPendingOnly", "true");
        } else {
          params.append("paymentMethod", pms.join(","));
        }
      }

      const res = await api.get(`/invoices?${params.toString()}`);
      return res.data.success ? res.data.data : [];
    } catch (err) {
      console.error("Export fetch failed", err);
      return [];
    }
  };

  const summaryData = useMemo(() => {
    if (reportSummary) {
      return {
        total: reportSummary.total,
        count: reportSummary.counts?.all || pagination.total,
        segments: [
          {
            label: "Collected",
            count: reportSummary.counts?.paid || 0,
            value: reportSummary.paid,
            color: "#10b981",
            textColor: "text-emerald-600",
          },
          {
            label: "Outstanding",
            count:
              (reportSummary.counts?.partial || 0) +
              (reportSummary.counts?.pending || 0),
            value: reportSummary.due,
            color: "#ef4444",
            textColor: "text-rose-600",
          },
        ],
      };
    }

    return {
      total: 0,
      count: 0,
      segments: [],
    };
  }, [reportSummary, pagination.total]);

  const columns = [
    {
      header: "Invoice",
      exportValue: (row) =>
        `#${row.invoiceNumber} (${new Date(row.date || row.createdAt).toLocaleDateString()})`,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
            #{row.invoiceNumber}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-tight">
              {new Date(row.date || row.createdAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric"
              })}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Customer",
      exportValue: (row) => {
        const cust = row.customer || row.user;
        return `${cust?.name || "LOCAL CUSTOMER"} (${cust?.phone || "N/A"})`;
      },
      render: (row) => {
        const cust = row.customer || row.user;
        return (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
              {cust?.name || "LOCAL CUSTOMER"}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium flex items-center gap-1">
              <Phone size={10} strokeWidth={3} /> {cust?.phone || "N/A"}
            </span>
          </div>
        );
      },
    },
    {
      header: "Services & Shop",
      exportValue: (row) => {
        const services = row.appointment?.services
          ?.map((s) => s.serviceId?.name || s.name)
          .join(", ");
        const products = row.items?.map((i) => i.productName).join(", ");
        const allItems = [services, products].filter(Boolean).join(", ");
        return `${row.branchId?.name || row.shopId?.name || "N/A"} | ${allItems || "No items"}`;
      },
      render: (row) => {
        const shopName = row.branchId?.name || row.shopId?.name || "N/A";

        const mergedItems = {};
        
        // Process items (Source of truth for the invoice)
        (row.items || []).forEach(item => {
          const name = item.productName || "N/A";
          const qty = item.quantity || 1;
          const isProduct = !!item.productId;
          if (!mergedItems[name]) {
            mergedItems[name] = { count: qty, type: isProduct ? 'product' : 'service' };
          } else {
            mergedItems[name].count += qty;
          }
        });

        // Add services from appointment if not already in items (fallback)
        (row.appointment?.services || []).forEach(s => {
          const name = s.serviceId?.name || s.name;
          if (name && !mergedItems[name]) {
            mergedItems[name] = { count: 1, type: 'service' };
          }
        });

        const itemEntries = Object.entries(mergedItems);

        return (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
              <Store size={10} className="text-gray-400 dark:text-gray-500" />
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest truncate max-w-[120px]">
                {shopName}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {itemEntries.slice(0, 4).map(([name, data], i) => (
                <span
                  key={i}
                  className={`px-1.5 py-0.5 text-[9px] font-bold rounded border uppercase tracking-tighter
                    ${data.type === 'service' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'}`}
                >
                  {name}{data.count > 1 ? ` *${data.count}` : ""}
                </span>
              ))}
              {itemEntries.length > 4 && (
                <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold self-center ml-1">
                  +{itemEntries.length - 4}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: "Method",
      exportValue: (row) => {
        let methods = new Set();
        if (row.dueAmount > 0) {
          methods.add("DUE");
        } else {
          if (row.paymentMethod) methods.add(row.paymentMethod);
          if (row.payments?.length > 0) row.payments.forEach(p => methods.add(p.method));
          methods.delete("SPLIT");
        }
        return Array.from(methods).join(", ") || "N/A";
      },
      render: (row) => {
        let methods = new Set();
        if (row.dueAmount > 0) {
          methods.add("DUE");
        } else {
          if (row.paymentMethod) methods.add(row.paymentMethod);
          if (row.payments?.length > 0) row.payments.forEach(p => methods.add(p.method));
          methods.delete("SPLIT");
        }
        const methodList = Array.from(methods);

        return (
          <div className="flex flex-wrap gap-1">
            {methodList.length > 0 ? (
              methodList.map((m, i) => (
                <span
                  key={i}
                  className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border
                    ${m === "DUE" ? "bg-rose-50 text-rose-500 border-rose-100" : "bg-gray-50 dark:bg-dark-card text-gray-600 dark:text-gray-400 border-gray-100 dark:border-dark-border"}`}
                >
                  {m}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold tracking-widest uppercase">N/A</span>
            )}
          </div>
        );
      },
    },
    ...(enableRoundOff
      ? [
          {
            header: "Round-off",
            align: "right",
            exportValue: (row) => {
              const r = getUnifiedInvoiceRoundOff(row);
              return Math.abs(r) < 0.0001 ? "" : formatDisplayNumber(r);
            },
            render: (row) => {
              const r = getUnifiedInvoiceRoundOff(row);
              if (Math.abs(r) < 0.0001) {
                return (
                  <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                );
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
      header: "Financials",
      align: "right",
      exportValue: (row) => {
        const total = getUnifiedInvoicePayableTotal(row);
        const due = row.dueAmount || 0;
        return `${formatDisplayNumber(total)}${due > 0 ? ` (Due: ${formatDisplayNumber(due)})` : ""}`;
      },
      render: (row) => {
        const total = getUnifiedInvoicePayableTotal(row);
        return (
          <div className="flex flex-col items-end">
            <span className="text-sm font-black text-gray-900 dark:text-white notranslate">
              {currencySymbol}
              {formatDisplayNumber(total)}
            </span>
            {row.dueAmount > 0 && (
              <span className="text-[10px] text-rose-500 font-bold uppercase tracking-tighter">
                Due: {currencySymbol}
                {formatDisplayNumber(row.dueAmount)}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  const activeFilterCount = Object.entries(filters).filter(([k, v]) =>
    k !== "startDate" && k !== "endDate" && (Array.isArray(v) ? v.length > 0 : !!v),
  ).length;

  return (
    <ReportLayout
      title="Customer Invoice Report"
      subtitle="Deep dive into customer payment history"
    >
      <ReportSummaryCard
        title="Invoice Summary"
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
        onExport={hasPermission("reports:crm:customer_ledger:export") ? handleExport : undefined}
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={(val) => setFilters((prev) => ({ ...prev, startDate: val }))}
        onEndDateChange={(val) => setFilters((prev) => ({ ...prev, endDate: val }))}
        pagination={{
          ...pagination,
          onPageChange,
        }}
        emptyMessage="No ledger records found."
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        onFilterClick={() => setIsFilterModalOpen(true)}
        filterCount={activeFilterCount}
        mobileMapper={{
          leading: (row) => (
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center border font-black
                            ${row.dueAmount > 0 ? "bg-rose-50 text-rose-400 border-rose-100" : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-400 border-emerald-100"}`}
            >
              <Receipt size={22} />
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              {row.invoiceNumber}
            </div>
          ),
          subtitle: (row) => {
            const cust = row.customer || row.user;
            return (
              <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                {cust?.name || "LOCAL CUSTOMER"} •{" "}
                {new Date(row.createdAt || row.date).toLocaleDateString()}
              </div>
            );
          },
          trailing: (row) => (
            <div className="text-right">
              <div className="text-sm font-black text-gray-900 dark:text-white">
                {currencySymbol}
                {formatDisplayNumber(getUnifiedInvoicePayableTotal(row))}
              </div>
              {row.dueAmount > 0 && (
                <span className="text-[8px] text-rose-500 font-bold uppercase">
                  Due: {currencySymbol}
                  {formatDisplayNumber(row.dueAmount)}
                </span>
              )}
            </div>
          ),
        }}
      />

      <LedgerFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={setFilters}
        customers={customers}
        shops={shops}
        services={services}
        staff={staffList}
        paymentMethods={paymentMethods}
        initialFilters={filters}
      />
    </ReportLayout>
  );
};

export default CustomerInvoiceReport;
