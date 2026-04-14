import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Stores() {
  const [stores, setStores] = useState([]);
  const [newStore, setNewStore] = useState("");

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) console.error(error);
    else setStores(data);
  };

  const addStore = async () => {
    if (!newStore.trim()) return;

    const { error } = await supabase
      .from("stores")
      .insert([{ name: newStore }]);

    if (!error) {
      setNewStore("");
      fetchStores();
    }
  };

  const deleteStore = async (id) => {
    await supabase
      .from("stores")
      .delete()
      .eq("id", id);

    fetchStores();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Stores</h2>

      <div className="bg-white shadow rounded p-6 mb-6">
        <div className="flex gap-4">
          <input
            value={newStore}
            onChange={(e) => setNewStore(e.target.value)}
            placeholder="Store Name"
            className="border p-2 rounded flex-1"
          />
          <button
            onClick={addStore}
            className="bg-black text-white px-4 py-2 rounded"
          >
            Add
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded p-6">
        {stores.map((store) => (
          <div
            key={store.id}
            className="flex justify-between border-b py-2"
          >
            <span>{store.name}</span>
            <button
              onClick={() => deleteStore(store.id)}
              className="text-red-600"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}