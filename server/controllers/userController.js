const db = require('../models');
const bcrypt = require('bcrypt');
const { logActivity } = require('../services/auditService');
const path = require('path');
const fs = require('fs');
const getIp = (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;

exports.getOwnProfile = async (req, res) => {
  try {
    const user = await db.users.findByPk(req.user.user_id, {
      attributes: { exclude: ['password', 'reset_token', 'reset_token_expiry'] },
      include: [{
        model: db.employees,
        include: [{ model: db.departments, attributes: ['department_name'] }]
      }]
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    const emp = user.employee;
    res.status(200).json({
      user_id: user.user_id,
      username: user.user_name,
      role: user.role,
      status: user.status,
      first_name: user.first_name,
      last_name: user.last_name,
      employee_id: emp?.employee_id || null,
      department: emp?.department?.department_name || null,
      position: emp?.position || null,
      email: emp?.email || null,
      phone_no: emp?.phone_no || null,
      address: emp?.address || null,
      join_date: emp?.join_date || null,
      profile_photo: emp?.profile_photo || null,
    });
  } catch (error) {
    console.error('[getOwnProfile] Error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
};

exports.updateOwnProfile = async (req, res) => {
  const ip = getIp(req);
  try {
    const { first_name, last_name, email, phone_no, address } = req.body;
    const user = await db.users.findByPk(req.user.user_id, {
      include: [{
        model: db.employees,
        include: [{ model: db.departments, attributes: ['department_name'] }]
      }]
    });

    if (!user) return res.status(404).json({ message: 'User not found' });
    const employee = user.employee;
    if (!employee) return res.status(404).json({ message: 'Linked employee record not found' });

    if (email && email !== employee.email) {
      const existingEmail = await db.employees.findOne({ where: { email } });
      if (existingEmail) return res.status(400).json({ message: 'Email is already in use' });
    }

    const userUpdates = {};
    if (first_name) userUpdates.first_name = first_name;
    if (last_name) userUpdates.last_name = last_name;

    const employeeUpdates = {};
    if (email) employeeUpdates.email = email;
    if (phone_no !== undefined) employeeUpdates.phone_no = phone_no;
    if (address !== undefined) employeeUpdates.address = address;

    if (req.file) {
      const profilePath = `uploads/employee_photos/${req.file.filename}`;
      employeeUpdates.profile_photo = profilePath;
      if (employee.profile_photo) {
        const oldPath = path.join(__dirname, '..', employee.profile_photo);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    if (Object.keys(userUpdates).length) await user.update(userUpdates);
    if (Object.keys(employeeUpdates).length) await employee.update(employeeUpdates);

    await logActivity(req.user.user_id, req.user.role, 'USER_PROFILE_UPDATED',
      `User profile updated for ${user.user_name} (ID: ${user.user_id})`, ip);

    const updatedUser = await db.users.findByPk(req.user.user_id, {
      attributes: { exclude: ['password', 'reset_token', 'reset_token_expiry'] },
      include: [{
        model: db.employees,
        include: [{ model: db.departments, attributes: ['department_name'] }]
      }]
    });

    const empUpdated = updatedUser.employee;
    res.status(200).json({
      user_id: updatedUser.user_id,
      username: updatedUser.user_name,
      role: updatedUser.role,
      status: updatedUser.status,
      first_name: updatedUser.first_name,
      last_name: updatedUser.last_name,
      employee_id: empUpdated?.employee_id || null,
      department: empUpdated?.department?.department_name || null,
      position: empUpdated?.position || null,
      email: empUpdated?.email || null,
      phone_no: empUpdated?.phone_no || null,
      address: empUpdated?.address || null,
      join_date: empUpdated?.join_date || null,
      profile_photo: empUpdated?.profile_photo || null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  const ip = getIp(req);
  try {
    const { current_password, new_password, confirm_password } = req.body;
    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({ message: 'All password fields are required' });
    }
    if (new_password !== confirm_password) {
      return res.status(400).json({ message: 'New passwords do not match' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await db.users.findByPk(req.user.user_id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    await user.update({ password: await bcrypt.hash(new_password, 10) });
    await logActivity(req.user.user_id, req.user.role, 'USER_PASSWORD_CHANGED',
      `Password changed for user ${user.user_name} (ID: ${user.user_id})`, ip);

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteProfilePhoto = async (req, res) => {
  const ip = getIp(req);
  try {
    const user = await db.users.findByPk(req.user.user_id, { include: [{ model: db.employees }] });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const employee = user.employee;
    if (!employee?.profile_photo) return res.status(400).json({ message: 'No profile photo to remove' });

    const oldPath = path.join(__dirname, '..', employee.profile_photo);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    await employee.update({ profile_photo: null });

    await logActivity(req.user.user_id, req.user.role, 'USER_PROFILE_PHOTO_DELETED',
      `Profile photo removed for user ${user.user_name}`, ip);

    res.status(200).json({ message: 'Profile photo removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createUser = async (req, res) => {
  const ip = getIp(req);
  try {
    const { password, ...otherData } = req.body;
    const hashedPassword = password ? await bcrypt.hash(password, 10) : password;
    const user = await db.users.create({ ...otherData, password: hashedPassword });
    await logActivity(req.user?.user_id, req.user?.role, 'USER_ACCOUNT_CREATED',
      `User account created: "${user.user_name}" (ID: ${user.user_id}), Role: ${user.role}`, ip);
    res.status(201).json({ message: 'User created successfully', data: user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const userList = await db.users.findAll({ attributes: { exclude: ['password', 'reset_token', 'reset_token_expiry'] } });
    res.status(200).json(userList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await db.users.findByPk(req.params.id, { attributes: { exclude: ['password', 'reset_token', 'reset_token_expiry'] } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  const ip = getIp(req);
  try {
    const user = await db.users.findByPk(req.params.id);
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
    const user = await db.users.findByPk(req.params.id);
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
