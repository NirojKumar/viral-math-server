import express from "express";
import { register, login, refreshAccessToken } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/refresh", refreshAccessToken);

export default router;