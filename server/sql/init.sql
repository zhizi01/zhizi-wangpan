-- 云端文件管理系统 - 数据库初始化脚本

CREATE DATABASE IF NOT EXISTS zhizi_files
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE zhizi_files;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE COMMENT '邮箱，作为登录账号',
  password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
  nickname VARCHAR(100) DEFAULT NULL COMMENT '昵称',
  avatar VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
  storage_used BIGINT UNSIGNED DEFAULT 0 COMMENT '已用存储空间（字节）',
  storage_limit BIGINT UNSIGNED DEFAULT 10737418240 COMMENT '存储上限（字节），默认10GB',
  is_admin TINYINT DEFAULT 0 COMMENT '是否管理员',
  status TINYINT DEFAULT 1 COMMENT '状态：1正常 0禁用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 文件表
CREATE TABLE IF NOT EXISTS files (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL COMMENT '所属用户ID',
  parent_id BIGINT UNSIGNED DEFAULT NULL COMMENT '父文件夹ID，NULL为根目录',
  name VARCHAR(255) NOT NULL COMMENT '文件/文件夹名称',
  type ENUM('folder','file') NOT NULL DEFAULT 'file',
  mime_type VARCHAR(100) DEFAULT NULL COMMENT 'MIME类型',
  size BIGINT UNSIGNED DEFAULT 0 COMMENT '文件大小（字节）',
  storage_path VARCHAR(1000) DEFAULT NULL COMMENT '实际存储路径（相对uploads目录）',
  md5 VARCHAR(64) DEFAULT NULL COMMENT '文件MD5，用于秒传',
  is_public TINYINT DEFAULT 0 COMMENT '是否公开到广场：1是 0否',
  is_deleted TINYINT DEFAULT 0 COMMENT '是否已删除（软删除）',
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES files(id) ON DELETE CASCADE,
  INDEX idx_user_parent (user_id, parent_id, is_deleted),
  INDEX idx_md5 (md5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 分享表
CREATE TABLE IF NOT EXISTS shares (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL COMMENT '分享者ID',
  file_id BIGINT UNSIGNED NOT NULL COMMENT '分享的文件/文件夹ID',
  share_code VARCHAR(32) NOT NULL UNIQUE COMMENT '分享码（短链接）',
  require_login TINYINT DEFAULT 0 COMMENT '是否需要登录：1是 0否',
  access_password VARCHAR(255) DEFAULT NULL COMMENT '访问密码（可选）',
  expire_at TIMESTAMP NULL DEFAULT NULL COMMENT '过期时间（NULL为永久）',
  download_count INT UNSIGNED DEFAULT 0 COMMENT '下载次数',
  view_count INT UNSIGNED DEFAULT 0 COMMENT '浏览次数',
  status TINYINT DEFAULT 1 COMMENT '状态：1有效 0失效',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  INDEX idx_share_code (share_code),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 验证码表
CREATE TABLE IF NOT EXISTS verification_codes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL,
  type ENUM('register','reset_password') NOT NULL,
  expire_at TIMESTAMP NOT NULL COMMENT '过期时间',
  used_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_type (email, type, expire_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 系统设置表
CREATE TABLE IF NOT EXISTS settings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  `value` TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认设置
INSERT INTO settings (`key`, `value`) VALUES
('allow_register', 'true'),
('admin_emails', ''),
('site_name', '云端文件管理'),
('max_file_size', '2147483648'),
('storage_limit_per_user', '10737418240')
ON DUPLICATE KEY UPDATE `key`=`key`;
