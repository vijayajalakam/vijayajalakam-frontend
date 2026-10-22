import React, { useState, useEffect, useCallback } from "react";
import api from "../../../api/axiosInstance";
import {
  TrendingUp,
  Download,
  Filter,
  Calendar,
  Wallet,
  Receipt,
  CreditCard,
  PlusCircle,
  BarChart3,
  Loader2,
  FileText,
  Users,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
  ShoppingCart,
  DollarSign,
  Package,
  Search,
  MoreVertical,
} from "lucide-react";
import ReportLayout from "../../../components/shared/ReportLayout";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import moment from "moment";
import CustomDropdown from "../../../components/shared/CustomDropdown";

const KPICard = ({ title, value, change, icon: Icon, color, loading, currencySymbol, sparklineData }) => {
  const isPositive = change > 0;
  
  const colorSchemes = {
    green: {
      bg: "bg-emerald-50/50",
      border: "border-emerald-100/50",
      iconBg: "bg-emerald-500",
      iconText: "text-white",
      chart: "#10b981",
      trend: "text-emerald-600"
    },
    red: {
      bg: "bg-rose-50/50",
      border: "border-rose-100/50",
      iconBg: "bg-rose-500",
      iconText: "text-white",
      chart: "#f43f5e",
      trend: "text-rose-600"
    },
    blue: {
      bg: "bg-blue-50/50",
      border: "border-blue-100/50",
      iconBg: "bg-blue-500",
      iconText: "text-white",
      chart: "#3b82f6",
      trend: "text-blue-600"
    },
    orange: {
      bg: "bg-orange-50/50",
      border: "border-orange-100/50",
      iconBg: "bg-orange-500",
      iconText: "text-white",
      chart: "#f59e0b",
      trend: "text-orange-600"
    },
    purple: {
      bg: "bg-purple-50/50",
      border: "border-purple-100/50",
      iconBg: "bg-purple-500",
      iconText: "text-white",
      chart: "#8b5cf6",
      trend: "text-purple-600"
    },
    indigo: {
      bg: "bg-indigo-50/50",
      border: "border-indigo-100/50",
      iconBg: "bg-indigo-500",
      iconText: "text-white",
      chart: "#6366f1",
      trend: "text-indigo-600"
    }
  };

  const scheme = colorSchemes[color] || colorSchemes.blue;

  return (
    <div className={`${scheme.bg} border ${scheme.border} rounded-2xl p-5 relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-gray-200/50 group`}>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`${scheme.iconBg} ${scheme.iconText} p-2.5 rounded-xl shadow-lg shadow-current/10 group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        
        <div className="space-y-0.5">
          <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{title}</div>
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 dark:bg-dark-border animate-pulse rounded-lg" />
          ) : (
            <div className="text-2xl font-black text-gray-900 dark:text-white notranslate leading-none py-1">
              {currencySymbol}{value.toLocaleString()}
            </div>
          )}
        </div>

        {change !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            <span>{Math.abs(change)}%</span>
            <span className="text-gray-400 dark:text-gray-500 font-medium ml-1">vs last month</span>
          </div>
        )}
      </div>

      {/* Sparkline overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-12 opacity-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparklineData || []}>
            <defs>
              <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={scheme.chart} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={scheme.chart} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={scheme.chart} 
              strokeWidth={2} 
              fillOpacity={1} 
              fill={`url(#grad-${color})`} 
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const BusinessStatusReportPage = () => {
  const { currencySymbol } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [filters] = useState({
    startDate: moment().startOf("month").format("YYYY-MM-DD"),
    endDate: moment().endOf("month").format("YYYY-MM-DD"),
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/account-transactions/business-status-report", { params: filters });
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch report data", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const COLORS = ["#8b5cf6", "#3b82f6", "#f97316", "#10b981", "#94a3b8"];

  const pieData = data ? Object.entries(data.paymentMethods).map(([name, value]) => ({
    name,
    value,
    percentage: ((value / (data.summary.totalSales || 1)) * 100).toFixed(1)
  })).filter(d => d.value > 0) : [];

  // Prepare combined trend data for comparison chart
  const combinedTrendData = data?.salesTrend.map((d, i) => ({
    name: d.name,
    thisMonth: d.value,
    lastMonth: data.prevSalesTrend[i]?.value || 0
  })) || [];

  return (
    <ReportLayout 
      title="Business Analysis Report" 
      subtitle="Get a complete overview of your business performance"
    >
      <div className="flex flex-col gap-6 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header Controls */}
        <div className="flex flex-wrap items-center justify-end gap-3 px-1">
          <div className="flex items-center bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl px-4 py-2 shadow-sm gap-3">
            <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {moment(filters.startDate).format("DD MMM YYYY")} - {moment(filters.endDate).format("DD MMM YYYY")}
            </span>
          </div>
          
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl text-xs font-black text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card transition-all shadow-sm active:scale-95 group">
            <Filter className="w-4 h-4 text-brand-primary dark:text-blue-400 group-hover:text-brand-secondary" />
            <span>Filters</span>
          </button>
          
          <button className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-white rounded-xl text-xs font-black hover:bg-brand-secondary transition-all shadow-lg shadow-brand-primary/20 active:scale-95">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard 
            title="Total Sales" 
            value={data?.summary.totalSales || 0} 
            change={data?.summary.salesChange}
            icon={ShoppingCart} 
            color="green" 
            loading={loading}
            currencySymbol={currencySymbol}
            sparklineData={data?.salesTrend.slice(-10)}
          />
          <KPICard 
            title="Total Expenses" 
            value={data?.summary.totalExpenses || 0} 
            change={data?.summary.expensesChange}
            icon={Wallet} 
            color="red" 
            loading={loading}
            currencySymbol={currencySymbol}
            sparklineData={data?.salesTrend.map(d => ({ ...d, value: d.value * 0.4 }))}
          />
          <KPICard 
            title="Total Receipts" 
            value={data?.summary.totalReceipts || 0} 
            change={data?.summary.receiptsChange}
            icon={FileText} 
            color="blue" 
            loading={loading}
            currencySymbol={currencySymbol}
            sparklineData={data?.salesTrend.map(d => ({ ...d, value: d.value * 0.8 }))}
          />
          <KPICard 
            title="Total Payments" 
            value={data?.summary.totalPayments || 0} 
            change={data?.summary.paymentsChange}
            icon={CreditCard} 
            color="orange" 
            loading={loading}
            currencySymbol={currencySymbol}
            sparklineData={data?.salesTrend.map(d => ({ ...d, value: d.value * 0.5 }))}
          />
          <KPICard 
            title="Commissions" 
            value={data?.summary.totalCommissions || 0} 
            change={data?.summary.commissionsChange}
            icon={Users} 
            color="purple" 
            loading={loading}
            currencySymbol={currencySymbol}
            sparklineData={data?.salesTrend.map(d => ({ ...d, value: d.value * 0.2 }))}
          />
          <KPICard 
            title="Balance" 
            value={data?.summary.totalBalance || 0} 
            change={data?.summary.balanceChange}
            icon={Landmark} 
            color="indigo" 
            loading={loading}
            currencySymbol={currencySymbol}
            sparklineData={data?.salesTrend.slice(-10)}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Sales Trend */}
          <div className="lg:col-span-5 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-base font-black text-gray-900 dark:text-white">Sales Trend</h3>
              <div className="bg-gray-50 dark:bg-dark-card p-1 rounded-xl flex">
                <button className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-500 hover:text-gray-900 dark:text-white transition-colors">Daily</button>
                <button className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-white dark:bg-dark-surface text-brand-primary dark:text-blue-400 rounded-lg shadow-sm">Weekly</button>
              </div>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={combinedTrendData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                    dy={15}
                    interval={Math.ceil(combinedTrendData.length / 5)}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                    tickFormatter={(val) => val >= 1000 ? `${currencySymbol}${(val/1000).toFixed(0)}K` : `${currencySymbol}${val}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                    itemStyle={{ fontSize: '11px', fontWeight: '900' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="thisMonth" 
                    name="This Month"
                    stroke="#3b82f6" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorSales)"
                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="lastMonth" 
                    name="Last Month"
                    stroke="#e2e8f0" 
                    strokeWidth={3} 
                    fill="transparent"
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Type Distribution */}
          <div className="lg:col-span-4 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-black text-gray-900 dark:text-white mb-8">Payment Type Wise (Total)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center h-[280px]">
              <div className="relative h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={8} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Total</span>
                  <span className="text-lg font-black text-gray-900 dark:text-white">{currencySymbol}{data?.summary.totalSales.toLocaleString() || 0}</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-3.5 pr-2">
                {pieData.map((d, i) => (
                  <div key={i} className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-[11px] font-black text-gray-700 dark:text-gray-300">{d.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{d.percentage}%</span>
                    </div>
                    <div className="text-[10px] font-black text-gray-900 dark:text-white ml-4">{currencySymbol}{d.value.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Income vs Expenses Bar Chart */}
          <div className="lg:col-span-3 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-3xl p-6 shadow-sm">
             <div className="flex items-center justify-between mb-8">
              <h3 className="text-base font-black text-gray-900 dark:text-white">Expenses vs Income</h3>
              <div className="w-24">
                <CustomDropdown
                  value="Monthly"
                  onChange={() => {}}
                  options={[{ value: "Monthly", label: "Monthly" }]}
                  variant="compact"
                  buttonClassName="text-[10px] font-black uppercase tracking-wider text-brand-primary dark:text-blue-400 bg-brand-primary/5 rounded-lg px-2.5 py-1.5 outline-none border-none w-full flex items-center justify-between"
                />
              </div>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.incomeVsExpenses || []} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                    dy={15}
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} barSize={12} />
                  <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Transaction Summary Table */}
        <div className="bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-3xl shadow-sm overflow-hidden mb-10">
          <div className="px-8 py-6 border-b border-gray-50 flex flex-wrap items-center justify-between gap-6">
            <h3 className="text-base font-black text-gray-900 dark:text-white">Transaction Summary</h3>
            <div className="flex flex-wrap items-center gap-4 flex-1 justify-end">
              <div className="relative group w-full max-w-xs">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-primary dark:text-blue-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search transactions..."
                  className="pl-11 pr-4 py-2.5 bg-gray-50 border border-transparent focus:border-brand-primary/20 focus:bg-white dark:bg-dark-surface rounded-2xl text-[11px] font-bold outline-none transition-all w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                 <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl text-[11px] font-black text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-card transition-all">
                   <Filter className="w-3.5 h-3.5" />
                   <span>Sort</span>
                 </button>
                 <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl text-[11px] font-black text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-card transition-all">
                   <Package className="w-3.5 h-3.5" />
                   <span>Columns</span>
                 </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-dark-card/30">
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Date</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Voucher No</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Type</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Payment Mode</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Amount</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">Commission</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">Balance</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Description</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {[...Array(9)].map((_, j) => (
                        <td key={j} className="px-8 py-6"><div className="h-4 bg-gray-100 dark:bg-dark-card rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : data?.recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-8 py-16 text-center text-gray-400 dark:text-gray-500 font-black text-xs uppercase tracking-widest">No transactions found</td>
                  </tr>
                ) : (
                  data?.recentTransactions.map((txn) => (
                    <tr key={txn._id} className="hover:bg-brand-primary/[0.01] transition-colors group">
                      <td className="px-8 py-6">
                        <span className="text-[11px] font-black text-gray-900 dark:text-white whitespace-nowrap">
                          {moment(txn.date).format('DD MMM YYYY')}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[11px] font-black text-brand-primary dark:text-blue-400">
                          {txn.voucherNumber}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          txn.type === 'receipt' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' :
                          txn.type === 'payment' ? 'bg-rose-50 text-rose-600' :
                          txn.type === 'journal' ? 'bg-indigo-50 text-indigo-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {txn.type}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap gap-1">
                          {(txn.paymentMethod || 'Various').split(',').map((method, idx) => {
                            const m = method.trim().toUpperCase();
                            const colorClass = 
                              m === 'UPI' ? 'bg-purple-50 text-purple-600' :
                              m === 'CARD' ? 'bg-orange-50 text-orange-600' :
                              m === 'BANK TRANSFER' ? 'bg-blue-50 text-blue-600' :
                              m === 'CASH' ? 'bg-emerald-50 text-emerald-600' :
                              m === 'DUE' ? 'bg-rose-50 text-rose-600' :
                              m === 'WALLET' ? 'bg-indigo-50 text-indigo-600' :
                              'bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-gray-400';
                            return (
                              <span key={idx} className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${colorClass}`}>
                                {m}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[11px] font-black text-gray-900 dark:text-white notranslate">
                          {currencySymbol}{txn.totalAmount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                          {txn.commission > 0 ? `${currencySymbol}${txn.commission.toLocaleString()}` : '-'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="text-[11px] font-black text-gray-900 dark:text-white">
                           {currencySymbol}{data?.summary.totalBalance.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-8 py-6 max-w-[240px]">
                        <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 leading-normal line-clamp-1">
                          {txn.narration || 'Sales to Walk-in Customer'}
                        </p>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 hover:bg-blue-100 transition-colors">
                            <Eye size={16} />
                          </button>
                          <button className="p-2 rounded-xl bg-gray-50 dark:bg-dark-card text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-card transition-colors">
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="px-8 py-5 bg-gray-50 dark:bg-dark-card/50 flex flex-wrap items-center justify-between gap-4">
             <div className="flex items-center gap-4">
               <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  Showing 1 to {data?.recentTransactions.length || 0} of {data?.recentTransactions.length || 0} entries
               </span>
             </div>
             <div className="flex items-center gap-1">
                <button className="p-2 text-gray-400 hover:text-brand-primary dark:text-blue-400 transition-all rotate-180"><ArrowUpRight size={18} /></button>
                <div className="flex items-center gap-1 px-2">
                  <span className="w-8 h-8 flex items-center justify-center rounded-xl bg-brand-primary text-white text-xs font-black shadow-lg shadow-brand-primary/20">1</span>
                  <span className="w-8 h-8 flex items-center justify-center rounded-xl bg-transparent text-gray-500 dark:text-gray-400 text-xs font-bold hover:bg-white dark:bg-dark-surface transition-all cursor-pointer">2</span>
                  <span className="w-8 h-8 flex items-center justify-center rounded-xl bg-transparent text-gray-500 dark:text-gray-400 text-xs font-bold hover:bg-white dark:bg-dark-surface transition-all cursor-pointer">3</span>
                </div>
                <button className="p-2 text-gray-400 hover:text-brand-primary dark:text-blue-400 transition-all"><ArrowUpRight size={18} /></button>
             </div>
          </div>
        </div>
      </div>
    </ReportLayout>
  );
};

export default BusinessStatusReportPage;
