const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET || "MySuperSecretKey123!";

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access denied. No token provided." });
    }

    // Bearer <token>
    const token = authHeader.split(" ")[1];
    //if (!token) return res.status(401).json({ message: "Access denied. Invalid token." });

    try {
        const decoded = jwt.verify(token, secret);
        req.user = decoded;// This contains user_id, role, and department_id
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expaired token" });
    }
};

module.exports = authMiddleware;