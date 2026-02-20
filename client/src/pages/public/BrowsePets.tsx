import { useState } from "react";
import PetCard from "../../components/PetCard";
import { Filter, Search, ChevronUp, Loader2 } from "lucide-react";
import { usePets, PetFilter } from "../../hooks/usePets";
import { Pet } from "../../types";
export default function BrowsePets() {
    const [filterOpen, setFilterOpen] = useState(false);
    const [filters, setFilters] = useState<PetFilter>({
        species: "all",
        breed: "",
        gender: "",
        size: "",
        page: 1,
        limit: 12,
    });
    const { data, isLoading, isError } = usePets(filters);
    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        setFilters({ ...filters, [e.target.name]: e.target.value, page: 1 });
    };
    return (<div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Find a Friend</h1>
          <p className="text-gray-500 mt-1">
            Discover pets available for adoption near you.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"/>
            <input type="text" name="breed" placeholder="Search by breed..." value={filters.breed || ""} onChange={handleFilterChange} className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"/>
          </div>
          <button onClick={() => setFilterOpen(!filterOpen)} className="md:hidden p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Filter className="w-5 h-5 text-gray-600"/>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        <div className={`md:col-span-1 space-y-6 ${filterOpen ? "block" : "hidden md:block"}`}>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Filter className="w-5 h-5 text-primary-600"/> Filters
              </h2>
              {filterOpen && (<button onClick={() => setFilterOpen(false)} className="md:hidden">
                  <ChevronUp className="w-5 h-5 text-gray-400"/>
                </button>)}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Species
                </label>
                <select name="species" value={filters.species || "all"} onChange={handleFilterChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500">
                  <option value="all">All Species</option>
                  <option value="dog">Dogs</option>
                  <option value="cat">Cats</option>
                  <option value="bird">Birds</option>
                  <option value="rabbit">Rabbits</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select name="gender" value={filters.gender || ""} onChange={handleFilterChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500">
                  <option value="">Any Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Size
                </label>
                <select name="size" value={filters.size || ""} onChange={handleFilterChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500">
                  <option value="">Any Size</option>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        
        <div className="md:col-span-3">
          {isLoading ? (<div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-primary-600"/>
            </div>) : isError ? (<div className="text-center py-12 text-red-500">
              Failed to load pets. Please try again later.
            </div>) : (<>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {data?.data.pets.map((pet: Pet) => (<PetCard key={pet._id} pet={pet}/>))}
              </div>

              {data?.data.pets.length === 0 && (<div className="text-center py-12">
                  <p className="text-gray-500 text-lg">
                    No pets found matching your criteria.
                  </p>
                  <button onClick={() => setFilters({
                    species: "all",
                    breed: "",
                    gender: "",
                    size: "",
                    page: 1,
                    limit: 12,
                })} className="text-primary-600 hover:text-primary-700 font-medium mt-2">
                    Clear all filters
                  </button>
                </div>)}

              
              {data?.data.pagination && data.data.pagination.pages > 1 && (<div className="flex justify-center mt-8 gap-2">
                  <button disabled={filters.page === 1} onClick={() => setFilters((prev) => ({
                    ...prev,
                    page: (prev.page || 1) - 1,
                }))} className="px-4 py-2 border rounded disabled:opacity-50">
                    Previous
                  </button>
                  <span className="px-4 py-2 text-gray-600">
                    Page {filters.page} of {data.data.pagination.pages}
                  </span>
                  <button disabled={filters.page === data.data.pagination.pages} onClick={() => setFilters((prev) => ({
                    ...prev,
                    page: (prev.page || 1) + 1,
                }))} className="px-4 py-2 border rounded disabled:opacity-50">
                    Next
                  </button>
                </div>)}
            </>)}
        </div>
      </div>
    </div>);
}
