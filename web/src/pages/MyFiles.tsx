import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, FolderPlus, Trash2, Edit3, Share2, Globe, ChevronRight, Home, Folder, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFiles, createFolder, deleteFile, renameFile, togglePublic } from '../api/file';
import { FileItem } from '../types';
import { useFileStore } from '../stores/fileStore';
import { useAuthStore } from '../stores/authStore';
import FileItemComponent from '../components/file/FileItem';
import UploadModal from '../components/file/UploadModal';
import ShareModal from '../components/file/ShareModal';
import DeleteConfirmDialog from '../components/file/DeleteConfirmDialog';
import { normalizeFileType } from '../utils/fileKind';
import { downloadToBrowser, getPrivateFileDownloadPath } from '../utils/download';

export default function MyFiles() {
  const { fetchUser } = useAuthStore();
  const {
    files,
    currentFolder,
    breadcrumbs,
    setFiles,
    setCurrentFolder,
    addBreadcrumb,
    popBreadcrumb,
    setLoading,
    isLoading,
    selectedFiles,
    clearSelection,
  } = useFileStore();
  
  const [showUpload, setShowUpload] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileItem } | null>(null);
  const [renamingFile, setRenamingFile] = useState<FileItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [shareFile, setShareFile] = useState<FileItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFiles(currentFolder);
      if (res.success) {
        setFiles(res.data ?? []);
      }
    } catch (error) {
      console.error('加载文件失败:', error);
    } finally {
      setLoading(false);
    }
  }, [currentFolder, setFiles, setLoading]);
  
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);
  
  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
      clearSelection();
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [clearSelection]);
  
  const handleDoubleClick = (file: FileItem) => {
    if (normalizeFileType(file.type, file.mime_type) === 'folder') {
      setCurrentFolder(file.id);
      addBreadcrumb({ id: file.id, name: file.name });
    }
  };
  
  const handleBreadcrumbClick = (index: number) => {
    popBreadcrumb(index);
  };
  
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await createFolder(newFolderName.trim(), currentFolder);
      if (!res.success) return;
      setShowNewFolder(false);
      setNewFolderName('');
      await loadFiles();
    } catch (error) {
      console.error('创建文件夹失败:', error);
    }
  };

  const openDeleteDialog = (file: FileItem) => {
    setDeleteTarget(file);
  };

  const performDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteFile(deleteTarget.id);
      setDeleteTarget(null);
      clearSelection();
      await loadFiles();
      fetchUser();
    } catch (error) {
      console.error('删除失败:', error);
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleRename = async (file: FileItem) => {
    setRenamingFile(file);
    setRenameValue(file.name);
  };
  
  const submitRename = async () => {
    if (!renamingFile || !renameValue.trim()) return;
    try {
      await renameFile(renamingFile.id, renameValue.trim());
      setRenamingFile(null);
      loadFiles();
    } catch (error) {
      console.error('重命名失败:', error);
    }
  };
  
  const handleTogglePublic = async (file: FileItem) => {
    try {
      await togglePublic(file.id, file.is_public !== 1);
      loadFiles();
    } catch (error) {
      console.error('操作失败:', error);
    }
  };

  const handleDownloadFile = async (file: FileItem) => {
    if (normalizeFileType(file.type, file.mime_type) !== 'file') return;
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
  };
  
  const handleContextMenu = (e: React.MouseEvent, file: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  };
  
  const selectedFile = selectedFiles.length === 1 ? files.find((f) => f.id === selectedFiles[0]) : null;
  
  return (
    <div ref={containerRef} className="h-full" onClick={() => clearSelection()}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowUpload(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-linear-purple hover:bg-linear-purple-dark text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4" />
            上传文件
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowNewFolder(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-linear-surface hover:bg-linear-surface-hover border border-linear-border rounded-lg text-sm font-medium transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            新建文件夹
          </button>
          
          {selectedFile && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handleRename(selectedFile); }}
                className="flex items-center gap-2 px-3 py-2 bg-linear-surface hover:bg-linear-surface-hover border border-linear-border rounded-lg text-sm transition-colors"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); openDeleteDialog(selectedFile); }}
                className="flex items-center gap-2 px-3 py-2 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 rounded-lg text-sm text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              {normalizeFileType(selectedFile.type, selectedFile.mime_type) === 'file' && (
                <>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDownloadFile(selectedFile); }}
                    className="flex items-center gap-2 px-3 py-2 bg-linear-surface hover:bg-linear-surface-hover border border-linear-border rounded-lg text-sm transition-colors"
                    title="下载"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShareFile(selectedFile); }}
                    className="flex items-center gap-2 px-3 py-2 bg-linear-surface hover:bg-linear-surface-hover border border-linear-border rounded-lg text-sm transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* 面包屑 */}
      <div className="flex items-center gap-1 text-sm text-linear-text-muted mb-4">
        {breadcrumbs.map((item, index) => (
          <span key={item.id ?? 'root'} className="flex items-center">
            {index > 0 && <ChevronRight className="w-4 h-4 mx-1" />}
            <button
              onClick={(e) => { e.stopPropagation(); handleBreadcrumbClick(index); }}
              className={`hover:text-linear-text transition-colors ${
                index === breadcrumbs.length - 1 ? 'text-linear-text font-medium' : ''
              }`}
            >
              {index === 0 ? <Home className="w-4 h-4" /> : item.name}
            </button>
          </span>
        ))}
      </div>
      
      {/* 新建文件夹输入 */}
      <AnimatePresence>
        {showNewFolder && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <div className="flex items-center gap-2 p-3 bg-linear-surface border border-linear-border rounded-xl">
              <FolderPlus className="w-5 h-5 text-yellow-400" />
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                placeholder="输入文件夹名称"
                autoFocus
                className="flex-1 bg-transparent text-sm focus:outline-none"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => { e.stopPropagation(); handleCreateFolder(); }}
                className="px-3 py-1.5 bg-linear-purple text-white rounded-lg text-xs font-medium"
              >
                确认
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowNewFolder(false); }}
                className="px-3 py-1.5 text-linear-text-muted hover:text-linear-text text-xs"
              >
                取消
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 文件列表：空状态与有内容共用同一区域，避免从「空」到「首条」时整段切换导致新文件夹不显示 */}
      <div className="relative min-h-64" key={currentFolder === null ? 'root' : `folder-${currentFolder}`}>
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-linear-bg/60 backdrop-blur-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-linear-purple border-t-transparent" />
          </div>
        )}
        {files.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-linear-text-muted">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-surface">
              <Folder className="h-8 w-8" />
            </div>
            <p className="text-sm">文件夹为空</p>
            <p className="mt-1 text-xs">点击上方按钮上传文件或创建文件夹</p>
          </div>
        ) : files.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 animate-stagger sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {files.map((file) => (
              <div key={file.id}>
                {renamingFile?.id === file.id ? (
                  <div className="rounded-xl border border-linear-purple/40 bg-linear-surface p-3">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitRename();
                        if (e.key === 'Escape') setRenamingFile(null);
                      }}
                      autoFocus
                      className="w-full rounded-lg border border-linear-border bg-linear-bg px-2 py-1.5 text-sm focus:border-linear-purple focus:outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setRenamingFile(null); }}
                        className="text-xs text-linear-text-muted hover:text-linear-text"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); submitRename(); }}
                        className="text-xs font-medium text-linear-purple"
                      >
                        确认
                      </button>
                    </div>
                  </div>
                ) : (
                  <FileItemComponent
                    file={file}
                    onDoubleClick={handleDoubleClick}
                    onContextMenu={handleContextMenu}
                  />
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      
      {/* 右键菜单 */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed z-50 w-48 bg-linear-surface border border-linear-border rounded-xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-1">
              <button
                onClick={() => { handleRename(contextMenu.file); setContextMenu(null); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-linear-surface-hover transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                重命名
              </button>
              <button
                onClick={() => { openDeleteDialog(contextMenu.file); setContextMenu(null); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-red-400/10 text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
              {normalizeFileType(contextMenu.file.type, contextMenu.file.mime_type) === 'file' && (
                <>
                  <button
                    type="button"
                    onClick={() => { handleDownloadFile(contextMenu.file); setContextMenu(null); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-linear-surface-hover transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    下载
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShareFile(contextMenu.file); setContextMenu(null); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-linear-surface-hover transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    分享
                  </button>
                  <button
                    onClick={() => { handleTogglePublic(contextMenu.file); setContextMenu(null); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-linear-surface-hover transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    {contextMenu.file.is_public === 1 ? '从广场下架' : '发布到广场'}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 上传弹窗 */}
      {showUpload && <UploadModal parentId={currentFolder} onClose={() => setShowUpload(false)} onSuccess={loadFiles} />}
      
      {/* 分享弹窗 */}
      {shareFile && <ShareModal file={shareFile} onClose={() => setShareFile(null)} />}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        name={deleteTarget?.name ?? ''}
        isDeleting={isDeleting}
        onConfirm={performDelete}
      />
    </div>
  );
}
