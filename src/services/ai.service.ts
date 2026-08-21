import type { AIInsight, ApiResponse } from "@/types";
import { MOCK_AI_INSIGHTS } from "@/data/mock";
import { delay } from "@/lib/utils";

export class AIService {
  async getInsights(homeId: string): Promise<ApiResponse<AIInsight[]>> {
    await delay(500);
    return {
      success: true,
      data: MOCK_AI_INSIGHTS.filter((i) => i.homeId === homeId),
    };
  }
}

export const aiService = new AIService();
