# NodeControl — Project Reference

## Overview

NodeControl is a **personal control panel** PWA built with Node.js/Express and plain HTML/CSS/JS (no frontend framework, no build step). It is designed for single-user, local-network use with optional internet exposure via cloudflared tunnels.

---

## Tech Stack

| Layer         | Technology                                           |
| ------------- | ---------------------------------------------------- |
| Runtime       | Node.js                                              |
| Server        | Express.js                                           |
| Real-time     | Socket.io                                            |
| Frontend      | Vanilla HTML / CSS / JS                              |
| System info   | `systeminformation` package                          |
| File transfer | `multer`                                             |
| Tunneling     | `cloudflared` CLI (quick tunnels, no account needed) |

---

## Project Structure

```
NodeControl/
  src/
    server.js                   # HTTP server entry point
    app.js                      # Express app, route mounting, startup dir creation
    socket.handlers.js          # All socket.io event handlers

    core/
      socket.core.js            # Socket.io singleton (init / getIo)
      file.core.js              # readJSON / writeJSON helpers

    middleware/
      auth.middleware.js        # Basic Auth validation, session touch, auth-fail logging

    routes/
      auth.routes.js            # GET /api/auth/verify
      notes.routes.js           # CRUD /api/notes
      files.routes.js           # Upload/list/delete /api/files
      system.routes.js          # POST /api/system, GET /api/system/read, /api/system/scope
      clipboard.routes.js       # GET/POST /api/clipboard
      share.routes.js           # POST /api/share, GET /api/share/:token
      shortcuts.routes.js       # CRUD /api/system/shortcuts
      tunnel.routes.js          # POST/GET /api/tunnel/start|stop|status
      sessions.routes.js        # GET /api/sessions

    controllers/
      auth.controller.js
      notes.controller.js
      files.controller.js
      system.controller.js      # executeAction, readFile, getScope
      sessions.controller.js

    services/
      notes.service.js          # Notes CRUD on src/data/notes.json
      files.service.js          # Lists/deletes from uploads/
      system.service.js         # Whitelisted commands, readScopedFile, file guard
      clipboard.service.js      # In-memory text store
      share.service.js          # One-time download tokens with expiry
      shortcuts.service.js      # Saved action shortcuts in src/data/shortcuts.json
      tunnel.service.js         # Spawns/kills cloudflared process, parses URL
      monitor.service.js        # CPU/RAM/disk/battery via systeminformation
      session.service.js        # Persistent session store (logs/sessions.json)
      logger.service.js         # Append-only action log (logs/actions.log)

    data/
      notes.json                # Persisted notes
      shortcuts.json            # Persisted action shortcuts

  public/
    login.html
    monitor.html
    system.html
    notes.html
    files.html
    clipboard.html
    app.js                      # All frontend logic (one file, page-detected via data-page)
    styles.css
    manifest.json
    sw.js

  uploads/                      # User-uploaded files
  scope/                        # User-managed symlinks for file reader access
  logs/
    actions.log                 # Append-only action audit log
    sessions.log                # Append-only session audit log (NEW/RETURN events)
    sessions.json               # Persistent session store (survives restarts)
```

---

## Environment Variables

```
ADMIN_USER=admin
ADMIN_PASS=securepassword
ALLOW_REBOOT=false
PORT=3000
HOST=0.0.0.0

# ALLOWED_SCOPE=/home/user        Restricts LS and Read File to this directory.
#                                  Defaults to the project root.
# FILE_GUARD=false                 Set to false to disable sensitive filename blocking.
#                                  Enabled by default. Blocks: passwd, shadow, .env,
#                                  secret, credential, config, private_key, id_rsa,
#                                  and extensions .key .pem .p12 .pfx .crt .cer .cert
# MONITOR_INTERVAL_MS=2000        Monitor push interval in ms. Clamped 500–60000.
# LANDING_PAGE=monitor            Page shown after login.
#                                  Options: monitor, notes, files, system, clipboard
```

---

## Authentication

