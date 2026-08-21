import type {
  User,
  Home,
  Room,
  Device,
  Notification,
  Advertisement,
  HouseholdMember,
  AIInsight,
  DashboardData,
  ServiceCategory,
  DeviceCategory,
  QuickAction,
  Scene,
  ElectricityToken,
  Biller,
  Product,
  AutomationRule,
  Announcement,
  MaintenanceReport,
  Voucher,
  SubscriptionPlan,
  Promo,
  MonthlyReport,
  Order,
} from "@/types";

export const MOCK_USER: User = {
  id: "user-1",
  fullName: "Kevin Santoso",
  email: "kevin.santoso@gmail.com",
  phone: "081234567890",
  avatarUrl: undefined,
  createdAt: "2025-06-15T08:00:00Z",
};

export const MOCK_HOMES: Home[] = [
  {
    id: "home-1",
    name: "Rumah Kevin",
    type: "house",
    location: "Jakarta Selatan",
    deviceCount: 18,
    roomCount: 6,
    ownerId: "user-1",
    createdAt: "2025-06-15T08:00:00Z",
  },
  {
    id: "home-2",
    name: "Villa Puncak",
    type: "villa",
    location: "Bandung",
    deviceCount: 7,
    roomCount: 4,
    ownerId: "user-1",
    createdAt: "2025-09-01T10:00:00Z",
  },
];

export const MOCK_ROOMS: Room[] = [
  {
    id: "room-1",
    homeId: "home-1",
    name: "Ruang Tamu",
    deviceCount: 5,
    temperature: 24.8,
    activeDevices: 3,
  },
  {
    id: "room-2",
    homeId: "home-1",
    name: "Kamar Tidur",
    deviceCount: 4,
    temperature: 23.5,
    activeDevices: 2,
  },
  {
    id: "room-3",
    homeId: "home-1",
    name: "Dapur",
    deviceCount: 3,
    temperature: 25.2,
    activeDevices: 1,
  },
  {
    id: "room-4",
    homeId: "home-1",
    name: "Kamar Mandi",
    deviceCount: 2,
    temperature: 26.0,
    activeDevices: 0,
  },
  {
    id: "room-5",
    homeId: "home-1",
    name: "Garasi",
    deviceCount: 2,
    temperature: 28.1,
    activeDevices: 1,
  },
  {
    id: "room-6",
    homeId: "home-1",
    name: "Teras",
    deviceCount: 2,
    temperature: 27.3,
    activeDevices: 1,
  },
  // Villa Puncak (home-2) — cooler Bandung climate
  { id: "room-v1", homeId: "home-2", name: "Ruang Keluarga", deviceCount: 3, temperature: 21.4, activeDevices: 2 },
  { id: "room-v2", homeId: "home-2", name: "Kamar Utama", deviceCount: 2, temperature: 20.8, activeDevices: 1 },
  { id: "room-v3", homeId: "home-2", name: "Dapur", deviceCount: 1, temperature: 22.5, activeDevices: 0 },
  { id: "room-v4", homeId: "home-2", name: "Teras", deviceCount: 1, temperature: 19.6, activeDevices: 1 },
];

export const MOCK_DEVICES: Device[] = [
  {
    id: "dev-1",
    homeId: "home-1",
    roomId: "room-1",
    name: "Lampu Ruang Tamu",
    type: "light",
    protocol: "wifi",
    status: "online",
    room: "Ruang Tamu",
    value: "ON",
    isOn: true,
    lastUpdated: "2026-08-17T13:45:00Z",
  },
  {
    id: "dev-2",
    homeId: "home-1",
    roomId: "room-2",
    name: "Sensor Kamar Tidur",
    type: "temperature_sensor",
    protocol: "zigbee",
    status: "online",
    room: "Kamar Tidur",
    value: "24.2°C",
    lastUpdated: "2026-08-17T13:44:00Z",
  },
  {
    id: "dev-3",
    homeId: "home-1",
    roomId: "room-3",
    name: "Sensor Gerak Dapur",
    type: "motion_sensor",
    protocol: "zigbee",
    status: "online",
    room: "Dapur",
    value: "Tidak ada aktivitas",
    lastUpdated: "2026-08-17T13:30:00Z",
  },
  {
    id: "dev-4",
    homeId: "home-1",
    roomId: "room-1",
    name: "Smart Plug TV",
    type: "smart_plug",
    protocol: "wifi",
    status: "online",
    room: "Ruang Tamu",
    value: "ON",
    isOn: true,
    lastUpdated: "2026-08-17T13:40:00Z",
  },
  {
    id: "dev-5",
    homeId: "home-1",
    roomId: "room-2",
    name: "Lampu Kamar Tidur",
    type: "light",
    protocol: "wifi",
    status: "offline",
    room: "Kamar Tidur",
    value: "OFF",
    isOn: false,
    lastUpdated: "2026-08-17T10:15:00Z",
  },
  {
    id: "dev-6",
    homeId: "home-1",
    roomId: "room-5",
    name: "Sensor Garasi",
    type: "motion_sensor",
    protocol: "zigbee",
    status: "offline",
    room: "Garasi",
    value: "Offline",
    lastUpdated: "2026-08-17T09:00:00Z",
  },
  {
    id: "dev-7",
    homeId: "home-1",
    roomId: "room-1",
    name: "Meter Listrik",
    type: "electricity_meter",
    protocol: "mqtt",
    status: "online",
    room: "Ruang Tamu",
    value: "4.82 kWh",
    lastUpdated: "2026-08-17T13:45:00Z",
  },
  {
    id: "dev-8",
    homeId: "home-1",
    roomId: "room-4",
    name: "Meter Air",
    type: "water_meter",
    protocol: "mqtt",
    status: "online",
    room: "Kamar Mandi",
    value: "182 L",
    lastUpdated: "2026-08-17T13:45:00Z",
  },
  // Villa Puncak (home-2) devices
  { id: "dev-v1", homeId: "home-2", roomId: "room-v1", name: "Lampu Ruang Keluarga", type: "light", protocol: "wifi", status: "online", room: "Ruang Keluarga", value: "ON", isOn: true, lastUpdated: "2026-08-17T13:40:00Z" },
  { id: "dev-v2", homeId: "home-2", roomId: "room-v1", name: "AC Ruang Keluarga", type: "smart_plug", protocol: "wifi", status: "online", room: "Ruang Keluarga", value: "ON", isOn: true, lastUpdated: "2026-08-17T13:35:00Z" },
  { id: "dev-v3", homeId: "home-2", roomId: "room-v1", name: "Sensor Suhu Keluarga", type: "temperature_sensor", protocol: "zigbee", status: "online", room: "Ruang Keluarga", value: "21.4°C", lastUpdated: "2026-08-17T13:44:00Z" },
  { id: "dev-v4", homeId: "home-2", roomId: "room-v2", name: "Lampu Kamar Utama", type: "light", protocol: "wifi", status: "online", room: "Kamar Utama", value: "ON", isOn: true, lastUpdated: "2026-08-17T12:00:00Z" },
  { id: "dev-v5", homeId: "home-2", roomId: "room-v2", name: "Sensor Kamar Utama", type: "motion_sensor", protocol: "zigbee", status: "offline", room: "Kamar Utama", value: "Offline", lastUpdated: "2026-08-17T08:00:00Z" },
  { id: "dev-v6", homeId: "home-2", roomId: "room-v3", name: "Meter Listrik Villa", type: "electricity_meter", protocol: "mqtt", status: "online", room: "Dapur", value: "2.10 kWh", lastUpdated: "2026-08-17T13:45:00Z" },
  { id: "dev-v7", homeId: "home-2", roomId: "room-v4", name: "Lampu Teras Villa", type: "light", protocol: "wifi", status: "online", room: "Teras", value: "ON", isOn: true, lastUpdated: "2026-08-17T13:30:00Z" },
];

