export function logAudit(action, metadata = {}) {
  const user = JSON.parse(localStorage.getItem("user"));
  const activeStore =
    localStorage.getItem("activeStore") || "All";

  const auditLogs =
    JSON.parse(localStorage.getItem("auditLogs")) || [];

  const newLog = {
    id: Date.now(),
    action,
    user: user?.name,
    role: user?.role,
    store: activeStore,
    date: new Date().toISOString().split("T")[0],
    timestamp: new Date().toLocaleString(),
    ...metadata
  };

  auditLogs.unshift(newLog);

  localStorage.setItem(
    "auditLogs",
    JSON.stringify(auditLogs)
  );
}