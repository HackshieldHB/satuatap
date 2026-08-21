import type { Advertisement, AdPlacement, ApiResponse } from "@/types";
import { MOCK_ADS } from "@/data/mock";
import { delay } from "@/lib/utils";

export class AdService {
  async getAdsByPlacement(
    placement: AdPlacement
  ): Promise<ApiResponse<Advertisement[]>> {
    await delay(300);
    const ads = MOCK_ADS.filter((ad) => ad.placement === placement).sort(
      (a, b) => a.priority - b.priority
    );
    return { success: true, data: ads };
  }

  async getAllAds(): Promise<ApiResponse<Advertisement[]>> {
    await delay(300);
    return { success: true, data: MOCK_ADS };
  }

  trackImpression(ad: Advertisement): void {
    if (ad.impressionTracking) {
      // Future: send to analytics
    }
  }

  trackClick(ad: Advertisement): void {
    if (ad.clickTracking) {
      // Future: send to analytics
    }
  }
}

export const adService = new AdService();
