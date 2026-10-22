import React, { useState, useMemo, useRef } from 'react';
import moment from 'moment';
import { User, Clock } from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';

const TIME_INTERVAL = 30; // minutes
const ROW_HEIGHT = 90; // pixels per 30 minutes

const PASTEL_COLORS = [
  'bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800',
  'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-100 border border-indigo-200 dark:border-indigo-800',
  'bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-100 border border-purple-200 dark:border-purple-800',
  'bg-pink-100 dark:bg-pink-900/40 text-pink-900 dark:text-pink-100 border border-pink-200 dark:border-pink-800',
  'bg-rose-100 dark:bg-rose-900/40 text-rose-900 dark:text-rose-100 border border-rose-200 dark:border-rose-800',
  'bg-orange-100 dark:bg-orange-900/40 text-orange-900 dark:text-orange-100 border border-orange-200 dark:border-orange-800',
  'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-800',
  'bg-teal-100 dark:bg-teal-900/40 text-teal-900 dark:text-teal-100 border border-teal-200 dark:border-teal-800',
];

const getColorForId = (id) => {
  if (!id) return PASTEL_COLORS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PASTEL_COLORS[Math.abs(hash) % PASTEL_COLORS.length];
};

// Helper to parse time string like "10:00 AM" into minutes since start of day
const parseTimeToMinutes = (timeStr) => {
  const m = moment(timeStr, ["h:mm A", "HH:mm"]);
  return m.hours() * 60 + m.minutes();
};

const formatMinutesToTime = (minutes) => {
  return moment().startOf('day').add(minutes, 'minutes').format('h:mm A');
};

