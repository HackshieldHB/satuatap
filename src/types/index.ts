// ─── Core Entities ───────────────────────────────────────────────

export type HomeType = "apartment" | "house" | "villa" | "other";

export type DeviceType =
  | "light"
  | "switch"
  | "temperature_sensor"
  | "humidity_sensor"
  | "environment_sensor"
  | "motion_sensor"
  | "electricity_meter"
  | "energy_meter"
  | "water_meter"
  | "smart_plug"
  | "camera"
  | "other";

export type DeviceProtocol =
  | "wifi"
  | "bluetooth"
  | "zigbee"
  | "matter"
  | "mqtt"
  | "other";

export type DeviceStatus = "online" | "offline" | "unknown";

export type HouseholdRole =
  | "owner"
  | "admin"
  | "member"
  | "guest"
  | "limited";

export type PaymentStatus =
  | "pending"
  | "success"
  | "failed"
  | "expired";

export type BillType = "electricity" | "water" | "internet" | "other";

export type PaymentMethod =
  | "qris"
  | "bank_transfer"
  | "e_wallet"
  | "virtual_account";

export type NotificationCategory =
  | "alert"
  | "device"
  | "ai"
  | "payment"
  | "promotion";

export type AdPlacement =
  | "HOME_HERO"
  | "HOME_MIDDLE"
  | "HOME_RECOMMENDATION"
  | "HOME_PAYMENT"
  | "ROOM_DETAIL"
  | "ENERGY_DETAIL"
  | "WATER_DETAIL"
  | "DEVICE_DETAIL";

export type AdVariant =
  | "hero"
  | "standard"
  | "compact"
  | "sponsored_card"
  | "recommendation"
  | "service_promotion"
  | "product_promotion"
  | "payment_promotion";

export type HomeStatusType =
  | "normal"
  | "devices_offline"
  | "energy_high"
  | "water_unusual";

// ─── Models ──────────────────────────────────────────────────────

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Home {
  id: string;
  name: string;
  type: HomeType;
  location: string;
  deviceCount: number;
  roomCount: number;
  ownerId: string;
  createdAt: string;
}

export interface Room {
  id: string;
  homeId: string;
  name: string;
  deviceCount: number;
  temperature?: number;
  activeDevices: number;
  icon?: string;
}

export interface Device {
  id: string;
  homeId: string;
  roomId: string;
  name: string;
  type: DeviceType;
  protocol?: DeviceProtocol;
  status: DeviceStatus;
  room: string;
  value?: string;
  isOn?: boolean;
  lastUpdated: string;
  /** Capability keys from the API (e.g. power, on_off). Optional in mock mode. */
  capabilities?: string[];
  lastSeen?: string;
  firmware?: { model?: string; version?: string };
  nodeId?: string;
  macAddress?: string;
  ipAddress?: string;
  buildNumber?: number;
  config?: Record<string, unknown>;
}

export type UsagePeriod = "day" | "week" | "month";

export interface EnergyUsage {
  homeId: string;
  todayKwh: number;
  estimatedCost: number;
  comparisonPercent: number;
  comparisonDirection: "up" | "down";
  period?: UsagePeriod;
  consumption?: number;
  peak?: number;
  average?: number;
}

export interface WaterUsage {
  homeId: string;
  todayLiters: number;
  estimatedCost: number;
  comparisonPercent: number;
  comparisonDirection: "up" | "down";
  period?: UsagePeriod;
  consumption?: number;
  peak?: number;
  average?: number;
}

export interface EnvironmentData {
  homeId: string;
  temperature: number;
  humidity: number;
  airQuality?: "good" | "moderate" | "poor";
}

export interface TelemetryPoint {
  deviceId: string;
  homeId: string;
  timestamp: string;
  metrics: Record<string, unknown>;
}

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "open" | "acknowledged" | "resolved";
export type AlertType =
  | "HIGH_ELECTRICITY"
  | "ABNORMAL_WATER"
  | "POSSIBLE_LEAK"
  | "DEVICE_OFFLINE"
  | "SENSOR_ERROR";

export interface HomeAlert {
  id: string;
  homeId: string;
  deviceId?: string | null;
  roomId?: string | null;
  severity: AlertSeverity;
  type: AlertType;
  title: string;
  message: string;
  status: AlertStatus;
  createdAt: string;
  acknowledgedAt?: string | null;
  deviceName?: string;
  roomName?: string;
}

