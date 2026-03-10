'use client';

import { useMemo, useState } from 'react';
import { z } from 'zod';
import type { Finance, AgencyTool, Project } from '@/types';
import { FinanceStats } from './FinanceStats';

const transactionSchema = z.object({
  description: z.string().min(2).max(200),
  amount_brut: z.number().positive(),
  date: z.string().min(1),
  type: z.enum(['recurring', 'one-shot', 'refund']),
  category: z.string().min(1),
  project_id: z.string().optional().nullable(),
});

type Props = {
  finances: Finance[];
  tools: AgencyTool[];
  projects: Project[];
  userId: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

export function FinancePageClient({ finances, tools, projects, userId }: Props) {
  const [monthFilter, setMonthFilter] = useState<string>('current');
  const [typeFilter, setTypeFilter] = useState<'all' | 'recurring' | 'one-shot' | 'refund'>('all');
  const [sortDesc, setSortDesc] = useState(true);
  const [formState, setFormState] = useState({
    description: '',
    amount_brut: '',
    date: '',
    type: 'recurring',
    category: 'service',
    project_id: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const filteredFinances = useMemo(() => {
    let rows = [...finances];

    if (monthFilter === 'current') {
      rows = rows.filter((f) => {
        const d = new Date(f.transaction_date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
    }

    if (typeFilter !== 'all') {
      rows = rows.filter((f) => f.type === typeFilter);
    }

    rows.sort((a, b) => {
      const da = new Date(a.transaction_date).getTime();
      const db = new Date(b.transaction_date).getTime();
      return sortDesc ? db - da : da - db;
    });

    return rows;
  }, [finances, monthFilter, typeFilter, sortDesc, currentMonth, currentYear]);

  const totals = useMemo(() => {
    const totalBrut = filteredFinances.reduce((sum, f) => sum + f.amount_brut, 0);
    const activeToolsCost = tools.reduce((sum, t) => sum + (t.is_active ? t.monthly_cost : 0), 0);
    const charges = totalBrut * 0.2 + activeToolsCost;
    const netInPocket = totalBrut * 0.8 - activeToolsCost;
    return { totalBrut, activeToolsCost, charges, netInPocket };
  }, [filteredFinances, tools]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      const parsed = transactionSchema.parse({
        description: formState.description,
        amount_brut: Number(formState.amount_brut),
        date: formState.date,
        type: formState.type,
        category: formState.category,
        project_id: formState.project_id || undefined,
      });

      await fetch('/api/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      await fetch('/api/audit/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action: 'finance_insert',
          tableName: 'finances',
          newValues: parsed,
        }),
      });

      setFormState({
        description: '',
        amount_brut: '',
        date: '',
        type: 'recurring',
        category: 'service',
        project_id: '',
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        setFormError('Certains champs sont invalides. Merci de vérifier le formulaire.');
      } else {
        setFormError("Erreur lors de l'enregistrement de la transaction.");
      }
    }
  };

  const handleExportMonth = async () => {
    const data = filteredFinances;
    if (!data.length) return;

    const header = ['Date', 'Description', 'Type', 'Montant Brut', 'Montant Net', 'Projet'];
    const rows = data.map((f) => [
      f.transaction_date,
      f.description ?? '',
      f.type,
      String(f.amount_brut),
      String(f.amount_net),
      f.project_id ?? '',
    ]);

    const csv = [header, ...rows]
      .map((cols) =>
        cols
          .map((c) => {
            const v = String(c).replace(/"/g, '""');
            return `"${v}"`;
          })
          .join(','),
      )
      .join('\n');

    await fetch('/api/audit/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        action: 'finance_export_csv',
        tableName: 'finances',
        newValues: { monthFilter, typeFilter },
      }),
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'trackvision_finances_mois.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#06060B] px-8 pb-10 pt-6 text-sm text-[#EEF0FF]">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xs font-semibold uppercase tracking-[0.32em] text-[#D8DFF0]">
            Revenus &amp; Charges
          </h1>
          <p className="mt-1 text-xs text-[#9499BE]">
            Vue consolidée des transactions, charges et outils agence.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportMonth}
          className="inline-flex items-center gap-2 rounded-md border border-[#252540] bg-[#12121F] px-3 py-1.5 text-xs text-[#B8BFD0] transition-colors hover:border-[#7C3AED] hover:text-[#EEF0FF]"
        >
          📤 Exporter ce mois
        </button>
      </header>

      <FinanceStats
        data={{
          totalBrut: totals.totalBrut,
          charges: totals.charges,
          netInPocket: totals.netInPocket,
          toolsCost: totals.activeToolsCost,
        }}
      />

      {/* Filtres + tableau */}
      <section className="mb-6 rounded-xl border border-[#252540] bg-[#12121F] px-4 py-4">
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-[#B8BFD0]">
          <div className="flex items-center gap-2">
            <span className="text-[#9499BE]">Mois</span>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="h-8 rounded-md border border-[#252540] bg-[#0D0D18] px-2 text-xs outline-none focus:border-[#7C3AED]"
            >
              <option value="current">Mois actuel</option>
              <option value="all">Tous</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#9499BE]">Type</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="h-8 rounded-md border border-[#252540] bg-[#0D0D18] px-2 text-xs outline-none focus:border-[#7C3AED]"
            >
              <option value="all">Tous</option>
              <option value="recurring">Recurring</option>
              <option value="one-shot">One-shot</option>
              <option value="refund">Refund</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => setSortDesc((s) => !s)}
            className="ml-auto rounded-md border border-[#252540] bg-[#0D0D18] px-2 py-1 text-xs text-[#B8BFD0] hover:border-[#7C3AED]"
          >
            Date {sortDesc ? '↓' : '↑'}
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#252540]">
          <table className="min-w-full border-collapse text-xs">
            <thead className="bg-[#0D0D18] text-[#9CA3AF]">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-right">Brut</th>
                <th className="px-3 py-2 text-right">Net</th>
                <th className="px-3 py-2 text-left">Projet</th>
              </tr>
            </thead>
            <tbody>
              {filteredFinances.map((f) => {
                const project = projects.find((p) => p.id === f.project_id);
                return (
                  <tr key={f.id} className="border-t border-[#111827] bg-[#060713] text-[#E5E7EB]">
                    <td className="px-3 py-2 align-top">
                      {new Date(f.transaction_date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-3 py-2 align-top">{f.description || '-'}</td>
                    <td className="px-3 py-2 align-top capitalize">{f.type}</td>
                    <td className="px-3 py-2 align-top text-right">
                      {formatCurrency(f.amount_brut)}
                    </td>
                    <td className="px-3 py-2 align-top text-right">
                      {formatCurrency(f.amount_net)}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {project ? project.id : f.project_id || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-[#130922] text-[#E5E7EB]">
                <td colSpan={3} className="px-3 py-2 text-right text-[11px] text-[#C4B5FD]">
                  TOTAL
                </td>
                <td className="px-3 py-2 text-right text-[11px] text-[#C4B5FD]">
                  {formatCurrency(
                    filteredFinances.reduce((sum, f) => sum + f.amount_brut, 0),
                  )}
                </td>
                <td className="px-3 py-2 text-right text-[11px] text-[#C4B5FD]">
                  {formatCurrency(
                    filteredFinances.reduce((sum, f) => sum + f.amount_net, 0),
                  )}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Formulaire ajout transaction & outils agence */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-[#252540] bg-[#12121F] px-4 py-4 text-xs"
        >
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#D8DFF0]">
            Ajouter une transaction
          </h2>

          <div className="mb-3 grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#9499BE]">Description</label>
              <input
                type="text"
                value={formState.description}
                onChange={(e) => setFormState((s) => ({ ...s, description: e.target.value }))}
                className="h-8 rounded-md border border-[#252540] bg-[#0D0D18] px-2 text-xs text-[#EEF0FF] outline-none focus:border-[#7C3AED]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#9499BE]">Montant Brut (€)</label>
              <input
                type="number"
                step="0.01"
                value={formState.amount_brut}
                onChange={(e) => setFormState((s) => ({ ...s, amount_brut: e.target.value }))}
                className="h-8 rounded-md border border-[#252540] bg-[#0D0D18] px-2 text-xs text-[#EEF0FF] outline-none focus:border-[#7C3AED]"
              />
            </div>
          </div>

          <div className="mb-3 grid gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#9499BE]">Date</label>
              <input
                type="date"
                value={formState.date}
                onChange={(e) => setFormState((s) => ({ ...s, date: e.target.value }))}
                className="h-8 rounded-md border border-[#252540] bg-[#0D0D18] px-2 text-xs text-[#EEF0FF] outline-none focus:border-[#7C3AED]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#9499BE]">Type</label>
              <select
                value={formState.type}
                onChange={(e) => setFormState((s) => ({ ...s, type: e.target.value }))}
                className="h-8 rounded-md border border-[#252540] bg-[#0D0D18] px-2 text-xs text-[#EEF0FF] outline-none focus:border-[#7C3AED]"
              >
                <option value="recurring">Recurring</option>
                <option value="one-shot">One-shot</option>
                <option value="refund">Refund</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#9499BE]">Catégorie</label>
              <select
                value={formState.category}
                onChange={(e) => setFormState((s) => ({ ...s, category: e.target.value }))}
                className="h-8 rounded-md border border-[#252540] bg-[#0D0D18] px-2 text-xs text-[#EEF0FF] outline-none focus:border-[#7C3AED]"
              >
                <option value="service">Service</option>
                <option value="tool">Outil</option>
                <option value="salary">Salaire</option>
                <option value="other">Autre</option>
              </select>
            </div>
          </div>

          <div className="mb-3 flex flex-col gap-1">
            <label className="text-[11px] text-[#9499BE]">Projet lié</label>
            <select
              value={formState.project_id}
              onChange={(e) => setFormState((s) => ({ ...s, project_id: e.target.value }))}
              className="h-8 rounded-md border border-[#252540] bg-[#0D0D18] px-2 text-xs text-[#EEF0FF] outline-none focus:border-[#7C3AED]"
            >
              <option value="">Aucun</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id}
                </option>
              ))}
            </select>
          </div>

          {formError && (
            <p className="mb-2 text-[11px] text-[#FCA5A5]">
              {formError}
            </p>
          )}

          <button
            type="submit"
            className="mt-1 inline-flex items-center rounded-md bg-gradient-to-r from-[#6B21D4] to-[#7C3AED] px-4 py-1.5 text-xs font-medium text-white shadow-[0_0_18px_rgba(124,58,237,0.65)]"
          >
            + Ajouter la transaction
          </button>
        </form>

        <div className="rounded-xl border border-[#252540] bg-[#12121F] px-4 py-4 text-xs">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#D8DFF0]">
            Outils agence
          </h2>
          <div className="overflow-x-auto rounded-lg border border-[#252540]">
            <table className="min-w-full border-collapse text-xs">
              <thead className="bg-[#0D0D18] text-[#9CA3AF]">
                <tr>
                  <th className="px-3 py-2 text-left">Nom</th>
                  <th className="px-3 py-2 text-right">Coût mensuel</th>
                  <th className="px-3 py-2 text-left">Catégorie</th>
                  <th className="px-3 py-2 text-left">Renouvellement</th>
                  <th className="px-3 py-2 text-left">Statut</th>
                </tr>
              </thead>
              <tbody>
                {tools.map((tool) => (
                  <tr key={tool.id} className="border-t border-[#111827] bg-[#060713] text-[#E5E7EB]">
                    <td className="px-3 py-2 align-top">{tool.name}</td>
                    <td className="px-3 py-2 align-top text-right">
                      {formatCurrency(tool.monthly_cost)}
                    </td>
                    <td className="px-3 py-2 align-top">{tool.category || '-'}</td>
                    <td className="px-3 py-2 align-top">
                      {tool.renewal_date
                        ? new Date(tool.renewal_date).toLocaleDateString('fr-FR')
                        : '-'}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] ${
                          tool.is_active
                            ? 'bg-[#052E1A] text-[#BBF7D0]'
                            : 'bg-[#1F2937] text-[#9CA3AF]'
                        }`}
                      >
                        {tool.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#130922] text-[#E5E7EB]">
                  <td className="px-3 py-2 text-right text-[11px]" colSpan={5}>
                    Total outils actifs :{' '}
                    <span className="font-semibold text-[#C4B5FD]">
                      {formatCurrency(
                        tools.reduce(
                          (sum, t) => sum + (t.is_active ? t.monthly_cost : 0),
                          0,
                        ),
                      )}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

