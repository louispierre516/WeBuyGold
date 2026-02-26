import { useTransactions } from "../context/TransactionsContext";
import { useAuth } from "../context/AuthContext";
import { useStore } from "../context/StoreContext";

export default function Dashboard() {
  const { transactions } = useTransactions();
  const { user, logout } = useAuth();
  const { stores, activeStore } = useStore();
  const store = user?.store;

  const today = new Date().toISOString().split("T")[0];
  
  const filtered = transactions.filter((t) =>
    activeStore === "All"
      ? true
      : t.store === activeStore
  );

  const todaysTransactions = filtered.filter(
    (t) =>
      t.date === today &&
      ( t.store === store) || user.role === "admin"
  );

  const totalRevenue = todaysTransactions.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );

  const goldWeight = todaysTransactions
    .filter((t) => t.material === "Gold")
    .reduce((sum, t) => sum + Number(t.weight), 0);

  const silverWeight = todaysTransactions
    .filter((t) => t.material === "Silver")
    .reduce((sum, t) => sum + Number(t.weight), 0);

  const goldRevenue = todaysTransactions
    .filter((t) => t.material === "Gold")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const silverRevenue = todaysTransactions
    .filter((t) => t.material === "Silver")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const goldPricePerGram =
    goldWeight > 0 ? goldRevenue / goldWeight : 0;

  const silverPricePerGram =
    silverWeight > 0 ? silverRevenue / silverWeight : 0;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

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

      <div className="bg-white shadow rounded p-6 mt-8">
        <h3 className="font-semibold mb-4">Today's Transactions</h3>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Payee</th>
              <th>Material</th>
              <th>Weight</th>
              <th>Amount</th>
              <th>Entered By</th>
            </tr>
          </thead>
          <tbody>
            {todaysTransactions.map((t) => (
              <tr key={t.id} className="border-b">
                <td className="py-2">{t.payee}</td>
                <td className="text-center">{t.material}</td>
                <td className="text-center">{t.weight}g</td>
                <td className="text-center">${t.amount}</td>
                <td className="text-center">{t.enteredBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}