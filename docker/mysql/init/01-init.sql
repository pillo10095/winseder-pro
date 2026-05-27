-- Wisender Pro - Initial Database Setup
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS wisender_pro
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- User already created via docker-compose environment variables
-- GRANT ALL PRIVILEGES ON wisender_pro.* TO 'wisender'@'%';
-- FLUSH PRIVILEGES;