- HTTP Basic Auth on every API request
- Frontend stores `btoa(user:pass)` in `localStorage`, sends as `Authorization: Basic <token>`
- On every successful auth, `session.service.js` records the device (IP, User-Agent, Accept-Language, X-Forwarded-For)
- Auth failures are logged to `logs/actions.log`
- No sessions/JWTs — stateless per request

---

## Pages & Navigation

Nav order (consistent across all pages): **Monitor → System → Notes → Files → Clipboard → Logout**

| Page      | Route             | Purpose                                  |
| --------- | ----------------- | ---------------------------------------- |
| Monitor   | `/monitor.html`   | Live CPU / RAM / disk / battery stats    |
| System    | `/system.html`    | Run actions via dropdown                 |
| Notes     | `/notes.html`     | CRUD notes with search                   |
| Files     | `/files.html`     | Upload / download / delete / share files |
| Clipboard | `/clipboard.html` | Real-time shared clipboard               |

After login, redirects to `LANDING_PAGE` (default: `monitor.html`) fetched from `/api/config`.

---

## Features

### Monitor

- Real-time push via Socket.io (`monitor:start` → `monitor:stats` events)
- Stats: CPU %, RAM used/total, per-disk usage, battery % and charging status (shown only if present)
- Refresh button sends `monitor:refresh` for an immediate stats push
- Update interval configurable via `MONITOR_INTERVAL_MS`
- Status bar displays actual interval received from server via `monitor:config` event

### System Actions

All actions are in a single dropdown with optgroups. No arbitrary shell execution.

| Optgroup  | Action        | Notes                                              |
| --------- | ------------- | -------------------------------------------------- |
| System    | HTOP          | `top -b -n 1`, streamed                            |
| System    | LS            | `ls -la <dir>`, input: directory path within scope |
| System    | PROCESSES     | `ps aux`, streamed                                 |
| System    | SCREENSHOT    | Saves PNG to `uploads/`, uses `import` or `scrot`  |
| System    | REBOOT        | Requires `ALLOW_REBOOT=true`                       |
| Files     | Read File     | Reads text file or lists directory within scope    |
| Tunnel    | Start Tunnel  | Starts cloudflared quick tunnel, shows URL + QR    |
| Tunnel    | Stop Tunnel   | Kills cloudflared process                          |
| Tunnel    | Tunnel Status | Shows running URL or "not running"                 |
| Shortcuts | (saved)       | User-saved action+input pairs, auto-fill on select |
| Admin     | Sessions      | Shows full session history in output pane          |

- Streaming actions (HTOP, LS, etc.) use `socket.emit('system:run')` → stdout/stderr pushed live
- Non-streaming actions (READ*FILE, TUNNEL*\*, SESSIONS) use REST API calls
- **Save as Shortcut**: saves current action + input with a name to the Shortcuts optgroup
- **Delete Shortcut**: appears when a shortcut is selected; deletes it on click

### Read File / Scope

- `GET /api/system/read?path=<path>` — reads text files or lists directories within `ALLOWED_SCOPE`
- Scope defaults to project root; override with `ALLOWED_SCOPE`
- `scope/` directory: place symlinks here to make external paths accessible via Read File without them appearing in the Files page
- File guard (enabled by default): blocks access to sensitive filenames regardless of scope
- `logs/` is permanently inaccessible from Read File (hardcoded, not affected by FILE_GUARD)

### Files

- Upload: `POST /api/files` (multipart)
- List: `GET /api/files`
- Download: direct link via `/uploads/<name>`
- Delete: `DELETE /api/files/:name`
- View: Markdown (via marked CDN) and HTML files viewable in a modal
- Preview: images, audio, video rendered inline
- One-time share link: generates a token via `POST /api/share`; consumed once at `GET /api/share/:token`; includes configurable expiry and QR code

### Clipboard

- Real-time shared text across all connected clients
- Socket.io events: `clipboard:update` (write) → `clipboard:sync` (broadcast)
- Copy button with `navigator.clipboard` + `execCommand` fallback for HTTP/LAN
- QR code generation for clipboard text

