import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/useAuth";
import { useStore } from "../context/StoreContext";

export default function Dashboard() {
  const { user, role, storeId } = useAuth();
  const { activeStore } = useStore();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;

    fetchTransactions();
  }, [user, role, activeStore]);

  const fetchTransactions = async () => {
    setLoading(true);

    let query = supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    // 🔒 Role-based filtering
    if (role !== "admin") {
      query = query.eq("store_id", storeId);
    }

    const { data, error } = await query;

    if (!error) {
      setTransactions(data || []);
    } else {
      console.error("Dashboard fetch error:", error.message);
    }

    setLoading(false);
  };

  // 🔹 Store filter
  const filteredByStore = transactions.filter((t) =>
    activeStore === "All" ? true : t.store_id === storeId
  );

  // 🔹 Today's transactions
  const todaysTransactions = filteredByStore.filter(
    (t) => t.date === today
  );

  // 🔹 Totals
  const totalRevenue = todaysTransactions.reduce(
    (sum, t) => sum + Number(t.amount || 0),
    0
  );

  const goldTx = todaysTransactions.filter(
    (t) => t.metal_type === "gold"
  );

  const silverTx = todaysTransactions.filter(
    (t) => t.metal_type === "silver"
  );

  const goldWeight = goldTx.reduce(
    (sum, t) => sum + Number(t.weight || 0),
    0
  );

  const silverWeight = silverTx.reduce(
    (sum, t) => sum + Number(t.weight || 0),
    0
  );

  const goldRevenue = goldTx.reduce(
    (sum, t) => sum + Number(t.amount || 0),
    0
  );

  const silverRevenue = silverTx.reduce(
    (sum, t) => sum + Number(t.amount || 0),
    0
  );

  const goldPricePerGram =
    goldWeight > 0 ? goldRevenue / goldWeight : 0;

  const silverPricePerGram =
    silverWeight > 0 ? silverRevenue / silverWeight : 0;

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6">

        <div className="bg-white shadow rounded p-6">
          <p className="text-gray-500">Today's Revenue</p>
          <p className="text-2xl font-bold">
            ${totalRevenue.toFixed(2)}
          </p>
        </div>

        <div className="bg-white shadow rounded p-6">
          <p className="text-gray-500">Gold Sold (g)</p>
          <p className="text-2xl font-bold">{goldWeight}</p>
          <p className="text-sm text-gray-600">
            Avg: ${goldPricePerGram.toFixed(2)}/g
          </p>
        </div>

        <div className="bg-white shadow rounded p-6">
          <p className="text-gray-500">Silver Sold (g)</p>
          <p className="text-2xl font-bold">{silverWeight}</p>
          <p className="text-sm text-gray-600">
            Avg: ${silverPricePerGram.toFixed(2)}/g
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded p-6 mt-8">
        <h3 className="font-semibold mb-4">
          Today's Transactions
        </h3>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Payee</th>
              <th>Metal</th>
              <th>Weight</th>
              <th>Amount</th>
              <th>Entered By</th>
            </tr>
          </thead>

          <tbody>
            {todaysTransactions.map((t) => (
              <tr key={t.id} className="border-b">
                <td className="py-2">{t.payee}</td>
                <td className="text-center">{t.metal_type}</td>
                <td className="text-center">{t.weight}g</td>
                <td className="text-center">${t.amount}</td>
                <td className="text-center">{t.user_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}