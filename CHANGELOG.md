# Changelog

All notable changes to this project will be documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [1.0.0] — 2026-08-11

### Added

- Real-time Socket.IO server foundation
- Real-time clipboard scratchpad
- Live system monitoring dashboard
- File viewer with one-time share links and QR codes
- Saved command shortcuts with streaming output
- Cloudflared quick tunnel control
- File reader and scope symlink support
- Battery stats, manual refresh button, and configurable update interval for the monitor
- File guard, action logging, and persistent session tracking
- Configurable landing page
- PWA support: service worker, icons, and manifest
- Configurable max upload size via environment variable
- Local HTTPS setup and systemd service documentation
- systemd service unit for NodeControl with security hardening
- Nginx reverse proxy configuration with SSL for admin.blackbox.loc
- MIT License
- README with project overview, features, tech stack, and setup instructions

### Changed

- Consolidated system actions into a single dropdown menu
- Reordered navigation links
- Wired all routes together; updated frontend JS, navigation, and styles
- Restructured documentation for clarity
- Tunnel start now accepts a host parameter for dynamic binding
- Updated dependencies for improved stability and security

### Fixed

- QR code rendering, by switching to an unversioned qrcode CDN path
