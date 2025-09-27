const Chat = require("../models/Chat");
const Message = require("../models/Message");
const User = require("../models/User");

// Create or fetch one-to-one chat
exports.accessChat = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user._id;

    if (!userId) {
      return res
        .status(400)
        .json({ message: "UserId param not sent with request" });
    }

    let isChat = await Chat.find({
      isGroupChat: false,
      participants: { $all: [currentUserId, userId] },
    })
      .populate("participants", "-password")
      .populate("lastMessage");

    isChat = await User.populate(isChat, {
      path: "lastMessage.sender",
      select: "name email profilePicture",
    });

    if (isChat.length > 0) {
      res.json(isChat[0]);
    } else {
      const chatData = {
        isGroupChat: false,
        participants: [currentUserId, userId],
      };

      const createdChat = await Chat.create(chatData);
      const fullChat = await Chat.findOne({ _id: createdChat._id }).populate(
        "participants",
        "-password"
      );

      res.status(200).json(fullChat);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Fetch all chats for a user
exports.fetchChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: { $elemMatch: { $eq: req.user._id } },
    })
      .populate("participants", "-password")
      .populate("groupAdmin", "-password")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    const populatedChats = await User.populate(chats, {
      path: "lastMessage.sender",
      select: "name profilePicture email",
    });

    res.json(populatedChats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create group chat
exports.createGroupChat = async (req, res) => {
  try {
    const { name, participants } = req.body;

    if (!name || !participants) {
      return res.status(400).json({ message: "Please fill all the fields" });
    }

    if (participants.length < 2) {
      return res
        .status(400)
        .json({
          message: "More than 2 participants are required to form a group chat",
        });
    }

    participants.push(req.user._id);

    const groupChat = await Chat.create({
      name,
      participants,
      isGroupChat: true,
      groupAdmin: req.user._id,
    });

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate("participants", "-password")
      .populate("groupAdmin", "-password");

    res.status(200).json(fullGroupChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Send message
exports.sendMessage = async (req, res) => {
  try {
    const { content, chatId, messageType = "text" } = req.body;
    let fileUrl = "";

    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
    }

    if (!content && !fileUrl) {
      return res
        .status(400)
        .json({ message: "Message content or file is required" });
    }

    const newMessage = {
      sender: req.user._id,
      content: content,
      chat: chatId,
      messageType: messageType,
      fileUrl: fileUrl,
    };

    let message = await Message.create(newMessage);

    message = await message.populate("sender", "name profilePicture");
    message = await message.populate("chat");
    message = await User.populate(message, {
      path: "chat.participants",
      select: "name profilePicture email",
    });

    await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id });

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Fetch all messages for a chat
exports.allMessages = async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name profilePicture email")
      .populate("chat")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
