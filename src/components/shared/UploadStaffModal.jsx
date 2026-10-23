import React, { useState, useRef } from 'react';
import Modal from './Modal';
import { UploadCloud, CheckCircle, Trash2, Edit3, Save, X, AlertTriangle } from 'lucide-react';
import api from '../../api/axiosInstance';
import * as XLSX from 'xlsx';
import { validateFileSize, getFileSizeHint } from '../../utils/fileUploadUtils';

const UploadStaffModal = ({ isOpen, onClose, onUploadSuccess, showSnack }) => {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const fileInputRef = useRef(null);

  const columns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "designation", label: "Designation" },
    { key: "salary", label: "Salary" },
    { key: "wageType", label: "Wage Type" },
    { key: "password", label: "Password" }
  ];

  const handleDownloadTemplate = () => {
    const templateData = [{
      name: "Jane Doe",
      email: "jane@vijayajalakam.com",
      phone: "+1987654321",
      password: "password123",
      gender: "Female",
      dateOfBirth: "1990-01-01",
      joiningDate: "2023-01-15",
      maritalStatus: "Single",
      bloodGroup: "O+",
      nationality: "American",
      address: "123 Main St",
      designation: "Senior Stylist",
      privilegeId: "",
      salary: "3000",
      otRatePerHour: "20",
      wageType: "Monthly",
      commissionPercentage: "10",
      incentiveTargetAmount: "1000",
      incentiveEnabled: "true",
      incentiveCycleDays: "30",
      incentiveCycleStartDate: "2023-01-01"
    }];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Staff");
    XLSX.writeFile(workbook, "staff_upload_template.xlsx");
  };

  const processFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        let jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (jsonData.length === 0) {
          showSnack("The uploaded file is empty", "error");
          setFile(null);
          return;
        }

        const formattedData = jsonData.map(row => {
          return {
            name: row.name || row.Name || "",
            email: row.email || row.Email || "",
            phone: row.phone || row.Phone || "",
            password: row.password || row.Password || "",
            gender: row.gender || row.Gender || "",
            dateOfBirth: row.dateOfBirth || row['Date of Birth'] || row.DateOfBirth || "",
            joiningDate: row.joiningDate || row['Joining Date'] || row.JoiningDate || "",
            maritalStatus: row.maritalStatus || row['Marital Status'] || row.MaritalStatus || "",
            bloodGroup: row.bloodGroup || row['Blood Group'] || row.BloodGroup || "",
            nationality: row.nationality || row.Nationality || "",
            address: row.address || row.Address || "",
            designation: row.designation || row.Designation || "",
            privilegeId: row.privilegeId || row['Privilege ID'] || row.PrivilegeId || "",
            salary: row.salary || row.Salary || 0,
            otRatePerHour: row.otRatePerHour || row['OT Rate Per Hour'] || row.OtRatePerHour || 0,
            wageType: row.wageType || row['Wage Type'] || row.WageType || "Monthly",
            commissionPercentage: row.commissionPercentage || row['Commission Percentage'] || row.CommissionPercentage || 0,
            incentiveTargetAmount: row.incentiveTargetAmount || row['Incentive Target Amount'] || row.IncentiveTargetAmount || 0,
            incentiveEnabled: row.incentiveEnabled || row['Incentive Enabled'] || row.IncentiveEnabled || "false",
            incentiveCycleDays: row.incentiveCycleDays || row['Incentive Cycle Days'] || row.IncentiveCycleDays || 30,
            incentiveCycleStartDate: row.incentiveCycleStartDate || row['Incentive Cycle Start Date'] || row.IncentiveCycleStartDate || "",
          };
        }).filter(item => item.name || item.email);

        setData(formattedData);
      } catch (err) {
        console.error("Error processing file:", err);
        showSnack("Error processing file. Please ensure it's a valid Excel or CSV file.", "error");
        setFile(null);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer?.files[0];
    if (droppedFile) handleFileSelection(droppedFile);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) handleFileSelection(selectedFile);
  };

  const handleFileSelection = (selectedFile) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const extension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(extension)) {
      showSnack("Please upload a valid Excel or CSV file", "error");
      return;
    }

    const validation = validateFileSize(selectedFile, 5);
    if (!validation.isValid) {
      showSnack(validation.message, "error");
      return;
    }

    setFile(selectedFile);
    processFile(selectedFile);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setData([]);
    setEditingRowIndex(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeRow = (index) => {
    const newData = [...data];
    newData.splice(index, 1);
    setData(newData);
    if (editingRowIndex === index) setEditingRowIndex(null);
    else if (editingRowIndex > index) setEditingRowIndex(editingRowIndex - 1);
  };

  const startEdit = (index, row) => {
    setEditingRowIndex(index);
    setEditFormData({ ...row });
  };

  const cancelEdit = () => setEditingRowIndex(null);

  const saveEdit = (index) => {
    const newData = [...data];
    newData[index] = { ...editFormData };
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
          {columns.map(col => (
             <td key={col.key} className="p-3">
               <input 
                 type="text" 
                 value={editFormData[col.key] || ''} 
                 onChange={(e) => handleEditChange(col.key, e.target.value)}
                 className="w-full text-xs p-1.5 border border-gray-300 dark:border-dark-border rounded focus:ring-1 focus:ring-brand-primary"
               />
             </td>
          ))}
          <td className="p-3 text-right sticky right-0 bg-brand-secondary/5 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
            <div className="flex justify-end gap-2">
              <button onClick={() => saveEdit(index)} className="p-1.5 bg-brand-primary text-white rounded hover:bg-brand-secondary transition-colors" title="Save">
                <Save size={14} />
              </button>
              <button onClick={cancelEdit} className="p-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors" title="Cancel">
                <X size={14} />
              </button>
            </div>
          </td>
        </tr>
      );
    }
    
    return (
      <tr key={index} className="border-b border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card transition-colors">
        {columns.map(col => (
          <td key={col.key} className="p-3 text-xs font-medium text-gray-900 dark:text-gray-100">{row[col.key] || '-'}</td>
        ))}
        <td className="p-3 text-right sticky right-0 bg-white dark:bg-dark-surface group-hover:bg-gray-50 dark:group-hover:bg-dark-card shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
          <div className="flex justify-end gap-2">
            <button onClick={() => startEdit(index, row)} className="p-1.5 text-gray-400 hover:text-brand-primary transition-colors" title="Edit row">
              <Edit3 size={14} />
            </button>
            <button onClick={() => removeRow(index)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Remove row">
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const handleUpload = async () => {
    if (data.length === 0) {
      showSnack("No data to upload", "warning");
      return;
    }
    
    const invalidRows = data.filter(r => !r.name || !r.email);
    if (invalidRows.length > 0) {
      showSnack(`${invalidRows.length} rows are missing Name or Email. Please fix them.`, "error");
      return;
    }

    try {
      setIsUploading(true);
      const payload = { staff: data };
      const res = await api.post('/admin/staff/bulk-upload', payload);
      
      if (res.data?.success) {
        if (res.data.errors && res.data.errors.length > 0) {
          showSnack(`Uploaded ${res.data.data.length}. Skipped ${res.data.errors.length}: ${res.data.errors[0]}`, "warning");
        } else {
          showSnack(`Successfully uploaded ${res.data.data.length} staff members!`, "success");
        }
        if (onUploadSuccess) onUploadSuccess();
        onClose();
        handleRemoveFile();
      } else {
        showSnack(res.data?.message || "Failed to upload staff", "error");
      }
    } catch (err) {
      console.error(err);
      showSnack(err.response?.data?.message || "An error occurred during upload", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-between w-full">
      <div className="text-xs text-gray-500 font-medium">
        {data.length > 0 ? `${data.length} staff ready` : ''}
      </div>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleUpload}
          disabled={data.length === 0 || isUploading}
          className={`px-4 py-2 text-sm font-bold text-white rounded-xl transition-all flex items-center gap-2 ${
            data.length === 0 || isUploading
              ? 'bg-brand-primary/50 cursor-not-allowed'
              : 'bg-brand-primary hover:bg-brand-secondary shadow-md hover:shadow-lg active:scale-95'
          }`}
        >
          {isUploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <UploadCloud size={16} />
              Upload {data.length > 0 ? data.length : ''} Staff
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Upload Staff"
      size="xl"
      footer={footer}
    >
      <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-3 items-start">
            <div className="mt-0.5 text-blue-500"><AlertTriangle size={18} /></div>
            <div>
              <h4 className="text-sm font-bold text-blue-900 dark:text-blue-400">Download Template</h4>
              <p className="text-xs text-blue-700/80 dark:text-blue-300/80 mt-1 max-w-lg">
                Please use our standard template to avoid errors during upload. Name and Email are required for each staff member.
              </p>
            </div>
          </div>
          <button 
            onClick={handleDownloadTemplate}
            className="shrink-0 px-4 py-2 bg-white dark:bg-dark-surface border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg shadow-sm hover:shadow active:scale-95 transition-all"
          >
            Download Template
          </button>
        </div>

        {!file ? (
          <div 
            className="border-2 border-dashed border-gray-300 dark:border-dark-border rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-brand-primary hover:bg-brand-primary/5 transition-all cursor-pointer"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileChange}
            />
            <div className="w-16 h-16 bg-brand-primary/10 text-brand-primary rounded-full flex items-center justify-center mb-4">
              <UploadCloud size={32} />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Click or drag file to this area to upload</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Support for a single or bulk upload. Strictly prohibit from uploading company data or other band files</p>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="mb-4 px-6 py-2 bg-brand-primary text-white text-sm font-bold rounded-lg hover:bg-brand-secondary transition-colors"
            >
              Select File
            </button>
            
            <p className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-dark-card px-3 py-1 rounded-full uppercase tracking-wider">{getFileSizeHint(5)}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl">
              <div className="flex items-center gap-3">
                <div className="text-emerald-500"><CheckCircle size={24} /></div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB • {data.length} records found</p>
                </div>
              </div>
              <button 
                onClick={handleRemoveFile}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove file"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {data.length > 0 && (
              <div className="border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden shadow-sm flex flex-col max-h-[400px]">
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-dark-card sticky top-0 z-10 shadow-sm">
                      <tr>
                        {columns.map((col, idx) => (
                          <th key={idx} className="p-3 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap">
                            {col.label}
                          </th>
                        ))}
                        <th className="p-3 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest text-right sticky right-0 bg-gray-50 dark:bg-dark-card shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                      {data.map((row, index) => renderTableRow(row, index))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default UploadStaffModal;
