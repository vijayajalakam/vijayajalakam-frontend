import { useState, useMemo } from "react";
import { useGetPaymentMethodsQuery } from "../../store/api/tenantEndpoints";
import {
  useGetChartOfAccountsQuery,
  useCreatePaymentMethodMutation,
  useUpdatePaymentMethodMutation,
  useDeletePaymentMethodMutation,
} from "../../store/api/tenantCrudEndpoints";
import { rtkErrorMessage } from "../../store/api/rtkUtils";
import { Plus, Trash2, Edit3, Wallet, BookOpen } from "lucide-react";
import CustomTextField from "../../components/shared/CustomTextField";
import CustomDropdown from "../../components/shared/CustomDropdown";
import ConfirmModal from "../../components/shared/ConfirmModal";
import Modal from "../../components/shared/Modal";
import { ManagerCardSkeleton } from "../../components/shared/Skeleton";
import Snackbar from "../../components/shared/Snackbar";
import { useAuth } from "../../features/auth/hooks/useAuth";

const PaymentMethodsManager = () => {
  const { hasPermission, isAdmin, user } = useAuth();
  const isShopAdmin = user?.role === "SHOP_ADMIN";
  const canManage = isAdmin || isShopAdmin;

  const { data: methods = [], isLoading: loadingMethods } =
    useGetPaymentMethodsQuery(true);
  const { data: accounts = [], isLoading: loadingAccounts } =
    useGetChartOfAccountsQuery();
  const [createPaymentMethod] = useCreatePaymentMethodMutation();
  const [updatePaymentMethod] = useUpdatePaymentMethodMutation();
  const [deletePaymentMethodMut] = useDeletePaymentMethodMutation();

  const loading = loadingMethods || loadingAccounts;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMethod, setCurrentMethod] = useState(null);
  const [name, setName] = useState("");
  const [linkedAccount, setLinkedAccount] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState(null);
  const [snack, setSnack] = useState({ message: "", type: "success" });

  const showSnack = (message, type = "success") =>
    setSnack({ message, type });

  const accountOptions = useMemo(() => {
    return accounts
      .filter((a) => (a.level || 3) >= 3 && a.name !== "LOCAL CUSTOMER")
      .map((a) => {
        let badgeColor = "bg-blue-50 text-blue-600 border-blue-100";
        if (a.type === "Asset" || a.type === "Income")
          badgeColor = "bg-emerald-50 text-emerald-600 border-emerald-100";
        if (a.type === "Liability" || a.type === "Expense")
          badgeColor = "bg-rose-50 text-rose-600 border-rose-100";
        if (a.type === "Equity")
          badgeColor = "bg-purple-50 text-purple-600 border-purple-100";
        if (a.type === "Cost of Sales")
          badgeColor = "bg-orange-50 text-orange-600 border-orange-100";

        return {
          value: a._id,
          label: (
            <div className="flex items-center justify-between w-full">
              <span className="truncate pr-2">
                {a.code} - {a.name}
              </span>
              <span
                className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-black border flex-shrink-0 ${badgeColor}`}
              >
                {a.type}
              </span>
            </div>
          ),
          searchLabel: `${a.code} ${a.name} ${a.type} account`,
        };
      });
  }, [accounts]);

  const handleOpenModal = (method = null) => {
    if (method) {
      setCurrentMethod(method);
      setName(method.name);
      setLinkedAccount(
        method.linkedAccount?._id || method.linkedAccount || "",
      );
    } else {
      setCurrentMethod(null);
      setName("");
      setLinkedAccount("");
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const canSubmit = canManage
      ? true
      : currentMethod
      ? hasPermission("settings:manage:payments:edit")
      : hasPermission("settings:manage:payments:add");

    if (!canSubmit) {
      showSnack("Permission denied", "error");
      return;
    }
    if (!name.trim() || !linkedAccount) {
      showSnack("Please provide both a name and a linked ledger account.", "error");
      return;
    }

    try {
      if (currentMethod) {
        await updatePaymentMethod({
          id: currentMethod._id,
          body: { name, linkedAccount },
        }).unwrap();
      } else {
        await createPaymentMethod({ name, linkedAccount }).unwrap();
      }
      setIsModalOpen(false);
    } catch (err) {
      showSnack(rtkErrorMessage(err, "Operation failed"), "error");
    }
  };

  const handleDelete = async () => {
    if (!methodToDelete) return;
    if (!canManage && !hasPermission("settings:manage:payments:delete")) {
      showSnack("Permission denied", "error");
      return;
    }
    try {
      await deletePaymentMethodMut(methodToDelete._id).unwrap();
      setIsDeleteModalOpen(false);
      setMethodToDelete(null);
    } catch (err) {
      showSnack(rtkErrorMessage(err, "Failed to delete payment method"), "error");
    }
  };

  const handleToggleActive = async (method) => {
    if (!canManage && !hasPermission("settings:manage:payments:toggle")) {
      showSnack("Permission denied", "error");
      return;
    }
    try {
      if (method.isSystem && method._id === "system_due") {
        localStorage.setItem("system_due_disabled", method.isActive ? "true" : "false");
        window.location.reload();
        return;
      }
      await updatePaymentMethod({
        id: method._id,
        body: { isActive: !method.isActive },
      }).unwrap();
    } catch (err) {
      showSnack(rtkErrorMessage(err, "Failed to update status"), "error");
    }
  };

  const canToggle = canManage || hasPermission("settings:manage:payments:toggle");
  const canEdit   = canManage || hasPermission("settings:manage:payments:edit");
  const canDelete = canManage || hasPermission("settings:manage:payments:delete");
  const canAdd    = canManage || hasPermission("settings:manage:payments:add");

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4 sm:p-6 space-y-6">
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-dark-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
            <Wallet size={20} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Payment Methods
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Manage CASH, UPI, CARD and custom payment types
            </p>
          </div>
        </div>
        {canAdd && (
          <button
            onClick={() => handleOpenModal()}
            className="h-11 px-4 sm:px-6 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-primary/90 transition-all active:scale-95 flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Payment Method</span>
          </button>
        )}
      </div>

      {loading ? (
        <ManagerCardSkeleton count={6} />
      ) : (
        <div className="flex flex-wrap gap-4">
          {methods.map((method) => (
            <div
              key={method._id}
              className={`bg-gray-50 dark:bg-dark-surface px-4 py-3 rounded-xl flex items-center gap-3 group w-full sm:w-auto sm:min-w-[160px] border border-gray-100 dark:border-dark-border hover:border-gray-200 dark:hover:border-gray-700 transition-all ${
                !method.isActive ? "opacity-60" : ""
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-dark-border flex items-center justify-center text-gray-400 dark:text-gray-500 group-hover:bg-brand-primary/5 group-hover:text-brand-primary transition-colors">
                <Wallet size={16} />
              </div>

              <div className="flex flex-col overflow-hidden">
                <span className="font-semibold text-sm text-gray-900 dark:text-white whitespace-nowrap flex items-center gap-1">
                  {method.name}
                  {method.isDefault && (
                    <span className="text-[8px] bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 px-1 rounded uppercase tracking-tighter font-bold">
                      Default
                    </span>
                  )}
                </span>
                <span
                  className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[120px]"
                  title={method.linkedAccount?.name || "No account linked"}
                >
                  {method.linkedAccount?.name || "No account linked"}
                </span>
                {!method.isActive && (
                  <span className="text-[8px] text-red-400 font-bold uppercase tracking-widest mt-0.5">
                    Disabled
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 ml-auto pl-2 border-l border-gray-200 dark:border-dark-border">
                {/* Toggle */}
                <button
                  onClick={() => handleToggleActive(method)}
                  disabled={!canToggle}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    method.isActive ? "bg-brand-primary" : "bg-gray-300 dark:bg-gray-600"
                  } ${!canToggle ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  title={method.isActive ? "Disable" : "Enable"}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-dark-surface shadow ring-0 transition duration-200 ease-in-out ${
                      method.isActive ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>

                {canEdit && !method.isSystem && (
                  <button
                    onClick={() => handleOpenModal(method)}
                    className="p-1 text-gray-400 hover:text-brand-primary dark:text-blue-400 transition-colors"
                    title="Edit"
                  >
                    <Edit3 size={14} />
                  </button>
                )}

                {!method.isDefault && canDelete && (
                  <button
                    onClick={() => {
                      setMethodToDelete(method);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {methods.length === 0 && !loading && (
            <div className="w-full py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
              No payment methods found.
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentMethod ? "Edit Method" : "Add Method"}
        maxWidth="max-w-md"
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-brand-primary text-white font-medium rounded-lg hover:bg-brand-secondary transition-colors"
            >
              {currentMethod ? "Save" : "Create"}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="py-2 space-y-4">
          <CustomTextField
            label="Method Name"
            placeholder="e.g. PhonePe, GPay"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            disabled={currentMethod?.isDefault}
          />

          <div className="space-y-1">
            <CustomDropdown
              label="Linked Ledger Account"
              icon={BookOpen}
              value={linkedAccount}
              onChange={(e) => setLinkedAccount(e.target.value)}
              options={accountOptions}
              placeholder="Select Ledger Account"
              required
              isSearchable
            />
            <p className="px-1 text-[10px] text-gray-400 dark:text-gray-500 font-medium italic">
              Select the Chart of Account this payment method should post
              journal entries to.
            </p>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Method"
        message={`Are you sure you want to delete '${methodToDelete?.name}'?`}
        confirmLabel="Delete"
        type="danger"
      />
    </div>
  );
};

export default PaymentMethodsManager;
