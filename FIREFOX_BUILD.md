# Firefox Build Guide (RocMarks)

RocMarks supports Firefox 113+ (Manifest V2 build).

## Install the prebuilt package

1. Download `rocmarks-firefox-<version>.zip` from [GitHub Releases](https://github.com/ownerroc/rocmarks/releases)
2. Rename it to `rocmarks-<version>.xpi` (optional)
3. In Firefox, open `about:debugging#/runtime/this-firefox`
4. Click **Load Temporary Add-on** and select the downloaded file

## Build from source

The Firefox build uses `manifest.firefox.json` (Manifest V2 with a `gecko` add-on ID):

```bash
git clone https://github.com/ownerroc/rocmarks.git
cd rocmarks
./build-firefox.sh   # copies manifest.firefox.json over manifest.json
```

Then in Firefox:

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select any file inside the directory (e.g. `manifest.json`)

To restore the Chrome manifest afterwards: `./build-chrome.sh`

> The CI packaging workflow (`.github/workflows/build.yml`) produces both Chrome and Firefox zips automatically on every release tag.

## Notes

- The Firefox extension ID is `rocmarks@ivansslo.dev` (defined in `manifest.firefox.json`).
- The extension talks to the XBrowser cloud API (`https://www.xbext.com` / `https://en.xbext.com`); an XBrowser account is required.
