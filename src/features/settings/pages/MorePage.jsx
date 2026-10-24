import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { CalendarDays, ChevronRight, FileText, QrCode, Shield, MessageSquare, Star, Plug, Settings, Globe, Database } from "lucide-react";


const MORE_CARDS = [
  {
    id: "configuration",
    label: "Configuration",
    description: "Manage sales settings, cart fields and round-off preferences",
    icon: Settings,
    bg: "bg-teal-50 dark:bg-teal-900/20",
    iconColor: "text-teal-600 dark:text-teal-400",
    path: "/admin/settings/more/configuration",
    permission: "settings:more:configuration:view",
  },
  {
    id: "documents",
    label: "Document Settings",
    description: "Configure invoice numbering and document formats",
    icon: FileText,
    bg: "bg-blue-50 dark:bg-blue-900/20",
    iconColor: "text-blue-600 dark:text-blue-400",
    path: "/admin/settings/more/documents",
    permission: "settings:more:documents:view",
  },
  {
    id: "previews",
    label: "Previews",
    description: "Live preview of how customers see your shop website",
    icon: Globe,
    bg: "bg-orange-50 dark:bg-orange-900/20",
    iconColor: "text-orange-600 dark:text-orange-400",
    path: "/admin/settings/more/previews",
    permission: "settings:more:previews:view",
  },
  {
    id: "privileges",
    label: "Privilege Management",
    description: "Create and manage staff privileges and permissions",
    icon: Shield,
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    path: "/admin/settings/more/privileges",
    permission: "settings:more:privileges:view",
  },
  {
    id: "qr-codes",
    label: "Shop QR Codes",
    description: "Website and Services menu QR codes for customers",
    icon: QrCode,
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    path: "/admin/settings/more/qr-codes",
    permission: "settings:more:qr_codes:view",
  },
  {
    id: "integrations",
    label: "Integrations",
    description: "Configure WhatsApp, SMTP, Email and other integrations",
    icon: Plug,
    bg: "bg-purple-50 dark:bg-purple-900/20",
    iconColor: "text-purple-600 dark:text-purple-400",
    path: "/admin/settings/more/integrations",
    permission: "settings:more:integrations:view",
  },
  {
    id: "clear-database",
    label: "Clear Database",
    description: "Clear all transactions, invoices, stock, and reports data",
    icon: Database,
    bg: "bg-red-50 dark:bg-red-900/20",
    iconColor: "text-red-600 dark:text-red-400",
    action: "clear-database",
    permission: "settings:more:clear_database:delete",
  },
];

import ClearDatabaseModal from "../components/ClearDatabaseModal";

const MorePage = () => {
  const navigate = useNavigate();
  const { shopSlug } = useParams();
  const { hasPermission, isAdmin, portalRole, user } = useAuth();
  const [showClearDatabaseModal, setShowClearDatabaseModal] = React.useState(false);

  const isShopOwner = isAdmin || user?.role === "SHOP_ADMIN";

  const getPath = (path) => {
    const cleanPath = path.replace(/^\/(admin|staff)/, "");
    const base = shopSlug ? `/${shopSlug}` : "";
    return `${base}/${portalRole}${cleanPath}`;
  };

  const handleCardClick = (card) => {
    if (card.action === "clear-database") {
      setShowClearDatabaseModal(true);
    } else if (card.path) {
      navigate(getPath(card.path));
    }
  };

  // Always show all cards for shop admin/owner, EXCEPT clear-database which requires explicit permission
  const visibleCards = isShopOwner 
    ? MORE_CARDS.filter((c) => c.id !== "clear-database" || hasPermission(c.permission)) 
    : MORE_CARDS.filter((c) => hasPermission(c.permission));

  if (visibleCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-dark-border flex items-center justify-center mb-3">
          <CalendarDays size={24} className="text-gray-300" />
        </div>
        <p className="text-sm font-bold text-gray-400 dark:text-gray-500">No items available</p>
        <p className="text-xs text-gray-300 mt-1">
          You don't have permission to access any items here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card)}
              className="group flex items-center gap-4 p-5 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl hover:border-brand-primary/30 hover:shadow-md transition-all text-left"
            >
              <div
                className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
              >
                <Icon size={22} className={card.iconColor} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-white text-sm">
                  {card.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  {card.description}
                </p>
              </div>
              <ChevronRight
                size={16}
                className="text-gray-300 dark:text-gray-600 group-hover:text-brand-primary transition-colors shrink-0"
              />
            </button>
          );
        })}
      </div>

      <ClearDatabaseModal 
        isOpen={showClearDatabaseModal}
        onClose={() => setShowClearDatabaseModal(false)}
      />
    </div>
  );
};

export default MorePage;