export const MOCK_DASHBOARD: DashboardData = {
  homeStatus: "normal",
  statusMessage: "Semua terlihat baik",
  energy: {
    homeId: "home-1",
    todayKwh: 4.82,
    estimatedCost: 7240,
    comparisonPercent: 8,
    comparisonDirection: "down",
  },
  water: {
    homeId: "home-1",
    todayLiters: 182,
    estimatedCost: 3420,
    comparisonPercent: 12,
    comparisonDirection: "up",
  },
  environment: {
    homeId: "home-1",
    temperature: 24.8,
    humidity: 68,
    airQuality: "good",
  },
  aiInsight: {
    id: "ai-1",
    homeId: "home-1",
    category: "energy",
    severity: "attention",
    title: "Lonjakan Pemakaian Listrik 🔌",
    message:
      "Konsumsi listrik 18% lebih tinggi dari rata-rata mingguanmu. Penyumbang terbesar: AC kamar tidur di malam hari dan Smart Plug TV yang menyala hampir 14 jam/hari.",
    impactValue: "+18% vs biasanya",
    steps: [
      "Jadwalkan AC mati otomatis pukul 23.00–05.00",
      "Aktifkan mode hemat pada Smart Plug TV",
      "Ganti 4 lampu ruang tamu ke LED pintar",
    ],
    potentialSaving: 85000,
    confidence: 92,
    ctaLabel: "Terapkan Otomatisasi",
    ctaUrl: "/devices?filter=energy",
    createdAt: "2026-08-17T08:00:00Z",
  },
  devicesOnline: 12,
  devicesOffline: 2,
  featuredDevices: MOCK_DEVICES.slice(0, 3),
  recentActivity: [
    {
      id: "act-1",
      homeId: "home-1",
      message: "Lampu Ruang Tamu dinyalakan",
      deviceName: "Lampu Ruang Tamu",
      timestamp: "2026-08-17T13:45:00Z",
      type: "device",
    },
    {
      id: "act-2",
      homeId: "home-1",
      message: "Sensor gerak terdeteksi di Dapur",
      deviceName: "Sensor Gerak Dapur",
      timestamp: "2026-08-17T13:30:00Z",
      type: "device",
    },
    {
      id: "act-3",
      homeId: "home-1",
      message: "Tagihan listrik jatuh tempo dalam 3 hari",
      timestamp: "2026-08-17T08:00:00Z",
      type: "payment",
    },
  ],
};

