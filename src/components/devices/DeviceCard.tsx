"use client";

import Link from "next/link";
import {
  Lightbulb,
  Thermometer,
  Activity,
  Zap,
  Droplets,
  Plug,
  Camera,
  ToggleLeft,
  Cpu,
  Wifi,
  Clock,
  MapPin,
  Gauge,
  Minus,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { Device } from "@/types";
import { cn } from "@/lib/utils";
import { deviceService } from "@/services/home.service";
import { telemetryService } from "@/services/telemetry.service";
import { useState, useEffect } from "react";
import { formatRelativeTime } from "@/lib/utils";
import type { TelemetryPoint } from "@/types";

const deviceIcons: Record<string, LucideIcon> = {
  light: Lightbulb,
  switch: ToggleLeft,
  temperature_sensor: Thermometer,
  humidity_sensor: Droplets,
  environment_sensor: Thermometer,
  motion_sensor: Activity,
  electricity_meter: Zap,
  energy_meter: Zap,
  water_meter: Droplets,
  smart_plug: Plug,
  camera: Camera,
  other: Cpu,
};

const typeLabels: Record<string, string> = {
  light: "Lampu",
  switch: "Smart Switch",
  temperature_sensor: "Sensor Suhu",
  humidity_sensor: "Sensor Kelembapan",
  environment_sensor: "Sensor Lingkungan",
  motion_sensor: "Sensor Gerak",
  electricity_meter: "Meter Listrik",
  energy_meter: "Meter Listrik",
  water_meter: "Meter Air",
  smart_plug: "Smart Plug",
  camera: "Kamera",
  other: "Perangkat",
};

interface DeviceCardProps {
  device: Device;
  showControl?: boolean;
  onToggle?: (deviceId: string, isOn: boolean) => void;
  className?: string;
}

export function DeviceCard({
  device,
  showControl = false,
  onToggle,
  className,
}: DeviceCardProps) {
  const Icon = deviceIcons[device.type] || Cpu;
  const [loading, setLoading] = useState(false);
  const [isOn, setIsOn] = useState(device.isOn);
  const [open, setOpen] = useState(false);
  const [targetTemp, setTargetTemp] = useState(23);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);

  useEffect(() => {
    if (!open) return;
    void telemetryService.getDeviceTelemetry(device.homeId, device.id).then((res) => {
      if (res.success && res.data) setTelemetry(res.data.slice(0, 6));
    });
  }, [open, device.homeId, device.id]);

  const isClimate = /\bac\b/i.test(device.name);

  const handleToggle = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLoading(true);
    const result = await deviceService.toggleDevice(device.id, device.homeId);
    if (result.success && result.data) {
      setIsOn(result.data.isOn);
      onToggle?.(device.id, result.data.isOn);
    }
    setLoading(false);
  };

  const online = device.status === "online";
  const canControl =
    online &&
    (device.isOn !== undefined || Boolean(device.capabilities?.includes("on_off")));

  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-label={`Lihat detail ${device.name}`}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "group flex items-center gap-3 cursor-pointer transition-all duration-200",
          "hover:-translate-y-0.5 hover:shadow-floating active:scale-[0.99]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          className
        )}
        padding="md"
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-transform duration-300 group-hover:scale-110",
            online ? "bg-primary/10" : "bg-background"
          )}
        >
          <Icon
            className={cn("h-5 w-5", online ? "text-primary" : "text-muted")}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{device.name}</p>
          <p className="text-xs text-muted">{device.room}</p>
          {device.nodeId && (
            <p className="text-[11px] text-muted">{device.nodeId}</p>
          )}
          {device.value && (
            <p className="text-xs font-medium text-foreground mt-0.5">
              {device.value}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <StatusBadge status={device.status} />
          {showControl && canControl && (
            <Button
              size="sm"
              variant={isOn ? "primary" : "outline"}
              onClick={handleToggle}
              isLoading={loading}
              className="text-xs h-8"
            >
              {isOn ? "Matikan" : "Nyalakan"}
            </Button>
          )}
        </div>
      </Card>

      <BottomSheet
        isOpen={open}
        onClose={() => setOpen(false)}
        title={device.name}
      >
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-2xl",
                online ? "bg-primary/10" : "bg-background"
              )}
            >
              <Icon
                className={cn(
                  "h-7 w-7",
                  online ? "text-primary" : "text-muted"
                )}
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted">{typeLabels[device.type]}</p>
              <StatusBadge status={device.status} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InfoTile icon={MapPin} label="Ruangan" value={device.room} />
            {device.value && (
              <InfoTile icon={Gauge} label="Pembacaan" value={device.value} />
            )}
            {device.protocol && (
              <InfoTile
                icon={Wifi}
                label="Protokol"
                value={device.protocol.toUpperCase()}
              />
            )}
            <InfoTile
              icon={Clock}
              label="Terakhir terlihat"
              value={formatRelativeTime(device.lastSeen || device.lastUpdated)}
            />
            {device.nodeId && (
              <InfoTile icon={Cpu} label="Node" value={device.nodeId} />
            )}
            {device.firmware?.version && (
              <InfoTile
                icon={Cpu}
                label="Firmware"
                value={`${device.firmware.version}${device.buildNumber ? ` (${device.buildNumber})` : ""}`}
              />
            )}
            {device.ipAddress && (
              <InfoTile icon={Wifi} label="IP" value={device.ipAddress} />
            )}
            {device.macAddress && (
              <InfoTile icon={Wifi} label="MAC" value={device.macAddress} />
            )}
          </div>

          {device.config && Object.keys(device.config).length > 0 && (
            <div className="rounded-lg bg-background p-3">
              <p className="text-[11px] text-muted mb-1">Kalibrasi</p>
              <dl className="grid grid-cols-2 gap-1 text-sm">
                {Object.entries(device.config).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted">{k}</dt>
                    <dd className="font-medium">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {telemetry.length > 0 && (
            <div className="rounded-lg bg-background p-3 space-y-1">
              <p className="text-[11px] text-muted mb-1">Telemetry terbaru</p>
              {telemetry.map((row) => (
                <p key={row.timestamp} className="text-xs text-muted truncate">
                  {new Date(row.timestamp).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · {JSON.stringify(row.metrics)}
                </p>
              ))}
            </div>
          )}

          {online && isClimate && isOn && (
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-muted">Suhu target</span>
              <div className="flex items-center gap-5">
                <button
                  onClick={() => setTargetTemp((t) => Math.max(16, t - 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-foreground hover:bg-border/60"
                  aria-label="Turunkan suhu"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-primary/30 bg-primary/5">
                  <span className="text-2xl font-bold">{targetTemp}°</span>
                </div>
                <button
                  onClick={() => setTargetTemp((t) => Math.min(30, t + 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-foreground hover:bg-border/60"
                  aria-label="Naikkan suhu"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {canControl ? (
            <Button
              className="w-full"
              variant={isOn ? "outline" : "primary"}
              onClick={handleToggle}
              isLoading={loading}
            >
              {isOn ? "Matikan Perangkat" : "Nyalakan Perangkat"}
            </Button>
          ) : (
            <p className="text-center text-xs text-muted">
              {online
                ? "Perangkat ini tidak dapat dikontrol langsung."
                : "Perangkat sedang offline."}
            </p>
          )}
        </div>
      </BottomSheet>
    </>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-background p-3">
      <div className="flex items-center gap-1.5 text-muted">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px]">{label}</span>
      </div>
      <p className="text-sm font-medium mt-1 break-words">{value}</p>
    </div>
  );
}

interface DeviceSummaryProps {
  devicesOnline: number;
  devicesOffline: number;
  featuredDevices: Device[];
}

export function DeviceSummary({
  devicesOnline,
  devicesOffline,
  featuredDevices,
}: DeviceSummaryProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Perangkat</h2>
          <p className="text-xs text-muted">
            {devicesOnline} Online · {devicesOffline} Offline
          </p>
        </div>
        <Link href="/devices" className="text-sm font-medium text-primary">
          Lihat Semua
        </Link>
      </div>
      <div className="space-y-2">
        {featuredDevices.map((device) => (
          <DeviceCard key={device.id} device={device} />
        ))}
      </div>
    </section>
  );
}
