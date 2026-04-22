import { useState, useEffect, useCallback } from 'react';
import { Users, Settings, ToggleLeft, ToggleRight, Save, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  getSettings,
  updateSettings,
  getSystemEnv,
  updateSystemEnv,
  SYSTEM_ENV_KEYS,
  type SystemEnvResponse,
} from '../api/admin';
import { formatFileSize, formatDate } from '../utils/format';

const getUsersList = async () => {
  const res = await fetch('/api/admin/users', {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });
  return res.json();
};

function buildEnvPayload(meta: SystemEnvResponse, form: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of SYSTEM_ENV_KEYS) {
    const m = meta.values[key];
    if (!m) continue;
    const v = form[key] ?? '';
    if (m.isSecret) {
      if (v === '********' || v === '****') {
        out[key] = '********';
        continue;
      }
      if (v === '' && !m.isSet) continue;
      out[key] = v;
    } else {
      if (v === '' && !m.isSet) continue;
      out[key] = v;
    }
  }
  return out;
}

function initEnvForm(data: SystemEnvResponse): Record<string, string> {
  const f: Record<string, string> = {};
  for (const key of SYSTEM_ENV_KEYS) {
    const m = data.values[key];
    if (!m) {
      f[key] = '';
      continue;
    }
    if (m.isSecret) {
      f[key] = m.isSet ? '********' : '';
    } else {
      f[key] = m.display;
    }
  }
  return f;
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'settings' | 'users'>('settings');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingBusiness, setIsSavingBusiness] = useState(false);
  const [envMeta, setEnvMeta] = useState<SystemEnvResponse | null>(null);
  const [envForm, setEnvForm] = useState<Record<string, string>>({});
  const [envLoadError, setEnvLoadError] = useState<string | null>(null);
  const [isSavingEnv, setIsSavingEnv] = useState(false);
  const [envSaveHint, setEnvSaveHint] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const res = await getSettings();
      if (res.success && res.data) {
        setSettings(res.data);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  }, []);

  const loadSystemEnv = useCallback(async () => {
    setEnvLoadError(null);
    try {
      const res = await getSystemEnv();
      if (res.success && res.data) {
        setEnvMeta(res.data);
        setEnvForm(initEnvForm(res.data));
      } else {
        setEnvLoadError(res.message || '无法加载环境配置');
      }
    } catch (e: any) {
      setEnvLoadError(e?.message || '无法加载环境配置');
    }
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await getUsersList();
      if (res.success && res.data) {
        setUsers(res.data.list || []);
      }
    } catch (error) {
      console.error('加载用户失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    loadUsers();
    loadSystemEnv();
  }, [loadSettings, loadSystemEnv]);

  const handleToggleRegister = async () => {
    const newValue = settings.allow_register === 'true' ? 'false' : 'true';
    try {
      await updateSettings({ allow_register: newValue });
      setSettings((prev) => ({ ...prev, allow_register: newValue }));
    } catch (error) {
      console.error('更新设置失败:', error);
    }
  };

  const saveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBusiness(true);
    setEnvSaveHint(null);
    try {
      await updateSettings({
        site_name: settings.site_name ?? '',
        admin_emails: settings.admin_emails ?? '',
        max_file_size: String(parseInt(String(settings.max_file_size || '0'), 10) || 0),
        storage_limit_per_user: String(parseInt(String(settings.storage_limit_per_user || '0'), 10) || 0),
      });
      setEnvSaveHint('业务设置已保存。');
      await loadSettings();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingBusiness(false);
    }
  };

  const saveEnv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!envMeta) return;
    setIsSavingEnv(true);
    setEnvSaveHint(null);
    try {
      const body = buildEnvPayload(envMeta, envForm);
      const res = await updateSystemEnv(body);
      if (res.success) {
        setEnvSaveHint(
          res.message || '已保存。请重启后端服务后，新的环境变量才会在进程中生效。'
        );
        await loadSystemEnv();
      }
    } catch (e: any) {
      setEnvLoadError(e?.message || '保存失败');
    } finally {
      setIsSavingEnv(false);
    }
  };

  return (
    <div className="h-full">
      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'settings'
              ? 'bg-linear-purple/10 text-linear-purple'
              : 'text-linear-text-muted hover:text-linear-text'
          }`}
        >
          <Settings className="w-4 h-4" />
          系统设置
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'users'
              ? 'bg-linear-purple/10 text-linear-purple'
              : 'text-linear-text-muted hover:text-linear-text'
          }`}
        >
          <Users className="w-4 h-4" />
          用户管理
        </button>
      </div>

      {activeTab === 'settings' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 max-w-3xl"
        >
          {envSaveHint && (
            <div className="text-sm text-linear-text-muted border border-linear-border/60 rounded-lg px-3 py-2 bg-linear-bg/50">
              {envSaveHint}
            </div>
          )}

          <div>
            <h2 className="text-xs font-semibold text-linear-text-muted uppercase tracking-wider mb-3">
              业务设置（数据库存储，保存后立即用于读库逻辑）
            </h2>
            <form onSubmit={saveBusiness} className="space-y-4">
              <div className="bg-linear-surface border border-linear-border rounded-xl p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-medium mb-1">开放注册</h3>
                    <p className="text-xs text-linear-text-muted">允许新用户通过邮箱注册账户</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleRegister}
                    className="text-linear-purple hover:text-linear-purple-dark transition-colors shrink-0"
                  >
                    {settings.allow_register === 'true' ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-linear-text-muted" />
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-linear-surface border border-linear-border rounded-xl p-5 space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1">管理员邮箱</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-linear-border bg-linear-bg text-sm font-mono"
                    value={settings.admin_emails ?? ''}
                    onChange={(e) => setSettings((s) => ({ ...s, admin_emails: e.target.value }))}
                    placeholder="admin1@example.com, admin2@example.com"
                  />
                  <p className="text-xs text-linear-text-muted mt-1">
                    在 settings 表项 <code className="text-[11px]">admin_emails</code> 中配置；英文逗号、分号或换行分隔，不区分大小写。与
                    用户表 <code className="text-[11px]">is_admin</code> 列无关。改后立即生效，无需重登。首次部署请先在数据库中写入至少一个邮箱再进入后台。
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">站点名称</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-lg border border-linear-border bg-linear-bg text-sm"
                    value={settings.site_name ?? ''}
                    onChange={(e) => setSettings((s) => ({ ...s, site_name: e.target.value }))}
                    placeholder="云端文件管理"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">单文件大小限制（字节）</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full px-3 py-2 rounded-lg border border-linear-border bg-linear-bg text-sm"
                    value={settings.max_file_size || ''}
                    onChange={(e) => setSettings((s) => ({ ...s, max_file_size: e.target.value }))}
                  />
                  <p className="text-xs text-linear-text-muted mt-1">
                    约 {formatFileSize(parseInt(String(settings.max_file_size || '0'), 10) || 0)}（实际上传上限仍取决于服务端进程内的 MAX_FILE_SIZE，需改 .env 并重启）
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">用户默认存储空间（字节）</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full px-3 py-2 rounded-lg border border-linear-border bg-linear-bg text-sm"
                    value={settings.storage_limit_per_user || ''}
                    onChange={(e) => setSettings((s) => ({ ...s, storage_limit_per_user: e.target.value }))}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSavingBusiness}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-linear-purple text-white text-sm font-medium disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSavingBusiness ? '保存中…' : '保存业务设置'}
                </button>
              </div>
            </form>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-linear-text-muted uppercase tracking-wider mb-2">
              运行环境（.env 文件，白名单键）
            </h2>
            <div className="flex items-start gap-2 mb-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-amber-200/90 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">保存后请重启后端服务</p>
                <p className="text-xs mt-1 text-linear-text-muted">
                  修改会写入与启动时 `loadEnv` 相同的 .env
                  路径。进程在启动时已读取的环境变量不会自动刷新，需重启后生效。请勿在响应或日志中泄露密文。
                </p>
              </div>
            </div>
            {envLoadError && (
              <p className="text-sm text-red-400 mb-2">{envLoadError}</p>
            )}
            {envMeta && (
              <p className="text-xs text-linear-text-muted mb-3 break-all">
                当前写入路径: {envMeta.filePath}
                {envMeta.readPath && envMeta.readPath !== envMeta.filePath && (
                  <span> · 读取: {envMeta.readPath}</span>
                )}
              </p>
            )}
            {envMeta && (
              <form onSubmit={saveEnv} className="space-y-3">
                <div className="bg-linear-surface border border-linear-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-linear-border text-linear-text-muted bg-linear-bg/30">
                        <th className="text-left px-3 py-2 font-medium w-[28%]">键</th>
                        <th className="text-left px-3 py-2 font-medium">值</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SYSTEM_ENV_KEYS.map((key) => {
                        const m = envMeta.values[key];
                        return (
                          <tr key={key} className="border-b border-linear-border/50">
                            <td className="px-3 py-2 align-top font-mono text-xs text-linear-text-muted">
                              {key}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type={m?.isSecret ? 'password' : 'text'}
                                autoComplete="off"
                                className="w-full px-2 py-1.5 rounded border border-linear-border bg-linear-bg text-xs font-mono"
                                value={envForm[key] ?? ''}
                                onChange={(e) =>
                                  setEnvForm((f) => ({ ...f, [key]: e.target.value }))
                                }
                                placeholder={m?.isSecret ? (m.isSet ? '已设置，留 ****** 不修改' : '未设置') : ''}
                              />
                              {key === 'VITE_API_BASE_URL' && (
                                <p className="text-[11px] text-linear-text-muted mt-1">
                                  仅影响本地 `vite` 开发构建；已部署的静态前端需重新构建，不会随此保存自动更新。
                                </p>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <button
                  type="submit"
                  disabled={isSavingEnv}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-linear-border text-sm font-medium hover:bg-linear-bg/80 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSavingEnv ? '保存中…' : '保存 .env 配置'}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'users' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin h-8 w-8 border-2 border-linear-purple border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="bg-linear-surface border border-linear-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-linear-border text-linear-text-muted">
                    <th className="text-left px-5 py-3 font-medium">邮箱</th>
                    <th className="text-left px-5 py-3 font-medium">昵称</th>
                    <th className="text-left px-5 py-3 font-medium">已用空间</th>
                    <th className="text-left px-5 py-3 font-medium">注册时间</th>
                    <th className="text-left px-5 py-3 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-linear-border/50 hover:bg-linear-bg/50 transition-colors"
                    >
                      <td className="px-5 py-3">{user.email}</td>
                      <td className="px-5 py-3">{user.nickname || '-'}</td>
                      <td className="px-5 py-3">
                        {formatFileSize(user.storage_used)} / {formatFileSize(user.storage_limit)}
                      </td>
                      <td className="px-5 py-3 text-linear-text-muted">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            user.status === 1
                              ? 'bg-green-400/10 text-green-400'
                              : 'bg-red-400/10 text-red-400'
                          }`}
                        >
                          {user.status === 1 ? '正常' : '禁用'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
