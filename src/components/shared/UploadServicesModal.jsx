import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { validateFileSize, getFileSizeHint } from '../../utils/fileUploadUtils';
import Modal from './Modal';
import { UploadCloud, CheckCircle, Trash2, Edit3, X } from 'lucide-react';
import api from '../../api/axiosInstance';
import { useAuth } from '../../features/auth/hooks/useAuth';

const UploadServicesModal = ({ isOpen, onClose, onUploadSuccess, showSnack }) => {
  const { currencySymbol } = useAuth();
  const fileInputRef = useRef(null);
  
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
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
      e.target.value = "";
      return;
    }

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

        const mappedData = rawData.map((row, index) => {
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
                 serviceName: String(getVal(['Service Name', 'ServiceName', 'Name', 'Service'])).trim(),
                 price: parseFloat(getVal(['Price', 'Base Price', 'Cost'])) || 0,
                 duration: parseInt(getVal(['Duration', 'Duration (mins)', 'Time']), 10) || 30,
                 hsnCode: String(getVal(['HSN Code', 'HSNCode', 'HSN'])).trim(),
             };
        }).filter(item => item.serviceName);

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
     newData[editingIndex] = {
       ...editRowData,
       price: parseFloat(editRowData.price) || 0,
       duration: parseInt(editRowData.duration, 10) || 30
     };
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
       header: "Price",
       render: (row, idx) => (
           editingIndex === idx ? (
             <input type="number" className="w-24 text-xs p-1 border rounded" value={editRowData.price} onChange={(e) => handleEditChange('price', e.target.value)} />
          ) : <span className="text-xs font-bold notranslate">{currencySymbol}{row.price || 0}</span>
       )
    },
    {
       header: "Duration (mins)",
       render: (row, idx) => (
           editingIndex === idx ? (
             <input type="number" className="w-20 text-xs p-1 border rounded" value={editRowData.duration} onChange={(e) => handleEditChange('duration', e.target.value)} />
          ) : <span className="text-xs">{row.duration || 30} mins</span>
       )
    },
    {
      header: "Actions",
      align: "right",
      render: (row, idx) => (
        <div className="flex items-center justify-end gap-2">
           {editingIndex === idx ? (
               <>
                  <button onClick={saveEdit} className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 rounded" title="Save"><CheckCircle size={14}/></button>
                  <button onClick={cancelEdit} className="p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 rounded" title="Cancel"><X size={14}/></button>
               </>
           ) : (
               <>
                 <button onClick={() => startEditing(idx, row)} className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Edit"><Edit3 size={14}/></button>
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
      size="4xl"
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
      <div className="p-6 space-y-6">
        {data.length === 0 ? (
          <div 
            className="border-2 border-dashed border-gray-200 dark:border-dark-border rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-brand-primary/50 transition-colors bg-gray-50/50 dark:bg-dark-card/50"
            onClick={() => fileInputRef.current?.click()}
          >
             <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary dark:text-blue-400 mb-4">
                 {isProcessing ? <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" /> : <UploadCloud size={32} />}
             </div>
             <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">
                 {isProcessing ? "Processing File..." : "Click or Drag Excel File to Upload"}
             </p>
             <p className="text-xs text-gray-400 max-w-sm">
                 Upload .xlsx or .csv containing columns: Service Name, Price, Duration.
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
          </div>
        ) : (
          <div className="space-y-4">
             <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-dark-border">
                <div>
                   <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">File Parsed Successfully</h3>
                   <p className="text-xs text-gray-500 dark:text-gray-400">{file?.name} • {data.length} records</p>
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
                     <table className="w-full text-left border-collapse min-w-[500px]">
                         <thead>
                             <tr className="bg-gray-50 dark:bg-dark-card/80 border-b border-gray-200 dark:border-dark-border">
                                {columns.map((col, i) => (
                                    <th key={i} className="p-3 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                        {col.header}
                                    </th>
                                ))}
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                             {data.map((row, i) => (
                               <tr key={i} className="hover:bg-gray-50 dark:hover:bg-dark-card border-b border-gray-100 dark:border-dark-border transition-colors">
                                 {columns.map((col, colIdx) => (
                                   <td key={colIdx} className="p-3">
                                     {col.render(row, i)}
                                   </td>
                                 ))}
                               </tr>
                             ))}
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

export default UploadServicesModal;
