import { Link, useLocation } from "react-router-dom";
import { useAppSelector } from "../store/store";
import {
  LayoutDashboard,
  Heart,
  FileText,
  Search,
  PawPrint,
  Users,
  Building2,
  MessageSquare,
  UserCircle,
  X,
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (!user) return null;

  const role = user.role;

  const isActive = (path: string) => location.pathname === path;

  const commonLinks = [
    { name: "Messages", path: "/messages", icon: MessageSquare },
    { name: "Profile", path: "/profile", icon: UserCircle },
  ];

  const adopterLinks = [
    { name: "Dashboard", path: "/adopter/dashboard", icon: LayoutDashboard },
    { name: "Browse Pets", path: "/adopter/pets", icon: Search },
    { name: "My Applications", path: "/adopter/applications", icon: FileText },
    { name: "Favorites", path: "/adopter/favorites", icon: Heart },
  ];

  const shelterLinks = [
    { name: "Dashboard", path: "/shelter/dashboard", icon: LayoutDashboard },
    { name: "Pet Management", path: "/shelter/pets", icon: PawPrint },
    {
      name: "Applications Queue",
      path: "/shelter/applications",
      icon: FileText,
    },
    { name: "Foster Board", path: "/shelter/fosters", icon: Users },
  ];

  const adminLinks = [
    { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Shelters", path: "/admin/shelters", icon: Building2 },
    { name: "Users", path: "/admin/users", icon: Users },
    { name: "Staff Requests", path: "/admin/shelter-requests", icon: FileText },
  ];

  let links = [];
  switch (role) {
    case "admin":
      links = adminLinks;
      break;
    case "shelter_staff":
      links = shelterLinks;
      break;
    case "adopter":
      links = adopterLinks;
      break;
    default:
      links = adopterLinks;
  }

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
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
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
