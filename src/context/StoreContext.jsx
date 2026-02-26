import { createContext, useContext, useEffect, useState } from "react";

const StoreContext = createContext();

export const useStore = () => useContext(StoreContext);

export const StoreProvider = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("user"));

  const [stores, setStores] = useState(() => {
    return JSON.parse(localStorage.getItem("stores")) || [];
  });

  const [activeStore, setActiveStore] = useState(() => {
    const saved = localStorage.getItem("activeStore");

    if (saved) return saved;

    // Default behavior:
    // Admin starts on "All"
    // Others start on their assigned store
    return user?.role === "admin"
      ? "All"
      : user?.store || "All";
  });

  useEffect(() => {
    localStorage.setItem("activeStore", activeStore);
  }, [activeStore]);

  const addStore = (storeName) => {
    const updated = [...stores, storeName];
    setStores(updated);
    localStorage.setItem("stores", JSON.stringify(updated));
  };

  const deleteStore = (storeName) => {
    const updated = stores.filter((s) => s !== storeName);
    setStores(updated);
    localStorage.setItem("stores", JSON.stringify(updated));
  };

  return (
    <StoreContext.Provider
      value={{
        stores,
        activeStore,
        setActiveStore,
        addStore,
        deleteStore
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};