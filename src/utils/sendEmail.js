// import nodemailer from "nodemailer";

// const transporter = nodemailer.createTransport({
//     host: process.env.SMTP_HOST,
//     port: Number(process.env.SMTP_PORT),
//     secure: process.env.SMTP_PORT == "465", // true for 465, false for 587
//     auth: {
//         user: process.env.SMTP_USER,
//         pass: process.env.SMTP_PASS,
//     },
//     tls: {
//         rejectUnauthorized: false,
//     },
//     // ✅ Prevent hanging
//     connectionTimeout: 10000, // 10 sec
//     greetingTimeout: 10000,
//     socketTimeout: 10000,
// });

// export const sendEmail = async (to, subject, html) => {
//     try {
//         const info = await transporter.sendMail({
//             from: `"Viral Math" <${process.env.SMTP_USER}>`,
//             to,
//             subject,
//             html,
//         });

//         console.log("OTP Mail sent successfully.");
//         return true;
//     } catch (error) {
//         console.log("OTP Mail Error: ", error);
//         return false;
//     }
// };



import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (to, subject, html) => {
    try {
        const data = await resend.emails.send({
            from: "Viral Math <onboarding@resend.dev>",
            to,
            subject,
            html,
        });

        console.log("Email sent:", data);
        return true;
    } catch (error) {
        console.log("Email Error:", error);
        return false;
    }
};