export const MOCK_DASHBOARD_HOME2: DashboardData = {
  homeStatus: "normal",
  statusMessage: "Villa dalam kondisi baik",
  energy: {
    homeId: "home-2",
    todayKwh: 2.1,
    estimatedCost: 3150,
    comparisonPercent: 5,
    comparisonDirection: "down",
  },
  water: {
    homeId: "home-2",
    todayLiters: 96,
    estimatedCost: 1800,
    comparisonPercent: 4,
    comparisonDirection: "down",
  },
  environment: {
    homeId: "home-2",
    temperature: 21.0,
    humidity: 74,
    airQuality: "good",
  },
  aiInsight: {
    id: "ai-v1",
    homeId: "home-2",
    category: "energy",
    severity: "opportunity",
    title: "Villa Hemat Energi 🌱",
    message:
      "Konsumsi listrik villa 5% lebih rendah dari minggu lalu. Udara sejuk Bandung mengurangi kebutuhan pendingin.",
    impactValue: "-5% listrik",
    steps: [
      "Pertahankan jadwal AC hanya di malam hari",
      "Manfaatkan ventilasi alami saat siang",
    ],
    potentialSaving: 40000,
    confidence: 86,
    ctaLabel: "Lihat Energi",
    ctaUrl: "/devices?filter=energy",
    createdAt: "2026-08-17T08:00:00Z",
  },
  devicesOnline: 6,
  devicesOffline: 1,
  featuredDevices: MOCK_DEVICES.filter((d) => d.homeId === "home-2").slice(0, 3),
  recentActivity: [
    {
      id: "act-v1",
      homeId: "home-2",
      message: "Lampu Teras Villa dinyalakan",
      deviceName: "Lampu Teras Villa",
      timestamp: "2026-08-17T13:30:00Z",
      type: "device",
    },
    {
      id: "act-v2",
      homeId: "home-2",
      message: "Sensor Kamar Utama terputus",
      deviceName: "Sensor Kamar Utama",
      timestamp: "2026-08-17T08:00:00Z",
      type: "alert",
    },
  ],
};

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "notif-token",
    category: "alert",
    title: "Token listrik hampir habis ⚡",
    message:
      "Sisa token tinggal 1,4 kWh — MCB akan segera berbunyi. Isi ulang sekarang biar listrik tidak padam.",
    read: false,
    createdAt: "2026-08-17T09:20:00Z",
    icon: "zap",
  },
  {
    id: "notif-1",
    category: "alert",
    title: "Pemakaian listrik lebih tinggi",
    message: "Pemakaian listrik hari ini 18% lebih tinggi dari biasanya.",
    read: false,
    createdAt: "2026-08-17T08:00:00Z",
    icon: "zap",
  },
  {
    id: "notif-2",
    category: "alert",
    title: "Konsumsi air tidak biasa",
    message: "Pemakaian air terdeteksi lebih tinggi dari rata-rata.",
    read: false,
    createdAt: "2026-08-17T07:30:00Z",
    icon: "droplets",
  },
  {
    id: "notif-3",
    category: "device",
    title: "Perangkat offline",
    message: "Sensor Garasi sedang offline.",
    read: false,
    createdAt: "2026-08-17T09:00:00Z",
    icon: "wifi-off",
  },
  {
    id: "notif-4",
    category: "payment",
    title: "Tagihan listrik",
    message: "Tagihan listrik jatuh tempo dalam 3 hari.",
    read: true,
    createdAt: "2026-08-16T10:00:00Z",
    icon: "credit-card",
  },
  {
    id: "notif-5",
    category: "promotion",
    title: "Penawaran spesial",
    message: "Diskon 20% untuk Smart Plug SATU ATAP Partner.",
    read: true,
    createdAt: "2026-08-15T14:00:00Z",
    icon: "gift",
  },
];

export const MOCK_ADS: Advertisement[] = [
  {
    campaignId: "camp-hero-1",
    placement: "HOME_HERO",
    variant: "hero",
    title: "Buat Rumahmu Lebih Pintar",
    description: "Temukan perangkat yang membantu hemat energi.",
    mobileImage: "/ads/smart-home.jpg",
    desktopImage: "/ads/smart-home.jpg",
    ctaLabel: "Jelajahi Sekarang",
    ctaUrl: "/services",
    sponsored: true,
    priority: 1,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
  },
  {
    campaignId: "camp-mid-1",
    placement: "HOME_MIDDLE",
    variant: "sponsored_card",
    title: "Smart Plug SATU ATAP",
    description: "Pantau peralatan rumah tangga dari jarak jauh.",
    mobileImage: "/ads/smart-plug.jpg",
    ctaLabel: "Pelajari Lebih Lanjut",
    ctaUrl: "/services",
    sponsored: true,
    priority: 2,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
  },
  {
    campaignId: "camp-rec-1",
    placement: "HOME_RECOMMENDATION",
    variant: "recommendation",
    title: "Rekomendasi Hemat Energi",
    description: "Ganti lampu lama dengan LED pintar dan hemat hingga 40%.",
    ctaLabel: "Lihat Produk",
    ctaUrl: "/services",
    sponsored: true,
    priority: 3,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
  },
  {
    campaignId: "camp-pay-1",
    placement: "HOME_PAYMENT",
    variant: "payment_promotion",
    title: "Bayar Tagihan Lebih Mudah",
    description: "Bayar listrik, air, dan internet langsung dari SATU ATAP.",
    ctaLabel: "Bayar Sekarang",
    ctaUrl: "/payments",
    sponsored: false,
    priority: 4,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
  },
];

export const MOCK_BILLS = [
  {
    id: "bill-1",
    homeId: "home-1",
    type: "electricity" as const,
    provider: "PLN",
    amount: 245000,
    dueDate: "2026-08-20",
    status: "unpaid" as const,
    period: "Juli 2026",
  },
  {
    id: "bill-2",
    homeId: "home-1",
    type: "water" as const,
    provider: "PAM Jaya",
    amount: 120000,
    dueDate: "2026-08-25",
    status: "unpaid" as const,
    period: "Juli 2026",
  },
  {
    id: "bill-3",
    homeId: "home-1",
    type: "internet" as const,
    provider: "IndiHome",
    amount: 450000,
    dueDate: "2026-08-18",
    status: "unpaid" as const,
    period: "Agustus 2026",
  },
];

export const MOCK_HOUSEHOLD: HouseholdMember[] = [
  {
    id: "hh-1",
    homeId: "home-1",
    name: "Kevin Santoso",
    email: "kevin.santoso@gmail.com",
    role: "owner",
  },
  {
    id: "hh-2",
    homeId: "home-1",
    name: "Nana",
    email: "nana@gmail.com",
    role: "member",
  },
  {
    id: "hh-3",
    homeId: "home-1",
    name: "Ayah",
    email: "ayah@gmail.com",
    role: "member",
  },
  {
    id: "hh-4",
    homeId: "home-1",
    name: "Bu Siti",
    email: "siti@gmail.com",
    role: "limited",
  },
];

export const ENERGY_HISTORY = [
  { label: "Sen", value: 5.1 },
  { label: "Sel", value: 4.6 },
  { label: "Rab", value: 5.8 },
  { label: "Kam", value: 4.9 },
  { label: "Jum", value: 6.2 },
  { label: "Sab", value: 5.4 },
  { label: "Min", value: 4.82 },
];

