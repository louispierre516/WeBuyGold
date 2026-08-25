import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/useAuth";
import { useStore } from "../context/StoreContext";

export default function Dashboard() {
  const {
    user,
    role,
    storeId,
    loading: authLoading,
  } = useAuth();

  const {
    stores,
    activeStore,
  } = useStore();

  const today =
    new Date().toISOString().split("T")[0];

  const [transactions, setTransactions] =
    useState([]);

  const [floatMovements, setFloatMovements] =
    useState([]);

  const [reconciliations, setReconciliations] =
    useState([]);

  const [historicalDate, setHistoricalDate] =
    useState(today);

  const [historyDays, setHistoryDays] =
    useState(14);

  const [loading, setLoading] =
    useState(true);

  /*
   * ---------------------------------------------------------
   * DATE HELPERS
   * ---------------------------------------------------------
   */

  const getDateString = (date) => {
    return date
      .toISOString()
      .split("T")[0];
  };

  const getStartDate = (
    endDate,
    numberOfDays
  ) => {
    const date = new Date(
      `${endDate}T00:00:00`
    );

    date.setDate(
      date.getDate() -
        (numberOfDays - 1)
    );

    return getDateString(date);
  };

  const startOfToday =
    today;

  const startOfWeek = (() => {
    const date = new Date();

    date.setDate(
      date.getDate() -
        date.getDay()
    );

    return getDateString(date);
  })();

  const startOfMonth =
    getDateString(
      new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      )
    );

  /*
   * ---------------------------------------------------------
   * STORE IDS WE ARE ALLOWED TO SEE
   * ---------------------------------------------------------
   */

  const visibleStoreIds =
    useMemo(() => {
      if (role !== "admin") {
        return storeId
          ? [storeId]
          : [];
      }

      if (
        activeStore &&
        activeStore !== "All"
      ) {
        return [activeStore];
      }

      return stores
        .map(
          (store) =>
            store.id ||
            store.store_id
        )
        .filter(Boolean);
    }, [
      role,
      storeId,
      activeStore,
      stores,
    ]);

  /*
   * ---------------------------------------------------------
   * FETCH DATA
   * ---------------------------------------------------------
   *
   * We fetch everything up to the selected
   * historical date because float is cumulative.
   *
   * This is important.
   *
   * We cannot calculate the float for a historical
   * date using only that day's movements.
   */

  useEffect(() => {
    if (!user || authLoading) {
      return;
    }

    if (
      visibleStoreIds.length === 0
    ) {
      setTransactions([]);
      setFloatMovements([]);
      setReconciliations([]);
      setLoading(false);
      return;
    }

    fetchDashboardData();
  }, [
    user,
    authLoading,
    activeStore,
    storeId,
    role,
    historicalDate,
  ]);

  const fetchDashboardData =
    async () => {
      setLoading(true);

      try {
        /*
         * ---------------------------------------------------
         * TRANSACTIONS
         * ---------------------------------------------------
         */

        let transactionQuery =
          supabase
            .from("transactions")
            .select("*")
            .lte(
              "date",
              historicalDate
            )
            .order("date", {
              ascending: true,
            })
            .order("created_at", {
              ascending: true,
            });

        if (
          visibleStoreIds.length > 0
        ) {
          transactionQuery =
            transactionQuery.in(
              "store_id",
              visibleStoreIds
            );
        }

        /*
         * ---------------------------------------------------
         * FLOAT MOVEMENTS
         * ---------------------------------------------------
         */

        let movementQuery =
          supabase
            .from("float_movements")
            .select("*")
            .lte(
              "date",
              historicalDate
            )
            .order("date", {
              ascending: true,
            })
            .order("created_at", {
              ascending: true,
            });

        if (
          visibleStoreIds.length > 0
        ) {
          movementQuery =
            movementQuery.in(
              "store_id",
              visibleStoreIds
            );
        }

        /*
         * ---------------------------------------------------
         * RECONCILIATIONS
         * ---------------------------------------------------
         */

        let reconciliationQuery =
          supabase
            .from("reconciliations")
            .select("*")
            .lte(
              "date",
              historicalDate
            )
            .order("date", {
              ascending: false,
            })
            .order("created_at", {
              ascending: false,
            });

        if (
          visibleStoreIds.length > 0
        ) {
          reconciliationQuery =
            reconciliationQuery.in(
              "store_id",
              visibleStoreIds
            );
        }

        const [
          transactionResponse,
          movementResponse,
          reconciliationResponse,
        ] = await Promise.all([
          transactionQuery,
          movementQuery,
          reconciliationQuery,
        ]);

        if (
          transactionResponse.error
        ) {
          throw transactionResponse.error;
        }

        if (
          movementResponse.error
        ) {
          throw movementResponse.error;
        }

        if (
          reconciliationResponse.error
        ) {
          throw reconciliationResponse.error;
        }

        setTransactions(
          transactionResponse.data ||
            []
        );

        setFloatMovements(
          movementResponse.data ||
            []
        );

        setReconciliations(
          reconciliationResponse.data ||
            []
        );
      } catch (error) {
        console.error(
          "Dashboard fetch error:",
          error
        );

        setTransactions([]);
        setFloatMovements([]);
        setReconciliations([]);
      } finally {
        setLoading(false);
      }
    };

  /*
   * ---------------------------------------------------------
   * NUMBER HELPERS
   * ---------------------------------------------------------
   */

  const number = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return 0;
    }

    const parsed =
      Number(value);

    return Number.isFinite(
      parsed
    )
      ? parsed
      : 0;
  };

  const money = (value) => {
    return `$${number(
      value
    ).toLocaleString(
      undefined,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  };

  const grams = (value) => {
    return `${number(
      value
    ).toLocaleString(
      undefined,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}g`;
  };

  /*
   * ---------------------------------------------------------
   * FLOAT CALCULATION
   * ---------------------------------------------------------
   *
   * This follows the same calculation used by
   * the reconciliation page.
   */

  const calculateFloat = (
    storeIdToCalculate,
    date
  ) => {
    let balance = 0;

    /*
     * Float movements
     */

    floatMovements
      .filter(
        (movement) =>
          movement.store_id ===
            storeIdToCalculate &&
          movement.date <= date
      )
      .forEach((movement) => {
        const amount =
          number(
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

    /*
     * Transactions
     *
     * Purchases reduce the float by
     * amount_paid.
     *
     * Payouts reduce the float by
     * amount.
     */

    transactions
      .filter(
        (transaction) =>
          transaction.store_id ===
            storeIdToCalculate &&
          transaction.date <= date
      )
      .forEach(
        (transaction) => {
          if (
            transaction.transaction_type ===
            "purchase"
          ) {
            balance -= number(
              transaction.amount_paid
            );
          }

          if (
            transaction.transaction_type ===
            "payout"
          ) {
            balance -= number(
              transaction.amount
            );
          }
        }
      );

    return balance;
  };

  /*
   * ---------------------------------------------------------
   * CURRENT STORE FLOAT
   * ---------------------------------------------------------
   */

  const storeFloatData =
    useMemo(() => {
      return visibleStoreIds
        .map((id) => {
          const store =
            stores.find(
              (item) =>
                item.id === id ||
                item.store_id === id
            );

          const float =
            calculateFloat(
              id,
              historicalDate
            );

          /*
           * Find the most recent reconciliation
           * for this store on or before the selected date.
           */

          const reconciliation =
            reconciliations.find(
              (item) =>
                item.store_id ===
                  id &&
                item.date <=
                  historicalDate
            );

          const physicalCash =
            reconciliation
              ? number(
                  reconciliation.total_amount
                )
              : null;

          return {
            id,
            name:
              store?.name ||
              "Unknown Store",
            float,
            reconciliation,
            physicalCash,
            difference:
              physicalCash === null
                ? null
                : float -
                  physicalCash,
          };
        })
        .sort(
          (a, b) =>
            b.float - a.float
        );
    }, [
      visibleStoreIds,
      stores,
      floatMovements,
      transactions,
      reconciliations,
      historicalDate,
    ]);

  /*
   * ---------------------------------------------------------
   * CURRENT TOTAL FLOAT
   * ---------------------------------------------------------
   */

  const totalFloat =
    useMemo(() => {
      return storeFloatData.reduce(
        (sum, store) =>
          sum + store.float,
        0
      );
    }, [storeFloatData]);

  /*
   * ---------------------------------------------------------
   * TRANSACTION PERIODS
   * ---------------------------------------------------------
   */

  const transactionsToday =
    useMemo(() => {
      return transactions.filter(
        (transaction) =>
          transaction.date ===
          today
      );
    }, [transactions, today]);

  const transactionsWeek =
    useMemo(() => {
      return transactions.filter(
        (transaction) =>
          transaction.date >=
            startOfWeek &&
          transaction.date <=
            historicalDate
      );
    }, [
      transactions,
      startOfWeek,
      historicalDate,
    ]);

  const transactionsMonth =
    useMemo(() => {
      return transactions.filter(
        (transaction) =>
          transaction.date >=
            startOfMonth &&
          transaction.date <=
            historicalDate
      );
    }, [
      transactions,
      startOfMonth,
      historicalDate,
    ]);

  /*
   * ---------------------------------------------------------
   * METRICS
   * ---------------------------------------------------------
   */

  const buildMetrics = (
    list
  ) => {
    const purchases =
      list.filter(
        (transaction) =>
          transaction.transaction_type ===
          "purchase"
      );

    const payouts =
      list.filter(
        (transaction) =>
          transaction.transaction_type ===
          "payout"
      );

    const purchaseValue =
      purchases.reduce(
        (sum, transaction) =>
          sum +
          number(
            transaction.amount
          ),
        0
      );

    const purchaseCash =
      purchases.reduce(
        (sum, transaction) =>
          sum +
          number(
            transaction.amount_paid
          ),
        0
      );

    const payoutCash =
      payouts.reduce(
        (sum, transaction) =>
          sum +
          number(
            transaction.amount
          ),
        0
      );

    const goldWeight =
      purchases
        .filter(
          (transaction) =>
            String(
              transaction.metal_type
            ).toLowerCase() ===
            "gold"
        )
        .reduce(
          (sum, transaction) =>
            sum +
            number(
              transaction.weight
            ),
          0
        );

    const silverWeight =
      purchases
        .filter(
          (transaction) =>
            String(
              transaction.metal_type
            ).toLowerCase() ===
            "silver"
        )
        .reduce(
          (sum, transaction) =>
            sum +
            number(
              transaction.weight
            ),
          0
        );

    return {
      purchases:
        purchases.length,

      payouts:
        payouts.length,

      purchaseValue,

      purchaseCash,

      payoutCash,

      totalCashOut:
        purchaseCash +
        payoutCash,

      goldWeight,

      silverWeight,
    };
  };

  const todayMetrics =
    buildMetrics(
      transactionsToday
    );

  const weekMetrics =
    buildMetrics(
      transactionsWeek
    );

  const monthMetrics =
    buildMetrics(
      transactionsMonth
    );

  /*
   * ---------------------------------------------------------
   * GOLD BY KARAT
   * ---------------------------------------------------------
   */

  const goldByKarat =
    useMemo(() => {
      const grouped = {};

      transactionsMonth
        .filter(
          (transaction) =>
            transaction.transaction_type ===
              "purchase" &&
            String(
              transaction.metal_type
            ).toLowerCase() ===
              "gold"
        )
        .forEach((transaction) => {
          const karat =
            transaction.karats ||
            "Unknown";

          const weightValue =
            number(
              transaction.weight
            );

          if (!grouped[karat]) {
            grouped[karat] = 0;
          }

          grouped[karat] +=
            weightValue;
        });

      return Object.entries(
        grouped
      )
        .map(
          ([karat, weightValue]) => ({
            karat,
            weight:
              weightValue,
          })
        )
        .sort((a, b) => {
          const aKarat =
            Number(a.karat) || 0;

          const bKarat =
            Number(b.karat) || 0;

          return (
            bKarat - aKarat
          );
        });
    }, [transactionsMonth]);

  /*
   * ---------------------------------------------------------
   * HISTORICAL FLOAT
   * ---------------------------------------------------------
   */

  const historicalRows =
    useMemo(() => {
      const rows = [];

      for (
        let i = historyDays - 1;
        i >= 0;
        i--
      ) {
        const date =
          new Date(
            `${historicalDate}T00:00:00`
          );

        date.setDate(
          date.getDate() - i
        );

        const dateString =
          getDateString(date);

        const storeRows =
          storeFloatData.map(
            (store) => {
              const float =
                calculateFloat(
                  store.id,
                  dateString
                );

              const reconciliation =
                reconciliations.find(
                  (item) =>
                    item.store_id ===
                      store.id &&
                    item.date ===
                      dateString
                );

              return {
                storeId:
                  store.id,

                storeName:
                  store.name,

                float,

                physicalCash:
                  reconciliation
                    ? number(
                        reconciliation.total_amount
                      )
                    : null,
              };
            }
          );

        rows.push({
          date:
            dateString,

          stores:
            storeRows,
        });
      }

      return rows;
    }, [
      historyDays,
      historicalDate,
      storeFloatData,
      floatMovements,
      transactions,
      reconciliations,
    ]);

  /*
   * ---------------------------------------------------------
   * RECENT TRANSACTIONS
   * ---------------------------------------------------------
   */

  const recentTransactions =
    useMemo(() => {
      return [...transactions]
        .sort((a, b) => {
          const aDate =
            a.created_at ||
            a.date ||
            "";

          const bDate =
            b.created_at ||
            b.date ||
            "";

          return (
            new Date(bDate) -
            new Date(aDate)
          );
        })
        .slice(0, 8);
    }, [transactions]);

  /*
   * ---------------------------------------------------------
   * STORE NAME
   * ---------------------------------------------------------
   */

  const getStoreName = (
    id
  ) => {
    return (
      stores.find(
        (store) =>
          store.id === id ||
          store.store_id === id
      )?.name ||
      "Unknown Store"
    );
  };

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (
    loading ||
    authLoading
  ) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(
            (item) => (
              <div
                key={item}
                className="h-32 bg-white rounded-2xl border border-gray-100 animate-pulse"
              />
            )
          )}
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * METRIC CARD
   * ---------------------------------------------------------
   */

  const MetricCard = ({
    label,
    value,
    subtitle,
    accent = "gray",
  }) => {
    const colors = {
      gray:
        "text-gray-900",
      green:
        "text-green-600",
      red:
        "text-red-600",
      yellow:
        "text-yellow-600",
      blue:
        "text-blue-600",
    };

    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
        <p className="text-xs md:text-sm text-gray-500">
          {label}
        </p>

        <p
          className={`text-xl md:text-2xl font-bold mt-2 ${
            colors[accent]
          }`}
        >
          {value}
        </p>

        {subtitle && (
          <p className="text-xs text-gray-400 mt-1">
            {subtitle}
          </p>
        )}
      </div>
    );
  };

  /*
   * ---------------------------------------------------------
   * MAIN VIEW
   * ---------------------------------------------------------
   */

  return (
    <div className="space-y-6 pb-10">

      {/* HEADER */}

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">

        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Owner Dashboard
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Cash position, purchases and store performance.
          </p>
        </div>

        <div className="w-full md:w-auto">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            View as of
          </label>

          <input
            type="date"
            value={historicalDate}
            max={today}
            onChange={(e) =>
              setHistoricalDate(
                e.target.value
              )
            }
            className="w-full md:w-auto border border-gray-300 rounded-xl px-4 py-3 text-sm bg-white"
          />
        </div>

      </div>

      {/* FLOAT HERO */}

      <section className="bg-black text-white rounded-2xl p-5 md:p-6">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          <div>
            <p className="text-sm text-gray-400">
              {historicalDate ===
              today
                ? "Current Available Float"
                : "Available Float"}
            </p>

            <p className="text-3xl md:text-4xl font-bold text-yellow-400 mt-1">
              {money(totalFloat)}
            </p>

            <p className="text-xs text-gray-400 mt-2">
              Cash position as of{" "}
              {new Date(
                `${historicalDate}T00:00:00`
              ).toLocaleDateString()}
            </p>
          </div>

          {storeFloatData.length >
            1 && (
            <div className="text-right">
              <p className="text-xs text-gray-400">
                Stores
              </p>

              <p className="text-xl font-semibold">
                {storeFloatData.length}
              </p>
            </div>
          )}

        </div>

      </section>

      {/* STORE FLOAT */}

      <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">

        <div className="p-5 border-b border-gray-100">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">

            <div>
              <h2 className="text-lg font-semibold">
                Store Float
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Available cash by store.
              </p>
            </div>

            <span className="text-xs text-gray-400">
              As of {historicalDate}
            </span>

          </div>

        </div>

        <div className="p-4 md:p-5">

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">

            {storeFloatData.map(
              (store) => (
                <div
                  key={store.id}
                  className="border border-gray-200 rounded-2xl p-4"
                >

                  <div className="flex items-center justify-between gap-3">

                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {store.name}
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        Available float
                      </p>
                    </div>

                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full shrink-0" />

                  </div>

                  <p className="text-2xl font-bold mt-4">
                    {money(
                      store.float
                    )}
                  </p>

                  {store.reconciliation ? (
                    <div className="mt-3 pt-3 border-t border-gray-100">

                      <div className="flex justify-between text-xs">

                        <span className="text-gray-500">
                          Last reconciled
                        </span>

                        <span className="font-medium">
                          {store.reconciliation.date}
                        </span>

                      </div>

                      <div className="flex justify-between text-xs mt-1">

                        <span className="text-gray-500">
                          Physical cash
                        </span>

                        <span className="font-medium">
                          {money(
                            store.physicalCash
                          )}
                        </span>

                      </div>

                      {store.difference !==
                        null && (
                        <div className="flex justify-between text-xs mt-1">

                          <span className="text-gray-500">
                            Difference
                          </span>

                          <span
                            className={
                              Math.abs(
                                store.difference
                              ) <
                              0.01
                                ? "text-green-600 font-semibold"
                                : "text-red-600 font-semibold"
                            }
                          >
                            {store.difference >=
                            0
                              ? "+"
                              : "-"}
                            {money(
                              Math.abs(
                                store.difference
                              )
                            )}
                          </span>

                        </div>
                      )}

                    </div>
                  ) : (
                    <p className="text-xs text-orange-600 mt-3">
                      No reconciliation recorded.
                    </p>
                  )}

                </div>
              )
            )}

          </div>

        </div>

      </section>

      {/* TODAY */}

      <section>

        <div className="mb-3">
          <h2 className="text-lg font-semibold">
            Today
          </h2>

          <p className="text-xs text-gray-500">
            Today's activity
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          <MetricCard
            label="Purchase Value"
            value={money(
              todayMetrics.purchaseValue
            )}
            subtitle={`${todayMetrics.purchases} purchases`}
          />

          <MetricCard
            label="Cash Out"
            value={money(
              todayMetrics.totalCashOut
            )}
            subtitle="Purchases + payouts"
            accent="red"
          />

          <MetricCard
            label="Gold Purchased"
            value={grams(
              todayMetrics.goldWeight
            )}
            subtitle="All karats"
            accent="yellow"
          />

          <MetricCard
            label="Silver Purchased"
            value={grams(
              todayMetrics.silverWeight
            )}
            subtitle={`${todayMetrics.payouts} payouts`}
          />

        </div>

      </section>

      {/* HISTORICAL FLOAT */}

      <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">

        <div className="p-5 border-b border-gray-100">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

            <div>
              <h2 className="text-lg font-semibold">
                Historical Float
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                See how the available float changed over time.
              </p>
            </div>

            <select
              value={historyDays}
              onChange={(e) =>
                setHistoryDays(
                  Number(
                    e.target.value
                  )
                )
              }
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm"
            >
              <option value={7}>
                Last 7 days
              </option>

              <option value={14}>
                Last 14 days
              </option>

              <option value={30}>
                Last 30 days
              </option>

              <option value={60}>
                Last 60 days
              </option>

              <option value={90}>
                Last 90 days
              </option>
            </select>

          </div>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead className="bg-gray-50">

              <tr>

                <th className="text-left px-5 py-3 font-medium text-gray-500">
                  Date
                </th>

                {storeFloatData.map(
                  (store) => (
                    <th
                      key={store.id}
                      className="text-right px-5 py-3 font-medium text-gray-500 whitespace-nowrap"
                    >
                      {store.name}
                    </th>
                  )
                )}

              </tr>

            </thead>

            <tbody className="divide-y divide-gray-100">

              {historicalRows.map(
                (row) => (
                  <tr
                    key={row.date}
                    className={
                      row.date ===
                      historicalDate
                        ? "bg-yellow-50"
                        : ""
                    }
                  >

                    <td className="px-5 py-3 whitespace-nowrap">

                      <p className="font-medium">
                        {new Date(
                          `${row.date}T00:00:00`
                        ).toLocaleDateString(
                          undefined,
                          {
                            month:
                              "short",
                            day:
                              "numeric",
                            year:
                              "numeric",
                          }
                        )}
                      </p>

                    </td>

                    {row.stores.map(
                      (store) => (
                        <td
                          key={
                            store.storeId
                          }
                          className="px-5 py-3 text-right whitespace-nowrap"
                        >
                          <p className="font-semibold">
                            {money(
                              store.float
                            )}
                          </p>

                          {store.physicalCash !==
                            null && (
                            <p className="text-xs text-green-600 mt-0.5">
                              Reconciled{" "}
                              {money(
                                store.physicalCash
                              )}
                            </p>
                          )}

                        </td>
                      )
                    )}

                  </tr>
                )
              )}

            </tbody>

          </table>

        </div>

      </section>

      {/* GOLD BY KARAT */}

      <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">

        <div className="p-5 border-b border-gray-100">

          <h2 className="text-lg font-semibold">
            Gold Purchased by Karat
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Month-to-date gold purchases.
          </p>

        </div>

        {goldByKarat.length ===
        0 ? (
          <div className="p-6 text-center text-sm text-gray-400">
            No gold purchases this month.
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead className="bg-gray-50">

                <tr>

                  <th className="text-left px-5 py-3 font-medium text-gray-500">
                    Karat
                  </th>

                  <th className="text-right px-5 py-3 font-medium text-gray-500">
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
                    >

                      <td className="px-5 py-4 font-semibold">
                        {item.karat}K
                      </td>

                      <td className="px-5 py-4 text-right font-semibold">
                        {grams(
                          item.weight
                        )}
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </section>

      {/* MONTH SUMMARY */}

      <section className="bg-black text-white rounded-2xl p-5 md:p-6">

        <div className="mb-5">

          <h2 className="text-lg font-semibold">
            Month to Date
          </h2>

          <p className="text-xs text-gray-400 mt-1">
            Overall purchasing activity.
          </p>

        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">

          <div>
            <p className="text-xs text-gray-400">
              Purchase Value
            </p>

            <p className="text-xl font-bold mt-1">
              {money(
                monthMetrics.purchaseValue
              )}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-400">
              Cash Out
            </p>

            <p className="text-xl font-bold text-red-400 mt-1">
              {money(
                monthMetrics.totalCashOut
              )}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-400">
              Gold
            </p>

            <p className="text-xl font-bold text-yellow-400 mt-1">
              {grams(
                monthMetrics.goldWeight
              )}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-400">
              Silver
            </p>

            <p className="text-xl font-bold mt-1">
              {grams(
                monthMetrics.silverWeight
              )}
            </p>
          </div>

        </div>

      </section>

      {/* RECENT TRANSACTIONS */}

      <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">

        <div className="p-5 border-b border-gray-100">

          <h2 className="text-lg font-semibold">
            Recent Activity
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Latest transactions.
          </p>

        </div>

        {recentTransactions.length ===
        0 ? (
          <div className="p-6 text-center text-sm text-gray-400">
            No transactions found.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">

            {recentTransactions.map(
              (transaction) => {
                const isPurchase =
                  transaction.transaction_type ===
                  "purchase";

                return (
                  <div
                    key={
                      transaction.id
                    }
                    className="p-4 flex items-center justify-between gap-4"
                  >

                    <div className="min-w-0">

                      <p className="text-sm font-medium">
                        {isPurchase
                          ? "Purchase"
                          : "Payout"}
                      </p>

                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {transaction.date}

                        {transaction.store_id &&
                          storeFloatData.length >
                            1 &&
                          ` • ${getStoreName(
                            transaction.store_id
                          )}`}

                        {transaction.metal_type &&
                          ` • ${transaction.metal_type}`}

                        {transaction.weight &&
                          ` • ${grams(
                            transaction.weight
                          )}`}
                      </p>

                    </div>

                    <div className="text-right shrink-0">

                      <p className="font-semibold text-red-600">
                        -
                        {money(
                          isPurchase
                            ? transaction.amount_paid
                            : transaction.amount
                        )}
                      </p>

                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

      </section>

    </div>
  );
}
