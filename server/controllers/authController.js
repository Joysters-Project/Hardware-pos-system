const bcrypt = require('bcrypt');
const User = require('../models/User'); // Import your User model

const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const saltRounds = 10;

        // --- TYPE THE BCRYPT CODE HERE ---
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Save the user with the HASHED password, NOT the plain one
        const newUser = new User({
            username,
            email,
            password: hashedPassword 
        });

        await newUser.save();
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
