CREATE OR REPLACE FUNCTION increment_campaign_calls_made(p_campaign_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE voice_campaigns SET calls_made = COALESCE(calls_made, 0) + 1 WHERE id = p_campaign_id;
$$;
