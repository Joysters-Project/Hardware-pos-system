const bcrypt = require('bcrypt');
const { Sequelize } = require('sequelize');

// 1. Setup the connection for this controller
const sequelize = new Sequelize(
    process.env.DB_NAME, 
    process.env.DB_USER, 
    process.env.DB_PASSWORD, 
    { host: process.env.DB_HOST, dialect: 'mysql' }
);

// 2. Initialize the models by passing sequelize
const models = require('../models')(sequelize); 
const users = models.users; // Now 'users' is the actual database table

const register = async (req, res) => {
    try {
        //Get data from the request body (match these with your Postman input)
        const { user_name, first_name, last_name, password, role, employee_id } = req.body;
        //Hash the password
        const saltRounds = 10;

        // --- TYPE THE BCRYPT CODE HERE ---
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Save the user with the HASHED password, NOT the plain one
        const newUser = await users.create({
            user_name: user_name,
            first_name: first_name,
            last_name: last_name,
            password: hashedPassword, // Scrambled password
            role: role,
            employee_id: employee_id,
            status: 'Active' // Default value
        });

        res.status(201).json({ message: "User registered successfully", user: newUser.user_id});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
const login = async (req, res) => {
    try {
        const { user_name, password } = req.body;

        // 1. Find the user in MySQL
        const user = await users.findOne({ where: { user_name: user_name } });

        if (!user) {
            return res.status(404).send("User not found");
        }

        // 2. Use bcrypt to compare the typed password with the scrambled one in DB
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            // GOAL: Task B Success Message
            return res.status(200).send("Success"); 
        } else {
            return res.status(401).send("Invalid credentials");
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
};
module.exports = { register,login };
