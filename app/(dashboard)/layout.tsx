import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { Rajdhani, Exo_2 } from 'next/font/google';
import Sidebar from '@/components/layout/Sidebar';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Profile } from '@/types';

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['600', '700'],
});

const exo2 = Exo_2({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = createServerSupabaseClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();

  const profile = (profileRow as Profile | null) ?? null;

  return (
    <div className={`flex h-screen overflow-hidden bg-[#06060B] text-[#EEF0FF] ${exo2.className}`}>
      <Sidebar profile={profile} titleFontClass={rajdhani.className} textFontClass={exo2.className} />
      <main className="flex-1 overflow-y-auto bg-[#06060B]">
        {children}
      </main>
    </div>
  );
}