export const WATER_HISTORY = [
  { label: "Sen", value: 175 },
  { label: "Sel", value: 168 },
  { label: "Rab", value: 190 },
  { label: "Kam", value: 172 },
  { label: "Jum", value: 205 },
  { label: "Sab", value: 188 },
  { label: "Min", value: 182 },
];

export const ENERGY_BREAKDOWN = [
  { name: "AC & Pendingin", percent: 42, sub: "2,02 kWh" },
  { name: "Smart Plug TV", percent: 24, sub: "1,16 kWh" },
  { name: "Pencahayaan", percent: 18, sub: "0,87 kWh" },
  { name: "Lainnya", percent: 16, sub: "0,77 kWh" },
];

export const WATER_BREAKDOWN = [
  { name: "Kamar Mandi", percent: 46, sub: "84 L" },
  { name: "Dapur", percent: 28, sub: "51 L" },
  { name: "Cuci & Taman", percent: 26, sub: "47 L" },
];

export const SCENES: Scene[] = [
  {
    id: "scene-home",
    name: "Mode Pulang",
    description: "Nyalakan lampu & perangkat utama",
    icon: "house",
    gradient: "from-primary to-warning",
    actions: [
      { deviceId: "dev-1", turnOn: true },
      { deviceId: "dev-4", turnOn: true },
      { deviceId: "dev-5", turnOn: true },
    ],
  },
  {
    id: "scene-sleep",
    name: "Mode Tidur",
    description: "Matikan semua lampu & hiburan",
    icon: "moon",
    gradient: "from-secondary to-info",
    actions: [
      { deviceId: "dev-1", turnOn: false },
      { deviceId: "dev-4", turnOn: false },
      { deviceId: "dev-5", turnOn: false },
    ],
  },
  {
    id: "scene-eco",
    name: "Hemat Energi",
    description: "Matikan perangkat boros daya",
    icon: "leaf",
    gradient: "from-success to-secondary",
    actions: [
      { deviceId: "dev-4", turnOn: false },
      { deviceId: "dev-1", turnOn: false },
    ],
  },
  {
    id: "scene-movie",
    name: "Mode Film",
    description: "TV menyala, lampu meredup",
    icon: "clapperboard",
    gradient: "from-warning to-error",
    actions: [
      { deviceId: "dev-4", turnOn: true },
      { deviceId: "dev-1", turnOn: false },
    ],
  },
];

export const QUICK_ACTIONS: QuickAction[] = [
  { id: "qa-1", label: "Lampu", icon: "lightbulb", href: "/devices?filter=lights", status: "6 ON" },
  { id: "qa-2", label: "Energi", icon: "zap", href: "/energy" },
  { id: "qa-3", label: "Air", icon: "droplets", href: "/water" },
  { id: "qa-4", label: "Otomatisasi", icon: "bot", href: "/ai" },
  { id: "qa-5", label: "Keamanan", icon: "shield", href: "/devices?filter=sensors" },
  { id: "qa-6", label: "Ruangan", icon: "home", href: "/rooms" },
];

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: "svc-1",
    label: "Listrik",
    description: "Bayar tagihan PLN",
    icon: "zap",
    href: "/payments?type=electricity",
    color: "bg-warning/10 text-warning",
  },
  {
    id: "svc-2",
    label: "Air",
    description: "Bayar tagihan air",
    icon: "droplets",
    href: "/payments?type=water",
    color: "bg-info/10 text-info",
  },
  {
    id: "svc-3",
    label: "Internet",
    description: "Bayar tagihan internet",
    icon: "wifi",
    href: "/payments?type=internet",
    color: "bg-secondary/10 text-secondary",
  },
  {
    id: "svc-4",
    label: "Tagihan",
    description: "Semua tagihan rumah",
    icon: "receipt",
    href: "/payments",
    color: "bg-primary/10 text-primary",
  },
  {
    id: "svc-5",
    label: "Pulsa & Token",
    description: "Pulsa, paket data, token listrik",
    icon: "smartphone",
    href: "/payments",
    color: "bg-success/10 text-success",
  },
  {
    id: "svc-6",
    label: "Warung Rumah",
    description: "Galon, sembako, makanan",
    icon: "shopping-cart",
    href: "/store",
    color: "bg-accent/20 text-foreground",
  },
  {
    id: "svc-7",
    label: "Marketplace",
    description: "Belanja perangkat pintar",
    icon: "shopping-bag",
    href: "/marketplace",
    color: "bg-primary/10 text-primary",
  },
  {
    id: "svc-8",
    label: "Gedung",
    description: "IPL, pengumuman, tamu",
    icon: "building",
    href: "/building",
    color: "bg-info/10 text-info",
  },
  {
    id: "svc-9",
    label: "Otomatisasi",
    description: "Aturan JIKA → MAKA",
    icon: "bot",
    href: "/automations",
    color: "bg-secondary/10 text-secondary",
  },
  {
    id: "svc-10",
    label: "Pesanan",
    description: "Lacak pesananmu",
    icon: "package",
    href: "/orders",
    color: "bg-warning/10 text-warning",
  },
  {
    id: "svc-11",
    label: "Poin & Reward",
    description: "Tukar poin jadi diskon",
    icon: "gift",
    href: "/rewards",
    color: "bg-accent/20 text-foreground",
  },
  {
    id: "svc-12",
    label: "Langganan",
    description: "Galon & token otomatis",
    icon: "repeat",
    href: "/subscriptions",
    color: "bg-success/10 text-success",
  },
  {
    id: "svc-13",
    label: "Laporan",
    description: "Ringkasan bulanan",
    icon: "bar-chart",
    href: "/report",
    color: "bg-primary/10 text-primary",
  },
];

