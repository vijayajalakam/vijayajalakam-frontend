import { useState, useEffect } from "react";
import { 
  FileText, 
  Loader2, 
  Save,
  Receipt,
  CreditCard,
  AlertTriangle,
  TrendingDown,
  ClipboardCheck,
  HandCoins,
} from "lucide-react";
import { motion } from "framer-motion";
import api from "../../../api/axiosInstance";
import Snackbar from "../../../components/shared/Snackbar";
import { TableSkeleton } from "../../../components/shared/Skeleton";
import { useAuth } from "../../auth/hooks/useAuth";

const DocumentSettings = () => {
  const { user, hasPermission, refreshConfig } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "SUPER_ADMIN" || user?.role === "SHOP_ADMIN";
  const canEdit = isAdmin || hasPermission("settings:more:documents:edit");
  
  // Only the active, valid document types used in Vijayajalakam Bookstore
  const documentTypes = [
    { 
      key: 'invoice', 
      label: 'Invoice', 
      icon: FileText, 
      prefix: 'INV/', 
      suffix: '', 
      length: 5, 
      nextNumber: 1,
      badge: 'Sales POS'
    },
    { 
      key: 'receipt', 
      label: 'Receipt', 
      icon: Receipt, 
      prefix: 'REC/', 
      suffix: '', 
      length: 5, 
      nextNumber: 1,
      badge: 'Accounts'
    },
    { 
      key: 'payment', 
      label: 'Payment', 
      icon: CreditCard, 
      prefix: 'PAY/', 
      suffix: '', 
      length: 5, 
      nextNumber: 1,
      badge: 'Accounts'
    },
    { 
      key: 'damageEntry', 
      label: 'Damage Books', 
      icon: AlertTriangle, 
      prefix: 'DMG/', 
      suffix: '', 
      length: 5, 
      nextNumber: 1,
      badge: 'Stock'
    },
    { 
      key: 'consumptionEntry', 
      label: 'Consumption Books', 
      icon: TrendingDown, 
      prefix: 'CON/', 
      suffix: '', 
      length: 5, 
      nextNumber: 1,
      badge: 'Stock'
    },
    { 
      key: 'stockAdjustment', 
      label: 'Adjust Books', 
      icon: ClipboardCheck, 
      prefix: 'ADJ/', 
      suffix: '', 
      length: 5, 
      nextNumber: 1,
      badge: 'Stock'
    },
    { 
      key: 'settlement', 
      label: 'Settlement', 
      icon: HandCoins, 
      prefix: 'SETTLE/', 
      suffix: '', 
      length: 5, 
      nextNumber: 1,
      badge: 'Staff'
    },
  ];

  const [formData, setFormData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [shopCreatedYear, setShopCreatedYear] = useState("");
  const [globalSuffix, setGlobalSuffix] = useState("");
  const [currentNumbers, setCurrentNumbers] = useState({});
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ message: "", type: "success" });

  const showSnack = (message, type = "success") => setSnack({ message, type });

  const fetchSettings = async () => {
    try {
      setFetching(true);
      const res = await api.get("/admin/profile");
      if (res.data.success) {
        const bData = res.data.data;
        const business = bData?.businessProfile || bData?.business || {};
        const { shopCreatedYear: year, currentNumbers: backendCurrentNumbers } = bData;
        
        const data = {};
        const original = {};
        
        documentTypes.forEach(doc => {
          const prefixKey = `${doc.key}Prefix`;
          const suffixKey = `${doc.key}Suffix`;
          const lengthKey = `${doc.key}Length`;
          const nextNumberKey = `${doc.key}NextNumber`;
          
          data[prefixKey] = business[prefixKey] !== undefined && business[prefixKey] !== null
            ? business[prefixKey] 
            : doc.prefix;
          data[suffixKey] = business[suffixKey] !== undefined && business[suffixKey] !== null
            ? business[suffixKey] 
            : (year ? `/${year}` : doc.suffix);
          data[lengthKey] = business[lengthKey] !== undefined && business[lengthKey] !== null
            ? business[lengthKey] 
            : doc.length;
          data[nextNumberKey] = business[nextNumberKey] !== undefined && business[nextNumberKey] !== null
            ? business[nextNumberKey] 
            : doc.nextNumber;
          
          original[prefixKey] = data[prefixKey];
          original[suffixKey] = data[suffixKey];
          original[nextNumberKey] = data[nextNumberKey];
        });
        
        setFormData(data);
        setOriginalData(original);
        setShopCreatedYear(year || "");
        setCurrentNumbers(backendCurrentNumbers || {});
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
      showSnack("Failed to load settings", "error");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Set initial global suffix after data is loaded
  useEffect(() => {
    if (!fetching && formData && Object.keys(formData).length > 0 && globalSuffix === "") {
      const firstSuffix = formData[`${documentTypes[0].key}Suffix`] || "";
      const extractedSuffix = firstSuffix.startsWith("/") ? firstSuffix.substring(1) : firstSuffix;
      setGlobalSuffix(extractedSuffix || shopCreatedYear);
    }
  }, [fetching, formData, shopCreatedYear, globalSuffix]);

  const handleGlobalSuffixChange = (value) => {
    const cleanValue = value.replace(/^\/+/, "");
    setGlobalSuffix(cleanValue);
    
    // Update all document suffixes with the new global suffix
    setFormData((prev) => {
      const newData = { ...prev };
      documentTypes.forEach(doc => {
        const suffixKey = `${doc.key}Suffix`;
        const nextNumberKey = `${doc.key}NextNumber`;
        
        // Update suffix
        newData[suffixKey] = cleanValue ? `/${cleanValue}` : "";
        
        // Reset next number to 1 if suffix changed from original saved state
        if (newData[suffixKey] !== originalData[suffixKey]) {
          newData[nextNumberKey] = 1;
        } else {
          newData[nextNumberKey] = originalData[nextNumberKey] || 1;
        }
      });
      return newData;
    });
  };

  const handleChange = (docKey, field, value) => {
    const fullKey = `${docKey}${field.charAt(0).toUpperCase() + field.slice(1)}`;
    
    setFormData((prev) => {
      const newData = { ...prev, [fullKey]: value };
      
      const prefixKey = `${docKey}Prefix`;
      const suffixKey = `${docKey}Suffix`;
      const nextNumberKey = `${docKey}NextNumber`;
      
      if (field === 'prefix') {
        if (value !== originalData[prefixKey]) {
          newData[nextNumberKey] = 1;
        } else {
          newData[nextNumberKey] = originalData[nextNumberKey] || 1;
        }
      } else if (field === 'suffix') {
        if (value !== originalData[suffixKey]) {
          newData[nextNumberKey] = 1;
        } else {
          newData[nextNumberKey] = originalData[nextNumberKey] || 1;
        }
      }
      
      return newData;
    });
  };

  const handleSave = async () => {
    if (!canEdit) {
      showSnack("You don't have permission to edit settings", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await api.put("/admin/profile", formData);
      if (res.data.success) {
        showSnack("Document settings saved successfully!", "success");
        
        if (refreshConfig) {
          await refreshConfig();
        }
        
        // Update original data to reflect saved state
        const newOriginal = {};
        documentTypes.forEach(doc => {
          const prefixKey = `${doc.key}Prefix`;
          const suffixKey = `${doc.key}Suffix`;
          const nextNumberKey = `${doc.key}NextNumber`;
          newOriginal[prefixKey] = formData[prefixKey];
          newOriginal[suffixKey] = formData[suffixKey];
          newOriginal[nextNumberKey] = formData[nextNumberKey];
        });
        setOriginalData(newOriginal);
        
        // Fetch fresh data to update current numbers
        await fetchSettings();
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      showSnack(err.response?.data?.message || "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const generateSample = (docKey) => {
    const prefixKey = `${docKey}Prefix`;
    const suffixKey = `${docKey}Suffix`;
    const lengthKey = `${docKey}Length`;
    const nextNumberKey = `${docKey}NextNumber`;
    
    const prefix = formData[prefixKey] !== undefined ? formData[prefixKey] : "";
    const suffix = formData[suffixKey] !== undefined ? formData[suffixKey] : "";
    const length = Math.max(1, Math.min(10, Number(formData[lengthKey]) || 5));
    const nextNumber = Math.max(1, Number(formData[nextNumberKey]) || 1);
    
    const formattedNumber = String(nextNumber).padStart(length, '0');
    return `${prefix}${formattedNumber}${suffix}`;
  };

  if (fetching) {
    return (
      <div className="p-6 h-full">
        <TableSkeleton rows={7} cols={7} />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-6 py-4 bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Document Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure numbering formats for all active document types
          </p>
        </div>
        <div className="flex-shrink-0 ml-4">
          <button
            onClick={handleSave}
            disabled={saving || !canEdit}
            className={`flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white rounded-xl font-semibold text-sm hover:bg-brand-secondary transition-all shadow-sm ${
              (saving || !canEdit) ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Table Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-start bg-white dark:bg-dark-surface border-separate border-spacing-0">
            <thead className="bg-gray-50/50 dark:bg-dark-card/50 border-b border-gray-100 dark:border-dark-border">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-dark-border text-start">
                  Document Type
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-dark-border text-center">
                  Length
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-dark-border text-start">
                  Prefix
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-dark-border text-center">
                  Next No
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-dark-border text-start">
                  <div className="flex items-center gap-3">
                    <span>Suffix</span>
                    <input
                      type="text"
                      maxLength="6"
                      value={globalSuffix}
                      onChange={(e) => handleGlobalSuffixChange(e.target.value)}
                      disabled={!canEdit}
                      placeholder={shopCreatedYear}
                      className="w-16 px-2 py-1 bg-white dark:bg-dark-surface border border-brand-primary/30 dark:border-brand-primary/30 rounded-md text-[11px] font-bold text-brand-primary dark:text-brand-primary text-center focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Change all suffixes at once"
                    />
                  </div>
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-dark-border text-center">
                  Current
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-dark-border text-start">
                  Sample
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50/80 dark:divide-dark-border/50">
              {documentTypes.map((doc, idx) => {
                const Icon = doc.icon;
                const prefixKey = `${doc.key}Prefix`;
                const suffixKey = `${doc.key}Suffix`;
                const lengthKey = `${doc.key}Length`;
                const nextNumberKey = `${doc.key}NextNumber`;
                
                return (
                  <motion.tr 
                    key={doc.key}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02, duration: 0.2 }}
                    className="hover:bg-gray-50 dark:bg-dark-card/50 dark:hover:bg-dark-card/50 transition-colors group"
                  >
                    {/* Document Type */}
                    <td className="px-6 py-4 border-b border-gray-50/50 dark:border-dark-border/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-brand-primary/10 to-blue-50 dark:from-brand-primary/20 dark:to-dark-surface rounded-xl flex-shrink-0">
                          <Icon size={18} className="text-brand-primary dark:text-blue-400" />
                        </div>
                        <div>
                          <span className="text-[13px] font-bold text-gray-900 dark:text-white block leading-tight">{doc.label}</span>
                          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{doc.badge}</span>
                        </div>
                      </div>
                    </td>
                    
                    {/* Length */}
                    <td className="px-6 py-4 border-b border-gray-50/50 dark:border-dark-border/50">
                      <div className="flex justify-center">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={formData[lengthKey] !== undefined ? formData[lengthKey] : 5}
                          onChange={(e) => handleChange(doc.key, 'length', Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                          disabled={!canEdit}
                          className="w-16 px-2 py-1.5 text-center bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg text-[12px] font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </td>
                    
                    {/* Prefix */}
                    <td className="px-6 py-4 border-b border-gray-50/50 dark:border-dark-border/50">
                      <input
                        type="text"
                        maxLength="10"
                        value={formData[prefixKey] !== undefined ? formData[prefixKey] : ""}
                        onChange={(e) => handleChange(doc.key, 'prefix', e.target.value)}
                        disabled={!canEdit}
                        placeholder={doc.prefix}
                        className="w-full px-3 py-1.5 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg text-[12px] font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </td>
                    
                    {/* Next No */}
                    <td className="px-6 py-4 border-b border-gray-50/50 dark:border-dark-border/50">
                      <div className="flex justify-center">
                        <input
                          type="number"
                          min="1"
                          value={formData[nextNumberKey] !== undefined ? formData[nextNumberKey] : 1}
                          onChange={(e) => handleChange(doc.key, 'nextNumber', Math.max(1, parseInt(e.target.value) || 1))}
                          disabled={!canEdit}
                          className="w-20 px-2 py-1.5 text-center bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg text-[12px] font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </td>
                    
                    {/* Suffix */}
                    <td className="px-6 py-4 border-b border-gray-50/50 dark:border-dark-border/50">
                      <input
                        type="text"
                        maxLength="10"
                        value={formData[suffixKey] !== undefined ? formData[suffixKey] : ""}
                        onChange={(e) => handleChange(doc.key, 'suffix', e.target.value)}
                        disabled={!canEdit}
                        placeholder={shopCreatedYear ? `/${shopCreatedYear}` : ""}
                        className="w-full px-3 py-1.5 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg text-[12px] font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </td>
                    
                    {/* Current No */}
                    <td className="px-6 py-4 border-b border-gray-50/50 dark:border-dark-border/50">
                      <div className="flex justify-center">
                        <span className="inline-flex items-center px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/30 rounded-lg text-[11px] font-black text-emerald-700 dark:text-emerald-400">
                          {currentNumbers[doc.key] !== undefined ? currentNumbers[doc.key] : 0}
                        </span>
                      </div>
                    </td>
                    
                    {/* Sample */}
                    <td className="px-6 py-4 border-b border-gray-50/50 dark:border-dark-border/50">
                      <div className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-brand-primary/10 via-blue-50 to-indigo-50 dark:from-brand-primary/20 dark:via-dark-surface dark:to-dark-border border border-brand-primary/30 rounded-lg">
                        <span className="text-[11px] font-black text-brand-primary dark:text-blue-400 tracking-wide font-mono">
                          {generateSample(doc.key)}
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Explanation Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl border border-blue-200 dark:border-blue-800/30 p-6"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex-shrink-0">
            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
              Understanding Document Settings
            </h3>
            
            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
              {/* What is Document Settings */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full"></span>
                  What is Document Settings?
                </h4>
                <p className="ml-4 leading-relaxed">
                  Document Settings allows you to customize numbering formats for all documents across the software. 
                  Each active document type (Invoice, Receipt, Payment, Damage Books, Consumption Books, Adjust Books, and Settlement) 
                  can have its own unique numbering format with a prefix, digit length, and suffix.
                </p>
              </div>

              {/* How Numbering Works */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full"></span>
                  How Numbering Works
                </h4>
                <ul className="ml-4 space-y-2 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                    <span><strong>Prefix:</strong> Text that appears before the number (e.g., &quot;INV/&quot;, &quot;REC/&quot;, &quot;DMG/&quot;)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                    <span><strong>Length:</strong> Number of digits in the document number (padded with leading zeros, e.g., 5 digits &rarr; 00001)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                    <span><strong>Next No:</strong> The sequence number that will be assigned to the next document created</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                    <span><strong>Suffix:</strong> Text appended to the number (e.g., &quot;/26&quot; for year 2026)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                    <span><strong>Current:</strong> Displays the highest/last recorded document number in the database</span>
                  </li>
                </ul>
              </div>

              {/* Automatic Number Reset */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4">
                <h4 className="font-semibold text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-600 dark:bg-amber-400 rounded-full"></span>
                  Automatic Number Reset on Suffix or Prefix Change
                </h4>
                <p className="ml-4 leading-relaxed text-amber-800 dark:text-amber-200">
                  When you update the <strong>Prefix</strong> or <strong>Suffix</strong> of any document type, 
                  the &quot;Next No&quot; automatically resets to <strong>1</strong>. For example, when changing the year suffix from 
                  &quot;/25&quot; to &quot;/26&quot;, numbering seamlessly begins from 1 again for the new financial period.
                </p>
              </div>

              {/* Global Suffix Feature */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full"></span>
                  Global Suffix Quick-Update
                </h4>
                <p className="ml-4 leading-relaxed">
                  Use the quick input in the <strong>Suffix</strong> column header to update all document suffixes simultaneously. 
                  Typing a new year (e.g., &quot;26&quot;) will instantly update all document suffixes to &quot;/26&quot; and reset 
                  their next numbers to 1.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DocumentSettings;
