import { Message } from "./message.model";
import { User, IUser } from "../user/user.model";
import mongoose, { FilterQuery } from "mongoose";
import { createNotification } from "../../common/utils/notification.util";
import { encrypt, decrypt } from "../../common/utils/crypto";
import { io } from "../../../index";

interface IConversation {
  _id: mongoose.Types.ObjectId;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  user: Partial<IUser>;
}

export const getConversationsFromDB = async (userId: string) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const conversations = await Message.aggregate([
    {
      $match: {
        $or: [{ senderId: userObjectId }, { receiverId: userObjectId }],
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ["$senderId", userObjectId] },
            "$receiverId",
            "$senderId",
          ],
        },
        lastMessage: { $first: "$content" },
        lastMessageAt: { $first: "$createdAt" },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$receiverId", userObjectId] },
                  { $eq: ["$isRead", false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    {
      $project: {
        _id: 1,
        lastMessage: 1,
        lastMessageAt: 1,
        unreadCount: 1,
        "user.firstName": 1,
        "user.lastName": 1,
        "user.role": 1,
        "user.email": 1,
      },
    },
    {
      $sort: { lastMessageAt: -1 },
    },
  ]);

  return conversations.map((conv: IConversation) => ({
    ...conv,
    lastMessage: decrypt(conv.lastMessage),
  }));
};

export const getMessagesBetweenUsersFromDB = async (
  currentUserId: string,
  otherUserId: string,
) => {
  const messages = await Message.find({
    $or: [
      { senderId: currentUserId, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: currentUserId },
    ],
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

export const sendMessageToDB = async (
  senderId: string,
  receiverId: string,
  content: string,
  applicationId?: string,
) => {
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

  // Emit real-time message via socket
  if (io) {
    io.to(receiverId).emit("chat_message", decryptedMessage);
    io.to(senderId).emit("chat_message", decryptedMessage);
  }

  // Trigger notification for receiver (use unencrypted content)
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
  return await Message.updateMany(
    { senderId, receiverId, isRead: false },
    { $set: { isRead: true } },
  );
};

export const getChatableUsersFromDB = async (
  currentUserId: string,
  search?: string,
) => {
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

  return await User.find(query)
    .select("firstName lastName email role")
    .limit(10);
};
