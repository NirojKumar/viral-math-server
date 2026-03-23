import dotenv from "dotenv";

dotenv.config();

if (!process.env.MONGO_URI) {
    throw new Error("Please provide MONGO_URI in the environment variables");
}

if (!process.env.JWT_SECRET) {
    throw new Error("Please provide JWT_SECRET in the environment variables");
}

const config = {
    PORT: process.env.PORT || 3000,
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    BACKEND_RENDER_API_URL: process.env.BACKEND_RENDER_API_URL
};

export default config;