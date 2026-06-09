# 📌 MASTER PROMPT — *NodeControl*

## 1. Objective

Build a **local-first Progressive Web App (PWA)** named **NodeControl**.

It must function as a **personal control panel** that provides:

* Notes management (CRUD + search)
* File management (upload/download/delete + filter)
* Controlled system utilities (predefined commands only)

The application is intended for:

* Local network usage
* Occasional exposure via tunneling (e.g., ngrok)

---

## 2. Core Requirements

### Functional Features

#### A. Authentication

* Use **HTTP Basic Authentication (RFC 7617)**
* Credentials must be stored **only on server via environment variables**
* No database/session storage
* Frontend stores Base64 credentials in `localStorage`

---

#### B. Notes System

* Create, read, update, delete notes
* Persist notes in a **JSON file**
* Each note:

  ```json
  {
    "id": number,
    "content": string,
    "createdAt": timestamp
  }
  ```
* Features:

  * Full-text search (substring match)
  * Copy-to-clipboard button
  * Inline edit support

---

#### C. File Management

* Upload files
* List files
* Download files
* Delete files
* Filter files by name

Storage:

* Files stored in `/uploads`

---

#### D. System Utilities (STRICTLY CONTROLLED)

Provide execution of **predefined actions only**:

| Action     | Behavior                              |
| ---------- | ------------------------------------- |
| HTOP       | Run in batch mode                     |
| LS         | List directory                        |
| PROCESSES  | Show running processes                |
| SCREENSHOT | Capture screen and save to `/uploads` |
| REBOOT     | Reboot system (guarded by env flag)   |

Constraints:

* No arbitrary command execution
* Use whitelist mapping only
* Sanitize inputs (especially directory paths)
* Enforce execution timeout

---

## 3. Architecture (MANDATORY)

Follow strict layered architecture:

```
API Layer (routes)
   ↓
Controllers
   ↓
Services
   ↓
Core (low-level utilities)
```

---

### Folder Structure

```
src/
  app.js
  server.js

  routes/
    notes.routes.js
    files.routes.js
    system.routes.js
    auth.routes.js

  controllers/
    notes.controller.js
    files.controller.js
    system.controller.js

  services/
    notes.service.js
    files.service.js
    system.service.js

  core/
    file.core.js

  middleware/
    auth.middleware.js

  data/
    notes.json

public/
  login.html
  notes.html
  files.html
  system.html
  styles.css
  app.js
  manifest.json
  sw.js

uploads/
```

---

## 4. Backend Specifications

### Framework

* Use **Express.js**

---

### Middleware

#### Basic Auth

* Parse `Authorization` header
* Validate against:

  ```
  process.env.ADMIN_USER
  process.env.ADMIN_PASS
  ```
* Reject unauthorized requests with `401`

---

### Core Layer

#### file.core.js

* `readJSON(path)`
* `writeJSON(path, data)`

Use synchronous filesystem APIs for simplicity.

---

### Services Layer

#### Notes Service

* getNotes
* createNote
* updateNote
* deleteNote

#### Files Service

* listFiles
* deleteFile

#### System Service

* Use `child_process.exec`
* Wrap in promise with timeout
* Define **whitelisted actions only**

Example mapping:

```js
{
  HTOP: () => exec('htop -b -n 1'),
  LS: (dir) => safeExec(dir),
  PROCESSES: () => exec('ps aux'),
  SCREENSHOT: () => exec('import -window root file.png'),
  REBOOT: guarded
}
```

---

### Controllers

* Handle request/response only
* No business logic

---

### Routes

* `/api/notes`
* `/api/files`
* `/api/system`

All routes must:

* Use Basic Auth middleware

---

### Static Serving

Must include:

```js
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));
```

---

## 5. Frontend (PWA)

### Pages

| Page        | Purpose          |
| ----------- | ---------------- |
| login.html  | credential input |
| notes.html  | notes CRUD       |
| files.html  | file management  |
| system.html | system commands  |

---

### UI Constraints

* Minimal, clean, no frameworks
* Vanilla JS only
* Functional over aesthetic

---

### Features

#### Notes Page

* Search input (client-side filtering)
* Add note
* Edit note inline
* Delete note
* Copy button

---

#### Files Page

* Upload input
* File list
* Download link
* Delete button
* Filename filter

---

#### System Page

* Dropdown of allowed actions
* Optional input (for LS)
* Output display (`<pre>`)

---

### Auth Handling

Store credentials:

```js
localStorage.setItem('auth', btoa(user + ':' + pass));
```

Attach to every request:

```js
Authorization: Basic <base64>
```

---

## 6. PWA Requirements

### manifest.json

* name: NodeControl
* display: standalone
* start_url: /login.html

---

### Service Worker

* Cache:

  * HTML pages
  * basic assets
* Enable offline access (basic)

---

## 7. Security Constraints (STRICT)

### MUST IMPLEMENT

* No arbitrary command execution
* Whitelist-only system actions
* Path sanitization (reject `..`)
* Execution timeout for shell commands
* Reboot behind env flag:

  ```
  ALLOW_REBOOT=false
  ```

---

### SHOULD IMPLEMENT

* Run server as non-root user
* Use HTTPS when exposed (ngrok)
* Add basic error handling for filesystem

---

## 8. Environment Variables

```
ADMIN_USER=admin
ADMIN_PASS=securepassword
ALLOW_REBOOT=false
PORT=3000
```

---

## 9. Assumptions

* OS: Linux
* GUI available for screenshot (`import` or `scrot`)
* Single-user environment
* Low concurrency

---

## 10. Deliverables

The generated output must include:

* Full project structure
* All backend files
* All frontend files
* Working API endpoints
* Minimal but usable UI
* PWA support
* Secure system command execution

---

## 11. Non-Goals (DO NOT IMPLEMENT)

* No database (only JSON)
* No JWT/auth frameworks
* No UI frameworks (React, Vue, etc.)
* No arbitrary shell execution
* No multi-user support

---

## 12. Quality Expectations

* Clean separation of concerns
* Readable, maintainable code
* No duplicated logic
* Defensive programming for filesystem + commands

---

## 13. Key Concepts (Glossary)

* **Basic Auth**: HTTP authentication using Base64 encoded credentials
* **PWA**: Installable web app with offline capabilities
* **exec (Node.js)**: Runs shell command in a subprocess
* **Whitelist**: Explicitly allowed operations only
* **Separation of concerns**: Dividing responsibilities across layers

---

## 14. Final Instruction

Generate a **fully working, production-ready local utility application** named **NodeControl** that strictly follows all architectural, security, and functional constraints above.

Do not skip layers. Do not simplify structure. Do not introduce additional frameworks.

---
