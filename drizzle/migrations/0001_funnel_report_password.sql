DROP FUNCTION IF EXISTS public.funnel_report(integer);
CREATE OR REPLACE FUNCTION public.funnel_report(_days integer DEFAULT 7, _senha text DEFAULT '')
 RETURNS TABLE(page text, event text, target text, sessions bigint, total bigint)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF coalesce(_senha,'') <> 'abobora123' THEN RAISE EXCEPTION 'senha incorreta'; END IF;
  RETURN QUERY SELECT f.page, f.event, coalesce(f.target,''), count(DISTINCT f.session_id), count(*)
  FROM public.funnel_events f
  WHERE f.created_at > now() - make_interval(days => least(greatest(_days,1),90))
  GROUP BY 1,2,3 ORDER BY 1,2,3;
END $$;
GRANT EXECUTE ON FUNCTION public.funnel_report(integer, text) TO anon, authenticated;