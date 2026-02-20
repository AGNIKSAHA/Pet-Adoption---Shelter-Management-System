import { MedicalRecord, IMedicalRecord } from "./medical.model";
import { Pet } from "../pet/pet.model";
import { AppError } from "../../common/middlewares/error.middleware";
import { AuditLog } from "../audit/audit.model";
interface CreateMedicalRecordInput {
    recordType: "vaccination" | "correction" | "sterilization" | "condition" | "checkup" | "treatment";
    title: string;
    description: string;
    date: Date;
    veterinarian?: string;
    documents?: string[];
    nextDueDate?: Date;
}
const hasPdfDocument = (documents?: string[]) => {
    if (!documents || documents.length === 0)
        return false;
    return documents.some((doc) => /\.pdf($|\?)/i.test(doc.trim()));
};
const ensureStaffAccessToPet = async (userId: string, petId: string) => {
    const pet = await Pet.findById(petId);
    if (!pet) {
        throw new AppError(404, "Pet not found");
    }
    const { StaffApplication } = await import("../shelter/staff-application.model");
    const application = await StaffApplication.findOne({
        userId,
        shelterId: pet.shelterId,
        status: "approved",
    });
    if (!application) {
        throw new AppError(403, "You must be approved staff for this shelter to manage medical records");
    }
    return pet;
};
export const createMedicalRecordInDB = async (petId: string, data: CreateMedicalRecordInput, userId: string, userRole: string, ip?: string, userAgent?: string) => {
    const pet = await Pet.findById(petId);
    if (!pet) {
        throw new AppError(404, "Pet not found");
    }
    if (userRole === "shelter_staff") {
        await ensureStaffAccessToPet(userId, petId);
    }
    if (data.recordType === "correction") {
        throw new AppError(400, "Use the correction endpoint to create vaccination corrections");
    }
    if (data.recordType === "vaccination" && !hasPdfDocument(data.documents)) {
        throw new AppError(400, "Vaccination report PDF is required to submit vaccination records");
    }
    const record = await MedicalRecord.create({
        ...data,
        petId,
        createdBy: userId,
    });
    await AuditLog.create({
        userId,
        action: "create_medical_record",
        resource: "medical_record",
        resourceId: record._id,
        changes: { recordType: data.recordType, petId },
        ipAddress: ip,
        userAgent,
    });
    return record;
};
export const createVaccinationCorrectionInDB = async (petId: string, originalRecordId: string, data: Omit<CreateMedicalRecordInput, "recordType">, userId: string, userRole: string, ip?: string, userAgent?: string) => {
    const pet = await Pet.findById(petId);
    if (!pet) {
        throw new AppError(404, "Pet not found");
    }
    if (userRole === "shelter_staff") {
        await ensureStaffAccessToPet(userId, petId);
    }
    const original = await MedicalRecord.findById(originalRecordId);
    if (!original) {
        throw new AppError(404, "Original medical record not found");
    }
    if (original.petId.toString() !== petId) {
        throw new AppError(400, "Original record does not belong to this pet");
    }
    if (original.recordType !== "vaccination") {
        throw new AppError(400, "Only vaccination records can be corrected");
    }
    if (!hasPdfDocument(data.documents)) {
        throw new AppError(400, "Vaccination correction requires a PDF report copy");
    }
    const correction = await MedicalRecord.create({
        ...data,
        petId,
        recordType: "correction",
        correctsRecordId: original._id,
        createdBy: userId,
    });
    await AuditLog.create({
        userId,
        action: "create_vaccination_correction",
        resource: "medical_record",
        resourceId: correction._id,
        changes: {
            petId,
            originalRecordId,
            recordType: "correction",
        },
        ipAddress: ip,
        userAgent,
    });
    return correction;
};
export const updateMedicalRecordInDB = async (id: string, updates: Partial<IMedicalRecord>, userId: string, userRole: string, ip?: string, userAgent?: string) => {
    const record = await MedicalRecord.findById(id);
    if (!record) {
        throw new AppError(404, "Medical record not found");
    }
    if (record.recordType === "vaccination") {
        throw new AppError(400, "Vaccination records are immutable. Add a correction record instead.");
    }
    if (record.recordType === "correction") {
        throw new AppError(400, "Correction records are immutable");
    }
    if (userRole === "shelter_staff") {
        await ensureStaffAccessToPet(userId, record.petId.toString());
    }
    delete (updates as Partial<IMedicalRecord>).recordType;
    delete (updates as Partial<IMedicalRecord>).correctsRecordId;
    delete (updates as Partial<IMedicalRecord>).petId;
    Object.assign(record, updates);
    await record.save();
    await AuditLog.create({
        userId,
        action: "update_medical_record",
        resource: "medical_record",
        resourceId: record._id,
        changes: updates,
        ipAddress: ip,
        userAgent,
    });
    return record;
};
export const deleteMedicalRecordInDB = async (id: string, userId: string, userRole: string, ip?: string, userAgent?: string) => {
    const record = await MedicalRecord.findById(id);
    if (!record) {
        throw new AppError(404, "Medical record not found");
    }
    if (record.recordType === "vaccination" || record.recordType === "correction") {
        throw new AppError(400, "Vaccination and correction records are immutable and cannot be deleted");
    }
    if (userRole === "shelter_staff") {
        await ensureStaffAccessToPet(userId, record.petId.toString());
    }
    await record.deleteOne();
    await AuditLog.create({
        userId,
        action: "delete_medical_record",
        resource: "medical_record",
        resourceId: record._id,
        ipAddress: ip,
        userAgent,
    });
    return { id };
};
export const getMedicalTimelineFromDB = async (petId: string, userId: string, userRole: string): Promise<{
    petId: string;
    effectiveTimeline: Array<Record<string, unknown>>;
    auditTrail: Array<Record<string, unknown>>;
}> => {
    const pet = await Pet.findById(petId);
    if (!pet) {
        throw new AppError(404, "Pet not found");
    }
    if (userRole === "shelter_staff") {
        await ensureStaffAccessToPet(userId, petId);
    }
    type MedicalRecordLean = {
        _id: {
            toString: () => string;
        };
        petId: {
            toString: () => string;
        };
        recordType: "vaccination" | "correction" | "sterilization" | "condition" | "checkup" | "treatment";
        title: string;
        description: string;
        date: Date;
        veterinarian?: string;
        documents: string[];
        nextDueDate?: Date;
        correctsRecordId?: {
            toString: () => string;
        };
        createdBy: {
            toString: () => string;
        };
        createdAt: Date;
        updatedAt: Date;
    };
    const rawRecords = (await MedicalRecord.find({ petId })
        .sort({ date: 1, createdAt: 1 })
        .lean()) as unknown as MedicalRecordLean[];
    const correctionsByOriginal = new Map<string, (typeof rawRecords)[number]>();
    rawRecords
        .filter((r) => r.recordType === "correction" && r.correctsRecordId)
        .forEach((correction) => {
        const key = correction.correctsRecordId!.toString();
        const prev = correctionsByOriginal.get(key);
        if (!prev || new Date(correction.createdAt) > new Date(prev.createdAt)) {
            correctionsByOriginal.set(key, correction);
        }
    });
    const effectiveTimeline = rawRecords
        .filter((r) => r.recordType !== "correction")
        .map((record) => {
        if (record.recordType !== "vaccination") {
            return {
                ...record,
                effectiveFromRecordId: record._id,
                appliedCorrectionId: null,
                isCorrected: false,
            };
        }
        const appliedCorrection = correctionsByOriginal.get(record._id.toString());
        if (!appliedCorrection) {
            return {
                ...record,
                effectiveFromRecordId: record._id,
                appliedCorrectionId: null,
                isCorrected: false,
            };
        }
        return {
            ...record,
            title: appliedCorrection.title,
            description: appliedCorrection.description,
            date: appliedCorrection.date,
            veterinarian: appliedCorrection.veterinarian,
            documents: appliedCorrection.documents,
            nextDueDate: appliedCorrection.nextDueDate,
            effectiveFromRecordId: record._id,
            appliedCorrectionId: appliedCorrection._id,
            isCorrected: true,
        };
    });
    return {
        petId,
        effectiveTimeline,
        auditTrail: rawRecords,
    };
};
