const otpEmailTemplate = (otp, expiryMinutes = 5) => {
    return `
    <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">
        <div style="max-width: 500px; margin: auto; background: #ffffff; border-radius: 10px; padding: 30px; text-align: center;">

            <h2 style="color: #333;">Viral Math</h2>

            <p style="font-size: 16px; color: #555;">
                Your One-Time Password (OTP) is:
            </p>

            <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2c3e50; margin: 20px 0;">
                ${otp}
            </div>

            <p style="font-size: 14px; color: #777;">
                This OTP is valid for <strong>${expiryMinutes} minutes</strong>.
            </p>

            <p style="font-size: 14px; color: #999; margin-top: 20px;">
                Do not share this code with anyone. If you didn’t request this, you can safely ignore this email.
            </p>

        </div>

        <p style="text-align: center; font-size: 12px; color: #aaa; margin-top: 15px;">
            © ${new Date().getFullYear()} Viral Math. All rights reserved.
        </p>
    </div>
    `;
};

export default otpEmailTemplate;