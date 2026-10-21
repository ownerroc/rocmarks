# RocMarks

[English](README-en.md) | [中文](README.md)

RocMarks 是一个双向书签同步扩展（Chrome/Firefox），将本地浏览器书签与您的 XBrowser 云端账户保持同步。可运行在任何支持 Chrome/Firefox 扩展的浏览器上。

> RocMarks 由 Ivan Ssl 维护，是 [xbrowser-bookmark-sync](https://github.com/examplecode/xbrowser-bookmark-sync)（作者 chengkai）的分支，增加了品牌重塑与 CI 打包。

## 功能特性

- 极简设计：只提供最基本的书签同步功能，登录 XBrowser 账户后即可使用。
- 多个 PC 浏览器可使用同一 XBrowser 账户同步书签。
- 自定义同步服务器：可指向自托管服务器（[SELF_HOSTED.md](SELF_HOSTED.md)），也可继续使用 XBrowser 官方云端。

## 浏览器兼容性

✅ **Chrome** 88+
✅ **Firefox** 109+
✅ **Microsoft Edge** 88+
✅ **其他基于 Chromium 的浏览器**

> 🦊 **Firefox 用户**：请查看 [Firefox 构建指南](FIREFOX_BUILD.md)。

## 安装说明

### 从 Release 安装（推荐）

从 [GitHub Releases](https://github.com/ownerroc/rocmarks/releases) 下载最新构建：

- `rocmarks-chrome-<version>.zip` — Chrome/Edge（解包加载，开发者模式）
- `rocmarks-firefox-<version>.zip` — Firefox（改名为 `.xpi` 或作为临时附加组件加载）

### 从源码安装（手动）

```bash
git clone https://github.com/ownerroc/rocmarks.git
```

然后以解包扩展方式加载该目录：

1. 打开 `chrome://extensions/`
2. 开启右上角的 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择克隆的目录

Firefox：`about:debugging#/runtime/this-firefox` → **临时载入附加组件** → 选择目录内任意文件（详见 [FIREFOX_BUILD.md](FIREFOX_BUILD.md)）。

## 与上游同步

本分支通过 `upstream` remote 跟踪上游 `examplecode/xbrowser-bookmark-sync`：

```bash
git remote add upstream https://github.com/examplecode/xbrowser-bookmark-sync.git  # 只需一次
git fetch upstream
git merge upstream/main        # 或 rebase
# 如上游改动了品牌文件，重新应用分支品牌，然后：
git push origin main
```

## 许可证

MIT — 见 [LICENSE](LICENSE)。上游同样采用 MIT 许可证。
