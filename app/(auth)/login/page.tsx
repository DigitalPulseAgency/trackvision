'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Mail, Lock } from 'lucide-react';
import { Rajdhani } from 'next/font/google';
import { createClient } from '@/lib/supabase/client';

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['600', '700'],
});

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Tentative de connexion réelle avec ton email et mot de passe
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Accès refusé : Identifiants incorrects.");
      setLoading(false);
      return;
    }

    // Si c'est bon, on entre dans le Dashboard
    router.push('/dashboard');
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#06060B] px-4 text-[#EEF0FF]">
      {/* Filigrane */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03]">
        <p className={`${rajdhani.className} select-none text-5xl font-bold tracking-[0.4em]`}>
          TRACKVISION · DPA
        </p>
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#252540] bg-[#0D0D18] px-8 py-8 shadow-[0_0_35px_rgba(124,58,237,0.35)]">
        {/* Logo + titre */}
        <div className="mb-6 flex flex-col items-center">
          <Image 
            src="/logo.png" 
            alt="Digital Pulse Agency"
            width={80}
            height={80}
            className="mb-3 brightness-0 invert" 
            priority 
          />
          <h1 className={`${rajdhani.className} text-xl font-semibold tracking-[0.28em] text-[#EEF0FF]`}>
            TRACKVISION
          </h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.22em] text-[#7C3AED]">
            Digital Pulse Agency
          </p>
        </div>
        {/* Formulaire de connexion */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-xs text-[#B8BFD0]">
              Email professionnel
            </label>
            <div className="flex h-10 items-center gap-2 rounded-md border border-[#252540] bg-[#060713] px-3 text-xs text-[#EEF0FF] focus-within:border-[#7C3AED]">
              <Mail className="h-4 w-4 text-[#6B7280]" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-full w-full bg-transparent text-xs outline-none placeholder:text-[#4B5563]"
                placeholder="prenom@agence.fr"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-xs text-[#B8BFD0]">
              Mot de passe
            </label>
            <div className="flex h-10 items-center gap-2 rounded-md border border-[#252540] bg-[#060713] px-3 text-xs text-[#EEF0FF] focus-within:border-[#7C3AED]">
              <Lock className="h-4 w-4 text-[#6B7280]" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-full w-full bg-transparent text-xs outline-none placeholder:text-[#4B5563]"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-[#FCA5A5]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-gradient-to-r from-[#6B21D4] to-[#7C3AED] px-4 py-2 text-sm font-medium text-white shadow-[0_0_25px_rgba(124,58,237,0.65)] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Connexion en cours...' : 'Connexion'}
          </button>

          <div className="mt-3 flex items-center justify-between text-[11px] text-[#9CA3AF]">
            <button
              type="button"
              className="text-[11px] text-[#A5B4FC] underline-offset-2 hover:underline"
            >
              Mot de passe oublié ?
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-[11px] text-[#4B5563]">
          © 2026 Digital Pulse Agency — Accès restreint
        </p>
      </div>
    </div>
  );
}
