import { useState, useCallback } from "react";

/**
 * Custom hook for managing pagination state in report screens.
 * @param {Object} options Configuration options
 * @param {number} options.initialLimit Default items per page (default: 20)
 * @returns {Object} Pagination state and handlers
 */
export const usePagination = ({ initialLimit = 20 } = {}) => {
  const [pagination, setPagination] = useState({
    page: 1,
    limit: initialLimit,
    totalPages: 1,
    total: 0,
  });

  const onPageChange = useCallback((newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  }, []);

  const setTotal = useCallback((totalRecords) => {
    setPagination((prev) => ({
      ...prev,
      total: totalRecords,
      totalPages: Math.ceil(totalRecords / prev.limit) || 1,
    }));
  }, []);

  const updatePagination = useCallback((apiPagination) => {
    if (apiPagination) {
      setPagination((prev) => ({
        ...prev,
        page: apiPagination.page || prev.page,
        limit: apiPagination.limit || prev.limit,
        totalPages: apiPagination.totalPages || 1,
        total: apiPagination.total || 0,
      }));
    }
  }, []);

  const resetPagination = useCallback(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  return {
    pagination,
    onPageChange,
    setTotal,
    updatePagination,
    resetPagination,
  };
};

export default usePagination;
