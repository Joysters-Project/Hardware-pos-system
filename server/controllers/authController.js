const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const db = require('../models');
const users = db.users;
const models = db;
const jwt = require('jsonwebtoken');

// ─── In-Memory OTP & Reset Token Stores ──────────────────────────────────────
const otpStore = new Map();        // email -> { otp, expiresAt, userId, userName }
const resetTokenStore = new Map(); // token -> { email, userId, expiresAt }

// ─── Nodemailer Transporter (Gmail) ──────────────────────────────────────────
const createTransporter = () => {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for 587
        requireTLS: true,
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
        },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 15000,
        socketTimeout: 15000,
        // CRITICAL FIX: Force Node to use IPv4 instead of IPv6. 
        // This solves the 'ESOCKET' 2404:6800... error you had earlier!
        family: 4
    });
};

const sendOtpEmail = async (toEmail, toName, otp) => {
    const transporter = createTransporter();
    const htmlContent = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 10px">
  <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)">
    <tr><td style="background:linear-gradient(135deg,#800000,#a52a2a);padding:32px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:24px">Mathumithan Hardware</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,.85);font-size:14px">Password Reset Request</p>
    </td></tr>
    <tr><td style="padding:36px 40px">
      <p style="color:#333;font-size:16px;margin:0 0 10px">Hello <strong>${toName}</strong>,</p>
      <p style="color:#555;font-size:14px;margin:0 0 28px">Use the OTP below to reset your password. It expires in <strong>10 minutes</strong>.</p>
      <div style="background:#f9f1f1;border:2px dashed #800000;border-radius:10px;padding:24px;text-align:center;margin:0 0 28px">
        <p style="margin:0 0 6px;color:#800000;font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase">Your OTP</p>
        <p style="margin:0;font-size:42px;font-weight:700;letter-spacing:12px;color:#800000">${otp}</p>
      </div>
      <p style="color:#888;font-size:12px;margin:0">If you did not request this, ignore this email.</p>
    </td></tr>
    <tr><td style="background:#f9f1f1;padding:16px 40px;text-align:center">
      <p style="margin:0;color:#999;font-size:11px">Mathumithan Hardware POS System</p>
    </td></tr>
  </table>
</td></tr></table></body></html>`;

    await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || 'Mathumithan Hardware'}" <${process.env.SMTP_EMAIL}>`,
        to: toEmail,
        subject: '🔑 Your Password Reset OTP - Mathumithan Hardware POS',
        html: htmlContent,
    });
};

