import { FileItem as FileItemType } from '../../types';
import { Folder, File, Image, Video, Music, FileText, Archive, Table, Presentation } from 'lucide-react';
import { formatFileSize, formatDate } from '../../utils/format';
import { normalizeFileType } from '../../utils/fileKind';
import { useFileStore } from '../../stores/fileStore';

interface FileItemProps {
  file: FileItemType;
  onDoubleClick?: (file: FileItemType) => void;
  onContextMenu?: (e: React.MouseEvent, file: FileItemType) => void;
}

function getIconComponent(fileKind: 'folder' | 'file', mimeType?: string | null) {
  if (fileKind === 'folder') return Folder;
  if (!mimeType) return File;
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Video;
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType.includes('pdf')) return FileText;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return Archive;
  if (mimeType.includes('xls') || mimeType.includes('excel') || mimeType.includes('sheet')) return Table;
  if (mimeType.includes('ppt') || mimeType.includes('presentation')) return Presentation;
  return File;
}

function getIconColor(fileKind: 'folder' | 'file', mimeType?: string | null): string {
  if (fileKind === 'folder') return 'text-yellow-400';
  if (!mimeType) return 'text-linear-text-muted';
  if (mimeType.startsWith('image/')) return 'text-purple-400';
  if (mimeType.startsWith('video/')) return 'text-red-400';
  if (mimeType.startsWith('audio/')) return 'text-pink-400';
  if (mimeType.includes('pdf')) return 'text-red-300';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'text-amber-400';
  if (mimeType.includes('doc') || mimeType.includes('word')) return 'text-blue-400';
  return 'text-linear-text-muted';
}

export default function FileItemComponent({ file, onDoubleClick, onContextMenu }: FileItemProps) {
  const { selectedFiles, toggleSelectedFile } = useFileStore();
  const isSelected = selectedFiles.includes(file.id);
  const fileKind = normalizeFileType(file.type, file.mime_type);
  const Icon = getIconComponent(fileKind, file.mime_type);
  const iconColor = getIconColor(fileKind, file.mime_type);
  
  return (
    <div
      onDoubleClick={() => onDoubleClick?.(file)}
      onContextMenu={(e) => onContextMenu?.(e, file)}
      onClick={(e) => {
        e.stopPropagation();
        toggleSelectedFile(file.id);
      }}
      className={`group relative p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'bg-linear-purple/10 border-linear-purple/40'
          : 'bg-linear-surface border-linear-border hover:border-linear-purple/20 hover:bg-linear-surface-hover'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg bg-linear-bg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" title={file.name}>
            {file.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-linear-text-muted">
              {fileKind === 'folder' ? '文件夹' : formatFileSize(file.size)}
            </span>
            <span className="text-xs text-linear-text-muted/50">
              {formatDate(file.created_at)}
            </span>
          </div>
        </div>
        
        {file.is_public === 1 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-linear-purple/10 text-linear-purple font-medium">
            公开
          </span>
        )}
      </div>
    </div>
  );
}
