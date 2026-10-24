import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { useCurrency } from "../../../hooks/useCurrency";

import { ArrowDownCircle, ArrowUpCircle, Landmark } from "lucide-react";
import InlineSearchSelect from "../../../components/shared/InlineSearchSelect";
import { usePagination } from "../../../hooks/usePagination";
import ReportLayout from "../../../components/shared/ReportLayout";

const AccountStatementPage = () => {
  useAuth();
  const { currencySymbol, formatDisplayNumber } = useCurrency();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const today = new Date().toLocaleDateString("en-CA");
  const [filters, setFilters] = useState({
    startDate: today,
    endDate: today,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [includeOpening, setIncludeOpening] = useState(false);

  const { pagination, onPageChange, updatePagination, resetPagination } =
    usePagination({ initialLimit: 20 });

  useEffect(() => {
    api.get("/chart-of-accounts").then((r) => {
      if (r.data.success) setAccounts(r.data.data);
    });
  }, []);

  const filterStart = filters.startDate;
  const filterEnd = filters.endDate;

  const fetchData = useCallback(async () => {
    if (!selectedAccount) {
      setData([]);
      setSummary({});
      return;
    }
    try {
      setLoading(true);
      const params = new URLSearchParams({
        accountId: selectedAccount,
        page: pagination.page,
        limit: pagination.limit,
      });
      if (filterStart) params.append("startDate", filterStart);
      if (filterEnd) params.append("endDate", filterEnd);
      if (searchTerm) params.append("search", searchTerm);

      const res = await api.get(
        `/account-transactions/account-statement?${params}`,
      );
      if (res.data.success) {
        setData(res.data.data || []);
        setSummary(res.data.summary || {});
        updatePagination(res.data.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [
    selectedAccount,
    filterStart,
    filterEnd,
    searchTerm,
    pagination.page,
    pagination.limit,
    updatePagination,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    resetPagination();
  }, [selectedAccount, filterStart, filterEnd, searchTerm, resetPagination]);

  const filteredData = useMemo(() => {
    let baseData = data;
    if (includeOpening && summary && typeof summary.openingBalance === "number" && pagination.page === 1) {
      const openingRow = {
        _id: 'opening-balance',
        date: filters.startDate || new Date(0).toISOString(),
        documentId: 'OPENING',
        voucherType: 'opening',
        narration: 'Opening Balance',
        debit: summary.openingBalance > 0 ? summary.openingBalance : 0,
        credit: summary.openingBalance < 0 ? Math.abs(summary.openingBalance) : 0,
        balance: summary.openingBalance
      };
      return [openingRow, ...baseData];
    }
    return baseData;
  }, [data, includeOpening, summary, pagination.page, filters.startDate]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        accountId: selectedAccount,
        page: 1,
        limit: 100000,
      });
      if (filterStart) params.append("startDate", filterStart);
      if (filterEnd) params.append("endDate", filterEnd);
      if (searchTerm) params.append("search", searchTerm);

      const res = await api.get(
        `/account-transactions/account-statement?${params}`,
      );
      return res.data.success ? res.data.data : [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const summaryData = useMemo(() => {
    if (!summary.accountName) return null;
    return {
      total: summary.balance || 0,
      count: pagination.total,
      segments: [
        {
          id: "opening",
          label: "Opening Balance",
          value: summary.openingBalance || 0,
          color: "#94a3b8", // Use matched gray color
          inProgressBar: true,
        },
        {
          id: "debit",
          label: "Total Debit (Out)",
          value: summary.totalDebit || 0,
          color: "#ef4444",
          inProgressBar: true,
          forceDrCr: "Dr",
        },
        {
          id: "credit",
          label: "Total Credit (In)",
          value: summary.totalCredit || 0,
          color: "#10b981",
          inProgressBar: true,
          forceDrCr: "Cr",
        },
      ],
    };
  }, [summary, pagination.total]);

  const columns = [
    {
      header: "Date",
      exportValue: (r) => new Date(r.date).toLocaleDateString(),
      render: (r) => (
        <span className="text-sm font-bold text-gray-900 dark:text-white">
          {new Date(r.date).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "Document ID",
      exportValue: (r) => r.documentId || r.voucherNumber,
      render: (r) => (
        <span className="font-mono text-xs text-brand-primary dark:text-blue-400 font-bold uppercase tracking-wider">
          {r.documentId || r.voucherNumber}
        </span>
      ),
    },
    {
      header: "Type",
      exportValue: (r) => r.voucherType,
      render: (r) => (
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
          ${
            r.voucherType === "receipt"
              ? "bg-emerald-50 text-emerald-600 dark:text-emerald-400 border border-emerald-100"
              : r.voucherType === "payment"
                ? "bg-rose-50 text-rose-600 border border-rose-100"
                : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 border border-blue-100"
          }`}
        >
          {r.voucherType}
        </span>
      ),
    },
    {
      header: "Narration",
      exportValue: (r) => r.narration || "—",
      render: (r) => (
        <span
          className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[250px] truncate block"
          title={r.narration}
        >
          {r.narration || "—"}
        </span>
      ),
    },
    {
      header: "Debit (Dr)",
      align: "right",
      exportValue: (r) => r.debit ? formatDisplayNumber(r.debit) : "—",
      render: (r) => (
        <span
          className={`text-sm font-bold notranslate ${r.debit > 0 ? "text-gray-900 dark:text-white" : "text-gray-300"}`}
        >
          {r.debit
            ? `${currencySymbol}${formatDisplayNumber(r.debit)}`
            : "—"}
        </span>
      ),
    },
    {
      header: "Credit (Cr)",
      align: "right",
      exportValue: (r) => r.credit ? formatDisplayNumber(r.credit) : "—",
      render: (r) => (
        <span
          className={`text-sm font-bold notranslate ${r.credit > 0 ? "text-gray-900 dark:text-white" : "text-gray-300"}`}
        >
          {r.credit
            ? `${currencySymbol}${formatDisplayNumber(r.credit)}`
            : "—"}
        </span>
      ),
    },
    {
      header: "Balance",
      align: "right",
      exportValue: (r) => {
        const val = r.balance || 0;
        return `${val >= 0 ? "Dr" : "Cr"} ${formatDisplayNumber(Math.abs(val))}`;
      },
      render: (r) => {
        const val = r.balance || 0;
        return (
          <span className={`text-sm font-black notranslate ${val < 0 ? "text-rose-600" : "text-emerald-600 dark:text-emerald-400"}`}>
            <span className="mr-1 text-[10px] opacity-70">
              {val >= 0 ? "Dr" : "Cr"}
            </span>
            {currencySymbol}
            {formatDisplayNumber(Math.abs(val))}
          </span>
        );
      },
    },
  ];

  return (
    <ReportLayout title="Account Statement" subtitle="View transaction history for specific accounts">
      {summaryData && (
        <ReportSummaryCard
          title={`${summary.accountCode ? `[${summary.accountCode}] ` : ""}${summary.accountName} Ledger`}
          totalValue={summaryData.total}
          totalCount={summaryData.count}
          segments={summaryData.segments}
          loading={loading}
          currencySymbol={currencySymbol}
          showDrCr={true}
          maxBarValue={
            Math.abs(summary.openingBalance || 0) +
            (summary.totalDebit || 0) +
            (summary.totalCredit || 0)
          }
        />
      )}

      <CustomTable
        columns={columns}
        data={filteredData}
        loading={loading}
        onRefresh={fetchData}
        isRefreshing={loading}
        onExport={handleExport}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={(val) => setFilters((prev) => ({ ...prev, startDate: val }))}
        onEndDateChange={(val) => setFilters((prev) => ({ ...prev, endDate: val }))}
        emptyMessage={
          selectedAccount
            ? "No transactions found."
            : "Select an account to view ledger."
        }
        pagination={{
          ...pagination,
          onPageChange,
        }}
        headerActions={
          summary && summary.accountName && (
            <div className="flex gap-2 items-center">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-700 dark:text-gray-300 mr-2 cursor-pointer uppercase tracking-wide">
                <input
                  type="checkbox"
                  checked={includeOpening}
                  onChange={(e) => setIncludeOpening(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-brand-primary focus:ring-brand-primary dark:bg-dark-surface cursor-pointer w-3.5 h-3.5"
                />
                Include Opening
              </label>
            </div>
          )
        }
        extraFilters={
          <div className="flex items-center gap-2 bg-white dark:bg-dark-surface px-3 py-2 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm w-full md:min-w-[260px] md:w-auto">
            <Landmark size={14} className="text-brand-primary dark:text-blue-400 flex-shrink-0" />
            <InlineSearchSelect
              options={accounts
                .filter((a) => (a.level === 3 || a.level === 4) && a.name !== "LOCAL CUSTOMER")
                .map((a) => ({
                  value: a._id,
                  label: (
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="truncate">{`${a.code ? `[${a.code}] ` : ""}${a.name}`}</span>
                      <span className="text-[9px] bg-gray-100 dark:bg-dark-card text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider flex-shrink-0">
                        {a.type}
                      </span>
                    </div>
                  ),
                  displayValue: `${a.code ? `[${a.code}] ` : ""}${a.name}`,
                  searchValue: `${a.code || ""} ${a.name} ${a.type}`,
                }))}
              value={selectedAccount}
              onChange={setSelectedAccount}
              placeholder="Search accounts..."
              className="text-[11px] font-bold text-gray-700 dark:text-gray-300 bg-transparent border-none py-0"
              allowClear
              dropdownWidth="320px"
            />
          </div>
        }
        mobileMapper={{
          leading: (row) => (
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold border
                ${
                  row.voucherType === "receipt"
                    ? "bg-emerald-50 text-emerald-400 border-emerald-100"
                    : row.voucherType === "payment"
                      ? "bg-rose-50 text-rose-400 border-rose-100"
                      : "bg-blue-50 dark:bg-blue-900/20 text-blue-400 border-blue-100"
                }`}
            >
              {row.voucherType === "receipt" ? (
                <ArrowDownCircle size={22} />
              ) : (
                <ArrowUpCircle size={22} />
              )}
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm truncate">
              {row.documentId || row.voucherNumber}
            </div>
          ),
          subtitle: (row) => (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              {row.voucherType} • {new Date(row.date).toLocaleDateString()}
            </div>
          ),
          trailing: (row) => (
            <div className="text-right">
              <div className="text-sm font-black text-gray-900 dark:text-white">
                {currencySymbol}
                {row.balance?.toLocaleString()}
              </div>
              {row.debit > 0 ? (
                <span className="text-[8px] text-rose-500 font-bold uppercase">
                  Debit: {currencySymbol}
                  {row.debit}
                </span>
              ) : (
                <span className="text-[8px] text-emerald-500 font-bold uppercase">
                  Credit: {currencySymbol}
                  {row.credit}
                </span>
              )}
            </div>
          ),
        }}
      />
    </ReportLayout>
  );
};

export default AccountStatementPage;