export const DEVICE_CATEGORIES: DeviceCategory[] = [
  { id: "light", label: "Lampu", description: "Lampu pintar & LED", icon: "lightbulb" },
  { id: "switch", label: "Smart Switch", description: "Saklar pintar", icon: "toggle-left" },
  { id: "temperature_sensor", label: "Sensor Suhu", description: "Pantau suhu ruangan", icon: "thermometer" },
  { id: "humidity_sensor", label: "Sensor Kelembapan", description: "Pantau kelembapan", icon: "droplets" },
  { id: "motion_sensor", label: "Sensor Gerak", description: "Deteksi gerakan", icon: "activity" },
  { id: "electricity_meter", label: "Meter Listrik", description: "Pantau konsumsi listrik", icon: "zap" },
  { id: "water_meter", label: "Meter Air", description: "Pantau konsumsi air", icon: "droplets" },
  { id: "smart_plug", label: "Smart Plug", description: "Stop kontak pintar", icon: "plug" },
  { id: "camera", label: "Kamera", description: "Kamera keamanan", icon: "camera" },
  { id: "other", label: "Lainnya", description: "Perangkat kustom", icon: "plus" },
];

export const DEVICE_FILTERS = [
  { id: "all", label: "Semua" },
  { id: "online", label: "Online" },
  { id: "offline", label: "Offline" },
  { id: "sensors", label: "Sensor" },
  { id: "lights", label: "Lampu" },
  { id: "energy", label: "Energi" },
  { id: "water", label: "Air" },
  { id: "other", label: "Lainnya" },
];

export const MOCK_AI_INSIGHTS: AIInsight[] = [
  MOCK_DASHBOARD.aiInsight,
  {
    id: "ai-2",
    homeId: "home-1",
    category: "water",
    severity: "attention",
    title: "Konsumsi Air Naik 💧",
    message:
      "Pemakaian air meningkat 12% minggu ini. Pola menunjukkan aliran kecil yang konstan di malam hari — indikasi kemungkinan kebocoran pada keran kamar mandi.",
    impactValue: "+12% minggu ini",
    steps: [
      "Periksa keran & flush kamar mandi utama",
      "Pasang sensor kebocoran di area cuci",
    ],
    potentialSaving: 45000,
    confidence: 78,
    ctaLabel: "Lihat Detail Air",
    ctaUrl: "/devices?filter=water",
    createdAt: "2026-08-16T08:00:00Z",
  },
  {
    id: "ai-3",
    homeId: "home-1",
    category: "automation",
    severity: "opportunity",
    title: "Otomatisasi Lampu Sore 🌇",
    message:
      "Kamu rutin menyalakan lampu ruang tamu & teras sekitar pukul 17.45. SATU ATAP bisa melakukannya otomatis saat matahari terbenam, lalu mematikannya saat semua penghuni tidur.",
    impactValue: "Hemat ±0,6 kWh/hari",
    steps: [
      "Nyalakan lampu teras & ruang tamu saat sunset (17.45)",
      "Matikan otomatis pukul 23.30",
    ],
    potentialSaving: 32000,
    confidence: 88,
    ctaLabel: "Buat Otomatisasi",
    ctaUrl: "/devices?filter=lights",
    createdAt: "2026-08-15T08:00:00Z",
  },
  {
    id: "ai-4",
    homeId: "home-1",
    category: "security",
    severity: "attention",
    title: "Sensor Garasi Offline 🛡️",
    message:
      "Sensor gerak garasi tidak merespons sejak pukul 09.00. Area ini menjadi titik buta keamanan sampai perangkat kembali online.",
    impactValue: "1 titik buta",
    steps: [
      "Cek baterai / daya Sensor Garasi",
      "Hubungkan ulang ke Wi-Fi rumah",
    ],
    confidence: 95,
    ctaLabel: "Cek Perangkat",
    ctaUrl: "/rooms/room-5",
    createdAt: "2026-08-17T09:10:00Z",
  },
  {
    id: "ai-5",
    homeId: "home-1",
    category: "cost",
    severity: "info",
    title: "Estimasi Tagihan Bulan Ini 🧾",
    message:
      "Berdasarkan tren pemakaian, tagihan listrik bulan ini diperkirakan Rp 312.000 — sedikit di atas bulan lalu. Bayar sebelum 20 Agustus untuk menghindari denda keterlambatan.",
    impactValue: "±Rp 312.000",
    steps: [
      "Sisihkan dana sebelum jatuh tempo (20 Agu)",
      "Aktifkan pengingat pembayaran otomatis",
    ],
    confidence: 84,
    ctaLabel: "Lihat Tagihan",
    ctaUrl: "/payments",
    createdAt: "2026-08-14T08:00:00Z",
  },
  MOCK_DASHBOARD_HOME2.aiInsight,
  {
    id: "ai-v2",
    homeId: "home-2",
    category: "security",
    severity: "attention",
    title: "Sensor Kamar Utama Offline 🛡️",
    message:
      "Sensor gerak kamar utama villa tidak merespons. Periksa perangkat saat kamu berkunjung ke Villa Puncak.",
    impactValue: "1 perangkat offline",
    steps: ["Cek daya / baterai sensor kamar utama"],
    confidence: 90,
    ctaLabel: "Cek Perangkat",
    ctaUrl: "/rooms/room-v2",
    createdAt: "2026-08-16T09:00:00Z",
  },
];

export const DEMO_CREDENTIALS = {
  email: "kevin.santoso@gmail.com",
  password: "password123",
};

// ─── Payments, Top-ups & Commerce ────────────────────────────────

export const MOCK_ELECTRICITY_TOKEN: ElectricityToken = {
  meterNumber: "14 2103 4567 8",
  remainingKwh: 1.4,
  lowThreshold: 5,
  lastTopUp: "2026-08-10",
};

