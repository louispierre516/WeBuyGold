import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { useStore } from "../context/StoreContext";
import { supabase } from "../lib/supabase";

export default function FloatManagement() {
  const today = new Date().toISOString().split("T")[0];

  const { stores } = useStore();
  const { user, role, storeId } = useAuth();

  const [selectedStore, setSelectedStore] = useState(
    storeId || ""
  );

  const [movements, setMovements] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Reporting period
  const [period, setPeriod] = useState("today");
  const [specificDate, setSpecificDate] = useState(today);
  const [customStartDate, setCustomStartDate] = useState(today);
  const [customEndDate, setCustomEndDate] = useState(today);

  // Form
  const [movementType, setMovementType] =
    useState("owner_addition");

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");

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
    } else {
      setLoading(false);
    }
  }, [selectedStore]);

  /*
   * Fetch movements and transactions.
   */
  const fetchFloatData = async () => {
    if (!selectedStore) {
      setLoading(false);
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

      alert(movementsResponse.error.message);
    } else {
      setMovements(movementsResponse.data || []);
    }

    if (transactionsResponse.error) {
      console.error(
        "Error fetching transactions:",
        transactionsResponse.error
      );

      alert(transactionsResponse.error.message);
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

    return Number.isFinite(number) ? number : 0;
  };

  /*
   * Format a date as YYYY-MM-DD using local time.
   */
  const formatDate = (dateValue) => {
    const year = dateValue.getFullYear();

    const month = String(
      dateValue.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      dateValue.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  /*
   * Get the date range represented by
   * the selected reporting period.
   */
  const reportingRange = useMemo(() => {
    const currentDate = new Date();

    const currentYear =
      currentDate.getFullYear();

    const currentMonth =
      currentDate.getMonth();

    const currentDay =
      currentDate.getDate();

    switch (period) {
      case "today":
        return {
          start: today,
          end: today,
          label: "Today",
        };

      case "specific_date":
        return {
          start: specificDate,
          end: specificDate,
          label: specificDate,
        };

      case "week": {
        const dayOfWeek =
          currentDate.getDay();

        const startOfWeek =
          new Date(currentDate);

        startOfWeek.setDate(
          currentDay - dayOfWeek
        );

        const endOfWeek =
          new Date(startOfWeek);

        endOfWeek.setDate(
          startOfWeek.getDate() + 6
        );

        return {
          start: formatDate(startOfWeek),
          end: formatDate(endOfWeek),
          label: "This Week",
        };
      }

      case "month": {
        const startOfMonth = new Date(
          currentYear,
          currentMonth,
          1
        );

        const endOfMonth = new Date(
          currentYear,
          currentMonth + 1,
          0
        );

        return {
          start: formatDate(startOfMonth),
          end: formatDate(endOfMonth),
          label: "This Month",
        };
      }

      case "custom":
        return {
          start: customStartDate,
          end: customEndDate,
          label: "Custom Range",
        };

      case "all":
        return {
          start: null,
          end: null,
          label: "All Time",
        };

      default:
        return {
          start: today,
          end: today,
          label: "Today",
        };
    }
  }, [
    period,
    specificDate,
    customStartDate,
    customEndDate,
    today,
  ]);

  /*
   * Determine whether a date falls
   * inside the selected reporting period.
   */
  const isDateInRange = (dateValue) => {
    if (!dateValue) {
      return false;
    }

    if (
      reportingRange.start === null ||
      reportingRange.end === null
    ) {
      return true;
    }

    return (
      dateValue >= reportingRange.start &&
      dateValue <= reportingRange.end
    );
  };

  /*
   * Filter movements for the selected period.
   */
  const filteredMovements = useMemo(() => {
    return movements.filter((movement) =>
      isDateInRange(movement.date)
    );
  }, [movements, reportingRange]);

  /*
   * Filter transactions for the selected period.
   */
  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) =>
      isDateInRange(transaction.date)
    );
  }, [transactions, reportingRange]);

  /*
   * Get the amount actually paid for a transaction.
   *
   * Purchases use amount_paid.
   * Payouts use amount.
   */
  const getTransactionPaidAmount = (transaction) => {
    if (!transaction) {
      return 0;
    }

    if (
      transaction.transaction_type === "purchase"
    ) {
      return parseAmount(
        transaction.amount_paid
      );
    }

    if (
      transaction.transaction_type === "payout"
    ) {
      return parseAmount(
        transaction.amount
      );
    }

    return 0;
  };

  /*
   * Normalize metal type.
   */
  const getMetalType = (transaction) => {
    return String(
      transaction?.metal_type || ""
    ).trim().toLowerCase();
  };

  /*
   * Current float.
   *
   * This intentionally uses ALL movements and
   * transactions because Current Float is the
   * actual current store balance.
   *
   * Purchases subtract amount_paid.
   * Customer payouts subtract amount.
   */
  const currentFloat = useMemo(() => {
    let balance = 0;

    movements.forEach((movement) => {
      const value = parseAmount(
        movement.amount
      );

      switch (
        movement.movement_type
      ) {
        case "opening_float":
        case "owner_addition":
          balance += value;
          break;

        case "owner_withdrawal":
        case "expense":
          balance -= value;
          break;

        case "adjustment":
          balance += value;
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
   * Owner additions for selected period.
   */
  const totalAdditions = useMemo(() => {
    return filteredMovements
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
  }, [filteredMovements]);

  /*
   * Owner withdrawals for selected period.
   */
  const totalWithdrawals = useMemo(() => {
    return filteredMovements
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
  }, [filteredMovements]);

  /*
   * Other float expenses.
   */
  const totalExpenses = useMemo(() => {
    return filteredMovements
      .filter(
        (movement) =>
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
  }, [filteredMovements]);

  /*
   * Gold purchase payments.
   *
   * Purchases are separated by metal_type.
   */
  const totalGoldPurchases = useMemo(() => {
    return filteredTransactions
      .filter((transaction) => {
        return (
          transaction.transaction_type ===
            "purchase" &&
          getMetalType(transaction) ===
            "gold"
        );
      })
      .reduce(
        (sum, transaction) =>
          sum +
          parseAmount(
            transaction.amount_paid
          ),
        0
      );
  }, [filteredTransactions]);

  /*
   * Silver purchase payments.
   */
  const totalSilverPurchases = useMemo(() => {
    return filteredTransactions
      .filter((transaction) => {
        return (
          transaction.transaction_type ===
            "purchase" &&
          getMetalType(transaction) ===
            "silver"
        );
      })
      .reduce(
        (sum, transaction) =>
          sum +
          parseAmount(
            transaction.amount_paid
          ),
        0
      );
  }, [filteredTransactions]);

  /*
   * Purchases where metal_type is missing
   * or is not gold/silver.
   */
  const totalOtherPurchases = useMemo(() => {
    return filteredTransactions
      .filter((transaction) => {
        const metal =
          getMetalType(transaction);

        return (
          transaction.transaction_type ===
            "purchase" &&
          metal !== "gold" &&
          metal !== "silver"
        );
      })
      .reduce(
        (sum, transaction) =>
          sum +
          parseAmount(
            transaction.amount_paid
          ),
        0
      );
  }, [filteredTransactions]);

  /*
   * Total customer payouts.
   *
   * Payout transactions use the `amount`
   * column, not `amount_paid`.
   */
  const totalCustomerPayouts = useMemo(() => {
    return filteredTransactions
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
  }, [filteredTransactions]);

  /*
   * Total purchase payments.
   */
  const totalPurchasePayments = useMemo(() => {
    return filteredTransactions
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
  }, [filteredTransactions]);

  /*
   * Total money leaving the float
   * during the selected period.
   */
  const totalMoneyOut = useMemo(() => {
    return (
      totalPurchasePayments +
      totalCustomerPayouts +
      totalExpenses +
      totalWithdrawals
    );
  }, [
    totalPurchasePayments,
    totalCustomerPayouts,
    totalExpenses,
    totalWithdrawals,
  ]);

  /*
   * Selected store name.
   */
  const selectedStoreName =
    stores.find(
      (store) =>
        store.store_id === selectedStore ||
        store.id === selectedStore
    )?.name || "Selected Store";

  /*
   * Add float movement.
   */
  const saveMovement = async (event) => {
    event.preventDefault();

    const numericAmount =
      parseAmount(amount);

    if (!selectedStore) {
      alert("Please select a store.");
      return;
    }

    if (numericAmount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    if (
      (movementType ===
        "owner_withdrawal" ||
        movementType === "expense") &&
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
      store_id: selectedStore,
      user_id: user?.id || null,
      amount: numericAmount,
      movement_type: movementType,
      notes: notes.trim() || null,
      date,
    };

    const { error } =
      await supabase
        .from("float_movements")
        .insert([movement]);

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
   */
  const deleteMovement = async (
    movement
  ) => {
    if (!movement) {
      return;
    }

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
  const movementLabel = (type) => {
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
        return "Other Expense";

      default:
        return type;
    }
  };

  /*
   * Determine whether movement
   * increases or decreases float.
   */
  const movementIsPositive = (type) => {
    return (
      type === "opening_float" ||
      type === "owner_addition" ||
      type === "adjustment"
    );
  };

  /*
   * Get transaction activity label.
   */
  const getTransactionLabel = (transaction) => {
    if (
      transaction.transaction_type ===
      "purchase"
    ) {
      const metal =
        getMetalType(transaction);

      if (metal === "gold") {
        return "Gold Purchase";
      }

      if (metal === "silver") {
        return "Silver Purchase";
      }

      return "Metal Purchase";
    }

    if (
      transaction.transaction_type ===
      "payout"
    ) {
      return "Customer Payout";
    }

    return "Transaction";
  };

  /*
   * Combined activity for selected period.
   */
  const activity = useMemo(() => {
    const movementActivity =
      filteredMovements.map(
        (movement) => ({
          id: `movement-${movement.id}`,

          date: movement.date,

          created_at:
            movement.created_at,

          type: "movement",

          movementType:
            movement.movement_type,

          label: movementLabel(
            movement.movement_type
          ),

          amount: parseAmount(
            movement.amount
          ),

          positive:
            movementIsPositive(
              movement.movement_type
            ),

          notes: movement.notes,
        })
      );

    const transactionActivity =
      filteredTransactions
        .filter(
          (transaction) =>
            transaction.transaction_type ===
              "purchase" ||
            transaction.transaction_type ===
              "payout"
        )
        .map((transaction) => {
          const value =
            getTransactionPaidAmount(
              transaction
            );

          const isPurchase =
            transaction.transaction_type ===
            "purchase";

          return {
            id: `transaction-${transaction.id}`,

            date: transaction.date,

            created_at:
              transaction.created_at,

            type: "transaction",

            movementType:
              transaction.transaction_type,

            label:
              getTransactionLabel(
                transaction
              ),

            amount: value,

            positive: false,

            notes: transaction.notes,

            customerName:
              transaction.customer_name,

            receiptId:
              transaction.receipt_id,

            metalType:
              transaction.metal_type,

            weight:
              transaction.weight,

            karats:
              transaction.karats,

            amountPaid:
              isPurchase
                ? parseAmount(
                    transaction.amount_paid
                  )
                : null,

            transactionAmount:
              parseAmount(
                transaction.amount
              ),
          };
        });

    return [
      ...movementActivity,
      ...transactionActivity,
    ].sort((a, b) => {
      const dateA = `${a.date || ""} ${
        a.created_at || ""
      }`;

      const dateB = `${b.date || ""} ${
        b.created_at || ""
      }`;

      return dateB.localeCompare(dateA);
    });
  }, [
    filteredMovements,
    filteredTransactions,
  ]);

  /*
   * Display label for the selected period.
   */
  const periodDisplayLabel = useMemo(() => {
    if (period === "today") {
      return "Today";
    }

    if (period === "specific_date") {
      return `Date: ${specificDate}`;
    }

    if (period === "week") {
      return "This Week";
    }

    if (period === "month") {
      return "This Month";
    }

    if (period === "custom") {
      return `${customStartDate} to ${customEndDate}`;
    }

    if (period === "all") {
      return "All Time";
    }

    return "Today";
  }, [
    period,
    specificDate,
    customStartDate,
    customEndDate,
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
          Manage store cash floats and track
          every movement of funds.
        </p>
      </div>

      {/* STORE SELECTOR / REPORTING PERIOD */}
      {role === "admin" && (
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

          <div>
            <label className="text-sm font-medium mb-2 block">
              Store
            </label>

            <select
              value={selectedStore}
              onChange={(e) =>
                setSelectedStore(e.target.value)
              }
              className="border p-3 rounded-lg w-full md:w-80"
            >
              <option value="">
                Select Store
              </option>

              {stores.map((store) => (
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
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">
              Reporting Period
            </label>

            <select
              value={period}
              onChange={(e) =>
                setPeriod(e.target.value)
              }
              className="border p-3 rounded-lg w-full"
            >
              <option value="today">
                Today
              </option>

              <option value="specific_date">
                Specific Date
              </option>

              <option value="week">
                This Week
              </option>

              <option value="month">
                This Month
              </option>

              <option value="custom">
                Custom Range
              </option>

              <option value="all">
                All Time
              </option>
            </select>
          </div>

          {period === "specific_date" && (
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                Select Date
              </label>

              <input
                type="date"
                value={specificDate}
                onChange={(e) =>
                  setSpecificDate(
                    e.target.value
                  )
                }
                className="border p-3 rounded-lg w-full"
              />
            </div>
          )}

          {period === "custom" && (
            <>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">
                  Start Date
                </label>

                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) =>
                    setCustomStartDate(
                      e.target.value
                    )
                  }
                  className="border p-3 rounded-lg w-full"
                />
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">
                  End Date
                </label>

                <input
                  type="date"
                  value={customEndDate}
                  min={customStartDate}
                  onChange={(e) =>
                    setCustomEndDate(
                      e.target.value
                    )
                  }
                  className="border p-3 rounded-lg w-full"
                />
              </div>
            </>
          )}

          <div className="lg:col-span-full mt-2">
            <p className="text-sm text-gray-500">
              Showing:
              <span className="font-medium text-gray-800 ml-1">
                {periodDisplayLabel}
              </span>
            </p>

            <p className="text-xs text-gray-400 mt-1">
              Current Float always shows the
              actual current balance.
            </p>
          </div>
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
            Customer Payouts
          </p>

          <p className="text-2xl font-semibold text-red-600 mt-2">
            -$
            {totalCustomerPayouts.toFixed(2)}
          </p>

          <p className="text-xs text-gray-400 mt-1">
            Direct customer payouts ·{" "}
            {periodDisplayLabel}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-gray-500">
            Gold Purchases
          </p>

          <p className="text-2xl font-semibold text-red-600 mt-2">
            -$
            {totalGoldPurchases.toFixed(2)}
          </p>

          <p className="text-xs text-gray-400 mt-1">
            Gold purchase payments ·{" "}
            {periodDisplayLabel}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-gray-500">
            Silver Purchases
          </p>

          <p className="text-2xl font-semibold text-red-600 mt-2">
            -$
            {totalSilverPurchases.toFixed(2)}
          </p>

          <p className="text-xs text-gray-400 mt-1">
            Silver purchase payments ·{" "}
            {periodDisplayLabel}
          </p>
        </div>
      </div>

      {/* PAYOUT / EXPENSE BREAKDOWN */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-medium">
              Float Outflow Breakdown
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Money paid out of the store float
              during {periodDisplayLabel.toLowerCase()}.
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-gray-400">
              Total Money Out
            </p>

            <p className="text-xl font-semibold text-red-600">
              -$
              {totalMoneyOut.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

          <div className="rounded-xl bg-red-50 border border-red-100 p-4">
            <p className="text-xs text-red-600 font-medium">
              Customer Payouts
            </p>

            <p className="text-xl font-semibold text-red-700 mt-1">
              $
              {totalCustomerPayouts.toFixed(2)}
            </p>
          </div>

          <div className="rounded-xl bg-yellow-50 border border-yellow-100 p-4">
            <p className="text-xs text-yellow-700 font-medium">
              Gold Purchases
            </p>

            <p className="text-xl font-semibold text-yellow-800 mt-1">
              $
              {totalGoldPurchases.toFixed(2)}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
            <p className="text-xs text-gray-600 font-medium">
              Silver Purchases
            </p>

            <p className="text-xl font-semibold text-gray-800 mt-1">
              $
              {totalSilverPurchases.toFixed(2)}
            </p>
          </div>

          <div className="rounded-xl bg-orange-50 border border-orange-100 p-4">
            <p className="text-xs text-orange-700 font-medium">
              Other Expenses
            </p>

            <p className="text-xl font-semibold text-orange-800 mt-1">
              $
              {totalExpenses.toFixed(2)}
            </p>
          </div>

          <div className="rounded-xl bg-purple-50 border border-purple-100 p-4">
            <p className="text-xs text-purple-700 font-medium">
              Owner Withdrawals
            </p>

            <p className="text-xl font-semibold text-purple-800 mt-1">
              $
              {totalWithdrawals.toFixed(2)}
            </p>
          </div>
        </div>

        {totalOtherPurchases > 0 && (
          <div className="mt-4 text-xs text-gray-400">
            Other/unclassified metal purchase
            payments: $
            {totalOtherPurchases.toFixed(2)}
          </div>
        )}
      </div>

      {/* PERIOD INFLOW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-gray-500">
            Owner Additions
          </p>

          <p className="text-2xl font-semibold text-green-600 mt-2">
            +$
            {totalAdditions.toFixed(2)}
          </p>

          <p className="text-xs text-gray-400 mt-1">
            {periodDisplayLabel}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-gray-500">
            Total Purchase Payments
          </p>

          <p className="text-2xl font-semibold text-red-600 mt-2">
            -$
            {totalPurchasePayments.toFixed(2)}
          </p>

          <p className="text-xs text-gray-400 mt-1">
            Gold + Silver + other metal purchases
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
            Add funds before making additional
            customer payments.
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
            Record money entering or leaving
            the store float.
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
                Other Expense
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
                setDate(e.target.value)
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
                setNotes(e.target.value)
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
            Detailed transaction and float
            activity for{" "}
            <span className="font-medium text-gray-700">
              {periodDisplayLabel}
            </span>
          </p>
        </div>

        {activity.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No float activity found for this
            period.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">

            {activity.map((item) => (
              <div
                key={item.id}
                className="p-5 flex flex-col md:flex-row md:items-start md:justify-between gap-4"
              >

                <div className="min-w-0">

                  <div className="flex flex-wrap items-center gap-2">

                    <p className="font-medium">
                      {item.label}
                    </p>

                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        item.type === "movement"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {item.type ===
                      "movement"
                        ? "Float"
                        : "Transaction"}
                    </span>

                    {item.metalType && (
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">
                        {item.metalType}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-400 mt-1">
                    {item.date}
                  </p>

                  {item.customerName && (
                    <p className="text-sm text-gray-600 mt-2">
                      <span className="font-medium">
                        Customer:
                      </span>{" "}
                      {item.customerName}
                    </p>
                  )}

                  {item.weight !== null &&
                    item.weight !== undefined && (
                      <p className="text-sm text-gray-500 mt-1">
                        <span className="font-medium">
                          Weight:
                        </span>{" "}
                        {item.weight}g
                        {item.karats !==
                          null &&
                          item.karats !==
                            undefined &&
                          ` · ${item.karats}K`}
                      </p>
                    )}

                  {item.receiptId && (
                    <p className="text-xs text-gray-400 mt-1">
                      Receipt:{" "}
                      {item.receiptId}
                    </p>
                  )}

                  {item.type ===
                    "transaction" &&
                    item.amountPaid !==
                      null && (
                      <p className="text-sm text-gray-500 mt-2">
                        Amount paid: $
                        {item.amountPaid.toFixed(
                          2
                        )}
                      </p>
                    )}

                  {item.notes && (
                    <p className="text-sm text-gray-400 mt-1">
                      {item.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0">

                  <div className="text-right">
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
                      "transaction" && (
                      <p className="text-xs text-gray-400 mt-1">
                        Paid from float
                      </p>
                    )}
                  </div>

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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
