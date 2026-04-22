import { useState } from 'react';
import { X, Link2, Lock, Clock, Globe, Copy, Check } from 'lucide-react';
import { createShare } from '../../api/share';
import { FileItem } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface ShareModalProps {
  file: FileItem;
  onClose: () => void;
}

export default function ShareModal({ file, onClose }: ShareModalProps) {
  const [requireLogin, setRequireLogin] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [expireDays, setExpireDays] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shareResult, setShareResult] = useState<{ share_code: string } | null>(null);
  const [copied, setCopied] = useState(false);
  
  const handleCreate = async () => {
    setIsLoading(true);
    try {
      const res = await createShare(
        file.id,
        requireLogin,
        hasPassword ? password : undefined,
        expireDays ? parseInt(expireDays) : undefined
      );
      if (res.success && res.data) {
        setShareResult(res.data);
      }
    } catch (error) {
      console.error('创建分享失败:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const shareUrl = shareResult ? `${window.location.origin}/s/${shareResult.share_code}` : '';
  
  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-linear-surface border border-linear-border rounded-2xl w-full max-w-md overflow-hidden"
        >
          <div className="flex items-center justify-between p-5 border-b border-linear-border">
            <h3 className="text-lg font-semibold">分享文件</h3>
            <button onClick={onClose} className="text-linear-text-muted hover:text-linear-text transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-linear-bg rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-linear-purple/10 flex items-center justify-center text-linear-purple">
                <Link2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-linear-text-muted">{file.type === 'folder' ? '文件夹' : '文件'}</p>
              </div>
            </div>
            
            {shareResult ? (
              <div className="space-y-3">
                <div className="p-3 bg-linear-bg rounded-lg border border-linear-border">
                  <label className="text-xs text-linear-text-muted mb-1 block">分享链接</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 bg-transparent text-sm truncate focus:outline-none"
                    />
                    <button
                      onClick={handleCopy}
                      className="p-1.5 rounded-lg hover:bg-linear-surface-hover transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-linear-text-muted text-center">
                  分享链接已生成，您可以复制给其他人
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-linear-bg rounded-lg cursor-pointer hover:bg-linear-surface-hover transition-colors">
                  <Globe className="w-5 h-5 text-linear-text-muted" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">需要登录</p>
                    <p className="text-xs text-linear-text-muted">访问者需要登录后才能查看</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={requireLogin}
                    onChange={(e) => setRequireLogin(e.target.checked)}
                    className="w-4 h-4 rounded border-linear-border bg-linear-bg checked:bg-linear-purple"
                  />
                </label>
                
                <label className="flex items-center gap-3 p-3 bg-linear-bg rounded-lg cursor-pointer hover:bg-linear-surface-hover transition-colors">
                  <Lock className="w-5 h-5 text-linear-text-muted" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">访问密码</p>
                    <p className="text-xs text-linear-text-muted">为分享链接设置密码保护</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={hasPassword}
                    onChange={(e) => setHasPassword(e.target.checked)}
                    className="w-4 h-4 rounded border-linear-border bg-linear-bg checked:bg-linear-purple"
                  />
                </label>
                
                {hasPassword && (
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="输入访问密码"
                    className="w-full px-3 py-2.5 bg-linear-bg border border-linear-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-linear-purple/50 focus:border-linear-purple transition-all"
                  />
                )}
                
                <label className="flex items-center gap-3 p-3 bg-linear-bg rounded-lg cursor-pointer hover:bg-linear-surface-hover transition-colors">
                  <Clock className="w-5 h-5 text-linear-text-muted" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">过期时间</p>
                    <p className="text-xs text-linear-text-muted">设置分享链接的有效期（天）</p>
                  </div>
                  <input
                    type="number"
                    value={expireDays}
                    onChange={(e) => setExpireDays(e.target.value)}
                    placeholder="永久"
                    min="1"
                    max="30"
                    className="w-16 px-2 py-1 bg-linear-bg border border-linear-border rounded text-sm text-center focus:outline-none focus:border-linear-purple"
                  />
                </label>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 p-5 border-t border-linear-border">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-linear-surface-hover transition-colors"
            >
              {shareResult ? '关闭' : '取消'}
            </button>
            {!shareResult && (
              <button
                onClick={handleCreate}
                disabled={isLoading || (hasPassword && !password)}
                className="px-4 py-2 bg-linear-purple hover:bg-linear-purple-dark text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? '创建中...' : '创建分享'}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