export interface AlertThreshold {
  id: string;
  homeId: string;
  type: AlertType;
  metric: string;
  op: string;
  value: number;
  forSeconds: number;
  severity: AlertSeverity;
  enabled: boolean;
}

export interface EnvironmentRoom {
  deviceId: string;
  room: string;
  temperature: number;
  humidity: number;
  min: number;
  max: number;
  avg: number;
  history: { label: string; value: number }[];
}

export interface MotionStrip {
  deviceId: string;
  room: string;
  lastDetected?: string | null;
  hours: boolean[];
}

export interface EnvironmentDetail {
  homeId: string;
  rooms: EnvironmentRoom[];
  motion: MotionStrip[];
}

export type SystemComponentStatus = "up" | "down" | "degraded" | "unknown";

export interface SystemNodeStatus {
  nodeId: string;
  status: SystemComponentStatus;
  lastSeen?: string;
  deviceCount: number;
  onlineCount: number;
}

export interface SystemHealth {
  pi: SystemComponentStatus;
  mqtt: SystemComponentStatus;
  database: SystemComponentStatus;
  cloud: SystemComponentStatus;
  nodes: SystemNodeStatus[];
  backlog: number;
  lastSync: string | null;
  localMode: boolean;
}

export type AIInsightCategory =
  | "energy"
  | "water"
  | "cost"
  | "security"
  | "automation"
  | "comfort";

export type AIInsightSeverity = "opportunity" | "attention" | "info";

export interface AIInsight {
  id: string;
  homeId: string;
  title: string;
  message: string;
  potentialSaving?: number;
  ctaLabel: string;
  ctaUrl: string;
  createdAt: string;
  category?: AIInsightCategory;
  severity?: AIInsightSeverity;
  /** Short headline metric, e.g. "+18% vs biasanya". */
  impactValue?: string;
  /** Actionable recommendation steps shown in the detailed view. */
  steps?: string[];
  /** Model confidence 0–100. */
  confidence?: number;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  ctaLabel: string;
  ctaUrl: string;
  sponsored: boolean;
}

export interface Notification {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  icon?: string;
}

export interface Advertisement {
  campaignId: string;
  placement: AdPlacement;
  variant: AdVariant;
  title: string;
  description: string;
  image?: string;
  mobileImage?: string;
  desktopImage?: string;
  ctaLabel: string;
  ctaUrl: string;
  sponsored: boolean;
  priority: number;
  startDate: string;
  endDate: string;
  impressionTracking?: string;
  clickTracking?: string;
  frequencyCap?: number;
}

export interface Bill {
  id: string;
  homeId: string;
  type: BillType;
  provider: string;
  amount: number;
  dueDate: string;
  status: "unpaid" | "paid" | "overdue";
  period: string;
}

export interface Transaction {
  id: string;
  billId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  createdAt: string;
}

export interface HouseholdMember {
  id: string;
  homeId: string;
  name: string;
  email: string;
  role: HouseholdRole;
  avatarUrl?: string;
}

export interface Subscription {
  id: string;
  plan: "free" | "premium" | "family";
  status: "active" | "expired" | "cancelled";
  expiresAt?: string;
}

export interface ActivityItem {
  id: string;
  homeId: string;
  message: string;
  deviceName?: string;
  timestamp: string;
  type: "device" | "automation" | "alert" | "payment";
}

