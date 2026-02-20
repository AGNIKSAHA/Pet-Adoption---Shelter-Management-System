import { XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Foster, Pet, User } from "../../types";
import { useEffect } from "react";
import toast from "react-hot-toast";
const FEDERATION_ACTIVE_PLACEMENT_LIMIT = 3;
const assignSchema = z.object({
    petId: z.string().min(1, "Pet selection is required"),
    fosterId: z.string().min(1, "Foster parent selection is required"),
    expectedDuration: z.number().min(1, "Duration must be at least 1 day"),
});
type AssignFormData = z.infer<typeof assignSchema>;
interface AssignPetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: AssignFormData) => void;
    isPending: boolean;
    fosters: Foster[];
    availablePets: Pet[];
}
export default function AssignPetModal({ isOpen, onClose, onSubmit, isPending, fosters, availablePets, }: AssignPetModalProps) {
    const { watch, register, handleSubmit, reset, formState: { errors }, } = useForm<AssignFormData>({
        resolver: zodResolver(assignSchema),
    });
    const selectedFosterId = watch("fosterId");
    const selectedFoster = fosters.find((f: Foster) => f._id === selectedFosterId);
    const selectedFosterGlobalCount = Number((selectedFoster?.userId as User)?.activePlacementCount || 0) || 0;
    const selectedFosterLimitReached = selectedFosterGlobalCount >= FEDERATION_ACTIVE_PLACEMENT_LIMIT;
    useEffect(() => {
        if (!isOpen) {
            reset();
        }
    }, [isOpen, reset]);
    const handleFormSubmit = (data: AssignFormData) => {
        if (selectedFosterLimitReached) {
            toast.error(`Federation hard limit reached: ${selectedFosterGlobalCount}/${FEDERATION_ACTIVE_PLACEMENT_LIMIT} active placements.`);
            return;
        }
        onSubmit(data);
    };
    if (!isOpen)
        return null;
    return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            Assign Pet to Foster
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <XCircle className="w-6 h-6 text-gray-400"/>
          </button>
        </div>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4 text-sm">
          <div>
            <label className="block text-gray-700 font-bold mb-2">
              Select Foster Parent
            </label>
            <select {...register("fosterId")} className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none ${errors.fosterId ? "border-red-500" : "border-gray-300"}`}>
              <option value="">Choose a foster parent...</option>
              {fosters
            .filter((f: Foster) => {
            const globalCount = Number((f.userId as User)?.activePlacementCount || 0) || 0;
            return (f.status === "approved" &&
                f.currentAnimals < f.capacity &&
                globalCount < FEDERATION_ACTIVE_PLACEMENT_LIMIT);
        })
            .map((f: Foster) => {
            const user = f.userId as User;
            const globalCount = Number(user?.activePlacementCount || 0) || 0;
            return (<option key={f._id} value={f._id}>
                      {user?.firstName} {user?.lastName} ({f.currentAnimals}/
                      {f.capacity}, global {globalCount}/
                      {FEDERATION_ACTIVE_PLACEMENT_LIMIT})
                    </option>);
        })}
            </select>
            {errors.fosterId && (<p className="text-xs text-red-500 mt-1">
                {errors.fosterId.message}
              </p>)}
            {fosters.some((f) => {
            const globalCount = Number((f.userId as User)?.activePlacementCount || 0) || 0;
            return globalCount >= FEDERATION_ACTIVE_PLACEMENT_LIMIT;
        }) && (<p className="text-xs text-amber-700 mt-1">
                Foster parents at federation hard limit (3 active placements)
                are excluded from assignment options.
              </p>)}
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">
              Select Pet
            </label>
            <select {...register("petId")} className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none ${errors.petId ? "border-red-500" : "border-gray-300"}`}>
              <option value="">Choose a pet...</option>
              {availablePets
            ?.filter((pet: Pet) => {
            if (!selectedFoster)
                return true;
            if (!selectedFoster.preferredSpecies ||
                selectedFoster.preferredSpecies.length === 0)
                return true;
            return selectedFoster.preferredSpecies.some((pref: string) => {
                const p = pref.toLowerCase();
                const s = pet.species.toLowerCase();
                return p.includes(s) || s.includes(p);
            });
        })
            .map((pet: Pet) => (<option key={pet._id} value={pet._id}>
                    {pet.name} ({pet.breed} - {pet.species})
                  </option>))}
            </select>
            {selectedFoster &&
            (availablePets || []).filter((pet: Pet) => selectedFoster.preferredSpecies?.some((pref: string) => {
                const p = pref.toLowerCase();
                const s = pet.species.toLowerCase();
                return p.includes(s) || s.includes(p);
            })).length === 0 && (<p className="text-xs text-amber-600 mt-1 font-medium italic">
                  No available pets currently match this foster parent's
                  preferences (
                  {selectedFoster.preferredSpecies?.join(", ") || "Any"}).
                </p>)}
            {errors.petId && (<p className="text-xs text-red-500 mt-1">
                {errors.petId.message}
              </p>)}
          </div>
          <div>
            <label className="block text-gray-700 font-bold mb-2">
              Expected Duration (Days)
            </label>
            <input type="number" {...register("expectedDuration", { valueAsNumber: true })} className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none ${errors.expectedDuration ? "border-red-500" : "border-gray-300"}`} placeholder="e.g. 14"/>
            {errors.expectedDuration && (<p className="text-xs text-red-500 mt-1">
                {errors.expectedDuration.message}
              </p>)}
          </div>
          <button type="submit" disabled={isPending || selectedFosterLimitReached} className="bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all disabled:opacity-50 shadow-lg shadow-primary-200 active:scale-[0.98] w-full py-3">
            {isPending
            ? "Assigning..."
            : selectedFosterLimitReached
                ? "Federation Limit Reached (3/3)"
                : "Confirm Assignment"}
          </button>
        </form>
      </div>
    </div>);
}