// ─── Login ────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
    try {
        const { user_name, password, role } = req.body;
        const user = await users.findOne({
            where: { user_name },
            include: [{ model: models.employees, attributes: ['department_id'] }]
        });
        if (!user) return res.status(401).json({ message: 'Invalid Username or Password' });

        if (!role || user.role.toLowerCase() !== role.toLowerCase()) {
            return res.status(403).json({ message: 'Access denied: Wrong role' });
        }
        if (user.status !== 'Active') {
            return res.status(403).json({ message: 'User is inactive' });
        }
        if (user.is_locked) {
            const lockTime = new Date(user.lock_time);
            const diffMinutes = (new Date() - lockTime) / (1000 * 60);
            if (diffMinutes >= 15) {
                await user.update({ is_locked: false, failed_attempts: 0, lock_time: null });
            } else {
                const remaining = Math.ceil(15 - diffMinutes);
                return res.status(403).json({ message: 'Account locked. Try again after ' + remaining + ' minutes' });
            }
        }

        let isMatch = false;
        if (user.password) {
            isMatch = await bcrypt.compare(password, user.password);
        }
        if (!isMatch && user.password && !user.password.startsWith('$2b$') && !user.password.startsWith('$2a$')) {
            if (password === user.password) {
                const hashedPassword = await bcrypt.hash(password, 10);
                await user.update({ password: hashedPassword, failed_attempts: 0, lock_time: null });
                isMatch = true;
            }
        }

        if (isMatch) {
            await user.update({ failed_attempts: 0, lock_time: null });
            const department_id = (user.employee && user.employee.department_id) ? user.employee.department_id : null;
            const secret = process.env.JWT_SECRET || 'MySuperSecretKey123!';
            const token = jwt.sign(
                { user_id: user.user_id, role: user.role, department_id },
                secret,
                { expiresIn: '1h' }
            );
            return res.status(200).json({ message: 'Login successful', token });
        } else {
            let attempts = (user.failed_attempts || 0) + 1;
            let updates = { failed_attempts: attempts };
            if (attempts >= 5) {
                updates.is_locked = true;
                updates.lock_time = new Date();
            }
            await user.update(updates);
            return res.status(401).json({
                message: attempts >= 5
                    ? 'Account locked due to 5 failed login attempts'
                    : 'Invalid Username or Password. You have only ' + (5 - attempts) + ' attempts left'
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Unlock User ──────────────────────────────────────────────────────────────
const unlockUser = async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Only admin can unlock accounts' });
        }
        const { user_id } = req.body;
        const user = await users.findByPk(user_id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        await user.update({ failed_attempts: 0, is_locked: false, lock_time: null });
        res.status(200).json({ message: 'User account unlocked successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
const logout = async (req, res) => {
    const { user_id } = req.body;
    try {
        await models.audit_log.create({ user_id, action: 'LOGOUT', timestamp: new Date() });
        res.status(200).json({ message: 'Logout successful and log recorded' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Logout failed', details: err.message });
    }
};

// ─── STEP 1: Send OTP ─────────────────────────────────────────────────────────
const sendOtpForReset = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const employee = await models.employees.findOne({ where: { email } });
        if (!employee) return res.status(404).json({ message: 'No account found with this email' });

        const user = await users.findOne({ where: { employee_id: employee.employee_id } });
        if (!user) return res.status(404).json({ message: 'No user account linked to this email' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000;

        otpStore.set(email.toLowerCase(), { otp, expiresAt, userId: user.user_id, userName: user.user_name });

        // Always log OTP to server console — visible in terminal regardless of email status
        console.log('\n========================================');
        console.log('  PASSWORD RESET OTP');
        console.log('  Email : ' + email);
        console.log('  OTP   : ' + otp);
        console.log('  Valid : 10 minutes');
        console.log('========================================\n');

        // Attempt email delivery (non-fatal)
        let emailSent = false;
        try {
            await sendOtpEmail(email, user.user_name, otp);
            emailSent = true;
            console.log('Email sent successfully via Brevo to:', email);
        } catch (mailErr) {
            console.error('Email delivery failed (OTP still valid in console above):', mailErr.message);
        }

        res.status(200).json({
            message: emailSent
                ? 'OTP sent to your email. Valid for 10 minutes.'
                : 'OTP generated. Check the server console for your OTP (email delivery failed on this network).',
        });
    } catch (error) {
        console.error('sendOtpForReset error:', error);
        res.status(500).json({ error: 'Failed to generate OTP. Please try again.' });
    }
};

// ─── STEP 2: Verify OTP ───────────────────────────────────────────────────────
const verifyOtpForReset = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

        const record = otpStore.get(email.toLowerCase());
        if (!record) return res.status(400).json({ message: 'No OTP found for this email. Please request a new one.' });
        if (Date.now() > record.expiresAt) {
            otpStore.delete(email.toLowerCase());
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }
        if (record.otp !== otp.toString()) {
            return res.status(400).json({ message: 'Incorrect OTP. Please try again.' });
        }

        otpStore.delete(email.toLowerCase());

        const crypto = require('crypto');
        const resetToken = crypto.randomBytes(32).toString('hex');
        resetTokenStore.set(resetToken, {
            email: email.toLowerCase(),
            userId: record.userId,
            expiresAt: Date.now() + 5 * 60 * 1000,
        });

        res.status(200).json({ message: 'OTP verified successfully.', resetToken });
    } catch (error) {
        console.error('verifyOtpForReset error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ─── STEP 3: Reset Password ───────────────────────────────────────────────────
const resetPassword = async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;
        if (!resetToken || !newPassword) return res.status(400).json({ message: 'Reset token and new password are required' });
        if (newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

        const tokenData = resetTokenStore.get(resetToken);
        if (!tokenData) return res.status(400).json({ message: 'Invalid or expired reset session. Please start over.' });
        if (Date.now() > tokenData.expiresAt) {
            resetTokenStore.delete(resetToken);
            return res.status(400).json({ message: 'Reset session expired. Please start over.' });
        }

        const user = await users.findByPk(tokenData.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await user.update({ password: hashedPassword, failed_attempts: 0, is_locked: false, lock_time: null });
        resetTokenStore.delete(resetToken);

        await models.audit_log.create({
            user_id: user.user_id,
            action: 'PASSWORD_RESET',
            timestamp: models.sequelize.fn('NOW'),
        });

        res.status(200).json({ message: 'Password updated successfully! You can now log in.' });
    } catch (error) {
        console.error('resetPassword error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ─── Simple Registration ──────────────────────────────────────────────────────
const simpleRegister = async (req, res) => {
    try {
        const { firstName, lastName, username, email, password, role, employee_id } = req.body;

        if (!username || !password || !firstName || !lastName || !email || !role || !employee_id) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const employeeModel = models.employees;
        const employee = await employeeModel.findByPk(employee_id);
        if (!employee) return res.status(400).json({ message: 'Employee ID not found' });
        if (employee.email !== email) return res.status(400).json({ message: 'Email does not match the employee record' });
        if (employee.first_name !== firstName || employee.last_name !== lastName) {
            return res.status(400).json({ message: 'Employee details do not match the provided employee ID' });
        }
        if (employee.position !== role) {
            return res.status(400).json({
                message: 'Role mismatch. This Employee is assigned as \'' + employee.position + '\', but you tried to register as a \'' + role + '\'.'
            });
        }

        const existingUser = await users.findOne({ where: { user_name: username } });
        if (existingUser) return res.status(400).json({ message: 'Username already exists' });

        const existingEmployeeUser = await users.findOne({ where: { employee_id } });
        if (existingEmployeeUser) return res.status(400).json({ message: 'This employee already has a user account' });

        if (['Manager', 'Admin'].includes(role)) {
            const roleTaken = await users.findOne({ where: { role } });
            if (roleTaken) return res.status(400).json({ message: role + ' role is already assigned' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await users.create({
            user_name: username,
            first_name: firstName,
            last_name: lastName,
            password: hashedPassword,
            role,
            employee_id,
            status: 'Active',
            failed_attempts: 0,
            is_locked: false,
        });

        res.status(201).json({
            message: 'Account created successfully',
            user_id: newUser.user_id,
            username: newUser.user_name,
        });
    } catch (error) {
        console.error(error);
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).json({ message: 'Employee ID not found (foreign key constraint)' });
        }
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Username or employee already has an account' });
        }
        if (error.errors) {
            return res.status(400).json({ message: error.errors.map(e => e.message).join(', ') });
        }
        res.status(500).json({ error: error.message });
    }
};

module.exports = { login, unlockUser, logout, sendOtpForReset, verifyOtpForReset, resetPassword, simpleRegister };
