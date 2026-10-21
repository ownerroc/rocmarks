# Self-hosting the RocMarks sync server

RocMarks can sync through your own server instead of the official
XBrowser cloud. The extension side needs no code changes — enter your
server's address in the popup's **Custom server** panel (Save will ask
for permission to access that host), then log in with an account you
create below.

The server is a single zero-dependency Node.js program: no database,
no build step. Bookmarks are stored as one JSON file per user.

## Requirements

- Node.js 18+ (uses only built-in modules)
- Any machine reachable from your browser(s) — a VPS, a home server,
  or even Termux works

## Quick start

```bash
git clone https://github.com/ownerroc/rocmarks.git
cd rocmarks

# create your first user (interactive password prompt)
node server/add-user.js alice

# start the server (default port 3000)
node server/sync-server.js
```

Then in the RocMarks popup: **Custom server** → `http://your-host:3000`
→ **Save** → log in as `alice`.

## User management

```bash
node server/add-user.js <username> [nickname]   # add a user
node server/add-user.js --list                  # list users
node server/add-user.js --delete <username>     # delete a user
```

Passwords are stored as scrypt hashes with per-user random salts —
never in plain text. Usernames allow `A-Z a-z 0-9 _ . -` (2–64 chars).

## Configuration (environment variables)

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Listen port |
| `ROCMARKS_USERS_FILE` | `server/users.json` | User database file |
| `ROCMARKS_DATA_DIR` | `server/data` | Bookmark storage directory |
| `ROCMARKS_ALLOWED_ORIGINS` | *(empty)* | Extra CORS origins (comma-separated) |

Extension origins (`chrome-extension://…`, `moz-extension://…`) are
always allowed by CORS. Add other origins (e.g. a web dashboard)
only if you actually need them.

## API (compatible with the extension)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | none | Health check |
| POST | `/api/auth` | none | Login → token |
| POST | `/api/bookmark_upload` | Bearer | Upload bookmarks |
| GET | `/api/bookmark_download` | Bearer | Download bookmarks |

Tokens expire after 24 hours; the server keeps them in memory only,
so a restart logs everyone out. Uploads carry conflict protection:
if the cloud copy is newer than the local one, the upload is rejected
unless "Overwrite cloud" is checked in the popup.

## Files on disk

```
server/
├── users.json        # user database (scrypt hashes + salts) — keep private
└── data/             # one <hash>.json file per user (bookmarks)
```

Back up `users.json` and `data/` together. Losing `users.json` means
losing logins; losing `data/` means losing the synced bookmarks.

## Running behind a reverse proxy / HTTPS

The extension only accepts `http://` and `https://` origins. For
anything beyond a home LAN, put the server behind a TLS-terminating
reverse proxy (nginx/caddy) and point the extension at the HTTPS URL.
The server itself speaks plain HTTP and listens on 0.0.0.0.

Example systemd unit:

```ini
[Unit]
Description=RocMarks sync server
After=network.target

[Service]
ExecStart=/usr/bin/node /opt/rocmarks/server/sync-server.js
Environment=PORT=3000
Restart=on-failure
User=rocmarks

[Install]
WantedBy=multi-user.target
```

## Security notes

- The dev mock server (`api-server.js`) is NOT this server — it is a
  fixture for extension development and holds no accounts.
- `users.json` contains salted password hashes; treat the file as
  sensitive (the CLI writes it with mode 0600).
- There is no rate limiting or HTTPS built in; for internet-facing
  deployments use a reverse proxy with TLS and basic DDoS protection.
- Bookmark data is stored unencrypted on the server disk — the same
  trust model as the official cloud.

## Switching back to the official server

In the popup: open the custom-server panel → **Use official server**.
You will be logged out (tokens are server-bound) and can log in to
your XBrowser account again.
