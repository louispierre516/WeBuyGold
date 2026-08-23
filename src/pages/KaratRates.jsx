import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function KaratRates() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editingRate, setEditingRate] = useState("");

  const fetchRates = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("karat_rates")
      .select("*")
      .order("karats", { ascending: false });

    if (error) {
      console.error("Error fetching karat rates:", error);
      alert(error.message);
      setLoading(false);
      return;
    }

    setRates(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const startEditing = (rate) => {
    setEditingId(rate.id);

    setEditingRate(
      rate.rate_per_gram !== null &&
        rate.rate_per_gram !== undefined
        ? String(rate.rate_per_gram)
        : ""
    );
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingRate("");
  };

  const saveRate = async (rate) => {
    const numericRate = Number(editingRate);

    if (!Number.isFinite(numericRate) || numericRate < 0) {
      alert("Please enter a valid rate.");
      return;
    }

    setSavingId(rate.id);

    const { error } = await supabase
      .from("karat_rates")
      .update({
        rate_per_gram: numericRate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rate.id);

    if (error) {
      console.error("Error updating karat rate:", error);
      alert(error.message);
      setSavingId(null);
      return;
    }

    // Reload directly from Supabase so the UI always
    // reflects the actual saved database value.
    await fetchRates();

    cancelEditing();
    setSavingId(null);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-gray-500">
            Loading karat rates...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Karat Rates
          </h1>

          <p className="text-gray-500 mt-1">
            Manage the default rate per gram for each gold karat.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchRates}
          disabled={loading}
          className="border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {/* RATES CARD */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-medium">
            Gold Karat Rates
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            These rates are automatically loaded when a karat
            is selected on a transaction.
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {rates.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No karat rates have been configured.
            </div>
          ) : (
            rates.map((rate) => {
              const isEditing = editingId === rate.id;
              const isSaving = savingId === rate.id;

              return (
                <div
                  key={rate.id}
                  className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  {/* KARAT */}
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold">
                        {rate.karats}K
                      </div>

                      <div>
                        <p className="font-medium">
                          {rate.karats} Karat Gold
                        </p>

                        <p className="text-sm text-gray-500">
                          Default rate per gram
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* RATE */}
                  <div className="flex items-center gap-3">
                    {isEditing ? (
                      <>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                            $
                          </span>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editingRate}
                            onChange={(e) =>
                              setEditingRate(e.target.value)
                            }
                            className="border border-gray-300 rounded-lg pl-8 pr-3 py-2 w-36 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            autoFocus
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => saveRate(rate)}
                          disabled={isSaving}
                          className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition disabled:opacity-50"
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </button>

                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={isSaving}
                          className="border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="text-right mr-3">
                          <p className="text-xl font-semibold">
                            $
                            {Number(
                              rate.rate_per_gram ?? 0
                            ).toFixed(2)}
                          </p>

                          <p className="text-xs text-gray-500">
                            per gram
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => startEditing(rate)}
                          className="border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
                        >
                          Edit
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* INFORMATION CARD */}
      <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-5">
        <h3 className="font-medium text-yellow-900">
          How Karat Rates Work
        </h3>

        <p className="text-sm text-yellow-800 mt-2">
          When creating a Gold transaction, selecting a karat
          automatically loads its rate into the Override Rate /
          Gram field. The user can then manually change that
          rate for the individual transaction if necessary.
        </p>

        <p className="text-sm text-yellow-800 mt-2">
          Changing a rate here affects future transactions. It
          does not change rates that were already saved on
          existing transactions.
        </p>
      </div>
    </div>
  );
}
