import { useState } from "react";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { useGetTaxesQuery } from "../../store/api/tenantEndpoints";
import {
  useCreateTaxMutation,
  useUpdateTaxMutation,
  useDeleteTaxMutation,
} from "../../store/api/tenantCrudEndpoints";
import { rtkErrorMessage } from "../../store/api/rtkUtils";
import { Plus, Trash2, Edit3, Percent } from "lucide-react";
import CustomTextField from "../../components/shared/CustomTextField";
import ConfirmModal from "../../components/shared/ConfirmModal";
import Modal from "../../components/shared/Modal";
import { ManagerCardSkeleton } from "../../components/shared/Skeleton";
import Snackbar from "../../components/shared/Snackbar";

const TaxManager = () => {
  const { hasPermission, isAdmin } = useAuth();
  const { data: taxes = [], isLoading: loading } = useGetTaxesQuery("");
  const [createTax] = useCreateTaxMutation();
  const [updateTax] = useUpdateTaxMutation();
  const [deleteTaxMut] = useDeleteTaxMutation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTax, setCurrentTax] = useState(null);
  const [formData, setFormData] = useState({ name: "GST", percentage: "" });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taxToDelete, setTaxToDelete] = useState(null);

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const handleOpenModal = (tax = null) => {
    if (tax) {
      setCurrentTax(tax);
      setFormData({ name: tax.name, percentage: tax.percentage });
    } else {
      setCurrentTax(null);
      setFormData({ name: "GST", percentage: "" });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.percentage === "") return;

    try {
      if (currentTax) {
        await updateTax({ id: currentTax._id, body: formData }).unwrap();
      } else {
        await createTax(formData).unwrap();
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Tax creation error:", err);
      showSnack(rtkErrorMessage(err, "Operation failed"), "error");
    }
  };

  const handleDelete = async () => {
    if (!taxToDelete) return;
    try {
      await deleteTaxMut(taxToDelete._id).unwrap();
      setIsDeleteModalOpen(false);
      setTaxToDelete(null);
    } catch (err) {
      showSnack(rtkErrorMessage(err, "Failed to delete tax"), "error");
    }
  };

  const handleToggleActive = async (tax) => {
    if (!isAdmin && !hasPermission("settings:manage:taxes:toggle")) {
      showSnack("Permission denied", "error");
      return;
    }
    try {
      await updateTax({
        id: tax._id,
        body: { isActive: !tax.isActive },
      }).unwrap();
    } catch (err) {
      showSnack(rtkErrorMessage(err, "Failed to update tax status"), "error");
    }
  };

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
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <Percent size={20} className="text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Tax Rates</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Manage government tax percentages for invoices
            </p>
          </div>
        </div>
        {/* Add Button in Header */}
        {(isAdmin || hasPermission("settings:manage:taxes:add")) && (
          <button
            onClick={() => handleOpenModal()}
            className="h-11 px-4 sm:px-6 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-primary/90 transition-all active:scale-95 flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Tax Rate</span>
          </button>
        )}
      </div>

      {loading ? (
        <ManagerCardSkeleton count={4} />
      ) : (
        <div className="flex flex-wrap gap-4">
          {taxes.map((tax) => (
            <div
              key={tax._id}
              className={`bg-gray-50 dark:bg-dark-surface px-4 py-3 rounded-xl flex items-center gap-3 group w-full sm:w-auto sm:min-w-[140px] border border-gray-100 dark:border-dark-border hover:border-gray-200 dark:hover:border-gray-700 transition-all ${!tax.isActive ? "opacity-60" : ""}`}
            >
              <div className="flex flex-col">
                <span className="font-semibold text-sm text-gray-900 dark:text-white whitespace-nowrap flex items-center gap-1">
                  {tax.name}
                  {!tax.name.includes(String(tax.percentage)) && (
                    <span className="text-[10px] bg-gray-100 dark:bg-dark-border text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded font-bold">
                      {tax.percentage}%
                    </span>
                  )}
                </span>
                {!tax.isActive && (
                  <span className="text-[8px] text-red-400 font-bold uppercase tracking-widest">
                    Disabled
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 transition-opacity ml-auto pl-2 border-l border-gray-200 dark:border-dark-border">
                {/* Toggle Switch */}
                <button
                  onClick={() => handleToggleActive(tax)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${tax.isActive ? "bg-brand-primary" : "bg-gray-300 dark:bg-gray-600"} ${(!isAdmin && !hasPermission("settings:manage:taxes:toggle")) ? "opacity-50 cursor-not-allowed" : ""}`}
                  title={tax.isActive ? "Disable" : "Enable"}
                  disabled={!isAdmin && !hasPermission("settings:manage:taxes:toggle")}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-dark-surface shadow ring-0 transition duration-200 ease-in-out ${tax.isActive ? "translate-x-4" : "translate-x-0"}`}
                  />
                </button>

                {(isAdmin || hasPermission("settings:manage:taxes:edit")) && (
                  <button
                    onClick={() => handleOpenModal(tax)}
                    className="p-1 text-gray-400 hover:text-brand-primary dark:text-blue-400 transition-colors"
                  >
                    <Edit3 size={14} />
                  </button>
                )}
                {(isAdmin || hasPermission("settings:manage:taxes:delete")) && (
                  <button
                    onClick={() => {
                      setTaxToDelete(tax);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {taxes.length === 0 && !loading && (
            <div className="w-full py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
              No tax rates found.
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentTax ? "Edit Tax" : "Add Tax"}
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
              {currentTax ? "Save" : "Create"}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="py-2 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block">
              Tax Name
            </label>
            <div className="flex gap-3">
              {["GST", "VAT"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, name: type })}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                    formData.name === type
                      ? "bg-brand-primary text-white border-brand-primary shadow-md shadow-brand-primary/20"
                      : "bg-white dark:bg-dark-surface text-gray-600 dark:text-gray-300 border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-dark-border"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <CustomTextField
            label="Percentage (%)"
            placeholder="e.g. 18"
            type="number"
            icon={Percent}
            value={formData.percentage}
            onChange={(e) =>
              setFormData({ ...formData, percentage: e.target.value })
            }
            required
          />
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Tax"
        message={`Are you sure you want to delete '${taxToDelete?.name}'?`}
        confirmLabel="Delete"
        type="danger"
      />
    </div>
  );
};

export default TaxManager;
