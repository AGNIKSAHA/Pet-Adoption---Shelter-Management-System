import mongoose, { FilterQuery } from "mongoose";
import { io } from "../../../index";
import { AppError } from "../../common/middlewares/error.middleware";
import { createNotification } from "../../common/utils/notification.util";
import { decrypt, encrypt } from "../../common/utils/crypto";
import { User, IUser } from "../user/user.model";
import { StaffApplication } from "../shelter/staff-application.model";
import { MessageConversation, IMessageConversation, } from "./message-conversation.model";
import { Message } from "./message.model";
interface RequestUser {
    id: string;
    role: "admin" | "shelter_staff" | "adopter";
    roles?: string[];
    memberships?: {
        shelterId: string;
        role: "admin" | "shelter_staff" | "adopter";
    }[];
}
interface PopulatedConversation {
    _id: mongoose.Types.ObjectId;
    adopterId: {
        _id: mongoose.Types.ObjectId;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
    };
    shelterId: {
        _id: mongoose.Types.ObjectId;
        name: string;
        email: string;
    };
    assignedStaffId?: {
        _id: mongoose.Types.ObjectId;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
    };
    lastMessage?: string;
    lastMessageAt?: Date;
    handoffHistory: Array<{
        fromStaffId?: mongoose.Types.ObjectId;
        toStaffId: mongoose.Types.ObjectId;
        reason?: string;
        handoffAt: Date;
    }>;
}
const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);
const getStaffShelterIds = async (userId: string) => {
    const user = await User.findById(userId).select("memberships shelterId").lean();
    if (!user)
        return [];
    const shelterIds = new Set<string>();
    if (user.shelterId) {
        shelterIds.add(user.shelterId.toString());
    }
    (user.memberships || []).forEach((membership) => {
        if (["admin", "shelter_staff"].includes(membership.role)) {
            shelterIds.add(membership.shelterId.toString());
        }
    });
    const approvedApps = await StaffApplication.find({
        userId,
        status: "approved",
    })
        .select("shelterId")
        .lean();
    approvedApps.forEach((app) => shelterIds.add(app.shelterId.toString()));
    return Array.from(shelterIds);
};
const hasShelterAccess = async (userId: string, shelterId: string) => {
    const user = await User.findById(userId).select("role memberships");
    if (!user)
        return false;
    if (user.role === "admin")
        return true;
    const inMembership = (user.memberships || []).some((m) => m.shelterId.toString() === shelterId && ["admin", "shelter_staff"].includes(m.role));
    if (inMembership)
        return true;
    const approvedApp = await StaffApplication.findOne({
        userId,
        shelterId,
        status: "approved",
    }).lean();
    return !!approvedApp;
};
const resolveShelterForStaff = async (userId: string, preferredShelterId?: string) => {
    if (preferredShelterId) {
        const canUse = await hasShelterAccess(userId, preferredShelterId);
        if (!canUse) {
            throw new AppError(403, "You do not have access to the selected shelter");
        }
        return preferredShelterId;
    }
    const user = await User.findById(userId).select("shelterId memberships").lean();
    if (!user)
        throw new AppError(404, "User not found");
    if (user.shelterId) {
        return user.shelterId.toString();
    }
    const membershipShelter = (user.memberships || []).find((m) => ["admin", "shelter_staff"].includes(m.role));
    if (membershipShelter?.shelterId) {
        return membershipShelter.shelterId.toString();
    }
    const approved = await StaffApplication.findOne({
        userId,
        status: "approved",
    })
        .sort({ updatedAt: -1 })
        .select("shelterId")
        .lean();
    if (approved?.shelterId) {
        return approved.shelterId.toString();
    }
    throw new AppError(400, "Unable to resolve shelter context for staff user");
};
const resolveShelterForStaffUser = async (staffUserId: string) => {
    const user = await User.findById(staffUserId).select("memberships shelterId").lean();
    if (!user)
        throw new AppError(404, "Staff user not found");
    if (user.shelterId)
        return user.shelterId.toString();
    const m = (user.memberships || []).find((item) => ["admin", "shelter_staff"].includes(item.role));
    if (m?.shelterId)
        return m.shelterId.toString();
    const app = await StaffApplication.findOne({ userId: staffUserId, status: "approved" })
        .sort({ updatedAt: -1 })
        .select("shelterId")
        .lean();
    if (app?.shelterId)
        return app.shelterId.toString();
    throw new AppError(400, "Staff user is not assigned to any shelter");
};
const getShelterStaffCandidates = async (shelterId: string) => {
    const usersFromMembership = await User.find({
        isActive: true,
        memberships: {
            $elemMatch: {
                shelterId: toObjectId(shelterId),
                role: { $in: ["admin", "shelter_staff"] },
            },
        },
    })
        .select("firstName lastName email role")
        .lean();
    const approvedApps = await StaffApplication.find({
        shelterId,
        status: "approved",
    })
        .select("userId")
        .lean();
    const appUserIds = approvedApps.map((entry) => entry.userId.toString());
    const usersFromApplications = appUserIds.length > 0
        ? await User.find({
            _id: { $in: appUserIds.map((id) => toObjectId(id)) },
            isActive: true,
        })
            .select("firstName lastName email role")
            .lean()
        : [];
    const dedup = new Map<string, {
        _id: mongoose.Types.ObjectId;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
    }>();
    [...usersFromMembership, ...usersFromApplications].forEach((u) => {
        dedup.set(u._id.toString(), {
            _id: u._id,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            role: u.role,
        });
    });
    return Array.from(dedup.values()).sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
};
const getConversationById = async (conversationId: string) => {
    const conversation = await MessageConversation.findById(conversationId)
        .populate("adopterId", "firstName lastName email role")
        .populate("shelterId", "name email")
        .populate("assignedStaffId", "firstName lastName email role")
        .lean<PopulatedConversation>();
    if (!conversation) {
        throw new AppError(404, "Conversation not found");
    }
    return conversation;
};
const canAccessConversation = async (user: RequestUser, conversation: PopulatedConversation, options?: {
    requireAssignedStaff?: boolean;
}) => {
    const userId = user.id;
    if (user.role === "adopter") {
        return conversation.adopterId._id.toString() === userId;
    }
    const shelterId = conversation.shelterId._id.toString();
    const hasAccess = await hasShelterAccess(userId, shelterId);
    if (!hasAccess)
        return false;
    if (options?.requireAssignedStaff) {
        return conversation.assignedStaffId?._id?.toString() === userId;
    }
    return true;
};
const formatConversation = async (conversation: PopulatedConversation, currentUser: RequestUser) => {
    const unreadCount = await Message.countDocuments({
        conversationId: conversation._id,
        receiverId: currentUser.id,
        isRead: false,
    });
    const isAdopterView = currentUser.role === "adopter";
    const counterpart = isAdopterView
        ? {
            _id: conversation.shelterId._id,
            firstName: conversation.shelterId.name,
            lastName: "",
            role: "shelter_staff",
            email: conversation.shelterId.email,
        }
        : {
            _id: conversation.adopterId._id,
            firstName: conversation.adopterId.firstName,
            lastName: conversation.adopterId.lastName,
            role: conversation.adopterId.role,
            email: conversation.adopterId.email,
        };
    return {
        _id: conversation._id,
        adopter: conversation.adopterId,
        shelter: conversation.shelterId,
        assignedStaff: conversation.assignedStaffId,
        counterpart,
        lastMessage: conversation.lastMessage ? decrypt(conversation.lastMessage) : "",
        lastMessageAt: conversation.lastMessageAt,
        unreadCount,
        handoffHistory: conversation.handoffHistory,
    };
};
export const getConversationsFromDB = async (currentUser: RequestUser) => {
    let query: FilterQuery<IMessageConversation> = { isActive: true };
    if (currentUser.role === "adopter") {
        query = { ...query, adopterId: currentUser.id };
    }
    else {
        const shelterIds = await getStaffShelterIds(currentUser.id);
        if (shelterIds.length === 0) {
            return [];
        }
        query = {
            ...query,
            shelterId: { $in: shelterIds.map((id) => toObjectId(id)) },
        };
    }
    const conversations = await MessageConversation.find(query)
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .populate("adopterId", "firstName lastName email role")
        .populate("shelterId", "name email")
        .populate("assignedStaffId", "firstName lastName email role")
        .lean<PopulatedConversation[]>();
    const formatted = await Promise.all(conversations.map((conversation) => formatConversation(conversation, currentUser)));
    return formatted;
};
export const startConversationInDB = async (currentUser: RequestUser, receiverId?: string, shelterId?: string) => {
    const canActAsAdopter = currentUser.role === "adopter" || (currentUser.roles || []).includes("adopter");
    if (currentUser.role === "admin" && !canActAsAdopter) {
        throw new AppError(403, "Admins cannot start messaging conversations");
    }
    let adopterId: string;
    let staffId: string;
    let effectiveShelterId: string;
    if (canActAsAdopter) {
        if (shelterId && !receiverId) {
            adopterId = currentUser.id;
            effectiveShelterId = shelterId;
            const shelterStaff = await getShelterStaffCandidates(effectiveShelterId);
            if (shelterStaff.length === 0) {
                throw new AppError(404, "No staff found for this shelter");
            }
            staffId = shelterStaff[0]._id.toString();
        }
        else {
            if (!receiverId) {
                throw new AppError(400, "Receiver ID is required");
            }
            const receiver = await User.findById(receiverId)
                .select("_id role memberships shelterId")
                .lean();
            if (!receiver || !receiver._id) {
                throw new AppError(404, "Receiver not found");
            }
            if (receiver.role !== "shelter_staff") {
                throw new AppError(400, "Adopter can only message shelter staff");
            }
            adopterId = currentUser.id;
            staffId = receiverId;
            effectiveShelterId = shelterId || (await resolveShelterForStaffUser(receiverId));
        }
    }
    else {
        if (!receiverId) {
            throw new AppError(400, "Receiver ID is required");
        }
        const receiver = await User.findById(receiverId)
            .select("_id role memberships shelterId")
            .lean();
        if (!receiver || !receiver._id) {
            throw new AppError(404, "Receiver not found");
        }
        if (receiver.role !== "adopter") {
            throw new AppError(400, "Staff can only message adopters");
        }
        adopterId = receiverId;
        staffId = currentUser.id;
        effectiveShelterId = await resolveShelterForStaff(currentUser.id, shelterId);
    }
    const existingConversation = await MessageConversation.findOne({
        shelterId: effectiveShelterId,
        adopterId,
        isActive: true,
    });
    const conversation = existingConversation ||
        (await MessageConversation.create({
            shelterId: effectiveShelterId,
            adopterId,
            assignedStaffId: staffId,
            handoffHistory: [],
            isActive: true,
        }));
    if (!existingConversation && io) {
        io.to(adopterId).emit("conversation_handoff", {
            conversationId: conversation._id.toString(),
            assignedStaffId: staffId,
            reason: "Conversation assigned",
        });
    }
    const populated = await getConversationById(conversation._id.toString());
    return formatConversation(populated, currentUser);
};
export const getMessagesForConversationFromDB = async (currentUser: RequestUser, conversationId: string) => {
    const conversation = await getConversationById(conversationId);
    const canAccess = await canAccessConversation(currentUser, conversation);
    if (!canAccess) {
        throw new AppError(403, "You do not have access to this conversation");
    }
    const messages = await Message.find({ conversationId })
        .sort({ createdAt: 1 })
        .populate("senderId", "firstName lastName")
        .populate("receiverId", "firstName lastName")
        .populate("senderStaffId", "firstName lastName email");
    return messages.map((msg) => {
        const plain = msg.toObject();
        return {
            ...plain,
            content: decrypt(plain.content),
        };
    });
};
export const sendMessageToConversationInDB = async (currentUser: RequestUser, conversationId: string, content: string) => {
    const conversation = await getConversationById(conversationId);
    const canAccess = await canAccessConversation(currentUser, conversation);
    if (!canAccess) {
        throw new AppError(403, "You do not have access to this conversation");
    }
    let receiverId: string;
    if (currentUser.role === "adopter") {
        const shelterStaff = await getShelterStaffCandidates(conversation.shelterId._id.toString());
        if (shelterStaff.length === 0) {
            throw new AppError(409, "No staff members are available for this shelter");
        }
        const assignedStaffId = conversation.assignedStaffId?._id?.toString();
        receiverId = assignedStaffId || shelterStaff[0]._id.toString();
    }
    else {
        receiverId = conversation.adopterId._id.toString();
    }
    const encryptedContent = encrypt(content);
    const message = await Message.create({
        senderId: currentUser.id,
        receiverId,
        content: encryptedContent,
        conversationId,
        shelterId: conversation.shelterId._id,
        adopterId: conversation.adopterId._id,
        senderStaffId: currentUser.role !== "adopter" ? currentUser.id : undefined,
    });
    await MessageConversation.findByIdAndUpdate(conversationId, {
        $set: {
            lastMessage: encryptedContent,
            lastMessageAt: new Date(),
        },
    });
    const populatedMessage = await Message.findById(message._id)
        .populate("senderId", "firstName lastName")
        .populate("receiverId", "firstName lastName")
        .populate("senderStaffId", "firstName lastName email");
    const plainMessage = populatedMessage!.toObject();
    const decryptedMessage = {
        ...plainMessage,
        content: decrypt(plainMessage.content),
    };
    if (io) {
        io.to(currentUser.id).emit("chat_message", decryptedMessage);
        io.to(receiverId).emit("chat_message", decryptedMessage);
        if (currentUser.role === "adopter") {
            const shelterStaff = await getShelterStaffCandidates(conversation.shelterId._id.toString());
            shelterStaff.forEach((staff) => {
                io.to(staff._id.toString()).emit("chat_message", decryptedMessage);
            });
        }
    }
    if (currentUser.role === "adopter") {
        const shelterStaff = await getShelterStaffCandidates(conversation.shelterId._id.toString());
        await Promise.all(shelterStaff.map((staff) => createNotification({
            userId: staff._id.toString(),
            type: "message",
            title: "New Message",
            message: `${(populatedMessage?.senderId as unknown as IUser).firstName} sent a shelter message: ${content.substring(0, 50)}${content.length > 50 ? "..." : ""}`,
            link: "/messages",
        })));
    }
    else {
        await createNotification({
            userId: receiverId,
            type: "message",
            title: "New Message",
            message: `${(populatedMessage?.senderId as unknown as IUser).firstName} sent you a message: ${content.substring(0, 50)}${content.length > 50 ? "..." : ""}`,
            link: "/messages",
        });
    }
    return decryptedMessage;
};
export const markConversationAsReadInDB = async (currentUser: RequestUser, conversationId: string) => {
    const conversation = await getConversationById(conversationId);
    const canAccess = await canAccessConversation(currentUser, conversation);
    if (!canAccess) {
        throw new AppError(403, "You do not have access to this conversation");
    }
    return Message.updateMany({
        conversationId,
        receiverId: currentUser.id,
        isRead: false,
    }, { $set: { isRead: true } });
};
export const handoffConversationInDB = async (currentUser: RequestUser, conversationId: string, toStaffId: string, reason?: string) => {
    if (currentUser.role !== "shelter_staff") {
        throw new AppError(403, "Only shelter staff can hand off conversations");
    }
    const conversation = await getConversationById(conversationId);
    const hasAccess = await canAccessConversation(currentUser, conversation);
    if (!hasAccess) {
        throw new AppError(403, "You do not have access to this conversation");
    }
    const currentAssignedId = conversation.assignedStaffId?._id?.toString();
    if (currentAssignedId && currentAssignedId !== currentUser.id) {
        throw new AppError(403, "Only currently assigned staff can transfer this conversation");
    }
    if (toStaffId === currentAssignedId) {
        throw new AppError(400, "Conversation is already assigned to this staff member");
    }
    const canTargetAccess = await hasShelterAccess(toStaffId, conversation.shelterId._id.toString());
    if (!canTargetAccess) {
        throw new AppError(400, "Selected staff does not have access to this shelter");
    }
    const updated = await MessageConversation.findByIdAndUpdate(conversationId, {
        $set: { assignedStaffId: toStaffId },
        $push: {
            handoffHistory: {
                fromStaffId: currentAssignedId,
                toStaffId,
                reason,
                handoffAt: new Date(),
            },
        },
    }, { new: true })
        .populate("adopterId", "firstName lastName email role")
        .populate("shelterId", "name email")
        .populate("assignedStaffId", "firstName lastName email role")
        .lean<PopulatedConversation>();
    if (!updated) {
        throw new AppError(404, "Conversation not found");
    }
    if (io) {
        const payload = {
            conversationId,
            assignedStaffId: toStaffId,
            reason: reason || "Shift handoff",
        };
        io.to(conversation.adopterId._id.toString()).emit("conversation_handoff", payload);
        io.to(currentUser.id).emit("conversation_handoff", payload);
        io.to(toStaffId).emit("conversation_handoff", payload);
    }
    return formatConversation(updated, currentUser);
};
export const getConversationStaffOptionsFromDB = async (currentUser: RequestUser, conversationId: string) => {
    const conversation = await getConversationById(conversationId);
    const canAccess = await canAccessConversation(currentUser, conversation);
    if (!canAccess) {
        throw new AppError(403, "You do not have access to this conversation");
    }
    return getShelterStaffCandidates(conversation.shelterId._id.toString());
};
export const getMessagesBetweenUsersFromDB = async (currentUserId: string, otherUserId: string) => {
    const messages = await Message.find({
        $or: [
            { senderId: currentUserId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: currentUserId },
        ],
        conversationId: { $exists: false },
    })
        .sort({ createdAt: 1 })
        .populate("senderId", "firstName lastName")
        .populate("receiverId", "firstName lastName");
    return messages.map((msg) => {
        const plainMsg = msg.toObject();
        return {
            ...plainMsg,
            content: decrypt(plainMsg.content),
        };
    });
};
export const sendMessageToDB = async (senderId: string, receiverId: string, content: string, applicationId?: string) => {
    const encryptedContent = encrypt(content);
    const message = await Message.create({
        senderId,
        receiverId,
        content: encryptedContent,
        applicationId,
    });
    const populatedMessage = await Message.findById(message._id)
        .populate("senderId", "firstName lastName")
        .populate("receiverId", "firstName lastName");
    const plainMessage = populatedMessage!.toObject();
    const decryptedMessage = {
        ...plainMessage,
        content: decrypt(plainMessage.content),
    };
    if (io) {
        io.to(receiverId).emit("chat_message", decryptedMessage);
        io.to(senderId).emit("chat_message", decryptedMessage);
    }
    await createNotification({
        userId: receiverId,
        type: "message",
        title: "New Message",
        message: `${(populatedMessage?.senderId as unknown as IUser).firstName} sent you a message: ${content.substring(0, 50)}${content.length > 50 ? "..." : ""}`,
        link: "/messages",
    });
    return decryptedMessage;
};
export const markAsReadInDB = async (receiverId: string, senderId: string) => {
    return Message.updateMany({ senderId, receiverId, isRead: false, conversationId: { $exists: false } }, { $set: { isRead: true } });
};
export const getChatableUsersFromDB = async (currentUserId: string, search?: string) => {
    const query: FilterQuery<IUser> = {
        _id: { $ne: currentUserId },
        isActive: true,
    };
    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
        ];
    }
    return User.find(query).select("firstName lastName email role").limit(10);
};
