import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/useAuth";
import { useStore } from "../context/StoreContext";

export default function Dashboard() {
  const { user, role, storeId, loading: authLoading } = useAuth();
  const { activeStore } = useStore();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const weekStr = startOfWeek.toISOString().split("T")[0];

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStr = startOfMonth.toISOString().split("T")[0];

  useEffect(() => {
    if (!user || authLoading) return;
    fetchTransactions();
  }, [user, role, activeStore]);

  const fetchTransactions = async () => {
    setLoading(true);

    let query = supabase
      .from("transactions")
      .select("*");

    if (role !== "admin") {
      query = query.eq("store_id", storeId);
    }

    const { data, error } = await query;

    console.log(data);
    
    if (!error) {
      setTransactions(data || []);
    } else {
      console.error("Dashboard fetch error:", error.message);
    }

    setLoading(false);
  };

  const filtered = transactions.filter((t) =>
    activeStore === "All" ? true : t.store_id === storeId
  );

  const buildMetrics = (filteredTx) => {
    const revenue = filteredTx.reduce(
      (sum, t) => sum + Number(t.amount || 0),
      0
    );

    const goldTx = filteredTx.filter((t) => t.metal_type.toLowerCase() === "gold");
    const silverTx = filteredTx.filter((t) => t.metal_type.toLowerCase() === "silver");

    const goldWeight = goldTx.reduce(
      (sum, t) => sum + Number(t.weight || 0),
      0
    );

    const silverWeight = silverTx.reduce(
      (sum, t) => sum + Number(t.weight || 0),
      0
    );

    return {
      count: filteredTx.length,
      revenue,
      goldWeight,
      silverWeight,
    };
  };

  // ⏳ Time Filters
  const todayMetrics = buildMetrics(
    filtered.filter((t) => t.date === todayStr)
  );

  const weekMetrics = buildMetrics(
    filtered.filter((t) => t.date >= weekStr)
  );

  const monthMetrics = buildMetrics(
    filtered.filter((t) => t.date >= monthStr)
  );

  const allTimeMetrics = buildMetrics(filtered);

  if (loading || authLoading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  const Card = ({ title, data }) => (
    <div className="bg-white shadow rounded p-6">
      <p className="text-gray-500">{title}</p>
      <p className="text-xl font-bold mt-2">
        ${data.revenue.toFixed(2)}
      </p>
      <div className="text-sm text-gray-600 mt-2">
        <p>{data.count} Transactions</p>
        <p>Gold: {data.goldWeight}g</p>
        <p>Silver: {data.silverWeight}g</p>
      </div>
    </div>
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

      <div className="grid md:grid-cols-4 gap-6">
        <Card title="Today" data={todayMetrics} />
        <Card title="This Week" data={weekMetrics} />
        <Card title="This Month" data={monthMetrics} />
        <Card title="All Time" data={allTimeMetrics} />
      </div>
    </div>
  );
}