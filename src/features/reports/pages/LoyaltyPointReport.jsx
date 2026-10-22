import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Award, Store, Phone, Receipt, Users } from "lucide-react";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import LedgerFilterModal from "../../../components/shared/LedgerFilterModal";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import CustomerLoyaltyBalancesSheet from "../../../components/shared/CustomerLoyaltyBalancesSheet";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { usePagination } from "../../../hooks/usePagination";
import { useCurrency } from "../../../hooks/useCurrency";
import { getUnifiedInvoicePayableTotal } from "../../../utils/unifiedInvoiceTotals";

const LoyaltyPointReport = () => {
  const { currencySymbol, hasPermission } = useAuth();
  const { formatDisplayNumber } = useCurrency();
  const [shops, setShops] = useState([]);
  const [services, setServices] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isBalancesSheetOpen, setIsBalancesSheetOpen] = useState(false);
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
      params.append("hasLoyaltyPoints", "true"); // Custom filter to fetch only invoices with points earned
      params.append("excludeLocalCustomer", "true"); // Exclude local customers
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
      console.error("Failed to fetch loyalty report:", err);
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
      params.append("hasLoyaltyPoints", "true");
      params.append("excludeLocalCustomer", "true");
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
    if (invoices.length > 0) {
      const totalPointsEarned = invoices.reduce((sum, inv) => sum + (inv.loyaltyPointsEarned || 0), 0);
      const totalSales = invoices.reduce((sum, inv) => sum + getUnifiedInvoicePayableTotal(inv), 0);

      return {
        total: totalSales,
        count: pagination.total || invoices.length,
        segments: [
          {
            label: "Contributed Sales",
            count: pagination.total || invoices.length,
            value: totalSales,
            color: "#6366f1",
            textColor: "text-indigo-600",
            hideCurrency: false
          },
          {
            label: "Total Points Earned",
            count: 0,
            value: totalPointsEarned,
            color: "#10b981",
            textColor: "text-emerald-600",
            hideCurrency: true,
            suffix: "Pts"
          },
        ],
      };
    }

    return {
      total: 0,
      count: 0,
      segments: [],
    };
  }, [invoices, pagination.total]);

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
      header: "Sales Amount",
      align: "right",
      exportValue: (row) => {
        const total = getUnifiedInvoicePayableTotal(row);
        return formatDisplayNumber(total);
      },
      render: (row) => {
        const total = getUnifiedInvoicePayableTotal(row);
        return (
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 notranslate">
              {currencySymbol}
              {formatDisplayNumber(total)}
            </span>
          </div>
        );
      },
    },
    {
      header: "Points Earned",
      align: "right",
      exportValue: (row) => `${Number(row.loyaltyPointsEarned || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} Points`,
      render: (row) => (
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1 bg-green-50 dark:bg-green-500/10 px-2 py-1 rounded-full border border-green-200 dark:border-green-500/20">
            <Award size={12} className="text-green-600 dark:text-green-400" />
            <span className="text-sm font-black text-green-600 dark:text-green-400">
              +{Number(row.loyaltyPointsEarned || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      ),
    },
  ];

  const activeFilterCount = Object.entries(filters).filter(([k, v]) =>
    k !== "startDate" && k !== "endDate" && (Array.isArray(v) ? v.length > 0 : !!v),
  ).length;

  return (
    <ReportLayout
      title="Loyalty Point Report"
      subtitle="Track customer loyalty points earned from sales"
    >
      <ReportSummaryCard
        title="Points Summary"
        totalValue={summaryData.total}
        totalCount={summaryData.count}
        segments={summaryData.segments}
        loading={loading}
      />

      <CustomTable
        columns={columns}
        data={invoices}
        loading={loading}
        onRefresh={fetchInvoices}
        isRefreshing={loading}
        onExport={hasPermission("reports:crm:loyalty_report:export") ? handleExport : undefined}
        headerActions={
            <button
              onClick={() => setIsBalancesSheetOpen(true)}
              className="h-10 w-10 md:h-9 md:w-auto md:px-3.5 flex items-center justify-center gap-2 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all hover:bg-gray-50 dark:hover:bg-dark-border hover:border-brand-primary/20 active:scale-95 text-[10px] uppercase tracking-wider shrink-0 shadow-none relative group"
            >
              <Users className="w-4 h-4 md:w-3 md:h-3 text-brand-primary dark:text-blue-400" />
              <span className="hidden md:inline">Customer Balances</span>
            </button>
        }
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={(val) => setFilters((prev) => ({ ...prev, startDate: val }))}
        onEndDateChange={(val) => setFilters((prev) => ({ ...prev, endDate: val }))}
        pagination={{
          ...pagination,
          onPageChange,
        }}
        emptyMessage="No loyalty points earned in this period."
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        onFilterClick={() => setIsFilterModalOpen(true)}
        filterCount={activeFilterCount}
        mobileMapper={{
          leading: (row) => (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center border font-black bg-green-50 dark:bg-green-900/20 text-green-500 border-green-100">
              <Award size={22} />
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              {row.customer?.name || row.user?.name || "LOCAL CUSTOMER"}
            </div>
          ),
          subtitle: (row) => {
            return (
              <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                #{row.invoiceNumber} •{" "}
                {new Date(row.createdAt || row.date).toLocaleDateString()}
              </div>
            );
          },
          trailing: (row) => (
            <div className="text-right flex flex-col items-end">
              <div className="text-sm font-black text-green-600 dark:text-green-400">
                +{Number(row.loyaltyPointsEarned || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} Pts
              </div>
              <span className="text-[10px] text-gray-400 font-bold uppercase">
                {currencySymbol}{formatDisplayNumber(getUnifiedInvoicePayableTotal(row))}
              </span>
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

      <CustomerLoyaltyBalancesSheet
        isOpen={isBalancesSheetOpen}
        onClose={() => setIsBalancesSheetOpen(false)}
      />
    </ReportLayout>
  );
};

export default LoyaltyPointReport;
