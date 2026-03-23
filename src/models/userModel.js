import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
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
    }
}, { timestamps: true });

const userModel = mongoose.model("users", userSchema);

export default userModel;