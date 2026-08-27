import api from "./axios";
import type { AnalyticsSummary, ApiEnvelope } from "../types";

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const res = await api.get<ApiEnvelope<AnalyticsSummary>>("/analytics/summary");
  return res.data.data;
}
