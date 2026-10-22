import React from "react";
import { Award, Phone } from "lucide-react";
import Modal from "./Modal";
import Skeleton from "./Skeleton";
import { useGetCustomerLoyaltyBalancesQuery } from "../../store/api/tenantEndpoints";

const CustomerLoyaltyBalancesSheet = ({ isOpen, onClose }) => {
  // Use RTK Query to fetch balances. `skip: !isOpen` ensures it only fetches when the sheet is opened.
  const { data: res, isLoading, error } = useGetCustomerLoyaltyBalancesQuery(undefined, {
    skip: !isOpen,
  });

  const data = res?.data || [];

  const formatPoints = (points) => {
    return Number(points || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customer Balances"
      position="right"
      width="md:w-[450px]"
    >
      <div className="-mx-2 -mt-2">
        {isLoading ? (
            <div className="flex flex-col space-y-6 pt-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Skeleton width="40px" height="40px" borderRadius="50%" />
                    <div className="flex flex-col space-y-1.5">
                      <Skeleton width="120px" height="14px" />
                      <Skeleton width="80px" height="10px" />
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end space-y-1.5">
                      <Skeleton width="40px" height="10px" />
                      <Skeleton width="60px" height="14px" />
                    </div>
                    <div className="flex flex-col items-end space-y-1.5">
                      <Skeleton width="50px" height="10px" />
                      <Skeleton width="50px" height="14px" />
                    </div>
                    <div className="flex flex-col items-end space-y-1.5">
                      <Skeleton width="40px" height="10px" />
                      <Skeleton width="70px" height="16px" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-500 bg-red-50 rounded-xl text-sm font-medium">
              {error}
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-400">
              <Award size={32} className="opacity-50" />
              <span className="text-sm font-medium">No customers with loyalty points found.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {data.map((customer) => (
                <div
                  key={customer._id}
                  className="px-3.5 py-3 flex items-center justify-between gap-3 border border-gray-100 dark:border-dark-border rounded-2xl bg-gray-50/50 dark:bg-dark-card/50"
                >
                  <div className="flex items-center gap-3">
                    {customer.photo?.url ? (
                      <img
                        src={customer.photo.url}
                        alt={customer.name}
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-sm shrink-0 border border-indigo-100 dark:border-indigo-800/30">
                        {(customer.name?.charAt(0) || "U").toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-gray-900 dark:text-white truncate max-w-[150px]">
                        {customer.name || "Unknown"}
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                        <Phone size={10} /> {customer.phone || "No phone"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-gray-400 uppercase font-black tracking-[0.1em] mb-0.5">Lifetime</span>
                      <span className="text-[12px] font-bold text-gray-700 dark:text-gray-300">
                        {formatPoints(customer.lifetimePoints)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-gray-400 uppercase font-black tracking-[0.1em] mb-0.5">Redeemed</span>
                      <span className="text-[12px] font-bold text-red-500 dark:text-red-400">
                        {customer.redeemedPoints > 0 ? "-" : ""}{formatPoints(customer.redeemedPoints)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-brand-primary dark:text-blue-400 uppercase font-black tracking-[0.1em] mb-0.5">Current</span>
                      <span className="text-[14px] font-black text-brand-primary dark:text-blue-400">
                        {formatPoints(customer.currentPoints)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    </Modal>
  );
};

export default CustomerLoyaltyBalancesSheet;
