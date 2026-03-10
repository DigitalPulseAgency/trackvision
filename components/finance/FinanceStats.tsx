import type { KpiData } from '@/types';

type FinanceStatsProps = {
  data: {
    totalBrut: number;
    charges: number;
    netInPocket: number;
    toolsCost: number;
  };
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

export function FinanceStats({ data }: FinanceStatsProps) {
  return (
    <section className="mb-5 grid gap-4 md:grid-cols-3">
      {/* CA Brut */}
      <div className="rounded-xl border border-[#1D4ED8] bg-[#0B1220] px-4 py-3 text-sm text-[#E5F0FF]">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.16em] text-[#9CA3AF]">CA Brut (mois)</p>
          <span className="text-lg">💰</span>
        </div>
        <p className="mt-2 text-2xl font-semibold text-[#E5F0FF]">
          {formatCurrency(data.totalBrut)}
        </p>
      </div>

      {/* Charges */}
      <div className="rounded-xl border border-[#B91C1C] bg-[#180B0B] px-4 py-3 text-sm text-[#FEE2E2]">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.16em] text-[#FECACA]">Charges</p>
          <span className="text-lg">📉</span>
        </div>
        <p className="mt-2 text-2xl font-semibold">
          {formatCurrency(data.charges)}
        </p>
        <p className="mt-1 text-[11px] text-[#FCA5A5]">
          Inclut {formatCurrency(data.toolsCost)} d&apos;outils agence actifs
        </p>
      </div>

      {/* Dans la poche */}
      <div className="rounded-xl border border-[#7C3AED] bg-[#1A0A40] px-4 py-3 text-sm text-[#F9FAFB] shadow-[0_0_25px_rgba(124,58,237,0.65)]">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.16em] text-[#E5E7EB]">Dans la poche</p>
          <span className="text-lg">🎯</span>
        </div>
        <p className="mt-2 text-2xl font-semibold">
          {formatCurrency(data.netInPocket)}
        </p>
        <p className="mt-1 text-[11px] text-[#C4B5FD]">
          CA Brut × 0.80 - outils
        </p>
      </div>
    </section>
  );
}

