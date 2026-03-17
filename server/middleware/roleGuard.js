const roleGuard = (roles) => {
    return (req, res, next) => {
        console.log("req.user:", req.user);  // Debug: see if user exists
         // Safety check: ensure req.user exists
        if (!req.user) {
            return res.status(401).json({ message: "Authentication required" });
        }
        //check permission
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied: insufficient permission" });
        }
        next();
    };
};
module.exports = roleGuard;