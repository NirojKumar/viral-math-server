import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT == "465", // true for 465, false for 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false,
    }
});

export const sendEmail = async (to, subject, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"Viral Math" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html,
        });

        console.log("OTP Mail sent successfully.");
    } catch (error) {
        console.log("OTP Mail Error: ", error);
        throw new Error("OTP Mail not sent");
    }
};