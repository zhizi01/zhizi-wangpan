import { useLocation } from 'react-router-dom';
import { useFileStore } from '../../stores/fileStore';
import { useAuthStore } from '../../stores/authStore';
import { formatFileSize } from '../../utils/format';

export default function Header() {
  const location = useLocation();
  const { breadcrumbs } = useFileStore();
  const { user } = useAuthStore();
  
  const getTitle = () => {
    if (location.pathname === '/square') return '共享广场';
    if (location.pathname === '/admin') return '系统管理';
    if (location.pathname === '/settings') return '账户设置';
    return '我的文件';
  };
  
  return (
    <header className="h-16 border-b border-linear-border bg-linear-surface/50 backdrop-blur-sm flex items-center justify-between px-6">
      <div>
        <h1 className="text-lg font-semibold">{getTitle()}</h1>
        {location.pathname === '/' && breadcrumbs.length > 1 && (
          <div className="flex items-center gap-1 text-xs text-linear-text-muted mt-0.5">
            {breadcrumbs.map((item, index) => (
              <span key={item.id ?? 'root'}>
                {index > 0 && <span className="mx-1">/</span>}
                {item.name}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {user && (
        <div className="flex items-center gap-3 text-xs text-linear-text-muted">
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-linear-surface-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-purple rounded-full transition-all"
                style={{
                  width: `${Math.min((user.storage_used / user.storage_limit) * 100, 100)}%`,
                }}
              />
            </div>
            <span>
              {formatFileSize(user.storage_used)} / {formatFileSize(user.storage_limit)}
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
