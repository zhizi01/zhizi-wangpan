import pool, { query } from '../config/database';
import { sendVerificationCode as sendEmailCode } from '../config/mailer';
import { generateVerificationCode } from '../utils/crypto';

export async function createVerificationCode(email: string, type: 'register' | 'reset_password') {
  // 删除该邮箱同类型的旧验证码
  await query('DELETE FROM verification_codes WHERE email = ? AND type = ?', [email, type]);
  
  const code = generateVerificationCode();
  const expireAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟过期
  
  await query(
    'INSERT INTO verification_codes (email, code, type, expire_at) VALUES (?, ?, ?, ?)',
    [email, code, type, expireAt]
  );
  
  await sendEmailCode(email, code, type);
  return code;
}

export async function verifyCode(email: string, code: string, type: 'register' | 'reset_password'): Promise<boolean> {
  const codes = await query(
    'SELECT * FROM verification_codes WHERE email = ? AND code = ? AND type = ? AND expire_at > NOW() AND used_at IS NULL',
    [email, code, type]
  );
  
  if (codes.length === 0) {
    return false;
  }
  
  // 标记为已使用
  await query(
    'UPDATE verification_codes SET used_at = NOW() WHERE id = ?',
    [(codes[0] as any).id]
  );
  
  return true;
}
