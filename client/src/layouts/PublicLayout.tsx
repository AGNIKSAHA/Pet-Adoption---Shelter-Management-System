import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Sidebar from "../components/Sidebar";
import { useAppSelector } from "../store/store";
export default function PublicLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { isAuthenticated, user } = useAppSelector((state) => state.auth);
    const location = useLocation();
    const showSidebar = isAuthenticated &&
        user?.role === "adopter" &&
        location.pathname === "/pets";
    return (<div className="min-h-screen flex flex-col">
      {showSidebar ? (<div className="flex flex-1">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}/>
          <div className="flex-1 flex flex-col min-w-0">
            <Navbar onMenuClick={() => setSidebarOpen(true)}/>
            <main className="flex-1">
              <Outlet />
            </main>
            <Footer />
          </div>
        </div>) : (<>
          <Navbar />
          <main className="flex-1">
            <Outlet />
          </main>
          <Footer />
        </>)}
    </div>);
}
