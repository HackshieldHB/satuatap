export const useMockData =
  process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA !== "false";

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
