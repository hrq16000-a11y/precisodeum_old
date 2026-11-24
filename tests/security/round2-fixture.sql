-- Synthetic minimal schema for disposable LOCAL PostgreSQL only. Never run on a shared backend.
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('test.role',true),'')='admin' $$;
CREATE TABLE sponsors(id uuid PRIMARY KEY,image_url text,logo_url text,link_url text,external_link text,phone text,whatsapp text,short_description text,full_description text,linked_city text,linked_category text,secret text);
CREATE TABLE sponsor_change_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),sponsor_id uuid,status text DEFAULT 'pending',changes jsonb,current_snapshot jsonb,admin_comment text,reviewed_by uuid,reviewed_at timestamptz,requested_by uuid,storage_paths text[],created_at timestamptz DEFAULT now());
CREATE TABLE sponsor_contacts(sponsor_id uuid,user_id uuid);
CREATE TABLE user_roles(user_id uuid,role text);
CREATE TABLE notifications(user_id uuid,type text,title text,message text,link text);
CREATE TABLE audit_log(id uuid DEFAULT gen_random_uuid(),user_id uuid,action text,resource_type text,resource_id uuid,details jsonb,created_at timestamptz DEFAULT now());
CREATE TABLE profiles(id uuid PRIMARY KEY, full_name text,tax_id text,whatsapp text,phone text,updated_at timestamptz);
CREATE TABLE profile_change_suggestions(id uuid PRIMARY KEY,user_id uuid,field text,suggested_value text,source text,status text,resolved_at timestamptz);
CREATE TABLE audit_fixture(id uuid PRIMARY KEY,user_ref text);
CREATE INDEX ON audit_fixture(user_ref);
INSERT INTO audit_fixture VALUES('44444444-4444-4444-4444-444444444444','synthetic'),('55555555-5555-5555-5555-555555555555',NULL);
