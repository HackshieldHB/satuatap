import type { HouseholdMember, ApiResponse } from "@/types";
import { MOCK_HOUSEHOLD } from "@/data/mock";
import { delay } from "@/lib/utils";

export class HouseholdService {
  async getMembers(homeId: string): Promise<ApiResponse<HouseholdMember[]>> {
    await delay(400);
    return {
      success: true,
      data: MOCK_HOUSEHOLD.filter((m) => m.homeId === homeId),
    };
  }
}

export const householdService = new HouseholdService();
