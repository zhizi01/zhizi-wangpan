import './loadEnv';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationCode(email: string, code: string, type: 'register' | 'reset_password') {
  const typeText = type === 'register' ? '注册' : '重置密码';
  
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: `【云端文件管理】${typeText}验证码`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #5E6AD2; font-size: 24px; margin-bottom: 24px;">云端文件管理</h2>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">您好，</p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">您正在进行<strong>${typeText}</strong>操作，验证码为：</p>
        <div style="background: #f5f5f7; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: 600; color: #5E6AD2; letter-spacing: 8px;">${code}</span>
        </div>
        <p style="color: #666; font-size: 14px; line-height: 1.6;">验证码有效期为 10 分钟，请勿泄露给他人。</p>
        <p style="color: #999; font-size: 12px; margin-top: 32px;">如非本人操作，请忽略此邮件。</p>
      </div>
    `,
  });
}

export default transporter;
