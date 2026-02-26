import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useTransactions } from "../context/TransactionsContext";
import { useStore } from "../context/StoreContext";

export default function Reports() {
  const { transactions } = useTransactions();
  const { activeStore } = useStore();

  const filtered =
    activeStore === "All"
      ? transactions
      : transactions.filter(
          (t) => t.store === activeStore
        );

  // Daily Sales
  const dailyMap = {};
  filtered.forEach((t) => {
    dailyMap[t.date] =
      (dailyMap[t.date] || 0) + t.amount;
  });

  const dailyData = Object.entries(dailyMap).map(
    ([date, total]) => ({
      date,
      total
    })
  );

  // Material Split
  const goldTotal = filtered
    .filter((t) => t.material === "Gold")
    .reduce((sum, t) => sum + t.amount, 0);

  const silverTotal = filtered
    .filter((t) => t.material === "Silver")
    .reduce((sum, t) => sum + t.amount, 0);

  const pieData = [
    { name: "Gold", value: goldTotal },
    { name: "Silver", value: silverTotal }
  ];

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-semibold">
        Reports
      </h1>

      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h2 className="mb-4 font-medium">
          Daily Sales
        </h2>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dailyData}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h2 className="mb-4 font-medium">
          Gold vs Silver Revenue
        </h2>

        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              outerRadius={100}
            >
              <Cell />
              <Cell />
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}