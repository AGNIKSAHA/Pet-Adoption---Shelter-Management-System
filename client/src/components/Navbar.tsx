import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, PawPrint } from "lucide-react";
import { useAppSelector } from "../store/store";
interface NavbarProps {
    onMenuClick?: () => void;
}
export default function Navbar({ onMenuClick }: NavbarProps = {}) {
    const [isOpen, setIsOpen] = useState(false);
    const { isAuthenticated } = useAppSelector((state) => state.auth);
    const toggleMenu = () => setIsOpen(!isOpen);
    return (<nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-primary-600">
            <PawPrint className="w-8 h-8"/>
            <span>PetAdopt</span>
          </Link>

          
          <div className="hidden md:flex items-center gap-6">
            <Link to="/pets" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">
              Browse Pets
            </Link>
            <div className="flex items-center gap-3">
              {isAuthenticated ? (<Link to="/dashboard" className="btn btn-primary px-5 py-2">
                  Dashboard
                </Link>) : (<>
                  <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700 transition-colors">
                    Login
                  </Link>
                  <Link to="/register" className="btn btn-primary px-5 py-2">
                    Get Started
                  </Link>
                </>)}
            </div>
          </div>

          
          <button className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg" onClick={onMenuClick || toggleMenu}>
            {isOpen ? <X className="w-6 h-6"/> : <Menu className="w-6 h-6"/>}
          </button>
        </div>

        
        {isOpen && (<div className="md:hidden pt-4 pb-2 border-t border-gray-100 mt-3 animate-in slide-in-from-top-2">
            <div className="flex flex-col gap-4">
              <Link to="/pets" className="text-gray-700 hover:text-primary-600 font-medium px-2 py-1" onClick={() => setIsOpen(false)}>
                Browse Pets
              </Link>
              <hr className="border-gray-100"/>
              {isAuthenticated ? (<Link to="/dashboard" className="btn btn-primary text-center" onClick={() => setIsOpen(false)}>
                  Dashboard
                </Link>) : (<>
                  <Link to="/login" className="text-gray-700 hover:text-primary-600 font-medium px-2 py-1" onClick={() => setIsOpen(false)}>
                    Login
                  </Link>
                  <Link to="/register" className="btn btn-primary text-center" onClick={() => setIsOpen(false)}>
                    Get Started
                  </Link>
                </>)}
            </div>
          </div>)}
      </div>
    </nav>);
}
