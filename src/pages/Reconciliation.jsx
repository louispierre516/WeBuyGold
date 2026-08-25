import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useStore } from "../context/StoreContext";
import { useAuth } from "../context/useAuth";

export default function Reconciliation() {
  const { user, role, storeId } = useAuth();
  const { stores } = useStore();

  const today =
    new Date().toISOString().split("T")[0];

  const [selectedStore, setSelectedStore] =
    useState(storeId || "");

  const [selectedDate, setSelectedDate] =
    useState(today);

  const [movements, setMovements] =
    useState([]);

  const [transactions, setTransactions] =
    useState([]);

  const [reconciliation, setReconciliation] =
    useState(null);

  const [cashCounted, setCashCounted] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  /*
   * Keep store synchronized for
   * non-admin users.
   */
  useEffect(() => {
    if (role !== "admin" && storeId) {
      setSelectedStore(storeId);
    }
  }, [role, storeId]);

  /*
   * Load reconciliation data whenever
   * store or date changes.
   */
  useEffect(() => {
    if (!selectedStore) {
      setLoading(false);
      return;
    }

    fetchReconciliationData();
  }, [selectedStore, selectedDate]);

  /*
   * Safely convert a value to a number.
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
   * Fetch all float movements and transactions
   * up to and including the selected date.
   *
   * We do this because the closing float for
   * a day is cumulative.
   */
  const fetchReconciliationData =
    async () => {
      if (!selectedStore) {
        return;
      }

      setLoading(true);

      const [
        movementsResponse,
        transactionsResponse,
        reconciliationResponse,
      ] = await Promise.all([
        supabase
          .from("float_movements")
          .select("*")
          .eq("store_id", selectedStore)
          .lte("date", selectedDate)
          .order("date", {
            ascending: true,
          })
          .order("created_at", {
            ascending: true,
          }),

        supabase
          .from("transactions")
          .select("*")
          .eq("store_id", selectedStore)
          .lte("date", selectedDate)
          .order("date", {
            ascending: true,
          })
          .order("created_at", {
            ascending: true,
          }),

        supabase
          .from("reconciliations")
          .select("*")
          .eq("store_id", selectedStore)
          .eq("date", selectedDate)
          .order("created_at", {
            ascending: false,
          })
          .limit(1),
      ]);

      if (movementsResponse.error) {
        console.error(
          "Error fetching float movements:",
          movementsResponse.error
        );

        alert(
          movementsResponse.error.message
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
      }

      if (reconciliationResponse.error) {
        console.error(
          "Error fetching reconciliation:",
          reconciliationResponse.error
        );

        alert(
          reconciliationResponse.error.message
        );
      }

      setMovements(
        movementsResponse.data || []
      );

      setTransactions(
        transactionsResponse.data || []
      );

      const existingReconciliation =
        reconciliationResponse.data?.[0] ||
        null;

      setReconciliation(
        existingReconciliation
      );

      /*
       * If the day is already closed,
       * populate the physical cash field.
       */
      if (existingReconciliation) {
        setCashCounted(
          existingReconciliation.total_amount !==
            null &&
            existingReconciliation.total_amount !==
              undefined
            ? String(
                existingReconciliation.total_amount
              )
            : ""
        );
      } else {
        setCashCounted("");
      }

      setLoading(false);
    };

  /*
   * Calculate opening float for the
   * selected day.
   *
   * This is everything that happened
   * BEFORE the selected date.
   */
  const openingFloat = useMemo(() => {
    let balance = 0;

    movements
      .filter(
        (movement) =>
          movement.date < selectedDate
      )
      .forEach((movement) => {
        const amount =
          parseAmount(
            movement.amount
          );

        switch (
          movement.movement_type
        ) {
          case "opening_float":
          case "owner_addition":
            balance += amount;
            break;

          case "owner_withdrawal":
          case "expense":
            balance -= amount;
            break;

          case "adjustment":
            balance += amount;
            break;

          default:
            break;
        }
      });

    transactions
      .filter(
        (transaction) =>
          transaction.date < selectedDate
      )
      .forEach((transaction) => {
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
      });

    return balance;
  }, [
    movements,
    transactions,
    selectedDate,
  ]);

  /*
   * Today's float movements.
   */
  const todayMovements = useMemo(() => {
    return movements.filter(
      (movement) =>
        movement.date === selectedDate
    );
  }, [movements, selectedDate]);

  /*
   * Today's transactions.
   */
  const todayTransactions = useMemo(() => {
    return transactions.filter(
      (transaction) =>
        transaction.date === selectedDate
    );
  }, [
    transactions,
    selectedDate,
  ]);

  /*
   * Cash added to the float today.
   */
  const todayCashAdded = useMemo(() => {
    return todayMovements
      .filter(
        (movement) =>
          movement.movement_type ===
            "opening_float" ||
          movement.movement_type ===
            "owner_addition" ||
          movement.movement_type ===
            "adjustment"
      )
      .reduce(
        (sum, movement) =>
          sum +
          parseAmount(
            movement.amount
          ),
        0
      );
  }, [todayMovements]);

  /*
   * Cash removed through float
   * movements today.
   */
  const todayCashRemoved = useMemo(() => {
    return todayMovements
      .filter(
        (movement) =>
          movement.movement_type ===
            "owner_withdrawal" ||
          movement.movement_type ===
            "expense"
      )
      .reduce(
        (sum, movement) =>
          sum +
          parseAmount(
            movement.amount
          ),
        0
      );
  }, [todayMovements]);

  /*
   * Customer payments made today
   * against purchases.
   */
  const todayPurchasePayments =
    useMemo(() => {
      return todayTransactions
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
    }, [todayTransactions]);

  /*
   * Subsequent customer payouts today.
   */
  const todayPayouts = useMemo(() => {
    return todayTransactions
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
  }, [todayTransactions]);

  /*
   * Expected closing float.
   */
  const expectedClosingFloat =
    useMemo(() => {
      return (
        openingFloat +
        todayCashAdded -
        todayCashRemoved -
        todayPurchasePayments -
        todayPayouts
      );
    }, [
      openingFloat,
      todayCashAdded,
      todayCashRemoved,
      todayPurchasePayments,
      todayPayouts,
    ]);

  /*
   * Physical cash counted.
   */
  const countedCash =
    parseAmount(cashCounted);

  /*
   * Difference between physical
   * and expected cash.
   */
  const difference =
    countedCash -
    expectedClosingFloat;

  /*
   * Gold weight purchased today.
   */
  const totalGold = useMemo(() => {
    return todayTransactions
      .filter(
        (transaction) =>
          transaction.transaction_type ===
            "purchase" &&
          transaction.metal_type ===
            "Gold"
      )
      .reduce(
        (sum, transaction) =>
          sum +
          parseAmount(
            transaction.weight
          ),
        0
      );
  }, [todayTransactions]);

  /*
   * Silver weight purchased today.
   */
  const totalSilver = useMemo(() => {
    return todayTransactions
      .filter(
        (transaction) =>
          transaction.transaction_type ===
            "purchase" &&
          transaction.metal_type ===
            "Silver"
      )
      .reduce(
        (sum, transaction) =>
          sum +
          parseAmount(
            transaction.weight
          ),
        0
      );
  }, [todayTransactions]);

  /*
   * Total gold purchase value
   * calculated from the actual
   * transaction amounts.
   */
  const totalGoldValue = useMemo(() => {
    return todayTransactions
      .filter(
        (transaction) =>
          transaction.transaction_type ===
            "purchase" &&
          transaction.metal_type ===
            "Gold"
      )
      .reduce(
        (sum, transaction) =>
          sum +
          parseAmount(
            transaction.amount
          ),
        0
      );
  }, [todayTransactions]);

  /*
   * Total cash actually paid today.
   *
   * This is what affects the float.
   */
  const totalCashPaid = useMemo(() => {
    return (
      todayPurchasePayments +
      todayPayouts
    );
  }, [
    todayPurchasePayments,
    todayPayouts,
  ]);

  /*
   * Store name.
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
   * Whether the day is already closed.
   */
  const isLocked =
    Boolean(reconciliation);

  /*
   * Close the day.
   */
  const handleConfirm = async () => {
    if (!selectedStore) {
      alert(
        "Please select a store."
      );
      return;
    }

    if (!user?.id) {
      alert(
        "Unable to identify the current user."
      );
      return;
    }

    if (isLocked) {
      alert(
        "This day has already been closed."
      );
      return;
    }

    if (
      cashCounted === "" ||
      cashCounted === null ||
      cashCounted === undefined
    ) {
      alert(
        "Enter the physical cash counted."
      );
      return;
    }

    if (!Number.isFinite(countedCash)) {
      alert(
        "Please enter a valid cash amount."
      );
      return;
    }

    const differenceText =
      difference >= 0
        ? `Cash is $${difference.toFixed(
            2
          )} over the expected float.`
        : `Cash is $${Math.abs(
            difference
          ).toFixed(
            2
          )} short of the expected float.`;

    const confirmed =
      window.confirm(
        `Close ${selectedStoreName} for ${selectedDate}?\n\n` +
          `Expected closing float: $${expectedClosingFloat.toFixed(
            2
          )}\n` +
          `Physical cash counted: $${countedCash.toFixed(
            2
          )}\n` +
          `Difference: $${difference.toFixed(
            2
          )}\n\n` +
          `${differenceText}\n\n` +
          `Once closed, transactions and float movements for this date should no longer be entered.`
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    try {
      /*
       * Re-check immediately before inserting.
       *
       * This protects against another browser/user
       * having closed the day after this page loaded.
       */
      const { data: existingRows, error: checkError } =
        await supabase
          .from("reconciliations")
          .select("id")
          .eq("store_id", selectedStore)
          .eq("date", selectedDate)
          .limit(1);

      if (checkError) {
        throw checkError;
      }

      if (
        existingRows &&
        existingRows.length > 0
      ) {
        alert(
          "This day has already been closed."
        );

        await fetchReconciliationData();
        return;
      }

      /*
       * The existing reconciliation table is
       * used as the closing record.
       *
       * total_amount = physical cash counted.
       */
      const {
        data,
        error,
      } = await supabase
        .from("reconciliations")
        .insert([
          {
            store_id:
              selectedStore,

            date:
              selectedDate,

            total_amount:
              countedCash,

            confirmed_by:
              user.id,
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      /*
       * Lock transactions for this store/date.
       *
       * We use store_id because that is the actual
       * column in your transactions table.
       */
      const {
        error: transactionLockError,
      } = await supabase
        .from("transactions")
        .update({
          locked: true,
        })
        .eq(
          "store_id",
          selectedStore
        )
        .eq(
          "date",
          selectedDate
        );

      if (transactionLockError) {
        /*
         * The reconciliation has already been
         * inserted at this point.
         *
         * We report the problem rather than pretending
         * the whole close succeeded.
         */
        console.error(
          "Transaction lock error:",
          transactionLockError
        );

        alert(
          `The reconciliation was saved, but transactions could not be locked.\n\n${transactionLockError.message}`
        );

        setReconciliation(data);

        return;
      }

      setReconciliation(data);

      alert(
        "Day successfully closed and transactions locked."
      );

      await fetchReconciliationData();
    } catch (error) {
      console.error(
        "Error closing day:",
        error
      );

      alert(
        error.message ||
          "Unable to close the day."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * Format difference.
   */
  const differenceColor =
    Math.abs(difference) < 0.005
      ? "text-green-600"
      : difference > 0
      ? "text-blue-600"
      : "text-red-600";

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-gray-500">
            Loading reconciliation...
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
          Store Reconciliation
        </h1>

        <p className="text-gray-500 mt-1">
          Count the physical cash and close
          the store for the selected day.
        </p>
      </div>

      {/* STORE / DATE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <label className="text-sm font-medium mb-1 block">
              Store
            </label>

            {role === "admin" ? (
              <select
                value={selectedStore}
                onChange={(e) =>
                  setSelectedStore(
                    e.target.value
                  )
                }
                className="border p-3 rounded-lg w-full"
                disabled={saving}
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
            ) : (
              <input
                value={
                  selectedStoreName
                }
                disabled
                className="border p-3 rounded-lg w-full bg-gray-50"
              />
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">
              Closing Date
            </label>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) =>
                setSelectedDate(
                  e.target.value
                )
              }
              disabled={saving}
              className="border p-3 rounded-lg w-full"
            />
          </div>

        </div>

      </div>

      {/* CLOSED WARNING */}
      {isLocked && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">

          <div className="flex items-start gap-3">

            <div className="text-green-600 text-xl">
              ✓
            </div>

            <div>
              <p className="font-semibold text-green-800">
                Day Closed
              </p>

              <p className="text-sm text-green-700 mt-1">
                {selectedStoreName} is closed
                for {selectedDate}.
              </p>

              <p className="text-sm text-green-700 mt-1">
                Physical cash recorded:
                {" "}
                <strong>
                  $
                  {parseAmount(
                    reconciliation.total_amount
                  ).toFixed(2)}
                </strong>
              </p>

            </div>

          </div>

        </div>
      )}

      {/* EXPECTED FLOAT */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="bg-black text-white rounded-2xl p-6">

          <p className="text-sm text-gray-400">
            Opening Float
          </p>

          <p className="text-3xl font-bold text-yellow-400 mt-2">
            $
            {openingFloat.toFixed(2)}
          </p>

          <p className="text-xs text-gray-400 mt-2">
            Balance before {selectedDate}
          </p>

        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

          <p className="text-sm text-gray-500">
            Expected Closing Float
          </p>

          <p className="text-3xl font-bold mt-2">
            $
            {expectedClosingFloat.toFixed(
              2
            )}
          </p>

          <p className="text-xs text-gray-400 mt-2">
            What should physically be in
            the store
          </p>

        </div>

        <div
          className={`bg-white rounded-2xl border shadow-sm p-6 ${
            Math.abs(difference) <
            0.005
              ? "border-green-200"
              : "border-red-200"
          }`}
        >

          <p className="text-sm text-gray-500">
            Difference
          </p>

          <p
            className={`text-3xl font-bold mt-2 ${differenceColor}`}
          >
            {difference >= 0
              ? "+"
              : "-"}
            $
            {Math.abs(
              difference
            ).toFixed(2)}
          </p>

          <p className="text-xs text-gray-400 mt-2">
            Based on physical cash entered
            below
          </p>

        </div>

      </div>

      {/* DAY ACTIVITY */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

          <p className="text-sm text-gray-500">
            Cash Added
          </p>

          <p className="text-2xl font-semibold text-green-600 mt-2">
            +$
            {todayCashAdded.toFixed(2)}
          </p>

        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

          <p className="text-sm text-gray-500">
            Float Withdrawals / Expenses
          </p>

          <p className="text-2xl font-semibold text-red-600 mt-2">
            -$
            {todayCashRemoved.toFixed(
              2
            )}
          </p>

        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

          <p className="text-sm text-gray-500">
            Customer Cash Paid
          </p>

          <p className="text-2xl font-semibold text-red-600 mt-2">
            -$
            {totalCashPaid.toFixed(2)}
          </p>

          <p className="text-xs text-gray-400 mt-1">
            Purchases + subsequent payouts
          </p>

        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

          <p className="text-sm text-gray-500">
            Gold Purchased
          </p>

          <p className="text-2xl font-semibold mt-2">
            {totalGold.toFixed(2)}g
          </p>

          <p className="text-xs text-gray-400 mt-1">
            Value: $
            {totalGoldValue.toFixed(
              2
            )}
          </p>

        </div>

      </div>

      {/* SILVER */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

        <p className="text-sm text-gray-500">
          Silver Purchased
        </p>

        <p className="text-2xl font-semibold mt-2">
          {totalSilver.toFixed(2)}g
        </p>

      </div>

      {/* CASH COUNT */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

        <div className="mb-5">

          <h2 className="text-lg font-medium">
            Physical Cash Count
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Count the actual cash physically
            present in the store.
          </p>

        </div>

        <div className="max-w-md">

          <label className="text-sm font-medium mb-1 block">
            Physical Cash Counted
          </label>

          <div className="relative">

            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              $
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={cashCounted}
              onChange={(e) =>
                setCashCounted(
                  e.target.value
                )
              }
              disabled={
                isLocked || saving
              }
              placeholder="0.00"
              className="border p-3 pl-8 rounded-lg w-full disabled:bg-gray-50"
            />

          </div>

        </div>

      </div>

      {/* DIFFERENCE */}
      {cashCounted !== "" && (
        <div
          className={`rounded-2xl border p-6 ${
            Math.abs(difference) <
            0.005
              ? "bg-green-50 border-green-200"
              : difference > 0
              ? "bg-blue-50 border-blue-200"
              : "bg-red-50 border-red-200"
          }`}
        >

          <p className="text-sm text-gray-600">
            Reconciliation Result
          </p>

          <p
            className={`text-3xl font-bold mt-2 ${differenceColor}`}
          >
            {Math.abs(difference) <
            0.005
              ? "Balanced"
              : difference > 0
              ? "Cash Over"
              : "Cash Short"}
          </p>

          <p className="text-lg mt-2">
            Difference:
            {" "}
            <strong>
              {difference >= 0
                ? "+"
                : "-"}
              $
              {Math.abs(
                difference
              ).toFixed(2)}
            </strong>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">

            <div>
              <p className="text-sm text-gray-500">
                Expected
              </p>

              <p className="font-semibold">
                $
                {expectedClosingFloat.toFixed(
                  2
                )}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Counted
              </p>

              <p className="font-semibold">
                $
                {countedCash.toFixed(2)}
              </p>
            </div>

          </div>

        </div>
      )}

      {/* CLOSE BUTTON */}
      {!isLocked ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

          <div className="mb-5">

            <h2 className="text-lg font-medium">
              Close Store Day
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Closing the day records the
              physical cash and prevents
              further transactions for this
              store/date through the application.
            </p>

          </div>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={
              saving ||
              cashCounted === ""
            }
            className="w-full md:w-auto bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving
              ? "Closing Day..."
              : "Confirm & Close Day"}
          </button>

        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6">

          <p className="font-semibold text-green-800">
            Day is closed.
          </p>

          <p className="text-sm text-green-700 mt-1">
            Confirmed by user:
            {" "}
            {reconciliation.confirmed_by}
          </p>

          <p className="text-sm text-green-700">
            Physical cash:
            {" "}
            $
            {parseAmount(
              reconciliation.total_amount
            ).toFixed(2)}
          </p>

          <p className="text-sm text-green-700">
            Closed on:
            {" "}
            {reconciliation.created_at
              ? new Date(
                  reconciliation.created_at
                ).toLocaleString()
              : ""}
          </p>

        </div>
      )}

    </div>
  );
}
