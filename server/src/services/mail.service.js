import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendBarberInviteEmail = async ({ email, token }) => {
  const link = `${process.env.CLIENT_URL}/barber-register?token=${token}`;
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: "NextCut barber invite",
    html: `<p>You were invited to join NextCut as a barber.</p><p><a href="${link}">Complete registration</a></p>`,
  });
};
