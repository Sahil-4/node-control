(function () {
  const authKey = "auth";

  function getAuth() {
    return localStorage.getItem(authKey);
  }

  function setAuth(user, pass) {
    localStorage.setItem(authKey, btoa(`${user}:${pass}`));
  }

  function clearAuth() {
    localStorage.removeItem(authKey);
  }

  async function apiFetch(url, options) {
    const auth = getAuth();
    const headers = new Headers(options?.headers || {});

    if (auth) {
      headers.set("Authorization", `Basic ${auth}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      clearAuth();
      if (!location.pathname.endsWith("/login.html")) {
        location.href = "/login.html";
      }
      throw new Error("Unauthorized");
    }

    if (!response.ok) {
      let message = "Request failed";
      try {
        const payload = await response.json();
        message = payload.error || message;
      } catch (error) {
        message = response.statusText || message;
      }
      throw new Error(message);
    }

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }

    return response.text();
  }

  function setMessage(id, message, isError) {
    const element = document.getElementById(id);
    if (!element) {
      return;
    }

    element.textContent = message || "";
    element.classList.toggle("status-danger", Boolean(isError));
  }

  function attachLogout() {
    const button = document.getElementById("logout-button");
    if (!button) {
      return;
    }

    button.addEventListener("click", function () {
      clearAuth();
      location.href = "/login.html";
    });
  }

  async function requireAuth() {
    if (!getAuth()) {
      location.href = "/login.html";
      return false;
    }

    await apiFetch("/api/auth/verify");
    return true;
  }

  function formatDate(value) {
    return new Date(value).toLocaleString();
  }

  function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }

  function getFileExtension(filename) {
    const parts = String(filename || "").toLowerCase().split(".");
    return parts.length > 1 ? parts.pop() : "";
  }

  function getPreviewType(filename) {
    const extension = getFileExtension(filename);
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "avif"];
    const audioExtensions = ["mp3", "wav", "ogg", "m4a", "aac", "flac"];
    const videoExtensions = ["mp4", "webm", "ogv", "mov", "m4v"];

    if (imageExtensions.includes(extension)) return "image";
    if (audioExtensions.includes(extension)) return "audio";
    if (videoExtensions.includes(extension)) return "video";
    return null;
  }

  function isViewable(filename) {
    const ext = getFileExtension(filename);
    return ext === "md" || ext === "html" || ext === "htm";
  }

  function renderFilePreview(file) {
    const previewType = getPreviewType(file.name);
    if (!previewType) return "";

    if (previewType === "image") {
      return `<div class="file-preview"><img src="${file.url}" alt="${escapeHtml(file.name)} preview" loading="lazy" /></div>`;
    }

    if (previewType === "audio") {
      return `<div class="file-preview"><audio controls preload="metadata" src="${file.url}">Your browser cannot preview this audio file.</audio></div>`;
    }

    return `<div class="file-preview"><video controls preload="metadata" src="${file.url}"></video></div>`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function copyText(text) {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  function showQr(text, containerId) {
    const container = document.getElementById(containerId);
    if (!container || typeof QRCode === "undefined") return;
    container.innerHTML = "";
    QRCode.toCanvas(text, { width: 220, margin: 1 }, function (err, canvas) {
      if (!err) container.appendChild(canvas);
    });
  }

  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("hidden");
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  }

  // ── Login ────────────────────────────────────────────────────────────────

  async function initLoginPage() {
    const form = document.getElementById("login-form");
    if (!form) return;

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      setMessage("login-message", "Checking credentials...");

      const user = document.getElementById("username").value.trim();
      const pass = document.getElementById("password").value;

      setAuth(user, pass);

      try {
        await apiFetch("/api/auth/verify");
        location.href = "/notes.html";
      } catch (error) {
        clearAuth();
        setMessage("login-message", error.message, true);
      }
    });
  }

  // ── Notes ────────────────────────────────────────────────────────────────

  async function initNotesPage() {
    if (!(await requireAuth())) return;

    attachLogout();

    const noteForm = document.getElementById("note-form");
    const searchInput = document.getElementById("note-search");
    const list = document.getElementById("notes-list");
    let notes = [];

    function renderNotes() {
      const query = searchInput.value.trim().toLowerCase();
      const filtered = notes.filter((note) =>
        note.content.toLowerCase().includes(query),
      );

      if (!filtered.length) {
        list.innerHTML = '<div class="empty">No notes found.</div>';
        return;
      }

      list.innerHTML = filtered
        .map(
          (note) => `
        <article class="card" data-note-id="${note.id}">
          <div class="meta">Created ${formatDate(note.createdAt)}</div>
          <pre class="note-content">${escapeHtml(note.content)}</pre>
          <textarea class="inline-edit hidden" rows="4">${escapeHtml(note.content)}</textarea>
          <div class="actions">
            <button type="button" data-action="copy">Copy</button>
            <button type="button" data-action="edit" class="secondary">Edit</button>
            <button type="button" data-action="save" class="secondary hidden">Save</button>
            <button type="button" data-action="cancel" class="secondary hidden">Cancel</button>
            <button type="button" data-action="delete" class="danger">Delete</button>
          </div>
        </article>
      `,
        )
        .join("");
    }

    async function loadNotes() {
      notes = await apiFetch("/api/notes");
      renderNotes();
    }

    noteForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const contentField = document.getElementById("note-content");

      try {
        await apiFetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: contentField.value }),
        });
        contentField.value = "";
        setMessage("notes-message", "Note added.");
        await loadNotes();
      } catch (error) {
        setMessage("notes-message", error.message, true);
      }
    });

    searchInput.addEventListener("input", renderNotes);

    list.addEventListener("click", async function (event) {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const card = button.closest("[data-note-id]");
      const noteId = card.getAttribute("data-note-id");
      const content = card.querySelector(".note-content");
      const editor = card.querySelector(".inline-edit");
      const editButton = card.querySelector('[data-action="edit"]');
      const saveButton = card.querySelector('[data-action="save"]');
      const cancelButton = card.querySelector('[data-action="cancel"]');

      try {
        switch (button.getAttribute("data-action")) {
          case "copy":
            await copyText(content.textContent);
            setMessage("notes-message", "Note copied to clipboard.");
            break;
          case "edit":
            content.classList.add("hidden");
            editor.classList.remove("hidden");
            editButton.classList.add("hidden");
            saveButton.classList.remove("hidden");
            cancelButton.classList.remove("hidden");
            break;
          case "cancel":
            editor.value = content.textContent;
            content.classList.remove("hidden");
            editor.classList.add("hidden");
            editButton.classList.remove("hidden");
            saveButton.classList.add("hidden");
            cancelButton.classList.add("hidden");
            break;
          case "save":
            await apiFetch(`/api/notes/${noteId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content: editor.value }),
            });
            setMessage("notes-message", "Note updated.");
            await loadNotes();
            break;
          case "delete":
            await apiFetch(`/api/notes/${noteId}`, { method: "DELETE" });
            setMessage("notes-message", "Note deleted.");
            await loadNotes();
            break;
          default:
            break;
        }
      } catch (error) {
        setMessage("notes-message", error.message, true);
      }
    });

    await loadNotes();
  }

  // ── Files ────────────────────────────────────────────────────────────────

  async function initFilesPage() {
    if (!(await requireAuth())) return;

    attachLogout();

    const list = document.getElementById("files-list");
    const form = document.getElementById("upload-form");
    const filter = document.getElementById("file-filter");
    let files = [];

    // Viewer modal
    document.getElementById("viewer-modal-close").addEventListener("click", () => closeModal("viewer-modal"));
    document.getElementById("viewer-modal").addEventListener("click", function (e) {
      if (e.target === this) closeModal("viewer-modal");
    });

    // Share modal
    document.getElementById("share-modal-close").addEventListener("click", () => closeModal("share-modal"));
    document.getElementById("share-modal").addEventListener("click", function (e) {
      if (e.target === this) closeModal("share-modal");
    });
    document.getElementById("share-copy").addEventListener("click", async function () {
      const url = document.getElementById("share-url").value;
      await copyText(url);
      setMessage("files-message", "Share link copied.");
    });
    document.getElementById("share-qr").addEventListener("click", function () {
      const url = document.getElementById("share-url").value;
      showQr(url, "share-qr-container");
    });

    // QR modal
    document.getElementById("qr-modal-close").addEventListener("click", () => closeModal("qr-modal"));
    document.getElementById("qr-modal").addEventListener("click", function (e) {
      if (e.target === this) closeModal("qr-modal");
    });

    function renderFiles() {
      const query = filter.value.trim().toLowerCase();
      const filtered = files.filter((file) =>
        file.name.toLowerCase().includes(query),
      );

      if (!filtered.length) {
        list.innerHTML = '<div class="empty">No files found.</div>';
        return;
      }

      list.innerHTML = filtered
        .map(
          (file) => `
        <article class="card" data-file-name="${encodeURIComponent(file.name)}">
          <div class="meta">${escapeHtml(file.name)} &bull; ${formatBytes(file.size)} &bull; ${formatDate(file.createdAt)}</div>
          ${renderFilePreview(file)}
          <div class="actions">
            <a class="button-link secondary-link" href="${file.url}" target="_blank" rel="noopener noreferrer">Open</a>
            <a class="button-link" href="${file.url}" download>Download</a>
            ${isViewable(file.name) ? `<button type="button" data-action="view" class="secondary">View</button>` : ""}
            <button type="button" data-action="share" class="secondary">Share</button>
            <button type="button" data-action="delete" class="danger">Delete</button>
          </div>
        </article>
      `,
        )
        .join("");
    }

    async function loadFiles() {
      files = await apiFetch("/api/files");
      renderFiles();
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const input = document.getElementById("upload-input");
      if (!input.files.length) {
        setMessage("files-message", "Choose a file first.", true);
        return;
      }

      const payload = new FormData();
      payload.append("file", input.files[0]);

      try {
        await apiFetch("/api/files/upload", {
          method: "POST",
          body: payload,
        });
        form.reset();
        setMessage("files-message", "File uploaded.");
        await loadFiles();
      } catch (error) {
        setMessage("files-message", error.message, true);
      }
    });

    filter.addEventListener("input", renderFiles);

    list.addEventListener("click", async function (event) {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const card = button.closest("[data-file-name]");
      const encodedName = card.getAttribute("data-file-name");
      const fileName = decodeURIComponent(encodedName);
      const action = button.getAttribute("data-action");

      try {
        if (action === "delete") {
          await apiFetch(`/api/files/${encodedName}`, { method: "DELETE" });
          setMessage("files-message", "File deleted.");
          await loadFiles();
        } else if (action === "view") {
          const file = files.find((f) => f.name === fileName);
          if (!file) return;
          const ext = getFileExtension(fileName);
          const raw = await fetch(file.url).then((r) => r.text());
          const titleEl = document.getElementById("viewer-title");
          const contentEl = document.getElementById("viewer-content");
          titleEl.textContent = fileName;
          contentEl.innerHTML = "";
          if (ext === "md") {
            const div = document.createElement("div");
            div.className = "prose";
            div.innerHTML = typeof marked !== "undefined" ? marked.parse(raw) : escapeHtml(raw);
            contentEl.appendChild(div);
          } else {
            const iframe = document.createElement("iframe");
            iframe.setAttribute("sandbox", "");
            iframe.srcdoc = raw;
            iframe.className = "viewer-iframe";
            contentEl.appendChild(iframe);
          }
          openModal("viewer-modal");
        } else if (action === "share") {
          const result = await apiFetch("/api/share", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: fileName }),
          });
          const fullUrl = `${location.origin}${result.url}`;
          document.getElementById("share-url").value = fullUrl;
          document.getElementById("share-qr-container").innerHTML = "";
          openModal("share-modal");
        }
      } catch (error) {
        setMessage("files-message", error.message, true);
      }
    });

    await loadFiles();
  }

  // ── System ───────────────────────────────────────────────────────────────

  async function initSystemPage() {
    if (!(await requireAuth())) return;

    attachLogout();

    const form = document.getElementById("system-form");
    const actionSelect = document.getElementById("system-action");
    const inputField = document.getElementById("system-input");
    const output = document.getElementById("system-output");
    const socket = io();

    // Streaming output
    socket.on("system:output", ({ chunk }) => {
      output.textContent += chunk;
      output.scrollTop = output.scrollHeight;
    });
    socket.on("system:done", ({ exitCode }) => {
      setMessage("system-message", `Completed (exit ${exitCode}).`);
    });
    socket.on("system:error", ({ message }) => {
      setMessage("system-message", message, true);
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      output.textContent = "";
      setMessage("system-message", "Running...");
      socket.emit("system:run", {
        action: actionSelect.value,
        input: inputField.value,
      });
    });

    // Save shortcut
    document.getElementById("save-shortcut").addEventListener("click", async function () {
      const name = prompt("Shortcut name:");
      if (!name) return;
      try {
        await apiFetch("/api/system/shortcuts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, action: actionSelect.value, input: inputField.value }),
        });
        setMessage("system-message", `Shortcut "${name}" saved.`);
        await loadShortcuts();
      } catch (err) {
        setMessage("system-message", err.message, true);
      }
    });

    // Shortcuts list
    const shortcutsList = document.getElementById("shortcuts-list");

    async function loadShortcuts() {
      const shortcuts = await apiFetch("/api/system/shortcuts");
      if (!shortcuts.length) {
        shortcutsList.innerHTML = '<div class="empty">No shortcuts saved.</div>';
        return;
      }
      shortcutsList.innerHTML = shortcuts.map((s) => `
        <article class="card" data-shortcut-id="${s.id}">
          <div class="meta">${escapeHtml(s.name)}</div>
          <div class="muted" style="font-size:0.8rem;">${escapeHtml(s.action)}${s.input ? ` &bull; ${escapeHtml(s.input)}` : ""}</div>
          <div class="actions" style="margin-top:0.5rem;">
            <button type="button" data-shortcut-action="run">Run</button>
            <button type="button" data-shortcut-action="delete" class="danger">Delete</button>
          </div>
        </article>
      `).join("");
    }

    shortcutsList.addEventListener("click", async function (event) {
      const button = event.target.closest("button[data-shortcut-action]");
      if (!button) return;
      const card = button.closest("[data-shortcut-id]");
      const id = card.getAttribute("data-shortcut-id");
      const shortcuts = await apiFetch("/api/system/shortcuts");
      const shortcut = shortcuts.find((s) => s.id === id);
      if (!shortcut) return;

      if (button.getAttribute("data-shortcut-action") === "run") {
        actionSelect.value = shortcut.action;
        inputField.value = shortcut.input || "";
        output.textContent = "";
        setMessage("system-message", "Running...");
        socket.emit("system:run", { action: shortcut.action, input: shortcut.input });
      } else if (button.getAttribute("data-shortcut-action") === "delete") {
        try {
          await apiFetch(`/api/system/shortcuts/${id}`, { method: "DELETE" });
          setMessage("system-message", "Shortcut deleted.");
          await loadShortcuts();
        } catch (err) {
          setMessage("system-message", err.message, true);
        }
      }
    });

    // Tunnel
    const tunnelStatusEl = document.getElementById("tunnel-status");
    const tunnelUrlRow = document.getElementById("tunnel-url-row");
    const tunnelUrlInput = document.getElementById("tunnel-url");

    async function loadTunnelStatus() {
      try {
        const s = await apiFetch("/api/tunnel/status");
        if (s.running && s.url) {
          tunnelStatusEl.textContent = `Running since ${formatDate(s.startedAt)}`;
          tunnelStatusEl.classList.remove("status-danger");
          tunnelUrlInput.value = s.url;
          tunnelUrlRow.classList.remove("hidden");
        } else {
          tunnelStatusEl.textContent = "Not running";
          tunnelUrlRow.classList.add("hidden");
        }
      } catch (err) {
        tunnelStatusEl.textContent = err.message;
        tunnelStatusEl.classList.add("status-danger");
      }
    }

    document.getElementById("tunnel-start").addEventListener("click", async function () {
      tunnelStatusEl.textContent = "Starting tunnel...";
      tunnelUrlRow.classList.add("hidden");
      try {
        const s = await apiFetch("/api/tunnel/start", { method: "POST" });
        tunnelUrlInput.value = s.url;
        tunnelStatusEl.textContent = `Running since ${formatDate(s.startedAt)}`;
        tunnelStatusEl.classList.remove("status-danger");
        tunnelUrlRow.classList.remove("hidden");
      } catch (err) {
        tunnelStatusEl.textContent = err.message;
        tunnelStatusEl.classList.add("status-danger");
      }
    });

    document.getElementById("tunnel-stop").addEventListener("click", async function () {
      try {
        await apiFetch("/api/tunnel/stop", { method: "POST" });
        tunnelStatusEl.textContent = "Not running";
        tunnelUrlRow.classList.add("hidden");
      } catch (err) {
        tunnelStatusEl.textContent = err.message;
        tunnelStatusEl.classList.add("status-danger");
      }
    });

    document.getElementById("tunnel-copy").addEventListener("click", async function () {
      await copyText(tunnelUrlInput.value);
      setMessage("system-message", "Tunnel URL copied.");
    });

    document.getElementById("tunnel-qr").addEventListener("click", function () {
      showQr(tunnelUrlInput.value, "tunnel-qr-container");
    });

    await Promise.all([loadShortcuts(), loadTunnelStatus()]);
  }

  // ── Clipboard ─────────────────────────────────────────────────────────────

  async function initClipboardPage() {
    if (!(await requireAuth())) return;

    attachLogout();

    const textarea = document.getElementById("clipboard-text");
    const statusEl = document.getElementById("clipboard-status");
    const socket = io();
    let isRemoteUpdate = false;

    socket.on("connect", () => {
      statusEl.textContent = "Connected — changes sync in real time.";
      statusEl.classList.remove("status-danger");
    });
    socket.on("disconnect", () => {
      statusEl.textContent = "Disconnected.";
      statusEl.classList.add("status-danger");
    });
    socket.on("clipboard:sync", ({ text }) => {
      isRemoteUpdate = true;
      textarea.value = text;
      isRemoteUpdate = false;
    });

    textarea.addEventListener("input", function () {
      if (!isRemoteUpdate) {
        socket.emit("clipboard:update", { text: textarea.value });
      }
    });

    document.getElementById("clipboard-copy").addEventListener("click", async function () {
      await copyText(textarea.value);
      statusEl.textContent = "Copied to clipboard.";
    });

    document.getElementById("clipboard-clear").addEventListener("click", function () {
      textarea.value = "";
      socket.emit("clipboard:update", { text: "" });
    });

    document.getElementById("clipboard-qr").addEventListener("click", function () {
      const text = textarea.value.trim();
      if (!text) return;
      const container = document.getElementById("qr-container");
      container.innerHTML = "";
      showQr(text, "qr-container");
      openModal("qr-modal");
    });

    document.getElementById("qr-modal-close").addEventListener("click", () => closeModal("qr-modal"));
    document.getElementById("qr-modal").addEventListener("click", function (e) {
      if (e.target === this) closeModal("qr-modal");
    });
  }

  // ── Monitor ───────────────────────────────────────────────────────────────

  async function initMonitorPage() {
    if (!(await requireAuth())) return;

    attachLogout();

    const statusEl = document.getElementById("monitor-status");
    const cpuValue = document.getElementById("cpu-value");
    const cpuBar = document.getElementById("cpu-bar");
    const ramValue = document.getElementById("ram-value");
    const ramBar = document.getElementById("ram-bar");
    const diskList = document.getElementById("disk-list");
    const socket = io();

    socket.on("connect", () => {
      statusEl.textContent = "Live — updating every 2 seconds.";
      statusEl.classList.remove("status-danger");
      socket.emit("monitor:start");
    });
    socket.on("disconnect", () => {
      statusEl.textContent = "Disconnected.";
      statusEl.classList.add("status-danger");
    });

    socket.on("monitor:stats", ({ cpu, ram, disk }) => {
      cpuValue.textContent = `${cpu.usage}%`;
      cpuBar.style.width = `${cpu.usage}%`;
      cpuBar.className = `stat-bar${cpu.usage > 80 ? " stat-bar--danger" : cpu.usage > 60 ? " stat-bar--warn" : ""}`;

      const ramPct = Math.round((ram.used / ram.total) * 100);
      ramValue.textContent = `${formatBytes(ram.used)} / ${formatBytes(ram.total)}`;
      ramBar.style.width = `${ramPct}%`;
      ramBar.className = `stat-bar${ramPct > 80 ? " stat-bar--danger" : ramPct > 60 ? " stat-bar--warn" : ""}`;

      diskList.innerHTML = disk.filter(d => d.size > 0).map((d) => {
        const pct = Math.round((d.used / d.size) * 100);
        return `
          <article class="card">
            <div class="meta">${escapeHtml(d.mount)} <span class="muted">(${escapeHtml(d.fs)})</span></div>
            <div>${formatBytes(d.used)} / ${formatBytes(d.size)} &mdash; ${pct}%</div>
            <div class="stat-bar-track" style="margin-top:0.4rem;">
              <div class="stat-bar${pct > 80 ? " stat-bar--danger" : pct > 60 ? " stat-bar--warn" : ""}" style="width:${pct}%"></div>
            </div>
          </article>
        `;
      }).join("");
    });
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  async function bootstrap() {
    const page = document.body.dataset.page;

    if (page === "login") {
      await initLoginPage();
    } else if (page === "notes") {
      await initNotesPage();
    } else if (page === "files") {
      await initFilesPage();
    } else if (page === "system") {
      await initSystemPage();
    } else if (page === "clipboard") {
      await initClipboardPage();
    } else if (page === "monitor") {
      await initMonitorPage();
    }
  }

  bootstrap().catch(function (error) {
    console.error(error);
  });
})();
