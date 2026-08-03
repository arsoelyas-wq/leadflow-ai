CREATE TABLE IF NOT EXISTS caller_id_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone_number text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS caller_id_otps_lookup_idx ON caller_id_otps(user_id, phone_number);

CREATE OR REPLACE FUNCTION cleanup_expired_otps() RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM caller_id_otps WHERE expires_at < now();
$$;
