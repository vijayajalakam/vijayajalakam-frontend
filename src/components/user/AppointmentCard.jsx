import React from "react";
import { Star, ChevronRight } from "lucide-react";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { getSocketURL } from "../../api/axiosInstance";

export const ServiceCard = ({ service, isSelected, onClick }) => {
  const { currencySymbol } = useAuth();

  const getImageUrl = (path) => {
    if (!path) return null;
    const baseUrl = getSocketURL();
    return `${baseUrl}/${path.replace(/\\/g, "/")}`;
  };

  return (
    <div
      onClick={() => onClick(service)}
      className={`service-card cursor-pointer ${isSelected ? "selected" : ""}`}
    >
      <div className="relative h-32 mb-3 overflow-hidden rounded-xl">
        {service.image?.path ? (
          <img
            src={getImageUrl(service.image.path)}
            alt={service.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-primary/5 flex items-center justify-center">
            <span className="text-primary font-bold text-lg">
              {service.name.charAt(0)}
            </span>
          </div>
        )}
        {service.isFavourite && (
          <div className="absolute top-2 right-2 p-1.5 bg-white dark:bg-dark-surface/20 backdrop-blur-md rounded-lg">
            <Star size={14} className="fill-yellow-400 text-yellow-400" />
          </div>
        )}
      </div>
      <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
        {service.name}
      </h3>
      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
        {service.shop?.address || "Premium Service"}
      </p>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1">
          <Star size={12} className="text-yellow-400 fill-yellow-400" />
          <span className="text-[10px] font-bold">4.5</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
            Price
          </span>
          <span className="text-xs font-black text-brand-primary dark:text-blue-400 leading-none">
            <span className="notranslate">
              {currencySymbol}
              {service.price}
            </span>
          </span>
          <div className="p-1 bg-primary rounded-lg text-white">
            <ChevronRight size={12} />
          </div>
        </div>
      </div>
    </div>
  );
};

export const StaffCard = ({ staff, isSelected, onClick }) => {
  const { currencySymbol } = useAuth();

  const getImageUrl = (path) => {
    if (!path) return null;
    const baseUrl = getSocketURL();
    return `${baseUrl}/${path.replace(/\\/g, "/")}`;
  };

  return (
    <div
      onClick={() => onClick(staff)}
      className={`staff-card ${isSelected ? "selected" : ""}`}
    >
      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 dark:bg-dark-card flex-shrink-0">
        {staff.photo?.path ? (
          <img
            src={getImageUrl(staff.photo.path)}
            alt={staff.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold">
            {staff.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
            {staff.name}
          </h4>
          <div className="flex items-center gap-1">
            <Star size={10} className="text-yellow-400 fill-yellow-400" />
            <span className="text-[10px] font-bold">4.0</span>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Professional Stylist</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
            Rate
          </span>
          <span className="text-xs font-black text-brand-primary dark:text-blue-400 leading-none">
            <span className="notranslate">
              {currencySymbol}
              {staff.services?.[0]?.price || "0"}
            </span>
            /hr
          </span>
          <button className="px-3 py-1 bg-primary/10 text-primary text-[9px] font-bold rounded-full hover:bg-primary hover:text-white transition-all">
            See more
          </button>
        </div>
      </div>
    </div>
  );
};
