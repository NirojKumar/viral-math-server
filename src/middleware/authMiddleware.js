import jwt from "jsonwebtoken";
import config from "../config/config.js";
import userModel from "../models/userModel.js";

export const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided. Please log in." });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "Malformed token." });
        }

        // Matches your JWT payload: { id: user._id }
        const decoded = jwt.verify(token, config.JWT_SECRET);

        const user = await userModel.findById(decoded.id).select("-password -refreshToken -otp -otpExpiresAt");

        if (!user) {
            return res.status(401).json({ message: "User not found." });
        }

        if (!user.isVerified) {
            return res.status(403).json({ message: "Please verify your account first." });
        }

        // Attach full user to req so routes can use req.user._id, req.user.fullname etc.
        req.user = user;

        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expired. Please log in again." });
        }
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ message: "Invalid token." });
        }
        console.log("Error in protect middleware:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};