(() => {
  const KEY_STORAGE = "alamdin_admin_key";

  const gateScreen = document.getElementById("gateScreen");
  const dashboard = document.getElementById("dashboard");
  const gateForm = document.getElementById("gateForm");
  const adminKeyInput = document.getElementById("adminKeyInput");
  const statGrid = document.getElementById("statGrid");
  const tableBody = document.getElementById("tableBody");
  const emptyTable = document.getElementById("emptyTable");
  const refreshBtn = document.getElementById("refreshBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  const STATUSES = ["NEW", "PENDING_CONFIRMATION", "CONFIRMED_BY_CLINIC", "CANCELLED", "COMPLETED"];

  let adminKey = localStorage.getItem(KEY_STORAGE) || "";

  function showGate() {
    gateScreen.style.display = "block";
    dashboard.style.display = "none";
  }

  function showDashboard() {
    gateScreen.style.display = "none";
    dashboard.style.display = "block";
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  }

  function renderStats(appointments) {
    const counts = { total: appointments.length };
    for (const s of STATUSES) counts[s] = 0;
    for (const a of appointments) counts[a.status] = (counts[a.status] || 0) + 1;

    const cards = [
      { label: "Total requests", value: counts.total },
      { label: "New", value: counts.NEW },
      { label: "Pending confirmation", value: counts.PENDING_CONFIRMATION },
      { label: "Confirmed", value: counts.CONFIRMED_BY_CLINIC },
      { label: "Cancelled", value: counts.CANCELLED },
      { label: "Completed", value: counts.COMPLETED }
    ];

    statGrid.innerHTML = cards
      .map((c) => `<div class="stat-card"><div class="value">${c.value}</div><div class="label">${c.label}</div></div>`)
      .join("");
  }

  function statusOptionsHtml(current) {
    return STATUSES.map((s) => `<option value="${s}" ${s === current ? "selected" : ""}>${s.replace(/_/g, " ")}</option>`).join("");
  }

  function renderTable(appointments) {
    if (!appointments.length) {
      tableBody.innerHTML = "";
      emptyTable.style.display = "block";
      return;
    }
    emptyTable.style.display = "none";

    tableBody.innerHTML = appointments
      .map(
        (a) => `
        <tr data-id="${a.id}">
          <td>${escapeHtml(a.patientName)}</td>
          <td>${escapeHtml(a.phone)}</td>
          <td>${escapeHtml(a.reason)}</td>
          <td>${escapeHtml(a.preferredDateRaw)} (${a.preferredDateISO})</td>
          <td>${escapeHtml(a.preferredTimeNormalized)}</td>
          <td>
            <span class="status-pill status-${a.status}">${a.status.replace(/_/g, " ")}</span>
            <select class="status-select" data-id="${a.id}">${statusOptionsHtml(a.status)}</select>
          </td>
          <td>${fmtDate(a.createdAt)}</td>
        </tr>`
      )
      .join("");

    tableBody.querySelectorAll(".status-select").forEach((sel) => {
      sel.addEventListener("change", () => updateStatus(sel.getAttribute("data-id"), sel.value));
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
  }

  async function updateStatus(id, status) {
    try {
      const res = await fetch(`/api/v1/appointments/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
        body: JSON.stringify({ status })
      });
      if (!res.ok) {
        alert("Failed to update status.");
        return;
      }
      await load();
    } catch {
      alert("Network error while updating status.");
    }
  }

  async function load() {
    try {
      const res = await fetch("/api/v1/appointments", { headers: { "X-Admin-Key": adminKey } });
      if (res.status === 401) {
        localStorage.removeItem(KEY_STORAGE);
        showGate();
        return;
      }
      const data = await res.json();
      renderStats(data);
      renderTable(data);
      showDashboard();
    } catch {
      alert("Could not reach the server.");
    }
  }

  gateForm.addEventListener("submit", (e) => {
    e.preventDefault();
    adminKey = adminKeyInput.value.trim();
    if (!adminKey) return;
    localStorage.setItem(KEY_STORAGE, adminKey);
    load();
  });

  refreshBtn.addEventListener("click", load);

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(KEY_STORAGE);
    adminKey = "";
    showGate();
  });

  if (adminKey) {
    load();
  } else {
    showGate();
  }
})();
