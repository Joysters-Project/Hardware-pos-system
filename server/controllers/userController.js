const { users } = require('../models');

// CREATE User
exports.createUser = async (req, res) => {
  try {
    const user = await users.create(req.body);

    res.status(201).json({
      message: "User created successfully",
      data: user
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// READ All Users
exports.getAllUsers = async (req, res) => {
  try {
    const userList = await users.findAll();

    res.status(200).json(userList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// READ User by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await users.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE User
exports.updateUser = async (req, res) => {
  try {
    const user = await users.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.update(req.body);

    res.status(200).json({
      message: "User updated successfully",
      data: user
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE User
exports.deleteUser = async (req, res) => {
  try {
    const user = await users.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.destroy();

    res.status(200).json({
      message: "User deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};