export const BILLERS: Biller[] = [
  {
    id: "token-listrik",
    label: "Token Listrik",
    description: "PLN Prabayar",
    icon: "zap",
    color: "bg-warning/10 text-warning",
    idLabel: "Nomor Meter / ID Pelanggan",
    idPlaceholder: "14 digit nomor meter",
    defaultId: "14 2103 4567 8",
    nominals: [
      { amount: 20000, value: "13,1 kWh" },
      { amount: 50000, value: "32,8 kWh" },
      { amount: 100000, value: "65,6 kWh" },
      { amount: 200000, value: "131,2 kWh" },
      { amount: 500000, value: "328,1 kWh" },
      { amount: 1000000, value: "656,2 kWh" },
    ],
    adminFee: 2500,
  },
  {
    id: "pulsa",
    label: "Pulsa",
    description: "Semua operator",
    icon: "smartphone",
    color: "bg-info/10 text-info",
    idLabel: "Nomor HP",
    idPlaceholder: "08xxxxxxxxxx",
    defaultId: "0812 3456 7890",
    nominals: [
      { amount: 10000 },
      { amount: 25000 },
      { amount: 50000 },
      { amount: 100000 },
      { amount: 150000 },
      { amount: 300000 },
    ],
    adminFee: 1000,
  },
  {
    id: "paket-data",
    label: "Paket Data",
    description: "Kuota internet",
    icon: "wifi",
    color: "bg-secondary/10 text-secondary",
    idLabel: "Nomor HP",
    idPlaceholder: "08xxxxxxxxxx",
    defaultId: "0812 3456 7890",
    nominals: [
      { amount: 15000, value: "3 GB / 7 hari" },
      { amount: 35000, value: "8 GB / 30 hari" },
      { amount: 60000, value: "18 GB / 30 hari" },
      { amount: 100000, value: "40 GB / 30 hari" },
    ],
    adminFee: 1000,
  },
  {
    id: "pdam",
    label: "Tagihan PDAM",
    description: "Air PAM",
    icon: "droplets",
    color: "bg-info/10 text-info",
    idLabel: "Nomor Pelanggan PDAM",
    idPlaceholder: "ID pelanggan",
    defaultId: "10 2233 4455",
    nominals: [{ amount: 120000, value: "Juli 2026" }],
    adminFee: 2500,
  },
  {
    id: "bpjs",
    label: "BPJS Kesehatan",
    description: "Iuran bulanan",
    icon: "heart-pulse",
    color: "bg-error/10 text-error",
    idLabel: "Nomor Kartu BPJS",
    idPlaceholder: "13 digit nomor kartu",
    defaultId: "0001 2345 6789 0",
    nominals: [{ amount: 150000, value: "Kelas 2 · 3 org" }],
    adminFee: 2500,
  },
  {
    id: "internet",
    label: "Internet & TV",
    description: "IndiHome, First Media",
    icon: "router",
    color: "bg-primary/10 text-primary",
    idLabel: "Nomor Pelanggan",
    idPlaceholder: "ID pelanggan",
    defaultId: "1122 3344 5566",
    nominals: [{ amount: 450000, value: "Agustus 2026" }],
    adminFee: 2500,
  },
  {
    id: "ipl",
    label: "Iuran Gedung",
    description: "IPL apartemen & parkir",
    icon: "building",
    color: "bg-primary/10 text-primary",
    idLabel: "Nomor Unit",
    idPlaceholder: "Tower / Lantai / No.",
    defaultId: "A / 12 / 08",
    nominals: [{ amount: 385000, value: "IPL Agustus 2026" }],
    adminFee: 0,
  },
];

export const MARKETPLACE_CATEGORIES = [
  { id: "all", label: "Semua" },
  { id: "lighting", label: "Lampu" },
  { id: "security", label: "Keamanan" },
  { id: "sensor", label: "Sensor" },
  { id: "power", label: "Listrik" },
  { id: "hub", label: "Hub" },
];

export const MARKETPLACE_PRODUCTS: Product[] = [
  { id: "mp-1", name: "Smart Plug SATU ATAP", price: 149000, category: "power", emoji: "🔌", description: "Stop kontak pintar dengan monitoring daya real-time.", kind: "device", rating: 4.8, sold: 1240 },
  { id: "mp-2", name: "Lampu LED Pintar RGB", price: 89000, category: "lighting", emoji: "💡", description: "16 juta warna, atur dari aplikasi & jadwal otomatis.", kind: "device", rating: 4.7, sold: 3110 },
  { id: "mp-3", name: "Kamera Keamanan 2K", price: 329000, category: "security", emoji: "📷", description: "Deteksi gerak, night vision, notifikasi ke HP.", kind: "device", rating: 4.9, sold: 870 },
  { id: "mp-4", name: "Sensor Pintu & Jendela", price: 79000, category: "sensor", emoji: "🚪", description: "Tahu kapan pintu terbuka, cocok untuk keamanan.", kind: "device", rating: 4.6, sold: 540 },
  { id: "mp-5", name: "Sensor Gerak PIR", price: 95000, category: "sensor", emoji: "🌡️", description: "Otomatiskan lampu saat ada gerakan.", kind: "device", rating: 4.5, sold: 620 },
  { id: "mp-6", name: "Smart Hub Zigbee", price: 279000, category: "hub", emoji: "🧠", description: "Pusat kendali semua perangkat Zigbee & Matter.", kind: "device", rating: 4.8, sold: 410 },
  { id: "mp-7", name: "Bohlam LED Putih 9W", price: 45000, category: "lighting", emoji: "🔆", description: "Hemat energi, umur panjang, bisa dijadwal.", kind: "device", rating: 4.4, sold: 2200 },
  { id: "mp-8", name: "Smart Door Lock", price: 899000, category: "security", emoji: "🔐", description: "Buka pintu pakai PIN, sidik jari, atau aplikasi.", kind: "device", rating: 4.9, sold: 260 },
  { id: "mp-9", name: "Meteran Listrik Pintar", price: 189000, category: "power", emoji: "⚡", description: "Pantau konsumsi listrik rumah per perangkat.", kind: "device", rating: 4.7, sold: 480 },
];

