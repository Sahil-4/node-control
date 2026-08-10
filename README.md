# NodeControl

Local-first PWA control panel for notes, files, and controlled system utilities. Built with Node.js/Express and plain HTML/CSS/JS — no frontend framework, no build step.

## Features

- **Monitor** — live CPU, RAM, disk, and battery stats via Socket.io
- **System Actions** — HTOP, LS, PROCESSES, SCREENSHOT, REBOOT, and Read File, run from a single dropdown with streamed output; saved shortcuts for repeat actions
- **Notes** — CRUD notes with search
- **Files** — upload/download/delete, inline preview (images, audio, video, Markdown, HTML), one-time share links with QR codes
- **Clipboard** — real-time text sync across connected clients
- **Tunnel** — one-click `cloudflared` quick tunnel to expose the panel over the internet, no account needed
- **Sessions & audit log** — every device that authenticates is tracked; every sensitive action is appended to `logs/actions.log`

## Tech Stack

| Layer         | Technology              |
| ------------- | ----------------------- |
| Runtime       | Node.js                 |
| Server        | Express.js              |
| Real-time     | Socket.io               |
| Frontend      | Vanilla HTML / CSS / JS |
| System info   | `systeminformation`     |
| File transfer | `multer`                |
| Tunneling     | `cloudflared` CLI       |

## Quick Start

```bash
git clone <this-repo>
cd node-control
npm install
cp .env.example .env
# edit .env — set ADMIN_USER / ADMIN_PASS at minimum
npm start
```

The server listens on `PORT` (default `3000`). Log in with the credentials set in `.env`.

## Configuration

See `.env.example` for all supported environment variables, including `ALLOWED_SCOPE`, `FILE_GUARD`, `MONITOR_INTERVAL_MS`, `LANDING_PAGE`, and `MAX_UPLOAD_MB`.

> **Note:** the System Actions panel can run whitelisted shell commands, read files within its configured scope, and (if `ALLOW_REBOOT=true`) reboot the host machine. Access is gated behind HTTP Basic Auth using the credentials in `.env` — set a strong `ADMIN_PASS` before exposing this beyond localhost.

## Deployment

Reference configs for running NodeControl as a persistent service behind HTTPS are in [`deploy/`](deploy/):

- `deploy/nodecontrol.service` — hardened systemd unit
- `deploy/admin.blackbox.loc.conf` — nginx reverse-proxy vhost with TLS

See [`instructions.md`](instructions.md) for the full architecture reference, environment variable details, systemd/nginx setup steps, and API/Socket.io event documentation.

## License

MIT — see [LICENSE](LICENSE).
