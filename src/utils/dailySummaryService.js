export const getDailySummaries = () =>
  JSON.parse(localStorage.getItem("dailySummaries")) || [];

export const saveDailySummaries = (data) =>
  localStorage.setItem("dailySummaries", JSON.stringify(data));

export const getOrCreateDailySummary = (store, date) => {
  const summaries = getDailySummaries();

  let summary = summaries.find(
    (s) => s.store === store && s.date === date
  );

  if (!summary) {
    summary = {
      id: Date.now(),
      store,
      date,
      startFloat: 0,
      officeExpenses: 0,
      endFloatConfirmed: null,
      locked: false
    };

    summaries.push(summary);
    saveDailySummaries(summaries);
  }

  return summary;
};