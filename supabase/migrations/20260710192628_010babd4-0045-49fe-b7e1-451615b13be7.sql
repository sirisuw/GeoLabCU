
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname='app_role' AND e.enumlabel='ta') THEN
    ALTER TYPE public.app_role ADD VALUE 'ta';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname='app_role' AND e.enumlabel='lab_officer') THEN
    ALTER TYPE public.app_role ADD VALUE 'lab_officer';
  END IF;
END $$;

DO $$ BEGIN CREATE TYPE public.officer_group AS ENUM ('sopit','kanchalika','wiyada','none');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.flow_type AS ENUM ('equipment','computer','classroom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname='reservation_status' AND e.enumlabel='ta_approved') THEN
    ALTER TYPE public.reservation_status ADD VALUE 'ta_approved';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname='reservation_status' AND e.enumlabel='confirmed') THEN
    ALTER TYPE public.reservation_status ADD VALUE 'confirmed';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname='reservation_status' AND e.enumlabel='expired') THEN
    ALTER TYPE public.reservation_status ADD VALUE 'expired';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname='reservation_status' AND e.enumlabel='completed') THEN
    ALTER TYPE public.reservation_status ADD VALUE 'completed';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname='reservation_status' AND e.enumlabel='no_show') THEN
    ALTER TYPE public.reservation_status ADD VALUE 'no_show';
  END IF;
END $$;
