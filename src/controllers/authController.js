import userModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import crypto from "crypto";

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
            username,
            email,
            password: hashedPassword,
            fullname,
            profilePicture: randomPicture
        }

        const createdUser = await userModel.create(userData);

        // Token Generation

        const refreshToken = jwt.sign({
            id: createdUser._id
        }, config.JWT_SECRET, {
            expiresIn: "7d"
        });

        const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

        createdUser.refreshToken = refreshTokenHash;
        await createdUser.save();

        const accessToken = await jwt.sign({
            id: createdUser._id,
        }, config.JWT_SECRET, {
            expiresIn: "15m"
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return await res.status(201).json({ message: "User created successfully", user: { username, email, fullname }, token: accessToken, refreshToken });

    } catch (error) {
        console.log("Error in /register :", error);
        return await res.status(500).json({ message: "Internal server error" });
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
                { email: emailOrUsername },
                { username: emailOrUsername }
            ]
        })

        if (!user) {
            return await res.status(400).json({ message: "User not found" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return await res.status(400).json({ message: "Invalid Credentials!" });
        }

        const refreshToken = jwt.sign({
            id: user._id
        }, config.JWT_SECRET, {
            expiresIn: "7d"
        });

        const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

        user.refreshToken = refreshTokenHash;
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
        const token = req.cookies.refreshToken;

        if (!token) {
            return res.status(401).json({ message: "No refresh token" });
        }

        const decoded = jwt.verify(token, config.JWT_SECRET);

        const user = await userModel.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: "User not found" });
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
        return res.status(401).json({ message: "Invalid refresh token" });
    }
};