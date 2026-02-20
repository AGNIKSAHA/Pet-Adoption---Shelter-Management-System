import { Request, Response } from "express";
import { catchAsync } from "../../common/middlewares/catch.middleware";
import { AppError } from "../../common/middlewares/error.middleware";
import * as messageService from "./message.service";
export const getConversations = catchAsync(async (req: Request, res: Response) => {
    const conversations = await messageService.getConversationsFromDB({
        id: req.user!.id,
        role: req.user!.role,
        roles: req.user!.roles,
        memberships: req.user!.memberships,
    });
    res.json({
        success: true,
        data: conversations,
    });
});
export const startConversation = catchAsync(async (req: Request, res: Response) => {
    const { receiverId, shelterId } = req.body;
    if (!receiverId && !shelterId) {
        throw new AppError(400, "Either receiverId or shelterId is required");
    }
    const conversation = await messageService.startConversationInDB({
        id: req.user!.id,
        role: req.user!.role,
        roles: req.user!.roles,
        memberships: req.user!.memberships,
    }, receiverId, shelterId);
    res.status(201).json({
        success: true,
        data: conversation,
    });
});
export const getConversationMessages = catchAsync(async (req: Request, res: Response) => {
    const conversationId = req.params.conversationId;
    const messages = await messageService.getMessagesForConversationFromDB({
        id: req.user!.id,
        role: req.user!.role,
        roles: req.user!.roles,
        memberships: req.user!.memberships,
    }, conversationId);
    res.json({
        success: true,
        data: messages,
    });
});
export const sendConversationMessage = catchAsync(async (req: Request, res: Response) => {
    const conversationId = req.params.conversationId;
    const { content } = req.body;
    if (!content) {
        throw new AppError(400, "Message content is required");
    }
    const message = await messageService.sendMessageToConversationInDB({
        id: req.user!.id,
        role: req.user!.role,
        roles: req.user!.roles,
        memberships: req.user!.memberships,
    }, conversationId, content);
    res.status(201).json({
        success: true,
        data: message,
    });
});
export const markConversationAsRead = catchAsync(async (req: Request, res: Response) => {
    const conversationId = req.params.conversationId;
    await messageService.markConversationAsReadInDB({
        id: req.user!.id,
        role: req.user!.role,
        roles: req.user!.roles,
        memberships: req.user!.memberships,
    }, conversationId);
    res.json({
        success: true,
        message: "Conversation marked as read",
    });
});
export const handoffConversation = catchAsync(async (req: Request, res: Response) => {
    const conversationId = req.params.conversationId;
    const { toStaffId, reason } = req.body;
    if (!toStaffId) {
        throw new AppError(400, "Target staff ID is required");
    }
    const conversation = await messageService.handoffConversationInDB({
        id: req.user!.id,
        role: req.user!.role,
        roles: req.user!.roles,
        memberships: req.user!.memberships,
    }, conversationId, toStaffId, reason);
    res.json({
        success: true,
        data: conversation,
    });
});
export const getConversationStaffOptions = catchAsync(async (req: Request, res: Response) => {
    const conversationId = req.params.conversationId;
    const staff = await messageService.getConversationStaffOptionsFromDB({
        id: req.user!.id,
        role: req.user!.role,
        roles: req.user!.roles,
        memberships: req.user!.memberships,
    }, conversationId);
    res.json({
        success: true,
        data: staff,
    });
});
export const getMessagesBetweenUsers = catchAsync(async (req: Request, res: Response) => {
    const currentUserId = req.user!.id;
    const otherUserId = req.params.userId;
    const messages = await messageService.getMessagesBetweenUsersFromDB(currentUserId, otherUserId);
    res.json({
        success: true,
        data: messages,
    });
});
export const sendMessage = catchAsync(async (req: Request, res: Response) => {
    const senderId = req.user!.id;
    const { receiverId, content, applicationId } = req.body;
    if (!receiverId || !content) {
        throw new AppError(400, "Receiver ID and content are required");
    }
    const message = await messageService.sendMessageToDB(senderId, receiverId, content, applicationId);
    res.status(201).json({
        success: true,
        data: message,
    });
});
export const markAsRead = catchAsync(async (req: Request, res: Response) => {
    const receiverId = req.user!.id;
    const senderId = req.params.userId;
    await messageService.markAsReadInDB(receiverId, senderId);
    res.json({
        success: true,
        message: "Messages marked as read",
    });
});
export const getChatableUsers = catchAsync(async (req: Request, res: Response) => {
    const { search } = req.query;
    const currentUserId = req.user!.id;
    const users = await messageService.getChatableUsersFromDB(currentUserId, search as string);
    res.json({
        success: true,
        data: users,
    });
});
