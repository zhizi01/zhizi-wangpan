import fs from 'fs';
import { Request, Response } from 'express';

/**
 * 以 attachment 流式输出文件，支持单段 Range: bytes=start-end，便于断点续传/分片。
 */
export function sendFileWithRange(
  filePath: string,
  fileNameForDownload: string,
  mimeType: string | null,
  req: Request,
  res: Response
): void {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileNameForDownload)}"`);
  res.setHeader('Content-Type', mimeType || 'application/octet-stream');
  res.setHeader('Accept-Ranges', 'bytes');

  if (!range) {
    res.setHeader('Content-Length', fileSize);
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const m = /^bytes=(\d+)-(\d*)$/.exec(String(range).trim());
  if (!m) {
    res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
    return;
  }

  const start = parseInt(m[1], 10);
  let end = m[2] ? parseInt(m[2], 10) : fileSize - 1;
  if (Number.isNaN(start) || start < 0 || start >= fileSize) {
    res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
    return;
  }
  end = Math.min(end, fileSize - 1);
  if (start > end) {
    res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
    return;
  }

  const chunkSize = end - start + 1;
  res.status(206);
  res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
  res.setHeader('Content-Length', chunkSize);
  fs.createReadStream(filePath, { start, end }).pipe(res);
}
