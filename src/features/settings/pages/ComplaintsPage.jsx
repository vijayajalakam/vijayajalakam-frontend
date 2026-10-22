import React, { useState } from 'react';
import { 
    MessageSquare, Bug, Lightbulb, Layout, Clock, CheckCircle2, 
    AlertCircle, ChevronLeft, Plus, Send, Edit2, Trash2
} from 'lucide-react';
import { useGetShopComplaintsQuery, useCreateComplaintMutation, useUpdateComplaintMutation, useDeleteComplaintMutation } from '../../../store/api/complaintEndpoints';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import Snackbar from '../../../components/shared/Snackbar';
import SettingsSection from '../../../components/shared/SettingsSection';
import ConfirmModal from '../../../components/shared/ConfirmModal';
import { motion } from 'framer-motion';

const COMPLAINT_TYPES = [
    { id: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
    { id: 'feature_request', label: 'Feature Request', icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { id: 'ui_issue', label: 'UI/UX Issue', icon: Layout, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { id: 'other', label: 'Other', icon: MessageSquare, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900/20' }
];

const COMPLAINT_TYPE_CONFIG = {
    bug: { label: 'Bug Report', icon: Bug, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
    feature_request: { label: 'Feature Request', icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    ui_issue: { label: 'UI/UX Issue', icon: Layout, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    other: { label: 'Other', icon: MessageSquare, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900/20' }
};

// Removed PRIORITIES array

const STATUS_CONFIG = {
    pending: { label: 'Pending', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-100/50' },
    'in-progress': { label: 'In Progress', icon: AlertCircle, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-100/50' },
    resolved: { label: 'Completed', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-100/50' },
    closed: { label: 'Closed', icon: CheckCircle2, color: 'text-gray-400 dark:text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', border: 'border-gray-200 dark:border-dark-border/50' }
};

const ALL_TABS = [
  { id: "submit", label: "Submit Feedback", icon: Plus },
  { id: "reports", label: "Previous Reports", icon: MessageSquare },
];

const ComplaintsPage = () => {
    const navigate = useNavigate();
    const { data: complaints = [], isLoading } = useGetShopComplaintsQuery();
    const [createComplaint, { isLoading: isSubmitting }] = useCreateComplaintMutation();

    const [activeTab, setActiveTab] = useState("submit");

    const [editingId, setEditingId] = useState(null);
    const [type, setType] = useState('bug');
    const [description, setDescription] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' });

    const [updateComplaint, { isLoading: isUpdating }] = useUpdateComplaintMutation();
    const [deleteComplaint] = useDeleteComplaintMutation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!description.trim()) {
            setSnackbar({ open: true, message: 'Please provide a description', type: 'error' });
            return;
        }

        try {
            if (editingId) {
                await updateComplaint({ id: editingId, type, description }).unwrap();
                setSnackbar({ open: true, message: 'Successfully updated', type: 'success' });
            } else {
                await createComplaint({ type, description }).unwrap();
                setSnackbar({ open: true, message: 'Successfully registered', type: 'success' });
            }
            setDescription('');
            setEditingId(null);
            setActiveTab('reports');
        } catch (error) {
            setSnackbar({ open: true, message: error.data?.message || 'Failed to submit', type: 'error' });
        }
    };

    const handleEdit = (complaint) => {
        setEditingId(complaint._id);
        setType(complaint.type);
        setDescription(complaint.description);
        setActiveTab("submit");
    };

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [complaintToDelete, setComplaintToDelete] = useState(null);

    const handleDelete = (id) => {
        setComplaintToDelete(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        try {
            await deleteComplaint(complaintToDelete).unwrap();
            setSnackbar({ open: true, message: 'Successfully deleted', type: 'success' });
        } catch (error) {
            setSnackbar({ open: true, message: 'Failed to delete', type: 'error' });
        } finally {
            setShowDeleteConfirm(false);
            setComplaintToDelete(null);
        }
    };

    const isWorking = isSubmitting || isUpdating;

    return (
        <div className="max-w-4xl animate-in fade-in duration-500 space-y-6">


            {/* Tab Navigation */}
            <div className="flex overflow-x-auto scrollbar-hide gap-2 pb-2">
                {ALL_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap transition-all text-sm font-semibold border ${
                                isActive
                                    ? "bg-brand-primary text-white border-brand-primary"
                                    : "bg-white text-gray-500 hover:bg-gray-50 border-gray-100 dark:bg-dark-card dark:border-dark-border dark:text-gray-400 dark:hover:bg-dark-border"
                            }`}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Section */}
            <div className="w-full">
                {activeTab === "submit" && (
                    <SettingsSection
                        title="Submit New Feedback"
                        subtitle="Tell us about bugs, feature requests, or UI issues you've encountered."
                        icon={Plus}
                    >
                        <form onSubmit={handleSubmit} className="md:col-span-2 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Feedback Type</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {COMPLAINT_TYPES.map((item) => {
                                            const Icon = item.icon;
                                            const isSelected = type === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => setType(item.id)}
                                                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
                                                        isSelected ? 'border-brand-primary bg-brand-primary/5' : 'border-gray-50 dark:border-dark-border bg-gray-50/50 dark:bg-dark-surface/50 hover:bg-gray-100 dark:hover:bg-dark-surface'
                                                    }`}
                                                >
                                                    <div className={`w-8 h-8 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                                                        <Icon size={16} className={item.color} />
                                                    </div>
                                                    <span className={`text-xs font-bold ${isSelected ? 'text-brand-primary' : 'text-gray-600 dark:text-gray-300'}`}>{item.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Detail Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Tell us more about the issue..."
                                    className="w-full h-32 p-4 rounded-2xl bg-gray-50 dark:bg-dark-surface border-2 border-transparent focus:border-brand-primary focus:bg-white dark:focus:bg-dark-card transition-all outline-none text-sm resize-none dark:text-white"
                                />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isWorking}
                                    className="px-8 py-3 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 group"
                                >
                                    {isWorking ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span>{editingId ? "Update Feedback" : "Submit Feedback"}</span>
                                            <Send size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </SettingsSection>
                )}

                {activeTab === "reports" && (
                    <SettingsSection
                        title="Previous Reports"
                        subtitle="Track the status and resolutions of your submitted feedback."
                        icon={MessageSquare}
                    >
                        <div className="md:col-span-2">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-8 h-8 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
                                </div>
                            ) : complaints.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 bg-gray-50/50 dark:bg-dark-surface/50 rounded-2xl border-2 border-dashed border-gray-100 dark:border-dark-border">
                                    <MessageSquare size={48} className="text-gray-200 mb-3" />
                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">No reports found</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Submit a new feedback to see it here.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {complaints.map((complaint) => {
                                        const typeConfig = COMPLAINT_TYPE_CONFIG[complaint.type] || COMPLAINT_TYPE_CONFIG.other;
                                        const statusConfig = STATUS_CONFIG[complaint.status] || STATUS_CONFIG.pending;
                                        const TypeIcon = typeConfig.icon;

                                        return (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                key={complaint._id} 
                                                className="p-5 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl hover:border-brand-primary/30 transition-all shadow-sm flex items-start gap-5"
                                            >
                                                <div className={`w-12 h-12 rounded-xl ${typeConfig.bg} flex items-center justify-center shrink-0`}>
                                                    <TypeIcon className={typeConfig.color} size={24} />
                                                </div>
                                                <div className="flex-1 min-w-0 space-y-3">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}`}>
                                                                {statusConfig.label}
                                                            </span>
                                                            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                                                                {moment(complaint.createdAt).format('MMM DD, YYYY')}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button 
                                                                onClick={() => handleEdit(complaint)}
                                                                className="p-1.5 text-gray-400 hover:text-brand-primary dark:text-blue-400 hover:bg-brand-primary/10 rounded-lg transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDelete(complaint._id)}
                                                                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed p-4 bg-gray-50/50 dark:bg-dark-surface/50 rounded-xl border-l-2 border-gray-200 dark:border-dark-border">
                                                        {complaint.description}
                                                    </p>
                                                    {complaint.adminNotes && (
                                                        <div className="p-4 bg-brand-primary/5 dark:bg-brand-primary/10 rounded-xl border-l-2 border-brand-primary">
                                                            <p className="text-[10px] font-black text-brand-primary dark:text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                                <AlertCircle size={12} />
                                                                Resolution Note
                                                            </p>
                                                            <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                                                                {complaint.adminNotes}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </SettingsSection>
                )}
            </div>

            <Snackbar {...snackbar} onClose={() => setSnackbar({ ...snackbar, message: '' })} />
            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setComplaintToDelete(null);
                }}
                onConfirm={confirmDelete}
                title="Delete Feedback"
                message="Are you sure you want to delete this feedback?"
                confirmLabel="Delete"
            />
        </div>
    );
};

export default ComplaintsPage;
