import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { appApi } from "../../../store/api/appApi";
import { 
  useGetAccountTransactionsQuery, 
  useGetChartOfAccountsQuery,
  useCreateAccountTransactionMutation,
  useUpdateAccountTransactionMutation,
  useDeleteAccountTransactionMutation
} from "../../../store/api/accountingEndpoints";
import { 
  useGetAdminStaffQuery, 
  useGetAdminCustomersQuery, 
  useGetSuppliersQuery 
} from "../../../store/api/tenantCrudEndpoints";
import { useGetShopsQuery } from "../../../store/api/tenantEndpoints";
import { rtkErrorMessage } from "../../../store/api/rtkUtils";
import CustomTable from "../../../components/shared/CustomTable";
import Modal from "../../../components/shared/Modal";
import StatsGrid from "../../../components/shared/StatsGrid";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import CustomTextField from "../../../components/shared/CustomTextField";
import CustomDropdown from "../../../components/shared/CustomDropdown";
import SearchableSelect from "../../../components/shared/SearchableSelect";
import Snackbar from "../../../components/shared/Snackbar";
import AccountingFilterModal from "../../../components/shared/AccountingFilterModal";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  FileText,
  DollarSign,
  Edit3,
  Trash2,
  Calendar,
  Hash,
  FileEdit,
  Plus,
  Loader2,
  Store,
} from "lucide-react";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import {
  TableSkeleton,
  StatsSkeleton,
} from "../../../components/shared/Skeleton";

