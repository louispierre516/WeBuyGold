import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { useStore } from "../context/StoreContext";
import { supabase } from "../lib/supabase";

export default function Transactions() {
  const today = new Date().toISOString().split("T")[0];

  const { stores } = useStore();
  const { user, role, storeId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);

  // Reconciliation / locked days
  const [reconciliations, setReconciliations] = useState([]);
  const [reconciliationLoading, setReconciliationLoading] =
    useState(false);

  // Karat rates
  const [karatRates, setKaratRates] = useState([]);
  const [ratesLoading, setRatesLoading] = useState(false);

  // Float
  const [floatMovements, setFloatMovements] = useState([]);
  const [floatLoading, setFloatLoading] = useState(false);

  // Main card tab
  const [receiptView, setReceiptView] =
    useState("outstanding");

  // New transaction form
  const [date, setDate] = useState(today);
  const [customerName, setCustomerName] =
    useState("");
  const [material, setMaterial] =
    useState("Gold");
  const [weight, setWeight] = useState("");

  /*
   * Amount actually paid to the customer TODAY.
   */
  const [amountPaid, setAmountPaid] =
    useState("");

  const [karats, setKarats] = useState("");
  const [overrideRate, setOverrideRate] =
    useState("");
  const [notes, setNotes] = useState("");
  const [store, setStore] = useState(
    storeId || ""
  );

  const [rateManuallyOverridden, setRateManuallyOverridden] =
    useState(false);

  /*
   * Actual agreed purchase amount.
   */
  const [actualAmount, setActualAmount] =
    useState("");

  const [
    actualAmountManuallyEdited,
    setActualAmountManuallyEdited,
  ] = useState(false);

  // Partial payment
  const [paymentMode, setPaymentMode] =
    useState(false);
  const [selectedReceipt, setSelectedReceipt] =
    useState(null);
  const [paymentDate, setPaymentDate] =
    useState(today);
  const [paymentAmount, setPaymentAmount] =
    useState("");
  const [paymentNotes, setPaymentNotes] =
    useState("");

  // History
  const [historyRange, setHistoryRange] =
    useState("today");
  const [customFrom, setCustomFrom] =
    useState("");
  const [customTo, setCustomTo] =
    useState(today);

  /*
   * Fetch transactions whenever the user/store
   * context changes.
   */
  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, role, storeId]);

  /*
   * Fetch karat rates.
   */
  useEffect(() => {
    if (user) {
      fetchKaratRates();
    }
  }, [user]);

  /*
   * Fetch float movements.
   */
  useEffect(() => {
    if (user && storeId) {
      fetchFloatMovements();
    }
  }, [user, storeId]);

  /*
   * Fetch reconciliations.
   */
  useEffect(() => {
    if (user) {
      fetchReconciliations();
    }
  }, [user, role, storeId]);

  /*
   * Keep store synchronized with logged-in store.
   */
  useEffect(() => {
    if (storeId) {
      setStore(storeId);
    }
  }, [storeId]);

  /*
   * Automatically populate karat rate.
   */
  useEffect(() => {
    if (
      material !== "Gold" ||
      !karats ||
      karatRates.length === 0
    ) {
      return;
    }

    const matchingRate = karatRates.find(
      (rate) =>
        Number(rate.karats) === Number(karats)
    );

    if (matchingRate) {
      setOverrideRate(
        String(matchingRate.rate_per_gram)
      );

      setRateManuallyOverridden(false);
    } else {
      setOverrideRate("");
      setRateManuallyOverridden(false);
    }
  }, [karats, material, karatRates]);

  /*
   * Fetch transactions.
   */
  const fetchTransactions = async () => {
    setLoading(true);

    let query = supabase
      .from("transactions")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (role !== "admin") {
      query = query.eq("store_id", storeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        "Error fetching transactions:",
        error
      );
    } else {
      setTransactions(data || []);
    }

    setLoading(false);
  };

  /*
   * Fetch reconciliation records.
   *
   * A reconciliation represents a day that has
   * been confirmed/locked.
   */
  const fetchReconciliations = async () => {
    setReconciliationLoading(true);

    let query = supabase
      .from("reconciliations")
      .select(
        "id, store_id, date, total_amount, confirmed_by, created_at"
      )
      .order("date", {
        ascending: false,
      });

    if (role !== "admin") {
      query = query.eq("store_id", storeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        "Error fetching reconciliations:",
        error
      );

      setReconciliations([]);
    } else {
      setReconciliations(data || []);
    }

    setReconciliationLoading(false);
  };

  /*
   * Determine whether a store/date has been
   * reconciled.
   *
   * Admin users may work across stores, so the
   * store ID is explicitly checked.
   */
  const isDateReconciled = (
    storeIdToCheck,
    dateToCheck
  ) => {
    if (!storeIdToCheck || !dateToCheck) {
      return false;
    }

    return reconciliations.some(
      (reconciliation) =>
        reconciliation.store_id ===
          storeIdToCheck &&
        reconciliation.date ===
          dateToCheck
    );
  };

  /*
   * Locked status for the current new
   * transaction form.
   */
  const currentDateLocked = useMemo(() => {
    return isDateReconciled(
      store || storeId,
      date
    );
  }, [
    reconciliations,
    store,
    storeId,
    date,
  ]);

  /*
   * Locked status for the selected payment.
   */
  const paymentDateLocked = useMemo(() => {
    if (!selectedReceipt) {
      return false;
    }

    return isDateReconciled(
      selectedReceipt.store_id,
      paymentDate
    );
  }, [
    reconciliations,
    selectedReceipt,
    paymentDate,
  ]);

  /*
   * Fetch float movements.
   */
  const fetchFloatMovements = async () => {
    if (!storeId) {
      setFloatMovements([]);
      return;
    }

    setFloatLoading(true);

    const { data, error } = await supabase
      .from("float_movements")
      .select("*")
      .eq("store_id", storeId)
      .order("date", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Error fetching float movements:",
        error
      );

      setFloatMovements([]);
    } else {
      setFloatMovements(data || []);
    }

    setFloatLoading(false);
  };

  /*
   * Fetch karat rates.
   */
  const fetchKaratRates = async () => {
    setRatesLoading(true);

    const { data, error } = await supabase
      .from("karat_rates")
      .select("*")
      .eq("material", "Gold")
      .eq("active", true)
      .order("karats", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Error fetching karat rates:",
        error
      );

      setKaratRates([]);
    } else {
      setKaratRates(data || []);
    }

    setRatesLoading(false);
  };

  /*
   * Convert amount to number.
   */
  const parseAmount = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return 0;
    }

    const cleaned = String(value).replace(
      /[^0-9.-]/g,
      ""
    );

    const parsed = Number(cleaned);

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  };

  /*
   * Generate receipt number.
   */
  const generateReceiptId = () => {
    const datePart = date.replaceAll(
      "-",
      ""
    );

    const sameDayReceipts = new Set(
      transactions
        .filter(
          (t) =>
            t.date === date &&
            t.store_id ===
              (store || storeId)
        )
        .map((t) => t.receipt_id)
        .filter(Boolean)
    );

    const number = String(
      sameDayReceipts.size + 1
    ).padStart(3, "0");

    return `R-${datePart}-${number}`;
  };

  /*
   * Get transactions belonging to receipt.
   */
  const getReceiptTransactions = (
    receiptId
  ) => {
    return transactions.filter(
      (t) => t.receipt_id === receiptId
    );
  };

  /*
   * Calculate receipt balance.
   */
  const getReceiptBalance = (
    receiptId
  ) => {
    const receiptTransactions =
      getReceiptTransactions(
        receiptId
      );

    const originalTransaction =
      receiptTransactions.find(
        (t) =>
          t.transaction_type ===
          "purchase"
      );

    if (!originalTransaction) {
      return 0;
    }

    const originalAmount =
      parseAmount(
        originalTransaction.amount
      );

    const initialPayment = Number(
      originalTransaction.amount_paid ||
        0
    );

    const additionalPayments =
      receiptTransactions
        .filter(
          (t) =>
            t.transaction_type ===
            "payout"
        )
        .reduce(
          (sum, t) =>
            sum + parseAmount(t.amount),
          0
        );

    return Math.max(
      originalAmount -
        initialPayment -
        additionalPayments,
      0
    );
  };

  /*
   * Outstanding receipts.
   */
  const outstandingReceipts = useMemo(() => {
    const receipts = {};

    transactions
      .filter(
        (t) =>
          t.transaction_type ===
          "purchase"
      )
      .forEach((transaction) => {
        const balance =
          getReceiptBalance(
            transaction.receipt_id
          );

        if (balance > 0) {
          receipts[
            transaction.receipt_id
          ] = transaction;
        }
      });

    return Object.values(receipts);
  }, [transactions]);

  /*
   * History filtering.
   */
  const historyTransactions = useMemo(() => {
    let fromDate = today;
    let toDate = today;

    if (historyRange === "7days") {
      const historyDate = new Date();

      historyDate.setDate(
        historyDate.getDate() - 6
      );

      fromDate = historyDate
        .toISOString()
        .split("T")[0];
    }

    if (historyRange === "30days") {
      const historyDate = new Date();

      historyDate.setDate(
        historyDate.getDate() - 29
      );

      fromDate = historyDate
        .toISOString()
        .split("T")[0];
    }

    if (historyRange === "custom") {
      fromDate =
        customFrom || today;

      toDate =
        customTo || today;
    }

    return transactions.filter(
      (t) =>
        t.date >= fromDate &&
        t.date <= toDate
    );
  }, [
    transactions,
    historyRange,
    customFrom,
    customTo,
    today,
  ]);

  /*
   * Calculate current float.
   */
  const currentFloat = useMemo(() => {
    let balance = 0;

    floatMovements.forEach((movement) => {
      const amount =
        parseAmount(movement.amount);

      if (
        movement.movement_type ===
          "opening_float" ||
        movement.movement_type ===
          "owner_addition"
      ) {
        balance += amount;
      }

      if (
        movement.movement_type ===
        "owner_withdrawal"
      ) {
        balance -= amount;
      }

      if (
        movement.movement_type ===
        "adjustment"
      ) {
        balance += amount;
      }
    });

    transactions.forEach((transaction) => {
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
    floatMovements,
    transactions,
  ]);

  /*
   * Current rate.
   */
  const currentRate =
    parseAmount(overrideRate);

  /*
   * Calculated value.
   */
  const calculatedAmount =
    Number(weight) > 0 &&
    currentRate > 0
      ? Math.round(
          Number(weight) *
            currentRate *
            100
        ) / 100
      : 0;

  /*
   * Automatically populate actual purchase
   * amount.
   */
  useEffect(() => {
    if (
      calculatedAmount > 0 &&
      !actualAmountManuallyEdited
    ) {
      setActualAmount(
        calculatedAmount.toFixed(2)
      );
    }

    if (calculatedAmount <= 0) {
      setActualAmount("");
      setActualAmountManuallyEdited(false);
    }
  }, [
    calculatedAmount,
    actualAmountManuallyEdited,
  ]);

  /*
   * Actual agreed purchase amount.
   */
  const actualPurchaseAmount =
    parseAmount(actualAmount);

  /*
   * Purchase adjustment.
   */
  const purchaseAdjustment =
    actualPurchaseAmount -
    calculatedAmount;

  /*
   * Outstanding balance for new transaction.
   */
  const newTransactionBalance =
    Math.max(
      actualPurchaseAmount -
        parseAmount(amountPaid),
      0
    );

  /*
   * Reset form.
   */
  const resetForm = () => {
    setDate(today);
    setCustomerName("");
    setMaterial("Gold");
    setWeight("");
    setAmountPaid("");
    setKarats("");
    setOverrideRate("");
    setNotes("");
    setStore(storeId || "");

    setActualAmount("");
    setActualAmountManuallyEdited(
      false
    );

    setRateManuallyOverridden(false);

    setPaymentMode(false);
    setSelectedReceipt(null);
    setPaymentDate(today);
    setPaymentAmount("");
    setPaymentNotes("");
  };

  /*
   * Start partial payment.
   */
  const startPartialPayment = (
    receipt
  ) => {
    /*
     * A receipt itself can originate from a
     * previously locked purchase. That does not
     * automatically mean every future date is
     * locked.
     *
     * The payment date is checked separately.
     */
    setPaymentMode(true);
    setSelectedReceipt(receipt);
    setPaymentDate(today);
    setPaymentAmount("");
    setPaymentNotes("");
    setReceiptView("outstanding");
  };

  /*
   * Cancel partial payment.
   */
  const cancelPartialPayment = () => {
    setPaymentMode(false);
    setSelectedReceipt(null);
    setPaymentDate(today);
    setPaymentAmount("");
    setPaymentNotes("");
  };

  /*
   * Save initial purchase.
   */
  const savePurchase = async () => {
    const calculatedValue =
      calculatedAmount;

    const finalAmount =
      parseAmount(actualAmount);

    const firstPayment =
      parseAmount(amountPaid);

    /*
     * Reconciliation check.
     *
     * This is intentionally performed again here
     * rather than relying only on the disabled
     * button, because the reconciliation could have
     * happened after the page loaded.
     */
    const selectedStore =
      store || storeId;

    const dateIsLocked =
      isDateReconciled(
        selectedStore,
        date
      );

    if (dateIsLocked) {
      alert(
        `This store/date has already been reconciled and locked.\n\nDate: ${date}\n\nNo new transactions can be added.`
      );

      await fetchReconciliations();

      return;
    }

    if (!selectedStore) {
      alert(
        "Please select a store."
      );
      return;
    }

    if (
      Number(weight) <= 0 ||
      !Number.isFinite(Number(weight))
    ) {
      alert(
        "Please enter a valid weight."
      );
      return;
    }

    if (currentRate <= 0) {
      alert(
        "Please select a karat rate or enter a valid rate."
      );
      return;
    }

    if (calculatedValue <= 0) {
      alert(
        "The calculated value must be greater than zero."
      );
      return;
    }

    if (finalAmount <= 0) {
      alert(
        "Please enter a valid Actual Purchase Amount."
      );
      return;
    }

    if (firstPayment > finalAmount) {
      alert(
        "Amount Paid cannot be greater than the Actual Purchase Amount."
      );
      return;
    }

    if (firstPayment > currentFloat) {
      alert(
        `This payment would exceed the store's available float.\n\nCurrent float: $${currentFloat.toFixed(
          2
        )}\nPayment required: $${firstPayment.toFixed(
          2
        )}`
      );
      return;
    }

    const receiptId =
      generateReceiptId();

    const transaction = {
      receipt_id: receiptId,

      date,

      customer_name:
        customerName,

      metal_type: material,

      weight:
        Number(weight),

      karats:
        material === "Gold" &&
        karats !== ""
          ? Number(karats)
          : null,

      /*
       * Final agreed purchase amount.
       */
      amount:
        finalAmount,

      /*
       * Amount physically paid today.
       */
      amount_paid:
        firstPayment,

      override_rate_per_gram:
        currentRate,

      notes,

      transaction_type:
        "purchase",

      user_id:
        user.id,

      store_id:
        selectedStore,

      /*
       * New transactions are unlocked by default.
       * Reconciliation will set this to true.
       */
      locked: false,
    };

    const { error } =
      await supabase
        .from("transactions")
        .insert([
          transaction,
        ]);

    if (error) {
      console.error(
        "Error saving transaction:",
        error
      );

      alert(error.message);
      return;
    }

    await Promise.all([
      fetchTransactions(),
      fetchFloatMovements(),
      fetchReconciliations(),
    ]);

    resetForm();
  };

  /*
   * Save subsequent partial payment.
   */
  const savePartialPayment =
    async () => {
      if (!selectedReceipt) {
        return;
      }

      /*
       * Check whether the payment date has
       * already been reconciled.
       */
      const paymentStore =
        selectedReceipt.store_id;

      const dateIsLocked =
        isDateReconciled(
          paymentStore,
          paymentDate
        );

      if (dateIsLocked) {
        alert(
          `This store/date has already been reconciled and locked.\n\nDate: ${paymentDate}\n\nNo payment can be added to this date.`
        );

        await fetchReconciliations();

        return;
      }

      /*
       * Also prevent payments against a receipt
       * whose purchase transaction is itself locked
       * when the payment is being recorded on the
       * same locked date.
       */
      const receiptTransactions =
        getReceiptTransactions(
          selectedReceipt.receipt_id
        );

      const lockedReceiptTransaction =
        receiptTransactions.some(
          (transaction) =>
            transaction.locked === true &&
            transaction.date ===
              paymentDate
        );

      if (lockedReceiptTransaction) {
        alert(
          "This receipt is locked for the selected payment date."
        );
        return;
      }

      const currentBalance =
        getReceiptBalance(
          selectedReceipt.receipt_id
        );

      const payment =
        parseAmount(
          paymentAmount
        );

      if (payment <= 0) {
        alert(
          "Please enter a valid payment amount."
        );
        return;
      }

      if (
        payment >
        currentBalance
      ) {
        alert(
          `Payment cannot exceed the outstanding balance of $${currentBalance.toFixed(
            2
          )}.`
        );

        return;
      }

      if (payment > currentFloat) {
        alert(
          `This payment would exceed the store's available float.\n\nCurrent float: $${currentFloat.toFixed(
            2
          )}\nPayment required: $${payment.toFixed(
            2
          )}`
        );

        return;
      }

      const transaction = {
        receipt_id:
          selectedReceipt.receipt_id,

        date: paymentDate,

        customer_name:
          selectedReceipt.customer_name,

        metal_type:
          selectedReceipt.metal_type,

        weight:
          selectedReceipt.weight,

        karats:
          selectedReceipt.karats,

        override_rate_per_gram:
          selectedReceipt.override_rate_per_gram,

        /*
         * Payout amount is the amount actually
         * paid in this payment.
         */
        amount:
          payment,

        amount_paid:
          payment,

        notes:
          paymentNotes,

        transaction_type:
          "payout",

        user_id:
          user.id,

        store_id:
          selectedReceipt.store_id,

        locked: false,
      };

      const { error } =
        await supabase
          .from("transactions")
          .insert([
            transaction,
          ]);

      if (error) {
        console.error(
          "Error saving payment:",
          error
        );

        alert(error.message);
        return;
      }

      await Promise.all([
        fetchTransactions(),
        fetchFloatMovements(),
        fetchReconciliations(),
      ]);

      cancelPartialPayment();
    };

  const handleSubmit = async (
    e
  ) => {
    e.preventDefault();

    if (paymentMode) {
      await savePartialPayment();
    } else {
      await savePurchase();
    }
  };

  /*
   * Delete transaction.
   *
   * Reconciled/locked transactions cannot be
   * deleted.
   */
  const deleteTransaction =
    async (transaction) => {
      /*
       * First check the explicit transaction
       * locked flag.
       */
      if (transaction.locked === true) {
        alert(
          "This transaction is locked because its day has been reconciled. It cannot be deleted."
        );
        return;
      }

      /*
       * Also check the reconciliation table.
       *
       * This protects against a stale transaction
       * object if reconciliation happened after
       * the page was loaded.
       */
      if (
        transaction.store_id &&
        transaction.date &&
        isDateReconciled(
          transaction.store_id,
          transaction.date
        )
      ) {
        alert(
          `This transaction belongs to a reconciled date (${transaction.date}) and cannot be deleted.`
        );

        await fetchReconciliations();
        return;
      }

      if (
        transaction.transaction_type ===
          "purchase" &&
        transaction.receipt_id
      ) {
        const hasPayments =
          transactions.some(
            (t) =>
              t.receipt_id ===
                transaction.receipt_id &&
              t.transaction_type ===
                "payout"
          );

        if (hasPayments) {
          alert(
            "This transaction has partial payments attached to it. Delete the payments first."
          );

          return;
        }
      }

      const confirmed =
        window.confirm(
          "Are you sure you want to delete this transaction?"
        );

      if (!confirmed) {
        return;
      }

      const { error } =
        await supabase
          .from("transactions")
          .delete()
          .eq(
            "id",
            transaction.id
          );

      if (error) {
        console.error(error);

        alert(error.message);
        return;
      }

      await Promise.all([
        fetchTransactions(),
        fetchFloatMovements(),
        fetchReconciliations(),
      ]);
    };

  /*
   * Export history.
   */
  const exportCSV = () => {
    const headers = [
      "Transaction ID",
      "Receipt ID",
      "Date",
      "Transaction Type",
      "Customer Name",
      "Material",
      "Karats",
      "Weight",
      "Amount",
      "Amount Paid",
      "Rate Per Gram Used",
      "Store",
      "Locked",
      "Notes",
    ];

    const rows =
      historyTransactions.map(
        (t) => [
          t.id,
          t.receipt_id,
          t.date,
          t.transaction_type,
          t.customer_name,
          t.metal_type,
          t.karats ?? "",
          t.weight ?? "",
          t.amount ?? "",
          t.amount_paid ?? "",
          t.override_rate_per_gram ??
            "",
          t.store_id,
          t.locked ? "Yes" : "No",
          t.notes ?? "",
        ]
      );

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows]
        .map((row) =>
          row
            .map(
              (value) =>
                `"${String(
                  value ?? ""
                ).replace(
                  /"/g,
                  '""'
                )}"`
            )
            .join(",")
        )
        .join("\n");

    const link =
      document.createElement(
        "a"
      );

    link.setAttribute(
      "href",
      encodeURI(csvContent)
    );

    link.setAttribute(
      "download",
      "transactions.csv"
    );

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        Loading...
      </div>
    );
  }

  const selectedBalance =
    selectedReceipt
      ? getReceiptBalance(
          selectedReceipt.receipt_id
        )
      : 0;

  const paymentBalanceAfter =
    Math.max(
      selectedBalance -
        parseAmount(
          paymentAmount
        ),
      0
    );

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          Transactions
        </h1>

        <div className="flex items-center gap-3">
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm">
            <p className="text-xs text-gray-500">
              Current Float
            </p>

            <p
              className={`text-xl font-bold ${
                currentFloat < 0
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              $
              {currentFloat.toFixed(2)}
            </p>
          </div>

          <button
            onClick={exportCSV}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg"
          >
            Export CSV
          </button>
        </div>
      </div>

      {currentFloat < 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
          <p className="font-medium">
            Warning: Store float is negative.
          </p>

          <p className="text-sm mt-1">
            Please add funds using Float
            Management before making more
            customer payments.
          </p>
        </div>
      )}

      {reconciliationLoading && (
        <p className="text-xs text-gray-400">
          Checking reconciliation status...
        </p>
      )}

      {floatLoading && (
        <p className="text-xs text-gray-400">
          Updating float...
        </p>
      )}

      {/* LOCKED DATE WARNING */}
      {!paymentMode &&
        currentDateLocked && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="text-xl">
                🔒
              </div>

              <div>
                <p className="font-semibold">
                  Day Reconciled & Locked
                </p>

                <p className="text-sm mt-1">
                  {date} has already been
                  reconciled for this store.
                  New transactions cannot be
                  added to this date.
                </p>
              </div>
            </div>
          </div>
        )}

      {paymentMode &&
        paymentDateLocked && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="text-xl">
                🔒
              </div>

              <div>
                <p className="font-semibold">
                  Payment Date Is Locked
                </p>

                <p className="text-sm mt-1">
                  {paymentDate} has already
                  been reconciled. No payment
                  can be recorded for this date.
                </p>
              </div>
            </div>
          </div>
        )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

        {/* NEW TRANSACTION / PAYMENT */}
        <div className="bg-white p-6 mb-6 rounded-2xl shadow-sm border border-gray-100">

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium">
              {paymentMode
                ? "Partial Payment"
                : "New Transaction"}
            </h2>

            {paymentMode && (
              <button
                type="button"
                onClick={
                  cancelPartialPayment
                }
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Cancel
              </button>
            )}
          </div>

          {paymentMode &&
          selectedReceipt ? (
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >

              {/* Receipt */}
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-1 block">
                  Receipt
                </label>

                <div className="border p-3 rounded-lg bg-gray-50">
                  <p className="font-medium">
                    {
                      selectedReceipt.receipt_id
                    }
                  </p>

                  <p className="text-sm text-gray-500">
                    {
                      selectedReceipt.customer_name
                    }
                  </p>
                </div>
              </div>

              {/* Payment Date */}
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">
                  Payment Date
                </label>

                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) =>
                    setPaymentDate(
                      e.target.value
                    )
                  }
                  className={`border p-3 rounded-lg ${
                    paymentDateLocked
                      ? "bg-red-50 border-red-300"
                      : ""
                  }`}
                  required
                />

                {paymentDateLocked && (
                  <p className="text-xs text-red-600 mt-1">
                    This date is reconciled and
                    locked.
                  </p>
                )}
              </div>

              {/* Store */}
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">
                  Store
                </label>

                <input
                  value={
                    stores.find(
                      (s) =>
                        (s.store_id ||
                          s.id) ===
                        selectedReceipt.store_id
                    )?.name || ""
                  }
                  disabled
                  className="border p-3 rounded-lg bg-gray-50"
                />
              </div>

              {/* Customer Name */}
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">
                  Customer Name
                </label>

                <input
                  value={
                    selectedReceipt.customer_name ||
                    ""
                  }
                  disabled
                  className="border p-3 rounded-lg bg-gray-50"
                />
              </div>

              {/* Material */}
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">
                  Material
                </label>

                <input
                  value={
                    selectedReceipt.metal_type ||
                    ""
                  }
                  disabled
                  className="border p-3 rounded-lg bg-gray-50"
                />
              </div>

              {/* Weight */}
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">
                  Weight
                </label>

                <input
                  value={
                    selectedReceipt.weight
                      ? `${selectedReceipt.weight}g`
                      : ""
                  }
                  disabled
                  className="border p-3 rounded-lg bg-gray-50"
                />
              </div>

              {/* Original Amount */}
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">
                  Actual Purchase Amount
                </label>

                <input
                  value={`$${parseAmount(
                    selectedReceipt.amount
                  ).toFixed(2)}`}
                  disabled
                  className="border p-3 rounded-lg bg-gray-50 font-semibold"
                />
              </div>

              {/* Outstanding Balance */}
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">
                  Outstanding Balance
                </label>

                <div className="border p-3 rounded-lg bg-red-50 text-red-700 font-semibold">
                  $
                  {selectedBalance.toFixed(
                    2
                  )}
                </div>
              </div>

              {/* Payment Amount */}
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">
                  Payment Amount
                </label>

                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Payment Amount"
                  value={paymentAmount}
                  onChange={(e) =>
                    setPaymentAmount(
                      e.target.value
                    )
                  }
                  className="border p-3 rounded-lg"
                  required
                  disabled={
                    paymentDateLocked
                  }
                />

                {parseAmount(paymentAmount) >
                  currentFloat && (
                  <p className="text-xs text-red-500 mt-1">
                    Payment exceeds current
                    float.
                  </p>
                )}
              </div>

              {/* Balance After Payment */}
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">
                  Balance After Payment
                </label>

                <div className="border p-3 rounded-lg bg-gray-50 font-semibold">
                  $
                  {paymentBalanceAfter.toFixed(
                    2
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="md:col-span-2 flex flex-col">
                <label className="text-sm font-medium mb-1">
                  Notes
                </label>

                <textarea
                  placeholder="Notes"
                  value={paymentNotes}
                  onChange={(e) =>
                    setPaymentNotes(
                      e.target.value
                    )
                  }
                  className="border p-3 rounded-lg min-h-[100px]"
                  disabled={
                    paymentDateLocked
                  }
                />
              </div>

              {/* Save Payment */}
              <button
                type="submit"
                disabled={
                  paymentDateLocked ||
                  parseAmount(paymentAmount) >
                    currentFloat ||
                  parseAmount(paymentAmount) <=
                    0
                }
                className="md:col-span-2 w-full bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-700 transition disabled:opacity-50"
              >
                {paymentDateLocked
                  ? "Payment Date Locked"
                  : "Save Payment"}
              </button>
            </form>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >

              {/* Date */}
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">
                  Transaction Date
                </label>

                <input
                  type="date"
                  value={date}
                  onChange={(e) =>
                    setDate(
                      e.target.value
                    )
                  }
                  className={`border p-3 rounded-lg ${
                    currentDateLocked
                      ? "bg-red-50 border-red-300"
                      : ""
                  }`}
                  required
                />

                {currentDateLocked && (
                  <p className="text-xs text-red-600 mt-1">
                    This date has been
                    reconciled and locked.
                  </p>
                )}
              </div>

              {/* Store */}
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">
                  Store
                </label>

                <select
                  value={store}
                  onChange={(e) =>
                    setStore(
                      e.target.value
                    )
                  }
                  className="border p-3 rounded-lg"
                  disabled={
                    role !== "admin"
                  }
                >
                  <option value="">
                    Select Store
                  </option>

                  {stores.map(
                    (storeItem) => {
                      const storeValue =
                        storeItem.store_id ||
                        storeItem.id;

                      return (
                        <option
                          key={
                            storeValue
                          }
                          value={
                            storeValue
                          }
                        >
                          {storeItem.name}
                        </option>
                      );
                    }
                  )}
                </select>
              </div>

              {/* Customer */}
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">
                  Customer Name
                </label>

                <input
                  placeholder="Customer Name"
                  value={
                    customerName
                  }
                  onChange={(e) =>
                    setCustomerName(
                      e.target.value
                    )
                  }
                  className="border p-3 rounded-lg"
                  // required
                  disabled={
                    currentDateLocked
                  }
                />
              </div>

              {/* Material */}
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">
                  Material
                </label>

                <select
                  value={material}
                  onChange={(e) => {
                    const newMaterial =
                      e.target.value;

                    setMaterial(
                      newMaterial
                    );

                    if (
                      newMaterial !==
                      "Gold"
                    ) {
                      setKarats("");
                      setOverrideRate(
                        ""
                      );
                      setRateManuallyOverridden(
                        false
                      );
                    }
                  }}
                  className="border p-3 rounded-lg"
                  disabled={
                    currentDateLocked
                  }
                >
                  <option value="Gold">
                    Gold
                  </option>

                  <option value="Silver">
                    Silver
                  </option>
                </select>
              </div>

              {/* Karats */}
              {material === "Gold" ? (
                <div className="flex flex-col">
                  <label className="text-sm font-medium mb-1">
                    Karats
                  </label>

                  <select
                    value={karats}
                    onChange={(e) =>
                      setKarats(
                        e.target.value
                      )
                    }
                    className="border p-3 rounded-lg"
                    required
                    disabled={
                      currentDateLocked
                    }
                  >
                    <option value="">
                      Select Karats
                    </option>

                    {karatRates.map(
                      (rate) => (
                        <option
                          key={rate.id}
                          value={
                            rate.karats
                          }
                        >
                          {rate.karats}K
                        </option>
                      )
                    )}
                  </select>

                  {ratesLoading && (
                    <p className="text-xs text-gray-500 mt-1">
                      Loading karat rates...
                    </p>
                  )}

                  {!ratesLoading &&
                    karatRates.length ===
                      0 && (
                      <p className="text-xs text-red-500 mt-1">
                        No active karat rates found.
                      </p>
                    )}
                </div>
              ) : (
                <div />
              )}

              {/* Weight */}
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">
                  Weight (grams)
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Weight (grams)"
                  value={weight}
                  onChange={(e) =>
                    setWeight(
                      e.target.value
                    )
                  }
                  className="border p-3 rounded-lg"
                  required
                  disabled={
                    currentDateLocked
                  }
                />
              </div>

              {/* Rate */}
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">
                  Rate / Gram
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={
                    material === "Gold"
                      ? "Select karats"
                      : "Enter rate"
                  }
                  value={overrideRate}
                  onChange={(e) => {
                    setOverrideRate(
                      e.target.value
                    );

                    setRateManuallyOverridden(
                      true
                    );
                  }}
                  className="border p-3 rounded-lg"
                  required
                  disabled={
                    currentDateLocked
                  }
                />

                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500">
                    {material === "Gold" &&
                    karats
                      ? "Rate from Karat Rates table"
                      : "Manual rate"}
                  </p>

                  {rateManuallyOverridden && (
                    <span className="text-xs text-orange-600 font-medium">
                      Manually overridden
                    </span>
                  )}
                </div>
              </div>

              {/* Calculated Value */}
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">
                  Calculated Value
                </label>

                <div className="border p-3 rounded-lg bg-gray-50 font-semibold text-lg">
                  $
                  {calculatedAmount.toFixed(
                    2
                  )}
                </div>

                <p className="text-xs text-gray-500 mt-1">
                  {Number(weight) > 0 &&
                  currentRate > 0
                    ? `${Number(
                        weight
                      ).toFixed(
                        2
                      )}g × $${currentRate.toFixed(
                        2
                      )}/g`
                    : "Enter weight and select a rate"}
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  Suggested value based on
                  weight and rate.
                </p>
              </div>

              {/* Actual Purchase Amount */}
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">
                  Actual Purchase Amount
                </label>

                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Actual amount"
                  value={actualAmount}
                  onChange={(e) => {
                    setActualAmount(
                      e.target.value
                    );

                    setActualAmountManuallyEdited(
                      true
                    );
                  }}
                  className="border p-3 rounded-lg"
                  required
                  disabled={
                    currentDateLocked
                  }
                />

                {actualAmount &&
                  calculatedAmount > 0 &&
                  actualPurchaseAmount !==
                    calculatedAmount && (
                    <p
                      className={`text-xs mt-1 ${
                        purchaseAdjustment <
                        0
                          ? "text-orange-600"
                          : "text-green-600"
                      }`}
                    >
                      Adjustment:{" "}
                      {purchaseAdjustment >=
                      0
                        ? "+"
                        : ""}
                      $
                      {purchaseAdjustment.toFixed(
                        2
                      )}
                    </p>
                  )}

                <p className="text-xs text-gray-400 mt-1">
                  Enter the actual amount agreed
                  to pay the customer.
                </p>
              </div>

              {/* Amount Paid */}
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">
                  Amount Paid Today
                </label>

                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Amount Paid Today"
                  value={amountPaid}
                  onChange={(e) =>
                    setAmountPaid(
                      e.target.value
                    )
                  }
                  className="border p-3 rounded-lg"
                  required
                  disabled={
                    currentDateLocked
                  }
                />

                {parseAmount(amountPaid) >
                  currentFloat && (
                  <p className="text-xs text-red-500 mt-1">
                    Amount exceeds current
                    float.
                  </p>
                )}
              </div>

              {/* Outstanding */}
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">
                  Outstanding Balance
                </label>

                <div className="flex justify-between items-center border rounded-lg p-3 bg-gray-50">
                  <span className="text-sm text-gray-600">
                    Amount Remaining
                  </span>

                  <span
                    className={`font-semibold ${
                      newTransactionBalance >
                      0
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    $
                    {newTransactionBalance.toFixed(
                      2
                    )}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div className="md:col-span-2 flex flex-col">
                <label className="text-sm font-medium mb-1">
                  Notes
                </label>

                <textarea
                  placeholder="Notes"
                  value={notes}
                  onChange={(e) =>
                    setNotes(
                      e.target.value
                    )
                  }
                  className="border p-3 rounded-lg min-h-[100px]"
                  disabled={
                    currentDateLocked
                  }
                />
              </div>

              {/* Save */}
              <button
                type="submit"
                disabled={
                  currentDateLocked ||
                  parseAmount(amountPaid) >
                    currentFloat ||
                  actualPurchaseAmount <=
                    0
                }
                className="md:col-span-2 w-full bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-700 transition disabled:opacity-50"
              >
                {currentDateLocked
                  ? "Day Is Locked"
                  : "Save Transaction"}
              </button>
            </form>
          )}
        </div>

        {/* OUTSTANDING / HISTORY */}
        <div className="bg-white mb-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          <div className="p-4 border-b border-gray-100">
            <div className="bg-gray-100 p-1 rounded-xl flex w-full md:w-fit">

              <button
                type="button"
                onClick={() =>
                  setReceiptView(
                    "outstanding"
                  )
                }
                className={`flex-1 md:flex-none px-5 py-2.5 rounded-lg text-sm font-medium transition ${
                  receiptView ===
                  "outstanding"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Outstanding Receipts

                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  {
                    outstandingReceipts.length
                  }
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setReceiptView(
                    "history"
                  )
                }
                className={`flex-1 md:flex-none px-5 py-2.5 rounded-lg text-sm font-medium transition ${
                  receiptView ===
                  "history"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Transaction History

                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                  {
                    historyTransactions.length
                  }
                </span>
              </button>

            </div>
          </div>

          {receiptView ===
          "outstanding" ? (
            <div className="p-6">

              <div className="mb-5">
                <h2 className="text-lg font-medium">
                  Outstanding Receipts
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Customers still owed money
                </p>
              </div>

              {outstandingReceipts.length ===
              0 ? (
                <div className="text-gray-500 text-sm py-8 text-center">
                  No outstanding receipts.
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">

                  {outstandingReceipts.map(
                    (receipt) => {
                      const balance =
                        getReceiptBalance(
                          receipt.receipt_id
                        );

                      const receiptLocked =
                        receipt.locked ===
                        true;

                      return (
                        <div
                          key={
                            receipt.receipt_id
                          }
                          className={`border rounded-lg p-4 ${
                            receiptLocked
                              ? "bg-gray-50 border-gray-200"
                              : ""
                          }`}
                        >

                          <div className="flex justify-between gap-4">

                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  {
                                    receipt.customer_name
                                  }
                                </p>

                                {receiptLocked && (
                                  <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-600">
                                    🔒 Locked
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-gray-400 mt-1">
                                Receipt:{" "}
                                {
                                  receipt.receipt_id
                                }
                              </p>

                              <p className="text-sm text-gray-500 mt-2">
                                {
                                  receipt.metal_type
                                }

                                {receipt.karats &&
                                  ` • ${receipt.karats}K`}

                                {receipt.weight &&
                                  ` • ${receipt.weight}g`}
                              </p>

                              <p className="text-xs text-gray-400 mt-1">
                                Actual Purchase: $
                                {parseAmount(
                                  receipt.amount
                                ).toFixed(
                                  2
                                )}
                              </p>

                              {receipt.weight &&
                                receipt.override_rate_per_gram && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    Calculated: $
                                    {(
                                      Number(
                                        receipt.weight
                                      ) *
                                      Number(
                                        receipt.override_rate_per_gram
                                      )
                                    ).toFixed(
                                      2
                                    )}
                                  </p>
                                )}

                              {receipt.locked && (
                                <p className="text-xs text-red-500 mt-1">
                                  This transaction
                                  is locked because
                                  its day has been
                                  reconciled.
                                </p>
                              )}
                            </div>

                            <div className="text-right">

                              <p className="font-semibold text-red-600">
                                $
                                {balance.toFixed(
                                  2
                                )}
                              </p>

                              <p className="text-xs text-gray-400 mb-3">
                                Outstanding
                              </p>

                              <button
                                onClick={() =>
                                  startPartialPayment(
                                    receipt
                                  )
                                }
                                className="bg-yellow-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-yellow-700"
                              >
                                Make Payment
                              </button>

                            </div>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>
              )}

            </div>
          ) : (
            <div className="p-6">

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">

                <div>
                  <h2 className="text-lg font-medium">
                    Transaction History
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2">

                  <select
                    value={
                      historyRange
                    }
                    onChange={(e) =>
                      setHistoryRange(
                        e.target.value
                      )
                    }
                    className="border p-2 rounded-lg text-sm"
                  >
                    <option value="today">
                      Today
                    </option>

                    <option value="7days">
                      Last 7 Days
                    </option>

                    <option value="30days">
                      Last 30 Days
                    </option>

                    <option value="custom">
                      Custom Range
                    </option>
                  </select>

                  {historyRange ===
                    "custom" && (
                    <>
                      <input
                        type="date"
                        value={
                          customFrom
                        }
                        onChange={(e) =>
                          setCustomFrom(
                            e.target.value
                          )
                        }
                        className="border p-2 rounded-lg text-sm"
                      />

                      <input
                        type="date"
                        value={
                          customTo
                        }
                        onChange={(e) =>
                          setCustomTo(
                            e.target.value
                          )
                        }
                        className="border p-2 rounded-lg text-sm"
                      />
                    </>
                  )}

                </div>
              </div>

              {historyTransactions.length ===
              0 ? (
                <p className="text-gray-500">
                  No transactions for this period.
                </p>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {historyTransactions.map(
                    (transaction) => (
                      <TransactionRow
                        key={
                          transaction.id
                        }
                        transaction={
                          transaction
                        }
                        getReceiptBalance={
                          getReceiptBalance
                        }
                        parseAmount={
                          parseAmount
                        }
                        onDelete={
                          deleteTransaction
                        }
                        isDateReconciled={
                          isDateReconciled
                        }
                      />
                    )
                  )}
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function TransactionRow({
  transaction,
  getReceiptBalance,
  parseAmount,
  onDelete,
  isDateReconciled,
}) {
  const balance =
    getReceiptBalance(
      transaction.receipt_id
    );

  const isPayout =
    transaction.transaction_type ===
    "payout";

  /*
   * A transaction is considered locked if:
   *
   * 1. transactions.locked = true
   * OR
   * 2. its store/date exists in reconciliations.
   */
  const reconciled =
    transaction.store_id &&
    transaction.date
      ? isDateReconciled(
          transaction.store_id,
          transaction.date
        )
      : false;

  const isLocked =
    transaction.locked === true ||
    reconciled;

  /*
   * Reconstruct calculated value.
   */
  const calculatedValue =
    !isPayout &&
    transaction.weight &&
    transaction.override_rate_per_gram
      ? Number(transaction.weight) *
        Number(
          transaction.override_rate_per_gram
        )
      : null;

  /*
   * Difference between calculated value
   * and actual purchase amount.
   */
  const purchaseAdjustment =
    calculatedValue !== null
      ? parseAmount(
          transaction.amount
        ) - calculatedValue
      : 0;

  return (
    <div
      className={`border rounded-lg p-4 ${
        isLocked
          ? "bg-gray-50 border-gray-200"
          : ""
      }`}
    >

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

        <div>

          <div className="flex items-center gap-2 flex-wrap">

            <p className="font-medium">
              {transaction.customer_name}
            </p>

            <span
              className={`text-xs px-2 py-1 rounded-full ${
                isPayout
                  ? "bg-blue-100 text-blue-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {isPayout
                ? "Payment"
                : "Purchase"}
            </span>

            {isLocked && (
              <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-600">
                🔒 Locked
              </span>
            )}

          </div>

          <div className="text-sm text-gray-500 mt-1">
            {transaction.metal_type}

            {transaction.karats &&
              ` • ${transaction.karats}K`}

            {transaction.weight &&
              ` • ${transaction.weight}g`}
          </div>

          <div className="text-xs text-gray-400 mt-1">
            {transaction.date}
          </div>

          <div className="text-xs text-gray-400 mt-1">
            Transaction ID:{" "}
            {transaction.id}
          </div>

          <div className="text-xs text-gray-400">
            Receipt:{" "}
            {transaction.receipt_id}
          </div>

          {transaction.notes && (
            <p className="text-sm text-gray-400 mt-2">
              {transaction.notes}
            </p>
          )}

          {isLocked && (
            <p className="text-xs text-red-500 mt-2">
              This transaction is locked because
              its store/date has been reconciled.
            </p>
          )}

        </div>

        <div className="flex items-center gap-5">

          <div className="text-right">

            <p className="font-semibold">
              {isPayout ? "-" : ""}$
              {parseAmount(
                transaction.amount
              ).toFixed(2)}
            </p>

            {!isPayout && (
              <p className="text-xs text-gray-500">
                Actual Purchase: $
                {parseAmount(
                  transaction.amount
                ).toFixed(2)}
              </p>
            )}

            {!isPayout && (
              <p className="text-xs text-gray-500">
                Paid Today: $
                {Number(
                  transaction.amount_paid ||
                    0
                ).toFixed(2)}
              </p>
            )}

            {!isPayout &&
              calculatedValue !== null && (
                <p className="text-xs text-gray-400">
                  Calculated: $
                  {calculatedValue.toFixed(
                    2
                  )}
                </p>
              )}

            {!isPayout &&
              calculatedValue !== null &&
              Math.abs(
                purchaseAdjustment
              ) >= 0.01 && (
                <p
                  className={`text-xs ${
                    purchaseAdjustment < 0
                      ? "text-orange-600"
                      : "text-green-600"
                  }`}
                >
                  Adjustment:{" "}
                  {purchaseAdjustment >= 0
                    ? "+"
                    : ""}
                  $
                  {purchaseAdjustment.toFixed(
                    2
                  )}
                </p>
              )}

            {!isPayout &&
              transaction.override_rate_per_gram && (
                <p className="text-xs text-gray-500">
                  Rate: $
                  {Number(
                    transaction.override_rate_per_gram
                  ).toFixed(2)}
                  /g
                </p>
              )}

            <p
              className={`text-xs ${
                balance > 0
                  ? "text-red-500"
                  : "text-green-600"
              }`}
            >
              {balance > 0
                ? `Balance: $${balance.toFixed(
                    2
                  )}`
                : "Paid in Full"}
            </p>

          </div>

          {isLocked ? (
            <span className="text-gray-400 text-sm">
              🔒 Locked
            </span>
          ) : (
            <button
              onClick={() =>
                onDelete(
                  transaction
                )
              }
              className="text-red-500 text-sm hover:text-red-700"
            >
              Delete
            </button>
          )}

        </div>

      </div>

    </div>
  );
}
