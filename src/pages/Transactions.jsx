import { useState } from "react";
import { useTransactions } from "../context/TransactionsContext";
import { useAuth } from "../context/AuthContext";
import { useStore } from "../context/StoreContext";
import { logAudit } from "../utils/auditLogger";


export default function Transactions() {
  const { transactions, addTransaction, deleteTransaction } =
    useTransactions();

  const today = new Date().toISOString().split("T")[0];
  const {activeStore, stores} = useStore();
  const [date, setDate] = useState(today);
  const [payee, setPayee] = useState("");
  const [material, setMaterial] = useState("Gold");
  const [weight, setWeight] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [store, setStore] = useState(activeStore);
  const { user, logout } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();

    addTransaction({
      date,
      payee,
      material,
      weight: Number(weight),
      amount: Number(amount),
      notes,
      store,
      enteredBy: user.email,
      locked: false
    });

    
    setDate(today);
    setPayee("");
    setMaterial("Gold");
    setWeight("");
    setAmount("");
    setNotes("");
    setStore(activeStore);
  };

  const filtered = transactions.filter((t) =>
    activeStore === "All"
      ? true
      : t.store === activeStore
  );

  const totalSales = filtered.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );

  const pricePerGram =
    weight && amount
      ? (amount / weight).toFixed(2)
      : 0;

  const exportCSV = () => {
    const headers = [
      "Date",
      "Payee",
      "Material",
      "Weight",
      "Amount",
      "Store",
      "Entered By",
      "Confirmed"
    ];

    const rows = filtered.map((t) => [
      t.date,
      t.payee,
      t.material,
      t.weight,
      t.amount,
      t.store,
      t.user,
      t.confirmed
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows]
        .map((e) => e.join(","))
        .join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "transactions.csv");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="space-y-8">

      <h1 className="text-3xl font-semibold tracking-tight">
        Transactions
      </h1>

      {/* Entry Form */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <button
          onClick={exportCSV}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg"
        >
          Export CSV
        </button>
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Transaction Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border p-3 rounded-lg"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Store
            </label>
            <select
              value={store}
              onChange={(e) => setStore(e.target.value)}
              className="border p-3 rounded-lg"
            >              
              {stores.map((store) => (
                  <option key={store}>{store}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Payee Name
            </label>
            <input
              placeholder="Payee Name"
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              className="border p-3 rounded-lg"
              required
            />
          </div>


          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Material
            </label>
            <select
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className="border p-3 rounded-lg"
            >
              <option>Gold</option>
              <option>Silver</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Weight (grams)
            </label>
            <p className="text-sm text-gray-500 mt-1">
              Price per gram: ${pricePerGram}
            </p>
            <input
              type="number"
              placeholder="Weight (grams)"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="border p-3 rounded-lg"
              required
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Amount Sold For
            </label>
            <input
              type="number"
              placeholder="Amount Sold For"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="border p-3 rounded-lg"
              required
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Notes
            </label>
            <textarea
              placeholder="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border p-3 rounded-lg md:col-span-3"
            />
          </div>

          <button
            type="submit"
            className="md:col-span-3 bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-700 transition"
          >
            Save Transaction
          </button>
        </form>
      </div>

      {/* Summary */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <p className="text-gray-500 text-sm">Total Sales</p>
        <p className="text-2xl font-bold mt-2">
          ${totalSales.toFixed(2)}
        </p>
      </div>

      {/* Transaction List */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-medium mb-4">
          Transaction History
        </h2>

        {filtered.length === 0 && (
          <p className="text-gray-500">No transactions yet.</p>
        )}

        {filtered.map((t) => (
          <div
            key={t.id}
            className="border-b py-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3"
          >
            <div>
              <p className="font-medium">
                {t.material} — {t.weight}g
              </p>
              <p className="text-sm text-gray-500">
                {t.payee} • {t.date}
              </p>
              {t.notes && (
                <p className="text-sm text-gray-400">
                  {t.notes}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4">
              <span className="font-semibold">
                ${Number(t.amount).toFixed(2)}
              </span>

              <button
                onClick={() => deleteTransaction(t.id)}
                className="text-red-500 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}