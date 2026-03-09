let apiBase = window.FAMILYGUARD_API_BASE || localStorage.getItem("fg_api_base") || "";
const getApiBase = () => apiBase;
let mode = "register";
let token = localStorage.getItem("fg_parent_token") || "";
let selectedDeviceId = "";
let socket;
let screenChart;

const authPanel = document.getElementById("authPanel");
const dashboardPanel = document.getElementById("dashboardPanel");
const authMessage = document.getElementById("authMessage");
const selectedDeviceLabel = document.getElementById("selectedDeviceLabel");
const apiBaseInput = document.getElementById("apiBaseInput");
apiBaseInput.value = apiBase;

const setMode = (nextMode) => {
  mode = nextMode;
  document.getElementById("registerTab").classList.toggle("is-active", mode === "register");
  document.getElementById("loginTab").classList.toggle("is-active", mode === "login");
  document.getElementById("fullNameGroup").style.display = mode === "register" ? "block" : "none";
  document.getElementById("authSubmit").textContent = mode === "register" ? "Create account" : "Sign in";
};

const withAuth = (method = "GET", body) => ({
  method,
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: body ? JSON.stringify(body) : undefined,
});

const showDashboard = () => {
  authPanel.classList.add("hidden");
  dashboardPanel.classList.remove("hidden");
};

const renderList = (elementId, items, formatter) => {
  const el = document.getElementById(elementId);
  el.innerHTML = "";
  if (!items?.length) {
    el.innerHTML = `<div class="list-item">No records yet</div>`;
    return;
  }
  items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "list-item";
    row.setAttribute("data-testid", `${elementId}-item-${index}`);
    row.innerHTML = formatter(item);
    el.appendChild(row);
  });
};

const fetchJson = async (url, init) => {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
};

const requireApiBase = () => {
  if (!getApiBase()) {
    throw new Error("Please enter backend API base URL");
  }
};

const loadDevices = async () => {
  requireApiBase();
  const data = await fetchJson(`${getApiBase()}/api/parent/devices`, withAuth());
  const listEl = document.getElementById("deviceList");
  listEl.innerHTML = "";

  if (!data.devices.length) {
    listEl.innerHTML = `<div class="list-item">No devices enrolled yet.</div>`;
    return;
  }

  data.devices.forEach((device) => {
    const item = document.createElement("button");
    item.className = `device-item ${selectedDeviceId === device.id ? "active" : ""}`;
    item.setAttribute("data-testid", `device-item-${device.id}`);
    item.innerHTML = `<strong>${device.childName}</strong><br/><small>${device.deviceLabel}</small>`;
    item.onclick = async () => {
      selectedDeviceId = device.id;
      selectedDeviceLabel.textContent = `${device.childName} • ${device.deviceLabel}`;
      await loadOverview();
      await loadInstalledApps();
    };
    listEl.appendChild(item);
  });

  if (!selectedDeviceId && data.devices.length) {
    selectedDeviceId = data.devices[0].id;
    selectedDeviceLabel.textContent = `${data.devices[0].childName} • ${data.devices[0].deviceLabel}`;
    await loadOverview();
    await loadInstalledApps();
  }
};

const renderScreenChart = (totalMinutes) => {
  const ctx = document.getElementById("screenTimeChart");
  if (screenChart) screenChart.destroy();
  screenChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Used", "Remaining (24h)"],
      datasets: [{
        data: [totalMinutes, Math.max(0, 1440 - totalMinutes)],
        backgroundColor: ["#7c3aed", "#e2e8f0"],
      }],
    },
    options: { responsive: true, plugins: { legend: { display: false } } },
  });
};

