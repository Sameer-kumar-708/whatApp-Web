const express = require("express");
const { searchUsers, updateProfile } = require("../controllers/userController");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

router.get("/search", auth, searchUsers);
router.put("/profile", auth, upload.single("profilePicture"), updateProfile);

module.exports = router;
