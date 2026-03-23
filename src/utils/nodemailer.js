import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, html) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: `"Viral Math" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
        });

    } catch (error) {
        console.log("Email Error:", error);
        throw new Error("Email not sent");
    }
};