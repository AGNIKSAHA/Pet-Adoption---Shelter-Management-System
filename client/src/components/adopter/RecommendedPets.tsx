import { Link } from "react-router-dom";
import PetCard from "../PetCard";
import { Pet } from "../../types";
interface RecommendedPetsProps {
    pets: Pet[];
}
export default function RecommendedPets({ pets }: RecommendedPetsProps) {
    return (<div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Recommended for You</h2>
        <Link to="/pets" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
          View All
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {pets.map((pet: Pet) => (<PetCard key={pet._id} pet={pet}/>))}
      </div>
    </div>);
}
