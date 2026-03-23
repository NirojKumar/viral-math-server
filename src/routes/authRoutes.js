import express from "express";
import { register, login, refreshAccessToken, verifyOtp, resendOtp } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/refresh", refreshAccessToken);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);

export default router;