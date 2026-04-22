import { useState, useEffect } from 'react';
import { Search, Download, User, File as FileIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { getPublicSquare } from '../api/file';
import { formatFileSize, formatDate } from '../utils/format';
import { downloadToBrowser, getPrivateFileDownloadPath } from '../utils/download';

export default function PublicSquare() {
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  
  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const res = await getPublicSquare(page, search || undefined);
      if (res.success && res.data) {
        setFiles(res.data);
      }
    } catch (error) {
      console.error('加载广场文件失败:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadFiles();
  }, [page]);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadFiles();
  };
  
  return (
    <div className="h-full">
      <form onSubmit={handleSearch} className="flex items-center gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-linear-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索文件..."
            className="w-full pl-9 pr-4 py-2.5 bg-linear-surface border border-linear-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-linear-purple/50 focus:border-linear-purple transition-all"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 bg-linear-purple hover:bg-linear-purple-dark text-white rounded-lg text-sm font-medium transition-colors"
        >
          搜索
        </button>
      </form>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-2 border-linear-purple border-t-transparent rounded-full" />
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-linear-text-muted">
          <div className="w-16 h-16 rounded-2xl bg-linear-surface flex items-center justify-center mb-4">
            <FileIcon className="w-8 h-8" />
          </div>
          <p className="text-sm">暂无公开文件</p>
          <p className="text-xs mt-1">前往"我的文件"页面将文件发布到广场</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file, index) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="flex items-center gap-4 p-4 bg-linear-surface border border-linear-border rounded-xl hover:border-linear-purple/20 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-linear-bg flex items-center justify-center flex-shrink-0">
                <FileIcon className="w-5 h-5 text-linear-purple" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-linear-text-muted flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {file.user_nickname || '未知用户'}
                  </span>
                  <span className="text-xs text-linear-text-muted">{formatFileSize(file.size)}</span>
                  <span className="text-xs text-linear-text-muted">{formatDate(file.created_at)}</span>
                </div>
              </div>
              
              <button
                type="button"
                title="下载"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await downloadToBrowser({
                      path: getPrivateFileDownloadPath(file.id),
                      fileName: file.name,
                      includeAuth: true,
                    });
                  } catch (err) {
                    console.error(err);
                    alert(err instanceof Error ? err.message : '下载失败');
                  }
                }}
                className="p-2 rounded-lg hover:bg-linear-purple/10 text-linear-text-muted hover:text-linear-purple transition-colors opacity-0 group-hover:opacity-100"
              >
                <Download className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
