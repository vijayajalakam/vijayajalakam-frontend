import React, { useState } from "react";
import moment from "moment";
import Skeleton, { TableSkeleton } from "../../../components/shared/Skeleton";
import { Download, CalendarDays, MessageCircle, Loader2 } from "lucide-react";
import ReportLayout from "../../../components/shared/ReportLayout";
import CustomTable from "../../../components/shared/CustomTable";
import * as exportUtils from "../../../utils/exportUtils";
import { useGetCounterSessionReportQuery } from "../../../store/api/counterSessionEndpoints";
import api from "../../../api/axiosInstance";
import toast from "react-hot-toast";

const DayCloseReport = () => {
  const today = new Date().toLocaleDateString("en-CA");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [sendingWhatsappFor, setSendingWhatsappFor] = useState(null);

  const { data: reportsData = [], isLoading } = useGetCounterSessionReportQuery({ startDate, endDate });
  const reports = Array.isArray(reportsData) ? reportsData : [];

  const handleRowExport = async (row) => {
    const data = [
      { metric: "Session Date", value: moment(row.openedAt).format("DD MMM YYYY hh:mm A") },
      { metric: "Opened By", value: row.openedBy?.name || "System" },
      { metric: "Closed By", value: row.closedBy?.name || "-" },
      { metric: "Closed At", value: row.closedAt ? moment(row.closedAt).format("DD MMM YYYY hh:mm A") : "-" },
      { metric: "Opening Balance", value: `${row.openingBalance?.toFixed(2) || "0.00"} (${row.openingPaymentMethod})` },
      { metric: "Expected Balance", value: row.closingDetails?.expectedClosingBalance?.toFixed(2) || "-" },
      { metric: "", value: "" },
      { metric: "--- SALES BREAKDOWN ---", value: "" },
      { metric: "Total Sales", value: row.closingDetails?.totalSales?.toFixed(2) || "0.00" },
      { metric: "Cash Sales", value: row.closingDetails?.cashSales?.toFixed(2) || "0.00" },
      { metric: "UPI Sales", value: row.closingDetails?.upiSales?.toFixed(2) || "0.00" },
      { metric: "Card Sales", value: row.closingDetails?.cardSales?.toFixed(2) || "0.00" },
      { metric: "Cash In Hand", value: ((row.closingDetails?.cashSales || 0) + (row.openingBalance || 0)).toFixed(2) },
      { metric: "", value: "" },
      { metric: "--- PAYMENTS & RECEIPTS ---", value: "" },
      { metric: "Total Receipts", value: row.closingDetails?.totalReceipts?.toFixed(2) || "0.00" },
      { metric: "Total Payments", value: row.closingDetails?.totalPayments?.toFixed(2) || "0.00" },
    ];

    if (row.closingDetails?.staffSales && row.closingDetails.staffSales.length > 0) {
      data.push({ metric: "", value: "" });
      data.push({ metric: "--- STAFF PERFORMANCE ---", value: "" });
      row.closingDetails.staffSales.forEach(staff => {
        data.push({ metric: staff.name, value: `Sales: ${staff.amount?.toFixed(2) || "0.00"}` });
      });
    }

    const exportColumns = [
      { header: "Metric", key: "metric" },
      { header: "Value", key: "value" }
    ];

    await exportUtils.exportToPDF(
      data,
      exportColumns,
      `Counter_Session_${moment(row.openedAt).format("DD_MMM_YYYY")}.pdf`
    );
  };

  const handleSendWhatsapp = async (row) => {
    try {
      setSendingWhatsappFor(row._id);
      const data = [
        { metric: "Session Date", value: moment(row.openedAt).format("DD MMM YYYY hh:mm A") },
        { metric: "Opened By", value: row.openedBy?.name || "System" },
        { metric: "Closed By", value: row.closedBy?.name || "-" },
        { metric: "Closed At", value: row.closedAt ? moment(row.closedAt).format("DD MMM YYYY hh:mm A") : "-" },
        { metric: "Opening Balance", value: `${row.openingBalance?.toFixed(2) || "0.00"} (${row.openingPaymentMethod})` },
        { metric: "Expected Balance", value: row.closingDetails?.expectedClosingBalance?.toFixed(2) || "-" },
        { metric: "", value: "" },
        { metric: "--- SALES BREAKDOWN ---", value: "" },
        { metric: "Total Sales", value: row.closingDetails?.totalSales?.toFixed(2) || "0.00" },
        { metric: "Cash Sales", value: row.closingDetails?.cashSales?.toFixed(2) || "0.00" },
        { metric: "UPI Sales", value: row.closingDetails?.upiSales?.toFixed(2) || "0.00" },
        { metric: "Card Sales", value: row.closingDetails?.cardSales?.toFixed(2) || "0.00" },
        { metric: "Cash In Hand", value: ((row.closingDetails?.cashSales || 0) + (row.openingBalance || 0)).toFixed(2) },
        { metric: "", value: "" },
        { metric: "--- PAYMENTS & RECEIPTS ---", value: "" },
        { metric: "Total Receipts", value: row.closingDetails?.totalReceipts?.toFixed(2) || "0.00" },
        { metric: "Total Payments", value: row.closingDetails?.totalPayments?.toFixed(2) || "0.00" },
      ];

      if (row.closingDetails?.staffSales && row.closingDetails.staffSales.length > 0) {
        data.push({ metric: "", value: "" });
        data.push({ metric: "--- STAFF PERFORMANCE ---", value: "" });
        row.closingDetails.staffSales.forEach(staff => {
          data.push({ metric: staff.name, value: `Sales: ${staff.amount?.toFixed(2) || "0.00"}` });
        });
      }

      const exportColumns = [
        { header: "Metric", key: "metric" },
        { header: "Value", key: "value" }
      ];

      const pdfBlob = await exportUtils.exportToPDF(
        data,
        exportColumns,
        `Counter_Session_${moment(row.openedAt).format("DD_MMM_YYYY")}.pdf`,
        { returnBlob: true }
      );

      const formData = new FormData();
      formData.append("file", pdfBlob, `Day_Close_Report_${moment(row.openedAt).format("DD_MMM_YYYY")}.pdf`);

      const res = await api.post("/counter-session/report/whatsapp", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data?.success) {
        toast.success("Report sent to WhatsApp successfully!");
      } else {
        toast.error(res.data?.message || "Failed to send report");
      }
    } catch (error) {
      console.error("WhatsApp Send Error:", error);
      toast.error(error.response?.data?.message || "Failed to send WhatsApp report");
    } finally {
      setSendingWhatsappFor(null);
    }
  };

  const columns = [
    {
      header: "Date",
      exportValue: (row) => moment(row.openedAt).format("DD MMM YYYY"),
      render: (row) => (
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
          {moment(row.openedAt).format("DD MMM YYYY")}
        </span>
      ),
    },
    {
      header: "Opened By",
      exportValue: (row) => `${row.openedBy?.name || "System"} (${moment(row.openedAt).format("hh:mm A")})`,
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
            {row.openedBy?.name || "System"}
          </span>
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-0.5">
            {moment(row.openedAt).format("hh:mm A")}
          </span>
        </div>
      ),
    },
    {
      header: "Closed By",
      exportValue: (row) => `${row.closedBy?.name || "-"} ${row.closedAt ? `(${moment(row.closedAt).format("hh:mm A")})` : ''}`,
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
            {row.closedBy?.name || "-"}
          </span>
          {row.closedAt && (
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-0.5">
              {moment(row.closedAt).format("hh:mm A")}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Opening Bal",
      exportValue: (row) => `${row.openingBalance?.toFixed(2)} (${row.openingPaymentMethod})`,
      render: (row) => (
        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
          {row.openingBalance?.toFixed(2)} ({row.openingPaymentMethod})
        </span>
      ),
    },
    {
      header: "Expected Bal",
      align: "right",
      exportValue: (row) => row.closingDetails?.expectedClosingBalance?.toFixed(2) || "-",
      render: (row) => (
        <div className="flex justify-end">
          <span className="text-sm font-black text-gray-900 dark:text-white">
            {row.closingDetails?.expectedClosingBalance?.toFixed(2) || "-"}
          </span>
        </div>
      ),
    },
    {
      header: "Cash In Hand",
      align: "right",
      exportValue: (row) => ((row.closingDetails?.cashSales || 0) + (row.openingBalance || 0)).toFixed(2),
      render: (row) => (
        <div className="flex justify-end">
          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
            {((row.closingDetails?.cashSales || 0) + (row.openingBalance || 0)).toFixed(2)}
          </span>
        </div>
      ),
    },
    {
      header: "Total Sales",
      align: "right",
      exportValue: (row) => row.closingDetails?.totalSales?.toFixed(2) || "-",
      render: (row) => (
        <div className="flex justify-end">
          <span className="text-sm font-black text-brand-primary">
            {row.closingDetails?.totalSales?.toFixed(2) || "-"}
          </span>
        </div>
      ),
    },
    {
      header: "Action",
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSendWhatsapp(row);
            }}
            disabled={sendingWhatsappFor === row._id}
            className={`p-2 rounded-lg transition-colors ${
              sendingWhatsappFor === row._id
                ? "text-gray-400 bg-gray-50 dark:bg-dark-border cursor-not-allowed"
                : "text-emerald-500 hover:text-white hover:bg-emerald-500"
            }`}
            title="Send to Owner WhatsApp"
          >
            {sendingWhatsappFor === row._id ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRowExport(row);
            }}
            className="p-2 text-gray-400 hover:text-brand-primary dark:text-gray-500 dark:hover:text-blue-400 transition-colors"
            title="Export Session Details"
          >
            <Download size={16} />
          </button>
        </div>
      )
    },
  ];


  return (
    <ReportLayout title="Day Closing Report" subtitle="History of all counter sessions">
      <CustomTable
        columns={columns}
        data={reports}
        loading={isLoading}
        emptyMessage="No reports found"
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onExport={async () => reports}
        mobileMapper={{
          leading: (row) => (
             <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-400 border border-blue-100 font-bold">
               {moment(row.openedAt).format("DD")}
             </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              {moment(row.openedAt).format("MMM YYYY")}
            </div>
          ),
          subtitle: (row) => (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              {row.openedBy?.name || "System"} • {moment(row.openedAt).format("hh:mm A")}
            </div>
          ),
          trailing: (row) => (
            <div className="text-right">
              <div className="text-sm font-black text-brand-primary notranslate">
                {row.closingDetails?.totalSales?.toFixed(2) || "-"}
              </div>
              <span className="text-[8px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
                SALES
              </span>
            </div>
          ),
          actions: (row) => (
            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSendWhatsapp(row);
                }}
                disabled={sendingWhatsappFor === row._id}
                className={`w-full py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors active:scale-95 ${
                  sendingWhatsappFor === row._id
                    ? "bg-gray-50 dark:bg-dark-bg border-gray-100 dark:border-dark-border text-gray-400 cursor-not-allowed"
                    : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-500 hover:text-white dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white"
                }`}
              >
                {sendingWhatsappFor === row._id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <MessageCircle size={14} />
                )}
                <span>Send WhatsApp</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRowExport(row);
                }}
                className="w-full py-2.5 rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-dark-border transition-colors active:scale-95"
              >
                <Download size={14} className="text-brand-primary dark:text-blue-400" />
                <span>Export Session</span>
              </button>
            </div>
          )
        }}
      />
    </ReportLayout>
  );
};

export default DayCloseReport;