const loadOverview = async () => {
  if (!selectedDeviceId) return;
  const data = await fetchJson(`${getApiBase()}/api/parent/devices/${selectedDeviceId}/overview`, withAuth());
  const overview = data.overview;

  const location = overview.latestLocation
    ? `${overview.latestLocation.lat.toFixed(5)}, ${overview.latestLocation.lng.toFixed(5)} (${new Date(
        overview.latestLocation.capturedAt
      ).toLocaleString()})`
    : "No location data yet";
  document.getElementById("locationText").textContent = location;

  const total = overview.todayScreenTime?.totalMinutes || 0;
  document.getElementById("screenTimeValue").textContent = `${total} minutes`;
  renderScreenChart(total);

  renderList("topAppsList", overview.topApps, (item) => `${item.appName} — ${item.usageMinutes} min`);
  renderList("activityList", overview.latestActivities, (item) => `${item.category}: ${item.message}`);
  renderList("notificationList", overview.latestNotifications, (item) => `${item.appName}: ${item.title || item.text || "Notification"}`);
};

const loadInstalledApps = async () => {
  if (!selectedDeviceId) return;
  const data = await fetchJson(`${getApiBase()}/api/parent/devices/${selectedDeviceId}/installed-apps`, withAuth());
  const apps = data.snapshot?.apps?.slice(0, 20) || [];
  renderList("installedAppsList", apps, (item) => `${item.appName} <small>${item.packageName}</small>`);
};

const loadReport = async () => {
  if (!selectedDeviceId) return;
  const reportDate = document.getElementById("reportDate").value || new Date().toISOString().slice(0, 10);
  const data = await fetchJson(
    `${getApiBase()}/api/parent/devices/${selectedDeviceId}/reports/daily?date=${reportDate}`,
    withAuth()
  );
  document.getElementById("reportData").textContent = JSON.stringify(data.report, null, 2);
};

const lockDevice = async () => {
  if (!selectedDeviceId) return;
  const data = await fetchJson(`${getApiBase()}/api/parent/devices/${selectedDeviceId}/lock`, withAuth("POST"));
  document.getElementById("lockStatus").textContent = `${data.message} (${new Date().toLocaleTimeString()})`;
};

const connectSocket = () => {
  if (!token) return;
  socket = io(getApiBase(), { auth: { token } });
  const statusEl = document.getElementById("socketStatus");
  socket.on("connect", () => {
    statusEl.textContent = "Online";
    statusEl.classList.add("online");
  });

  socket.on("disconnect", () => {
    statusEl.textContent = "Offline";
    statusEl.classList.remove("online");
  });

  ["location:update", "screen-time:update", "app-usage:update", "activity:update", "notifications:update"].forEach((event) => {
    socket.on(event, async (payload) => {
      if (payload.deviceId === selectedDeviceId) {
        await loadOverview();
      }
    });
  });
};

document.getElementById("registerTab").onclick = () => setMode("register");
document.getElementById("loginTab").onclick = () => setMode("login");
document.getElementById("refreshDevices").onclick = loadDevices;
document.getElementById("loadReport").onclick = loadReport;
document.getElementById("lockDevice").onclick = lockDevice;

document.getElementById("authForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const fullName = document.getElementById("fullName").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  apiBase = apiBaseInput.value.trim() || apiBase;
  if (!apiBase) {
    authMessage.textContent = "Please enter backend API base URL";
    return;
  }
  localStorage.setItem("fg_api_base", apiBase);

  try {
    if (mode === "register") {
      await fetchJson(`${getApiBase()}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });
      authMessage.textContent = "Registration successful. Please switch to login.";
      setMode("login");
      return;
    }

    const data = await fetchJson(`${getApiBase()}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    token = data.token;
    localStorage.setItem("fg_parent_token", token);
    authMessage.textContent = `Welcome ${data.parent.fullName}`;
    showDashboard();
    connectSocket();
    await loadDevices();
  } catch (error) {
    authMessage.textContent = error.message;
  }
});

setMode("register");

if (token && getApiBase()) {
  showDashboard();
  connectSocket();
  loadDevices().catch(() => {
    localStorage.removeItem("fg_parent_token");
    token = "";
    authPanel.classList.remove("hidden");
    dashboardPanel.classList.add("hidden");
  });
}
