import { Menu, LogOut, Building2, ChevronDown, Check } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../store/store";
import { logout, setActiveShelter } from "../store/slices/authSlice";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../lib/api";
import NotificationDropdown from "./NotificationDropdown";

interface DashboardNavbarProps {
  onMenuClick: () => void;
}

export default function DashboardNavbar({ onMenuClick }: DashboardNavbarProps) {
  const { user, activeShelterId, activeRole } = useAppSelector(
    (state) => state.auth,
  );
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isShelterSwitcherOpen, setIsShelterSwitcherOpen] = useState(false);
  const effectiveRole = activeRole || user?.role;

  const extractId = (value: unknown): string | null => {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      const obj = value as {
        _id?: unknown;
        id?: unknown;
        toString?: () => string;
      };
      if (obj._id) return extractId(obj._id);
      if (obj.id) return extractId(obj.id);
      if (typeof obj.toString === "function") {
        const str = obj.toString();
        if (str && str !== "[object Object]") return str;
      }
    }
    return null;
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error: unknown) {
      console.error("Logout failed:", error);
    } finally {
      dispatch(logout());
      navigate("/login");
    }
  };

  const memberships = user?.memberships || [];
  const placeholderNames = new Set([
    "shelter",
    "primary shelter",
    "approved shelter",
    "shelter account",
  ]);
  const isValidShelterName = (name?: string) => {
    if (!name) return false;
    return !placeholderNames.has(name.trim().toLowerCase());
  };

  const shelterOptionsMap = new Map<
    string,
    { id: string; name: string; role: string }
  >();

  memberships.forEach((m) => {
    if (!m.shelterId) return;
    const id = extractId(m.shelterId);
    if (!id) return;
    const name =
      typeof m.shelterId === "object" ? m.shelterId.name : "Shelter";
    if (!isValidShelterName(name)) return;
    shelterOptionsMap.set(id, { id, name, role: m.role });
  });

  if (user?.shelterId) {
    const primaryId = extractId(user.shelterId);
    if (primaryId && !shelterOptionsMap.has(primaryId)) {
      const primaryName =
        typeof user.shelterId === "object"
          ? user.shelterId.name
          : "Primary Shelter";
      if (!isValidShelterName(primaryName)) return;
      shelterOptionsMap.set(primaryId, {
        id: primaryId,
        name: primaryName,
        role: "shelter_staff",
      });
    }
  }

  (user?.staffApplications || [])
    .filter((app) => app.status === "approved")
    .forEach((app) => {
      const sid = extractId(app.shelterId);
      if (!sid || shelterOptionsMap.has(sid)) return;
      const name =
        typeof app.shelterId === "object"
          ? app.shelterId.name
          : "Approved Shelter";
      if (!isValidShelterName(name)) return;
      shelterOptionsMap.set(sid, {
        id: sid,
        name,
        role: "shelter_staff",
      });
    });

  const shelterOptions = Array.from(shelterOptionsMap.values());
  const currentShelter =
    shelterOptions.find((s) => s.id === activeShelterId) || shelterOptions[0];

  useEffect(() => {
    if (
      effectiveRole === "shelter_staff" &&
      !activeShelterId &&
      shelterOptions.length > 0
    ) {
      dispatch(
        setActiveShelter({
          shelterId: shelterOptions[0].id,
          role: "shelter_staff",
        }),
      );
    }
  }, [effectiveRole, activeShelterId, shelterOptions, dispatch]);

  const handleSwitchShelter = (
    shelterId: string | null,
    role: string | null,
  ) => {
    dispatch(setActiveShelter({ shelterId, role }));
    setIsShelterSwitcherOpen(false);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Shelter Context Switcher (staff only) */}
          {effectiveRole === "shelter_staff" && shelterOptions.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setIsShelterSwitcherOpen(!isShelterSwitcherOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-all"
              >
                <Building2 className="w-4 h-4 text-primary-600" />
                <div className="text-left hidden sm:block">
                  <p className="text-xs text-gray-500 font-medium">
                    Choose shelter
                  </p>
                  <p className="text-sm font-bold text-gray-900 truncate max-w-[150px]">
                    {currentShelter?.name || "Select shelter"}
                  </p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${isShelterSwitcherOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isShelterSwitcherOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsShelterSwitcherOpen(false)}
                  />
                  <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100 mb-1">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Switch Context
                      </p>
                    </div>
                    {shelterOptions.map((s) => {
                      const isSelected = activeShelterId === s.id;

                      return (
                        <button
                          key={s.id}
                          onClick={() => handleSwitchShelter(s.id, s.role)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-primary-50 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-2 h-2 rounded-full ${isSelected ? "bg-primary-600" : "bg-transparent"}`}
                            />
                            <div className="text-left">
                              <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                                {s.name}
                              </p>
                              <p className="text-xs text-gray-500 capitalize">
                                {s.role.replace("_", " ")}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-primary-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {!activeShelterId && (
            <h1 className="text-xl font-semibold text-gray-800 hidden md:block">
              Welcome back, {user?.firstName}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-4">
          <NotificationDropdown />

          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-semibold">
                {user?.firstName?.[0]}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:block">
                {user?.firstName} {user?.lastName}
              </span>
            </button>

            {isProfileOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsProfileOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 border border-gray-100 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
