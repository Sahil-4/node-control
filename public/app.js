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

  function getFileExtension(filename) {
    const parts = String(filename || "").toLowerCase().split(".");
    return parts.length > 1 ? parts.pop() : "";
  }

  function getPreviewType(filename) {
    const extension = getFileExtension(filename);
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "avif"];
    const audioExtensions = ["mp3", "wav", "ogg", "m4a", "aac", "flac"];
    const videoExtensions = ["mp4", "webm", "ogv", "mov", "m4v"];

    if (imageExtensions.includes(extension)) {
      return "image";
    }

    if (audioExtensions.includes(extension)) {
      return "audio";
    }

    if (videoExtensions.includes(extension)) {
      return "video";
    }

    return null;
  }

  function renderFilePreview(file) {
    const previewType = getPreviewType(file.name);
    if (!previewType) {
      return "";
    }

    if (previewType === "image") {
      return `
        <div class="file-preview">
          <img src="${file.url}" alt="${escapeHtml(file.name)} preview" loading="lazy" />
        </div>
      `;
    }

    if (previewType === "audio") {
      return `
        <div class="file-preview">
          <audio controls preload="metadata" src="${file.url}">
            Your browser cannot preview this audio file.
          </audio>
        </div>
      `;
    }

    return `
      <div class="file-preview">
        <video controls preload="metadata" src="${file.url}"></video>
      </div>
    `;
  }

  async function initLoginPage() {
    const form = document.getElementById("login-form");
    if (!form) {
      return;
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      setMessage("login-message", "Checking credentials...");

      const user = document.getElementById("username").value.trim();
      const pass = document.getElementById("password").value;

      setAuth(user, pass);

      try {
        await apiFetch("/api/auth/verify");
        location.href = '/notes.html';
      } catch (error) {
        clearAuth();
        setMessage("login-message", error.message, true);
      }
    });
  }

  async function initNotesPage() {
    if (!(await requireAuth())) {
      return;
    }

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
      if (!button) {
        return;
      }

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
            await window.navigator.clipboard.writeText(content.textContent);
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

  async function initFilesPage() {
    if (!(await requireAuth())) {
      return;
    }

    attachLogout();

    const list = document.getElementById("files-list");
    const form = document.getElementById("upload-form");
    const filter = document.getElementById("file-filter");
    let files = [];

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
          <div class="meta">${escapeHtml(file.name)} • ${file.size} bytes • ${formatDate(file.createdAt)}</div>
          ${renderFilePreview(file)}
          <div class="actions">
            <a class="button-link secondary-link" href="${file.url}" target="_blank" rel="noopener noreferrer">Open</a>
            <a class="button-link" href="${file.url}" download>Download</a>
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
      const button = event.target.closest('button[data-action="delete"]');
      if (!button) {
        return;
      }

      const card = button.closest("[data-file-name]");
      const fileName = card.getAttribute("data-file-name");

      try {
        await apiFetch(`/api/files/${fileName}`, { method: "DELETE" });
        setMessage("files-message", "File deleted.");
        await loadFiles();
      } catch (error) {
        setMessage("files-message", error.message, true);
      }
    });

    await loadFiles();
  }

  async function initSystemPage() {
    if (!(await requireAuth())) {
      return;
    }

    attachLogout();

    const form = document.getElementById("system-form");
    const actionSelect = document.getElementById("system-action");
    const inputField = document.getElementById("system-input");
    const output = document.getElementById("system-output");

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      setMessage("system-message", "Running action...");

      try {
        const result = await apiFetch("/api/system", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: actionSelect.value,
            input: inputField.value,
          }),
        });

        const suffix =
          result.meta && result.meta.file
            ? `\n\nSaved file: ${result.meta.file}`
            : "";
        output.textContent = `${result.output || ""}${suffix}`.trim();
        setMessage("system-message", "Action completed.");
      } catch (error) {
        output.textContent = "Action failed.";
        setMessage("system-message", error.message, true);
      }
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch (error) {
        console.error("Service worker registration failed", error);
      }
    }
  }

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
    }

    // await registerServiceWorker();
  }

  bootstrap().catch(function (error) {
    console.error(error);
  });
})();
