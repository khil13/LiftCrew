-- Moderation phrases now match at the start of a word, and truck-rental brand
-- names ("U-Haul", "Uhaul") are ignored, so customers describing their own
-- rental aren't flagged for "haul". Mirrors src/lib/compliance/moderation.ts.
create or replace function match_moderation_phrases(body text) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(phrase), '{}')
  from app_settings s,
       jsonb_array_elements_text(s.value) as phrase
  where s.key = 'moderation_phrases'
    and regexp_replace(coalesce(body, ''), '\mu[[:space:]-]?haul', ' ', 'gi')
        ~* ('\m' || regexp_replace(phrase, '([.*+?^${}()|\[\]\\])', '\\\1', 'g'));
$$;