const TransactionPage = ({ type, title, icon: Icon }) => {
  const { user, currencySymbol, hasPermission, isAdmin } = useAuth();
  const dispatch = useDispatch();
  
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [txnToDelete, setTxnToDelete] = useState(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  
  const today = new Date().toLocaleDateString("en-CA");
  const [filters, setFilters] = useState({
    startDate: today,
    endDate: today,
    branches: [],
  });

  const initialFormState = {
    voucherType: type,
    date: new Date().toISOString().split("T")[0],
    debitAccount: "",
    creditAccount: "",
    amount: "",
    narration: "",
    shopId: "",
  };

  const [form, setForm] = useState(initialFormState);

  const params = new URLSearchParams({ type });
  if (filters.branches?.length > 0)
    params.append("branchId", filters.branches.join(","));
  if (filters.startDate) params.append("startDate", filters.startDate);
  if (filters.endDate) params.append("endDate", filters.endDate);
  const queryString = params.toString();

  const { data: txData, isLoading: txLoading, refetch: refetchTx } = useGetAccountTransactionsQuery(queryString);
  const { data: accData, isLoading: accLoading } = useGetChartOfAccountsQuery();
  const { data: staffData, isLoading: staffLoading } = useGetAdminStaffQuery("skipStats=true");
  const { data: custData, isLoading: custLoading } = useGetAdminCustomersQuery("reconcile=false");
  const { data: suppData, isLoading: suppLoading } = useGetSuppliersQuery();
  const { data: shopsData, isLoading: shopsLoading } = useGetShopsQuery();

  const [createTransaction] = useCreateAccountTransactionMutation();
  const [updateTransaction] = useUpdateAccountTransactionMutation();
  const [deleteTransactionMut] = useDeleteAccountTransactionMutation();

  const transactions = txData?.data || [];
  const summary = txData?.summary || { totalCount: 0, totalAmount: 0 };
  const accounts = accData || [];
  const staff = staffData || [];
  const customers = custData || [];
  const suppliers = suppData || [];
  const shops = shopsData || [];

  const loading = txLoading || accLoading || staffLoading || custLoading || suppLoading || shopsLoading;

  const fetchData = React.useCallback(() => {
    refetchTx();
  }, [refetchTx]);

  useEffect(() => {
    if (!editingId && !form.shopId && shops.length > 0) {
      const availableShops = shops.filter((s) => {
        if (user?.role !== "staff") return true;
        const userBranchId = user?.branchId?._id || user?.branchId;
        return s._id === userBranchId;
      });
      if (availableShops.length > 0) {
        setForm((prev) => ({ ...prev, shopId: availableShops[0]._id }));
      }
    }
  }, [user, editingId, shops, form.shopId]);

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  // System Account Codes
  const SYSTEM_ACCOUNTS = {
    CASH: "1101",
    BANK: "1102",
    RECEIVABLE: "1103", // Customers
    PAYABLE: "2101", // Suppliers
    COMMISSION: "2102", // Staff (Liability)
  };

  const findSystemAccId = (code) => accounts.find((a) => a.code === code)?._id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!form.shopId) {
      showSnack("Branch selection is required", "error");
      return;
    }

    if (!form.debitAccount || !form.creditAccount || !form.amount) {
      showSnack("Please select both accounts and enter an amount", "error");
      return;
    }

    const payload = {
      voucherType: type,
      date: form.date,
      debitAccount: form.debitAccount,
      creditAccount: form.creditAccount,
      amount: form.amount,
      narration: form.narration,
      shopId: form.shopId,
      branchId: form.shopId,
    };

    try {
      setIsSubmitting(true);
      if (editingId) {
        await updateTransaction({ id: editingId, body: payload }).unwrap();
      } else {
        await createTransaction(payload).unwrap();
      }
      dispatch(appApi.util.invalidateTags(["CounterSession", "Dashboard", "AccountTransaction"]));
      setShowModal(false);
      setForm(initialFormState);
      setEditingId(null);
    } catch (err) {
      showSnack(rtkErrorMessage(err, "Error saving transaction"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (txn) => {
    setEditingId(txn._id);

    // Reconstruct prefixed values for dropdowns if it's an entity
    const dPre =
      txn.debitEntityModel === "User"
        ? staff.find((s) => s._id === txn.debitEntityId)
          ? "staff-"
          : "cust-"
        : txn.debitEntityModel === "Supplier"
          ? "supp-"
          : "";
    const cPre =
      txn.creditEntityModel === "User"
        ? staff.find((s) => s._id === txn.creditEntityId)
          ? "staff-"
          : "cust-"
        : txn.creditEntityModel === "Supplier"
          ? "supp-"
          : "";

    setForm({
      voucherType: txn.type,
      date: new Date(txn.date).toISOString().split("T")[0],
      debitAccount: txn.debitEntityId
        ? `${dPre}${txn.debitEntityId}`
        : txn.debitAccount?._id || txn.debitAccount || "",
      creditAccount: txn.creditEntityId
        ? `${cPre}${txn.creditEntityId}`
        : txn.creditAccount?._id || txn.creditAccount || "",
      amount: txn.amount,
      narration: txn.narration || "",
      shopId: txn.shopId?._id || txn.shopId || "",
    });
    setShowModal(true);
  };

  const confirmDelete = (txn) => {
    setTxnToDelete(txn);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!txnToDelete) return;
    try {
      await deleteTransactionMut({ id: txnToDelete._id, type }).unwrap();
      dispatch(appApi.util.invalidateTags(["CounterSession", "Dashboard", "AccountTransaction"]));
      setIsDeleteModalOpen(false);
      setTxnToDelete(null);
    } catch (err) {
      const msg = rtkErrorMessage(err, "Failed to delete transaction");
      showSnack(msg, "error");
    }
  };

  const totalAmount = summary.totalAmount;
  const filtered = transactions.filter(
    (t) =>
      !searchTerm ||
      t.voucherNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.narration?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const stats = [
    {
      label: `Total ${title}s`,
      value: summary.totalCount,
      icon: Icon || FileText,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Total Amount",
      value: (
        <span className="notranslate">
          {currencySymbol}
          {totalAmount.toLocaleString()}
        </span>
      ),
      icon: DollarSign,
      color: "bg-emerald-50 text-emerald-600",
    },
  ];

  const getAccountLabels = () => {
    switch (type) {
      case "receipt":
        return { debit: "Deposit To (To)", credit: "Received From (From)" };
      case "payment":
        return { debit: "Paid To (To)", credit: "Paid From (From)" };
      default:
        return { debit: "To Account (Debit)", credit: "From Account (Credit)" };
    }
  };
  const labels = getAccountLabels();

  // Helper to determine if an account is a Cash or Bank account
  const isCashOrBankAccount = (acc, accountList = accounts) => {
    if (!acc) return false;

    // Check system code matches
    if (acc.code === SYSTEM_ACCOUNTS.CASH || acc.code === SYSTEM_ACCOUNTS.BANK) return true;
    if (acc.code === "1101" || acc.code === "1102") return true;

    // Check code prefix (e.g. 1101xx, 1102xx)
    if (typeof acc.code === "string" && (acc.code.startsWith("1101") || acc.code.startsWith("1102"))) {
      return true;
    }

    // Check populated parentAccount
    const pCode = acc.parentAccount?.code;
    if (pCode === SYSTEM_ACCOUNTS.CASH || pCode === SYSTEM_ACCOUNTS.BANK || pCode === "1101" || pCode === "1102") {
      return true;
    }
    const pName = (acc.parentAccount?.name || "").toLowerCase();
    if (pName.includes("cash") || pName.includes("bank")) {
      return true;
    }

    // Trace parent hierarchy if parentAccount is an ID or reference
    let currentParentId = typeof acc.parentAccount === "object" ? acc.parentAccount?._id : acc.parentAccount;
    let depth = 0;
    while (currentParentId && depth < 5) {
      const parent = accountList.find((a) => String(a._id) === String(currentParentId));
      if (!parent) break;
      if (
        parent.code === SYSTEM_ACCOUNTS.CASH ||
        parent.code === SYSTEM_ACCOUNTS.BANK ||
        parent.code === "1101" ||
        parent.code === "1102" ||
        (typeof parent.code === "string" && (parent.code.startsWith("1101") || parent.code.startsWith("1102")))
      ) {
        return true;
      }
      const parentName = (parent.name || "").toLowerCase();
      if (parentName.includes("cash") || parentName.includes("bank")) {
        return true;
      }
      currentParentId = typeof parent.parentAccount === "object" ? parent.parentAccount?._id : parent.parentAccount;
      depth++;
    }

    // Asset account with name or subType mentioning cash or bank
    if (acc.type === "Asset") {
      const name = (acc.name || "").toLowerCase();
      const subType = (acc.subType || "").toLowerCase();
      if (name.includes("cash") || name.includes("bank")) return true;
      if (subType.includes("cash") || subType.includes("bank")) return true;
      if (acc.accountNumber) return true;
    }

    return false;
  };

  // Get Cash & Bank options from Chart of Accounts
  const getCashAndBankOptions = () => {
    return accounts
      .filter(
        (a) =>
          (a.level || 3) >= 3 &&
          a.name !== "LOCAL CUSTOMER" &&
          isCashOrBankAccount(a, accounts),
      )
      .map((a) => ({
        value: a._id,
        label: `${a.code} - ${a.name}`,
      }));
  };

  // Combined options (Accounts, Staff, Customers, Suppliers) for a branch
  const getUnifiedOptionsWithBranch = (branchId) => {
    return [
      ...accounts
        .filter(
          (a) => (a.level || 3) >= 3 && a.name !== "LOCAL CUSTOMER",
        )
        .map((a) => ({
          value: a._id,
          label: `${a.code} - ${a.name}`,
        })),
      ...staff
        .filter((s) => {
          if (!branchId) return true;
          return (
            s.branchId === branchId ||
            (s.branchId?._id || s.branchId) === branchId
          );
        })
        .map((s) => ({
          value: `staff-${s._id}`,
          label: `${s.name} (Staff)`,
          accountId: findSystemAccId(SYSTEM_ACCOUNTS.COMMISSION),
          entityId: s._id,
          entityModel: "User",
          entityName: s.name,
          entityType: "Staff",
        })),
      ...customers
        .filter((c) => c.name !== "LOCAL CUSTOMER")
        .map((c) => ({
          value: `cust-${c._id}`,
          label: `${c.name} (Customer)`,
          accountId: findSystemAccId(SYSTEM_ACCOUNTS.RECEIVABLE),
          entityId: c._id,
          entityModel: "User",
          entityName: c.name,
          entityType: "Customer",
        })),
      ...suppliers
        .filter((s) => {
          if (!branchId) return true;
          return s.branches?.some(
            (b) => (b._id || b) === branchId || b === branchId,
          );
        })
        .map((s) => ({
          value: `supp-${s._id}`,
          label: `${s.name} (Supplier)`,
          accountId: findSystemAccId(SYSTEM_ACCOUNTS.PAYABLE),
          entityId: s._id,
          entityModel: "Supplier",
          entityName: s.name,
          entityType: "Supplier",
        })),
    ];
  };

  // Debit options based on voucher type
  const getDebitOptions = (branchId = form.shopId) => {
    if (type === "receipt") {
      return getCashAndBankOptions();
    }
    return getUnifiedOptionsWithBranch(branchId);
  };

  // Credit options based on voucher type (Payment vouchers pay FROM Cash or Bank only)
  const getCreditOptions = (branchId = form.shopId) => {
    if (type === "payment") {
      return getCashAndBankOptions();
    }
    return getUnifiedOptionsWithBranch(branchId);
  };

  const debitOptions = getDebitOptions(form.shopId);
  const creditOptions = getCreditOptions(form.shopId);
  const allAvailableOptions = [
    ...getCashAndBankOptions(),
    ...getUnifiedOptionsWithBranch(form.shopId),
  ];

  const handleAccountChange = (field, val) => {
    const option = allAvailableOptions.find((opt) => opt.value === val);
    let newNarration = form.narration;

    // Auto-update narration with entity tag if selecting Staff/Customer/Supplier
    if (option && option.entityType) {
      const tag = `(${option.entityType}: ${option.entityName})`;
      if (!newNarration.includes(tag)) {
        newNarration = newNarration ? `${newNarration} ${tag}` : tag;
      }
    }

    setForm({
      ...form,
      [field]: val,
      narration: newNarration,
    });
  };

  const handleBranchChange = (newShopId) => {
    const newDebitOptions = getDebitOptions(newShopId);
    const newCreditOptions = getCreditOptions(newShopId);
    let newDebit = form.debitAccount;
    let newCredit = form.creditAccount;

    // If a previously selected option is no longer available in the new branch, clear it
    if (newDebit && !newDebitOptions.find((opt) => opt.value === newDebit)) {
      newDebit = "";
    }
    if (newCredit && !newCreditOptions.find((opt) => opt.value === newCredit)) {
      newCredit = "";
    }

    setForm({
      ...form,
      shopId: newShopId,
      debitAccount: newDebit,
      creditAccount: newCredit,
    });
  };

  const columns = [
    {
      header: "Document ID",
      render: (r) => (
        <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">
          {r.voucherNumber}
        </span>
      ),
    },
    {
      header: "Date",
      render: (r) => (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {new Date(r.date).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: labels.debit,
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
            {r.debitAccount?.name || "N/A"}
          </span>
          <span className="text-[10px] font-bold text-blue-500/80 uppercase tracking-tighter">
            To Account
          </span>
        </div>
      ),
    },
    {
      header: labels.credit,
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
            {r.creditAccount?.name || "N/A"}
          </span>
          <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-tighter">
            From Account
          </span>
        </div>
      ),
    },
    {
      header: "Amount",
      width: "w-32",
      render: (r) => (
        <div className="flex flex-col items-start px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20/30 rounded-lg border border-emerald-100/20">
          <span className="text-sm font-black text-gray-900 dark:text-white notranslate">
            {currencySymbol}
            {(r.amount || 0).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      header: "Narration",
      render: (r) => (
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium italic truncate max-w-[150px] lg:max-w-xs block">
          {r.narration || "—"}
        </span>
      ),
    },
    {
      header: "Action",
      align: "right",
      width: "w-24",
      render: (r) => {
        const pType =
          type === "receipt"
            ? "receipts"
            : type === "payment"
              ? "payments"
              : type;
        const canEdit =
          isAdmin ||
          hasPermission(`accounts:${pType}:edit`) ||
          hasPermission(`accounts:${type}s:edit`) ||
          hasPermission(`accounts:${type}:edit`);
        const canDelete =
          isAdmin ||
          hasPermission(`accounts:${pType}:delete`) ||
          hasPermission(`accounts:${type}s:delete`) ||
          hasPermission(`accounts:${type}:delete`);

        return (
          <div className="flex items-center justify-end gap-1">
            {canEdit && (
              <button
                onClick={() => handleEdit(r)}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:bg-blue-900/20/50 rounded-xl transition-all active:scale-95 cursor-pointer group/btn"
                title="Edit Transaction"
              >
                <Edit3
                  size={16}
                  className="group-hover/btn:rotate-12 transition-transform"
                />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => confirmDelete(r)}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50/50 rounded-xl transition-all active:scale-95 cursor-pointer group/btn"
                title="Delete Transaction"
              >
                <Trash2
                  size={16}
                  className="group-hover/btn:scale-110 transition-transform"
                />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  const footerContent = (
    <div className="flex gap-3 w-full">
      <button
        type="button"
        onClick={() => {
          setShowModal(false);
          setEditingId(null);
          setForm(initialFormState);
        }}
        className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border transition-all cursor-pointer text-sm"
      >
        Cancel
      </button>
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className={`flex-1 px-4 py-2.5 text-white font-bold rounded-xl transition-all active:scale-95 text-sm cursor-pointer ${isSubmitting ? "bg-gray-400" : "bg-brand-primary hover:bg-brand-secondary"}`}
      >
        {isSubmitting
          ? "Processing..."
          : editingId
            ? `Update ${title}`
            : `Create ${title}`}
      </button>
    </div>
  );

  const CurrencyIcon = () => (
    <span className="text-sm font-bold text-gray-500 group-focus-within:text-brand-primary dark:text-blue-400 transition-colors notranslate">
      {currencySymbol}
    </span>
  );

  return (
    <>
      <div className="space-y-3 md:space-y-6">
        <Snackbar
          message={snack.message}
          type={snack.type}
          onClose={() => setSnack({ ...snack, message: "" })}
        />
        <StatsGrid stats={stats} loading={loading} />
        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : (
          <>
            <CustomTable
              columns={columns}
              data={filtered}
              loading={loading}
              onRefresh={fetchData}
              isRefreshing={loading}
              searchQuery={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder={`Search ${title.toLowerCase()}s...`}
              startDate={filters.startDate}
              endDate={filters.endDate}
              onStartDateChange={(val) => setFilters((prev) => ({ ...prev, startDate: val }))}
              onEndDateChange={(val) => setFilters((prev) => ({ ...prev, endDate: val }))}
              onFilterClick={() => setIsFilterModalOpen(true)}
              filterCount={
                Object.entries(filters).filter(([k, v]) =>
                  k !== "startDate" && k !== "endDate" && (Array.isArray(v) ? v.length > 0 : !!v),
                ).length
              }
              headerActions={(() => {
                const pType =
                  type === "receipt"
                    ? "receipts"
                    : type === "payment"
                      ? "payments"
                      : type;
                const canAdd =
                  isAdmin ||
                  hasPermission(`accounts:${pType}:add`) ||
                  hasPermission(`accounts:${type}s:add`) ||
                  hasPermission(`accounts:${type}:add`);
                if (!canAdd) return null;

                return (
                  <button
                    onClick={() => {
                      const userBranchId =
                        user?.branchId?._id || user?.branchId;
                      const isStaff = user?.role === "staff";
                      setEditingId(null);
                      setForm({
                        ...initialFormState,
                        shopId: isStaff ? userBranchId : "",
                      });
                      setShowModal(true);
                    }}
                    className="h-10 w-10 md:w-auto md:px-4 flex items-center justify-center gap-2 bg-brand-primary text-white rounded-xl font-bold text-sm hover:bg-brand-secondary transition-all active:scale-95 shadow-sm"
                  >
                    <Plus size={18} strokeWidth={2.5} />
                    <span className="hidden md:inline">New {title}</span>
                  </button>
                );
              })()}
              emptyMessage={`No ${title.toLowerCase()} transactions yet. Start by adding your first transaction!`}
              mobileMapper={{
                leading: () => (
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold border ${type === "receipt"
                      ? "bg-emerald-50 text-emerald-400 border-emerald-100"
                      : type === "payment"
                        ? "bg-red-50 text-red-400 border-red-100"
                        : "bg-gray-50 dark:bg-dark-card text-gray-400 dark:text-gray-500 border-gray-100 dark:border-dark-border"
                      }`}
                  >
                    {Icon ? <Icon size={22} /> : <FileText size={22} />}
                  </div>
                ),
                title: (row) => (
                  <h4 className="font-bold text-gray-900 dark:text-white text-[14px] truncate leading-tight">
                    {row.voucherNumber}
                  </h4>
                ),
                subtitle: (row) => (
                  <div className="space-y-0.5 mt-0.5">
                    <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate">
                      {row.debitAccount?.name || "N/A"} ←{" "}
                      {row.creditAccount?.name || "N/A"}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 italic truncate">
                      {new Date(row.date).toLocaleDateString()}{" "}
                      {row.narration && `• ${row.narration}`}
                    </p>
                  </div>
                ),
                trailing: (row) => (
                  <div className="text-right">
                    <p className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest leading-none mb-0.5">
                      Amount
                    </p>
                    <p className="text-[13px] font-black text-gray-900 dark:text-white notranslate">
                      {currencySymbol}
                      {(row.amount || 0).toLocaleString()}
                    </p>
                  </div>
                ),
                actions: (row) => (
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(row);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 h-10 bg-brand-primary/10 text-brand-primary dark:text-blue-400 rounded-xl text-[11px] font-bold hover:bg-brand-primary hover:text-white transition-all active:scale-95"
                    >
                      <Edit3 size={14} /> Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDelete(row);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 h-10 bg-red-50 text-red-600 rounded-xl text-[11px] font-bold hover:bg-red-500 hover:text-white transition-all active:scale-95 border border-red-100"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                ),
              }}
            />
          </>
        )}
        <AccountingFilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          onApply={setFilters}
          branches={shops.filter((s) => {
            if (user?.role !== "staff") return true;
            const userBranchId = user?.branchId?._id || user?.branchId;
            return s._id === userBranchId;
          })}
          initialFilters={filters}
        />

        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingId(null);
            setForm(initialFormState);
          }}
          title={editingId ? `Edit ${title}` : `New ${title}`}
          footer={footerContent}
          size="md"
          position="right"
        >
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SearchableSelect
                label="Select Branch"
                icon={Store}
                value={form.shopId}
                onChange={(val) => handleBranchChange(val)}
                options={shops
                  .filter((s) => {
                    if (user?.role !== "staff") return true;
                    const userBranchId = user?.branchId?._id || user?.branchId;
                    return s._id === userBranchId;
                  })
                  .map((s) => ({
                    value: s._id,
                    label: s.name,
                    description: s.mapAddress || s.address,
                  }))}
                placeholder="Select Branch"
                required
              />
              <CustomTextField
                label="Transaction Date"
                icon={Calendar}
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
              <CustomTextField
                label="Amount"
                icon={CurrencyIcon}
                type="number"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
                min="0"
                step="0.01"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SearchableSelect
                label={labels.debit}
                icon={ArrowDownCircle}
                value={form.debitAccount}
                onChange={(val) =>
                  handleAccountChange("debitAccount", val)
                }
                options={debitOptions}
                placeholder="Select Account"
                required
              />
              <SearchableSelect
                label={labels.credit}
                icon={ArrowUpCircle}
                value={form.creditAccount}
                onChange={(val) =>
                  handleAccountChange("creditAccount", val)
                }
                options={creditOptions}
                placeholder="Select Account"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest px-1">
                Narration / Remarks
              </label>
              <div className="relative group">
                <div className="absolute top-3 left-4 text-gray-400 group-focus-within:text-brand-primary dark:text-blue-400 transition-colors">
                  <FileEdit size={18} />
                </div>
                <textarea
                  value={form.narration}
                  onChange={(e) =>
                    setForm({ ...form, narration: e.target.value })
                  }
                  placeholder="Enter transaction details..."
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 hover:border-gray-200 dark:border-dark-border focus:bg-white dark:bg-dark-surface focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary rounded-xl text-sm font-medium transition-all outline-none min-h-[100px] resize-none"
                  rows="3"
                />
              </div>
            </div>
          </form>
        </Modal>

        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setTxnToDelete(null);
          }}
          onConfirm={handleDelete}
          title="Delete Transaction"
          message={`Are you sure you want to delete this ${title.toLowerCase()} entry (${txnToDelete?.voucherNumber})? This action cannot be undone and will affect your accounts.`}
          confirmLabel="Delete Forever"
        />
      </div>
    </>
  );
};

export const ReceiptPage = () => (
  <TransactionPage type="receipt" title="Receipt" icon={ArrowDownCircle} />
);
export const PaymentVoucherPage = () => (
  <TransactionPage type="payment" title="Payment" icon={ArrowUpCircle} />
);

export default TransactionPage;
