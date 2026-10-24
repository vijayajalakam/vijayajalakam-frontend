import { useState, useEffect } from "react";
import { 
  FileText, 
  Loader2, 
  Save,
  Receipt,
  CreditCard,
  FileCheck,
  ShoppingCart,
  RotateCcw,
  BookOpen,
  ArrowLeftRight,
  Package,
  Trash2,
  TrendingDown,
  HandCoins,
} from "lucide-react";
import { motion } from "framer-motion";
import api from "../../../api/axiosInstance";
import Snackbar from "../../../components/shared/Snackbar";
import { TableSkeleton } from "../../../components/shared/Skeleton";
import { useAuth } from "../../auth/hooks/useAuth";

const DocumentSettings = () => {
  const { hasPermission, refreshConfig } = useAuth();
  
  const documentTypes = [
    { key: 'invoice', label: 'Invoice', icon: FileText, prefix: 'INV/', suffix: '', length: 5, nextNumber: 1 },
    { key: 'receipt', label: 'Receipt', icon: Receipt, prefix: 'REC/', suffix: '', length: 5, nextNumber: 1 },
    { key: 'payment', label: 'Payment', icon: CreditCard, prefix: 'PAY/', suffix: '', length: 5, nextNumber: 1 },
    { key: 'bill', label: 'Bill', icon: FileCheck, prefix: 'BILL/', suffix: '', length: 5, nextNumber: 1 },
    { key: 'purchaseInvoice', label: 'Purchase Invoice', icon: ShoppingCart, prefix: 'PI/', suffix: '', length: 5, nextNumber: 1 },
    { key: 'purchaseReturn', label: 'Purchase Return', icon: RotateCcw, prefix: 'PR/', suffix: '', length: 5, nextNumber: 1 },
    { key: 'journal', label: 'Journal', icon: BookOpen, prefix: 'JV/', suffix: '', length: 5, nextNumber: 1 },
    { key: 'contra', label: 'Contra', icon: ArrowLeftRight, prefix: 'CV/', suffix: '', length: 5, nextNumber: 1 },
    { key: 'purchaseOrder', label: 'Purchase Order', icon: Package, prefix: 'PO/', suffix: '', length: 5, nextNumber: 1 },
    { key: 'stockTransfer', label: 'Stock Transfer', icon: Package, prefix: 'ST/', suffix: '', length: 5, nextNumber: 1 },
    { key: 'damageEntry', label: 'Damage Entry', icon: Trash2, prefix: 'DMG/', suffix: '', length: 5, nextNumber: 1 },
    { key: 'consumptionEntry', label: 'Consumption Entry', icon: TrendingDown, prefix: 'CON/', suffix: '', length: 5, nextNumber: 1 },
    { key: 'settlement', label: 'Settlement', icon: HandCoins, prefix: 'SETTLE/', suffix: '', length: 5, nextNumber: 1 },
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
      const res = await api.get("/admin/profile");
      if (res.data.success) {
        const bData = res.data.data;
        const business = bData?.businessProfile || bData?.business;
        const { shopCreatedYear: year, currentNumbers: backendCurrentNumbers } = res.data.data;
        
        const data = {};
        const original = {};
        
        documentTypes.forEach(doc => {
          const prefixKey = `${doc.key}Prefix`;
          const suffixKey = `${doc.key}Suffix`;
          const lengthKey = `${doc.key}Length`;
          const nextNumberKey = `${doc.key}NextNumber`;
          
          data[prefixKey] = business[prefixKey] || doc.prefix;
          data[suffixKey] = business[suffixKey] || (year ? `/${year}` : "");
          data[lengthKey] = business[lengthKey] || doc.length;
          data[nextNumberKey] = business[nextNumberKey] || doc.nextNumber;
          
          original[prefixKey] = data[prefixKey];
          original[suffixKey] = data[suffixKey];
        });
        
        setFormData(data);
        setOriginalData(original);
        setShopCreatedYear(year || "");
        
        // Set current numbers from backend
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
  }, [fetching, formData]);

  const handleGlobalSuffixChange = (value) => {
    setGlobalSuffix(value);
    
    // Update all document suffixes with the new global suffix
    setFormData((prev) => {
      const newData = { ...prev };
      documentTypes.forEach(doc => {
        const suffixKey = `${doc.key}Suffix`;
        const nextNumberKey = `${doc.key}NextNumber`;
        
        // Update suffix
        newData[suffixKey] = value ? `/${value}` : "";
        
        // Reset next number to 1 if suffix changed
        if (newData[suffixKey] !== originalData[suffixKey]) {
          newData[nextNumberKey] = 1;
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
      
      if (field === 'prefix' && value !== originalData[prefixKey]) {
        newData[nextNumberKey] = 1;
      } else if (field === 'suffix' && value !== originalData[suffixKey]) {
        newData[nextNumberKey] = 1;
      }
      
      return newData;
    });
  };

  const handleSave = async () => {
    if (!hasPermission("settings:more:documents:edit")) {
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
          newOriginal[prefixKey] = formData[prefixKey];
          newOriginal[suffixKey] = formData[suffixKey];
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
    
    const prefix = formData[prefixKey] || "";
    const suffix = formData[suffixKey] || "";
    const length = formData[lengthKey] || 5;
    const nextNumber = formData[nextNumberKey] || 1;
    
    const formattedNumber = String(nextNumber).padStart(length, '0');
    return `${prefix}${formattedNumber}${suffix}`;
  };

  if (fetching) {
    return (
      <div className="p-6 h-full">
        <TableSkeleton rows={8} cols={7} />
      </div>
    );
  }

  const canEdit = hasPermission("settings:more:documents:edit");

  return (
    <div className="w-full h-full flex flex-col">
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />

      {/* Custom Header */}
      <div className="flex items-center justify-between mb-6 px-6 py-4 bg-white dark:bg-dark-card rounded-xl">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Document Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure numbering formats for all document types
          </p>
        </div>
        <div className="flex-shrink-0 ml-4">
          <button
            onClick={handleSave}
            disabled={saving || !canEdit}
            className={`flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white rounded-xl font-semibold text-sm hover:bg-brand-secondary transition-all ${
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
            <thead className="bg-gray-50/30 dark:bg-dark-card/50 border-b border-gray-100 dark:border-dark-border">
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
                      maxLength="4"
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
                    transition={{ delay: idx * 0.01, duration: 0.2 }}
                    className="hover:bg-gray-50 dark:bg-dark-card/50 dark:hover:bg-dark-card/50 transition-colors group"
                  >
                    {/* Document Type */}
                    <td className="px-6 py-4 border-b border-gray-50/50 dark:border-dark-border/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-brand-primary/10 to-blue-50 dark:from-brand-primary/20 dark:to-dark-surface rounded-lg">
                          <Icon size={16} className="text-brand-primary dark:text-blue-400" />
                        </div>
                        <span className="text-[13px] font-bold text-gray-900 dark:text-white">{doc.label}</span>
                      </div>
                    </td>
                    
                    {/* Length */}
                    <td className="px-6 py-4 border-b border-gray-50/50 dark:border-dark-border/50">
                      <div className="flex justify-center">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={formData[lengthKey] || 5}
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
                        value={formData[prefixKey] || ""}
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
                          value={formData[nextNumberKey] || 1}
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
                        value={formData[suffixKey] || ""}
                        onChange={(e) => handleChange(doc.key, 'suffix', e.target.value)}
                        disabled={!canEdit}
                        placeholder={`/${shopCreatedYear}`}
                        className="w-full px-3 py-1.5 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg text-[12px] font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </td>
                    
                    {/* Current No */}
                    <td className="px-6 py-4 border-b border-gray-50/50 dark:border-dark-border/50">
                      <div className="flex justify-center">
                        <span className="inline-flex items-center px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/30 rounded-lg text-[11px] font-black text-emerald-700 dark:text-emerald-400">
                          {currentNumbers[doc.key] || 0}
                        </span>
                      </div>
                    </td>
                    
                    {/* Sample */}
                    <td className="px-6 py-4 border-b border-gray-50/50 dark:border-dark-border/50">
                      <div className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-brand-primary/10 via-blue-50 to-indigo-50 dark:from-brand-primary/20 dark:via-dark-surface dark:to-dark-border border border-brand-primary/30 rounded-lg">
                        <span className="text-[11px] font-black text-brand-primary dark:text-blue-400 tracking-wide">
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
        transition={{ delay: 0.2 }}
        className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl border border-blue-200 dark:border-blue-800/30 p-6"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
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
                  Document Settings allows you to customize the numbering format for all types of documents in your system. 
                  Each document type (Invoice, Receipt, Payment, etc.) can have its own unique numbering pattern with a prefix, 
                  number length, and suffix.
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
                    <span><strong>Prefix:</strong> Text that appears before the number (e.g., "INV/", "REC/")</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                    <span><strong>Length:</strong> Number of digits in the document number (padded with zeros)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                    <span><strong>Next No:</strong> The next number that will be used for new documents</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                    <span><strong>Suffix:</strong> Text that appears after the number (e.g., "/24" for year 2024)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                    <span><strong>Current:</strong> Shows the last used number in the system</span>
                  </li>
                </ul>
              </div>

              {/* Number Reset Feature */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4">
                <h4 className="font-semibold text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-600 dark:bg-amber-400 rounded-full"></span>
                  Automatic Number Reset
                </h4>
                <p className="ml-4 leading-relaxed text-amber-800 dark:text-amber-200">
                  When you change the <strong>Prefix</strong> or <strong>Suffix</strong> of any document type, 
                  the "Next No" will automatically reset to <strong>1</strong>. This ensures a fresh numbering sequence 
                  for the new format. For example, if you change the suffix from "/24" to "/25" (for a new year), 
                  the numbering will start from 1 again with the new suffix.
                </p>
              </div>

              {/* Global Suffix Feature */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full"></span>
                  Global Suffix Update
                </h4>
                <p className="ml-4 leading-relaxed">
                  Use the input box in the "Suffix" column header to change the suffix for <strong>all document types at once</strong>. 
                  This is useful when starting a new financial year. Simply enter the new year (e.g., "25" for 2025) and all 
                  document suffixes will be updated to "/25", and all "Next No" values will reset to 1.
                </p>
              </div>

              {/* Example */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-xl p-4">
                <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-600 dark:bg-green-400 rounded-full"></span>
                  Example Scenario
                </h4>
                <div className="ml-4 space-y-2 text-green-800 dark:text-green-200">
                  <p className="leading-relaxed">
                    <strong>Current Setup:</strong> Invoice format is "INV/00027/24" (Prefix: INV/, Next No: 27, Suffix: /24)
                  </p>
                  <p className="leading-relaxed">
                    <strong>Action:</strong> You change the global suffix from "24" to "25" for the new year
                  </p>
                  <p className="leading-relaxed">
                    <strong>Result:</strong> Invoice format becomes "INV/00001/25" (Next No automatically resets to 1)
                  </p>
                  <p className="leading-relaxed">
                    <strong>Benefit:</strong> Fresh numbering sequence for the new year without manual reset
                  </p>
                </div>
              </div>

              {/* Tips */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full"></span>
                  Tips
                </h4>
                <ul className="ml-4 space-y-2 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                    <span>The "Sample" column shows how your next document number will look</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                    <span>You can manually set "Next No" to any number if needed (e.g., to continue from a previous system)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                    <span>Changes take effect immediately after clicking "Save Changes"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                    <span>The "Current" number shows the last document number used in your system</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DocumentSettings;
