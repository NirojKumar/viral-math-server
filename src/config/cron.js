import cron from "cron";
import https from "https";

const cronJob = new cron.CronJob("*/14 * * * *", function () {
    const url = process.env.BACKEND_RENDER_API_URL;

    if (!url) {
        console.log("API_URL not set");
        return;
    }

    https
        .get(url, (res) => {
            if (res.statusCode === 200) {
                console.log("GET request sent successfully.");
            } else {
                console.log("GET failed:", res.statusCode);
            }
        })
        .on("error", (err) => {
            console.error("Cron HTTPS error:", err.message);
        });
});

export default cronJob;