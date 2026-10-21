#!/usr/bin/env node
/**
 * RocMarks 自托管服务器 - 用户管理 CLI
 *
 * 用法：
 *   node server/add-user.js <username> [nickname]   添加用户
 *   node server/add-user.js --list                  列出所有用户
 *   node server/add-user.js --delete <username>     删除用户
 *
 * 交互终端下密码输入不回显；管道（非交互）模式读取 stdin 的第一行
 * 作为密码并跳过确认，便于脚本化：
 *   printf 'secret\n' | node server/add-user.js alice
 *
 * 密码策略：至少 8 个字符。
 */

const readline = require('readline');
const {
  USERS_FILE,
  USERNAME_RE,
  loadUsers,
  saveUsers,
  userKey,
  createUserRecord,
} = require('./users');

function usage() {
  console.log('用法:');
  console.log('  node server/add-user.js <username> [nickname]   添加用户');
  console.log('  node server/add-user.js --list                  列出用户');
  console.log('  node server/add-user.js --delete <username>     删除用户');
  process.exit(1);
}

// 交互式（TTY）：密码遮蔽输入（Node 官方文档模式）
function askMasked(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.stdoutMuted = true;
    const origWrite = rl._writeToOutput.bind(rl);
    rl._writeToOutput = (string) => {
      if (rl.stdoutMuted) {
        origWrite('\x1B[2K\x1B[200D' + query + Array(rl.line.length + 1).join('*'));
      } else {
        origWrite(string);
      }
    };
    rl.question(query, (answer) => {
      rl.stdoutMuted = false;
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

// 非交互式（管道）：读取整个 stdin，取第一个非空行作为密码
function readPipedPassword() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      const line = data.split(/\r?\n/).find((l) => l.length > 0) || '';
      resolve(line);
    });
    process.stdin.on('error', reject);
  });
}

async function promptPassword(query) {
  if (process.stdin.isTTY) {
    return askMasked(query);
  }
  console.log('(非交互模式：从 stdin 读取密码，跳过确认)');
  return readPipedPassword();
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--list') {
    const store = loadUsers();
    const names = Object.keys(store.users);
    if (names.length === 0) {
      console.log('(用户库为空)');
      return;
    }
    for (const name of names) {
      const u = store.users[name];
      console.log(`${name}\t${u.nickname || ''}\tcreated ${new Date(u.createdAt).toISOString()}`);
    }
    return;
  }

  if (args[0] === '--delete') {
    const username = args[1];
    if (!username) usage();
    const store = loadUsers();
    if (!store.users[username]) {
      console.error(`错误: 用户 ${username} 不存在`);
      process.exit(1);
    }
    delete store.users[username];
    saveUsers(store);
    console.log(`已删除用户: ${username}`);
    console.log(`注意: 该用户的书签数据文件仍保留在数据目录中（${userKey(username)}.json），可手动清理`);
    return;
  }

  const username = args[0];
  if (!username) usage();
  if (!USERNAME_RE.test(username)) {
    console.error('错误: 用户名只能包含字母数字和 _ . -，长度 2-64');
    process.exit(1);
  }

  const nickname = args[1] || '';

  const store = loadUsers();
  if (store.users[username]) {
    console.error(`错误: 用户 ${username} 已存在`);
    process.exit(1);
  }

  const password = await promptPassword('为用户 ' + username + ' 设置密码 (至少 8 个字符): ');
  if (!password || password.length < 8) {
    console.error('错误: 密码至少需要 8 个字符');
    process.exit(1);
  }

  if (process.stdin.isTTY) {
    const confirm = await askMasked('再次输入密码确认: ');
    if (password !== confirm) {
      console.error('错误: 两次输入的密码不一致');
      process.exit(1);
    }
  }

  store.users[username] = createUserRecord(username, password, nickname);
  saveUsers(store);
  console.log(`已添加用户: ${username} (nickname: ${nickname || username})`);
  console.log(`用户库: ${USERS_FILE}`);
}

main().catch((error) => {
  console.error('错误:', error.message);
  process.exit(1);
});
