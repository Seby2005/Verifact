-- =============================================================================
-- Migration 007: Account Deletion Cascades & Integrity Verification
-- =============================================================================
-- Ensures foreign key constraints for ON DELETE CASCADE on profiles and
-- ON DELETE SET NULL on verifications and disputes are explicitly set.
-- =============================================================================

-- Ensure profiles table has ON DELETE CASCADE from auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_id_fkey' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure verifications table user_id has ON DELETE SET NULL from profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'verifications_user_id_fkey' AND table_name = 'verifications'
  ) THEN
    ALTER TABLE public.verifications
      ADD CONSTRAINT verifications_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Ensure disputes table reporter_user_id has ON DELETE SET NULL from profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'disputes_reporter_user_id_fkey' AND table_name = 'disputes'
  ) THEN
    ALTER TABLE public.disputes
      ADD CONSTRAINT disputes_reporter_user_id_fkey
      FOREIGN KEY (reporter_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;
