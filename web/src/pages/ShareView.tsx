import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { File, Lock, Download, Eye, ArrowLeft, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import { getShareInfo, verifySharePassword } from '../api/share';
import { formatFileSize, formatDate } from '../utils/format';
import { useAuthStore } from '../stores/authStore';
import { downloadToBrowser } from '../utils/download';

export default function ShareView() {
  const { code } = useParams<{ code: string }>();
  const { isAuthenticated } = useAuthStore();
  const [share, setShare] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [verified, setVerified] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  
  const loadShare = async () => {
    if (!code) return;
    setIsLoading(true);
    try {
      const res = await getShareInfo(code);
      if (res.success && res.data) {
        setShare(res.data);
        if (!res.data.has_password) {
          setVerified(true);
        }
      }
    } catch (err: any) {
      setError(err.message || '分享不存在或已失效');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadShare();
  }, [code]);
  
  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    try {
      const res = await verifySharePassword(code, password);
      if (res.success) {
        setVerified(true);
      }
    } catch (err: any) {
      setError(err.message || '密码错误');
    }
  };
  
  const handleDownload = async () => {
    if (!code) return;
    setDownloading(true);
    setDownloadError('');
    try {
      await downloadToBrowser({
        path: `/shares/${code}/download`,
        method: 'POST',
        body: { password: share?.has_password ? password : undefined },
        fileName: share?.file_name || 'download',
        includeAuth: true,
      });
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : '下载失败');
    } finally {
      setDownloading(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-bg flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-linear-purple border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-linear-bg flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-400/10 flex items-center justify-center mx-auto mb-4">
            <File className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">分享已失效</h2>
          <p className="text-linear-text-muted text-sm mb-4">{error}</p>
          <Link to="/" className="text-linear-purple hover:text-linear-purple-dark text-sm font-medium">
            返回首页
          </Link>
        </div>
      </div>
    );
  }
  
  if (share?.require_login && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-linear-bg flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-linear-purple/10 flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8 text-linear-purple" />
          </div>
          <h2 className="text-xl font-semibold mb-2">需要登录</h2>
          <p className="text-linear-text-muted text-sm mb-6">此分享需要登录后才能查看和下载</p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/login"
              className="px-6 py-2.5 bg-linear-purple hover:bg-linear-purple-dark text-white rounded-lg text-sm font-medium transition-colors"
            >
              去登录
            </Link>
            <Link
              to="/"
              className="px-6 py-2.5 bg-linear-surface hover:bg-linear-surface-hover border border-linear-border rounded-lg text-sm font-medium transition-colors"
            >
              返回首页
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }
  
  if (share?.has_password && !verified) {
    return (
      <div className="min-h-screen bg-linear-bg flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-linear-purple/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-linear-purple" />
            </div>
            <h2 className="text-xl font-semibold mb-1">访问受保护</h2>
            <p className="text-linear-text-muted text-sm">此分享需要密码才能访问</p>
          </div>
          
          <form onSubmit={handleVerifyPassword} className="bg-linear-surface border border-linear-border rounded-2xl p-6 space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入访问密码"
              className="w-full px-3 py-2.5 bg-linear-bg border border-linear-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-linear-purple/50 focus:border-linear-purple transition-all"
              autoFocus
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full py-2.5 bg-linear-purple hover:bg-linear-purple-dark text-white rounded-lg text-sm font-medium transition-colors"
            >
              验证并访问
            </button>
          </form>
          
          <div className="mt-4 text-center">
            <Link to="/" className="text-linear-text-muted hover:text-linear-text text-sm transition-colors">
              返回首页
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-linear-bg">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-linear-text-muted hover:text-linear-text mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-linear-surface border border-linear-border rounded-2xl p-8 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-linear-purple/10 flex items-center justify-center mx-auto mb-6">
            <File className="w-10 h-10 text-linear-purple" />
          </div>
          
          <h1 className="text-xl font-semibold mb-2">{share?.file_name}</h1>
          
          <div className="flex items-center justify-center gap-4 text-sm text-linear-text-muted mb-6">
            <span>{formatFileSize(share?.file_size || 0)}</span>
            <span>•</span>
            <span>{formatDate(share?.created_at)}</span>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-sm text-linear-text-muted mb-8">
            <span>分享者: {share?.user_nickname || '未知用户'}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {share?.view_count || 0}
            </span>
          </div>
          
          {downloadError && (
            <p className="text-sm text-red-400 mb-4" role="alert">
              {downloadError}
            </p>
          )}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-8 py-3 bg-linear-purple hover:bg-linear-purple-dark disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Download className="w-5 h-5" />
            {downloading ? '下载中…' : '下载文件'}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
