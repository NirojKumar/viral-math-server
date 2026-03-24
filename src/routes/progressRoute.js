import express, { Request, Response } from "express";
import { protect } from "../middleware/authMiddleware"; // your existing auth middleware
import { progressModel } from "../models/progressModel";

const router = express.Router();

// ─── XP & Achievement helpers ─────────────────────────────────────────────────

const XP_REWARDS = {
    correct: 5,
    streak5: 10,
    streak10: 20,
    perfectRun: 50,
    speedBonus: 3,
};

const ALL_ACHIEVEMENTS = [
    { id: "first_correct", condition: (p) => p.totalCorrect >= 1 },
    { id: "streak_5", condition: (_, streak) => streak >= 5 },
    { id: "streak_10", condition: (_, streak) => streak >= 10 },
    { id: "streak_20", condition: (_, streak) => streak >= 20 },
    { id: "perfect_run", condition: (_, __, correct, total) => total > 0 && correct === total },
    { id: "century", condition: (p) => p.totalCorrect >= 100 },
    { id: "speed_demon", condition: (_, __, correct, total, duration) => total >= 10 && duration <= 60 },
    { id: "daily_7", condition: (p) => p.currentDailyStreak >= 7 },
    { id: "daily_30", condition: (p) => p.currentDailyStreak >= 30 },
    { id: "xp_500", condition: (p) => p.totalXP >= 500 },
    { id: "xp_1000", condition: (p) => p.totalXP >= 1000 },
    { id: "xp_5000", condition: (p) => p.totalXP >= 5000 },
];

const checkAchievements = (
    progress,
    streakHigh,
    correct,
    total,
    durationSecs
) => {
    const newlyUnlocked = [];
    const already = new Set(progress.unlockedAchievements);

    for (const a of ALL_ACHIEVEMENTS) {
        if (!already.has(a.id) && a.condition(progress, streakHigh, correct, total, durationSecs)) {
            newlyUnlocked.push(a.id);
        }
    }

    return newlyUnlocked;
};

// ─── GET /api/progress ────────────────────────────────────────────────────────
// Returns full progress for the logged-in user. Creates doc if first time.

router.get("/", protect, async (req, res) => {
    try {
        let progress = await progressModel.findOne({ userId: req.user._id });

        if (!progress) {
            progress = await progressModel.create({ userId: req.user._id });
        }

        res.json({ success: true, progress });
    } catch (err) {
        console.error("GET /progress error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ─── POST /api/progress/session ───────────────────────────────────────────────
// Called after every practice session ends.
// Body: { type, mode, correct, total, durationSecs, highestStreak }

router.post("/session", protect, async (req, res) => {
    try {
        const userId = req.user._id;
        const { type = "mixed", mode = "normal", correct, total, durationSecs, highestStreak } = req.body;

        if (correct === undefined || total === undefined || durationSecs === undefined || highestStreak === undefined) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        let progress = await progressModel.findOne({ userId });
        if (!progress) {
            progress = await progressModel.create({ userId });
        }

        const today = new Date().toISOString().split("T")[0];

        // ── XP calculation ──
        let xpEarned = correct * XP_REWARDS.correct;
        if (highestStreak >= 5) xpEarned += XP_REWARDS.streak5;
        if (highestStreak >= 10) xpEarned += XP_REWARDS.streak10;
        if (total > 0 && correct === total) xpEarned += XP_REWARDS.perfectRun;
        if (total >= 10 && durationSecs <= 60) xpEarned += XP_REWARDS.speedBonus * correct;

        // ── Daily streak ──
        const last = progress.lastPracticedDate;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        let newStreak = progress.currentDailyStreak;
        if (last === today) {
            // Already practiced today — no change
        } else if (last === yesterdayStr) {
            newStreak += 1;
        } else {
            newStreak = 1; // streak broken
        }

        // ── Daily goal ──
        let dailyGoalProgress = progress.dailyGoalProgress;
        if (progress.dailyGoalDate !== today) {
            dailyGoalProgress = 0; // new day reset
        }
        dailyGoalProgress = Math.min(dailyGoalProgress + correct, progress.dailyGoalTarget);

        // ── Totals ──
        const newTotalCorrect = progress.totalCorrect + correct;
        const newTotalAnswered = progress.totalAnswered + total;
        const newXP = progress.xp + xpEarned;
        const newTotalXP = progress.totalXP + xpEarned;
        const newLongest = Math.max(newStreak, progress.longestDailyStreak);
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

        // ── Achievements ──
        // Temporarily update fields for condition checking
        progress.totalCorrect = newTotalCorrect;
        progress.totalXP = newTotalXP;
        progress.currentDailyStreak = newStreak;

        const newAchievements = checkAchievements(progress, highestStreak, correct, total, durationSecs);

        // ── Persist ──
        progress.xp = newXP;
        progress.totalXP = newTotalXP;
        progress.totalCorrect = newTotalCorrect;
        progress.totalAnswered = newTotalAnswered;
        progress.currentDailyStreak = newStreak;
        progress.longestDailyStreak = newLongest;
        progress.lastPracticedDate = today;
        progress.dailyGoalProgress = dailyGoalProgress;
        progress.dailyGoalDate = today;
        progress.unlockedAchievements = [...progress.unlockedAchievements, ...newAchievements];

        // Keep last 100 sessions only
        progress.sessions.push({ type, mode, correct, total, accuracy, durationSecs, highestStreak, xpEarned, playedAt: new Date() });
        if (progress.sessions.length > 100) {
            progress.sessions = progress.sessions.slice(-100);
        }

        await progress.save();

        res.json({
            success: true,
            xpEarned,
            newAchievements,
            progress,
        });
    } catch (err) {
        console.error("POST /progress/session error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ─── PATCH /api/progress/settings ────────────────────────────────────────────
// Update difficulty or daily goal target.
// Body: { difficulty?, customMin?, customMax?, dailyGoalTarget? }

router.patch("/settings", protect, async (req, res) => {
    try {
        const userId = req.user._id;
        const { difficulty, customMin, customMax, dailyGoalTarget } = req.body;

        const update = {};
        if (difficulty) update.difficulty = difficulty;
        if (customMin !== undefined) update.customMin = customMin;
        if (customMax !== undefined) update.customMax = customMax;
        if (dailyGoalTarget) update.dailyGoalTarget = dailyGoalTarget;

        const progress = await progressModel.findOneAndUpdate(
            { userId },
            { $set: update },
            { new: true, upsert: true }
        );

        res.json({ success: true, progress });
    } catch (err) {
        console.error("PATCH /progress/settings error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ─── GET /api/progress/sessions ──────────────────────────────────────────────
// Returns session history (last 50 by default)

router.get("/sessions", protect, async (req, res) => {
    try {
        const userId = req.user._id;
        const limit = Math.min(Number(req.query.limit) || 50, 100);

        const progress = await progressModel.findOne({ userId }).select("sessions");
        if (!progress) return res.json({ success: true, sessions: [] });

        const sessions = progress.sessions.slice(-limit).reverse();
        res.json({ success: true, sessions });
    } catch (err) {
        console.error("GET /progress/sessions error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

export default router;