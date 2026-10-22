import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axiosInstance';

export const fetchPrivileges = createAsyncThunk(
  'permissions/fetchPrivileges',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/privileges');
      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue('Failed to fetch privileges');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch privileges');
    }
  }
);

export const createPrivilege = createAsyncThunk(
  'permissions/createPrivilege',
  async (privilegeData, { rejectWithValue }) => {
    try {
      const response = await api.post('/privileges', privilegeData);
      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue('Failed to create privilege');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create privilege');
    }
  }
);

export const updatePrivilege = createAsyncThunk(
  'permissions/updatePrivilege',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/privileges/${id}`, data);
      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue('Failed to update privilege');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update privilege');
    }
  }
);

export const deletePrivilege = createAsyncThunk(
  'permissions/deletePrivilege',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/privileges/${id}`);
      if (response.data.success) {
        return id;
      }
      return rejectWithValue('Failed to delete privilege');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete privilege');
    }
  }
);

export const assignPrivilegeToUser = createAsyncThunk(
  'permissions/assignPrivilegeToUser',
  async ({ userId, privilegeId }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/privileges/assign/${userId}`, { privilegeId });
      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue('Failed to assign privilege');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to assign privilege');
    }
  }
);

export const fetchShopPermissions = createAsyncThunk(
  'permissions/fetchShopPermissions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/privileges/shop-permissions');
      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue('Failed to fetch shop permissions');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch shop permissions');
    }
  }
);

/** Re-fetch effective permission keys after login / refresh (same source as sidebar). */
export const fetchEffectivePermissions = createAsyncThunk(
  'permissions/fetchEffectivePermissions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.success && response.data.data) {
        return response.data.data.privileges || [];
      }
      return rejectWithValue('Failed to load permissions');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load permissions');
    }
  }
);

const initialState = {
  privileges: [],
  shopPermissions: {
    hasRestrictions: false,
    permissions: [],
  },
  /** Mirrors auth effective keys for components that prefer Redux selectors */
  effectivePermissionKeys: [],
  permissionsStatus: 'idle',
  loading: false,
  error: null,
};

const permissionSlice = createSlice({
  name: 'permissions',
  initialState,
  reducers: {
    clearPermissions: (state) => {
      state.privileges = [];
      state.shopPermissions = {
        hasRestrictions: false,
        permissions: [],
      };
      state.effectivePermissionKeys = [];
      state.permissionsStatus = 'idle';
    },
    setEffectivePermissionKeys: (state, action) => {
      state.effectivePermissionKeys = Array.isArray(action.payload) ? action.payload : [];
      state.permissionsStatus = 'ready';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPrivileges.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPrivileges.fulfilled, (state, action) => {
        state.loading = false;
        state.privileges = action.payload;
      })
      .addCase(fetchPrivileges.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createPrivilege.fulfilled, (state, action) => {
        state.privileges.push(action.payload);
      })
      .addCase(updatePrivilege.fulfilled, (state, action) => {
        const index = state.privileges.findIndex(p => p._id === action.payload._id);
        if (index !== -1) {
          state.privileges[index] = action.payload;
        }
      })
      .addCase(deletePrivilege.fulfilled, (state, action) => {
        state.privileges = state.privileges.filter(p => p._id !== action.payload);
      })
      .addCase(fetchShopPermissions.fulfilled, (state, action) => {
        state.shopPermissions = action.payload;
      })
      .addCase(fetchEffectivePermissions.pending, (state) => {
        state.permissionsStatus = 'loading';
      })
      .addCase(fetchEffectivePermissions.fulfilled, (state, action) => {
        state.effectivePermissionKeys = action.payload;
        state.permissionsStatus = 'ready';
      })
      .addCase(fetchEffectivePermissions.rejected, (state) => {
        state.permissionsStatus = 'error';
      });
  },
});

export const { clearPermissions, setEffectivePermissionKeys } = permissionSlice.actions;

export default permissionSlice.reducer;

export const selectPrivileges = (state) => state.permissions.privileges;
export const selectShopPermissions = (state) => state.permissions.shopPermissions;
export const selectPermissionsLoading = (state) => state.permissions.loading;
export const selectEffectivePermissionKeys = (state) => state.permissions.effectivePermissionKeys;
export const selectPermissionsStatus = (state) => state.permissions.permissionsStatus;