const StaffCalendarView = ({ appointments = [], staffList = [], onBookingClick, onReassignBooking }) => {
  const { hasPermission, isAdmin } = useAuth();
  const canReassign = isAdmin || hasPermission('bookings:general:reassign');

  // Determine time bounds based on appointments, or use default 9 AM - 9 PM
  const { minMinutes, maxMinutes } = useMemo(() => {
    let min = 9 * 60; // 9:00 AM default
    let max = 21 * 60; // 9:00 PM default

    if (appointments.length > 0) {
      appointments.forEach(app => {
        if (app.slotTimes && app.slotTimes.length > 0) {
          const startMins = parseTimeToMinutes(app.slotTimes[0]);
          // Estimate end time based on duration
          const duration = app.duration || 30;
          const endMins = startMins + duration;
          
          if (startMins < min) min = Math.max(0, startMins - 60); // 1 hour padding
          if (endMins > max) max = Math.min(24 * 60, endMins + 60);
        }
      });
    }
    
    // Round to nearest interval
    min = Math.floor(min / TIME_INTERVAL) * TIME_INTERVAL;
    max = Math.ceil(max / TIME_INTERVAL) * TIME_INTERVAL;
    
    return { minMinutes: min, maxMinutes: max };
  }, [appointments]);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let m = minMinutes; m < maxMinutes; m += TIME_INTERVAL) {
      slots.push(m);
    }
    return slots;
  }, [minMinutes, maxMinutes]);

  const columns = useMemo(() => {
    const cols = [
      { id: 'unassigned', name: 'Unassigned', isUnassigned: true },
      ...staffList.map(s => ({
        id: s._id,
        name: s.name || s.username || 'Unknown Staff',
        user: s
      }))
    ];
    return cols;
  }, [staffList]);

  // Group appointments by column
  const positionedAppointments = useMemo(() => {
    const positioned = [];
    appointments.forEach(app => {
      let startMins;
      if (app.slotTimes && app.slotTimes.length > 0) {
        startMins = parseTimeToMinutes(app.slotTimes[0]);
      } else {
        // Fallback for bookings from invoice screen without times
        const d = new Date(app.createdAt || app.date || Date.now());
        startMins = d.getHours() * 60 + d.getMinutes();
        
        // Keep it within calendar bounds visually
        if (startMins < minMinutes) startMins = minMinutes;
        if (startMins > maxMinutes - 30) startMins = maxMinutes - 30;
      }
      
      const duration = app.duration || 30;
      
      // Determine staff column
      let staffId = 'unassigned';
      if (app.staff?._id || app.staff) {
        staffId = app.staff?._id || app.staff;
      } else if (app.services && app.services.length > 0 && app.services[0].staffId) {
        staffId = app.services[0].staffId._id || app.services[0].staffId;
      }

      // If staffId doesn't exist in our columns, put in unassigned
      if (!columns.find(c => c.id === staffId)) {
        staffId = 'unassigned';
      }

      const top = ((startMins - minMinutes) / TIME_INTERVAL) * ROW_HEIGHT;
      const height = (duration / TIME_INTERVAL) * ROW_HEIGHT;

      positioned.push({
        ...app,
        _gridTop: top,
        _gridHeight: height,
        _colId: staffId
      });
    });
    return positioned;
  }, [appointments, minMinutes, columns]);

  const [draggedApp, setDraggedApp] = useState(null);

  const handleDragStart = (e, app) => {
    setDraggedApp(app);
    e.dataTransfer.effectAllowed = "move";
    // For visual feedback
    setTimeout(() => {
      e.target.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedApp(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetStaffId, targetMinutes) => {
    e.preventDefault();
    if (!draggedApp) return;

    // Check if the target is different
    const currentStartMins = parseTimeToMinutes(draggedApp.slotTimes[0]);
    if (draggedApp._colId !== targetStaffId || currentStartMins !== targetMinutes) {
      const newTime = formatMinutesToTime(targetMinutes);
      onReassignBooking(draggedApp, targetStaffId, targetMinutes, newTime);
    }
  };

  const headerScrollRef = useRef(null);

  const handleScroll = (e) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  return (
    <div className="bg-white dark:bg-dark-card flex flex-col relative">
      
      {/* Sticky Header Section */}
      <div className="sticky top-[-16px] md:top-[-24px] z-30 bg-gray-100 dark:bg-dark-bg overflow-hidden">
        <div 
          ref={headerScrollRef}
          className="overflow-hidden w-full"
        >
          <div 
            className="min-w-max inline-block"
            style={{ 
              display: 'grid', 
              gridTemplateColumns: `80px repeat(${columns.length}, minmax(130px, 1fr))` 
            }}
          >
            {/* Top-Left Corner (Empty) */}
            <div className="sticky left-0 z-30 border-r border-gray-100 dark:border-dark-border p-3 flex items-center justify-center bg-gray-100 dark:bg-dark-bg">
               <Clock size={14} className="text-gray-400" />
            </div>

            {/* Column Headers (Staff) */}
            {columns.map((col, index) => (
              <div 
                key={col.id} 
                className={`p-3 bg-gray-100 dark:bg-dark-bg h-full ${index === columns.length - 1 ? '' : 'border-r border-gray-100 dark:border-dark-border'}`}
              >
                <div className="flex items-center justify-center gap-2 h-full">
                  {!col.isUnassigned && (
                    <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary overflow-hidden shrink-0 border border-brand-primary/20">
                      {col.user?.photo?.url ? (
                        <img src={col.user.photo.url} alt={col.name} className="w-full h-full object-cover" />
                      ) : (
                        <User size={14} />
                      )}
                    </div>
                  )}
                  <div className={`flex flex-col justify-center ${col.isUnassigned ? 'items-center' : 'items-start'}`}>
                    <span className={`font-bold text-[13px] leading-tight ${col.isUnassigned ? 'text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                      {col.name}
                    </span>
                    {!col.isUnassigned && col.user?.designation && (
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                        {col.user.designation}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable Body Container (Horizontal Only) */}
      <div 
        className="overflow-x-auto w-full relative custom-scrollbar pb-4"
        onScroll={handleScroll}
      >
        <div 
          className="min-w-max inline-block"
          style={{ 
            display: 'grid', 
            gridTemplateColumns: `80px repeat(${columns.length}, minmax(130px, 1fr))` 
          }}
        >
          {/* Time Rows & Cells */}
          {timeSlots.map((minutes, rowIdx) => {
            const timeStr = formatMinutesToTime(minutes);
            const isHour = minutes % 60 === 0;

            return (
              <React.Fragment key={minutes}>
                {/* Time Label (Sticky Left) */}
                <div className="sticky left-0 z-10 bg-white dark:bg-dark-card border-r border-gray-100 dark:border-dark-border border-b border-gray-100 dark:border-dark-border relative min-h-[90px]">
                  <span className={`absolute top-2 right-2 text-[10px] pr-1 ${isHour ? 'font-bold text-gray-500' : 'font-medium text-gray-300'}`}>
                    {timeStr}
                  </span>
                </div>

                {/* Staff Cells */}
                {columns.map((col, index) => (
                    <div 
                      key={`${col.id}-${minutes}`}
                      className={`min-h-[90px] border-b border-gray-100 dark:border-dark-border relative flex flex-col gap-3 p-3.5 ${index === columns.length - 1 ? '' : 'border-r border-gray-100 dark:border-dark-border'} ${col.isUnassigned ? 'bg-gray-50/20 dark:bg-dark-bg/20' : ''}`}
                    onDragOver={canReassign ? handleDragOver : undefined}
                    onDrop={canReassign ? (e) => handleDrop(e, col.id, minutes) : undefined}
                  >
                    {/* Render appointments that start at this specific time in this specific column */}
                    {positionedAppointments
                      .filter(app => {
                        const appTop = app._gridTop;
                        const rowTop = rowIdx * ROW_HEIGHT;
                        const nextRowTop = (rowIdx + 1) * ROW_HEIGHT;
                        // Render if it falls anywhere inside this 30-min block
                        return app._colId === col.id && appTop >= rowTop && appTop < nextRowTop;
                      })
                      .map(app => {
                        const colorClass = getColorForId(app._id);
                        const startMins = parseTimeToMinutes(app.slotTimes?.[0] || '09:00 AM');
                        const endMins = startMins + (app.duration || 30);
                        const endTimeStr = formatMinutesToTime(endMins);
                        const hoverTitle = `${app.slotTimes?.[0] || 'Time TBD'} - ${endTimeStr}\nClient: ${app.user?.name || app.user?.username || 'Guest'}\nServices: ${app.services?.map(s => s.serviceId?.name || s.name || 'Service').join(', ')}`;

                        // Calculate visual offset within the slot
                        const offsetTop = app._gridTop - (rowIdx * ROW_HEIGHT);

                        return (
                        <div
                          key={app._id}
                          draggable={canReassign}
                          title={hoverTitle}
                          onDragStart={(e) => canReassign && handleDragStart(e, app)}
                          onDragEnd={handleDragEnd}
                          onClick={() => onBookingClick && onBookingClick(app)}
                          style={{ marginTop: offsetTop > 0 ? `${offsetTop}px` : undefined }}
                          className={`relative rounded-xl shadow-sm ${canReassign ? 'cursor-move' : 'cursor-pointer'} z-10 transition-all hover:shadow-md hover:-translate-y-0.5 hover:z-20 overflow-hidden backdrop-blur-sm shrink-0 w-full ${colorClass}`}
                        >
                          <div className="p-2.5 h-full flex flex-col min-h-0">
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-[10px] font-bold opacity-70 leading-none">
                                {app.slotTimes?.[0] || 'Time TBD'} - {endTimeStr}
                              </span>
                              {app.status && (
                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 uppercase tracking-wider shrink-0">
                                  {app.status}
                                </span>
                              )}
                            </div>
                            <span className="text-[13px] font-black mt-1.5 truncate">
                              {app.user?.name || app.user?.username || 'Guest'}
                            </span>
                            <div className="text-[11px] font-medium opacity-90 mt-1 leading-snug flex flex-col gap-0.5">
                              {app.services?.map((s, idx) => {
                                const sName = s?.serviceId?.name || s?.name || "Service";
                                const vName = s?.variantName || s?.variantId?.name;
                                const qty = s?.quantity || 1;
                                return (
                                  <div key={idx} className="flex items-center gap-1.5 truncate">
                                    <span className="w-1 h-1 rounded-full bg-current opacity-40 shrink-0" />
                                    <span className="truncate">
                                      {sName} {vName && <span className="opacity-70">• {vName}</span>}
                                    </span>
                                    {qty > 1 && <span className="font-bold opacity-70 shrink-0">x{qty}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )})}
                  </div>
                ))}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StaffCalendarView;
