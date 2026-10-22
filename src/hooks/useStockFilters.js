import { useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  setProductFilters,
  setProductSearch,
  setProductPagination,
  resetProductFilters,
  setPurchaseOrderFilters,
  setPurchaseOrderSearch,
  setPurchaseOrderPagination,
  resetPurchaseOrderFilters,
  setPurchaseEntryFilters,
  setPurchaseEntrySearch,
  setPurchaseEntryPagination,
  resetPurchaseEntryFilters,
  setPurchaseReturnFilters,
  setPurchaseReturnSearch,
  setPurchaseReturnPagination,
  resetPurchaseReturnFilters,
  setStockTransferFilters,
  setStockTransferSearch,
  setStockTransferPagination,
  resetStockTransferFilters,
  setDamageEntryFilters,
  setDamageEntrySearch,
  setDamageEntryPagination,
  resetDamageEntryFilters,
  setConsumptionEntryFilters,
  setConsumptionEntrySearch,
  setConsumptionEntryPagination,
  resetConsumptionEntryFilters,
} from "../store/slices/stockSlice";

/**
 * Custom hook for managing stock filters
 * Provides a unified interface for all stock-related screens
 * 
 * @param {string} module - The module name (products, purchaseOrders, etc.)
 * @returns {object} Filter state and actions
 */
export const useStockFilters = (module) => {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.stock[module]?.filters || {});
  const pagination = useAppSelector((state) => state.stock[module]?.pagination || {});

  // Action map for different modules
  const actionMap = useMemo(
    () => ({
      products: {
        setFilters: setProductFilters,
        setSearch: setProductSearch,
        setPagination: setProductPagination,
        reset: resetProductFilters,
      },
      purchaseOrders: {
        setFilters: setPurchaseOrderFilters,
        setSearch: setPurchaseOrderSearch,
        setPagination: setPurchaseOrderPagination,
        reset: resetPurchaseOrderFilters,
      },
      purchaseEntries: {
        setFilters: setPurchaseEntryFilters,
        setSearch: setPurchaseEntrySearch,
        setPagination: setPurchaseEntryPagination,
        reset: resetPurchaseEntryFilters,
      },
      purchaseReturns: {
        setFilters: setPurchaseReturnFilters,
        setSearch: setPurchaseReturnSearch,
        setPagination: setPurchaseReturnPagination,
        reset: resetPurchaseReturnFilters,
      },
      stockTransfers: {
        setFilters: setStockTransferFilters,
        setSearch: setStockTransferSearch,
        setPagination: setStockTransferPagination,
        reset: resetStockTransferFilters,
      },
      damageEntries: {
        setFilters: setDamageEntryFilters,
        setSearch: setDamageEntrySearch,
        setPagination: setDamageEntryPagination,
        reset: resetDamageEntryFilters,
      },
      consumptionEntries: {
        setFilters: setConsumptionEntryFilters,
        setSearch: setConsumptionEntrySearch,
        setPagination: setConsumptionEntryPagination,
        reset: resetConsumptionEntryFilters,
      },
    }),
    []
  );

  const actions = actionMap[module];

  const updateFilters = useCallback(
    (newFilters) => {
      if (actions?.setFilters) {
        dispatch(actions.setFilters(newFilters));
      }
    },
    [dispatch, actions]
  );

  const updateSearch = useCallback(
    (searchTerm) => {
      if (actions?.setSearch) {
        dispatch(actions.setSearch(searchTerm));
      }
    },
    [dispatch, actions]
  );

  const updatePagination = useCallback(
    (newPagination) => {
      if (actions?.setPagination) {
        dispatch(actions.setPagination(newPagination));
      }
    },
    [dispatch, actions]
  );

  const resetFilters = useCallback(() => {
    if (actions?.reset) {
      dispatch(actions.reset());
    }
  }, [dispatch, actions]);

  // Build query params for API calls
  const queryParams = useMemo(() => {
    return {
      ...filters,
      ...pagination,
    };
  }, [filters, pagination]);

  return {
    filters,
    pagination,
    queryParams,
    updateFilters,
    updateSearch,
    updatePagination,
    resetFilters,
  };
};
