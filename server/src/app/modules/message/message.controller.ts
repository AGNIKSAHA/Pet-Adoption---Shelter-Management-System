import { Request, Response } from "express";
import { catchAsync } from "../../common/middlewares/catch.middleware";
import { AppError } from "../../common/middlewares/error.middleware";
import * as messageService from "./message.service";

export const getConversations = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const conversations = await messageService.getConversationsFromDB(userId);

    res.json({
      success: true,
      data: conversations,
    });
  },
);

export const getMessagesBetweenUsers = catchAsync(
  async (req: Request, res: Response) => {
    const currentUserId = req.user!.id;
    const otherUserId = req.params.userId;
    const messages = await messageService.getMessagesBetweenUsersFromDB(
      currentUserId,
      otherUserId,
    );

    res.json({
      success: true,
      data: messages,
    });
  },
);

export const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const senderId = req.user!.id;
  const { receiverId, content, applicationId } = req.body;

  if (!receiverId || !content) {
    throw new AppError(400, "Receiver ID and content are required");
  }

  const message = await messageService.sendMessageToDB(
    senderId,
    receiverId,
    content,
    applicationId,
  );

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

export const getChatableUsers = catchAsync(
  async (req: Request, res: Response) => {
    const { search } = req.query;
    const currentUserId = req.user!.id;

    const users = await messageService.getChatableUsersFromDB(
      currentUserId,
      search as string,
    );

    res.json({
      success: true,
      data: users,
    });
  },
);
