import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAppSelector, useAppDispatch } from "../store/store";
import { setActiveShelter } from "../store/slices/authSlice";
import {
  LayoutDashboard,
  Heart,
  FileText,
  Search,
  PawPrint,
  ArrowRightLeft,
  Users,
  Building2,
  MessageSquare,
  UserCircle,
  X,
  ChevronDown,
  Check,
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, activeRole, activeShelterId } = useAppSelector(
    (state) => state.auth,
  );
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  const commonLinks = [
    { name: "Messages", path: "/messages", icon: MessageSquare },
    { name: "Profile", path: "/profile", icon: UserCircle },
  ];

  const adopterLinks = [
    { name: "Dashboard", path: "/adopter/dashboard", icon: LayoutDashboard },
    { name: "Browse Pets", path: "/adopter/pets", icon: Search },
    { name: "My Applications", path: "/adopter/applications", icon: FileText },
    { name: "Apply Foster Parent", path: "/adopter/foster-apply", icon: Users },
    { name: "Favorites", path: "/adopter/favorites", icon: Heart },
  ];

  const shelterLinks = [
    { name: "Dashboard", path: "/shelter/dashboard", icon: LayoutDashboard },
  ];

  const effectiveShelterId =
    activeShelterId || (user.role === "shelter_staff" ? user.shelterId : null);

  if (effectiveShelterId) {
    shelterLinks.push(
      { name: "Pet Management", path: "/shelter/pets", icon: PawPrint },
      { name: "Pet Transfer", path: "/shelter/pet-transfers", icon: ArrowRightLeft },
      {
        name: "Applications Queue",
        path: "/shelter/applications",
        icon: FileText,
      },
      { name: "Foster Board", path: "/shelter/fosters", icon: Users },
    );
  }

  const adminLinks = [
    { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Shelters", path: "/admin/shelters", icon: Building2 },
    { name: "Users", path: "/admin/users", icon: Users },
    { name: "Staff Requests", path: "/admin/shelter-requests", icon: FileText },
  ];

  let links = [];
  const effectiveRole = activeRole || user.role;

  // Multi-tenancy logic for Sidebar links:
  // 1. If effectiveRole is admin but we have an activeShelterId -> Act as shelter context (show shelterLinks)
  // 2. If effectiveRole is admin but no activeShelterId -> show adminLinks
  // 3. Otherwise -> Use role based standard links

  if (effectiveRole === "admin") {
    if (activeShelterId) {
      links = shelterLinks;
    } else {
      links = adminLinks;
    }
  } else if (effectiveRole === "shelter_staff") {
    links = shelterLinks;
  } else {
    links = adopterLinks;
  }

  const memberships = user.memberships || [];

  const handleSwitchShelter = (
    shelterId: string | null,
    newRole: string | null,
  ) => {
    dispatch(setActiveShelter({ shelterId, role: newRole }));
    setIsSwitcherOpen(false);
    if (newRole === "admin") {
      navigate("/admin/dashboard");
    } else if (newRole === "shelter_staff") {
      navigate("/shelter/dashboard");
    } else {
      navigate("/adopter/dashboard");
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-20 bg-black/50 transition-opacity lg:hidden ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex shrink-0 items-center justify-between px-6 border-b border-gray-200">
            <Link
              to="/"
              className="text-xl font-bold text-primary-600 flex items-center gap-2"
            >
              <PawPrint className="w-6 h-6" />
              <span>PetAdopt</span>
            </Link>
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded-md text-gray-500 hover:bg-gray-100"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Workspace Switcher */}
          {(memberships.length > 0 ||
            user.role === "admin" ||
            (user.roles && user.roles.length > 1)) && (
            <div className="px-4 py-4 border-b border-gray-200">
              <div className="relative">
                <button
                  onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-all"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Building2 className="w-4 h-4 text-primary-600 shrink-0" />
                    <div className="text-left truncate">
                      <p className="text-xs text-gray-500 font-medium">
                        Viewing as
                      </p>
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {effectiveRole === "admin"
                          ? "Admin"
                          : effectiveRole === "shelter_staff"
                            ? "Shelter Staff"
                            : "Adopter (Personal)"}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${isSwitcherOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isSwitcherOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsSwitcherOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-100 mb-1">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                          Switch Context
                        </p>
                      </div>

                      {(user.roles?.includes("admin") ||
                        user.role === "admin") && (
                        <button
                          onClick={() => handleSwitchShelter(null, "admin")}
                          className="w-full flex items-center justify-between px-4 py-2 hover:bg-primary-50 transition-colors group"
                        >
                          <div className="text-left">
                            <p className="text-sm font-semibold text-gray-900">
                              Admin
                            </p>
                            <p className="text-xs text-gray-500">Full Access</p>
                          </div>
                          {effectiveRole === "admin" && (
                            <Check className="w-4 h-4 text-primary-600" />
                          )}
                        </button>
                      )}

                      {(user.roles?.includes("shelter_staff") ||
                        user.role === "shelter_staff") && (
                        <button
                          onClick={() =>
                            handleSwitchShelter(null, "shelter_staff")
                          }
                          className="w-full flex items-center justify-between px-4 py-2 hover:bg-primary-50 transition-colors group"
                        >
                          <div className="text-left">
                            <p className="text-sm font-semibold text-gray-900">
                              Shelter Staff
                            </p>
                            <p className="text-xs text-gray-500">
                              Staff Overview
                            </p>
                          </div>
                          {effectiveRole === "shelter_staff" && (
                            <Check className="w-4 h-4 text-primary-600" />
                          )}
                        </button>
                      )}

                      {(user.roles?.includes("adopter") ||
                        user.role === "adopter" ||
                        !user.roles) && (
                        <button
                          onClick={() => handleSwitchShelter(null, "adopter")}
                          className="w-full flex items-center justify-between px-4 py-2 hover:bg-primary-50 transition-colors group"
                        >
                          <div className="text-left">
                            <p className="text-sm font-semibold text-gray-900">
                              Adopter (Personal)
                            </p>
                            <p className="text-xs text-gray-500">
                              Adopter Profile
                            </p>
                          </div>
                          {effectiveRole === "adopter" && (
                            <Check className="w-4 h-4 text-primary-600" />
                          )}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
            <div className="mb-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Menu
            </div>
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.path)
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  onClick={onClose}
                >
                  <Icon
                    className={`w-5 h-5 ${isActive(link.path) ? "text-primary-600" : "text-gray-400"}`}
                  />
                  {link.name}
                </Link>
              );
            })}

            <div className="mt-8 mb-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Settings
            </div>
            {commonLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.path)
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  onClick={onClose}
                >
                  <Icon
                    className={`w-5 h-5 ${isActive(link.path) ? "text-primary-600" : "text-gray-400"}`}
                  />
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* User profile summary at bottom can go here if distinct from navbar */}
        </div>
      </aside>
    </>
  );
}
