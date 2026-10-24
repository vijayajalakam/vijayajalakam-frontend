import React, { useState, useRef } from 'react';
import Modal from './Modal';
import { UploadCloud, CheckCircle, Trash2, Edit3, Save, X } from 'lucide-react';
import api from '../../api/axiosInstance';
import { useAuth } from '../../features/auth/hooks/useAuth';
import * as XLSX from 'xlsx';
import { validateFileSize, getFileSizeHint } from '../../utils/fileUploadUtils';

const UploadProductsModal = ({ isOpen, onClose, onUploadSuccess, showSnack }) => {
  const { currencySymbol } = useAuth();
  
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const fileInputRef = useRef(null);

  const columns = [
    { key: "productName", label: "Product Name" },
    { key: "sku", label: "SKU/Barcode" },
    { key: "hsnCode", label: "HSN Code" },
    { key: "purchasePrice", label: `Purchase Price (${currencySymbol})` },
    { key: "sellingPrice", label: `Selling Price (${currencySymbol})` },
    { key: "openingStock", label: "Opening Stock" },
  ];

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      const validation = validateFileSize(uploadedFile);
      if (!validation.isValid) {
        showSnack(validation.message, "error");
        e.target.value = "";
        return;
      }
      setFile(uploadedFile);
      processFile(uploadedFile);
    }
  };

  const processFile = (fileToProcess) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const dataBuffer = e.target.result;
        const workbook = XLSX.read(dataBuffer, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        const mappedData = jsonData.map((row, index) => {
          const getVal = (possibleKeys) => {
              for (let key of Object.keys(row)) {
                  if (possibleKeys.some(pK => key.toLowerCase().trim() === pK.toLowerCase().trim())) {
                      return row[key] || "";
                  }
              }
              return "";
          };

          return {
            id: index,
            productName: String(getVal(['Product Name', 'ProductName', 'Name', 'Product'])).trim(),
            sku: String(getVal(['SKU/Barcode', 'SKU', 'Barcode', 'SKU / Barcode'])).trim(),
            hsnCode: String(getVal(['HSN Code', 'HSNCode', 'HSN'])).trim(),
            purchasePrice: parseFloat(getVal(['Purchase Price', 'PurchasePrice', 'Cost'])) || 0,
            sellingPrice: parseFloat(getVal(['Selling Price', 'SellingPrice', 'Price'])) || 0,
            openingStock: parseFloat(getVal(['Opening Stock', 'OpeningStock', 'Stock'])) || 0,
          };
        }).filter(item => item.productName);

        setData(mappedData);
      } catch (error) {
        console.error("Error processing file:", error);
        showSnack("Error processing Excel file. Please check the format.", "error");
      }
    };
    
    reader.readAsBinaryString(fileToProcess);
  };

  const handleConfirmUpload = async () => {
    if (data.length === 0) return;
    
    setIsUploading(true);
    try {
      const response = await api.post('/products/bulk-upload', { products: data });
      if (response.data.success) {
        showSnack(response.data.message || "Products uploaded successfully!", "success");
        onUploadSuccess();
        resetModal();
      }
    } catch (error) {
      console.error("Upload error:", error);
      showSnack(error.response?.data?.error || "Failed to upload products", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setData([]);
    setEditingRowIndex(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  const removeRow = (index) => {
    const newData = [...data];
    newData.splice(index, 1);
    setData(newData);
    if (editingRowIndex === index) {
      setEditingRowIndex(null);
    } else if (editingRowIndex > index) {
      setEditingRowIndex(editingRowIndex - 1);
    }
  };

  const startEdit = (index) => {
    setEditingRowIndex(index);
    setEditFormData({ ...data[index] });
  };

  const cancelEdit = () => {
    setEditingRowIndex(null);
  };

  const saveEdit = (index) => {
    const newData = [...data];
    const item = { ...editFormData };
    item.purchasePrice = parseFloat(item.purchasePrice) || 0;
    item.sellingPrice = parseFloat(item.sellingPrice) || 0;
    item.openingStock = parseFloat(item.openingStock) || 0;
    newData[index] = item;
    setData(newData);
    setEditingRowIndex(null);
  };

  const handleEditChange = (key, value) => {
    setEditFormData(prev => ({ ...prev, [key]: value }));
  };

  const renderTableRow = (row, index) => {
    const isEditing = editingRowIndex === index;
    
    if (isEditing) {
      return (
        <tr key={index} className="bg-brand-secondary/5 border-b border-gray-100 dark:border-dark-border">
          <td className="p-3">
            <input 
              type="text" 
              value={editFormData.productName} 
              onChange={(e) => handleEditChange('productName', e.target.value)}
              className="w-full text-xs p-1.5 border border-gray-300 dark:border-dark-border rounded focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
            />
          </td>
          <td className="p-3">
            <input 
              type="text" 
              value={editFormData.sku} 
              onChange={(e) => handleEditChange('sku', e.target.value)}
              className="w-full text-xs p-1.5 border border-gray-300 dark:border-dark-border rounded focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
            />
          </td>
          <td className="p-3">
            <input 
              type="text" 
              value={editFormData.hsnCode} 
              onChange={(e) => handleEditChange('hsnCode', e.target.value)}
              className="w-full text-xs p-1.5 border border-gray-300 dark:border-dark-border rounded focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
            />
          </td>
          <td className="p-3 bg-red-50/50">
            <input 
              type="number" 
              value={editFormData.purchasePrice} 
              onChange={(e) => handleEditChange('purchasePrice', e.target.value)}
              className="w-24 text-xs p-1.5 border border-gray-300 dark:border-dark-border rounded"
            />
          </td>
          <td className="p-3 bg-green-50/50">
            <input 
              type="number" 
              value={editFormData.sellingPrice} 
              onChange={(e) => handleEditChange('sellingPrice', e.target.value)}
              className="w-24 text-xs p-1.5 border border-gray-300 dark:border-dark-border rounded"
            />
          </td>
          <td className="p-3">
            <input 
              type="number" 
              value={editFormData.openingStock} 
              onChange={(e) => handleEditChange('openingStock', e.target.value)}
              className="w-20 text-xs p-1.5 border border-gray-300 dark:border-dark-border rounded"
            />
          </td>
          <td className="p-3 border-l border-gray-100 dark:border-dark-border">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => saveEdit(index)}
                className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                title="Save Changes"
              >
                <Save size={14} />
              </button>
              <button 
                onClick={cancelEdit}
                className="p-1.5 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-card rounded-lg transition-colors"
                title="Cancel Edit"
              >
                <X size={14} />
              </button>
            </div>
          </td>
        </tr>
      );
    }

    return (
      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-dark-card border-b border-gray-100 dark:border-dark-border transition-colors">
        <td className="p-3 text-xs font-medium text-gray-800 dark:text-gray-100">{row.productName}</td>
        <td className="p-3 text-xs text-gray-600 dark:text-gray-400">{row.sku || '-'}</td>
        <td className="p-3 text-xs text-gray-600 dark:text-gray-400">{row.hsnCode || '-'}</td>
        <td className="p-3 text-xs font-medium text-red-600 bg-red-50/20">{currencySymbol}{row.purchasePrice}</td>
        <td className="p-3 text-xs font-medium text-green-600 bg-green-50/20">{currencySymbol}{row.sellingPrice}</td>
        <td className="p-3 text-xs text-blue-600 font-bold">{row.openingStock}</td>
        <td className="p-3 border-l border-gray-100 dark:border-dark-border">
           <div className="flex items-center gap-2">
             <button 
               onClick={() => startEdit(index)}
               className="p-1 text-gray-400 hover:text-brand-primary dark:text-blue-400 transition-colors"
               title="Edit Row"
             >
               <Edit3 size={14} />
             </button>
             <button 
               onClick={() => removeRow(index)}
               className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors"
               title="Remove Row"
             >
               <Trash2 size={14} />
             </button>
           </div>
        </td>
      </tr>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetModal}
      title="Upload Products"
      maxWidth="max-w-5xl"
      footer={
        <div className="flex justify-between items-center w-full">
            <p className="text-xs text-gray-500 dark:text-gray-400">
                {data.length > 0 ? `${data.length} products ready to upload` : "Please upload a valid Excel file."}
            </p>
            <div className="flex gap-3">
                <button
                type="button"
                onClick={resetModal}
                className="px-4 py-2.5 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border transition-colors"
                disabled={isUploading}
                >
                Cancel
                </button>
                <button
                onClick={handleConfirmUpload}
                disabled={data.length === 0 || isUploading}
                className={`px-6 py-2.5 text-white font-medium rounded-lg transition-colors flex items-center gap-2 ${
                    data.length === 0 || isUploading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-brand-primary hover:bg-brand-secondary"
                }`}
                >
                {isUploading ? (
                    <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Uploading...</span>
                    </>
                ) : (
                    <>
                    <UploadCloud size={18} />
                    <span>Confirm & Import</span>
                    </>
                )}
                </button>
            </div>
        </div>
      }
    >
      <div className="p-4 space-y-6">
        {data.length === 0 ? (
          <div 
            className="border-2 border-dashed border-gray-300 dark:border-dark-border rounded-2xl p-10 flex flex-col items-center justify-center text-center bg-gray-50 dark:bg-dark-card/50 hover:bg-brand-primary/5 hover:border-brand-primary/30 transition-all cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
             <div className="w-16 h-16 bg-white dark:bg-dark-surface rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border flex items-center justify-center mb-4 group-hover:scale-110 group-hover:text-brand-primary dark:text-blue-400 transition-all duration-300">
               <UploadCloud size={32} className="text-gray-400 group-hover:text-brand-primary dark:text-blue-400 transition-colors" />
             </div>
             <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">Upload Product Inventory File</h3>
             <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
               Drop your Excel (.xlsx) or CSV file here.
             </p>
             <p className="text-[10px] text-brand-primary dark:text-blue-400 font-bold mt-2 uppercase tracking-tight">
               {getFileSizeHint()}
             </p>
             <input 
               type="file" 
               ref={fileInputRef} 
               onChange={handleFileUpload}
               accept=".xlsx, .xls, .csv" 
               className="hidden" 
             />
             <button className="mt-6 px-6 py-2 bg-white dark:bg-dark-surface border shadow-sm rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-brand-primary transition-colors">
                 Select File
             </button>
          </div>
        ) : (
          <div className="space-y-4">
             <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-dark-border">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                      <CheckCircle size={20} />
                   </div>
                   <div>
                       <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">File Parsed Successfully</h3>
                       <p className="text-xs text-gray-500 dark:text-gray-400">{file?.name} • {data.length} records</p>
                   </div>
                </div>
                <button 
                  onClick={() => setData([])}
                  className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  Discard & Start Over
                </button>
             </div>

             <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl shadow-sm overflow-hidden">
                 <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse min-w-[700px]">
                         <thead>
                             <tr className="bg-gray-50 dark:bg-dark-card/80 border-b border-gray-200 dark:border-dark-border">
                                {columns.map((col, i) => (
                                    <th key={i} className="p-3 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                        {col.label}
                                    </th>
                                ))}
                                <th className="p-3 text-xs font-bold text-gray-600 dark:text-gray-400 border-l border-gray-200 dark:border-dark-border w-24">Actions</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                             {data.map((row, i) => renderTableRow(row, i))}
                         </tbody>
                     </table>
                 </div>
             </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default UploadProductsModal;
