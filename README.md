# TrackVision — Digital Pulse Agency

TrackVision est le cockpit de pilotage commercial et financier de l&apos;agence **Digital Pulse Agency (DPA)**, construit sur Next.js, Supabase et Tailwind CSS.

## Déploiement en 10 étapes

1. **Créer un compte Supabase**  
   Rendez-vous sur `https://supabase.com` et créez un compte (gratuit).

2. **Créer un nouveau projet Supabase**  
   Crée un projet, puis note **l&apos;URL du projet** et les **clés API** (anon, service role) dans l&apos;onglet `Settings > API`.

3. **Initialiser la base de données**  
   Dans Supabase, ouvre `SQL Editor`, colle le contenu de `supabase/schema.sql` puis clique sur **Run** pour créer les tables, RLS et triggers.

4. **Activer la MFA**  
   Dans `Authentication > Settings`, active l&apos;authentification multi-facteurs (MFA) pour sécuriser l&apos;accès à l&apos;espace admin.

5. **Ajouter le logo DPA**  
   Copie `dpa-logo.png` dans `public/images/` sous le nom `dpa-logo.png`.

6. **Configurer les variables d&apos;environnement**  
   Remplis le fichier `.env.local` à la racine du projet avec :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
   - `NEXTAUTH_SECRET`
   - `NEXT_PUBLIC_APP_NAME`
   - `NEXT_PUBLIC_AGENCY_NAME`

7. **Installer les dépendances et lancer le projet**  
   Dans le dossier du projet (`trackvision`), exécute :
   ```bash
   npm install
   npm run dev
   ```
   Puis ouvre `http://localhost:3000` dans ton navigateur pour tester l&apos;app.

8. **Créer un dépôt GitHub**  
   Initialise un dépôt Git dans le dossier du projet, ajoute les fichiers et pousse vers un nouveau dépôt sur GitHub.

9. **Déployer sur Vercel**  
   Va sur `https://vercel.com`, crée un nouveau projet, connecte ton dépôt GitHub `TrackVision` et lance le déploiement.

10. **Configurer les variables sur Vercel**  
    Dans `Vercel > Project Settings > Environment Variables`, reproduis toutes les variables de `.env.local`. Redeploie ensuite le projet si nécessaire.

## Sécurité

⚠️ Ne jamais partager `.env.local` ni les clés API (Supabase, Claude / Anthropic).  
Garde ces informations uniquement dans ton environnement local ou dans les variables d&apos;environnement chiffrées de Vercel.

