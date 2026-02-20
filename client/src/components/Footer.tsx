import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Mail, Phone, MapPin, } from "lucide-react";
export default function Footer() {
    return (<footer className="bg-gray-900 text-gray-300 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">PetAdopt</h3>
            <p className="text-sm">
              Connecting loving families with pets in need. We work with
              shelters across the country to find forever homes.
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors">
                <Facebook className="w-5 h-5"/>
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <Twitter className="w-5 h-5"/>
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <Instagram className="w-5 h-5"/>
              </a>
            </div>
          </div>

          
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/pets" className="hover:text-white transition-colors">
                  Browse Pets
                </Link>
              </li>
              <li>
                <Link to="/shelters" className="hover:text-white transition-colors">
                  Shelters
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/adoption-guide" className="hover:text-white transition-colors">
                  Adoption Guide
                </Link>
              </li>
              <li>
                <Link to="/faqs" className="hover:text-white transition-colors">
                  FAQs
                </Link>
              </li>
              <li>
                <Link to="/volunteer" className="hover:text-white transition-colors">
                  Volunteer
                </Link>
              </li>
              <li>
                <Link to="/donate" className="hover:text-white transition-colors">
                  Donate
                </Link>
              </li>
            </ul>
          </div>

          
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Contact Us
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary-500"/>
                <span>contact@petadopt.com</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary-500"/>
                <span>+1 (555) 123-4567</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-500"/>
                <span>123 Pet Street, Animal City</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm text-gray-500">
          <p>
            &copy; {new Date().getFullYear()} Pet Adoption System. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>);
}
