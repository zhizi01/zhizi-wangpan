import { NavLink } from 'react-router-dom';
import { HardDrive, Globe, Settings, Cloud, LogOut, UserCog } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  
  const navItems = [
    { to: '/', icon: HardDrive, label: '我的文件' },
    { to: '/square', icon: Globe, label: '共享广场' },
    { to: '/settings', icon: UserCog, label: '账户设置' },
  ];
  
  if (user?.is_admin) {
    navItems.push({ to: '/admin', icon: Settings, label: '系统管理' });
  }
  
  return (
    <aside className="w-64 bg-linear-surface border-r border-linear-border flex flex-col">
      <div className="p-5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-linear-purple flex items-center justify-center">
          <Cloud className="w-5 h-5 text-white" />
        </div>
        <span className="font-semibold text-lg tracking-tight">云端文件</span>
      </div>
      
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-linear-purple/10 text-linear-purple'
                  : 'text-linear-text-muted hover:bg-linear-surface-hover hover:text-linear-text'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-linear-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-linear-purple/20 flex items-center justify-center text-linear-purple text-sm font-medium">
            {user?.nickname?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.nickname || user?.email}</p>
            <p className="text-xs text-linear-text-muted truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-linear-text-muted hover:bg-linear-surface-hover hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          退出登录
        </button>
      </div>
    </aside>
  );
}
