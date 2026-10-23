import { useState, useMemo } from "react";
import { useAuth } from "../../features/auth/hooks/useAuth";
import {
  useGetServiceCategoriesQuery,
  useGetProductCategoriesListQuery,
  useCreateServiceCategoryMutation,
  useUpdateServiceCategoryMutation,
  useDeleteServiceCategoryMutation,
  useCreateProductCategoryMutation,
  useUpdateProductCategoryMutation,
  useDeleteProductCategoryMutation,
} from "../../store/api/tenantCrudEndpoints";
import { rtkErrorMessage } from "../../store/api/rtkUtils";
import { Plus, Trash2, Edit3, Search } from "lucide-react";
import CustomTextField from "../../components/shared/CustomTextField";
import ConfirmModal from "../../components/shared/ConfirmModal";
import Modal from "../../components/shared/Modal";
import { ManagerCardSkeleton } from "../../components/shared/Skeleton";
import PageHeader from "../../components/shared/PageHeader";
import Snackbar from "../../components/shared/Snackbar";

const CategoriesManager = () => {
  const { hasPermission } = useAuth();
  const { data: svcCats = [], isLoading: loadingSvc } =
    useGetServiceCategoriesQuery();
  const { data: prodCats = [], isLoading: loadingProd } =
    useGetProductCategoriesListQuery();
  const [createServiceCategory] = useCreateServiceCategoryMutation();
  const [updateServiceCategory] = useUpdateServiceCategoryMutation();
  const [deleteServiceCategory] = useDeleteServiceCategoryMutation();
  const [createProductCategory] = useCreateProductCategoryMutation();
  const [updateProductCategory] = useUpdateProductCategoryMutation();
  const [deleteProductCategory] = useDeleteProductCategoryMutation();

  const loading = loadingProd;

  const categories = useMemo(() => {
    const all = [...prodCats.map((c) => ({ ...c, type: "product" }))];
    all.sort((a, b) => a.name.localeCompare(b.name));
    return all;
  }, [prodCats]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCat, setCurrentCat] = useState(null);
  const [name, setName] = useState("");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const handleOpenModal = (cat = null) => {
    if (cat) {
      setCurrentCat(cat);
      setName(cat.name);
    } else {
      setCurrentCat(null);
      setName("");
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const payload = { name };
      if (currentCat) {
        await updateProductCategory({
          id: currentCat._id,
          body: payload,
        }).unwrap();
      } else {
        await createProductCategory(payload).unwrap();
      }
      setIsModalOpen(false);
    } catch (err) {
      showSnack(rtkErrorMessage(err, "Operation failed"), "error");
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteProductCategory(categoryToDelete._id).unwrap();
      setIsDeleteModalOpen(false);
      setCategoryToDelete(null);
    } catch (err) {
      showSnack(
        rtkErrorMessage(err, "Failed to delete category"),
        "error",
      );
    }
  };

  const handleToggleActive = async (cat) => {
    if (!hasPermission("settings:manage:categories:toggle")) {
      showSnack("Permission denied", "error");
      return;
    }
    try {
      if (cat.type === "service") {
        await updateServiceCategory({
          id: cat._id,
          body: { isActive: !cat.isActive },
        }).unwrap();
      } else {
        await updateProductCategory({
          id: cat._id,
          body: { isActive: !cat.isActive },
        }).unwrap();
      }
    } catch (err) {
      showSnack(
        rtkErrorMessage(err, "Failed to update category"),
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
          <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
            <Search size={20} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Categories</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Manage your service and product categories in one place
            </p>
          </div>
        </div>
        {/* Add Button in Header */}
        {hasPermission("settings:manage:categories:add") && (
          <button
            onClick={() => handleOpenModal()}
            className="h-11 px-4 sm:px-6 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-primary/90 transition-all active:scale-95 flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Category</span>
          </button>
        )}
      </div>

      {loading ? (
        <ManagerCardSkeleton count={8} />
      ) : (
        <div className="flex flex-wrap gap-4">
          {categories.map((cat) => (
            <div
              key={cat._id}
              className={`bg-gray-50 dark:bg-dark-surface px-4 py-3 rounded-xl flex items-center gap-3 group w-full sm:w-auto sm:min-w-[140px] border border-gray-100 dark:border-dark-border hover:border-gray-200 dark:hover:border-gray-700 transition-all ${!cat.isActive ? "opacity-60" : ""}`}
            >
              <div className="flex flex-col">
                <span
                  className={`font-semibold text-sm whitespace-nowrap ${!cat.isActive ? "text-gray-400 line-through" : "text-gray-700 dark:text-gray-300"}`}
                >
                  {cat.name}
                </span>
                <span
                  className={`mt-1 self-start text-[8px] px-1 rounded uppercase tracking-tighter font-bold ${
                    cat.type === "service"
                      ? "bg-blue-50 text-blue-500 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-emerald-50 text-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-400"
                  }`}
                >
                  {cat.type}
                </span>
              </div>

              <div className="flex items-center gap-2 ml-auto pl-2 border-l border-gray-200 dark:border-dark-border">
                {/* Toggle Switch */}
                <button
                  onClick={() => handleToggleActive(cat)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${cat.isActive ? "bg-brand-primary" : "bg-gray-300 dark:bg-gray-600"}`}
                  title={cat.isActive ? "Deactivate" : "Activate"}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white dark:bg-dark-surface transition-transform ${cat.isActive ? "translate-x-5" : "translate-x-1"}`}
                  />
                </button>

                <div className="flex items-center gap-1 opacity-100 transition-opacity">
                  {hasPermission("settings:manage:categories:edit") && (
                    <button
                      onClick={() => handleOpenModal(cat)}
                      className="p-1 text-gray-400 dark:text-gray-500 hover:text-brand-primary dark:hover:text-brand-primary transition-colors"
                      title="Edit"
                    >
                      <Edit3 size={14} />
                    </button>
                  )}
                  {hasPermission("settings:manage:categories:delete") && (
                    <button
                      onClick={() => {
                        setCategoryToDelete(cat);
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
            </div>
          ))}

          {categories.length === 0 && !loading && (
            <div className="w-full py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
              No categories found.
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentCat ? "Edit Category" : "Add Category"}
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
              {currentCat ? "Save" : "Create"}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="py-2 space-y-4">
          <CustomTextField
            label="Category Name"
            placeholder="e.g. Hair, Shampoo"
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
        title="Delete Category"
        message={`Are you sure you want to delete '${categoryToDelete?.name}'?`}
        confirmLabel="Delete"
        type="danger"
      />
    </div>
  );
};

export default CategoriesManager;
