"use client";

import type { Advertisement } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { adService } from "@/services/ad.service";

interface AdSlotProps {
  ads: Advertisement[];
  className?: string;
}

function SponsoredLabel({ sponsored }: { sponsored: boolean }) {
  return (
    <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
      {sponsored ? "Bersponsor" : "Iklan"}
    </span>
  );
}

function HeroAd({ ad }: { ad: Advertisement }) {
  useEffect(() => {
    adService.trackImpression(ad);
  }, [ad]);

  return (
    <div className="relative overflow-hidden rounded-hero bg-gradient-to-r from-primary/10 to-secondary/10 border border-border/50">
      <div className="flex flex-col sm:flex-row items-center gap-4 p-5 sm:p-6">
        <div className="flex-1 space-y-2 text-center sm:text-left">
          <SponsoredLabel sponsored={ad.sponsored} />
          <h3 className="text-lg font-semibold text-foreground">{ad.title}</h3>
          <p className="text-sm text-muted">{ad.description}</p>
          <Link
            href={ad.ctaUrl}
            onClick={() => adService.trackClick(ad)}
            className="inline-block mt-2"
          >
            <Button size="sm">{ad.ctaLabel}</Button>
          </Link>
        </div>
        {(ad.mobileImage || ad.desktopImage) && (
          <div className="relative h-28 w-full sm:h-32 sm:w-40 shrink-0 rounded-lg overflow-hidden">
            <Image
              src={ad.mobileImage || ad.desktopImage || ""}
              alt=""
              fill
              className="object-cover sm:hidden"
              sizes="(max-width: 640px) 100vw, 160px"
            />
            <Image
              src={ad.desktopImage || ad.mobileImage || ""}
              alt=""
              fill
              className="object-cover hidden sm:block"
              sizes="160px"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SponsoredCardAd({ ad }: { ad: Advertisement }) {
  return (
    <div className="rounded-lg border border-border/50 bg-surface p-4 shadow-card">
      <SponsoredLabel sponsored={ad.sponsored} />
      <div className="mt-2 flex gap-3">
        {ad.mobileImage && (
          <div className="relative h-16 w-16 shrink-0 rounded-md overflow-hidden">
            <Image src={ad.mobileImage} alt="" fill className="object-cover" sizes="64px" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold">{ad.title}</h4>
          <p className="text-xs text-muted mt-0.5 line-clamp-2">{ad.description}</p>
          <Link
            href={ad.ctaUrl}
            className="text-xs font-medium text-primary mt-1 inline-block"
          >
            {ad.ctaLabel} →
          </Link>
        </div>
      </div>
    </div>
  );
}

function RecommendationAd({ ad }: { ad: Advertisement }) {
  return (
    <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-4">
      <SponsoredLabel sponsored={ad.sponsored} />
      <h4 className="text-sm font-semibold mt-1">{ad.title}</h4>
      <p className="text-xs text-muted mt-1">{ad.description}</p>
      <Link href={ad.ctaUrl} className="text-xs font-medium text-secondary mt-2 inline-block">
        {ad.ctaLabel} →
      </Link>
    </div>
  );
}

function PaymentPromotionAd({ ad }: { ad: Advertisement }) {
  return (
    <div className="rounded-lg bg-info/5 border border-info/20 p-4 flex items-center justify-between gap-3">
      <div>
        <SponsoredLabel sponsored={ad.sponsored} />
        <h4 className="text-sm font-semibold mt-1">{ad.title}</h4>
        <p className="text-xs text-muted">{ad.description}</p>
      </div>
      <Link href={ad.ctaUrl}>
        <Button size="sm" variant="secondary">
          {ad.ctaLabel}
        </Button>
      </Link>
    </div>
  );
}

export function AdSlot({ ads, className }: AdSlotProps) {
  if (!ads.length) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {ads.map((ad) => {
        switch (ad.variant) {
          case "hero":
            return <HeroAd key={ad.campaignId} ad={ad} />;
          case "sponsored_card":
            return <SponsoredCardAd key={ad.campaignId} ad={ad} />;
          case "recommendation":
            return <RecommendationAd key={ad.campaignId} ad={ad} />;
          case "payment_promotion":
            return <PaymentPromotionAd key={ad.campaignId} ad={ad} />;
          default:
            return <SponsoredCardAd key={ad.campaignId} ad={ad} />;
        }
      })}
    </div>
  );
}

export function AdSlotLoader({ placement }: { placement: string }) {
  return (
    <div
      className="h-32 rounded-hero skeleton-shimmer"
      aria-label={`Memuat iklan ${placement}`}
    />
  );
}
