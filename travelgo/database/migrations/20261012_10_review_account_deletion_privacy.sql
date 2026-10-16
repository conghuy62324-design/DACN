-- HuGo Intelligence M1 Task 5: remove review identity and AI rights before
-- the users.user_id foreign key is cleared during account deletion.
BEGIN;

CREATE OR REPLACE FUNCTION anonymize_reviews_before_user_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE reviews
  SET user_name = 'Người dùng đã xóa',
      user_avatar = NULL,
      ai_usage_allowed = false,
      consent_policy_version = NULL,
      updated_at = CURRENT_TIMESTAMP
  WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_anonymize_reviews_before_user_delete
BEFORE DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION anonymize_reviews_before_user_delete();

COMMIT;
