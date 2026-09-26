import Link from "next/link";
import { redirect } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toggleFavorite } from "../jobs/[id]/actions";

type FavoriteRow = {
  helper_id: string;
  helper: {
    rating_avg: number;
    rating_count: number;
    jobs_completed: number;
    is_verified: boolean;
    profile: { full_name: string; avatar_url: string | null } | null;
  } | null;
};

export default async function FavoritesPage() {
  const session = await requireOnboarded();
  if (session.profile.role !== "company") redirect("/home");

  const supabase = createClient();
  const [{ data }, { data: openJobs }] = await Promise.all([
    supabase
      .from("favorite_helpers")
      .select(
        "helper_id, helper:helper_profiles(rating_avg, rating_count, jobs_completed, is_verified, profile:profiles(full_name, avatar_url))",
      )
      .eq("company_id", session.userId),
    supabase.from("jobs").select("id").eq("poster_id", session.userId).eq("status", "open").limit(1),
  ]);
  const favorites = (data ?? []) as unknown as FavoriteRow[];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Favorite helpers</h1>
      <p className="text-sm text-slate-600">
        Save great helpers from your shifts, then invite them from any open shift&apos;s page.
        {openJobs?.length ? "" : " Post a shift to start inviting."}
      </p>
      {favorites.length === 0 ? (
        <p className="card text-sm text-slate-600">
          No favorites yet. Open a past shift and tap &ldquo;Add to favorites&rdquo; on a crew member.
        </p>
      ) : (
        <ul className="space-y-2">
          {favorites.map((f) => (
            <li key={f.helper_id} className="card flex items-center gap-3 text-sm">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-200">
                {f.helper?.profile?.avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.helper.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold">
                  {f.helper?.profile?.full_name ?? "Helper"}{" "}
                  {f.helper?.is_verified && <span className="text-brand-600">✓</span>}
                </p>
                <p className="text-slate-600">
                  {f.helper && f.helper.rating_count > 0 ? `★ ${f.helper.rating_avg} · ` : ""}
                  {f.helper?.jobs_completed ?? 0} jobs
                </p>
              </div>
              <div className="w-24">
                <ActionForm
                  action={toggleFavorite}
                  fields={{ helper_id: f.helper_id, favorite: "remove" }}
                  label="Remove"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <Link href="/jobs" className="btn-secondary">
        Your shifts
      </Link>
    </div>
  );
}
