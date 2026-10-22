import { useState } from "react";
import { useAuth } from "../../features/auth/hooks/useAuth";
import {
  useGetVariantsListQuery,
  useCreateVariantMutation,
  useUpdateVariantMutation,
  useDeleteVariantMutation,
} from "../../store/api/tenantCrudEndpoints";
import { rtkErrorMessage } from "../../store/api/rtkUtils";
import { Plus, Trash2, Edit3, Search, Layers } from "lucide-react";
import CustomTextField from "../../components/shared/CustomTextField";
import ConfirmModal from "../../components/shared/ConfirmModal";
import Modal from "../../components/shared/Modal";
import { ManagerCardSkeleton } from "../../components/shared/Skeleton";
import PageHeader from "../../components/shared/PageHeader";
import Snackbar from "../../components/shared/Snackbar";

const VariantManager = () => {
  const { hasPermission, isAdmin } = useAuth();
  const { data: variants = [], isLoading: loading } = useGetVariantsListQuery();
  const [createVariant] = useCreateVariantMutation();
  const [updateVariant] = useUpdateVariantMutation();
  const [deleteVariantMut] = useDeleteVariantMutation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentVariant, setCurrentVariant] = useState(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("service");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [variantToDelete, setVariantToDelete] = useState(null);

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const handleOpenModal = (variant = null) => {
    if (variant) {
      setCurrentVariant(variant);
      setName(variant.name);
      setType(variant.type || "service");
    } else {
      setCurrentVariant(null);
      setName("");
      setType("service");
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (currentVariant) {
        await updateVariant({
          id: currentVariant._id,
          body: { name, type },
        }).unwrap();
      } else {
        await createVariant({ name, type }).unwrap();
      }
      setIsModalOpen(false);
    } catch (err) {
      showSnack(rtkErrorMessage(err, "Operation failed"), "error");
    }
  };

  const handleDelete = async () => {
    if (!variantToDelete) return;
    try {
      await deleteVariantMut(variantToDelete._id).unwrap();
      setIsDeleteModalOpen(false);
      setVariantToDelete(null);
    } catch (err) {
      showSnack(rtkErrorMessage(err, "Failed to delete variant"), "error");
    }
  };

  const handleToggleActive = async (variant) => {
    if (!isAdmin && !hasPermission("settings:manage:variants:toggle")) {
      showSnack("Permission denied", "error");
      return;
    }
    try {
      await updateVariant({
        id: variant._id,
        body: { isActive: !variant.isActive },
      }).unwrap();
    } catch (err) {
      showSnack(
        rtkErrorMessage(err, "Failed to update variant status"),
        "error",
      );
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
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
            <Layers size={20} className="text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Variants</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Manage product options (e.g. Size, Color, Volume)
            </p>
          </div>
        </div>
        {/* Add Button in Header */}
        {(isAdmin || hasPermission("settings:manage:variants:add")) && (
          <button
            onClick={() => handleOpenModal()}
            className="h-11 px-4 sm:px-6 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-primary/90 transition-all active:scale-95 flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Variant</span>
          </button>
        )}
      </div>

      {loading ? (
        <ManagerCardSkeleton count={5} />
      ) : (
        <div className="flex flex-wrap gap-4">
          {variants.map((v) => (
            <div
              key={v._id}
              className={`bg-gray-50 dark:bg-dark-surface px-4 py-3 rounded-xl flex items-center gap-3 group w-full sm:w-auto sm:min-w-[140px] border border-gray-100 dark:border-dark-border hover:border-gray-200 dark:hover:border-gray-700 transition-all ${!v.isActive ? "opacity-60" : ""}`}
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {v.name}
                  </span>
                  <span
                    className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${v.type === "product" ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"}`}
                  >
                    {v.type}
                  </span>
                </div>
                {!v.isActive && (
                  <span className="text-[8px] text-red-400 dark:text-red-500 font-bold uppercase tracking-widest">
                    Disabled
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 transition-opacity ml-auto pl-2 border-l border-gray-200 dark:border-dark-border">
                {/* Toggle Switch */}
                <button
                  onClick={() => handleToggleActive(v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${v.isActive ? "bg-brand-primary" : "bg-gray-300 dark:bg-gray-600"} ${(!isAdmin && !hasPermission("settings:manage:variants:toggle")) ? "opacity-50 cursor-not-allowed" : ""}`}
                  title={v.isActive ? "Disable" : "Enable"}
                  disabled={!isAdmin && !hasPermission("settings:manage:variants:toggle")}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-dark-surface shadow ring-0 transition duration-200 ease-in-out ${v.isActive ? "translate-x-4" : "translate-x-0"}`}
                  />
                </button>

                {(isAdmin || hasPermission("settings:manage:variants:edit")) && (
                  <button
                    onClick={() => handleOpenModal(v)}
                    className="p-1 text-gray-400 dark:text-gray-500 hover:text-brand-primary dark:hover:text-brand-primary transition-colors"
                    title="Edit"
                  >
                    <Edit3 size={14} />
                  </button>
                )}
                {(isAdmin || hasPermission("settings:manage:variants:delete")) && (
                  <button
                    onClick={() => {
                      setVariantToDelete(v);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {variants.length === 0 && !loading && (
            <div className="w-full py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
              No variants found.
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentVariant ? "Edit Variant" : "Add Variant"}
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
              className="flex-1 px-4 py-2 bg-brand-primary text-white font-medium rounded-lg hover:bg-brand-primary/90 transition-colors"
            >
              {currentVariant ? "Save" : "Create"}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="py-2 space-y-4">
          <CustomTextField
            label="Variant Name"
            placeholder="e.g. Normal, Premium"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <div>
            <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 tracking-widest px-1 mb-2 block">
              Applicable For
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType("service")}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${type === "service" ? "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400" : "bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border text-gray-400 dark:text-gray-500 hover:border-gray-200 dark:hover:border-gray-600"}`}
              >
                <Layers size={20} />
                <span className="text-xs font-bold">Services</span>
              </button>
              <button
                type="button"
                onClick={() => setType("product")}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${type === "product" ? "bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400" : "bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border text-gray-400 dark:text-gray-500 hover:border-gray-200 dark:hover:border-gray-600"}`}
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <span className="font-bold text-lg">P</span>
                </div>
                <span className="text-xs font-bold">Products</span>
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Variant"
        message={`Are you sure you want to delete '${variantToDelete?.name}'?`}
        confirmLabel="Delete"
        type="danger"
      />
    </div>
  );
};

export default VariantManager;
