import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useStore } from "../context/StoreContext";
import { useAuth } from "../context/useAuth";

export default function Reconciliation() {
  const { user, role, storeId } = useAuth();
  const { stores } = useStore();

  const today = new Date().toISOString().split("T")[0];

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
   * ---------------------------------------------------------
   * KEEP STORE SYNCHRONIZED FOR NON-ADMIN USERS
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (role !== "admin" && storeId) {
      setSelectedStore(storeId);
    }
  }, [role, storeId]);

  /*
   * ---------------------------------------------------------
   * LOAD DATA WHEN STORE / DATE CHANGES
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!selectedStore) {
      setLoading(false);
      return;
    }

    fetchReconciliationData();
  }, [selectedStore, selectedDate]);

  /*
   * ---------------------------------------------------------
   * SAFE NUMBER CONVERSION
   * ---------------------------------------------------------
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
   * ---------------------------------------------------------
   * FETCH RECONCILIATION DATA
   *
   * IMPORTANT:
   * We intentionally fetch everything up to and including
   * the selected date because opening float is cumulative.
   * ---------------------------------------------------------
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
       * If already closed, populate the physical
       * cash field from the saved reconciliation.
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
   * ---------------------------------------------------------
   * OPENING FLOAT
   *
   * Everything before the selected date.
   * ---------------------------------------------------------
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
   * ---------------------------------------------------------
   * TODAY'S MOVEMENTS
   * ---------------------------------------------------------
   */

  const todayMovements = useMemo(() => {
    return movements.filter(
      (movement) =>
        movement.date === selectedDate
    );
  }, [movements, selectedDate]);

  /*
   * ---------------------------------------------------------
   * TODAY'S TRANSACTIONS
   * ---------------------------------------------------------
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
   * ---------------------------------------------------------
   * CASH ADDED
   * ---------------------------------------------------------
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
   * ---------------------------------------------------------
   * CASH REMOVED
   * ---------------------------------------------------------
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
   * ---------------------------------------------------------
   * PURCHASE PAYMENTS
   * ---------------------------------------------------------
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
   * ---------------------------------------------------------
   * SUBSEQUENT PAYOUTS
   * ---------------------------------------------------------
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
   * ---------------------------------------------------------
   * EXPECTED CLOSING FLOAT
   * ---------------------------------------------------------
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
   * ---------------------------------------------------------
   * COUNTED CASH
   * ---------------------------------------------------------
   */

  const countedCash =
    parseAmount(cashCounted);

  /*
   * ---------------------------------------------------------
   * CASH DIFFERENCE
   * ---------------------------------------------------------
   */

  const difference =
    countedCash -
    expectedClosingFloat;

  /*
   * ---------------------------------------------------------
   * GOLD BY KARAT
   *
   * IMPORTANT:
   * Gold is NOT summed into one total.
   *
   * Example:
   *
   * 24K | 15.20g
   * 22K | 31.50g
   * 18K | 8.75g
   * ---------------------------------------------------------
   */

  const goldByKarat = useMemo(() => {
    const grouped = {};

    todayTransactions
      .filter(
        (transaction) =>
          transaction.transaction_type ===
            "purchase" &&
          transaction.metal_type ===
            "Gold"
      )
      .forEach((transaction) => {
        const rawKarat =
          transaction.karats ??
          transaction.karat ??
          "Unknown";

        const karat =
          String(rawKarat).trim() ||
          "Unknown";

        const weight =
          parseAmount(
            transaction.weight
          );

        if (!grouped[karat]) {
          grouped[karat] = 0;
        }

        grouped[karat] += weight;
      });

    return Object.entries(grouped)
      .map(
        ([karat, weight]) => ({
          karat,
          weight,
        })
      )
      .sort((a, b) => {
        const aNumber =
          Number(
            String(a.karat).replace(
              /[^0-9.]/g,
              ""
            )
          );

        const bNumber =
          Number(
            String(b.karat).replace(
              /[^0-9.]/g,
              ""
            )
          );

        if (
          Number.isFinite(aNumber) &&
          Number.isFinite(bNumber)
        ) {
          return bNumber - aNumber;
        }

        return String(
          a.karat
        ).localeCompare(
          String(b.karat)
        );
      });
  }, [todayTransactions]);

  /*
   * ---------------------------------------------------------
   * SILVER
   * ---------------------------------------------------------
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
   * ---------------------------------------------------------
   * TOTAL GOLD VALUE
   *
   * This remains available as a value total, but gold
   * weight is displayed by karat.
   * ---------------------------------------------------------
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
   * ---------------------------------------------------------
   * TOTAL CASH PAID
   * ---------------------------------------------------------
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
   * ---------------------------------------------------------
   * PURCHASE VALUE
   * ---------------------------------------------------------
   */

  const totalPurchaseValue = useMemo(() => {
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
            transaction.amount
          ),
        0
      );
  }, [todayTransactions]);

  /*
   * ---------------------------------------------------------
   * STORE NAME
   * ---------------------------------------------------------
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
   * ---------------------------------------------------------
   * LOCKED
   * ---------------------------------------------------------
   */

  const isLocked =
    Boolean(reconciliation);

  /*
   * ---------------------------------------------------------
   * DIFFERENCE DISPLAY
   * ---------------------------------------------------------
   */

  const isBalanced =
    Math.abs(difference) < 0.005;

  const isOver =
    difference > 0.005;

  const differenceColor =
    isBalanced
      ? "text-green-600"
      : isOver
      ? "text-blue-600"
      : "text-red-600";

  /*
   * ---------------------------------------------------------
   * CLOSE DAY
   * ---------------------------------------------------------
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

    if (countedCash < 0) {
      alert(
        "Physical cash counted cannot be negative."
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
          `Opening float: $${openingFloat.toFixed(
            2
          )}\n` +
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
       */

      const {
        data: existingRows,
        error: checkError,
      } = await supabase
        .from("reconciliations")
        .select("id")
        .eq(
          "store_id",
          selectedStore
        )
        .eq(
          "date",
          selectedDate
        )
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
       * Save reconciliation record.
       *
       * total_amount remains the physical cash counted.
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
       */

      const {
        error:
          transactionLockError,
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
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Store Reconciliation
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Loading reconciliation...
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-5 bg-gray-200 rounded w-1/3" />
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * MAIN VIEW
   * ---------------------------------------------------------
   */

  return (
    <div className="space-y-4 md:space-y-6 pb-8 max-w-6xl mx-auto">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Store Reconciliation
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Count the physical cash and close
          the store for the selected day.
        </p>
      </div>

      {/* STORE / DATE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* STORE */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">
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
                disabled={saving}
                className="border border-gray-300 rounded-xl px-4 py-3 w-full text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
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
                className="border border-gray-300 rounded-xl px-4 py-3 w-full text-sm bg-gray-50"
              />
            )}
          </div>

          {/* DATE */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">
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
              className="border border-gray-300 rounded-xl px-4 py-3 w-full text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>

        </div>

        <div className="mt-3 text-xs text-gray-500">
          Reviewing:{" "}
          <span className="font-medium text-gray-700">
            {selectedStoreName}
          </span>{" "}
          · {selectedDate}
        </div>
      </div>

      {/* CLOSED BANNER */}
      {isLocked && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 md:p-5">

          <div className="flex items-start gap-3">

            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <span className="text-green-700 font-bold">
                ✓
              </span>
            </div>

            <div className="min-w-0">
              <p className="font-semibold text-green-800">
                Day Closed
              </p>

              <p className="text-sm text-green-700 mt-1">
                {selectedStoreName} is closed
                for {selectedDate}.
              </p>

              <p className="text-sm text-green-700 mt-1">
                Physical cash recorded:{" "}
                <strong>
                  $
                  {parseAmount(
                    reconciliation?.total_amount
                  ).toFixed(2)}
                </strong>
              </p>
            </div>

          </div>
        </div>
      )}

      {/* FLOAT SUMMARY */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold">
              Cash Position
            </h2>

            <p className="text-xs text-gray-500">
              Expected cash for the end of the day
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

          {/* OPENING */}
          <div className="bg-black text-white rounded-2xl p-5">

            <p className="text-xs text-gray-400">
              Opening Float
            </p>

            <p className="text-2xl md:text-3xl font-bold text-yellow-400 mt-1">
              $
              {openingFloat.toFixed(2)}
            </p>

            <p className="text-xs text-gray-400 mt-2">
              Balance before {selectedDate}
            </p>

          </div>

          {/* EXPECTED */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

            <p className="text-xs text-gray-500">
              Expected Closing Float
            </p>

            <p className="text-2xl md:text-3xl font-bold mt-1">
              $
              {expectedClosingFloat.toFixed(
                2
              )}
            </p>

            <p className="text-xs text-gray-400 mt-2">
              What should be physically present
            </p>

          </div>

          {/* DIFFERENCE */}
          <div
            className={`bg-white rounded-2xl border shadow-sm p-5 ${
              isBalanced
                ? "border-green-200"
                : "border-red-200"
            }`}
          >
            <p className="text-xs text-gray-500">
              Difference
            </p>

            <p
              className={`text-2xl md:text-3xl font-bold mt-1 ${differenceColor}`}
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
              Based on physical cash entered below
            </p>
          </div>

        </div>
      </section>
      

      {/* PHYSICAL CASH */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        <div className="p-4 md:p-5 border-b border-gray-100">

          <h2 className="text-lg font-semibold">
            Physical Cash Count
          </h2>

          <p className="text-xs md:text-sm text-gray-500 mt-1">
            Count the actual cash physically present in the store.
          </p>

        </div>

        <div className="p-4 md:p-5">

          <label className="text-sm font-medium mb-2 block">
            Physical Cash Counted
          </label>

          <div className="relative max-w-xl">

            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
              $
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
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
              className="border border-gray-300 rounded-xl pl-9 pr-4 py-4 w-full text-xl font-semibold disabled:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />

          </div>

          {/* DIFFERENCE */}
          {cashCounted !== "" && (
            <div
              className={`mt-4 rounded-2xl border p-4 md:p-5 ${
                isBalanced
                  ? "bg-green-50 border-green-200"
                  : isOver
                  ? "bg-blue-50 border-blue-200"
                  : "bg-red-50 border-red-200"
              }`}
            >

              <div className="flex items-center justify-between gap-4">

                <div>
                  <p
                    className={`text-sm font-semibold ${
                      isBalanced
                        ? "text-green-700"
                        : isOver
                        ? "text-blue-700"
                        : "text-red-700"
                    }`}
                  >
                    {isBalanced
                      ? "Balanced"
                      : isOver
                      ? "Cash Over"
                      : "Cash Short"}
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    Compared with expected closing float
                  </p>
                </div>

                <p
                  className={`text-xl md:text-2xl font-bold ${differenceColor}`}
                >
                  {difference >= 0
                    ? "+"
                    : "-"}
                  $
                  {Math.abs(
                    difference
                  ).toFixed(2)}
                </p>

              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-current/10">

                <div>
                  <p className="text-xs text-gray-500">
                    Expected
                  </p>

                  <p className="font-semibold mt-1">
                    $
                    {expectedClosingFloat.toFixed(
                      2
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Counted
                  </p>

                  <p className="font-semibold mt-1">
                    $
                    {countedCash.toFixed(2)}
                  </p>
                </div>

              </div>

            </div>
          )}

        </div>
      </section>

      {/* CLOSE DAY */}
      {!isLocked ? (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6">

          <div className="mb-4">

            <h2 className="text-lg font-semibold">
              Close Store Day
            </h2>

            <p className="text-xs md:text-sm text-gray-500 mt-1">
              Closing the day records the physical cash
              and prevents further transactions for this
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
            className="w-full bg-green-600 text-white px-6 py-4 rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving
              ? "Closing Day..."
              : "Confirm & Close Day"}
          </button>

        </section>
      ) : (
        <section className="bg-green-50 border border-green-200 rounded-2xl p-5">

          <div className="flex items-start gap-3">

            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
              <span className="text-green-700 font-bold">
                ✓
              </span>
            </div>

            <div className="min-w-0">

              <p className="font-semibold text-green-800">
                Day is closed
              </p>

              <p className="text-sm text-green-700 mt-1">
                This store/date has already been
                reconciled.
              </p>

              <div className="mt-3 space-y-1 text-sm text-green-700">

                <p>
                  Confirmed by:{" "}
                  {reconciliation?.confirmed_by}
                </p>

                <p>
                  Physical cash: $
                  {parseAmount(
                    reconciliation?.total_amount
                  ).toFixed(2)}
                </p>

                {reconciliation?.created_at && (
                  <p>
                    Closed on:{" "}
                    {new Date(
                      reconciliation.created_at
                    ).toLocaleString()}
                  </p>
                )}

              </div>

            </div>

          </div>

        </section>
      )}

      {/* DAY ACTIVITY */}
      <section>
        <h2 className="text-lg font-semibold mb-3">
          Today's Activity
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500">
              Cash Added
            </p>

            <p className="text-xl font-semibold text-green-600 mt-1">
              +$
              {todayCashAdded.toFixed(2)}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500">
              Withdrawals / Expenses
            </p>

            <p className="text-xl font-semibold text-red-600 mt-1">
              -$
              {todayCashRemoved.toFixed(
                2
              )}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500">
              Customer Cash Paid
            </p>

            <p className="text-xl font-semibold text-red-600 mt-1">
              -$
              {totalCashPaid.toFixed(2)}
            </p>

            <p className="text-[11px] text-gray-400 mt-1">
              Purchases + payouts
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500">
              Purchase Value
            </p>

            <p className="text-xl font-semibold mt-1">
              $
              {totalPurchaseValue.toFixed(
                2
              )}
            </p>
          </div>

        </div>
      </section>

      {/* METALS */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        <div className="p-4 md:p-5 border-b border-gray-100">

          <div className="flex items-start justify-between gap-3">

            <div>
              <h2 className="text-lg font-semibold">
                Metal Purchased
              </h2>

              <p className="text-xs md:text-sm text-gray-500 mt-1">
                Weight purchased during the selected day.
              </p>
            </div>

            {totalGoldValue > 0 && (
              <div className="text-right shrink-0">
                <p className="text-[11px] text-gray-500">
                  Gold value
                </p>

                <p className="font-semibold">
                  $
                  {totalGoldValue.toFixed(
                    2
                  )}
                </p>
              </div>
            )}

          </div>

        </div>

        <div className="p-4 md:p-5">

          {/* GOLD */}
          <div>

            <div className="flex items-center justify-between mb-3">

              <div>
                <p className="font-semibold text-gray-900">
                  Gold
                </p>

                <p className="text-xs text-gray-500">
                  Weight by karat
                </p>
              </div>

              <span className="text-xs bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-full">
                {goldByKarat.length}{" "}
                {goldByKarat.length === 1
                  ? "karat"
                  : "karats"}
              </span>

            </div>

            {goldByKarat.length === 0 ? (
              <div className="border border-dashed border-gray-200 rounded-xl p-5 text-center">
                <p className="text-sm text-gray-400">
                  No gold purchased.
                </p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">

                {/* Responsive table.
                    It remains a real table on mobile,
                    with compact columns. */}

                <div className="overflow-x-auto">

                  <table className="w-full text-sm">

                    <thead className="bg-yellow-50 border-b border-yellow-100">

                      <tr>

                        <th className="text-left px-3 py-3 font-semibold text-yellow-900">
                          Karat
                        </th>

                        <th className="text-right px-3 py-3 font-semibold text-yellow-900">
                          Weight
                        </th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-gray-100">

                      {goldByKarat.map(
                        (item) => (
                          <tr
                            key={
                              item.karat
                            }
                            className="bg-white"
                          >

                            <td className="px-3 py-3 font-semibold text-gray-900">
                              {item.karat}
                              {String(
                                item.karat
                              ).toLowerCase().includes("k")
                                ? ""
                                : "K"}
                            </td>

                            <td className="px-3 py-3 text-right font-semibold text-gray-900">
                              {item.weight.toFixed(
                                2
                              )}
                              g
                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </div>
            )}

          </div>

          {/* SILVER */}
          <div className="mt-5 pt-5 border-t border-gray-100">

            <div className="flex items-center justify-between">

              <div>
                <p className="font-semibold text-gray-900">
                  Silver
                </p>

                <p className="text-xs text-gray-500">
                  Total weight
                </p>
              </div>

              <p className="text-xl font-bold">
                {totalSilver.toFixed(2)}
                g
              </p>

            </div>

          </div>

        </div>
      </section>

      {/* TRANSACTION ACTIVITY */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        <div className="p-4 md:p-5 border-b border-gray-100">

          <h2 className="text-lg font-semibold">
            Transaction Activity
          </h2>

          <p className="text-xs md:text-sm text-gray-500 mt-1">
            Summary of transactions recorded for the day.
          </p>

        </div>

        <div className="divide-y divide-gray-100">

          <div className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">
                Purchases
              </p>

              <p className="text-xs text-gray-500 mt-0.5">
                Customer purchases recorded
              </p>
            </div>

            <p className="text-lg font-semibold">
              {
                todayTransactions.filter(
                  (transaction) =>
                    transaction.transaction_type ===
                    "purchase"
                ).length
              }
            </p>
          </div>

          <div className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">
                Subsequent Payments
              </p>

              <p className="text-xs text-gray-500 mt-0.5">
                Payments against outstanding receipts
              </p>
            </div>

            <p className="text-lg font-semibold">
              {
                todayTransactions.filter(
                  (transaction) =>
                    transaction.transaction_type ===
                    "payout"
                ).length
              }
            </p>
          </div>

          <div className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">
                Purchase Value
              </p>

              <p className="text-xs text-gray-500 mt-0.5">
                Total agreed purchase value
              </p>
            </div>

            <p className="text-lg font-semibold">
              $
              {totalPurchaseValue.toFixed(
                2
              )}
            </p>
          </div>

        </div>
      </section>

    </div>
  );
}
