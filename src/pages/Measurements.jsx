import { useState } from "react";
import { useStore } from "../context/StoreContext";
import { getMeasurements, saveMeasurements } from "../utils/measurementService";
import { logAudit } from "../utils/auditLogger";

export default function Measurements() {
  const { activeStore } = useStore();
  const today = new Date().toISOString().split("T")[0];

  const [goldPrice, setGoldPrice] = useState("");
  const [silverPrice, setSilverPrice] = useState("");

  const save = () => {
    const measurements = getMeasurements();

    const newEntry = {
      id: Date.now(),
      store: activeStore,
      date: today,
      goldPricePerGram: Number(goldPrice),
      silverPricePerGram: Number(silverPrice)
    };

    measurements.push(newEntry);
    saveMeasurements(measurements);

    logAudit("Measurement Updated", newEntry);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Measurements</h2>

      <div className="bg-white shadow p-6 rounded">
        <input
          placeholder="Gold Price per Gram"
          className="border p-2 rounded w-full mb-4"
          value={goldPrice}
          onChange={(e) => setGoldPrice(e.target.value)}
        />

        <input
          placeholder="Silver Price per Gram"
          className="border p-2 rounded w-full mb-4"
          value={silverPrice}
          onChange={(e) => setSilverPrice(e.target.value)}
        />

        <button
          onClick={save}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Save
        </button>
      </div>
    </div>
  );
}