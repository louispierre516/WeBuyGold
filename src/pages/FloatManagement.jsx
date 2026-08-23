import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { useStore } from "../context/StoreContext";
import { supabase } from "../lib/supabase";

export default function FloatManagement() {
  const today =
    new Date().toISOString().split("T")[0];

  const { stores } = useStore();
  const { user, role, storeId } = useAuth();

  const [selectedStore, setSelectedStore] =
    useState(storeId || "");

  const [movements, setMovements] =
    useState([]);

  const [transactions, setTransactions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  // Form
  const [movementType, setMovementType] =
    useState("owner_addition");

  const [amount, setAmount] =
    useState("");

  const [date, setDate] =
    useState(today);

  const [notes, setNotes] =
    useState("");

  /*
   * Keep selected store synchronized
   * for non-admin users.
   */
  useEffect(() => {
    if (role !== "admin" && storeId) {
      setSelectedStore(storeId);
    }
  }, [role, storeId]);

  /*
   * Load data when store changes.
   */
  useEffect(() => {
    if (selectedStore) {
      fetchFloatData();
    }
  }, [selectedStore]);

  /*
   * Fetch movements and transactions.
   */
  const fetchFloatData = async () => {
    if (!selectedStore) {
      return;
    }

    setLoading(true);

    const [
      movementsResponse,
      transactionsResponse,
    ] = await Promise.all([
      supabase
        .from("float_movements")
        .select("*")
        .eq("store_id", selectedStore)
        .order("date", {
          ascending: false,
        })
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("transactions")
        .select("*")
        .eq("store_id", selectedStore)
        .order("date", {
          ascending: false,
        })
        .order("created_at", {
          ascending: false,
        }),
    ]);

    if (movementsResponse.error) {
      console.error(
        "Error fetching float movements:",
        movementsResponse.error
      );

      alert(
        movementsResponse.error.message
      );
    } else {
      setMovements(
        movementsResponse.data || []
      );
    }

    if (transactionsResponse.error) {
      console.error(
        "Error fetching transactions:",
        transactionsResponse.error
      );

      alert(
        transactionsResponse.error.message
      );
    } else {
      setTransactions(
        transactionsResponse.data || []
      );
    }

    setLoading(false);
  };

  /*
   * Convert amount safely.
   */
  const parseAmount = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return 0;
    }

    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : 0;
  };

  /*
   * Calculate current float.
   */
  const currentFloat = useMemo(() => {
    let balance = 0;

    movements.forEach((movement) => {
      const value =
        parseAmount(movement.amount);

      switch (
        movement.movement_type
      ) {
        case "opening_float":
        case "owner_addition":
          balance += value;
          break;

        case "owner_withdrawal":
          balance -= value;
          break;

        case "adjustment":
          balance += value;
          break;

        case "expense":
          balance -= value;
          break;

        default:
          break;
      }
    });

    transactions.forEach(
      (transaction) => {
        if (
          transaction.transaction_type ===
          "purchase"
        ) {
          balance -= parseAmount(
            transaction.amount_paid
          );
        }

        if (
          transaction.transaction_type ===
          "payout"
        ) {
          balance -= parseAmount(
            transaction.amount
          );
        }
      }
    );

    return balance;
  }, [movements, transactions]);

  /*
   * Total owner additions.
   */
  const totalAdditions = useMemo(() => {
    return movements
      .filter(
        (movement) =>
          movement.movement_type ===
          "owner_addition"
      )
      .reduce(
        (sum, movement) =>
          sum +
          parseAmount(
            movement.amount
          ),
        0
      );
  }, [movements]);

  /*
   * Total withdrawals.
   */
  const totalWithdrawals = useMemo(() => {
    return movements
      .filter(
        (movement) =>
          movement.movement_type ===
          "owner_withdrawal"
      )
      .reduce(
        (sum, movement) =>
          sum +
          parseAmount(
            movement.amount
          ),
        0
      );
  }, [movements]);

  /*
   * Total purchases paid.
   */
  const totalPurchasePayments =
    useMemo(() => {
      return transactions
        .filter(
          (transaction) =>
            transaction.transaction_type ===
            "purchase"
        )
        .reduce(
          (sum, transaction) =>
            sum +
            parseAmount(
              transaction.amount_paid
            ),
          0
        );
    }, [transactions]);

  /*
   * Total subsequent payouts.
   */
  const totalPayouts = useMemo(() => {
    return transactions
      .filter(
        (transaction) =>
          transaction.transaction_type ===
          "payout"
      )
      .reduce(
        (sum, transaction) =>
          sum +
          parseAmount(
            transaction.amount
          ),
        0
      );
  }, [transactions]);

  /*
   * Selected store name.
   */
  const selectedStoreName =
    stores.find(
      (store) =>
        store.store_id ===
          selectedStore ||
        store.id === selectedStore
    )?.name ||
    "Selected Store";

  /*
   * Add float movement.
   */
  const saveMovement = async (
    event
  ) => {
    event.preventDefault();

    const numericAmount =
      parseAmount(amount);

    if (!selectedStore) {
      alert(
        "Please select a store."
      );
      return;
    }

    if (
      numericAmount <= 0
    ) {
      alert(
        "Please enter a valid amount."
      );
      return;
    }

    if (
      movementType ===
        "owner_withdrawal" &&
      numericAmount > currentFloat ||      
      movementType ===
        "expense" &&
      numericAmount > currentFloat 
    ) {
      alert(
        `The withdrawal cannot exceed the current float of $${currentFloat.toFixed(
          2
        )}.`
      );
      return;
    }

    setSaving(true);

    const movement = {
      store_id:
        selectedStore,

      user_id:
        user?.id || null,

      amount:
        numericAmount,

      movement_type:
        movementType,

      notes:
        notes.trim() || null,

      date,
    };

    const { error } =
      await supabase
        .from("float_movements")
        .insert([
          movement,
        ]);

    if (error) {
      console.error(
        "Error saving float movement:",
        error
      );

      alert(error.message);

      setSaving(false);
      return;
    }

    setAmount("");
    setNotes("");
    setDate(today);

    await fetchFloatData();

    setSaving(false);
  };

  /*
   * Delete a float movement.
   *
   * I would eventually restrict this to
   * admins and preferably use adjustments
   * instead of deleting accounting records.
   */
  const deleteMovement = async (
    movement
  ) => {
    if (
      !window.confirm(
        "Delete this float movement?"
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from("float_movements")
        .delete()
        .eq("id", movement.id);

    if (error) {
      console.error(
        "Error deleting movement:",
        error
      );

      alert(error.message);
      return;
    }

    await fetchFloatData();
  };

  /*
   * Format movement label.
   */
  const movementLabel = (
    type
  ) => {
    switch (type) {
      case "opening_float":
        return "Opening Float";

      case "owner_addition":
        return "Owner Addition";

      case "owner_withdrawal":
        return "Owner Withdrawal";

      case "adjustment":
        return "Adjustment";

      case "expense":
        return "Expense";

      default:
        return type;
    }
  };

  /*
   * Determine whether movement
   * increases or decreases float.
   */
  const movementIsPositive = (
    type
  ) => {
    return (
      type ===
        "opening_float" ||
      type ===
        "owner_addition" ||
      type ===
        "adjustment"
    );
  };

  /*
   * Combined activity.
   */
  const activity = useMemo(() => {
    const movementActivity =
      movements.map(
        (movement) => ({
          id: `movement-${movement.id}`,

          date:
            movement.date,

          created_at:
            movement.created_at,

          type: "movement",

          movementType:
            movement.movement_type,

          label:
            movementLabel(
              movement.movement_type
            ),

          amount:
            parseAmount(
              movement.amount
            ),

          positive:
            movementIsPositive(
              movement.movement_type
            ),

          notes:
            movement.notes,
        })
      );

    const transactionActivity =
      transactions
        .filter(
          (transaction) =>
            transaction.transaction_type ===
              "purchase" ||
            transaction.transaction_type ===
              "payout"
        )
        .map(
          (transaction) => {
            const isPurchase =
              transaction.transaction_type ===
              "purchase";

            const value =
              isPurchase
                ? parseAmount(
                    transaction.amount_paid
                  )
                : parseAmount(
                    transaction.amount
                  );

            return {
              id: `transaction-${transaction.id}`,

              date:
                transaction.date,

              created_at:
                transaction.created_at,

              type:
                "transaction",

              movementType:
                transaction.transaction_type,

              label:
                isPurchase
                  ? "Gold Purchase"
                  : "Customer Payout",

              amount:
                value,

              positive:
                false,

              notes:
                transaction.notes,

              customerName:
                transaction.customer_name,

              receiptId:
                transaction.receipt_id,
            };
          }
        );

    return [
      ...movementActivity,
      ...transactionActivity,
    ].sort((a, b) => {
      const dateA =
        `${a.date || ""} ${
          a.created_at || ""
        }`;

      const dateB =
        `${b.date || ""} ${
          b.created_at || ""
        }`;

      return dateB.localeCompare(
        dateA
      );
    });
  }, [
    movements,
    transactions,
  ]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-gray-500">
            Loading float information...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Float Management
        </h1>

        <p className="text-gray-500 mt-1">
          Manage store cash floats and
          track every movement of funds.
        </p>
      </div>

      {/* STORE SELECTOR */}
      {role === "admin" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

          <label className="text-sm font-medium mb-2 block">
            Store
          </label>

          <select
            value={selectedStore}
            onChange={(e) =>
              setSelectedStore(
                e.target.value
              )
            }
            className="border p-3 rounded-lg w-full md:w-80"
          >
            <option value="">
              Select Store
            </option>

            {stores.map(
              (store) => (
                <option
                  key={
                    store.store_id ||
                    store.id
                  }
                  value={
                    store.store_id ||
                    store.id
                  }
                >
                  {store.name}
                </option>
              )
            )}
          </select>

        </div>
      )}

      {/* CURRENT FLOAT */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

        <div className="bg-black text-white rounded-2xl p-6 shadow-sm">

          <p className="text-sm text-gray-400">
            Current Float
          </p>

          <p
            className={`text-3xl font-bold mt-2 ${
              currentFloat < 0
                ? "text-red-400"
                : "text-yellow-400"
            }`}
          >
            $
            {currentFloat.toFixed(2)}
          </p>

          <p className="text-xs text-gray-400 mt-2">
            {selectedStoreName}
          </p>

        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

          <p className="text-sm text-gray-500">
            Owner Additions
          </p>

          <p className="text-2xl font-semibold text-green-600 mt-2">
            +$
            {totalAdditions.toFixed(2)}
          </p>

        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

          <p className="text-sm text-gray-500">
            Gold Purchases Paid
          </p>

          <p className="text-2xl font-semibold text-red-600 mt-2">
            -$
            {totalPurchasePayments.toFixed(
              2
            )}
          </p>

        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

          <p className="text-sm text-gray-500">
            Customer Payouts
          </p>

          <p className="text-2xl font-semibold text-red-600 mt-2">
            -$
            {totalPayouts.toFixed(2)}
          </p>

        </div>

      </div>

      {/* NEGATIVE WARNING */}
      {currentFloat < 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-800">

          <p className="font-semibold">
            Float is below zero.
          </p>

          <p className="text-sm mt-1">
            Add funds before making
            additional customer payments.
          </p>

        </div>
      )}

      {/* ADD MOVEMENT */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

        <div className="mb-6">

          <h2 className="text-lg font-medium">
            Add Float Movement
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Record money entering or
            leaving the store float.
          </p>

        </div>

        <form
          onSubmit={saveMovement}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >

          <div className="flex flex-col">

            <label className="text-sm font-medium mb-1">
              Movement Type
            </label>

            <select
              value={movementType}
              onChange={(e) =>
                setMovementType(
                  e.target.value
                )
              }
              className="border p-3 rounded-lg"
            >
              <option value="owner_addition">
                Owner Addition
              </option>

              <option value="owner_withdrawal">
                Owner Withdrawal
              </option>

              <option value="opening_float">
                Opening Float
              </option>

              <option value="adjustment">
                Adjustment
              </option>
              <option value="expense">
                Expense
              </option>
            </select>

          </div>

          <div className="flex flex-col">

            <label className="text-sm font-medium mb-1">
              Amount
            </label>

            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) =>
                setAmount(
                  e.target.value
                )
              }
              placeholder="0.00"
              className="border p-3 rounded-lg"
              required
            />

          </div>

          <div className="flex flex-col">

            <label className="text-sm font-medium mb-1">
              Date
            </label>

            <input
              type="date"
              value={date}
              onChange={(e) =>
                setDate(
                  e.target.value
                )
              }
              className="border p-3 rounded-lg"
              required
            />

          </div>

          <div className="flex flex-col">

            <label className="text-sm font-medium mb-1">
              Notes
            </label>

            <input
              type="text"
              value={notes}
              onChange={(e) =>
                setNotes(
                  e.target.value
                )
              }
              placeholder="Reason or notes"
              className="border p-3 rounded-lg"
            />

          </div>

          <div className="md:col-span-2">

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-700 transition disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "Save Float Movement"}
            </button>

          </div>

        </form>

      </div>

      {/* ACTIVITY */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        <div className="p-6 border-b border-gray-100">

          <h2 className="text-lg font-medium">
            Float Activity
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Every addition, withdrawal,
            purchase and customer payout.
          </p>

        </div>

        {activity.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No float activity found.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">

            {activity.map(
              (item) => (
                <div
                  key={item.id}
                  className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >

                  <div>

                    <div className="flex items-center gap-2">

                      <p className="font-medium">
                        {item.label}
                      </p>

                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          item.type ===
                          "movement"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {item.type ===
                        "movement"
                          ? "Float"
                          : "Transaction"}
                      </span>

                    </div>

                    <p className="text-xs text-gray-400 mt-1">
                      {item.date}
                    </p>

                    {item.customerName && (
                      <p className="text-sm text-gray-500 mt-1">
                        Customer:{" "}
                        {
                          item.customerName
                        }
                      </p>
                    )}

                    {item.receiptId && (
                      <p className="text-xs text-gray-400">
                        Receipt:{" "}
                        {
                          item.receiptId
                        }
                      </p>
                    )}

                    {item.notes && (
                      <p className="text-sm text-gray-400 mt-1">
                        {item.notes}
                      </p>
                    )}

                  </div>

                  <div className="flex items-center gap-4">

                    <p
                      className={`font-semibold ${
                        item.positive
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {item.positive
                        ? "+"
                        : "-"}
                      $
                      {item.amount.toFixed(
                        2
                      )}
                    </p>

                    {item.type ===
                      "movement" && (
                      <button
                        type="button"
                        onClick={() =>
                          deleteMovement(
                            movements.find(
                              (movement) =>
                                `movement-${movement.id}` ===
                                item.id
                            )
                          )
                        }
                        className="text-red-500 text-sm hover:text-red-700"
                      >
                        Delete
                      </button>
                    )}

                  </div>

                </div>
              )
            )}

          </div>
        )}

      </div>

    </div>
  );
}
