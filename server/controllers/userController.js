const { users } = require('../models');
const bcrypt = require('bcrypt');
const { logActivity } = require('../services/auditService');
const getIp = (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;

exports.createUser = async (req, res) => {
  const ip = getIp(req);
  try {
    const { password, ...otherData } = req.body;
    const hashedPassword = password ? await bcrypt.hash(password, 10) : password;
    const user = await users.create({ ...otherData, password: hashedPassword });
    await logActivity(req.user?.user_id, req.user?.role, 'USER_ACCOUNT_CREATED',
      `User account created: "${user.user_name}" (ID: ${user.user_id}), Role: ${user.role}`, ip);
    res.status(201).json({ message: 'User created successfully', data: user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const userList = await users.findAll({ attributes: { exclude: ['password', 'reset_token', 'reset_token_expiry'] } });
    res.status(200).json(userList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await users.findByPk(req.params.id, { attributes: { exclude: ['password', 'reset_token', 'reset_token_expiry'] } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  const ip = getIp(req);
  try {
    const user = await users.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const updateData = { ...req.body };
    if (updateData.password) updateData.password = await bcrypt.hash(updateData.password, 10);

    const changes = [];
    if (updateData.role   && user.role   !== updateData.role)   changes.push(`Role changed from ${user.role} to ${updateData.role}`);
    if (updateData.status && user.status !== updateData.status) changes.push(`Status changed from ${user.status} to ${updateData.status}`);
    if (updateData.password) changes.push('Password updated');

    await user.update(updateData);
    await logActivity(req.user?.user_id, req.user?.role, 'USER_ACCOUNT_UPDATED',
      `User account updated: "${user.user_name}" (ID: ${user.user_id}).${changes.length ? ' ' + changes.join('. ') : ''}`, ip);
    res.status(200).json({ message: 'User updated successfully', data: user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  const ip = getIp(req);
  try {
    const user = await users.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const name = user.user_name;
    await user.destroy();
    await logActivity(req.user?.user_id, req.user?.role, 'USER_ACCOUNT_DELETED',
      `User account deleted: "${name}" (ID: ${req.params.id})`, ip);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
