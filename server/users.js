/**
 * RocMarks 自托管服务器 - 用户存储与密码工具
 * 零依赖（Node.js 内置模块），供 sync-server.js 与 add-user.js 共用
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const USERS_FILE = process.env.ROCMARKS_USERS_FILE || path.join(__dirname, 'users.json');

// 用户名规则：字母数字加 _ . -，长度 2-64
const USERNAME_RE = /^[A-Za-z0-9_.-]{2,64}$/;

function emptyStore() {
  return { version: 1, users: {} };
}

function loadUsers() {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.users !== 'object') {
      throw new Error('users.json 格式不正确');
    }
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') return emptyStore();
    throw error;
  }
}

// 原子写入：先写临时文件再重命名，避免写一半损坏
function saveUsers(store) {
  const dir = path.dirname(USERS_FILE);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = USERS_FILE + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(tmp, USERS_FILE);
}

// 用户名 -> 稳定的存储键（sha256 前 16 个十六进制字符，避免特殊字符进入文件名）
function userKey(username) {
  return crypto.createHash('sha256').update(username).digest('hex').slice(0, 16);
}

// scrypt 密码哈希
function hashPassword(password, saltHex) {
  return crypto.scryptSync(String(password), Buffer.from(saltHex, 'hex'), 32).toString('hex');
}

function makeSalt() {
  return crypto.randomBytes(16).toString('hex');
}

// 常数时间比较，防止时序侧信道
function verifyPassword(password, saltHex, expectedHashHex) {
  try {
    const actual = crypto.scryptSync(String(password), Buffer.from(saltHex, 'hex'), 32);
    const expected = Buffer.from(expectedHashHex, 'hex');
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch (error) {
    return false;
  }
}

// 创建新用户记录
function createUserRecord(username, password, nickname) {
  const salt = makeSalt();
  return {
    salt,
    hash: hashPassword(password, salt),
    nickname: nickname || username,
    userId: userKey(username),
    createdAt: Date.now(),
  };
}

module.exports = {
  USERS_FILE,
  USERNAME_RE,
  loadUsers,
  saveUsers,
  userKey,
  hashPassword,
  makeSalt,
  verifyPassword,
  createUserRecord,
};
