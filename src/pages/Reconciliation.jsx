import { useState, useEffect } from "react";
import { useStore } from "../context/StoreContext";
import { useTransactions } from "../context/TransactionsContext";
import { useAuth } from "../context/AuthContext";
import { getDailySummaries, saveDailySummaries } from "../utils/dailySummaryService";
import { getOrCreateDailySummary } from "../utils/dailySummaryService";

export default function Reconciliation() {
  const { transactions, confirmTransaction } = useTransactions();
  const { user, logout } = useAuth();
  const { stores, activeStore, setActiveStore } = useStore();

  const [cashCounted, setCashCounted] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const filtered = transactions.filter(
    (t) =>
      t.date === selectedDate &&
      (t.store === activeStore || activeStore === "All")
  );
  const today = selectedDate;

  const totalCash = filtered.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );

  const totalGold = filtered
    .filter((t) => t.material === "Gold")
    .reduce((sum, t) => sum + Number(t.weight), 0);

  const totalSilver = filtered
    .filter((t) => t.material === "Silver")
    .reduce((sum, t) => sum + Number(t.weight), 0);

  const storeTransactions = transactions.filter(
    (t) => t.store === activeStore && t.date === today
  );

  const totalOutput = storeTransactions.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );

  const summary = getOrCreateDailySummary(activeStore, today);

  const expectedEndFloat =
    summary.startFloat - totalOutput - summary.officeExpenses;
  const handleConfirm = () => {

    const summaries = getDailySummaries();

    const updated = summaries.map((s) =>
      s.store === activeStore && s.date === today
        ? {
          ...s,
          endFloatConfirmed: Number(actualEndFloat),
          locked: true
        }
        : s
    );

    saveDailySummaries(updated);

    const updatedTransactions = transactions.map((t) =>
      t.store === activeStore && t.date === today
        ? { ...t, locked: true }
        : t
    );

    localStorage.setItem(
      "transactions",
      JSON.stringify(updatedTransactions)
    );

    logAudit("Day Confirmed", {
      store: activeStore,
      date: today,
      expectedEndFloat,
      actualEndFloat
    });
    alert("Day Confirmed & Locked");
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">
        Store Reconciliation
      </h2>

      <div className="bg-white shadow rounded p-6 mb-6 grid md:grid-cols-2 gap-6">

        <div>
          <label className="block mb-1 font-medium">
            Select Date
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
          <p className="text-gray-500">Store</p>
          <select
            value={activeStore}
            onChange={(e) =>
              setActiveStore(e.target.value)
            }
            className="border rounded-lg px-2 py-1 text-sm"
          >
            <option key={"All"}>All</option>
            {stores.map((store) => (
              <option key={store}>{store}</option>
            ))}
          </select>
        </div>

      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-6">

        <div className="bg-white shadow rounded p-6">
          <p className="text-gray-500">Total Cash</p>
          <p className="text-2xl font-bold">
            ${totalCash.toFixed(2)}
          </p>
        </div>

        <div className="bg-white shadow rounded p-6">
          <p className="text-gray-500">Gold Weight</p>
          <p className="text-2xl font-bold">
            {totalGold}g
          </p>
        </div>

        <div className="bg-white shadow rounded p-6">
          <p className="text-gray-500">Silver Weight</p>
          <p className="text-2xl font-bold">
            {totalSilver}g
          </p>
        </div>

      </div>

      <div className="bg-white shadow rounded p-6 mb-6">
        <label className="block mb-2 font-medium">
          Physical Cash Counted
        </label>
        <input
          type="number"
          value={cashCounted}
          onChange={(e) =>
            setCashCounted(e.target.value)
          }
          className="border p-2 rounded w-full"
        />
      </div>

      {cashCounted && (
        <div className="bg-white shadow rounded p-6 mb-6">
          <p>
            Difference:{" "}
            <span
              className={
                Number(cashCounted) === totalCash
                  ? "text-green-600 font-bold"
                  : "text-red-600 font-bold"
              }
            >
              $
              {(Number(cashCounted) - totalCash).toFixed(2)}
            </span>
          </p>
        </div>
      )}

      <button
        onClick={handleConfirm}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Confirm & Lock Day
      </button>
    </div>
  );
}