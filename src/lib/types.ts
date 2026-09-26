export type UserRole = "helper" | "customer" | "company" | "admin";

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  city: string | null;
  created_at: string;
};

export type HelperProfile = {
  id: string;
  bio: string | null;
  years_experience: number;
  skills: string[];
  hourly_rate_cents: number;
  has_own_ride_to_jobs: boolean;
  service_radius_miles: number;
  home_lat: number | null;
  home_lng: number | null;
  home_state: string | null;
  is_verified: boolean;
  stripe_onboarded: boolean;
  rating_avg: number;
  rating_count: number;
  jobs_completed: number;
  agreed_labor_only_terms_at: string | null;
};

export type Company = {
  id: string;
  business_name: string;
  license_number: string | null;
  website: string | null;
  transport_credentials: string | null;
  is_approved: boolean;
};
