import { createContext, useContext } from "react";

const TransactionsContext = createContext();

export const useTransactions = () => useContext(TransactionsContext);

export const TransactionsProvider = ({ children }) => {
  return (
    <TransactionsContext.Provider value={{}}>
      {children}
    </TransactionsContext.Provider>
  );
};
