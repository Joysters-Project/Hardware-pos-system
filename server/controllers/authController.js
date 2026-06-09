const bcrypt = require('bcrypt');

// Just require the db object directly from your team's index.js
const db = require('../models'); 
const users = db.users; 
const models = db; // This keeps your existing logic working

const jwt=require('jsonwebtoken');

const login = async (req, res) => {
    try {
        const { user_name, password, role } = req.body;
        // 1. Find the user in MySQL
        const user = await users.findOne({ where: { user_name: user_name },include: [{model: models.employees, attributes: ['department_id']}]});
        if (!user) {
            return res.status(401).json({ message: "Invalid Username or Password" });
        }
        
        // if the role selected is wrong
        if (!role || user.role.toLowerCase() !== role.toLowerCase()) {
        return res.status(403).json({ message: "Access denied: Wrong role" });
        }
        // if the user is exist but not active
        if (user.status !== 'Active') {
        return res.status(403).json({ message: "User is inactive" });
        }

        if (user.is_locked) {
            const lockTime = new Date(user.lock_time);
            const now = new Date();
            const diffMinutes = (now - lockTime) / (1000 * 60);

            // Auto unlock after 15 minutes
            if (diffMinutes >= 15) {
               await user.update({
                is_locked: false,
                failed_attempts: 0,
                lock_time: null
                });

            } else {
                const remaining = Math.ceil(15 - diffMinutes);
                return res.status(403).json({ message: `Account locked. Try again after ${remaining} minutes` });
            }
        }
        // 2. Use bcrypt to compare the typed password with the stored hash
        let isMatch = false;
        if (user.password) {
          isMatch = await bcrypt.compare(password, user.password);
        }

        // Legacy fallback: if password was stored as plain text, compare directly and then re-hash
        if (!isMatch && user.password && !user.password.startsWith('$2b$') && !user.password.startsWith('$2a$')) {
          if (password === user.password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await user.update({ password: hashedPassword, failed_attempts: 0, lock_time: null });
            isMatch = true;
          }
        }

        if (isMatch) {
            // Reset failed attempts on successful login
            await user.update({ failed_attempts: 0, lock_time: null });
            const department_id = (user.employee && user.employee.department_id) ? user.employee.department_id : null;
            const secret = process.env.JWT_SECRET || "MySuperSecretKey123!";
            const token = jwt.sign({user_id: user.user_id, role: user.role, department_id: department_id },
                secret,{ expiresIn: "1h" }
            );
            console.log("DEBUG - JWT Secret:", process.env.JWT_SECRET);
            return res.status(200).json({message: "Login successful",token: token});
        } 
        else {
            // Increment failed attempts
            let attempts = (user.failed_attempts || 0) + 1;
            let updates = { failed_attempts: attempts };

            // Lock account if attempts >= 5
            if (attempts >= 5) {
                updates.is_locked = true;
                updates.lock_time = new Date(); // save lock time
            }
            await user.update(updates);
            return res.status(401).json({ 
                message: attempts >= 5 
                    ? "Account locked due to 5 failed login attempts" 
                    : `Invalid Username or Password. You have only ${5 - attempts} attempts left`
            });
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
const unlockUser = async (req, res) => {
    try {
        // Check if the logged-in user is Admin
        if (req.user.role !== "Admin") {    //JWT
            return res.status(403).json({ message: "Only admin can unlock accounts" });
        }
        const { user_id } = req.body;

        const user = await users.findByPk(user_id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        await user.update({failed_attempts: 0, is_locked: false, lock_time: null });

        res.status(200).json({ message: "User account unlocked successfully" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
const logout = async (req, res) => {
    const { user_id } = req.body; // or req.user.id if using middleware

    try {
        // 1. Write the Audit Log
        await models.audit_log.create({user_id: user_id, action:'LOGOUT', timestamp: new Date()});  // Sequalize handle this automatically
        localStorage.removeItem("token"); 
        localStorage.removeItem("role"); 
        localStorage.removeItem("userName");
        res.status(200).json({ message: "Logout successful and log recorded" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Logout failed", details: err.message });
    }
};
const resetPassword=async(req,res)=>{
    try{
        const {email, newPassword }=req.body;

        // 1. Find employee by email
        const employee = await models.employees.findOne({ where: { email } });
        if (!employee) return res.status(404).json({ message: "Employee not found" });

        // 2. Find user linked to this employee
        const user = await users.findOne({ where: { employee_id: employee.employee_id } });
        if (!user) return res.status(404).json({ message: "User account not found for this email" });

        // Hash the new password before saving
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await user.update({ password: hashedPassword });

        // Add to audit log
        await models.audit_log.create({
            user_id: user.user_id, 
            action: 'PASSWORD_RESET', 
            timestamp: models.sequelize.fn('NOW')
        });

        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Simple registration for basic user signups (no employee validation)
const simpleRegister = async (req, res) => {
    try {
        const { firstName, lastName, username, email, password, role, employee_id } = req.body;

        // Validate required fields
        if (!username || !password || !firstName || !lastName || !email || !role || !employee_id) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Validate employee exists
        const employees = models.employees;
        const employee = await employees.findByPk(employee_id);
        
        if (!employee) {
            return res.status(400).json({ message: "Employee ID not found" });
        }

        // Check if email matches employee record
        if (employee.email !== email) {
            return res.status(400).json({ message: "Email does not match the employee record" });
        }

        // Check if first name and last name match employee record
        if (employee.first_name !== firstName || employee.last_name !== lastName) {
            return res.status(400).json({ message: "Employee details do not match the provided employee ID" });
        }

        // Check if role matches employee's position
        if (employee.position !== role) {
            return res.status(400).json({ 
                message: `Role mismatch. This Employee is assigned as '${employee.position}', but you tried to register as a '${role}'.` 
            });
        }

        // Check if username already exists
        const existingUser = await users.findOne({ where: { user_name: username } });
        if (existingUser) {
            return res.status(400).json({ message: "Username already exists" });
        }

        // Check if employee already has a user account
        const existingEmployeeUser = await users.findOne({ where: { employee_id } });
        if (existingEmployeeUser) {
            return res.status(400).json({ message: "This employee already has a user account" });
        }

        // Check if role is unique (for Manager, Admin roles)
        if (["Manager", "Admin"].includes(role)) {
            const roleTaken = await users.findOne({ where: { role } });
            if (roleTaken) {
                return res.status(400).json({ message: `${role} role is already assigned` });
            }
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user with all fields
        const newUser = await users.create({
            user_name: username,
            first_name: firstName,
            last_name: lastName,
            password: hashedPassword,
            role: role,
            employee_id: employee_id,
            status: "Active",
            failed_attempts: 0,
            is_locked: false
        });

        res.status(201).json({ 
            message: "Account created successfully", 
            user_id: newUser.user_id,
            username: newUser.user_name
        });
    } catch (error) {
        console.log(error);
        // Handle DB-level validation errors properly
        if (error.name === "SequelizeForeignKeyConstraintError") {
            return res.status(400).json({ message: "Employee ID not found (foreign key constraint)" });
        }
        if (error.name === "SequelizeUniqueConstraintError") {
            return res.status(400).json({ message: "Username or employee already has an account" });
        }
        if (error.errors) {
            return res.status(400).json({ message: error.errors.map(e => e.message).join(", ") });
        }
        res.status(500).json({ error: error.message });
    }
};

module.exports = { login, unlockUser, logout, resetPassword, simpleRegister };
