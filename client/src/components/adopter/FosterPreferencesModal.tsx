import { XCircle, Settings, CheckCircle } from "lucide-react";

interface FosterPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefSpecies: string[];
  setPrefSpecies: (species: string[] | ((prev: string[]) => string[])) => void;
  prefCapacity: number;
  setPrefCapacity: (capacity: number) => void;
  onSubmit: (data: { preferredSpecies: string[]; capacity: number }) => void;
  isPending: boolean;
}

export default function FosterPreferencesModal({
  isOpen,
  onClose,
  prefSpecies,
  setPrefSpecies,
  prefCapacity,
  setPrefCapacity,
  onSubmit,
  isPending,
}: FosterPreferencesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary-600" />
            Foster Preferences
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-full transition-colors"
            disabled={isPending}
          >
            <XCircle className="w-6 h-6 text-gray-400" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Types of pets you'd like to foster
            </label>
            <div className="grid grid-cols-2 gap-3">
              {["dog", "cat", "bird", "rabbit", "other"].map((species) => (
                <button
                  key={species}
                  onClick={() => {
                    setPrefSpecies((prev) =>
                      prev.includes(species)
                        ? prev.filter((s) => s !== species)
                        : [...prev, species],
                    );
                  }}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-semibold capitalize transition-all ${
                    prefSpecies.includes(species)
                      ? "bg-primary-50 border-primary-500 text-primary-700 ring-1 ring-primary-500"
                      : "bg-white border-gray-200 text-gray-600 hover:border-primary-200"
                  }`}
                >
                  {species}
                  {prefSpecies.includes(species) && (
                    <CheckCircle className="w-4 h-4" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Maximum Pet Capacity
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="10"
                value={prefCapacity}
                onChange={(e) => setPrefCapacity(parseInt(e.target.value))}
                className="flex-1 accent-primary-600"
              />
              <span className="w-12 h-12 flex items-center justify-center bg-primary-50 text-primary-700 rounded-xl font-bold text-lg border border-primary-100">
                {prefCapacity}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              How many animals can you comfortably foster at once?
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all active:scale-[0.98]"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              onClick={() =>
                onSubmit({
                  preferredSpecies: prefSpecies,
                  capacity: prefCapacity,
                })
              }
              disabled={isPending}
              className="flex-1 py-3 px-4 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all disabled:opacity-50 shadow-lg shadow-primary-200 active:scale-[0.98]"
            >
              {isPending ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
