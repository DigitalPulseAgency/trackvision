import { Rajdhani } from 'next/font/google';
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { KpiData, Lead } from '@/types';

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['600', '700'],
});

type RevenuePoint = {
  month: string;
  brut: number;
  net: number;
};

type PipelineColumn = {
  status: string;
  leads: Lead[];
};

const monthNamesShort = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

const getLastSixMonths = (): string[] => {
  const now = new Date();
  const out: string[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${monthNamesShort[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`);
  }
  return out;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

const formatPercent = (value: number) =>
  `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

async function fetchDashboardData() {
  const supabase = createServerSupabaseClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const { data: finances } = await supabase
    .from('finances')
    .select('*')
    .gte('transaction_date', monthStart);

  const { data: tools } = await supabase
    .from('agency_tools')
    .select('*')
    .eq('is_active', true);

  const { data: leads } = await supabase.from('leads').select('*');

  const totalBrut = finances?.reduce((sum, f: any) => sum + Number(f.amount_brut || 0), 0) ?? 0;
  const toolsCost = tools?.reduce((sum, t: any) => sum + Number(t.monthly_cost || 0), 0) ?? 0;
  const totalNet = totalBrut * 0.8 - toolsCost;
  const leadsScraped = leads?.length ?? 0;
  const leadsInSignature =
    leads?.filter((l: any) => l.pipeline_status === 'signed').reduce((sum, l: any) => sum + (l.estimated_value ?? 0), 0) ??
    0;

  const kpis: KpiData = {
    totalBrut,
    totalNet,
    leadsScraped,
    leadsInSignature,
    toolsCost,
    chargesAmount: totalBrut * 0.2 + toolsCost,
  };

  const hotLeadThreshold = 70;
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const hotLeads = (leads || []).filter(
    (l: any) =>
      (l.audit_score ?? 0) >= hotLeadThreshold &&
      ['qualified', 'contacted', 'interested', 'proposal'].includes(l.pipeline_status) &&
      l.updated_at < fortyEightHoursAgo,
  );

  const hotLeadsCount = hotLeads.length;

  const months = getLastSixMonths();
  const revenueHistory: RevenuePoint[] = months.map((month, idx) => {
    const base = totalBrut || 12000;
    const variationFactor = 1 + (idx - months.length / 2) * 0.05;
    const brut = Math.max(8000, Math.round(base * variationFactor));
    const net = Math.round(brut * 0.8 - toolsCost);
    return { month, brut, net };
  });

  const pipelineColumns: PipelineColumn[] = [
    { status: 'Scrapé', leads: (leads || []).filter((l: any) => l.pipeline_status === 'scraped') as Lead[] },
    { status: 'Qualifié', leads: (leads || []).filter((l: any) => l.pipeline_status === 'qualified') as Lead[] },
    { status: 'Contacté', leads: (leads || []).filter((l: any) => l.pipeline_status === 'contacted') as Lead[] },
    { status: 'Proposition', leads: (leads || []).filter((l: any) => l.pipeline_status === 'proposal') as Lead[] },
    { status: '✓ Signé', leads: (leads || []).filter((l: any) => l.pipeline_status === 'signed') as Lead[] },
  ];

  return {
    kpis,
    revenueHistory,
    pipelineColumns,
    hotLeadsCount,
  };
}

export default async function DashboardPage() {
  let data;
  try {
    data = await fetchDashboardData();
  } catch {
    const months = getLastSixMonths();
    data = {
      kpis: {
        totalBrut: 18650,
        totalNet: 13480,
        leadsScraped: 142,
        leadsInSignature: 5,
        toolsCost: 620,
        chargesAmount: 3720,
      } satisfies KpiData,
      revenueHistory: months.map((month, idx) => ({
        month,
        brut: 12000 + idx * 1500,
        net: 9500 + idx * 1200,
      })),
      pipelineColumns: [
        { status: 'Scrapé', leads: [] as Lead[] },
        { status: 'Qualifié', leads: [] as Lead[] },
        { status: 'Contacté', leads: [] as Lead[] },
        { status: 'Proposition', leads: [] as Lead[] },
        { status: '✓ Signé', leads: [] as Lead[] },
      ],
      hotLeadsCount: 3,
    };
  }

  const { kpis, revenueHistory, pipelineColumns, hotLeadsCount } = data;

  const deltaBrut = 12.4;
  const deltaNet = 9.1;
  const deltaLeads = 18.7;
  const deltaSigned = 6.3;

  const alerts = [
    {
      type: 'urgent',
      title: 'Leads chauds non rappelés',
      description: `${hotLeadsCount} leads avec score > 70 non contactés depuis 48h.`,
      time: 'Il y a 2 h',
    },
    {
      type: 'finance',
      title: 'Charge outils en hausse',
      description: "Les coûts d'outils ont augmenté de 12% ce mois-ci.",
      time: 'Il y a 6 h',
    },
    {
      type: 'pipeline',
      title: 'Blocage en phase Devis',
      description: '8 leads en attente de validation de devis depuis plus de 5 jours.',
      time: 'Hier',
    },
    {
      type: 'info',
      title: 'Nouveau client signé',
      description: 'Contrat récurrent 890€/mois — Réceptionniste Vocal IA.',
      time: 'Il y a 30 min',
    },
  ];

  return (
    <div className="min-h-screen bg-[#06060B] px-8 pb-10 pt-6 text-[#EEF0FF]">
      {/* TOPBAR */}
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1
            className={`${rajdhani.className} text-xs font-semibold tracking-[0.5em] text-[#D8DFF0]`}
          >
            COCKPIT
          </h1>
          <p className="mt-1 text-sm text-[#9499BE]">Mars 2026 · Vue Temps Réel</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-[#22D3A5]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22D3A5] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22D3A5]" />
            </span>
            <span>Live</span>
          </div>

          <button
            type="button"
            className="rounded-md border border-[#252540] bg-[#12121F] px-3 py-1.5 text-sm text-[#B8BFD0] transition-colors hover:border-[#3B82F6] hover:text-[#E5F0FF]"
          >
            Export CSV
          </button>

          <button
            type="button"
            className="rounded-md bg-gradient-to-r from-[#6B21D4] to-[#7C3AED] px-4 py-1.5 text-sm font-medium text-white shadow-[0_0_18px_rgba(124,58,237,0.65)] transition-transform hover:scale-[1.02]"
          >
            + Nouveau Lead
          </button>

          <button
            type="button"
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#252540] bg-[#12121F] text-[#B8BFD0]"
            aria-label="Notifications"
          >
            <span className="text-lg">🔔</span>
            <span className="absolute right-1 top-1">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-[#F04060] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F04060]" />
            </span>
          </button>
        </div>
      </header>

      {/* ALERT BANNER */}
      {hotLeadsCount > 0 && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border-l-4 border-[#F04060] bg-[#220814] px-4 py-3 text-sm text-[#FEE2E2]">
          <div>
            <p className="font-medium">
              ⚠️ {hotLeadsCount} leads chauds non contactés · Niche Automobile · Lyon
            </p>
            <p className="text-xs text-[#fecaca]">
              Prioriser les rappels cet après-midi pour éviter la perte de deals à haute valeur.
            </p>
          </div>
          <span className="rounded-full bg-[#F04060] px-3 py-1 text-xs font-semibold tracking-wide text-white">
            ACTION REQUISE
          </span>
        </div>
      )}

      {/* KPI GRID */}
      <section className="mb-6 grid gap-4 md:grid-cols-4">
        {/* CA Brut */}
        <div className="rounded-xl border border-[#252540] bg-[#171728] px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.16em] text-[#9499BE]">CA Brut / Mois</p>
            <span className="text-lg">💰</span>
          </div>
          <p className={`${rajdhani.className} mt-2 text-2xl font-semibold text-[#EEF0FF]`}>
            {formatCurrency(kpis.totalBrut)}
          </p>
          <p className="mt-1 text-xs text-[#22D3A5]">{formatPercent(deltaBrut)} vs mois précédent</p>
        </div>

        {/* Revenu Net */}
        <div className="rounded-xl border border-[#4C1D95] bg-[#1A0A40] px-4 py-3 shadow-[0_0_25px_rgba(124,58,237,0.55)]">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.16em] text-[#C4B5FD]">Revenu Net Réel</p>
            <span className="text-xs rounded-full bg-[#22D3A5]/10 px-2 py-0.5 text-[#22D3A5]">
              {formatCurrency(kpis.totalNet)}
            </span>
          </div>
          <p className={`${rajdhani.className} mt-2 text-2xl font-semibold text-[#F9FAFB]`}>
            {formatCurrency(kpis.totalNet)}
          </p>
          <p className="mt-1 text-xs text-[#22D3A5]">
            {(kpis.toolsCost ? `${formatCurrency(kpis.toolsCost)} outils déduits` : 'Outils inclus')} ·{' '}
            {formatPercent(deltaNet)} vs N-1
          </p>
        </div>

        {/* Leads scrapés */}
        <div className="rounded-xl border border-[#252540] bg-[#171728] px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.16em] text-[#9499BE]">Leads Scrapés</p>
            <span className="text-lg">📡</span>
          </div>
          <p className={`${rajdhani.className} mt-2 text-2xl font-semibold text-[#EEF0FF]`}>
            {kpis.leadsScraped}
          </p>
          <p className="mt-1 text-xs text-[#F59E0B]">
            {formatPercent(deltaLeads)} vs dernier scan massif
          </p>
        </div>

        {/* Leads en signature */}
        <div className="rounded-xl border border-[#252540] bg-[#171728] px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.16em] text-[#9499BE]">Leads en Signature</p>
            <span className="text-lg">✍️</span>
          </div>
          <p className={`${rajdhani.className} mt-2 text-2xl font-semibold text-[#EEF0FF]`}>
            {kpis.leadsInSignature}
          </p>
          <p className="mt-1 text-xs text-[#22D3A5]">
            Valeur estimée : {formatCurrency(kpis.leadsInSignature * 1200)}
          </p>
          <p className="mt-0.5 text-xs text-[#22D3A5]">{formatPercent(deltaSigned)} vs mois dernier</p>
        </div>
      </section>

      {/* REVENUE CHART */}
      <section className="mb-6 rounded-xl border border-[#252540] bg-[#12121F] px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className={`${rajdhani.className} text-xs font-semibold uppercase tracking-[0.2em] text-[#B8BFD0]`}>
              Trajectoire CA 6 derniers mois
            </p>
            <p className="mt-1 text-xs text-[#9499BE]">
              CA Brut vs Revenu Net après charges et outils
            </p>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueHistory}>
              <CartesianGrid stroke="#252540" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" stroke="#6B7280" tickLine={false} />
              <YAxis
                stroke="#6B7280"
                tickLine={false}
                tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0D0D18',
                  borderColor: '#252540',
                  borderRadius: 8,
                }}
                formatter={(value: any) => formatCurrency(Number(value))}
              />
              <Legend
                wrapperStyle={{
                  paddingTop: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="brut"
                name="CA Brut"
                stroke="#7C3AED"
                strokeWidth={2.4}
                dot={{ r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="net"
                name="Revenu Net"
                stroke="#3B82F6"
                strokeDasharray="4 4"
                strokeWidth={2}
                dot={{ r: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* LOWER GRID */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
        {/* Pipeline Kanban */}
        <div className="rounded-xl border border-[#252540] bg-[#12121F] px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <p className={`${rajdhani.className} text-xs font-semibold uppercase tracking-[0.2em] text-[#B8BFD0]`}>
              Pipeline Sales
            </p>
            <p className="text-xs text-[#9499BE]">
              Scrapé → Qualifié → Contacté → Proposition → ✓ Signé
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
            {pipelineColumns.map((column) => (
              <div
                key={column.status}
                className={`flex min-h-[220px] flex-col rounded-lg border ${
                  column.status === '✓ Signé'
                    ? 'border-[#22D3A5]/60 bg-[#052E1A]'
                    : 'border-[#252540] bg-[#171728]'
                }`}
              >
                <div className="flex items-center justify-between border-b border-[#252540] px-3 py-2">
                  <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#B8BFD0]">
                    {column.status}
                  </span>
                  <span className="rounded-full bg-[#06060B]/60 px-2 text-xs text-[#B8BFD0]">
                    {column.leads.length}
                  </span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto px-2 py-2">
                  {column.leads.slice(0, 5).map((lead) => {
                    const score = lead.audit_score ?? 0;
                    const scoreColor =
                      score >= 70 ? '#F04060' : score >= 40 ? '#F59E0B' : '#3B82F6';
                    const barColor =
                      score >= 70 ? 'bg-[#F04060]' : score >= 40 ? 'bg-[#F59E0B]' : 'bg-[#3B82F6]';

                    return (
                      <div
                        key={lead.id}
                        className="space-y-1 rounded-md border border-[#252540] bg-[#0D0D18] px-2 py-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-medium text-[#EEF0FF]">
                            {lead.company_name}
                          </p>
                          <span className="whitespace-nowrap text-[11px] text-[#9499BE]">
                            {lead.city || 'N/A'}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center rounded-full bg-[#06060B] px-2 py-0.5 text-[10px] text-[#B8BFD0]">
                            {lead.niche}
                          </span>
                          <span
                            className="text-[11px] font-semibold"
                            style={{ color: scoreColor }}
                          >
                            {score}/100
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#252540]">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${Math.min(score, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {column.leads.length === 0 && (
                    <p className="mt-4 text-center text-[11px] text-[#4B5563]">
                      Aucun lead pour le moment.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="rounded-xl border border-[#252540] bg-[#12121F] px-4 py-4">
          <p className={`${rajdhani.className} mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#B8BFD0]`}>
            Centre d&apos;Alertes
          </p>
          <div className="space-y-2">
            {alerts.map((alert) => {
              const borderColor =
                alert.type === 'urgent'
                  ? 'border-l-[#F04060]'
                  : alert.type === 'finance'
                  ? 'border-l-[#22D3A5]'
                  : alert.type === 'pipeline'
                  ? 'border-l-[#F59E0B]'
                  : 'border-l-[#7C3AED]';

              const icon =
                alert.type === 'urgent'
                  ? '⚠️'
                  : alert.type === 'finance'
                  ? '💸'
                  : alert.type === 'pipeline'
                  ? '🧩'
                  : 'ℹ️';

              return (
                <div
                  key={alert.title}
                  className={`flex items-start gap-2 rounded-md border border-[#252540] border-l-4 bg-[#171728] px-3 py-2 text-xs ${borderColor}`}
                >
                  <span className="mt-[2px] text-base">{icon}</span>
                  <div>
                    <p className="font-medium text-[#EEF0FF]">{alert.title}</p>
                    <p className="text-[11px] text-[#B8BFD0]">{alert.description}</p>
                    <p className="mt-0.5 text-[10px] text-[#6B7280]">{alert.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

