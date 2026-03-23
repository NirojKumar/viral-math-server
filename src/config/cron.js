import cron from "cron";
import https from "https";

const cronJob = new cron.CronJob("*/14 * * * *", function () {
    https.
        get(process.env.API_URL, (res) => {
            if (res.statusCode === 200) {
                console.log("GET requrest sent successfully.");
            } else {
                console.log("GET request failed with status code: ", res.statusCode);
            }
        })
});

export default cronJob;