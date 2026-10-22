import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { validateFileSize, getFileSizeHint } from '../../utils/fileUploadUtils';
import Modal from './Modal';
import CustomTable from './CustomTable';
import CustomTextField from './CustomTextField';
import CustomDropdown from './CustomDropdown';
import { UploadCloud, CheckCircle, Trash2, Edit3, Save, X, AlertTriangle } from 'lucide-react';
import api from '../../api/axiosInstance';
import { useAuth } from '../../features/auth/hooks/useAuth';

const UploadServicesModal = ({ isOpen, onClose, onUploadSuccess, showSnack }) => {
  const { currencySymbol } = useAuth();
  const fileInputRef = useRef(null);
  
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Inline editing state
  const [editingIndex, setEditingIndex] = useState(null);
  const [editRowData, setEditRowData] = useState(null);

  const resetState = () => {
    setFile(null);
    setData([]);
    setEditingIndex(null);
    setEditRowData(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    const validation = validateFileSize(uploadedFile);
    if (!validation.isValid) {
      showSnack(validation.message, "error");
      e.target.value = ""; // Reset the input
      return;
    }

    // Validate file type
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', '.csv'];
    if (!validTypes.includes(uploadedFile.type) && !uploadedFile.name.endsWith('.csv') && !uploadedFile.name.endsWith('.xlsx')) {
        showSnack("Please upload a valid Excel or CSV file", "error");
        return;
    }

    setFile(uploadedFile);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws, { defval: "" });

        // Map column headers according to expected format
        const mappedData = rawData.map((row, index) => {
             // Try to handle varied case/spaces in headers
             const getVal = (possibleKeys) => {
                 for (let key of Object.keys(row)) {
                     if (possibleKeys.some(pK => key.toLowerCase().trim() === pK.toLowerCase().trim())) {
                         return row[key] || "";
                     }
                 }
                 return "";
             };

             return {
                 id: index, // temporary id for editing
                 serviceName: getVal(['Service Name', 'ServiceName', 'Name', 'Service']),
                 categoryName: getVal(['Category', 'CategoryName', 'Category Name']),
                 hasVariants: getVal(['Has Variants', 'HasVariants', 'Has Variant', 'Variants']),
                 variantName: getVal(['Variant Name', 'VariantName', 'Variant']),
                 departmentName: getVal(['Department', 'DepartmentName', 'Department Name']),
                 price: getVal(['Price', 'Base Price', 'Cost']),
                 taxEnabled: getVal(['Tax Enabled', 'TaxEnabled', 'Is Taxable', 'Taxable']),
                 taxPercentage: getVal(['Tax %', 'Tax Percentage', 'TaxPercentage', 'TaxRate', 'Tax Rate']),
                 taxAmount: getVal(['Tax Amount', 'TaxAmount']),
                 finalPrice: getVal(['Final Price', 'FinalPrice', 'Total Price', 'TotalPrice', 'Total'])
             };
        }).filter(item => item.serviceName); // Filter out empty rows

        setData(mappedData);
      } catch (error) {
        console.error("Error parsing file:", error);
        showSnack("Error parsing the file. Please check the format.", "error");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  const handleDeleteRow = (index) => {
    const newData = [...data];
    newData.splice(index, 1);
    setData(newData);
     if (editingIndex === index) {
        setEditingIndex(null);
        setEditRowData(null);
     } else if (editingIndex !== null && editingIndex > index) {
         setEditingIndex(editingIndex - 1);
     }
  };

  const startEditing = (index, row) => {
     setEditingIndex(index);
     setEditRowData({...row});
  };

  const saveEdit = () => {
     const newData = [...data];
     newData[editingIndex] = editRowData;
     setData(newData);
     setEditingIndex(null);
     setEditRowData(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditRowData(null);
  };

  const handleEditChange = (field, value) => {
      setEditRowData(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirmUpload = async () => {
     if (data.length === 0) {
         showSnack("No valid data to upload", "error");
         return;
     }

     try {
         setIsUploading(true);
         const payload = { services: data };
         const response = await api.post('/services/bulk-upload', payload);
         
         if (response.data.success) {
             showSnack(`Successfully uploaded ${data.length} services!`, "success");
             onUploadSuccess();
             handleClose();
         }
     } catch (error) {
         console.error("Bulk upload error:", error);
         showSnack(error.response?.data?.error || error.response?.data?.message || "Failed to upload services", "error");
     } finally {
         setIsUploading(false);
     }
  };

  const columns = [
    {
      header: "Service Name",
      render: (row, idx) => (
         editingIndex === idx ? (
            <input type="text" className="w-full text-xs p-1 border rounded" value={editRowData.serviceName} onChange={(e) => handleEditChange('serviceName', e.target.value)} />
         ) : <span className="text-xs font-semibold">{row.serviceName}</span>
      )
    },
    {
      header: "Category",
      render: (row, idx) => (
          editingIndex === idx ? (
            <input type="text" className="w-24 text-xs p-1 border rounded" value={editRowData.categoryName} onChange={(e) => handleEditChange('categoryName', e.target.value)} />
         ) : <span className="text-xs">{row.categoryName}</span>
      )
    },
    {
        header: "Variants (Y/N)",
        render: (row, idx) => (
            editingIndex === idx ? (
              <div className="w-20">
                <CustomDropdown
                  value={editRowData.hasVariants || "No"}
                  onChange={(e) => handleEditChange('hasVariants', e.target.value)}
                  options={[
                    { value: "Yes", label: "Yes" },
                    { value: "No", label: "No" }
                  ]}
                  variant="compact"
                  buttonClassName="w-full text-xs p-1 border border-gray-200 rounded flex items-center justify-between h-7"
                />
              </div>
           ) : <span className="text-xs text-center">{row.hasVariants || "No"}</span>
        )
    },
    {
       header: "Variant",
       render: (row, idx) => (
           editingIndex === idx ? (
             <input type="text" className="w-20 text-xs p-1 border rounded" value={editRowData.variantName} onChange={(e) => handleEditChange('variantName', e.target.value)} disabled={editRowData.hasVariants !== "Yes"} />
          ) : <span className="text-xs">{row.variantName || "-"}</span>
       )
    },
    {
       header: "Department",
       render: (row, idx) => (
           editingIndex === idx ? (
             <input type="text" className="w-20 text-xs p-1 border rounded" value={editRowData.departmentName} onChange={(e) => handleEditChange('departmentName', e.target.value)} />
          ) : <span className="text-xs">{row.departmentName || "-"}</span>
       )
    },
    {
       header: "Price",
       render: (row, idx) => (
           editingIndex === idx ? (
             <input type="number" className="w-20 text-xs p-1 border rounded" value={editRowData.price} onChange={(e) => handleEditChange('price', e.target.value)} />
          ) : <span className="text-xs font-bold notranslate">{currencySymbol}{row.price || 0}</span>
       )
    },
    {
        header: "Tax",
        render: (row, idx) => (
            editingIndex === idx ? (
                <div className="flex gap-1 w-28 items-center">
                  <div className="flex-1">
                    <CustomDropdown
                      value={editRowData.taxEnabled || "No"}
                      onChange={(e) => handleEditChange('taxEnabled', e.target.value)}
                      options={[
                        { value: "Yes", label: "Yes" },
                        { value: "No", label: "No" }
                      ]}
                      variant="compact"
                      buttonClassName="w-full text-xs p-1 border border-gray-200 rounded flex items-center justify-between h-7"
                    />
                  </div>
                  {editRowData.taxEnabled === "Yes" && (
                     <input type="number" className="w-10 text-xs p-1 border border-gray-200 rounded h-7 outline-none" placeholder="%" value={editRowData.taxPercentage} onChange={(e) => handleEditChange('taxPercentage', e.target.value)} />
                  )}
                </div>
           ) : (
             <div className="text-[10px] text-gray-500 dark:text-gray-400">
               {row.taxEnabled === "Yes" ? `Yes (${row.taxPercentage}%)` : "No"}
             </div>
           )
        )
    },
    {
      header: "Actions",
      align: "right",
      render: (row, idx) => (
        <div className="flex items-center justify-end gap-2">
           {editingIndex === idx ? (
               <>
                  <button onClick={saveEdit} className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:bg-emerald-900/20 rounded" title="Save"><CheckCircle size={14}/></button>
                  <button onClick={cancelEdit} className="p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card rounded" title="Cancel"><X size={14}/></button>
               </>
           ) : (
               <>
                 <button onClick={() => startEditing(idx, row)} className="p-1 text-blue-500 hover:bg-blue-50 dark:bg-blue-900/20 rounded" title="Edit"><Edit3 size={14}/></button>
                 <button onClick={() => handleDeleteRow(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Delete"><Trash2 size={14}/></button>
               </>
           )}
        </div>
      )
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Services from Excel"
      size="5xl"
      footer={
        <div className="flex justify-between items-center w-full">
            <p className="text-xs text-gray-500 dark:text-gray-400">
                {data.length > 0 ? `${data.length} services ready to upload` : "Please upload a valid Excel file."}
            </p>
            <div className="flex gap-3">
                <button
                    onClick={handleClose}
                    className="px-4 py-2 bg-gray-100 dark:bg-dark-card hover:bg-gray-200 dark:hover:bg-dark-border text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all"
                >
                    Cancel
                </button>
                <button
                    onClick={handleConfirmUpload}
                    disabled={data.length === 0 || isUploading}
                    className="flex items-center gap-2 px-6 py-2 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isUploading ? <UploadCloud className="animate-bounce" size={16} /> : <CheckCircle size={16} />}
                    <span>{isUploading ? "Uploading..." : "Confirm & Import"}</span>
                </button>
            </div>
        </div>
      }
    >
      <div className="space-y-4">
          {!file && (
              <div 
                  className="border-2 border-dashed border-gray-300 dark:border-dark-border rounded-2xl p-10 flex flex-col items-center justify-center bg-gray-50 dark:bg-dark-card/50 hover:bg-brand-primary/5 hover:border-brand-primary/30 transition-all cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
              >
                  <UploadCloud size={48} className="text-gray-400 dark:text-gray-500 mb-4" />
                  <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1">Upload Services Data</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center max-w-sm">
                      Upload your <b>.xlsx</b> or <b>.csv</b> file containing your services data. We will automatically create categories, variants, and departments for you if they don't exist.
                  </p>
                  <p className="text-[10px] text-brand-primary dark:text-blue-400 font-bold mb-4 uppercase tracking-tight">
                    {getFileSizeHint()}
                  </p>
                  <button className="px-5 py-2.5 bg-brand-primary text-white font-bold rounded-xl shadow-sm text-sm">
                      Browse Files
                  </button>
                  <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                      onChange={handleFileUpload}
                  />
                  
                  <div className="mt-8 pt-6 border-t border-gray-200 dark:border-dark-border w-full max-w-lg">
                      <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Required Columns Format</h4>
                      <div className="flex flex-wrap gap-2 justify-center">
                          {['Service Name', 'Category', 'Has Variants', 'Variant Name', 'Department', 'Price', 'Tax Enabled', 'Tax %'].map((col, i) => (
                              <span key={i} className="text-[10px] font-bold text-gray-600 dark:text-gray-400 bg-white dark:bg-dark-surface px-2 py-1 rounded-md border border-gray-200 dark:border-dark-border shadow-sm">{col}</span>
                          ))}
                      </div>
                  </div>
              </div>
          )}

          {isProcessing && (
              <div className="py-10 flex flex-col items-center justify-center">
                  <div className="w-10 h-10 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin mb-4"></div>
                  <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Processing Excel Data...</p>
              </div>
          )}

          {file && !isProcessing && data.length > 0 && (
              <div className="space-y-4">
                  <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                              <CheckCircle size={20} />
                          </div>
                          <div>
                              <p className="text-sm font-bold text-blue-900">File Parsed Successfully</p>
                              <p className="text-xs text-blue-600 font-medium">Found {data.length} valid rows to import.</p>
                          </div>
                      </div>
                      <button 
                         onClick={() => fileInputRef.current?.click()}
                         className="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
                      >
                         Change File
                      </button>
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
                     <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                     <p className="text-xs text-amber-800 font-medium">
                        Please review the parsed data below. You can double-click or use the action buttons to edit any row directly before confirming the bulk import.
                     </p>
                  </div>

                  <div className="max-h-[500px] overflow-y-auto custom-scrollbar border border-gray-100 dark:border-dark-border rounded-2xl">
                     <CustomTable 
                        columns={columns}
                        data={data}
                        emptyMessage="No valid service data found in the selected file."
                        loading={false}
                     />
                  </div>
              </div>
          )}
          
          {file && !isProcessing && data.length === 0 && (
             <div className="py-10 flex flex-col items-center justify-center text-center">
                 <AlertTriangle size={48} className="text-red-400 mb-4" />
                 <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">No Valid Data Found</h3>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm">We couldn't extract any valid rows from your file. Please make sure the columns match our required format exactly.</p>
                 <button 
                     onClick={() => resetState()}
                     className="px-5 py-2.5 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 font-bold rounded-xl shadow-sm text-sm"
                 >
                     Try Again
                 </button>
             </div>
          )}
      </div>
    </Modal>
  );
};

export default UploadServicesModal;
