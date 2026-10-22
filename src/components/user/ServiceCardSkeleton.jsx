import React from "react";

/**
 * Skeleton loader for ServiceCard
 * Shows animated placeholder while services are loading
 */
const ServiceCardSkeleton = () => {
  return (
    <div className="premium-card p-4 sm:p-6 animate-pulse">
      {/* Image Skeleton */}
      <div className="w-full aspect-square bg-gray-200 dark:bg-dark-border rounded-2xl mb-4" />
      
      {/* Title Skeleton */}
      <div className="h-5 bg-gray-200 dark:bg-dark-border rounded-lg mb-3 w-3/4" />
      
      {/* Price Skeleton */}
      <div className="h-6 bg-gray-200 dark:bg-dark-border rounded-lg mb-4 w-1/2" />
      
      {/* Button Skeleton */}
      <div className="h-10 bg-gray-200 dark:bg-dark-border rounded-xl w-full" />
    </div>
  );
};

export default ServiceCardSkeleton;
