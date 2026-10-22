import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  setProductSelectedIds,
  toggleProductSelection,
  clearProductSelection,
  setStockTransferSelectedIds,
  clearStockTransferSelection,
  setPurchaseOrderSelectedIds,
  clearPurchaseOrderSelection,
} from "../store/slices/stockSlice";

/**
 * Custom hook for managing bulk selection in stock screens
 * 
 * @param {string} module - The module name (products, stockTransfers, etc.)
 * @returns {object} Selection state and actions
 */
export const useStockSelection = (module) => {
  const dispatch = useAppDispatch();
  const selectedIds = useAppSelector(
    (state) => state.stock[module]?.selectedIds || []
  );

  const actionMap = {
    products: {
      setSelected: setProductSelectedIds,
      toggle: toggleProductSelection,
      clear: clearProductSelection,
    },
    stockTransfers: {
      setSelected: setStockTransferSelectedIds,
      clear: clearStockTransferSelection,
    },
    purchaseOrders: {
      setSelected: setPurchaseOrderSelectedIds,
      clear: clearPurchaseOrderSelection,
    },
  };

  const actions = actionMap[module];

  const setSelectedIds = useCallback(
    (ids) => {
      if (actions?.setSelected) {
        dispatch(actions.setSelected(ids));
      }
    },
    [dispatch, actions]
  );

  const toggleSelection = useCallback(
    (id) => {
      if (actions?.toggle) {
        dispatch(actions.toggle(id));
      } else if (actions?.setSelected) {
        // Fallback for modules without toggle action
        const newIds = selectedIds.includes(id)
          ? selectedIds.filter((selectedId) => selectedId !== id)
          : [...selectedIds, id];
        dispatch(actions.setSelected(newIds));
      }
    },
    [dispatch, actions, selectedIds]
  );

  const clearSelection = useCallback(() => {
    if (actions?.clear) {
      dispatch(actions.clear());
    }
  }, [dispatch, actions]);

  const selectAll = useCallback(
    (allIds) => {
      if (actions?.setSelected) {
        dispatch(actions.setSelected(allIds));
      }
    },
    [dispatch, actions]
  );

  const isSelected = useCallback(
    (id) => selectedIds.includes(id),
    [selectedIds]
  );

  const isAllSelected = useCallback(
    (allIds) => {
      if (!allIds || allIds.length === 0) return false;
      return allIds.every((id) => selectedIds.includes(id));
    },
    [selectedIds]
  );

  return {
    selectedIds,
    selectedCount: selectedIds.length,
    setSelectedIds,
    toggleSelection,
    clearSelection,
    selectAll,
    isSelected,
    isAllSelected,
  };
};
