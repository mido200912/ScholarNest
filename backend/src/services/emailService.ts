import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
    });
  }
  return transporter;
};

export const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('SMTP not configured, skipping email');
      return false;
    }

    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || `ScholarNest <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}`);
    return true;
  } catch (error: any) {
    console.error('Email send error:', error.message);
    return false;
  }
};

export const sendNotificationEmail = async (
  to: string,
  userName: string,
  title: string,
  message: string
): Promise<boolean> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">ScholarNest</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
        <h2 style="color: #1f2937; margin-top: 0;">${title}</h2>
        <p style="color: #4b5563; line-height: 1.6;">Hello ${userName},</p>
        <p style="color: #4b5563; line-height: 1.6;">${message}</p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="http://localhost:5173/dashboard" style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Dashboard</a>
        </div>
      </div>
      <div style="text-align: center; padding: 15px; color: #9ca3af; font-size: 12px;">
        <p>This is an automated notification from ScholarNest.</p>
      </div>
    </div>
  `;

  return sendEmail(to, `${title} - ScholarNest`, html);
};
