import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User } from "../../types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  activeShelterId: string | null;
  activeRole: string | null;
}

const MONGO_OBJECT_ID_REGEX = /^[a-f0-9]{24}$/i;

const extractShelterId = (value: unknown): string | null => {
  if (!value) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (MONGO_OBJECT_ID_REGEX.test(trimmed)) return trimmed;

    // Handle accidentally stored JSON-like values.
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return extractShelterId(JSON.parse(trimmed));
      } catch {
        return null;
      }
    }

    return null;
  }

  if (typeof value === "object") {
    const obj = value as { _id?: unknown; id?: unknown };
    return extractShelterId(obj._id ?? obj.id ?? null);
  }

  return null;
};

const storedActiveShelterId = localStorage.getItem("activeShelterId");
const normalizedStoredActiveShelterId = extractShelterId(storedActiveShelterId);
if (storedActiveShelterId && !normalizedStoredActiveShelterId) {
  localStorage.removeItem("activeShelterId");
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  activeShelterId: normalizedStoredActiveShelterId,
  activeRole: localStorage.getItem("activeRole"),
};

const getAvailableShelterIds = (user: User): string[] => {
  const ids: string[] = [];

  const primaryId = extractShelterId(user.shelterId);
  if (primaryId) {
    ids.push(primaryId);
  }

  (user.memberships || []).forEach((m) => {
    const sid = extractShelterId(m.shelterId);
    if (sid) ids.push(sid);
  });

  return Array.from(new Set(ids));
};

const syncActiveContext = (state: AuthState, user: User) => {
  const availableShelterIds = getAvailableShelterIds(user);
  const primaryShelterId = extractShelterId(user.shelterId);
  const normalizedActiveShelterId = extractShelterId(state.activeShelterId);

  if (state.activeShelterId !== normalizedActiveShelterId) {
    state.activeShelterId = normalizedActiveShelterId;
  }

  if (
    state.activeShelterId &&
    !availableShelterIds.includes(state.activeShelterId)
  ) {
    state.activeShelterId = null;
    localStorage.removeItem("activeShelterId");
  }

  if (!state.activeRole) {
    state.activeRole = user.role;
    localStorage.setItem("activeRole", user.role);
  }

  if (
    !state.activeShelterId &&
    primaryShelterId &&
    availableShelterIds.includes(primaryShelterId)
  ) {
    state.activeShelterId = primaryShelterId;
    localStorage.setItem("activeShelterId", primaryShelterId);
  } else if (!state.activeShelterId && availableShelterIds.length === 1) {
    state.activeShelterId = availableShelterIds[0];
    localStorage.setItem("activeShelterId", availableShelterIds[0]);
  }
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User }>) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.loading = false;
      syncActiveContext(state, action.payload.user);
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.loading = false;
      syncActiveContext(state, action.payload);
    },
    setActiveShelter: (
    state,
    action: PayloadAction<{ shelterId: string | null; role: string | null }>,
  ) => {
      const normalizedShelterId = extractShelterId(action.payload.shelterId);
      state.activeShelterId = normalizedShelterId;
      state.activeRole = action.payload.role;
      if (normalizedShelterId) {
        localStorage.setItem("activeShelterId", normalizedShelterId);
      } else {
        localStorage.removeItem("activeShelterId");
      }
      if (action.payload.role) {
        localStorage.setItem("activeRole", action.payload.role);
      } else {
        localStorage.removeItem("activeRole");
      }
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.activeShelterId = null;
      state.activeRole = null;
      localStorage.removeItem("activeShelterId");
      localStorage.removeItem("activeRole");
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setCredentials, setUser, setActiveShelter, logout, setLoading } =
  authSlice.actions;
export default authSlice.reducer;
