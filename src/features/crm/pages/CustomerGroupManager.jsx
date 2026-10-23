import React, { useState, useEffect } from "react";
import { UsersRound, Check, Save, Plus, Trash2, Edit2, Loader2, Search } from "lucide-react";
import api from "../../../api/axiosInstance";
import Snackbar from "../../../components/shared/Snackbar";
import CustomDropdown from "../../../components/shared/CustomDropdown";
import ConfirmModal from "../../../components/shared/ConfirmModal";

const GROUP_COLORS = [
  { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', hover: 'hover:border-blue-300' },
  { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', hover: 'hover:border-emerald-300' },
  { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800', hover: 'hover:border-violet-300' },
  { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', hover: 'hover:border-amber-300' },
  { bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-700 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-800', hover: 'hover:border-pink-300' },
  { bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800', hover: 'hover:border-cyan-300' },
  { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800', hover: 'hover:border-rose-300' },
  { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800', hover: 'hover:border-indigo-300' },
];

const getGroupColor = (groupId) => {
  if (!groupId || groupId === "none") return { bg: 'bg-white dark:bg-dark-card', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-dark-border', hover: 'hover:border-brand-primary/40' };
  
  let hash = 0;
  for (let i = 0; i < groupId.length; i++) {
    hash = groupId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GROUP_COLORS.length;
  return GROUP_COLORS[index];
};

const CustomerGroupManager = () => {
  const [groups, setGroups] = useState([]);
  const [customers, setCustomers] = useState([]);
  
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [page, setPage] = useState(1);
  const [hasMoreCustomers, setHasMoreCustomers] = useState(true);
  
  // Left pane states
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [formData, setFormData] = useState({ name: "", discountType: "percentage", discountValue: 0 });
  const [isEditing, setIsEditing] = useState(false);

  // Right pane states
  const [searchQuery, setSearchQuery] = useState("");

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  useEffect(() => {
    fetchGroups();
    fetchCustomers(1, false);
  }, []);

  const fetchGroups = async () => {
    try {
      setLoadingGroups(true);
      const res = await api.get("/customer-groups");
      setGroups(res.data.data || []);
    } catch (err) {
      console.error(err);
      showSnack("Failed to load groups", "error");
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchCustomers = async (pageNum, isLoadMore = false) => {
    if (!isLoadMore) setLoadingCustomers(true);
    else setLoadingMore(true);
    
    try {
      const res = await api.get(`/admin/customers?limit=20&page=${pageNum}`);
      const newCustomers = res.data.data || [];
      
      if (isLoadMore) {
        setCustomers(prev => [...prev, ...newCustomers]);
      } else {
        setCustomers(newCustomers);
      }
      
      // If we received less than 20, there are no more
      setHasMoreCustomers(newCustomers.length === 20);
      setPage(pageNum);
    } catch (err) {
      console.error(err);
      showSnack("Failed to load customers", "error");
    } finally {
      setLoadingCustomers(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMoreCustomers) {
      fetchCustomers(page + 1, true);
    }
  };

  const handleCreateOrUpdateGroup = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return showSnack("Group name is required", "error");
    if (formData.discountValue < 0) return showSnack("Discount value cannot be negative", "error");

    setSubmitting(true);
    try {
      if (isEditing && selectedGroupId) {
        await api.put(`/customer-groups/${selectedGroupId}`, formData);
        showSnack("Group updated successfully");
      } else {
        await api.post("/customer-groups", formData);
        showSnack("Group created successfully");
        setFormData({ name: "", discountType: "percentage", discountValue: 0 });
      }
      fetchGroups();
    } catch (err) {
      showSnack(err.response?.data?.error || "Operation failed", "error");
    } finally {
      setSubmitting(false);
      setIsEditing(false);
      setSelectedGroupId(null);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);

  const handleDeleteGroup = (e, id) => {
    e.stopPropagation();
    setGroupToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteGroup = async () => {
    try {
      await api.delete(`/customer-groups/${groupToDelete}`);
      showSnack("Group deleted");
      if (selectedGroupId === groupToDelete) {
        setSelectedGroupId(null);
        setFormData({ name: "", discountType: "percentage", discountValue: 0 });
        setIsEditing(false);
      }
      fetchGroups();
      fetchCustomers(1, false);
    } catch (err) {
      showSnack("Error deleting group", "error");
    } finally {
      setShowDeleteConfirm(false);
      setGroupToDelete(null);
    }
  };

  const handleEditClick = (e, group) => {
    e.stopPropagation();
    setIsEditing(true);
    setSelectedGroupId(group._id);
    setFormData({
      name: group.name,
      discountType: group.discountType,
      discountValue: group.discountValue
    });
  };

  const handleCustomerGroupChange = async (customerId, newGroupId) => {
    try {
      await api.put(`/customer-groups/customer/${customerId}`, {
        customerGroupId: newGroupId === "none" ? null : newGroupId
      });
      showSnack("Customer group updated");
      
      // Update local state
      setCustomers(prev => prev.map(c => 
        c._id === customerId ? { ...c, customerGroupId: newGroupId === "none" ? null : newGroupId } : c
      ));
      
      // Refresh groups to update customer counts
      fetchGroups();
    } catch (err) {
      showSnack("Failed to update customer group", "error");
    }
  };

  const filteredCustomers = customers.filter(c => {
    if (c.name === "LOCAL CUSTOMER" || c.phone === "0000000000") return false;
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const groupName = groups.find(g => g._id === c.customerGroupId)?.name?.toLowerCase() || "";
    
    return (
      c.name?.toLowerCase().includes(query) ||
      c.phone?.includes(query) ||
      groupName.includes(query)
    );
  });

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-120px)] md:h-[calc(100vh-120px)] bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border rounded-xl overflow-hidden">
      {snack.message && (
        <Snackbar message={snack.message} type={snack.type} onClose={() => setSnack({ message: "", type: "success" })} />
      )}

      {/* LEFT PANE */}
      <aside className="w-full md:w-[350px] lg:w-[400px] flex flex-col bg-white dark:bg-dark-card border-r border-gray-100 dark:border-dark-border">
        <div className="p-4 border-b border-gray-100 dark:border-dark-border">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UsersRound size={20} className="text-brand-primary dark:text-blue-400" />
            Customer Groups
          </h2>
        </div>

        {/* Create/Edit Form */}
        <div className="p-4 bg-gray-50/50 dark:bg-dark-bg/20 border-b border-gray-100 dark:border-dark-border">
          <form onSubmit={handleCreateOrUpdateGroup} className="space-y-3">
            <div>
              <label className="text-[12px] font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Group Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-brand-primary outline-none"
                placeholder="e.g. VIP Buyers"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[12px] font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Discount Type</label>
                <CustomDropdown
                  value={formData.discountType}
                  onChange={e => setFormData({ ...formData, discountType: e.target.value })}
                  options={[
                    { value: "percentage", label: "Percentage (%)" },
                    { value: "amount", label: "Fixed Amount" }
                  ]}
                  buttonClassName="w-full flex items-center justify-between bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-sm px-3 py-[9px] outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div className="flex-1">
                <label className="text-[12px] font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Value</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.discountValue}
                  onChange={e => setFormData({ ...formData, discountValue: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-brand-primary outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {isEditing ? <Save size={16} /> : <Plus size={16} />}
                {isEditing ? "Update Group" : "Create Group"}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedGroupId(null);
                    setFormData({ name: "", discountType: "percentage", discountValue: 0 });
                  }}
                  className="px-3 py-2 bg-gray-100 dark:bg-dark-card hover:bg-gray-200 dark:hover:bg-dark-border text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Group List */}
        <div className="flex-1 overflow-y-auto">
          {loadingGroups && groups.length === 0 ? (
            <div className="flex justify-center p-8"><Loader2 size={24} className="animate-spin text-brand-primary dark:text-blue-400" /></div>
          ) : groups.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">No groups created yet.</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-dark-border">
              {groups.map(group => {
                const colors = getGroupColor(group._id);
                return (
                <div 
                  key={group._id}
                  className={`p-4 flex items-center justify-between transition-colors border-l-4 ${colors.bg} ${colors.border}`}
                >
                  <div>
                    <h3 className={`font-bold ${colors.text}`}>
                      {group.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="bg-white/50 dark:bg-dark-bg/50 px-2 py-0.5 rounded border border-black/5 dark:border-white/5">
                        {group.discountType === 'percentage' ? `${group.discountValue}% Off` : `Fixed: ${group.discountValue}`}
                      </span>
                      <span>{group.customerCount || 0} buyers</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => handleEditClick(e, group)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-500 rounded-lg hover:bg-white dark:bg-dark-surface/50 transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={(e) => handleDeleteGroup(e, group._id)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 rounded-lg hover:bg-white dark:bg-dark-surface/50 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* RIGHT PANE */}
      <main className="flex-1 flex flex-col bg-white dark:bg-dark-bg relative">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-gray-100 dark:border-dark-border flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-white dark:bg-dark-bg z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Customers List
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Select a group from the dropdown next to a customer to automatically save.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input 
                type="text" 
                placeholder="Search local list..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm bg-gray-50 dark:bg-dark-card outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 w-full md:w-64"
              />
            </div>
          </div>
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {loadingCustomers && customers.length === 0 ? (
            <div className="flex justify-center p-12"><Loader2 size={32} className="animate-spin text-brand-primary dark:text-blue-400" /></div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center p-12 text-gray-500 dark:text-gray-400">
              <UsersRound size={48} className="mx-auto text-gray-300 mb-4" />
              <p>No customers found.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCustomers.map(customer => {
                  const displayValue = customer.customerGroupId || "none";
                  const colors = getGroupColor(displayValue);

                  return (
                    <div 
                      key={customer._id}
                      className="p-4 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl flex flex-col xl:flex-row xl:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {customer.name || 'Unnamed Customer'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{customer.phone || customer.email || 'No contact info'}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="w-[160px]">
                          <CustomDropdown
                            value={displayValue}
                            onChange={(e) => handleCustomerGroupChange(customer._id, e.target.value)}
                            options={[
                              { value: "none", label: "-- No Group --" },
                              ...groups.map(g => ({ value: g._id, label: g.name }))
                            ]}
                            buttonClassName={`w-full flex items-center justify-between border rounded-lg text-xs px-3 py-2 outline-none focus:ring-1 focus:ring-brand-primary transition-colors ${colors.bg} ${colors.border} ${colors.text} ${colors.hover}`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {hasMoreCustomers && !searchQuery && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-6 py-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors flex items-center gap-2 shadow-sm"
                  >
                    {loadingMore && <Loader2 size={16} className="animate-spin" />}
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Snackbar
        isOpen={!!snack.message}
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setGroupToDelete(null);
        }}
        onConfirm={confirmDeleteGroup}
        title="Delete Customer Group"
        message="Are you sure you want to delete this group? Assigned customers will be removed from this group."
        confirmLabel="Delete Group"
      />
    </div>
  );
};

export default CustomerGroupManager;
