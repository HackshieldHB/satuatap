import type { Bill, ApiResponse } from "@/types";
import { MOCK_BILLS } from "@/data/mock";
import { delay } from "@/lib/utils";

export class PaymentService {
  async getBills(homeId: string): Promise<ApiResponse<Bill[]>> {
    await delay(400);
    return {
      success: true,
      data: MOCK_BILLS.filter((b) => b.homeId === homeId),
    };
  }
}

export const paymentService = new PaymentService();
