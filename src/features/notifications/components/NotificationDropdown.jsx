import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  useGetNotificationsQuery, 
  useDismissNotificationMutation 
} from '../../../store/api/notificationEndpoints';
import { 
  setUnreadCount, 
  markRead,
  selectNotificationState
} from '../../../store/slices/notificationSlice';
import { Bell, X, Clock } from 'lucide-react';
import moment from 'moment';

const NotificationItem = ({ notification }) => {
  const [dismiss] = useDismissNotificationMutation();

  const handleDismiss = async (e) => {
    e.stopPropagation();
    await dismiss(notification._id);
  };

  return (
    <div className="group relative flex gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors border-b border-gray-100 dark:border-dark-border last:border-0">
      {/* Icon */}
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mt-0.5">
        <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug truncate">
          {notification.title}
        </p>
        {notification.subtitle && (
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mt-0.5">
            {notification.subtitle}
          </p>
        )}
        {notification.message && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
            {notification.message}
          </p>
        )}
        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-gray-400 dark:text-gray-500">
          <Clock className="w-3 h-3" />
          <span>{moment(notification.createdAt).fromNow()}</span>
        </div>
      </div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-3.5 p-1 rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
        title="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

const NotificationDropdown = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { unreadCount } = useSelector(selectNotificationState);
  const { data: notifications = [], isLoading } = useGetNotificationsQuery();

  useEffect(() => {
    if (notifications.length !== unreadCount) {
      dispatch(setUnreadCount(notifications.length));
    }
  }, [notifications.length, unreadCount, dispatch]);

  if (!isOpen) return null;

  const handleClose = () => {
    dispatch(markRead());
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/10"
        onClick={handleClose}
      />

      {/* Panel — full-width on mobile, fixed width on desktop */}
      <div
        className="
          fixed z-[70]
          bottom-16 left-0 right-0 rounded-t-2xl
          sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-full sm:mt-2
          sm:w-[360px] sm:rounded-2xl
          bg-white dark:bg-dark-surface shadow-2xl shadow-black/10
          flex flex-col
          max-h-[calc(100vh-8rem)] sm:max-h-[480px]
          overflow-hidden
          animate-in slide-in-from-bottom sm:slide-in-from-top-2 duration-200
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-dark-border">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Notifications</h3>
            {!isLoading && notifications.length > 0 && (
              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 uppercase tracking-wide">
                {notifications.length} unread
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <div className="w-7 h-7 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Loading…</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gray-50 dark:bg-dark-card flex items-center justify-center">
                <Bell className="w-7 h-7 text-gray-200" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">All caught up!</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 leading-relaxed">
                  No new notifications right now.
                </p>
              </div>
            </div>
          ) : (
            notifications.map(notification => (
              <NotificationItem
                key={notification._id}
                notification={notification}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-card/60">
            <p className="text-center text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Notification Center
            </p>
          </div>
        )}

      </div>
    </>
  );
};

export default NotificationDropdown;
