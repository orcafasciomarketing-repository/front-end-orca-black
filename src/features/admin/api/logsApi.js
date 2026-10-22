import api from "../../../shared/apiClient.js";
import { getLocalErrorLogs } from "../../../shared/errorLogger";
import { isMockEnabled } from "../../../shared/utils/isMockEnabled";

export const TEST_REPORT_URL = "/test-report.json";

export const getErrorLogs = async () => {
  if (isMockEnabled()) {
    return getLocalErrorLogs();
  }

  const response = await api.get("/logs");
  return response.data.data;
};

const toRelativePath = (path) => path.split("/src/").pop();

export const toTestReport = (report) => ({
  success: report.success,
  total: report.numTotalTests,
  passed: report.numPassedTests,
  failed: report.numFailedTests,
  skipped: report.numPendingTests + report.numTodoTests,
  ranAt: new Date(report.startTime).toISOString(),
  files: report.testResults.map((file) => ({
    name: toRelativePath(file.name),
    status: file.status,
    tests: file.assertionResults.map((test) => ({
      name: test.fullName,
      status: test.status,
      duration: test.duration,
      failureMessages: test.failureMessages,
    })),
  })),
});

export const getTestReport = async () => {
  const response = await fetch(TEST_REPORT_URL, { cache: "no-store" });
  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok || !contentType.includes("json")) {
    return null;
  }

  return toTestReport(await response.json());
};
