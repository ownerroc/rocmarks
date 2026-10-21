/**
 * RocMarks 自托管同步服务器（零依赖）
 *
 * 与 RocMarks 扩展使用的 API 完全兼容：
 *   GET  /api/health            - 健康检查
 *   POST /api/auth              - 登录 {username, password} -> {token, ...}
 *   POST /api/bookmark_upload   - 上传书签（Bearer token）{bookmarks, timestamp, overwrite?}
 *   GET  /api/bookmark_download - 下载书签（Bearer token）
 *
 * 环境变量：
 *   PORT                     监听端口（默认 3000）
 *   ROCMARKS_USERS_FILE      用户库文件（默认 server/users.json）
 *   ROCMARKS_DATA_DIR        书签数据目录（默认 server/data）
 *   ROCMARKS_ALLOWED_ORIGINS 额外允许的 CORS 来源，逗号分隔
 *
 * 用户管理见 server/add-user.js；部署说明见 SELF_HOSTED.md
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { loadUsers, verifyPassword, userKey } = require('./users');

// 配置
const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = process.env.ROCMARKS_DATA_DIR || path.join(__dirname, 'data');
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // token 24 小时过期
const MAX_BODY_BYTES = 20 * 1024 * 1024;  // 请求体上限 20MB
const EXTRA_ORIGINS = (process.env.ROCMARKS_ALLOWED_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

// ---------- token（内存存储；重启后需重新登录） ----------
const tokens = new Map();

function issueToken(username) {
  const token = crypto.randomBytes(32).toString('hex');
  tokens.set(token, { username, createdAt: Date.now() });
  return token;
}

function validateToken(token) {
  if (!token) return null;
  const data = tokens.get(token);
  if (!data) return null;
  if (Date.now() - data.createdAt > TOKEN_TTL_MS) {
    tokens.delete(token);
    return null;
  }
  return data.username;
}

function tokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length);
}

// ---------- 书签数据（每个用户一个 JSON 文件） ----------
function dataPath(username) {
  return path.join(DATA_DIR, userKey(username) + '.json');
}

function readBookmarks(username) {
  try {
    return JSON.parse(fs.readFileSync(dataPath(username), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function writeBookmarks(username, payload) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = dataPath(username) + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(payload));
  fs.renameSync(tmp, dataPath(username));
}

// ---------- CORS ----------
// 扩展来源（chrome-extension:// / moz-extension://）自动放行，
// 其他来源需通过 ROCMARKS_ALLOWED_ORIGINS 显式添加
function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (/^chrome-extension:\/\//i.test(origin) || /^moz-extension:\/\//i.test(origin)) return true;
  return EXTRA_ORIGINS.includes(origin);
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}

// ---------- 工具 ----------
function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('payload too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        reject(Object.assign(new Error('invalid JSON'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function countBookmarks(nodes) {
  let count = 0;
  for (const node of nodes || []) {
    if (node.url) count++;
    if (node.children) count += countBookmarks(node.children);
  }
  return count;
}

function log(method, pathname, statusCode) {
  console.log(`${new Date().toISOString()} ${method} ${pathname} -> ${statusCode}`);
}

// ---------- HTTP 服务器 ----------
const server = http.createServer(async (req, res) => {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const pathname = (req.url || '/').split('?')[0];

  try {
    // 健康检查
    if (pathname === '/api/health' && req.method === 'GET') {
      sendJson(res, 200, { ok: true, service: 'rocmarks-sync', version: '1.0.0' });
      log(req.method, pathname, 200);
      return;
    }

    // 登录
    if (pathname === '/api/auth' && req.method === 'POST') {
      const body = await readBody(req);
      const { username, password } = body || {};
      const store = loadUsers();
      const record = username ? store.users[String(username)] : null;

      if (!record || !verifyPassword(password || '', record.salt, record.hash)) {
        sendJson(res, 401, { success: false, message: 'invalid username or password' });
        log(req.method, pathname, 401);
        return;
      }

      const token = issueToken(String(username));
      sendJson(res, 200, {
        success: true,
        token,
        nickname: record.nickname,
        avatar: '',
        userId: record.userId,
      });
      log(req.method, pathname, 200);
      return;
    }

    // 以下接口均需要 token
    const username = validateToken(tokenFromRequest(req));
    if (!username) {
      sendJson(res, 401, { success: false, message: 'unauthorized or token expired' });
      log(req.method, pathname, 401);
      return;
    }

    // 上传书签
    if (pathname === '/api/bookmark_upload' && req.method === 'POST') {
      const body = await readBody(req);
      if (!Array.isArray(body.bookmarks)) {
        sendJson(res, 400, { success: false, message: 'bookmarks must be an array' });
        log(req.method, pathname, 400);
        return;
      }

      const existing = readBookmarks(username);
      const uploadedTs = typeof body.timestamp === 'number' ? body.timestamp : Date.now();
      const cloudTs = existing && typeof existing.timestamp === 'number' ? existing.timestamp : null;

      // 冲突保护：云端数据更新且未勾选“覆盖云端”时拒绝上传
      if (cloudTs !== null && uploadedTs < cloudTs && body.overwrite !== true) {
        sendJson(res, 200, {
          success: false,
          message: 'cloud data is newer; enable "Overwrite cloud" to force upload',
        });
        log(req.method, pathname, 200);
        return;
      }

      writeBookmarks(username, {
        bookmarks: body.bookmarks,
        timestamp: uploadedTs,
        updatedAt: Date.now(),
      });

      sendJson(res, 200, {
        success: true,
        message: 'bookmarks uploaded',
        count: countBookmarks(body.bookmarks),
      });
      log(req.method, pathname, 200);
      return;
    }

    // 下载书签
    if (pathname === '/api/bookmark_download' && req.method === 'GET') {
      const data = readBookmarks(username);
      if (!data) {
        sendJson(res, 200, { success: true, bookmarks: [], message: 'no cloud bookmarks yet' });
      } else {
        sendJson(res, 200, { success: true, bookmarks: data.bookmarks, timestamp: data.timestamp });
      }
      log(req.method, pathname, 200);
      return;
    }

    sendJson(res, 404, { success: false, message: 'not found' });
    log(req.method, pathname, 404);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    sendJson(res, statusCode, { success: false, message: error.message || 'internal error' });
    log(req.method, pathname, statusCode);
  }
});

server.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('RocMarks 自托管同步服务器 v1.0.0');
  console.log('='.repeat(60));
  console.log(`监听: http://0.0.0.0:${PORT}`);
  console.log(`用户库: ${require('./users').USERS_FILE}`);
  console.log(`数据目录: ${DATA_DIR}`);
  console.log('接口: GET /api/health | POST /api/auth | POST /api/bookmark_upload | GET /api/bookmark_download');
  console.log('添加用户: node server/add-user.js <username>');
  console.log('='.repeat(60));
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});
