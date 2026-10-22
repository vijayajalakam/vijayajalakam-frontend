import { useState } from "react";
import { useAuth } from "../../features/auth/hooks/useAuth";
import {
  useGetUnitsListQuery,
  useCreateUnitMutation,
  useUpdateUnitMutation,
  useDeleteUnitMutation,
} from "../../store/api/tenantCrudEndpoints";
import { rtkErrorMessage } from "../../store/api/rtkUtils";
import { Plus, Trash2, Edit3, Layers } from "lucide-react";
import CustomTextField from "../../components/shared/CustomTextField";
import ConfirmModal from "../../components/shared/ConfirmModal";
import Modal from "../../components/shared/Modal";
import { ManagerCardSkeleton } from "../../components/shared/Skeleton";
import Snackbar from "../../components/shared/Snackbar";

const UnitsManager = () => {
  const { hasPermission } = useAuth();
  const { data: units = [], isLoading: loading } = useGetUnitsListQuery();
  const [createUnit] = useCreateUnitMutation();
  const [updateUnit] = useUpdateUnitMutation();
  const [deleteUnitMut] = useDeleteUnitMutation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUnit, setCurrentUnit] = useState(null);
  const [name, setName] = useState("");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState(null);

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const handleOpenModal = (unit = null) => {
    if (unit) {
      setCurrentUnit(unit);
      setName(unit.name);
    } else {
      setCurrentUnit(null);
      setName("");
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (currentUnit) {
        await updateUnit({ id: currentUnit._id, body: { name } }).unwrap();
      } else {
        await createUnit({ name }).unwrap();
      }
      setIsModalOpen(false);
    } catch (err) {
      showSnack(rtkErrorMessage(err, "Operation failed"), "error");
    }
  };

  const handleDelete = async () => {
    if (!unitToDelete) return;
    try {
      await deleteUnitMut(unitToDelete._id).unwrap();
      setIsDeleteModalOpen(false);
      setUnitToDelete(null);
    } catch (err) {
      showSnack(rtkErrorMessage(err, "Failed to delete unit"), "error");
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
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
            <Layers size={20} className="text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Units</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Manage measurement units for products (e.g. KG, Nos)
            </p>
          </div>
        </div>
        {/* Add Button in Header */}
        {hasPermission("settings:manage:units:add") && (
          <button
            onClick={() => handleOpenModal()}
            className="h-11 px-4 sm:px-6 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-primary/90 transition-all active:scale-95 flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Unit</span>
          </button>
        )}
      </div>

      {loading ? (
        <ManagerCardSkeleton count={5} />
      ) : (
        <div className="flex flex-wrap gap-4">
          {units.map((unit) => (
            <div
              key={unit._id}
              className={`bg-gray-50 dark:bg-dark-surface px-4 py-3 rounded-xl flex items-center gap-3 group w-full sm:w-auto sm:min-w-[140px] border border-gray-100 dark:border-dark-border hover:border-gray-200 dark:hover:border-gray-700 transition-all ${!unit.isActive ? "opacity-60" : ""}`}
            >
              <div className="flex flex-col">
                <span className="font-semibold text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {unit.name}
                  {unit.isDefault && (
                    <span className="ml-1 text-[8px] bg-blue-50 text-blue-500 dark:bg-blue-900/30 dark:text-blue-400 px-1 rounded uppercase tracking-tighter font-bold">
                      Default
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-1 transition-opacity ml-auto pl-2 border-l border-gray-200 dark:border-dark-border">
                {hasPermission("settings:manage:units:edit") && (
                  <button
                    onClick={() => handleOpenModal(unit)}
                    className="p-1 text-gray-400 dark:text-gray-500 hover:text-brand-primary dark:hover:text-brand-primary transition-colors"
                  >
                    <Edit3 size={14} />
                  </button>
                )}
                {!unit.isDefault && hasPermission("settings:manage:units:delete") && (
                  <button
                    onClick={() => {
                      setUnitToDelete(unit);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {units.length === 0 && !loading && (
            <div className="w-full py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
              No units found.
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentUnit ? "Edit Unit" : "Add Unit"}
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
              {currentUnit ? "Save" : "Create"}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="py-2">
          <CustomTextField
            label="Unit Name"
            placeholder="e.g. KG, Nos"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Unit"
        message={`Are you sure you want to delete '${unitToDelete?.name}'?`}
        confirmLabel="Delete"
        type="danger"
      />
    </div>
  );
};

export default UnitsManager;
