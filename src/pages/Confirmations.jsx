import { useTransactions } from "../context/TransactionsContext";
import { useAuth } from "../context/AuthContext";

export default function Confirmations() {
  const { transactions, confirmTransaction } = useTransactions();
  const { user } = useAuth();

  const visibleTransactions =
    user.role === "Admin"
      ? transactions
      : user.role === "Cashier"
      ? transactions.filter((t) => !t.confirmed)
      : transactions.filter((t) => t.user === user.email);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">
        Transaction Review
      </h1>

      {visibleTransactions.map((t) => (
        <div
          key={t.id}
          className="bg-white p-6 rounded-2xl shadow-sm border"
        >
          <div className="flex justify-between">
            <div>
              <p className="font-medium">
                {t.material} — {t.weight}g
              </p>
              <p className="text-sm text-gray-500">
                {t.payee} • {t.date}
              </p>
              <p className="text-sm text-gray-400">
                Entered by: {t.user}
              </p>
            </div>

            <div>
              <p className="font-semibold">
                ${t.amount.toFixed(2)}
              </p>

              {!t.confirmed &&
                user.role !== "User" && (
                  <button
                    onClick={() =>
                      confirmTransaction(t.id)
                    }
                    className="mt-2 bg-green-600 text-white px-3 py-1 rounded"
                  >
                    Confirm
                  </button>
                )}

              {t.confirmed && (
                <p className="text-green-600 text-sm mt-2">
                  Confirmed by {t.confirmedBy}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}