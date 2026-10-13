CREATE TABLE public.funnel_events (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  session_id text NOT NULL CHECK (char_length(session_id) <= 64),
  event text NOT NULL CHECK (event IN ('page_view','back_click','back_modal_shown','back_accept','back_decline','back_redirect','pix_generated','pix_paid')),
  page text NOT NULL CHECK (char_length(page) <= 80),
  target text CHECK (char_length(target) <= 120),
  amount integer,
  utm_source text CHECK (char_length(utm_source) <= 120),
  utm_campaign text CHECK (char_length(utm_campaign) <= 200)
);
GRANT INSERT ON public.funnel_events TO anon, authenticated;
GRANT USAGE ON SEQUENCE public.funnel_events_id_seq TO anon, authenticated;
GRANT ALL ON public.funnel_events TO service_role;
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can log funnel events" ON public.funnel_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE INDEX funnel_events_created_idx ON public.funnel_events (created_at);

CREATE OR REPLACE FUNCTION public.funnel_report(_days integer DEFAULT 7)
RETURNS TABLE(page text, event text, target text, sessions bigint, total bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT page, event, coalesce(target,''), count(DISTINCT session_id), count(*)
  FROM public.funnel_events
  WHERE created_at > now() - make_interval(days => least(greatest(_days,1),90))
  GROUP BY 1,2,3 ORDER BY 1,2,3
$$;
GRANT EXECUTE ON FUNCTION public.funnel_report(integer) TO anon, authenticated;