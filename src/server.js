import express from "express";
import authRoutes from "./routes/authRoutes.js";
import morgan from "morgan";
import connectDB from "./config/db.js";
import config from "./config/config.js";
import cronJob from "./config/cron.js";

const app = express();

cronJob.start();

app.use(express.json());
app.use(morgan("dev"));

app.use("/api/health", (req, res) => {
    res.status(200).json({ message: "OK" });
});

app.use("/api/auth", authRoutes);
connectDB();

app.listen(config.PORT, () => {
    console.log(`Server is running on port ${config.PORT}`);
});