import { Edit2, Save, X } from "lucide-react";

interface ProfileHeaderProps {
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  isLoading: boolean;
  handleCancel: () => void;
  onSubmit: () => void;
}

export default function ProfileHeader({
  isEditing,
  setIsEditing,
  isLoading,
  handleCancel,
  onSubmit,
}: ProfileHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
      {!isEditing ? (
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          Edit Profile
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}