### Tunnel

- Spawns `cloudflared tunnel --url http://localhost:PORT` as a child process
- Parses `*.trycloudflare.com` URL from stdout
- No account or config needed
- Active tunnel URL shown in a compact indicator with Copy and QR buttons

### Sessions

- Every authenticated request updates or creates a session record
- Keyed by SHA1(IP + User-Agent) — same browser/device always maps to the same record
- Active = seen within last 30 minutes (shown with `●`); older = `○`
- Session data persisted to `logs/sessions.json` — survives server restarts
- `logs/sessions.log` — append-only audit trail: `[NEW]` lines include full UA, forwarded IP, language; `[RETURN]` lines include IP and request count (rate-limited to once/min per session)
- View all sessions via the **Sessions** action in the System dropdown

### Action Logging (`logs/actions.log`)

Every significant action is logged with timestamp, event type, and IP:

| Event                          | Trigger                            |
| ------------------------------ | ---------------------------------- |
| `AUTH_FAIL`                    | Invalid credentials                |
| `SYSTEM_RUN`                   | Socket system:run (action + input) |
| `READ_FILE` / `READ_FILE_ERR`  | File read via REST                 |
| `TUNNEL_START` / `TUNNEL_STOP` | Tunnel start/stop                  |
| `FILE_UPLOAD` / `FILE_DELETE`  | File operations                    |

---

## Real-time (Socket.io)

| Event (client → server) | Description                       |
| ----------------------- | --------------------------------- |
| `monitor:start`         | Begin stats stream                |
| `monitor:stop`          | Stop stats stream                 |
| `monitor:refresh`       | Push immediate stats update       |
| `system:run`            | Run a whitelisted streamed action |
| `clipboard:update`      | Write to shared clipboard         |

| Event (server → client) | Description                             |
| ----------------------- | --------------------------------------- |
| `monitor:config`        | Sends `{ intervalMs }` on stream start  |
| `monitor:stats`         | Periodic stats payload                  |
| `system:output`         | Streamed stdout/stderr chunk            |
| `system:done`           | Command finished with exit code         |
| `system:error`          | Command error or timeout                |
| `clipboard:sync`        | Broadcast clipboard text to all clients |

---

## Security

- Whitelist-only command execution — no arbitrary shell
- Path traversal blocked: `path.resolve` + `startsWith(projectRoot)` check before any FS access
- File guard blocks sensitive filenames by keyword and extension (toggleable via `FILE_GUARD=false`)
- `logs/` directory is hardcoded as inaccessible from Read File regardless of guards
- Execution timeout: 5 seconds for all shell commands
- Reboot gated behind `ALLOW_REBOOT=true`
- One-time share links expire and are consumed on first download

---

## API Routes Summary

```
GET  /api/config                    → { landingPage }  (public, no auth)
GET  /api/auth/verify               → { ok, user }

GET  /api/notes                     → notes[]
POST /api/notes                     → created note
PUT  /api/notes/:id                 → updated note
DELETE /api/notes/:id

GET  /api/files                     → files[]
POST /api/files                     → uploaded file info
DELETE /api/files/:name

POST /api/system                    → { output, meta }  (non-streaming actions)
GET  /api/system/read?path=         → { path, content, size, ext, isDirectory? }
GET  /api/system/scope              → { scope }

GET  /api/system/shortcuts          → shortcuts[]
POST /api/system/shortcuts          → created shortcut
DELETE /api/system/shortcuts/:id

POST /api/share                     → { url, expiresAt }
GET  /api/share/:token              → file download (one-time, no auth)

GET  /api/clipboard                 → { text }
POST /api/clipboard                 → sets text

GET  /api/tunnel/status             → { running, url, startedAt }
POST /api/tunnel/start              → { url, startedAt }
POST /api/tunnel/stop               → 204

GET  /api/sessions                  → session[]
```

---

## Non-Goals

- No database (JSON files only)
- No JWT or session cookies
- No UI frameworks
- No multi-user support
- No arbitrary shell execution
