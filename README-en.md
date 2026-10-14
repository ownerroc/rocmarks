# RocMarks

[English](README-en.md) | [中文](README.md)

RocMarks is a two-way bookmark sync extension (Chrome/Firefox) that keeps local browser bookmarks in sync with your XBrowser cloud account. It runs on any browser supporting Chrome/Firefox extensions.

> RocMarks is a maintained fork of [xbrowser-bookmark-sync](https://github.com/examplecode/xbrowser-bookmark-sync) by chengkai, rebranded and packaged with CI by Ivan Ssl.

## Features

- Minimalist design: only the essential bookmark sync functionality. Log in with your XBrowser account and start syncing.
- Works across multiple PC browsers using the same XBrowser account.

## Browser compatibility

✅ **Chrome** 88+
✅ **Firefox** 109+
✅ **Microsoft Edge** 88+
✅ **Other Chromium-based browsers**

> 🦊 **Firefox users**: see [Firefox Build Guide](FIREFOX_BUILD.md).

## Install

### From releases (recommended)

Download the latest build from [GitHub Releases](https://github.com/ownerroc/rocmarks/releases):

- `rocmarks-chrome-<version>.zip` — Chrome/Edge (unpacked, load via developer mode)
- `rocmarks-firefox-<version>.zip` — Firefox (rename to `.xpi` or load as temporary add-on)

### Manual (from source)

```bash
git clone https://github.com/ownerroc/rocmarks.git
```

Then load the directory as an unpacked extension:

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the cloned directory

Firefox: `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → select any file in the directory (see [FIREFOX_BUILD.md](FIREFOX_BUILD.md)).

## Syncing with upstream

This fork tracks upstream `examplecode/xbrowser-bookmark-sync` via the `upstream` remote:

```bash
git remote add upstream https://github.com/examplecode/xbrowser-bookmark-sync.git  # once
git fetch upstream
git merge upstream/main        # or rebase
# Re-apply fork branding if upstream touched branded files, then:
git push origin main
```

## License

MIT — see [LICENSE](LICENSE). Upstream is MIT-licensed.
