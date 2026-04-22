import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cloud, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { login } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { motion } from 'framer-motion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { setToken, setUser } = useAuthStore();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const res = await login(email, password);
      if (res.success && res.data) {
        setToken(res.data.token);
        setUser(res.data.user);
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err.message || '登录失败');
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
          <h1 className="text-2xl font-bold mb-1">欢迎回来</h1>
          <p className="text-linear-text-muted text-sm">登录您的云端文件管理账户</p>
        </div>
        
        <div className="bg-linear-surface border border-linear-border rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">邮箱地址</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-linear-bg border border-linear-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-linear-purple/50 focus:border-linear-purple transition-all"
                placeholder="your@email.com"
                required
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
                  登录
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-4 text-center text-sm text-linear-text-muted">
            还没有账户？
            <Link to="/register" className="text-linear-purple hover:text-linear-purple-dark ml-1 transition-colors">
              立即注册
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
