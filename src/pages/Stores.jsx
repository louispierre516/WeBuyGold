import { useState, useEffect } from "react";
import { useStore } from "../context/StoreContext";

export default function Stores() {
  const [stores, setStores] = useState([]);
  const [newStore, setNewStore] = useState("");

  useEffect(() => {
    const stored =
      JSON.parse(localStorage.getItem("stores")) || [];
    setStores(stored);
  }, []);

  const addStore = () => {
    if (!newStore.trim()) return;

    const updated = [...stores, newStore];
    setStores(updated);
    localStorage.setItem("stores", JSON.stringify(updated));
    setNewStore("");
  };

  const deleteStore = (store) => {
    const updated = stores.filter((s) => s !== store);
    setStores(updated);
    localStorage.setItem("stores", JSON.stringify(updated));
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
            key={store}
            className="flex justify-between border-b py-2"
          >
            <span>{store}</span>
            <button
              onClick={() => deleteStore(store)}
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