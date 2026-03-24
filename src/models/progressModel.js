import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
    {
        type: { type: String, default: "mixed" },
        mode: { type: String, default: "normal" },
        correct: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        accuracy: { type: Number, default: 0 },
        durationSecs: { type: Number, default: 0 },
        highestStreak: { type: Number, default: 0 },
        xpEarned: { type: Number, default: 0 },
        playedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const progressSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },

        // XP
        xp: { type: Number, default: 0 },
        totalXP: { type: Number, default: 0 },

        // Daily streak
        currentDailyStreak: { type: Number, default: 0 },
        longestDailyStreak: { type: Number, default: 0 },
        lastPracticedDate: { type: String, default: null }, // "YYYY-MM-DD"

        // All-time totals
        totalCorrect: { type: Number, default: 0 },
        totalAnswered: { type: Number, default: 0 },

        // Session history (capped at 100)
        sessions: { type: [sessionSchema], default: [] },

        // Achievements
        unlockedAchievements: { type: [String], default: [] },

        // Difficulty setting
        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard", "custom"],
            default: "medium",
        },
        customMin: { type: Number, default: 1 },
        customMax: { type: Number, default: 100 },

        // Daily goal
        dailyGoalTarget: { type: Number, default: 50 },
        dailyGoalProgress: { type: Number, default: 0 },
        dailyGoalDate: { type: String, default: null }, // "YYYY-MM-DD"
    },
    { timestamps: true }
);

const progressModel = mongoose.model("Progress", progressSchema);
export default progressModel;