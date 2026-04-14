import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useStore } from "../context/StoreContext";
import { useAuth } from "../context/useAuth";
import { getOrCreateDailySummary } from "../utils/dailySummaryService";

export default function Reconciliation() {
  const { user } = useAuth();
  const { stores, activeStore, setActiveStore } = useStore();

  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [cashCounted, setCashCounted] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  /*
   * Fetch transactions for selected store + date
   */
  useEffect(() => {
    if (!activeStore || activeStore === "All") return;

    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("store", activeStore)
        .eq("date", selectedDate);

      if (error) {
        console.error("Transaction fetch error:", error);
      } else {
        setTransactions(data);
      }
    };

    fetchTransactions();
  }, [activeStore, selectedDate]);

  /*
   * Get or create daily summary
   */
  useEffect(() => {
    if (!activeStore || activeStore === "All") return;

    const loadSummary = async () => {
      const result = await getOrCreateDailySummary(
        activeStore,
        selectedDate
      );
      setSummary(result);
    };

    loadSummary();
  }, [activeStore, selectedDate]);

  /*
   * Calculations
   */
  const totalCash = transactions.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );

  const totalGold = transactions
    .filter((t) => t.material === "Gold")
    .reduce((sum, t) => sum + Number(t.weight), 0);

  const totalSilver = transactions
    .filter((t) => t.material === "Silver")
    .reduce((sum, t) => sum + Number(t.weight), 0);

  /*
   * Confirm & Lock Day
   */
  const handleConfirm = async () => {
    if (!summary) {
      alert("No summary available.");
      return;
    }

    if (!cashCounted) {
      alert("Enter physical cash counted.");
      return;
    }

    try {
      // 1️⃣ Lock summary
      const { error: summaryError } = await supabase
        .from("daily_summaries")
        .update({
          end_float_confirmed: Number(cashCounted),
          locked: true
        })
        .eq("id", summary.id);

      if (summaryError) throw summaryError;

      // 2️⃣ Lock transactions
      const { error: txError } = await supabase
        .from("transactions")
        .update({ locked: true })
        .eq("store", activeStore)
        .eq("date", selectedDate);

      if (txError) throw txError;

      alert("Day Confirmed & Locked");

      // Refresh
      const refreshedSummary =
        await getOrCreateDailySummary(
          activeStore,
          selectedDate
        );

      setSummary(refreshedSummary);
    } catch (err) {
      console.error("Confirm error:", err);
      alert("Error locking day.");
    }
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
            <option>All</option>
            {stores.map((store) => (
              <option key={store.id}>
                {store.name}
              </option>
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
          disabled={summary?.locked}
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

      {!summary?.locked && (
        <button
          onClick={handleConfirm}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Confirm & Lock Day
        </button>
      )}

      {summary?.locked && (
        <p className="text-green-600 font-semibold">
          Day is Locked
        </p>
      )}
    </div>
  );
}