export const STORE_CATEGORIES = [
  { id: "all", label: "Semua" },
  { id: "air", label: "Galon & Air" },
  { id: "sembako", label: "Sembako" },
  { id: "makanan", label: "Makanan" },
  { id: "kebersihan", label: "Kebersihan" },
  { id: "kesehatan", label: "Kesehatan" },
];

export const STORE_PRODUCTS: Product[] = [
  { id: "st-1", name: "Galon Air Mineral 19L", price: 20000, category: "air", emoji: "💧", description: "Isi ulang galon Le Minerale / Aqua.", kind: "goods", unit: "per galon", vendor: "Kios Pak Budi · Lantai 1", eta: "±15 menit" },
  { id: "st-2", name: "Air Mineral 600ml (isi 24)", price: 48000, category: "air", emoji: "🚰", description: "Satu dus isi 24 botol.", kind: "goods", unit: "per dus", vendor: "Kios Pak Budi · Lantai 1", eta: "±15 menit" },
  { id: "st-3", name: "Beras Pandan Wangi 5kg", price: 72000, category: "sembako", emoji: "🍚", description: "Beras premium pulen.", kind: "goods", unit: "per karung", vendor: "Warung Bu Sari · Lantai 1", eta: "±20 menit" },
  { id: "st-4", name: "Minyak Goreng 2L", price: 38000, category: "sembako", emoji: "🛢️", description: "Minyak goreng kemasan.", kind: "goods", unit: "per pouch", vendor: "Warung Bu Sari · Lantai 1", eta: "±20 menit" },
  { id: "st-5", name: "Telur Ayam 1kg", price: 29000, category: "sembako", emoji: "🥚", description: "Telur segar isi ±16 butir.", kind: "goods", unit: "per kg", vendor: "Warung Bu Sari · Lantai 1", eta: "±20 menit" },
  { id: "st-6", name: "Nasi Goreng Spesial", price: 22000, category: "makanan", emoji: "🍛", description: "Nasi goreng + telur + kerupuk.", kind: "goods", unit: "per porsi", vendor: "Kantin Mas Anton · Lantai GF", eta: "±25 menit" },
  { id: "st-7", name: "Ayam Geprek + Nasi", price: 25000, category: "makanan", emoji: "🍗", description: "Ayam geprek sambal level 1-5.", kind: "goods", unit: "per porsi", vendor: "Kantin Mas Anton · Lantai GF", eta: "±25 menit" },
  { id: "st-8", name: "Sabun Mandi Cair 450ml", price: 24000, category: "kebersihan", emoji: "🧴", description: "Sabun cair refill wangi.", kind: "goods", unit: "per botol", vendor: "Kios Pak Budi · Lantai 1", eta: "±15 menit" },
  { id: "st-9", name: "Pasta Gigi + Sikat", price: 18000, category: "kesehatan", emoji: "🪥", description: "Odol 190g + sikat gigi.", kind: "goods", unit: "per paket", vendor: "Kios Pak Budi · Lantai 1", eta: "±15 menit" },
  { id: "st-10", name: "Pembalut Wanita (isi 20)", price: 21000, category: "kesehatan", emoji: "🩷", description: "Pembalut daya serap tinggi.", kind: "goods", unit: "per pak", vendor: "Kios Pak Budi · Lantai 1", eta: "±15 menit" },
  { id: "st-11", name: "Tisu Gulung (isi 12)", price: 42000, category: "kebersihan", emoji: "🧻", description: "Tisu toilet lembut isi 12 roll.", kind: "goods", unit: "per pak", vendor: "Warung Bu Sari · Lantai 1", eta: "±20 menit" },
  { id: "st-12", name: "Kopi Sachet (isi 10)", price: 15000, category: "makanan", emoji: "☕", description: "Kopi susu instan.", kind: "goods", unit: "per renceng", vendor: "Warung Bu Sari · Lantai 1", eta: "±20 menit" },
];

export const STORE_DELIVERY_FEE = 6000;

// ─── Automations & Schedules ─────────────────────────────────────

export const MOCK_AUTOMATIONS: AutomationRule[] = [
  {
    id: "auto-1",
    name: "Lampu teras saat malam",
    enabled: true,
    icon: "sunset",
    triggerType: "sunset",
    triggerLabel: "Saat matahari terbenam (±17.45)",
    actionLabels: ["Nyalakan Lampu Teras", "Nyalakan Lampu Ruang Tamu"],
  },
  {
    id: "auto-2",
    name: "Keamanan garasi malam",
    enabled: true,
    icon: "shield",
    triggerType: "motion",
    triggerLabel: "Gerakan terdeteksi di Garasi setelah 22.00",
    actionLabels: ["Nyalakan Lampu Garasi", "Kirim notifikasi ke HP"],
  },
  {
    id: "auto-3",
    name: "Hemat AC saat tidur",
    enabled: false,
    icon: "moon",
    triggerType: "time",
    triggerLabel: "Setiap hari pukul 23.00",
    actionLabels: ["Matikan Smart Plug TV", "Redupkan lampu"],
  },
];

export const AUTOMATION_TRIGGERS: {
  id: string;
  label: string;
  icon: string;
}[] = [
  { id: "motion", label: "Ada gerakan terdeteksi", icon: "activity" },
  { id: "time", label: "Pada jam tertentu", icon: "clock" },
  { id: "sunset", label: "Saat matahari terbenam", icon: "sunset" },
  { id: "device_on", label: "Perangkat dinyalakan", icon: "power" },
  { id: "temperature", label: "Suhu di atas ambang", icon: "thermometer" },
];

