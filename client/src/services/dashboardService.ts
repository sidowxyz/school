import api from "../lib/axios";

export const getDashboardData = async () => {
  const response = await api.get("/v1/analytics/admin-kpis");
  return response.data.data;
};

export const getTeacherDashboardData = async () => {
  const response = await api.get("/v1/analytics/teacher-kpis");
  return response.data.data;
};

export const getFinanceDashboardData = async () => {
  const response = await api.get("/v1/analytics/finance-summary");
  return response.data.data;
};

export const getAcademicPerformanceData = async () => {
  const response = await api.get("/v1/analytics/academic-performance");
  return response.data.data;
};