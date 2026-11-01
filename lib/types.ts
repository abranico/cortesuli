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
  durationMin: number;
  price: number;
};

export type Product = {
  id: string;
  salonId: string;
  name: string;
  description: string;
  price: number;
  tags: string[];
};

export type Slot = {
  stylistId: string;
  start: string;
  end: string;
};

export type CutImages = {
  front?: string;
  left?: string;
  right?: string;
  back?: string;
};

export type AppointmentStatus = "confirmado" | "cancelado";

export type Appointment = {
  id: string;
  salonId: string;
  stylistId: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  start: string;
  end: string;
  status: AppointmentStatus;
  cutName: string;
  cutDescription: string;
  images: CutImages;
  recommendedProductIds: string[];
  notes: string;
  createdAt: string;
};

export type NewAppointment = Omit<Appointment, "id" | "status" | "createdAt" | "end">;

export type WaitlistStatus = "esperando" | "notificado";

export type WaitlistEntry = {
  id: string;
  salonId: string;
  customerName: string;
  customerPhone: string;
  serviceId: string | null;
  status: WaitlistStatus;
  createdAt: string;
};

export type NewWaitlistEntry = Pick<WaitlistEntry, "salonId" | "customerName" | "customerPhone" | "serviceId">;

export type SalonCatalog = {
  stylists: Stylist[];
  services: Service[];
  products: Product[];
};
