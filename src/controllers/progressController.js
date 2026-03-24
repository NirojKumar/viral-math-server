import progressModel from "../models/progressModel.js";

// ─── XP config (mirrors client-side XP_REWARDS) ───────────────────────────────

const XP_REWARDS = {
    correct: 5,
    streak5: 10,
    streak10: 20,
    perfectRun: 50,
    speedBonus: 3,
};

// ─── Achievement conditions ───────────────────────────────────────────────────

const checkAchievements = (progress, { highestStreak, correct, total, durationSecs }) => {
    const unlocked = new Set(progress.unlockedAchievements);
    const newlyUnlocked = [];

    const check = (id, condition) => {
        if (!unlocked.has(id) && condition) {
            newlyUnlocked.push(id);
        }
    };

    check("first_correct", progress.totalCorrect >= 1);
    check("streak_5", highestStreak >= 5);
    check("streak_10", highestStreak >= 10);
    check("streak_20", highestStreak >= 20);
    check("perfect_run", total > 0 && correct === total);
    check("century", progress.totalCorrect >= 100);
    check("speed_demon", total >= 10 && durationSecs <= 60);
    check("daily_7", progress.currentDailyStreak >= 7);
    check("daily_30", progress.currentDailyStreak >= 30);
    check("xp_500", progress.totalXP >= 500);
    check("xp_1000", progress.totalXP >= 1000);
    check("xp_5000", progress.totalXP >= 5000);

    return newlyUnlocked;
};

export const getProgress = async (req, res) => {
    try {
        let progress = await progressModel.findOne({ userId: req.user._id });

        if (!progress) {
            progress = await progressModel.create({ userId: req.user._id });
        }

        return res.status(200).json({ success: true, progress });
    } catch (error) {
        console.log("Error in GET /progress:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const addProgressSessions = async (req, res) => {
    try {
        const { type = "mixed", mode = "easy", correct, total, durationSecs, highestStreak } = req.body;

        if (correct === undefined || total === undefined || durationSecs === undefined || highestStreak === undefined) {
            return res.status(400).json({ message: "Missing required fields: correct, total, durationSecs, highestStreak" });
        }

        let progress = await progressModel.findOne({ userId: req.user._id });
        if (!progress) {
            progress = await progressModel.create({ userId: req.user._id });
        }

        const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

        // ── XP calculation ────────────────────────────────────────────────────
        let xpEarned = correct * XP_REWARDS.correct;
        if (highestStreak >= 5) xpEarned += XP_REWARDS.streak5;
        if (highestStreak >= 10) xpEarned += XP_REWARDS.streak10;
        if (total > 0 && correct === total) xpEarned += XP_REWARDS.perfectRun;
        if (total >= 10 && durationSecs <= 60) xpEarned += XP_REWARDS.speedBonus * correct;

        // ── Daily streak ──────────────────────────────────────────────────────
        const last = progress.lastPracticedDate;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        let newStreak = progress.currentDailyStreak;
        if (last === today) {
            // Already practiced today — no change
        } else if (last === yesterdayStr) {
            newStreak += 1; // consecutive day
        } else {
            newStreak = 1;  // streak broken
        }

        // ── Daily goal ────────────────────────────────────────────────────────
        let dailyGoalProgress = progress.dailyGoalProgress;
        if (progress.dailyGoalDate !== today) {
            dailyGoalProgress = 0; // new day — reset
        }
        dailyGoalProgress = Math.min(dailyGoalProgress + correct, progress.dailyGoalTarget);

        // ── Update totals ─────────────────────────────────────────────────────
        progress.totalCorrect = progress.totalCorrect + correct;
        progress.totalAnswered = progress.totalAnswered + total;
        progress.xp = progress.xp + xpEarned;
        progress.totalXP = progress.totalXP + xpEarned;
        progress.currentDailyStreak = newStreak;
        progress.longestDailyStreak = Math.max(newStreak, progress.longestDailyStreak);
        progress.lastPracticedDate = today;
        progress.dailyGoalProgress = dailyGoalProgress;
        progress.dailyGoalDate = today;

        // ── Achievements (check after totals are updated) ─────────────────────
        const newAchievements = checkAchievements(progress, { highestStreak, correct, total, durationSecs });
        if (newAchievements.length > 0) {
            progress.unlockedAchievements = [...progress.unlockedAchievements, ...newAchievements];
        }

        // ── Append session log (keep last 100) ────────────────────────────────
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
        progress.sessions.push({
            type, mode, correct, total, accuracy,
            durationSecs, highestStreak, xpEarned,
            playedAt: new Date(),
        });
        if (progress.sessions.length > 100) {
            progress.sessions = progress.sessions.slice(-100);
        }

        await progress.save();

        return res.status(200).json({
            success: true,
            xpEarned,
            newAchievements,
            progress,
        });
    } catch (error) {
        console.log("Error in POST /progress/session:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const updateProgressSettings = async (req, res) => {
    try {
        const { difficulty, customMin, customMax, dailyGoalTarget } = req.body;

        const update = {};
        if (difficulty) update.difficulty = difficulty;
        if (customMin !== undefined) update.customMin = customMin;
        if (customMax !== undefined) update.customMax = customMax;
        if (dailyGoalTarget !== undefined) update.dailyGoalTarget = dailyGoalTarget;

        const progress = await progressModel.findOneAndUpdate(
            { userId: req.user._id },
            { $set: update },
            { new: true, upsert: true }
        );

        return res.status(200).json({ success: true, progress });
    } catch (error) {
        console.log("Error in PATCH /progress/settings:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getProgressSessions = async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 50, 100);
        const progress = await progressModel.findOne({ userId: req.user._id }).select("sessions");

        if (!progress) {
            return res.status(200).json({ success: true, sessions: [] });
        }

        const sessions = progress.sessions.slice(-limit).reverse();
        return res.status(200).json({ success: true, sessions });
    } catch (error) {
        console.log("Error in GET /progress/sessions:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
