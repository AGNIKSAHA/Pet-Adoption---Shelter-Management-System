export type PetStatus =
  | "intake"
  | "medical_hold"
  | "available"
  | "meet"
  | "adopted"
  | "returned"
  | "fostered"
  | "transferred"
  | "deceased";

export interface User {
  _id: string;
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: "admin" | "shelter_staff" | "adopter";
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  shelterId?: string | Shelter;
  shelterApprovalStatus?: "pending" | "approved" | "rejected";
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  staffApplications?: {
    _id: string;
    shelterId: string | Shelter;
    status: "pending" | "approved" | "rejected";
    requestDate: string;
  }[];
}

export interface Pet {
  _id: string;
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
  shelterId: string | Shelter;
  intakeDate: string;
  adoptionDate?: string;
  photos: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  contactPerson?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface Shelter {
  _id: string;
  name: string;
  description?: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  capacity: number;
  currentOccupancy: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Foster {
  _id: string;
  userId: User | string;
  shelterId: string | Shelter;
  status: "pending" | "approved" | "rejected" | "inactive";
  capacity: number;
  currentAnimals: number;
  experience: string;
  homeType: "house" | "apartment" | "other";
  hasYard: boolean;
  preferredSpecies: string[];
  availability: string;
  isActive: boolean;
  approvedAt?: string;
  approvedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FosterAssignment {
  _id: string;
  fosterId: Foster | string;
  petId: Pet | string;
  shelterId: string | Shelter;
  startDate: string;
  endDate?: string;
  expectedDuration?: number;
  status: "active" | "completed" | "terminated";
  notes?: string;
}

export interface AdoptionApplication {
  _id: string;
  petId: Pet;
  userId: string;
  adopterId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  shelterId: string | Shelter;
  status:
    | "submitted"
    | "reviewing"
    | "interview"
    | "approved"
    | "rejected"
    | "withdrawn";
  experience: string;
  questionnaire: {
    housingType: string;
    hasOwnedPetsBefore: boolean;
    currentPets: string;
    whyAdopt: string;
    workSchedule: string;
  };
  references: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  }[];
  reviewedBy?: string;
  reviewedAt?: string;
  decisionNotes?: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  _id: string;
  userId: string;
  type: "application_update" | "message" | "pet_update" | "system";
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface StaffApplication {
  _id: string;
  userId: User;
  shelterId: Shelter;
  status: "pending" | "approved" | "rejected";
  requestDate: string;
}
