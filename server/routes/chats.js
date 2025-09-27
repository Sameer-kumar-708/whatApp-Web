const express = require("express");
const {
  accessChat,
  fetchChats,
  createGroupChat,
  sendMessage,
  allMessages,
} = require("../controllers/chatController");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

router.route("/").post(auth, accessChat).get(auth, fetchChats);
router.route("/group").post(auth, createGroupChat);
router.route("/message").post(auth, upload.single("file"), sendMessage);
router.route("/message/:chatId").get(auth, allMessages);

module.exports = router;
