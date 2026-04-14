import { supabase } from "../lib/supabase";

/**
 * Get all daily summaries
 */
export const getDailySummaries = async () => {
  const { data, error } = await supabase
    .from("daily_summaries")
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching summaries:", error);
    return [];
  }

  return data;
};

/**
 * Save (bulk update) summaries
 * You probably won't need bulk anymore,
 * but keeping it for compatibility.
 */
export const saveDailySummaries = async (summaries) => {
  const { error } = await supabase
    .from("daily_summaries")
    .upsert(summaries, { onConflict: "id" });

  if (error) {
    console.error("Error saving summaries:", error);
  }
};

/**
 * Get or create daily summary
 */
export const getOrCreateDailySummary = async (
  store,
  date
) => {
  // 1️⃣ Try to get existing summary
  const { data, error } = await supabase
    .from("daily_summaries")
    .select("*")
    .eq("store", store)
    .eq("date", date)
    .single();

  if (data) return data;

  // 2️⃣ If not found, create it
  const { data: newSummary, error: insertError } =
    await supabase
      .from("daily_summaries")
      .insert([
        {
          store,
          date,
          start_float: 0,
          office_expenses: 0,
          locked: false
        }
      ])
      .select()
      .single();

  if (insertError) {
    console.error(
      "Error creating summary:",
      insertError
    );
    return null;
  }

  return newSummary;
};