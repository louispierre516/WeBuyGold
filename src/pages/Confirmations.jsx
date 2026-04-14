import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/useAuth";

export default function Confirmations() {
  const [transactions, setTransactions] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    else setTransactions(data);
  };

  const confirmTransaction = async (id) => {
    await supabase
      .from("transactions")
      .update({
        confirmed: true,
        confirmed_by: user.email
      })
      .eq("id", id);

    fetchTransactions();
  };

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
                ${Number(t.amount).toFixed(2)}
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
                  Confirmed by {t.confirmed_by}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}