import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

const TransactionsContext = createContext();

export const useTransactions = () => useContext(TransactionsContext);

export const TransactionsProvider = ({ children }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);

  // Load only this user's transactions
  useEffect(() => {
    if (!user) return;

    const saved = localStorage.getItem(
      `wetrack_transactions_${user.email}`
    );

    if (saved) {
      setTransactions(JSON.parse(saved));
    } else {
      setTransactions([]);
    }
  }, [user]);

  // Persist per user
  useEffect(() => {
    if (!user) return;

    localStorage.setItem(
      `wetrack_transactions_${user.email}`,
      JSON.stringify(transactions)
    );
  }, [transactions, user]);

  const addTransaction = (transaction) => {
    setTransactions((prev) => [
      ...prev,
      {
        id: Date.now(),
        user: user.email,
        role: user.role,
        confirmed: false,
        confirmedBy: null,
        confirmedAt: null,
        ...transaction
      }
    ]);
  };

  const deleteTransaction = (id) => {
    setTransactions((prev) =>
      prev.filter((t) => t.id !== id)
    );
  };

  const confirmTransaction = (id) => {
  setTransactions((prev) =>
    prev.map((t) =>
      t.id === id
        ? {
            ...t,
            confirmed: true,
            confirmedBy: user.email,
            confirmedAt: new Date().toISOString()
          }
        : t
    )
  );
};

  return (
    <TransactionsContext.Provider
      value={{
        transactions,
        addTransaction,
        deleteTransaction,
        confirmTransaction
      }}
    >
      {children}
    </TransactionsContext.Provider>
  );
};