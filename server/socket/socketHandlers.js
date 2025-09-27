const Chat = require("../models/Chat");
const Message = require("../models/Message");
const User = require("../models/User");

const configureSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Join user to their personal room
    socket.on("setup", (userData) => {
      socket.join(userData._id);
      socket.userId = userData._id;

      // Update user online status
      User.findByIdAndUpdate(userData._id, {
        isOnline: true,
        lastSeen: new Date(),
      }).exec();

      socket.emit("connected");
    });

    // Join chat room
    socket.on("join chat", (chatId) => {
      socket.join(chatId);
      console.log(`User ${socket.userId} joined chat: ${chatId}`);
    });

    // Leave chat room
    socket.on("leave chat", (chatId) => {
      socket.leave(chatId);
      console.log(`User ${socket.userId} left chat: ${chatId}`);
    });

    // Handle new message
    socket.on("new message", async (messageData) => {
      try {
        const message = await Message.create(messageData);

        const populatedMessage = await Message.findById(message._id)
          .populate("sender", "name profilePicture")
          .populate("chat");

        await Chat.findByIdAndUpdate(messageData.chat, {
          lastMessage: message._id,
        });

        // Emit to all participants in the chat
        io.to(messageData.chat).emit("message received", populatedMessage);
      } catch (error) {
        console.error("Error sending message:", error);
      }
    });

    // Handle typing events
    socket.on("typing", (chatId) => {
      socket.to(chatId).emit("typing", chatId);
    });

    socket.on("stop typing", (chatId) => {
      socket.to(chatId).emit("stop typing", chatId);
    });

    // Handle message read receipt
    socket.on("message read", async ({ messageId, chatId }) => {
      try {
        await Message.findByIdAndUpdate(messageId, {
          $addToSet: { readBy: socket.userId },
          isRead: true,
        });

        socket.to(chatId).emit("message read update", {
          messageId,
          readBy: socket.userId,
        });
      } catch (error) {
        console.error("Error updating read status:", error);
      }
    });

    // Handle user disconnect
    socket.on("disconnect", async () => {
      console.log("User disconnected:", socket.id);

      if (socket.userId) {
        // Update user offline status
        await User.findByIdAndUpdate(socket.userId, {
          isOnline: false,
          lastSeen: new Date(),
        }).exec();

        // Notify other users
        socket.broadcast.emit("user status changed", {
          userId: socket.userId,
          isOnline: false,
          lastSeen: new Date(),
        });
      }
    });
  });
};

module.exports = configureSocket;
