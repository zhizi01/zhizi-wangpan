import { useState, useRef, useCallback } from 'react';
import { X, Upload, File as FileIcon } from 'lucide-react';
import { uploadFile } from '../../api/file';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadModalProps {
  parentId?: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadModal({ parentId, onClose, onSuccess }: UploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };
  
  const handleDragLeave = () => {
    setIsDragActive(false);
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };
  
  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };
  
  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    
    try {
      for (const file of files) {
        await uploadFile(file, parentId, (p) => {
          setProgress((prev) => ({ ...prev, [file.name]: p }));
        });
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('上传失败:', error);
    } finally {
      setUploading(false);
    }
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
          className="bg-linear-surface border border-linear-border rounded-2xl w-full max-w-lg overflow-hidden"
        >
          <div className="flex items-center justify-between p-5 border-b border-linear-border">
            <h3 className="text-lg font-semibold">上传文件</h3>
            <button onClick={onClose} className="text-linear-text-muted hover:text-linear-text transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-5 space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-linear-purple bg-linear-purple/5'
                  : 'border-linear-border hover:border-linear-purple/30 hover:bg-linear-surface-hover'
              }`}
            >
              <Upload className="w-8 h-8 mx-auto mb-3 text-linear-text-muted" />
              <p className="text-sm font-medium mb-1">拖拽文件到此处，或点击选择</p>
              <p className="text-xs text-linear-text-muted">支持单个或多个文件上传</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
            
            {files.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center gap-3 p-2.5 bg-linear-bg rounded-lg">
                    <FileIcon className="w-4 h-4 text-linear-text-muted flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{file.name}</p>
                      {uploading && progress[file.name] !== undefined && (
                        <div className="mt-1 w-full h-1 bg-linear-surface-hover rounded-full overflow-hidden">
                          <div
                            className="h-full bg-linear-purple rounded-full transition-all"
                            style={{ width: `${progress[file.name]}%` }}
                          />
                        </div>
                      )}
                    </div>
                    {!uploading && (
                      <button
                        onClick={() => removeFile(index)}
                        className="text-linear-text-muted hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 p-5 border-t border-linear-border">
            <button
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-linear-surface-hover transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className="px-4 py-2 bg-linear-purple hover:bg-linear-purple-dark text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {uploading ? '上传中...' : `上传 (${files.length})`}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
