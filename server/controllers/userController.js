const User = require("../models/User");

// Search users
exports.searchUsers = async (req, res) => {
  try {
    const keyword = req.query.search
      ? {
          $or: [
            { name: { $regex: req.query.search, $options: "i" } },
            { email: { $regex: req.query.search, $options: "i" } },
          ],
        }
      : {};

    const users = await User.find(keyword).find({ _id: { $ne: req.user._id } });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, status } = req.body;
    let profilePicture = "";

    if (req.file) {
      profilePicture = `/uploads/${req.file.filename}`;
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (status) updateData.status = status;
    if (profilePicture) updateData.profilePicture = profilePicture;

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
    }).select("-password");

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
