import React, { useState, useEffect, useMemo } from "react";
import {
  Edit3,
  Trash2,
  Hash,
  Type,
  Layers,
  Info,
  DollarSign,
  Plus,
  GitBranch,
  ChevronRight,
  ChevronDown,
  CreditCard,
} from "lucide-react";
import {
  useGetChartOfAccountsQuery,
  useCreateChartOfAccountMutation,
  useUpdateChartOfAccountMutation,
  useDeleteChartOfAccountMutation,
} from "../../../store/api/accountingEndpoints";
import { rtkErrorMessage } from "../../../store/api/rtkUtils";
import CustomTable from "../../../components/shared/CustomTable";
import Modal from "../../../components/shared/Modal";
import CustomTextField from "../../../components/shared/CustomTextField";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import SearchableSelect from "../../../components/shared/SearchableSelect";
import Snackbar from "../../../components/shared/Snackbar";
import CustomDropdown from "../../../components/shared/CustomDropdown";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import StatsGrid from "../../../components/shared/StatsGrid";

const ChartOfAccountsPage = () => {
  const { salonConfig } = useAuth();
  const currencySymbol = salonConfig?.currencySymbol || "$";

  const CurrencyIcon = () => (
    <span className="text-sm font-bold text-gray-500 group-focus-within:text-brand-primary dark:text-blue-400 transition-colors notranslate">
      {currencySymbol}
    </span>
  );

  const { data: accountsData = [], isLoading: loading, refetch } = useGetChartOfAccountsQuery();
  
  const accounts = useMemo(() => {
    return (accountsData || [])
      .filter((a) => a.name !== "LOCAL CUSTOMER")
      .map((a) => ({
        ...a,
        category: a.isSystemAccount ? "DEFAULT" : "CREATED",
      }));
  }, [accountsData]);

  const [createAccount] = useCreateChartOfAccountMutation();
  const [updateAccount] = useUpdateChartOfAccountMutation();
  const [deleteAccountMut] = useDeleteChartOfAccountMutation();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "Asset",
    subType: "Current Assets",
    level: 3,
    parentAccount: "",
    description: "",
    openingBalance: 0,
    openingBalanceType: "Dr",
    accountNumber: "",
  });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [accToDelete, setAccToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ message: "", type: "success" });
  const [expandedTypes, setExpandedTypes] = useState(new Set());

  const toggleType = (type) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // Auto-generate next account code based on type
  const generateNextCode = (type) => {
    // Get all accounts of the selected type
    const typeAccounts = accounts.filter((a) => a.type === type);
    
    if (typeAccounts.length === 0) return "";
    
    // Extract numeric codes and find the maximum
    const codes = typeAccounts
      .map((a) => {
        const match = a.code?.match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((code) => !isNaN(code));
    
    if (codes.length === 0) return "";
    
    const maxCode = Math.max(...codes);
    return (maxCode + 1).toString();
  };

  // Update code when type changes (only for new accounts)
  useEffect(() => {
    if (!editing && form.type) {
      const nextCode = generateNextCode(form.type);
      setForm((prev) => ({ ...prev, code: nextCode }));
    }
  }, [form.type, accounts, editing]);

  const parentOptions = useMemo(() => {
    // Show only Level 3 accounts matching the selected type as parents
    return accounts
      .filter((a) => (a.level || 1) === 3 && a.type === form.type)
      .map((a) => ({
        value: a._id,
        label: `${a.code} - ${a.name}`,
      }));
  }, [accounts, form.type]);

  const typeOptions = useMemo(() => {
    // Fetch Level 1 accounts for Type selection
    return accounts
      .filter((a) => (a.level || 1) === 1)
      .map((a) => ({ value: a.type, label: a.name }));
  }, [accounts]);

  const subTypeOptions = useMemo(() => {
    // Fetch Level 2 accounts filtered by Type for Sub Type selection
    return accounts
      .filter((a) => (a.level || 1) === 2 && a.type === form.type)
      .map((a) => ({
        value: a.name, // We use name as subType value
        label: a.name,
      }));
  }, [accounts, form.type]);

  const fetchData = () => {
    refetch();
  };

  const getDefaultForm = (type = "Asset") => {
    // Find first Level 2 account of this type as default parent, or Level 1
    const firstParent =
      accounts.find((a) => a.type === type && a.level === 2) ||
      accounts.find((a) => a.type === type && a.level === 1);
    
    const nextCode = generateNextCode(type);
    
    return {
      code: nextCode,
      name: "",
      type: firstParent ? firstParent.type : type,
      subType:
        firstParent && firstParent.level === 2
          ? firstParent.name
          : firstParent && firstParent.level === 1
            ? ""
            : "",
      level: firstParent ? (firstParent.level || 1) + 1 : 3,
      parentAccount: firstParent ? firstParent._id : "",
      description: "",
      openingBalance: 0,
      openingBalanceType: "Dr",
      accountNumber: "",
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Duplicate code check
    const codeExists = accounts.find(
      (a) =>
        a.code?.toLowerCase() === form.code?.toLowerCase() &&
        (!editing || a._id !== editing._id),
    );
    if (codeExists) {
      setSnackbar({
        message: `Account code "${form.code}" already exists. Please use a different code.`,
        type: "error",
      });
      return;
    }

    // Prepare data with proper opening balance sign
    const submitData = {
      ...form,
      parentAccount: form.parentAccount || null,
      openingBalance: form.openingBalanceType === "Cr" 
        ? -Math.abs(parseFloat(form.openingBalance) || 0)
        : Math.abs(parseFloat(form.openingBalance) || 0),
    };

    try {
      setIsSubmitting(true);
      if (editing) {
        await updateAccount({ id: editing._id, body: submitData }).unwrap();
      } else {
        await createAccount(submitData).unwrap();
      }
      setShowModal(false);
      setEditing(null);
      setForm(getDefaultForm());
      setSnackbar({
        message: editing
          ? "Account updated successfully!"
          : "Account created successfully!",
        type: "success",
      });
    } catch (err) {
      setSnackbar({
        message: rtkErrorMessage(err, "Error saving account"),
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (acc) => {
    setEditing(acc);
    setForm({
      code: acc.code,
      name: acc.name,
      type: acc.type,
      subType: acc.subType || "",
      level: acc.level, // Ensure level is set for editing
      parentAccount: acc.parentAccount?._id || acc.parentAccount || "",
      description: acc.description || "",
      openingBalance: Math.abs(acc.openingBalance || 0),
      openingBalanceType: acc.openingBalanceType || "Dr",
      accountNumber: acc.accountNumber || "",
    });
    setShowModal(true);
  };

  const confirmDelete = (acc) => {
    setAccToDelete(acc);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!accToDelete) return;
    try {
      await deleteAccountMut(accToDelete._id).unwrap();
      setIsDeleteModalOpen(false);
      setAccToDelete(null);
    } catch (err) {
      setSnackbar({
        message: rtkErrorMessage(err, "Cannot delete system account"),
        type: "error",
      });
    }
  };

  const filtered = useMemo(() => {
    // Get unique Level 1 types
    const types = ["Asset", "Liability", "Equity", "Income", "Cost of Sales", "Expense"];
    
    // If searching, we show all matching accounts and expand their parents
    const searchMatch = (a) => 
      !searchTerm || 
      a.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.code?.toLowerCase().includes(searchTerm.toLowerCase());

    const result = [];
    
    types.forEach(type => {
      const accountsInType = accounts.filter(a => a.type === type && (a.level || 1) >= 3);
      const level1Account = accounts.find(a => a.type === type && (a.level || 1) === 1);
      const matchingAccounts = accountsInType.filter(searchMatch);
      
      if (matchingAccounts.length > 0 || !searchTerm) {
        // Add Header Row
        result.push({
          _id: `header-${type}`,
          isHeader: true,
          type: type,
          name: type,
          code: level1Account?.code || "",
          count: accountsInType.length
        });

        // Add accounts if expanded or if searching
        if (expandedTypes.has(type) || searchTerm) {
          result.push(...matchingAccounts);
        }
      }
    });

    return result;
  }, [accounts, searchTerm, expandedTypes]);

  const typeColors = {
    Asset: "bg-blue-50 text-blue-700",
    Liability: "bg-red-50 text-red-700",
    Equity: "bg-purple-50 text-purple-700",
    Income: "bg-green-50 text-green-700",
    "Cost of Sales": "bg-amber-50 text-amber-700",
    Expense: "bg-orange-50 text-orange-700",
  };

  const columns = [
    {
      header: "CODE",
      render: (r) => {
        if (r.isHeader) {
          return (
            <span className="font-mono text-xs font-bold bg-gray-100 dark:bg-dark-card px-2.3 py-1.1 rounded text-gray-500 dark:text-gray-400 tracking-tight">
              {r.code || "—"}
            </span>
          );
        }
        return (
          <span className="font-mono text-xs font-bold bg-gray-100 dark:bg-dark-card px-2.3 py-1.1 rounded text-gray-500 dark:text-gray-400 tracking-tight ml-6">
            {r.code}
          </span>
        );
      },
    },
    {
      header: "ACCOUNT NAME",
      render: (r) => {
        if (r.isHeader) {
          const isExpanded = expandedTypes.has(r.type) || searchTerm;
          return (
            <div 
              className="flex items-center gap-2 cursor-pointer group/header"
              onClick={() => !searchTerm && toggleType(r.type)}
            >
              <div className="text-gray-400 group-hover/header:text-brand-primary dark:text-blue-400 transition-colors">
                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </div>
              <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
                {r.name}
                <span className="ml-2 text-[10px] text-gray-400 dark:text-gray-500 font-bold lowercase tracking-normal">
                  ({r.count} accounts)
                </span>
              </span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2 ml-6">
            <span className="text-sm font-bold text-gray-800 dark:text-gray-100 tracking-tight">
              {r.name}
            </span>
            {r.isSystemAccount && (
              <span className="px-1.5 py-0.5 rounded-[3px] text-[8px] font-black uppercase tracking-widest bg-gray-100 dark:bg-dark-card text-gray-400 dark:text-gray-500">
                DEFAULT
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "TYPE",
      render: (r) => {
        if (r.isHeader) return null;
        return (
          <div className="flex flex-col gap-0.4">
            <span
              className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest inline-block w-fit ${typeColors[r.type] || ""}`}
            >
              {r.type}
            </span>
            {r.subType && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold pl-0.5 tracking-tight">
                {r.subType}
              </span>
            )}
            {r.accountNumber && (
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold pl-0.5 tracking-tight flex items-center gap-1">
                <CreditCard size={10} />
                A/C: {r.accountNumber}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "DESCRIPTION",
      render: (r) => {
        if (r.isHeader) return null;
        return (
          <div className="flex flex-col gap-1">
            <span className="text-sm text-gray-400 dark:text-gray-500 font-medium italic truncate max-w-[200px] block">
              {r.parentAccount?.description || r.description || "—"}
            </span>
            {r.accountNumber && (
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold flex items-center gap-1">
                <CreditCard size={10} />
                A/C: {r.accountNumber}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "",
      align: "right",
      render: (r) => {
        if (r.isHeader) return null;
        return (
          <div className="flex items-center justify-end gap-1.5">
            {!r.isVirtual && (
              <>
                <button
                  onClick={() => handleEdit(r)}
                  className="p-2 text-gray-300 hover:text-blue-500 hover:bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-all active:scale-95 cursor-pointer"
                  title="Edit Account"
                >
                  <Edit3 size={16} />
                </button>
                {!r.isSystemAccount && (
                  <button
                    onClick={() => confirmDelete(r)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-95 cursor-pointer"
                    title="Delete Account"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </>
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
          setEditing(null);
        }}
        className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border transition-all cursor-pointer text-sm"
      >
        Cancel
      </button>
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className={`flex-1 px-4 py-2.5 text-white font-bold rounded-xl shadow-sm transition-all active:scale-95 text-sm cursor-pointer ${isSubmitting ? "bg-gray-400" : "bg-brand-primary hover:bg-brand-secondary"}`}
      >
        {isSubmitting
          ? "Processing..."
          : editing
            ? "Update Account"
            : "Add Account"}
      </button>
    </div>
  );

  const level3Accounts = accounts.filter((a) => (a.level || 1) >= 3);
  const totalAccounts = level3Accounts.length;
  const assetAccounts = level3Accounts.filter((a) => a.type === "Asset").length;
  const liabilityAccounts = level3Accounts.filter(
    (a) => a.type === "Liability",
  ).length;
  const customAccounts = level3Accounts.filter(
    (a) => !a.isSystemAccount,
  ).length;

  const stats = [
    {
      label: "Total Accounts",
      value: totalAccounts,
      icon: Layers,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Custom Accounts",
      value: customAccounts,
      icon: Plus,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Assets",
      value: assetAccounts,
      icon: DollarSign,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Liabilities",
      value: liabilityAccounts,
      icon: Layers,
      color: "bg-rose-50 text-rose-600",
    },
  ];

  return (
    <>
      <div className="space-y-3 md:space-y-6">
        <StatsGrid stats={stats} loading={loading} />

        <CustomTable
          columns={columns}
          data={filtered}
          loading={loading}
          onRefresh={fetchData}
          isRefreshing={loading}
          searchQuery={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search accounts..."
          headerActions={
            <button
              onClick={() => {
                setEditing(null);
                setForm(getDefaultForm());
                setShowModal(true);
              }}
              className="h-10 w-10 md:w-auto md:px-4 flex items-center justify-center gap-2 bg-brand-primary text-white rounded-xl font-bold text-xs hover:bg-brand-secondary transition-all active:scale-95 shadow-sm uppercase tracking-widest"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span className="hidden md:inline">Add Account</span>
            </button>
          }
          emptyMessage="No accounts found."
          mobileMapper={{
            leading: (row) => {
              if (row.isHeader) {
                const isExpanded = expandedTypes.has(row.type) || searchTerm;
                return (
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold border ${typeColors[row.type] || "bg-gray-50 dark:bg-dark-card text-gray-400 dark:text-gray-500 border-gray-100 dark:border-dark-border"}`}
                  >
                    {isExpanded ? <ChevronDown size={22} /> : <ChevronRight size={22} />}
                  </div>
                );
              }
              return (
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold border ${typeColors[row.type] || "bg-gray-50 dark:bg-dark-card text-gray-400 dark:text-gray-500 border-gray-100 dark:border-dark-border"}`}
                >
                  <Hash size={22} />
                </div>
              );
            },
            title: (row) => {
              if (row.isHeader) {
                return (
                  <h4 className="font-black text-gray-900 dark:text-white text-[14px] uppercase tracking-widest flex items-center gap-2">
                    {row.name}
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold lowercase tracking-normal">
                      ({row.count})
                    </span>
                  </h4>
                );
              }
              return (
                <h4 className="font-bold text-gray-900 dark:text-white text-[14px] truncate leading-tight flex items-center gap-2">
                  {row.name}
                  {row.isSystemAccount && (
                    <span className="bg-gray-100 dark:bg-dark-card text-gray-500 dark:text-gray-400 px-1 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-tighter">
                      System
                    </span>
                  )}
                </h4>
              );
            },
            subtitle: (row) => {
              if (row.isHeader) return null;
              return (
                <div className="flex flex-col gap-0.5">
                  <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate mt-0.5">
                    Code: {row.code} • {row.type}
                    {row.subType ? ` › ${row.subType}` : ""}
                  </p>
                  {row.accountNumber && (
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <CreditCard size={10} />
                      A/C: {row.accountNumber}
                    </p>
                  )}
                </div>
              );
            },
            trailing: (row) => {
              if (row.isHeader) return null;
              return (
                <div className="text-right">
                  <p className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest leading-none mb-0.5">
                    Balance
                  </p>
                  <p className="text-[13px] font-black text-gray-900 dark:text-white notranslate">
                    {currencySymbol}
                    {(row.openingBalance || 0).toLocaleString()}
                  </p>
                </div>
              );
            },
            actions: (row) => {
              if (row.isHeader) {
                const isExpanded = expandedTypes.has(row.type) || searchTerm;
                return (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      !searchTerm && toggleType(row.type);
                    }}
                    className="w-full flex items-center justify-center gap-2 h-10 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 rounded-xl text-[11px] font-bold hover:bg-gray-200 dark:hover:bg-dark-border transition-all active:scale-95 shadow-sm"
                  >
                    {isExpanded ? "Collapse" : "Expand"} {row.name}
                  </button>
                );
              }
              return (
                <div className="flex gap-2 pt-2">
                  {!row.isVirtual && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(row);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 h-10 bg-brand-primary/10 text-brand-primary dark:text-blue-400 rounded-xl text-[11px] font-bold hover:bg-brand-primary hover:text-white transition-all active:scale-95 shadow-sm"
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                      {!row.isSystemAccount && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDelete(row);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 h-10 bg-red-50 text-red-600 rounded-xl text-[11px] font-bold hover:bg-red-500 hover:text-white transition-all active:scale-95 shadow-sm border border-red-100"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            },
          }}
        />
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditing(null);
        }}
        title={editing ? "Edit Account" : "Add Account"}
        footer={footerContent}
        size="md"
        position="right"
      >
        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CustomTextField
              label="Account Name"
              icon={Type}
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Enter account name"
              readOnly={editing?.isSystemAccount}
            />
            <SearchableSelect
              label="Account Type"
              icon={GitBranch}
              options={typeOptions}
              value={form.type}
              onChange={(val) => {
                setForm({ ...form, type: val, subType: "", parentAccount: "" });
              }}
              placeholder="Select Type..."
              required
              disabled={editing?.isSystemAccount}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableSelect
              label="Sub Type"
              icon={GitBranch}
              options={subTypeOptions}
              value={form.subType}
              onChange={(val) => {
                const l2parent = accounts.find(
                  (a) =>
                    a.name === val && a.level === 2 && a.type === form.type,
                );
                setForm({
                  ...form,
                  subType: val,
                  level: form.parentAccount ? 4 : 3,
                  parentAccount:
                    form.parentAccount ||
                    (l2parent ? l2parent._id : form.parentAccount),
                });
              }}
              placeholder="Select Sub Type..."
              required
              disabled={editing?.isSystemAccount || !form.type}
            />
            {/* Parent Account Selection (Level 3, filtered by selected type) */}
            <SearchableSelect
              label="Parent Account"
              icon={GitBranch}
              options={parentOptions}
              value={form.parentAccount}
              onChange={(val) => {
                const parent = accounts.find((a) => a._id === val);
                if (parent) {
                  setForm({
                    ...form,
                    parentAccount: val,
                    type: parent.type,
                    subType: parent.subType || "",
                    level: 4,
                  });
                } else {
                  setForm({ ...form, parentAccount: val, level: 3 });
                }
              }}
              placeholder="Select Parent Account..."
              required
              disabled={editing?.isSystemAccount}
            />
          </div>

          {/* Conditionally show Account Number field if Bank Account is selected */}
          {form.parentAccount && (() => {
            const selectedParent = accounts.find((a) => a._id === form.parentAccount);
            const isBankAccount = selectedParent?.code === "1102";
            return isBankAccount ? (
              <CustomTextField
                label="Account Number"
                icon={CreditCard}
                type="text"
                value={form.accountNumber}
                onChange={(e) =>
                  setForm({ ...form, accountNumber: e.target.value })
                }
                placeholder="Enter bank account number"
              />
            ) : null;
          })()}

          {/* Opening Balance with Dr/Cr + Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest px-1">
                Opening Balance
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1 group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors text-gray-500 group-focus-within:text-brand-primary dark:text-blue-400">
                    <CurrencyIcon />
                  </div>
                  <input
                    type="number"
                    value={form.openingBalance}
                    onChange={(e) =>
                      setForm({ ...form, openingBalance: e.target.value })
                    }
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 dark:border-dark-border rounded-xl text-sm font-medium outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 focus:bg-white dark:bg-dark-surface transition-all"
                  />
                </div>
                <div className="w-24 shrink-0">
                  <CustomDropdown
                    value={form.openingBalanceType}
                    onChange={(e) =>
                      setForm({ ...form, openingBalanceType: e.target.value })
                    }
                    options={[
                      { value: "Dr", label: "Dr" },
                      { value: "Cr", label: "Cr" }
                    ]}
                    buttonClassName="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 dark:border-dark-border rounded-xl text-sm font-bold outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 focus:bg-white dark:bg-dark-surface transition-all flex items-center justify-between"
                  />
                </div>
              </div>
              <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 px-1">
                Dr = Debit (Positive), Cr = Credit (Negative)
              </p>
            </div>
            <CustomTextField
              label="Description"
              icon={Info}
              type="text"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Add account description..."
            />
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Account"
        message={`Are you sure you want to delete the account "${accToDelete?.name}"? This action cannot be undone.`}
      />

      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar({ message: "", type: "success" })}
      />
    </>
  );
};

export default ChartOfAccountsPage;
