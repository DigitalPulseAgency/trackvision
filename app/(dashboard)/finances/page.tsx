import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { AgencyTool, Finance, Profile, Project } from '@/types';
import { FinancePageClient } from '@/components/finance/FinancePageClient';

export default async function FinancesPage() {
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

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06060B] px-4 text-center text-sm text-[#FECACA]">
        <div className="rounded-xl border border-[#7F1D1D] bg-[#180B0B] px-6 py-5">
          <p className="text-lg">⛔ Accès restreint</p>
          <p className="mt-1 text-xs text-[#FCA5A5]">
            Contactez votre administrateur pour obtenir les droits &apos;admin&apos; ou &apos;super_admin&apos;.
          </p>
        </div>
      </div>
    );
  }

  const { data: financesData } = await supabase
    .from('finances')
    .select('*')
    .order('transaction_date', { ascending: false });
  const { data: toolsData } = await supabase.from('agency_tools').select('*');
  const { data: projectsData } = await supabase.from('projects').select('*');

  const finances = (financesData as Finance[] | null) ?? [];
  const tools = (toolsData as AgencyTool[] | null) ?? [];
  const projects = (projectsData as Project[] | null) ?? [];

  return (
    <FinancePageClient
      finances={finances}
      tools={tools}
      projects={projects}
      userId={session.user.id}
    />
  );
}