export const AUTOMATION_ACTIONS: { id: string; label: string }[] = [
  { id: "lights_on", label: "Nyalakan lampu" },
  { id: "lights_off", label: "Matikan lampu" },
  { id: "ac_off", label: "Matikan AC / Smart Plug" },
  { id: "notify", label: "Kirim notifikasi ke HP" },
  { id: "scene_home", label: "Jalankan Mode Pulang" },
];

// ─── Building super-app ──────────────────────────────────────────

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ann-1",
    title: "Pemeliharaan lift Tower A",
    body: "Lift nomor 2 Tower A akan diperbaiki Sabtu 23 Agustus, 09.00–15.00. Mohon gunakan lift lain.",
    category: "maintenance",
    date: "2026-08-20",
    pinned: true,
  },
  {
    id: "ann-2",
    title: "Kerja bakti & bazar warga",
    body: "Minggu 24 Agustus pukul 07.00 di lobby GF. Ada bazar UMKM & kios binaan gedung.",
    category: "event",
    date: "2026-08-19",
  },
  {
    id: "ann-3",
    title: "Pembacaan meter air",
    body: "Petugas akan membaca meter air unit 20–25 Agustus. Pastikan akses tersedia.",
    category: "info",
    date: "2026-08-18",
  },
  {
    id: "ann-4",
    title: "Peningkatan keamanan lobby",
    body: "Mulai pekan ini seluruh tamu wajib membawa QR Visitor Pass dari aplikasi.",
    category: "security",
    date: "2026-08-17",
  },
];

export const MOCK_REPORTS: MaintenanceReport[] = [
  {
    id: "rep-1",
    category: "Pencahayaan",
    description: "Lampu koridor lantai 12 mati sejak semalam.",
    location: "Koridor Lantai 12",
    status: "in_progress",
    createdAt: "2026-08-19T20:00:00Z",
  },
  {
    id: "rep-2",
    category: "Kebersihan",
    description: "Tempat sampah lantai GF penuh.",
    location: "Lobby GF",
    status: "resolved",
    createdAt: "2026-08-17T10:00:00Z",
  },
];

export const REPORT_CATEGORIES = [
  "Pencahayaan",
  "Lift",
  "Kebersihan",
  "Air & Plumbing",
  "Keamanan",
  "Lainnya",
];

// ─── Orders (live tracking) ──────────────────────────────────────

export const MOCK_ORDERS: Order[] = [
  {
    id: "ord-1001",
    title: "Galon Air Mineral 19L ×2",
    kind: "service",
    items: [
      {
        id: "st-1",
        name: "Galon Air Mineral 19L",
        price: 20000,
        qty: 2,
        emoji: "💧",
      },
    ],
    total: 46000,
    status: "delivering",
    createdAt: "2026-08-21T09:30:00Z",
    eta: "±5 menit lagi",
    vendor: "Kios Pak Budi · Lantai 1",
  },
  {
    id: "ord-1000",
    title: "Smart Plug SATU ATAP",
    kind: "marketplace",
    items: [
      {
        id: "mp-1",
        name: "Smart Plug SATU ATAP",
        price: 149000,
        qty: 1,
        emoji: "🔌",
      },
    ],
    total: 155000,
    status: "completed",
    createdAt: "2026-08-18T14:00:00Z",
  },
];

// ─── Rewards, subscriptions & promos ─────────────────────────────

export const INITIAL_POINTS = 1250;
export const REFERRAL_CODE = "KEVIN-SATUATAP";

export const VOUCHERS: Voucher[] = [
  {
    id: "vou-1",
    title: "Diskon Rp 10.000",
    description: "Untuk pembayaran tagihan apa pun",
    cost: 500,
    icon: "ticket",
  },
  {
    id: "vou-2",
    title: "Gratis Ongkir Warung",
    description: "Bebas ongkir 1x pemesanan",
    cost: 300,
    icon: "bike",
  },
  {
    id: "vou-3",
    title: "Diskon Rp 25.000",
    description: "Belanja perangkat di Marketplace",
    cost: 1000,
    icon: "ticket",
  },
  {
    id: "vou-4",
    title: "Token Listrik Rp 20.000",
    description: "Tukar poin jadi token listrik",
    cost: 1500,
    icon: "zap",
  },
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "sub-galon",
    title: "Galon Otomatis",
    description: "2 galon diantar tiap minggu",
    price: 40000,
    cadence: "per minggu",
    icon: "droplets",
    active: false,
  },
  {
    id: "sub-token",
    title: "Auto Isi Token",
    description: "Isi Rp 100.000 saat token < 5 kWh",
    price: 100000,
    cadence: "otomatis",
    icon: "zap",
    active: true,
  },
  {
    id: "sub-premium",
    title: "SATU ATAP Premium",
    description: "Insight AI lanjutan, tanpa iklan, prioritas layanan",
    price: 29000,
    cadence: "per bulan",
    icon: "crown",
    active: false,
  },
];

export const PROMOS: Promo[] = [
  { code: "HEMAT10", label: "Diskon 10%", type: "percent", value: 10, maxDiscount: 20000 },
  { code: "ONGKIRGRATIS", label: "Potongan Rp 6.000", type: "flat", value: 6000 },
  { code: "SATUATAP", label: "Diskon Rp 15.000", type: "flat", value: 15000 },
];

// ─── Monthly report ──────────────────────────────────────────────

export const ENERGY_BUDGET_KWH = 160;

export const MOCK_MONTHLY_REPORT: MonthlyReport = {
  month: "Juli 2026",
  energyKwh: 142.6,
  energyCost: 214000,
  waterLiters: 5400,
  waterCost: 101000,
  totalSpend: 315000,
  savings: 62000,
  co2Kg: 38.5,
};

export const SPEND_HISTORY = [
  { label: "Mar", value: 360 },
  { label: "Apr", value: 342 },
  { label: "Mei", value: 388 },
  { label: "Jun", value: 351 },
  { label: "Jul", value: 315 },
];
