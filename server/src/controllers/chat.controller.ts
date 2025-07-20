import { Request, Response } from "express";
import prisma from "../prisma/client";

interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}
export const createOrGetDirectChat = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.body;
    if (!otherUserId) {
      return res.status(400).json({ error: "other user id required" });
    }
    if (otherUserId === userId) {
      return res.status(401).json({ error: "cant create chat with yourself" });
    }

    const existingChat = await prisma.chat.findFirst({
      where: {
        type: "DIRECT",
        AND: [
          {
            members: { some: { userId: userId } },
          },
          {
            members: {
              some: {
                userId: otherUserId,
              },
            },
          },
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                lastSeen: true,
              },
            },
          },
        },
      },
    });
    if (existingChat) {
      return res.status(200).json({ success: true, data: existingChat });
    }

    // verify other user
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
    });
    if (!otherUser) {
      return res.status(404).json({ success: false });
    }

    // create new direct chat

    const newChat = await prisma.chat.create({
      data: {
        type: "DIRECT",
        createdBy: userId,
        members: {
          create: [{ userId }, { userId: otherUserId }],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                lastSeen: true,
              },
            },
          },
        },
      },
    });
    return res.status(201).json({ success: true, data: newChat });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ error: "server error could not create chat" });
  }
};

export const createGroupChat = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { name, description, memberIds } = req.body;

    if (!name || !memberIds || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "name and member ids reqd",
      });
    }

    // verify all members
    const members = await prisma.user.findMany({
      where: {
        id: {
          in: [...memberIds, userId],
        },
      },
    });
    if (members.length !== memberIds.length + 1) {
      return res.status(400).json({
        success: false,
        error: "one or more users not found",
      });
    }

    const groupChat = await prisma.chat.create({
      data: {
        type: "GROUP",
        name,
        description,
        createdBy: userId,
        members: {
          create: [
            { userId, role: "ADMIN" },
            ...memberIds.map((id: string) => ({
              userId: id,
              role: "MEMBER",
            })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                lastSeen: true,
              },
            },
          },
        },
      },
    });
    return res.status(201).json({ success: true, data: groupChat });
  } catch (e) {
    console.error(e);
    return res.status(500).json("server error could not create group chat");
  }
};

export const getUserChats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const chats = await prisma.chat.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                lastSeen: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                statuses: {
                  none: {
                    userId,
                    status: "READ",
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    return res.status(200).json({ success: true, data: chats });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ error: "server error could not fetch chats" });
  }
};

// get messages for a chat

export const getChatMessages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;

    // verify user is member of this chat
    const chatMember = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });
    if (!chatMember) {
      return res
        .status(403)
        .json({ error: "you are not a member of this chat" });
    }
    const message = await prisma.message.findMany({
      where: { chatId },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            lastSeen: true,
          },
        },
        statuses: {
          where: {
            userId,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    // mark messages as read

    return res.status(200).json({ success: true, data: message.reverse() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error " });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;
    const { content, type = "TEXT" } = req.body;
    if (!content && type == "TEXT") {
      return res
        .status(400)
        .json({ success: false, error: "message content reqd" });
    }
    // verify user is member of chat
    const chatMember = await prisma.chatMember.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
    });
    if (!chatMember) {
      return res
        .status(403)
        .json({ success: false, error: "you are not a member of this chat" });
    }
    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: userId,
        content,
        type,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            lastSeen: true,
          },
        },
      },
    });
    await prisma.messageStatus.create({
      data: {
        messageId: message.id,
        userId: userId,
        status: "SENT",
      },
    });
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });
    const otherMembers = await prisma.chatMember.findMany({
      where: {
        chatId,
        userId: { not: userId },
      },
    });

    await prisma.messageStatus.createMany({
      data: otherMembers.map((member) => ({
        messageId: message.id,
        userId: member.userId,
        status: "DELIVERED" as const,
      })),
    });
    return res.status(200).json({ success: true, data: message });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ error: "server error could not send message" });
  }
};
