import mongoose, { Schema } from "mongoose";

const SessionSchema = new Schema(
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

const ProgressSchema = new Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true,
            unique: true,
        },

        xp: { type: Number, default: 0 },
        totalXP: { type: Number, default: 0 },

        currentDailyStreak: { type: Number, default: 0 },
        longestDailyStreak: { type: Number, default: 0 },
        lastPracticedDate: { type: String, default: null },

        totalCorrect: { type: Number, default: 0 },
        totalAnswered: { type: Number, default: 0 },

        sessions: { type: [SessionSchema], default: [] },

        unlockedAchievements: { type: [String], default: [] },

        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard", "custom"],
            default: "medium",
        },
        customMin: { type: Number, default: 1 },
        customMax: { type: Number, default: 100 },

        dailyGoalTarget: { type: Number, default: 50 },
        dailyGoalProgress: { type: Number, default: 0 },
        dailyGoalDate: { type: String, default: null },
    },
    { timestamps: true }
);

export const progressModel = mongoose.model("progress", ProgressSchema);