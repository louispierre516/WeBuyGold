import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

const StoreContext = createContext();

function useStore () {
  return useContext(StoreContext);
} 

export { useStore };

export const StoreProvider = ({ children }) => {
  const { user } = useAuth();

  const [stores, setStores] = useState([]);
  const [activeStore, setActiveStore] = useState("All");
  const [loading, setLoading] = useState(true);

  /*
   * Fetch stores from Supabase
   */
  const fetchStores = async () => {
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching stores:", error);
    } else {
      setStores(data);
    }
  };

  /*
   * Get user profile (role + assigned store)
   */
  const fetchUserProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("role, store_id")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Profile fetch error:", error);
      return;
    }

    // Default store logic
    if (data.role === "admin") {
      setActiveStore("All");
    } else {
      setActiveStore(data.store || "All");
    }
  };

  /*
   * Initial Load
   */
  useEffect(() => {
    const init = async () => {
      await fetchStores();
      await fetchUserProfile();
      setLoading(false);
    };

    if (user) {
      init();
    }
  }, [user]);

  /*
   * Add store (Admin only ideally)
   */
  const addStore = async (storeName) => {
    if (!storeName.trim()) return;

    const { error } = await supabase
      .from("stores")
      .insert([{ name: storeName }]);

    if (error) {
      console.error("Error adding store:", error);
    } else {
      fetchStores();
    }
  };

  /*
   * Delete store
   */
  const deleteStore = async (storeId) => {
    const { error } = await supabase
      .from("stores")
      .delete()
      .eq("id", storeId);

    if (error) {
      console.error("Error deleting store:", error);
    } else {
      fetchStores();
    }
  };

  return (
    <StoreContext.Provider
      value={{
        stores,
        activeStore,
        setActiveStore,
        addStore,
        deleteStore,
        loading
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};