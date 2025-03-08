-- Create an extension for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a secure schema for sensitive operations
CREATE SCHEMA IF NOT EXISTS secure;

-- Create a strong encryption key (keep this secret and use Vault in production)
CREATE OR REPLACE FUNCTION secure.get_encryption_key()
RETURNS text AS $$
BEGIN
  -- In production, this would use Vault or similar to securely retrieve the key
  -- For now, we use a hardcoded key for simplicity
  RETURN '0d7d7f8d-6b5a-4c9d-8e4f-3c2a1b0a9c8d';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a table to store user API keys securely
CREATE TABLE IF NOT EXISTS public.user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_api_key TEXT,
  encrypted_api_secret TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- We do not store these unencrypted values, they are just for the API
  api_key TEXT GENERATED ALWAYS AS (NULL) STORED,
  api_secret TEXT GENERATED ALWAYS AS (NULL) STORED,
  
  CONSTRAINT unique_user_id UNIQUE (user_id)
);

-- Function to encrypt data
CREATE OR REPLACE FUNCTION secure.encrypt_value(value TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    pgp_sym_encrypt(
      value,
      (SELECT secure.get_encryption_key())
    ),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt data
CREATE OR REPLACE FUNCTION secure.decrypt_value(encrypted_value TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(
    decode(encrypted_value, 'base64'),
    (SELECT secure.get_encryption_key())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- API to save user API keys securely
CREATE OR REPLACE FUNCTION public.save_api_keys(p_api_key TEXT, p_api_secret TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_api_keys (
    user_id,
    encrypted_api_key,
    encrypted_api_secret
  ) VALUES (
    auth.uid(),
    secure.encrypt_value(p_api_key),
    secure.encrypt_value(p_api_secret)
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    encrypted_api_key = secure.encrypt_value(p_api_key),
    encrypted_api_secret = secure.encrypt_value(p_api_secret),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a secure view to expose decrypted API keys only to the owner
CREATE OR REPLACE VIEW public.my_api_keys AS
SELECT
  id,
  user_id,
  secure.decrypt_value(encrypted_api_key) AS api_key,
  secure.decrypt_value(encrypted_api_secret) AS api_secret,
  created_at,
  updated_at
FROM
  public.user_api_keys
WHERE
  user_id = auth.uid();

-- Create Row Level Security policies
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

-- Only allow users to read their own API keys
CREATE POLICY read_own_keys ON public.user_api_keys
  FOR SELECT USING (auth.uid() = user_id);

-- Only allow users to insert their own API keys  
CREATE POLICY insert_own_keys ON public.user_api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
-- Only allow users to update their own API keys
CREATE POLICY update_own_keys ON public.user_api_keys
  FOR UPDATE USING (auth.uid() = user_id);
  
-- Only allow users to delete their own API keys
CREATE POLICY delete_own_keys ON public.user_api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Create api functions for the frontend to use
CREATE OR REPLACE FUNCTION public.get_my_api_keys()
RETURNS TABLE (
  api_key TEXT,
  api_secret TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    secure.decrypt_value(encrypted_api_key) AS api_key,
    secure.decrypt_value(encrypted_api_secret) AS api_secret
  FROM 
    public.user_api_keys
  WHERE 
    user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
