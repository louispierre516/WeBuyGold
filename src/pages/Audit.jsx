import { useState, useEffect } from "react";
import { useStore } from "../context/StoreContext";

export default function Audit() {
  const [logs, setLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStore, setSelectedStore] = useState("");
  const { stores, activeStore } = useStore();

  useEffect(() => {
    const stored =
      JSON.parse(localStorage.getItem("auditLogs")) || [];
    setLogs(stored);
  }, []);


  const filteredLogs = logs.filter((log) => {
    return (
      (selectedDate
        ? log.date === selectedDate
        : true) 
        &&
      (activeStore
        ? log.store === activeStore
        : true)
    );
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">
        Audit Log
      </h2>

      <div className="bg-white shadow rounded p-6 mb-6 grid md:grid-cols-2 gap-6">

        <div>
          <label className="block mb-1 font-medium">
            Filter by Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) =>
              setSelectedDate(e.target.value)
            }
            className="border p-2 rounded w-full"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">
            Filter by Store
          </label>
          <select
            value={selectedStore}
            onChange={(e) =>
              setSelectedStore(e.target.value)
            }
            className="border p-2 rounded w-full"
          >
            <option value="">All Stores</option>
            {stores.map((store) => (
              <option key={store} value={store}>
                {store}
              </option>
            ))}
          </select>
        </div>

      </div>

      <div className="bg-white shadow rounded p-6 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Timestamp</th>
              <th>User</th>
              <th>Role</th>
              <th>Store</th>
              <th>Action</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr
                key={log.id}
                className="border-b hover:bg-gray-50"
              >
                <td className="py-2">
                  {log.timestamp}
                </td>
                <td>{log.user}</td>
                <td>{log.role}</td>
                <td>{log.store}</td>
                <td className="font-medium">
                  {log.action}
                </td>
                <td className="text-gray-600">
                  {log.transactionId &&
                    `TX: ${log.transactionId}`}
                  {log.amount &&
                    ` | $${log.amount}`}
                  {log.material &&
                    ` | ${log.material}`}
                  {log.confirmedDate &&
                    ` | Date: ${log.confirmedDate}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredLogs.length === 0 && (
          <p className="text-center py-6 text-gray-500">
            No audit records found.
          </p>
        )}
      </div>
    </div>
  );
}