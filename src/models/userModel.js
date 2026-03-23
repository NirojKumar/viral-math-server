import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
    },
    fullname: {
        type: String,
        required: true,
    },
    profilePicture: {
        type: String,
        required: false,
        default: ""
    },
    refreshToken: {
        type: String,
        required: false,
        default: ""
    },
    streak: {
        type: Number,
        required: false,
        default: 1
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    streakUpdatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const userModel = mongoose.model("users", userSchema);

export default userModel;