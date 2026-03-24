import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { addProgressSessions, getProgress, getProgressSessions, updateProgressSettings } from "../controllers/progressController.js";

const router = express.Router();



// ─── GET /api/progress ────────────────────────────────────────────────────────
// Returns full progress. Creates a fresh doc if this is the user's first time.

router.get("/", protect, getProgress);

// ─── POST /api/progress/session ───────────────────────────────────────────────
// Called after every practice session.
// Body: { type, mode, correct, total, durationSecs, highestStreak }

router.post("/session", protect, addProgressSessions);

// ─── PATCH /api/progress/settings ────────────────────────────────────────────
// Update difficulty or daily goal target.
// Body: { difficulty?, customMin?, customMax?, dailyGoalTarget? }

router.patch("/settings", protect, updateProgressSettings);

// ─── GET /api/progress/sessions ──────────────────────────────────────────────
// Returns session history. Query: ?limit=50

router.get("/sessions", protect, getProgressSessions);

export default router;