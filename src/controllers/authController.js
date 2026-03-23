import userModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";
import otpEmailTemplate from "../functions/otpEmailTemplate.js";

export const register = async (req, res) => {
    try {
        const { email, username, password, fullname } = req.body;
        if (!email || !username || !password || !fullname) {
            return await res.status(400).json({ message: "Please provide all the fields" });
        }

        const user = await userModel.findOne({
            $or: [
                { email },
                { username }
            ]
        })

        if (user) {
            return await res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const randomPicture = `https://api.dicebear.com/9.x/avataaars/svg?seed=${username}`;
        const userData = {
            username: username.toLowerCase().trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            fullname,
            profilePicture: randomPicture,
            streak: 0,
            lastActive: new Date()
        }

        const createdUser = await userModel.create(userData);

        // Otp Generation

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

        createdUser.otp = otpHash;
        createdUser.otpExpiresAt = Date.now() + 5 * 60 * 1000;
        createdUser.isVerified = false;

        await createdUser.save();

        await sendEmail(
            email,
            "Your OTP Code - Viral Math",
            otpEmailTemplate(otp, 5)
        );

        return res.status(201).json({
            message: "OTP sent to your email",
        });

    } catch (error) {
        console.log("Error in /register :", error);
        return await res.status(500).json({ message: "Internal server error" });
    }
};

export const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        if (user.otpExpiresAt < Date.now()) {
            return res.status(400).json({ message: "OTP expired" });
        }

        const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

        if (user.otp !== hashedOtp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        // ✅ Mark verified
        user.isVerified = true;
        user.otp = null;
        user.otpExpiresAt = null;

        // ✅ Generate tokens now (same as your login)
        const refreshToken = jwt.sign({ id: user._id }, config.JWT_SECRET, {
            expiresIn: "7d"
        });

        const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
        user.refreshToken = refreshTokenHash;

        await user.save();

        const accessToken = jwt.sign({ id: user._id }, config.JWT_SECRET, {
            expiresIn: "15m"
        });

        return res.status(200).json({
            message: "OTP verified",
            user: {
                username: user.username,
                email: user.email,
                fullname: user.fullname
            },
            token: accessToken,
            refreshToken
        });

    } catch (error) {
        console.log("Error in /verify-otp :", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

        user.otp = otpHash;
        user.otpExpiresAt = Date.now() + 5 * 60 * 1000;

        await user.save();

        const isEmailSent = await sendEmail(
            user.email,
            "Your OTP Code - Viral Math",
            otpEmailTemplate(otp, 5)
        );

        if (!isEmailSent) {
            return res.status(500).json({
                message: "Failed to send OTP email. Try again later."
            });
        }

        return res.status(200).json({ message: "OTP resent" });

    } catch (error) {
        console.log("Error in /resend-otp :", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const login = async (req, res) => {
    try {
        const { emailOrUsername, password } = req.body;
        if (!emailOrUsername || !password) {
            return await res.status(400).json({ message: "Please provide all the fields" });
        }

        const user = await userModel.findOne({
            $or: [
                { email: emailOrUsername.toLowerCase().trim() },
                { username: emailOrUsername.toLowerCase().trim() }
            ]
        })

        if (!user) {
            return await res.status(400).json({ message: "Invalid credentials!" });
        }

        if (!user.isVerified) {
            return res.status(403).json({ message: "Please verify your account first" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return await res.status(400).json({ message: "Invalid credentials!" });
        }

        const refreshToken = jwt.sign({
            id: user._id
        }, config.JWT_SECRET, {
            expiresIn: "7d"
        });

        const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

        user.refreshToken = refreshTokenHash;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const last = new Date(user.lastActive);
        last.setHours(0, 0, 0, 0);

        const diffDays = (today - last) / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
            user.streak += 1; // ✅ continue streak
        } else if (diffDays > 1) {
            user.streak = 1; // ✅ reset streak
        }
        // diffDays === 0 → same day → do nothing

        user.lastActive = new Date();
        await user.save();

        const accessToken = await jwt.sign({
            id: user._id,
        }, config.JWT_SECRET, {
            expiresIn: "15m"
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return await res.status(200).json({ message: "User logged in successfully", user: { username: user.username, email: user.email, fullname: user.fullname }, token: accessToken, refreshToken });

    } catch (error) {
        console.log("Error in /login :", error);
        return await res.status(500).json({ message: "Internal server error" });
    }
};

export const refreshAccessToken = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "No refresh token" });
        }

        const decoded = jwt.verify(token, config.JWT_SECRET);

        const user = await userModel.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        if (user.refreshToken !== hashedToken) {
            return res.status(401).json({ message: "Invalid refresh token" });
        }

        const newAccessToken = jwt.sign(
            { id: user._id },
            config.JWT_SECRET,
            { expiresIn: "15m" }
        );

        return res.status(200).json({
            token: newAccessToken,
            user: {
                username: user.username,
                email: user.email,
                fullname: user.fullname
            }
        });

    } catch (error) {
        console.log("Error in /refresh-token :", error);
        return res.status(401).json({ message: "Invalid refresh token" });
    }
};