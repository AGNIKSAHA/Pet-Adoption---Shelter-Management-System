import mongoose, { Schema, Document } from "mongoose";
export type PetStatus = "intake" | "medical_hold" | "available" | "meet" | "adopted" | "returned" | "fostered" | "transferred" | "deceased";
export interface IPet extends Document {
    name: string;
    species: "dog" | "cat" | "bird" | "rabbit" | "other";
    breed: string;
    age: number;
    gender: "male" | "female";
    size: "small" | "medium" | "large";
    color: string;
    description: string;
    temperament: string[];
    compatibility: {
        goodWithKids: boolean;
        goodWithDogs: boolean;
        goodWithCats: boolean;
    };
    health: {
        vaccinated: boolean;
        spayedNeutered: boolean;
        microchipped: boolean;
        specialNeeds: boolean;
        specialNeedsDescription?: string;
    };
    status: PetStatus;
    shelterId: mongoose.Types.ObjectId;
    intakeDate: Date;
    adoptionDate?: Date;
    photos: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    canTransitionTo(newStatus: PetStatus): boolean;
}
const petSchema = new Schema<IPet>({
    name: {
        type: String,
        required: [true, "Pet name is required"],
        trim: true,
    },
    species: {
        type: String,
        enum: ["dog", "cat", "bird", "rabbit", "other"],
        required: [true, "Species is required"],
    },
    breed: {
        type: String,
        required: [true, "Breed is required"],
        trim: true,
    },
    age: {
        type: Number,
        required: [true, "Age is required"],
        min: [0, "Age cannot be negative"],
    },
    gender: {
        type: String,
        enum: ["male", "female"],
        required: [true, "Gender is required"],
    },
    size: {
        type: String,
        enum: ["small", "medium", "large"],
        required: [true, "Size is required"],
    },
    color: {
        type: String,
        required: [true, "Color is required"],
    },
    description: {
        type: String,
        required: [true, "Description is required"],
    },
    temperament: {
        type: [String],
        default: [],
    },
    compatibility: {
        goodWithKids: { type: Boolean, default: false },
        goodWithDogs: { type: Boolean, default: false },
        goodWithCats: { type: Boolean, default: false },
    },
    health: {
        vaccinated: { type: Boolean, default: false },
        spayedNeutered: { type: Boolean, default: false },
        microchipped: { type: Boolean, default: false },
        specialNeeds: { type: Boolean, default: false },
        specialNeedsDescription: { type: String },
    },
    status: {
        type: String,
        enum: [
            "intake",
            "medical_hold",
            "available",
            "meet",
            "adopted",
            "returned",
            "fostered",
            "transferred",
            "deceased",
        ],
        default: "intake",
    },
    shelterId: {
        type: Schema.Types.ObjectId,
        ref: "Shelter",
        required: [true, "Shelter ID is required"],
    },
    intakeDate: {
        type: Date,
        default: Date.now,
    },
    adoptionDate: Date,
    photos: {
        type: [String],
        default: [],
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});
petSchema.index({ shelterId: 1 });
petSchema.index({ status: 1 });
petSchema.index({ species: 1 });
petSchema.index({ breed: 1 });
petSchema.index({ age: 1 });
petSchema.index({ size: 1 });
petSchema.index({ isActive: 1 });
const validTransitions: Record<PetStatus, PetStatus[]> = {
    intake: [
        "medical_hold",
        "available",
        "meet",
        "fostered",
        "adopted",
        "transferred",
        "deceased",
    ],
    medical_hold: [
        "intake",
        "available",
        "meet",
        "fostered",
        "adopted",
        "transferred",
        "deceased",
    ],
    available: [
        "intake",
        "medical_hold",
        "meet",
        "fostered",
        "adopted",
        "transferred",
        "deceased",
    ],
    meet: ["available", "fostered", "adopted", "transferred", "deceased"],
    adopted: [
        "intake",
        "medical_hold",
        "available",
        "meet",
        "fostered",
        "returned",
        "transferred",
        "deceased",
    ],
    returned: [
        "intake",
        "medical_hold",
        "available",
        "meet",
        "fostered",
        "adopted",
        "transferred",
        "deceased",
    ],
    fostered: [
        "intake",
        "medical_hold",
        "available",
        "meet",
        "adopted",
        "transferred",
        "deceased",
    ],
    transferred: [
        "intake",
        "medical_hold",
        "available",
        "meet",
        "fostered",
        "adopted",
        "deceased",
    ],
    deceased: [],
};
petSchema.methods.canTransitionTo = function (this: IPet, newStatus: PetStatus): boolean {
    const allowed = validTransitions[this.status];
    return allowed ? allowed.includes(newStatus) : false;
};
export const Pet = mongoose.model<IPet>("Pet", petSchema);
