import mongoose from "mongoose";
import config from "./config.js";
import dns from "dns";

dns.setServers(['1.1.1.1', '8.8.8.8']);

async function connectDB() {
    try {
        await mongoose.connect(config.MONGO_URI);
        console.log("Database connected successfully");
    } catch (error) {
        console.log("Database connection failed", error);
    }
}

export default connectDB;