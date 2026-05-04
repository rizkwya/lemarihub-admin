-- LemariHub: Promote first admin by email
-- Set role='admin' for the user profile that matches the auth user's email.
--
-- Run this in Supabase SQL Editor.
-- Replace email value if needed.

DO $$
DECLARE
  v_email text := 'gustijr05@gmail.com';
  v_user_id uuid;
  v_profile_table text;
  v_role_column text;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found in auth.users. Please sign up/login once first.', v_email;
  END IF;

  -- Detect profile table name (because some projects don't use public.profiles)
  SELECT c.relname
  INTO v_profile_table
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind in ('r','p')
    AND n.nspname = 'public'
    AND c.relname IN ('profiles', 'user_profiles', 'users', 'accounts')
  ORDER BY CASE c.relname
    WHEN 'profiles' THEN 1
    WHEN 'user_profiles' THEN 2
    WHEN 'users' THEN 3
    WHEN 'accounts' THEN 4
    ELSE 100
  END
  LIMIT 1;

  IF v_profile_table IS NULL THEN
    RAISE EXCEPTION 'Cannot find a profile table in public schema. Run admin-panel/scripts/supabase_find_profile_table.sql first to discover your table name.';
  END IF;

  -- Detect role column name
  SELECT column_name
  INTO v_role_column
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = v_profile_table
    AND column_name IN ('role', 'user_role')
  ORDER BY CASE column_name WHEN 'role' THEN 1 ELSE 2 END
  LIMIT 1;

  IF v_role_column IS NULL THEN
    RAISE EXCEPTION 'Table public.% exists but no role column found (expected role or user_role). Please update this script to match your schema.', v_profile_table;
  END IF;

  -- Try update first (works when profile row already exists)
  EXECUTE format('UPDATE public.%I SET %I = %L, updated_at = now() WHERE id = $1', v_profile_table, v_role_column, 'admin')
  USING v_user_id;

  IF NOT FOUND THEN
    -- Insert row if missing. This assumes at minimum columns: id, updated_at, created_at.
    -- If your table also requires email, this will include it when the column exists.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=v_profile_table AND column_name='email'
    ) THEN
      EXECUTE format(
        'INSERT INTO public.%I (id, email, %I, created_at, updated_at) VALUES ($1, $2, %L, now(), now())',
        v_profile_table,
        v_role_column,
        'admin'
      ) USING v_user_id, v_email;
    ELSE
      EXECUTE format(
        'INSERT INTO public.%I (id, %I, created_at, updated_at) VALUES ($1, %L, now(), now())',
        v_profile_table,
        v_role_column,
        'admin'
      ) USING v_user_id;
    END IF;
  END IF;
END $$;
