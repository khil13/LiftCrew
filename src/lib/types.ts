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
  strikes: number;
  suspended_at: string | null;
};

export type Company = {
  id: string;
  business_name: string;
  license_number: string | null;
  website: string | null;
  transport_credentials: string | null;
  is_approved: boolean;
};

export type JobStatus = "draft" | "open" | "filled" | "in_progress" | "completed" | "cancelled" | "disputed";

export type Job = {
  id: string;
  poster_id: string;
  title: string;
  description: string | null;
  job_type: string[];
  start_address: string;
  start_state: string;
  end_address: string | null;
  end_state: string | null;
  scheduled_start: string;
  estimated_hours: number;
  helpers_needed: number;
  pay_rate_cents: number;
  has_stairs: boolean;
  has_heavy_items: boolean;
  status: JobStatus;
  created_at: string;
  cancelled_at: string | null;
  completed_at: string | null;
};

export type ApplicationStatus = "applied" | "accepted" | "declined" | "withdrawn";

export type FeedJob = Pick<
  Job,
  | "id"
  | "title"
  | "job_type"
  | "start_address"
  | "end_address"
  | "scheduled_start"
  | "estimated_hours"
  | "helpers_needed"
  | "pay_rate_cents"
  | "has_stairs"
  | "has_heavy_items"
> & { distance_miles: number; applied: boolean };
