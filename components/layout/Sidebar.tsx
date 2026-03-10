'use client';

import { useMemo, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import type { Profile } from '@/types';
import { createClient } from '@/lib/supabase/client';

type SidebarProps = {
  profile: Profile | null;
  hotLeadsCount?: number;
  titleFontClass?: string;
  textFontClass?: string;
};

const navSections = [
  {
    label: 'Principal',
    items: [
      { label: '⬡ Cockpit', href: '/dashboard' },
      { label: '◎ Radar Prospects', href: '/dashboard/radar', showBadge: true },
      { label: '◈ CRM & Leads', href: '/dashboard/crm' },
      { label: '⬜ Projets', href: '/dashboard/projects' },
    ],
  },
  {
    label: 'Finances',
    items: [
      { label: '◉ Revenus & Charges', href: '/dashboard/finances' },
      { label: '⬡ Outils Agence', href: '/dashboard/settings' },
    ],
  },
  {
    label: 'Système',
    items: [
      { label: '◎ Audit Logs', href: '/dashboard/settings', adminOnly: true },
      { label: '◈ Paramètres', href: '/dashboard/settings' },
    ],
  },
];

const isSuperAdmin = (profile: Profile | null) => profile?.role === 'super_admin';

const getInitials = (profile: Profile | null) => {
  if (!profile) return 'TV';
  if (profile.full_name) {
    const parts = profile.full_name.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return (parts[0]![0] + parts[1]![0]).toUpperCase();
  }
  return profile.email.slice(0, 2).toUpperCase();
};

export default function Sidebar({
  profile,
  hotLeadsCount = 0,
  titleFontClass,
  textFontClass,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const supabase = useMemo(() => createClient(), []);

  const handleLogout = () => {
    startTransition(async () => {
      await supabase.auth.signOut();
      router.push('/login');
    });
  };

  const renderNavItem = (href: string, label: string, opts?: { showBadge?: boolean; adminOnly?: boolean }) => {
    if (opts?.adminOnly && !isSuperAdmin(profile)) {
      return null;
    }

    const isActive = pathname === href || pathname.startsWith(`${href}/`);

    return (
      <Link
        key={href + label}
        href={href}
        className={[
          'group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
          'border-l-2',
          isActive
            ? 'border-[#7C3AED] bg-[rgba(107,33,212,0.15)] text-[#E5D9FF]'
            : 'border-transparent text-[#B8BFD0] hover:border-[#7C3AED] hover:bg-[rgba(107,33,212,0.15)] hover:text-[#EEF0FF]',
        ].join(' ')}
      >
        <span className="truncate">{label}</span>
        {opts?.showBadge && (
          <span className="ml-2 inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-[#F04060] px-1.5 text-xs font-medium text-white">
            {hotLeadsCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={`flex h-full w-72 flex-col border-r border-[#252540] bg-[#0D0D18] px-4 py-5 ${
        textFontClass ?? ''
      }`}
    >
      {/* Logo + title */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#12121F]">
          <Image
            src="/images/dpa-logo.png"
            alt="Digital Pulse Agency"
            width={36}
            height={36}
            className="object-contain"
            priority
          />
        </div>
        <div className="flex flex-col">
          <span
            className={`text-lg font-semibold tracking-[0.18em] text-[#EEF0FF] ${
              titleFontClass ?? ''
            }`.trim()}
          >
            TRACKVISION
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#7C3AED]">
            Digital Pulse Agency
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-5 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <p
              className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9499BE] ${
                titleFontClass ?? ''
              }`.trim()}
            >
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map((item) =>
                renderNavItem(item.href, item.label, {
                  showBadge: item.showBadge,
                  adminOnly: item.adminOnly,
                }),
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="mt-4 border-t border-[#252540] pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1E1038] text-sm font-semibold text-[#EDE9FE]">
              {getInitials(profile)}
            </div>
            <div className="flex flex-col">
              <span className="max-w-[9rem] truncate text-sm font-medium text-[#EEF0FF]">
                {profile?.full_name || profile?.email || 'Utilisateur'}
              </span>
              <span className="text-xs uppercase tracking-wide text-[#9499BE]">
                {profile?.role === 'super_admin'
                  ? 'Super Admin'
                  : profile?.role === 'admin'
                  ? 'Admin'
                  : 'Staff'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isPending}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#252540] bg-[#12121F] text-[#B8BFD0] transition-colors hover:border-[#F97373] hover:bg-[#1F1018] hover:text-[#FCA5A5]"
            aria-label="Se déconnecter"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

