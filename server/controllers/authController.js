const bcryptjs = require('bcryptjs');
const db = require('../models');

const register = async (req, res) => {
  try {
    const { user_name, first_name, last_name, password, role, employee_id } = req.body;
    const hashedPassword = await bcryptjs.hash(password, 10);

    const newUser = await db.users.create({
      user_name,
      first_name,
      last_name,
      password: hashedPassword,
      role,
      employee_id,
      status: 'Active',
    });

    res.status(201).json({ message: 'User registered successfully', user: newUser.user_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { user_name, password } = req.body;
    const user = await db.users.findOne({ where: { user_name } });

    if (!user) return res.status(404).send('User not found');

    const isMatch = await bcryptjs.compare(password, user.password);

    return isMatch
      ? res.status(200).send('Success')
      : res.status(401).send('Invalid credentials');
  } catch (error) {
    res.status(500).send(error.message);
  }
};

module.exports = { register, login };