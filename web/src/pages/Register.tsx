import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cloud, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { sendVerifyCode, register } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { motion } from 'framer-motion';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const { setToken, setUser } = useAuthStore();
  
  const handleSendCode = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }
    
    setIsSendingCode(true);
    setError('');
    
    try {
      const res = await sendVerifyCode(email);
      if (res.success) {
        setCodeSent(true);
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || '发送验证码失败');
    } finally {
      setIsSendingCode(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    
    if (password.length < 6) {
      setError('密码长度至少6位');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const res = await register(email, password, code, nickname || undefined);
      if (res.success && res.data) {
        setToken(res.data.token);
        setUser(res.data.user);
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err.message || '注册失败');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-linear-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-linear-purple flex items-center justify-center mx-auto mb-4">
            <Cloud className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-1">创建账户</h1>
          <p className="text-linear-text-muted text-sm">开始您的云端文件管理之旅</p>
        </div>
        
        <div className="bg-linear-surface border border-linear-border rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">邮箱地址</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-linear-bg border border-linear-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-linear-purple/50 focus:border-linear-purple transition-all"
                  placeholder="your@email.com"
                  required
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={isSendingCode || countdown > 0}
                  className="px-3 py-2.5 bg-linear-surface-hover border border-linear-border rounded-lg text-sm font-medium hover:bg-linear-purple/10 hover:text-linear-purple hover:border-linear-purple/30 transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  {countdown > 0 ? `${countdown}s` : codeSent ? '重新发送' : '获取验证码'}
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1.5">验证码</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2.5 bg-linear-bg border border-linear-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-linear-purple/50 focus:border-linear-purple transition-all"
                placeholder="请输入6位验证码"
                maxLength={6}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1.5">昵称（可选）</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-3 py-2.5 bg-linear-bg border border-linear-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-linear-purple/50 focus:border-linear-purple transition-all"
                placeholder="您的昵称"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1.5">密码</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-linear-bg border border-linear-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-linear-purple/50 focus:border-linear-purple transition-all pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-linear-text-muted hover:text-linear-text"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1.5">确认密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-linear-bg border border-linear-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-linear-purple/50 focus:border-linear-purple transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            
            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</div>
            )}
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-linear-purple hover:bg-linear-purple-dark text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  注册
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-4 text-center text-sm text-linear-text-muted">
            已有账户？
            <Link to="/login" className="text-linear-purple hover:text-linear-purple-dark ml-1 transition-colors">
              立即登录
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
