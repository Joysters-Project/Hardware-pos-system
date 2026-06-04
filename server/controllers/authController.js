const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const db = require('../models');
const users = db.users;
const models = db;
const jwt = require('jsonwebtoken');

// ─── Nodemailer Transporter (Gmail) ──────────────────────────────────────────
const createTransporter = () => {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
        },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 15000,
        socketTimeout: 15000,
        family: 4, // Force IPv4 — prevents ESOCKET errors on some networks
    });
};

const sendOtpEmail = async (toEmail, toName, otp) => {
    const transporter = createTransporter();
    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0">
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
        html,
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
            console.warn(`[Login] Role mismatch — DB: "${user.role}", sent: "${role}"`);
            return res.status(403).json({ message: `Access denied: You are registered as "${user.role}". Please select the correct role.` });
        }
        if (user.status !== 'Active') {
            return res.status(403).json({ message: 'User is inactive' });
        }
        if (user.is_locked) {
            const diffMinutes = (new Date() - new Date(user.lock_time)) / (1000 * 60);
            if (diffMinutes >= 15) {
                await user.update({ is_locked: false, failed_attempts: 0, lock_time: null });
            } else {
                const remaining = Math.ceil(15 - diffMinutes);
                return res.status(403).json({ message: `Account locked. Try again after ${remaining} minutes` });
            }
        }

        let isMatch = false;
        if (user.password) isMatch = await bcrypt.compare(password, user.password);

        // Legacy plain-text fallback
        if (!isMatch && user.password && !user.password.startsWith('$2b$') && !user.password.startsWith('$2a$')) {
            if (password === user.password) {
                await user.update({ password: await bcrypt.hash(password, 10), failed_attempts: 0, lock_time: null });
                isMatch = true;
            }
        }

        if (isMatch) {
            await user.update({ failed_attempts: 0, lock_time: null });
            const department_id = user.employee?.department_id || null;
            const secret = process.env.JWT_SECRET || 'MySuperSecretKey123!';
            const token = jwt.sign({ user_id: user.user_id, role: user.role, department_id }, secret, { expiresIn: '1h' });
            return res.status(200).json({ message: 'Login successful', token });
        } else {
            let attempts = (user.failed_attempts || 0) + 1;
            let updates = { failed_attempts: attempts };
            if (attempts >= 5) { updates.is_locked = true; updates.lock_time = new Date(); }
            await user.update(updates);
            return res.status(401).json({
                message: attempts >= 5
                    ? 'Account locked due to 5 failed login attempts'
                    : `Invalid Username or Password. You have only ${5 - attempts} attempts left`
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Unlock User ──────────────────────────────────────────────────────────────
const unlockUser = async (req, res) => {
    try {
        if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Only admin can unlock accounts' });
        const user = await users.findByPk(req.body.user_id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        await user.update({ failed_attempts: 0, is_locked: false, lock_time: null });
        res.status(200).json({ message: 'User account unlocked successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
const logout = async (req, res) => {
    try {
        await models.audit_log.create({ user_id: req.body.user_id, action: 'LOGOUT', time: new Date() });
        res.status(200).json({ message: 'Logout successful and log recorded' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Logout failed', details: err.message });
    }
};

// ─── STEP 1: Send OTP ─────────────────────────────────────────────────────────
// Stores OTP hash + expiry in the DB (reset_token / reset_token_expiry columns)
// so it survives server restarts. The raw OTP is never stored — only its hash.
const sendOtpForReset = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const normalizedEmail = email.trim().toLowerCase();

        // ── Validate email is in employees table ──
        const employee = await models.employees.findOne({ where: { email: normalizedEmail } });
        if (!employee) {
            console.warn(`[SendOTP] ❌ Email not found in employee records: ${normalizedEmail}`);
            return res.status(404).json({ message: 'No account found with this email' });
        }

        const user = await users.findOne({ where: { employee_id: employee.employee_id } });
        if (!user) {
            console.warn(`[SendOTP] ❌ No user account linked to employee: ${normalizedEmail}`);
            return res.status(404).json({ message: 'No user account linked to this email' });
        }

        // ── Generate 6-digit OTP ──
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // ── Store OTP hash in DB (not plain text) ──
        // Prefix "OTP:" distinguishes it from a reset token stored in the same column
        const otpHash = await bcrypt.hash(otp, 10);
        await user.update({
            reset_token: `OTP:${otpHash}`,
            reset_token_expiry: otpExpiry,
        });

        // ── Always log OTP to server console for fallback access ──
        console.log('\n========================================');
        console.log('  PASSWORD RESET OTP');
        console.log(`  Email : ${normalizedEmail}`);
        console.log(`  OTP   : ${otp}`);
        console.log('  Valid : 10 minutes');
        console.log('========================================\n');

        // ── Attempt email delivery (non-fatal if it fails) ──
        let emailSent = false;
        try {
            await sendOtpEmail(normalizedEmail, user.user_name, otp);
            emailSent = true;
            console.log(`[SendOTP] ✅ OTP email sent to: ${normalizedEmail}`);
        } catch (mailErr) {
            console.error(`[SendOTP] ⚠️  Email delivery failed — OTP is still valid via console: ${mailErr.message}`);
        }

        res.status(200).json({
            message: emailSent
                ? 'OTP sent to your email. Valid for 10 minutes.'
                : 'OTP generated. Check the server console for your OTP (email delivery failed).',
        });
    } catch (error) {
        console.error('[SendOTP] ❌ Error:', error.message);
        res.status(500).json({ error: 'Failed to generate OTP. Please try again.' });
    }
};

// ─── STEP 2: Verify OTP ───────────────────────────────────────────────────────
// Validates the OTP against the hash in the DB, then replaces it with a
// short-lived reset token that the client uses in Step 3.
const verifyOtpForReset = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

        const normalizedEmail = email.trim().toLowerCase();

        const employee = await models.employees.findOne({ where: { email: normalizedEmail } });
        if (!employee) return res.status(404).json({ message: 'No account found with this email' });

        const user = await users.findOne({ where: { employee_id: employee.employee_id } });
        if (!user) return res.status(404).json({ message: 'No user account linked to this email' });

        // ── Check token exists and is an OTP (prefixed with "OTP:") ──
        if (!user.reset_token || !user.reset_token.startsWith('OTP:')) {
            console.warn(`[VerifyOTP] ❌ No pending OTP for: ${normalizedEmail}`);
            return res.status(400).json({ message: 'No OTP found for this email. Please request a new one.' });
        }

        // ── Check expiry ──
        if (!user.reset_token_expiry || new Date() > new Date(user.reset_token_expiry)) {
            await user.update({ reset_token: null, reset_token_expiry: null });
            console.warn(`[VerifyOTP] ⏰ OTP expired for: ${normalizedEmail}`);
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        // ── Compare OTP against stored hash ──
        const storedHash = user.reset_token.replace('OTP:', '');
        const isMatch = await bcrypt.compare(otp.toString(), storedHash);
        if (!isMatch) {
            console.warn(`[VerifyOTP] ❌ Incorrect OTP attempt for: ${normalizedEmail}`);
            return res.status(400).json({ message: 'Incorrect OTP. Please try again.' });
        }

        // ── OTP correct — generate reset token and store it in DB ──
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Store reset token prefixed with "RESET:" so Step 3 can distinguish it
        await user.update({
            reset_token: `RESET:${resetToken}`,
            reset_token_expiry: resetExpiry,
        });

        // Immediately re-read from DB to confirm the value was saved correctly
        await user.reload();
        console.log(`[VerifyOTP] ✅ OTP verified for: ${normalizedEmail} — reset token issued`);
        res.status(200).json({ message: 'OTP verified successfully.', resetToken });
    } catch (error) {
        console.error('[VerifyOTP] ❌ Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// ─── STEP 3: Reset Password ───────────────────────────────────────────────────
// Validates the reset token from the DB (not from memory), then saves new password.
const resetPassword = async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;
        if (!resetToken || !newPassword) return res.status(400).json({ message: 'Reset token and new password are required' });
        if (newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

        // ── Find user by reset token stored in DB ──
        const user = await users.findOne({ where: { reset_token: `RESET:${resetToken}` } });

        if (!user) {
            console.warn('[ResetPassword] ❌ No user found for reset token — may have expired or already been used');
            return res.status(400).json({ message: 'Invalid or expired reset session. Please start over.' });
        }

        // ── Check token expiry ──
        if (!user.reset_token_expiry || new Date() > new Date(user.reset_token_expiry)) {
            await user.update({ reset_token: null, reset_token_expiry: null });
            console.warn(`[ResetPassword] ⏰ Reset token expired for user_id: ${user.user_id}`);
            return res.status(400).json({ message: 'Reset session expired. Please start over.' });
        }

        // ── Hash and save new password, clear token ──
        // Hash explicitly here; bypass the model hook to avoid any double-hash
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await user.update({
            password: hashedPassword,
            reset_token: null,
            reset_token_expiry: null,
            failed_attempts: 0,
            is_locked: false,
            lock_time: null,
        });

        console.log(`[ResetPassword] ✅ Password updated for user_id: ${user.user_id}`);

        try {
            await models.audit_log.create({
                user_id: user.user_id,
                action: 'PASSWORD_RESET',
                time: new Date(),
            });
        } catch (auditErr) {
            console.warn('[ResetPassword] ⚠️ Audit log failed (non-fatal):', auditErr.message);
        }

        res.status(200).json({ message: 'Password updated successfully! You can now log in.' });
    } catch (error) {
        console.error('[ResetPassword] ❌ Error:', error.message);
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

        const employee = await models.employees.findByPk(employee_id);
        if (!employee) return res.status(400).json({ message: 'Employee ID not found' });
        if (employee.email !== email) return res.status(400).json({ message: 'Email does not match the employee record' });
        if (employee.first_name !== firstName || employee.last_name !== lastName) {
            return res.status(400).json({ message: 'Employee details do not match the provided employee ID' });
        }
        if (employee.position !== role) {
            return res.status(400).json({
                message: `Role mismatch. This Employee is assigned as '${employee.position}', but you tried to register as a '${role}'.`
            });
        }

        const existingUser = await users.findOne({ where: { user_name: username } });
        if (existingUser) return res.status(400).json({ message: 'Username already exists' });

        const existingEmployeeUser = await users.findOne({ where: { employee_id } });
        if (existingEmployeeUser) return res.status(400).json({ message: 'This employee already has a user account' });

        if (['Manager', 'Admin'].includes(role)) {
            const roleTaken = await users.findOne({ where: { role } });
            if (roleTaken) return res.status(400).json({ message: `${role} role is already assigned` });
        }

        const newUser = await users.create({
            user_name: username,
            first_name: firstName,
            last_name: lastName,
            password: await bcrypt.hash(password, 10),
            role,
            employee_id,
            status: 'Active',
            failed_attempts: 0,
            is_locked: false,
        });

        res.status(201).json({ message: 'Account created successfully', user_id: newUser.user_id, username: newUser.user_name });
    } catch (error) {
        console.error(error);
        if (error.name === 'SequelizeForeignKeyConstraintError') return res.status(400).json({ message: 'Employee ID not found (foreign key constraint)' });
        if (error.name === 'SequelizeUniqueConstraintError') return res.status(400).json({ message: 'Username or employee already has an account' });
        if (error.errors) return res.status(400).json({ message: error.errors.map(e => e.message).join(', ') });
        res.status(500).json({ error: error.message });
    }
};

module.exports = { login, unlockUser, logout, sendOtpForReset, verifyOtpForReset, resetPassword, simpleRegister };
