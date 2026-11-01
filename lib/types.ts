export type Salon = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  address: string;
  city: string;
  phone: string;
  instagram: string;
  hours: string;
  coverImageUrl: string | null;
  /** Coordenadas WGS84 para la búsqueda "cerca mío" (opcionales). */
  lat?: number | null;
  lng?: number | null;
  /** Reglas de apertura: días (0 = domingo) y franja horaria en hora argentina. */
  openDays: number[];
  openHour: number;
  closeHour: number;
};

export type SalonSearchQuery = {
  q?: string;
  location?: string;
  near?: { lat: number; lng: number };
};

export type SalonSearchResult = Salon & { distanceKm?: number };

export type Stylist = {
  id: string;
  salonId: string;
  name: string;
  bio: string;
  specialties: string[];
  avatarUrl: string | null;
};

export type ServiceCategory = "corte" | "color" | "barba" | "combo";

export type Service = {
  id: string;
  salonId: string;
  name: string;
  category: ServiceCategory;
  price: number;
};

/** Turno fijo de 30 minutos. `available` es false si ya se llenó la capacidad (cantidad de peluqueros). */
export type Slot = {
  start: string;
  available: boolean;
};

export type CutImages = {
  front?: string;
  left?: string;
  right?: string;
};

export type AppointmentStatus = "pendiente" | "completado";

/** online = reservado por el cliente desde la página; manual = cargado por el local desde el panel. */
export type AppointmentSource = "online" | "manual";

export type Appointment = {
  id: string;
  salonId: string;
  stylistId: string | null;
  serviceId: string | null;
  customerName: string;
  customerPhone: string;
  start: string;
  status: AppointmentStatus;
  cutName: string;
  cutDescription: string;
  images: CutImages;
  notes: string;
  source: AppointmentSource;
  createdAt: string;
};

export type ManualAppointment = {
  serviceId: string | null;
  stylistId: string | null;
  customerName: string;
  customerPhone: string;
  start: string;
  notes: string;
};

export type NewAppointment = Pick<
  Appointment,
  "salonId" | "serviceId" | "customerName" | "customerPhone" | "start" | "cutName" | "cutDescription" | "images" | "notes"
>;

export type SalonCatalog = {
  stylists: Stylist[];
  services: Service[];
};
