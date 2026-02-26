export const getMeasurements = () =>
  JSON.parse(localStorage.getItem("measurements")) || [];

export const saveMeasurements = (data) =>
  localStorage.setItem("measurements", JSON.stringify(data));

export const getMeasurementForDay = (store, date) => {
  const measurements = getMeasurements();

  return measurements.find(
    (m) => m.store === store && m.date === date
  );
};