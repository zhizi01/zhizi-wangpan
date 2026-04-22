import { useState, useEffect } from 'react';
import { User, Cloud, Save, KeyRound, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { updateProfile, changePassword } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { formatFileSize } from '../utils/format';

export default function Settings() {
  const { user, fetchUser } = useAuthStore();
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMessage, setPwdMessage] = useState('');

  useEffect(() => {
    if (user?.nickname != null) setNickname(user.nickname);
    else if (user) setNickname('');
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage('');
    setSaving(true);
    try {
      const res = await updateProfile(nickname.trim() || null);
      if (res.success && res.data) {
        setProfileMessage('已保存');
        await fetchUser();
      }
    } catch (err: any) {
      setProfileMessage(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMessage('');
    if (newPassword !== confirmPassword) {
      setPwdMessage('两次新密码不一致');
      return;
    }
    if (newPassword.length < 6) {
      setPwdMessage('新密码至少 6 位');
      return;
    }
    setPwdSaving(true);
    try {
      const res = await changePassword(oldPassword, newPassword);
      if (res.success) {
        setPwdMessage('密码已更新');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPwdMessage(err.message || '修改失败');
    } finally {
      setPwdSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center text-linear-text-muted text-sm">加载中…</div>
    );
  }

  const pct = Math.min((user.storage_used / user.storage_limit) * 100, 100);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-purple/15">
          <User className="h-5 w-5 text-linear-purple" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">账户设置</h2>
          <p className="text-sm text-linear-text-muted">管理个人资料与登录安全</p>
        </div>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-linear-border bg-linear-surface p-6"
      >
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-linear-text">
          <Cloud className="h-4 w-4 text-linear-purple" />
          存储空间
        </h3>
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-linear-bg">
            <div
              className="h-full rounded-full bg-linear-purple transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="shrink-0 text-xs text-linear-text-muted">
            {formatFileSize(user.storage_used)} / {formatFileSize(user.storage_limit)}
          </span>
        </div>
        <p className="mt-2 text-xs text-linear-text-muted">上传文件会占用个人配额</p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border border-linear-border bg-linear-surface p-6"
      >
        <h3 className="mb-4 text-sm font-semibold">账号信息</h3>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-linear-text-muted">邮箱</label>
            <input
              type="text"
              readOnly
              value={user.email}
              className="w-full cursor-not-allowed rounded-lg border border-linear-border bg-linear-bg/80 px-3 py-2.5 text-sm text-linear-text-muted"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-linear-text-muted">昵称</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={64}
              placeholder="选填，最多 64 字"
              className="w-full rounded-lg border border-linear-border bg-linear-bg px-3 py-2.5 text-sm focus:border-linear-purple focus:outline-none focus:ring-1 focus:ring-linear-purple/40"
            />
          </div>
          {profileMessage && (
            <p
              className={`text-sm ${profileMessage === '已保存' ? 'text-green-400' : 'text-red-400'}`}
            >
              {profileMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-linear-purple px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-linear-purple-dark disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? '保存中…' : '保存资料'}
          </button>
        </form>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-linear-border bg-linear-surface p-6"
      >
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="h-4 w-4 text-linear-purple" />
          修改密码
        </h3>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div className="relative">
            <input
              type={showOld ? 'text' : 'password'}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="原密码"
              className="w-full rounded-lg border border-linear-border bg-linear-bg py-2.5 pl-3 pr-10 text-sm focus:border-linear-purple focus:outline-none"
              autoComplete="current-password"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-linear-text-muted"
              onClick={() => setShowOld((v) => !v)}
            >
              {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新密码（至少 6 位）"
              className="w-full rounded-lg border border-linear-border bg-linear-bg py-2.5 pl-3 pr-10 text-sm focus:border-linear-purple focus:outline-none"
              autoComplete="new-password"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-linear-text-muted"
              onClick={() => setShowNew((v) => !v)}
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="确认新密码"
            className="w-full rounded-lg border border-linear-border bg-linear-bg px-3 py-2.5 text-sm focus:border-linear-purple focus:outline-none"
            autoComplete="new-password"
          />
          {pwdMessage && (
            <p
              className={`text-sm ${
                pwdMessage.includes('已更新') || pwdMessage.includes('成功') ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {pwdMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={pwdSaving}
            className="rounded-lg border border-linear-border bg-linear-surface-hover px-4 py-2.5 text-sm font-medium transition-colors hover:bg-linear-surface disabled:opacity-60"
          >
            {pwdSaving ? '提交中…' : '更新密码'}
          </button>
        </form>
      </motion.section>
    </div>
  );
}