export interface DashboardData {
  homeStatus: HomeStatusType;
  statusMessage: string;
  energy: EnergyUsage;
  water: WaterUsage;
  environment: EnvironmentData;
  aiInsight: AIInsight;
  devicesOnline: number;
  devicesOffline: number;
  featuredDevices: Device[];
  recentActivity: ActivityItem[];
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

export interface OnboardingData {
  homeName: string;
  homeType: HomeType;
  skippedDevice: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  degraded?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface SceneAction {
  deviceId: string;
  turnOn: boolean;
}

export interface Scene {
  id: string;
  name: string;
  description: string;
  /** lucide icon key */
  icon: string;
  /** tailwind gradient classes, e.g. "from-primary to-warning" */
  gradient: string;
  actions: SceneAction[];
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  href: string;
  status?: string;
}

export interface ServiceCategory {
  id: string;
  label: string;
  description: string;
  icon: string;
  href: string;
  color: string;
}

export interface DeviceCategory {
  id: DeviceType;
  label: string;
  description: string;
  icon: string;
}

export interface DeviceFilter {
  id: string;
  label: string;
}

export interface AuthSession {
  user: User;
  token: string;
  onboardingCompleted: boolean;
  selectedHomeId?: string;
}

// ─── Payments & Commerce ─────────────────────────────────────────

/** How a payment is settled. No stored balance — every order picks one. */
export type PaymentChannel =
  | "qris"
  | "cash"
  | "virtual_account"
  | "bank_transfer"
  | "credit_card";

export type OrderKind = "bill" | "topup" | "marketplace" | "service";

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  /** Small context line, e.g. a vendor or token nominal. */
  meta?: string;
  emoji?: string;
  /** Kiosk this item is sold by — used to route an order to a vendor. */
  vendorId?: string;
}

export interface CheckoutOrder {
  title: string;
  subtitle?: string;
  kind: OrderKind;
  items: OrderItem[];
  /** Admin or delivery fee added on top of the items subtotal. */
  fee?: number;
  feeLabel?: string;
  /** Optional success line, e.g. delivery estimate. */
  successNote?: string;
}

/** Prepaid electricity (token listrik) meter status. */
export interface ElectricityToken {
  meterNumber: string;
  remainingKwh: number;
  /** kWh threshold under which the MCB starts beeping / we alert. */
  lowThreshold: number;
  lastTopUp: string;
}

export interface Biller {
  id: string;
  label: string;
  description: string;
  /** lucide icon key */
  icon: string;
  color: string;
  /** input hint, e.g. "Nomor Meter / ID Pelanggan" */
  idLabel: string;
  idPlaceholder: string;
  /** preset ID prefilled for the demo */
  defaultId: string;
  nominals: { amount: number; value?: string }[];
  adminFee: number;
}

export type ProductKind = "device" | "goods";

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  emoji: string;
  description: string;
  kind: ProductKind;
  rating?: number;
  sold?: number;
  /** goods only */
  unit?: string;
  vendor?: string;
  vendorId?: string;
  eta?: string;
}

export interface CartLine {
  product: Product;
  qty: number;
}

export interface Promo {
  code: string;
  label: string;
  type: "percent" | "flat";
  value: number;
  maxDiscount?: number;
}

// ─── Automations & Schedules ─────────────────────────────────────

export type AutomationTriggerType =
  | "motion"
  | "time"
  | "device_on"
  | "temperature"
  | "sunset";

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  icon: string;
  triggerType: AutomationTriggerType;
  triggerLabel: string;
  actionLabels: string[];
}

// ─── Building super-app ──────────────────────────────────────────

export type AnnouncementCategory =
  | "info"
  | "maintenance"
  | "event"
  | "security";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  date: string;
  pinned?: boolean;
}

export type ReportStatus = "submitted" | "in_progress" | "resolved";

export interface MaintenanceReport {
  id: string;
  category: string;
  description: string;
  location: string;
  status: ReportStatus;
  createdAt: string;
}

export interface VisitorPass {
  id: string;
  name: string;
  purpose: string;
  date: string;
  code: string;
}

// ─── Orders & tracking ───────────────────────────────────────────

export type OrderStatus =
  | "confirmed"
  | "preparing"
  | "delivering"
  | "completed"
  | "cancelled";

export interface Order {
  id: string;
  title: string;
  kind: OrderKind;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  eta?: string;
  vendor?: string;
  /** Kiosk routing / payment context (present on server-backed orders). */
  homeId?: string;
  unit?: string;
  floor?: string | null;
  paymentChannel?: PaymentChannel;
  paymentStatus?: "pending" | "paid";
}

// ─── Rewards & subscriptions ─────────────────────────────────────

export interface Voucher {
  id: string;
  title: string;
  description: string;
  cost: number;
  icon: string;
}

export interface SubscriptionPlan {
  id: string;
  title: string;
  description: string;
  price: number;
  cadence: string;
  icon: string;
  active: boolean;
}

// ─── Insight ─────────────────────────────────────────────────────

export interface MonthlyReport {
  month: string;
  energyKwh: number;
  energyCost: number;
  waterLiters: number;
  waterCost: number;
  totalSpend: number;
  savings: number;
  co2Kg: number;
}
