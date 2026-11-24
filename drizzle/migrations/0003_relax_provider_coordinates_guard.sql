CREATE OR REPLACE FUNCTION public.guard_provider_activation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _lat double precision; _lng double precision;
BEGIN
  IF NEW.status IN ('active','approved') THEN
    IF NULLIF(TRIM(NEW.city),'') IS NULL THEN
      RAISE EXCEPTION 'PROVIDER_INCOMPLETE_CITY' USING ERRCODE = '22023';
    END IF;
    IF NULLIF(TRIM(NEW.neighborhood),'') IS NULL THEN
      RAISE EXCEPTION 'PROVIDER_INCOMPLETE_NEIGHBORHOOD' USING ERRCODE = '22023';
    END IF;
    IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
      BEGIN
        SELECT c.latitude, c.longitude INTO _lat, _lng
        FROM public.cities c
        WHERE lower(c.name) = lower(trim(NEW.city))
          AND c.latitude IS NOT NULL AND c.longitude IS NOT NULL
        LIMIT 1;
        IF _lat IS NOT NULL THEN
          NEW.latitude := _lat; NEW.longitude := _lng;
        END IF;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;