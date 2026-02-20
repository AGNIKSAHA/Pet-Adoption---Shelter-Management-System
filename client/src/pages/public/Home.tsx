import { Link } from "react-router-dom";
import { useAppSelector } from "../../store/store";
import { Heart, Search, Shield, Users } from "lucide-react";
export default function Home() {
    const { isAuthenticated } = useAppSelector((state) => state.auth);
    return (<div className="min-h-screen">
      
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">
              Find Your Perfect Companion
            </h1>
            <p className="text-xl mb-8 text-primary-100">
              Thousands of pets are waiting for loving homes. Start your
              adoption journey today.
            </p>
            <div className="flex gap-4 justify-center">
              <Link to="/pets" className="btn btn-primary bg-white text-primary-600 hover:bg-gray-100 px-8 py-3 text-lg">
                Browse Pets
              </Link>
              {!isAuthenticated && (<Link to="/register" className="btn btn-outline border-white text-white hover:bg-white hover:text-primary-600 px-8 py-3 text-lg">
                  Get Started
                </Link>)}
            </div>
          </div>
        </div>
      </section>

      
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose Us?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="card text-center">
              <div className="flex justify-center mb-4">
                <Search className="w-12 h-12 text-primary-600"/>
              </div>
              <h3 className="text-xl font-semibold mb-2">Advanced Search</h3>
              <p className="text-gray-600">
                Filter by species, breed, age, size, and compatibility to find
                your perfect match.
              </p>
            </div>

            <div className="card text-center">
              <div className="flex justify-center mb-4">
                <Shield className="w-12 h-12 text-primary-600"/>
              </div>
              <h3 className="text-xl font-semibold mb-2">Verified Shelters</h3>
              <p className="text-gray-600">
                All shelters are verified and follow strict animal welfare
                standards.
              </p>
            </div>

            <div className="card text-center">
              <div className="flex justify-center mb-4">
                <Heart className="w-12 h-12 text-primary-600"/>
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Application</h3>
              <p className="text-gray-600">
                Simple online application process with real-time status updates.
              </p>
            </div>

            <div className="card text-center">
              <div className="flex justify-center mb-4">
                <Users className="w-12 h-12 text-primary-600"/>
              </div>
              <h3 className="text-xl font-semibold mb-2">Community Support</h3>
              <p className="text-gray-600">
                Connect with shelters, get advice, and join a community of pet
                lovers.
              </p>
            </div>
          </div>
        </div>
      </section>

      
      <section className="py-20 bg-primary-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Make a Difference?
          </h2>
          <p className="text-xl mb-8 text-primary-100">
            Start your adoption journey today or support our mission.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/pets" className="btn bg-white text-primary-600 hover:bg-gray-100 px-8 py-3">
              Adopt a Pet
            </Link>
            <Link to="/register" className="btn border-2 border-white text-white hover:bg-white hover:text-primary-600 px-8 py-3">
              Become a Foster
            </Link>
          </div>
        </div>
      </section>
    </div>);
}
