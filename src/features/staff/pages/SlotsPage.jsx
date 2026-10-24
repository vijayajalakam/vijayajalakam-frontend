import React from 'react';
import PageHeader from '../../../components/shared/PageHeader';
import StatsGrid from '../../../components/shared/StatsGrid';
import { Clock, Calendar, ShieldCheck, Sun } from 'lucide-react';

const SlotsPage = () => {
    const stats = [
        { label: 'Total Slots', value: '240', icon: <Clock />, color: 'bg-blue-50 text-blue-600' },
        { label: 'Available Today', value: '18', icon: <Sun />, color: 'bg-amber-50 text-amber-600' },
        { label: 'Booked Rate', value: '82%', icon: <ShieldCheck />, color: 'bg-emerald-50 text-emerald-600' },
        { label: 'Blocked Intervals', value: '5', icon: <Calendar />, color: 'bg-indigo-50 text-indigo-600' },
    ];

    return (
        <div className="space-y-3 md:space-y-6">
            <PageHeader
                title="Availability Slots"
                subtitle="Configure working hours, breaks, and service intervals"
                addButtonLabel="Configure Slots"
                onAdd={() => { }}
            />

            <StatsGrid stats={stats} />

            <div className="bg-white dark:bg-dark-surface rounded-[1.5rem] shadow-md shadow-gray-200/50 p-12 flex flex-col items-center justify-center text-center border-none">
                <div className="w-24 h-24 bg-gray-50 dark:bg-dark-card rounded-[1.5rem] flex items-center justify-center text-gray-400 dark:text-gray-500 mb-8 animate-pulse shadow-inner">
                    <Clock size={48} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight mb-4">Slot Configuration</h3>
                <p className="text-gray-600 dark:text-gray-400 font-medium max-w-md mx-auto leading-relaxed text-sm">
                    Set up your shop's recurring availability patterns. Define custom service durations and automated buffer times for your professionals.
                </p>
            </div>
        </div>
    );
};

export default SlotsPage;
