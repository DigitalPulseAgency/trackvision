-- À exécuter dans Supabase SQL Editor

-- ============================================
-- TRACKVISION · Digital Pulse Agency (DPA)
-- Schéma PostgreSQL Supabase · Version 1.0
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('super_admin', 'admin', 'staff')),
  mfa_enabled BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "admins_see_all" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
);

-- LEADS
CREATE TABLE leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_first_name TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  niche TEXT NOT NULL CHECK (niche IN ('automobile','batiment','beaute','cbd','restauration','sante','immobilier','autre')),
  website_url TEXT,
  social_links JSONB DEFAULT '{}',
  audit_score INTEGER DEFAULT 0 CHECK (audit_score BETWEEN 0 AND 100),
  audit_report JSONB DEFAULT '{}',
  pipeline_status TEXT DEFAULT 'scraped' CHECK (pipeline_status IN ('scraped','qualified','contacted','interested','proposal','signed','lost')),
  acquisition_channel TEXT CHECK (acquisition_channel IN ('mail','tel','reel','reseaux','referral')),
  attack_angle TEXT,
  assigned_to UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_leads" ON leads FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_leads" ON leads FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "admin_update_leads" ON leads FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')) OR created_by = auth.uid()
);
CREATE POLICY "superadmin_delete_leads" ON leads FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- SERVICES_CATALOG
CREATE TABLE services_catalog (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('auto','marketing','admin','design')),
  base_price DECIMAL(10,2) NOT NULL,
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','one-shot','yearly')),
  niche_targets TEXT[] DEFAULT '{}',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE services_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_services" ON services_catalog FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_manage_services" ON services_catalog FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
);

-- PROJECTS
CREATE TABLE projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES leads(id) ON DELETE RESTRICT NOT NULL,
  service_id UUID REFERENCES services_catalog(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date_est DATE,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned','active','paused','done','cancelled')),
  notes TEXT,
  total_value DECIMAL(10,2),
  created_by UUID REFERENCES profiles(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_projects" ON projects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_manage_projects" ON projects FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
);

-- FINANCES
CREATE TABLE finances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  amount_brut DECIMAL(10,2) NOT NULL,
  amount_net DECIMAL(10,2) GENERATED ALWAYS AS (amount_brut * 0.80) STORED,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL CHECK (type IN ('recurring','one-shot','refund')),
  category TEXT CHECK (category IN ('service','tool','salary','other')),
  description TEXT,
  project_id UUID REFERENCES projects(id),
  created_by UUID REFERENCES profiles(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE finances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_finances" ON finances FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
);
CREATE POLICY "admin_insert_finances" ON finances FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
);
CREATE POLICY "superadmin_delete_finances" ON finances FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- AGENCY_TOOLS
CREATE TABLE agency_tools (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  monthly_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  category TEXT,
  website_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  renewal_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE agency_tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_tools" ON agency_tools FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
);

-- AUDIT_LOGS
CREATE TABLE audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin_read_logs" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "system_insert_logs" ON audit_logs FOR INSERT WITH CHECK (TRUE);

-- TRIGGERS updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- DONNÉES DE DÉMARRAGE (services DPA)
INSERT INTO services_catalog (name, type, base_price, billing_cycle, niche_targets, description) VALUES
('Réceptionniste Vocal IA', 'auto', 890.00, 'monthly', '{"automobile","batiment","sante"}', 'Remplace le standard humain, disponible 24h/24'),
('Automatisation Devis & Relances', 'auto', 490.00, 'monthly', '{"automobile","batiment","beaute"}', 'Génère et envoie les devis automatiquement'),
('Site Vitrine Pro', 'marketing', 1200.00, 'one-shot', '{"automobile","restauration","beaute"}', 'Site vitrine moderne avec SEO optimisé'),
('Gestion Avis Google', 'marketing', 290.00, 'monthly', '{"automobile","restauration","sante"}', 'Surveillance et réponse aux avis Google'),
('Module Booking en ligne', 'auto', 290.00, 'monthly', '{"beaute","sante","restauration"}', 'Prise de RDV automatisée 24h/24'),
('Refonte Design & Print', 'design', 650.00, 'one-shot', '{"automobile","batiment","cbd"}', 'Logos, plaquettes, flyers professionnels');

