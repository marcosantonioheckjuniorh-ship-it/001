CREATE OR REPLACE FUNCTION public.funnel_report(_days integer DEFAULT 7, _senha text DEFAULT ''::text)
 RETURNS TABLE(page text, event text, target text, sessions bigint, total bigint)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(_senha,'') <> 'abobora123' THEN RAISE EXCEPTION 'senha incorreta'; END IF;
  RETURN QUERY
  SELECT f.page, f.event, coalesce(f.target,''), count(DISTINCT f.session_id), count(*)
  FROM public.funnel_events f
  WHERE f.created_at > now() - make_interval(days => least(greatest(_days,1),90))
  GROUP BY 1,2,3
  UNION ALL
  SELECT '__utm'::text, CASE WHEN s.tem THEN 'com' ELSE 'sem' END, ''::text, count(*), count(*)
  FROM (SELECT f.session_id, bool_or(f.utm_source IS NOT NULL) tem FROM public.funnel_events f
        WHERE f.created_at > now() - make_interval(days => least(greatest(_days,1),90)) AND f.event <> 'pc_blocked'
        GROUP BY f.session_id) s
  GROUP BY 2
  ORDER BY 1,2,3;
END $function$;