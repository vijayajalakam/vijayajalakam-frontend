import { useState } from "react";
import { useAuth } from "../../features/auth/hooks/useAuth";
import {
  useGetDepartmentsAllQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
} from "../../store/api/tenantCrudEndpoints";
import { rtkErrorMessage } from "../../store/api/rtkUtils";
import { Plus, Trash2, Edit3, Search } from "lucide-react";
import CustomTextField from "../../components/shared/CustomTextField";
import ConfirmModal from "../../components/shared/ConfirmModal";
import Modal from "../../components/shared/Modal";
import { ManagerCardSkeleton } from "../../components/shared/Skeleton";
import PageHeader from "../../components/shared/PageHeader";
import Snackbar from "../../components/shared/Snackbar";

const DepartmentsManager = () => {
  const { hasPermission, isAdmin } = useAuth();
  const { data: departments = [], isLoading: loading } =
    useGetDepartmentsAllQuery();
  const [createDepartment] = useCreateDepartmentMutation();
  const [updateDepartment] = useUpdateDepartmentMutation();
  const [deleteDepartmentMut] = useDeleteDepartmentMutation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDept, setCurrentDept] = useState(null);
  const [name, setName] = useState("");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const handleOpenModal = (dept = null) => {
    if (dept) {
      setCurrentDept(dept);
      setName(dept.name);
    } else {
      setCurrentDept(null);
      setName("");
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (currentDept) {
        await updateDepartment({
          id: currentDept._id,
          body: { name },
        }).unwrap();
      } else {
        await createDepartment({ name }).unwrap();
      }
      setIsModalOpen(false);
    } catch (err) {
      showSnack(rtkErrorMessage(err, "Operation failed"), "error");
    }
  };

  const handleDelete = async () => {
    if (!departmentToDelete) return;
    try {
      await deleteDepartmentMut(departmentToDelete._id).unwrap();
      setIsDeleteModalOpen(false);
      setDepartmentToDelete(null);
    } catch (err) {
      showSnack(
        rtkErrorMessage(err, "Failed to delete department"),
        "error",
      );
    }
  };

  const handleToggleActive = async (dept) => {
    if (!isAdmin && !hasPermission("settings:manage:departments:toggle")) {
      showSnack("Permission denied", "error");
      return;
    }
    try {
      await updateDepartment({
        id: dept._id,
        body: { isActive: !dept.isActive },
      }).unwrap();
    } catch (err) {
      showSnack(
        rtkErrorMessage(err, "Failed to update department status"),
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
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
            <Search size={20} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Service Department</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Customer segments for pricing (e.g. Men, Women, Kids)
            </p>
          </div>
        </div>
        {/* Add Button in Header */}
        {(isAdmin || hasPermission("settings:manage:departments:add")) && (
          <button
            onClick={() => handleOpenModal()}
            className="h-11 px-4 sm:px-6 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-primary/90 transition-all active:scale-95 flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Department</span>
          </button>
        )}
      </div>

      {loading ? (
        <ManagerCardSkeleton count={5} />
      ) : (
        <div className="flex flex-wrap gap-4">
          {departments.map((dept) => (
            <div
              key={dept._id}
              className={`bg-gray-50 dark:bg-dark-surface px-4 py-3 rounded-xl flex items-center gap-3 group w-full sm:w-auto sm:min-w-[140px] border border-gray-100 dark:border-dark-border hover:border-gray-200 dark:hover:border-gray-700 transition-all ${!dept.isActive ? "opacity-60" : ""}`}
            >
              <div className="flex flex-col">
                <span className="font-semibold text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {dept.name}
                  {dept.isDefault && (
                    <span className="ml-1 text-[8px] bg-blue-50 text-blue-500 dark:bg-blue-900/30 dark:text-blue-400 px-1 rounded uppercase tracking-tighter font-bold">
                      Default
                    </span>
                  )}
                </span>
                {!dept.isActive && (
                  <span className="text-[8px] text-red-400 dark:text-red-500 font-bold uppercase tracking-widest">
                    Disabled
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 transition-opacity ml-auto pl-2 border-l border-gray-200 dark:border-dark-border">
                {/* Toggle Switch */}
                <button
                  onClick={() => handleToggleActive(dept)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${dept.isActive ? "bg-brand-primary" : "bg-gray-300 dark:bg-gray-600"} ${(!isAdmin && !hasPermission("settings:manage:departments:toggle")) ? "opacity-50 cursor-not-allowed" : ""}`}
                  title={dept.isActive ? "Disable" : "Enable"}
                  disabled={!isAdmin && !hasPermission("settings:manage:departments:toggle")}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-dark-surface shadow ring-0 transition duration-200 ease-in-out ${dept.isActive ? "translate-x-4" : "translate-x-0"}`}
                  />
                </button>

                {(isAdmin || hasPermission("settings:manage:departments:edit")) && (
                  <button
                    onClick={() => handleOpenModal(dept)}
                    className="p-1 text-gray-400 dark:text-gray-500 hover:text-brand-primary dark:hover:text-brand-primary transition-colors"
                    title="Edit"
                  >
                    <Edit3 size={14} />
                  </button>
                )}
                {(isAdmin || hasPermission("settings:manage:departments:delete")) && (
                  <button
                    onClick={() => {
                      setDepartmentToDelete(dept);
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
          {departments.length === 0 && !loading && (
            <div className="w-full py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
              No service departments found.
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          currentDept ? "Edit Service Department" : "Add Service Department"
        }
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
              {currentDept ? "Save" : "Create"}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="py-2">
          <CustomTextField
            label="Service Department Name"
            placeholder="e.g. Men, Women"
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
        title="Delete Service Department"
        message={`Are you sure you want to delete '${departmentToDelete?.name}'?`}
        confirmLabel="Delete"
        type="danger"
      />
    </div>
  );
};

export default DepartmentsManager;
