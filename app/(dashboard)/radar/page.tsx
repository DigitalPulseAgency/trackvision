'use client';

import { useMemo, useState } from 'react';
import { Rajdhani } from 'next/font/google';
import type { AuditResult, Lead, Niche } from '@/types';

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['600', '700'],
});

type RadarLead = {
  id: string;
  company_name: string;
  contact_first_name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  city: string;
  niche: Niche;
  score: number;
  gaps: {
    noSite: boolean;
    noBooking: boolean;
    noQuote: boolean;
  };
  servicesToPitch: string[];
  audit: AuditResult;
  angle?: string;
};

type SortOption = 'score_desc' | 'score_asc';

type GapFilter = 'all' | 'noSite' | 'noBooking' | 'noQuote';

const niches: { value: Niche; label: string }[] = [
  { value: 'automobile', label: 'Automobile' },
  { value: 'batiment', label: 'Bâtiment' },
  { value: 'beaute', label: 'Beauté' },
  { value: 'cbd', label: 'CBD' },
  { value: 'restauration', label: 'Restauration' },
  { value: 'sante', label: 'Santé' },
  { value: 'immobilier', label: 'Immobilier' },
];

const getScoreColor = (score: number) => {
  if (score >= 70) return '#F04060';
  if (score >= 40) return '#F59E0B';
  return '#3B82F6';
};

const mockAuditFromScore = (score: number): AuditResult => ({
  has_website: score > 10,
  has_booking: score < 75,
  has_quote_form: score < 80,
  has_socials: score > 20,
  has_chatbot: score < 60,
  has_vocal_opportunity: true,
  has_pdf_flyer: false,
  has_google_rating: score > 30,
  score,
  score_breakdown: {
    no_website: score > 90 ? 40 : 0,
    no_booking: ! (score < 75) ? 25 : 0,
    no_quote: ! (score < 80) ? 20 : 0,
    no_socials: score <= 20 ? 15 : 0,
    no_chatbot: score >= 60 ? 25 : 0,
    low_rating: score <= 30 ? 15 : 0,
  },
  recommandation: '',
  services_to_pitch: [],
  detected_gaps: [],
});

const generateMockLeads = (niche: Niche, city: string, radius: number): RadarLead[] => {
  const bases = [
    'Garage Horizon',
    'Atelier Urbain',
    'Clinique du Sourire',
    'Bistro du Centre',
    'Immo Premium',
    'CBD Harmony',
  ];

  return bases.map((base, idx) => {
    const score = 40 + idx * 10 + (radius === 50 ? 5 : 0);
    const audit = mockAuditFromScore(score);

    return {
      id: `${idx}`,
      company_name: `${base} ${city}`,
      contact_first_name: ['Alex', 'Marie', 'Sofiane', 'Julie', 'Nina', 'Thomas'][idx] ?? 'Alex',
      contact_name: ['Durand', 'Martin', 'Benali', 'Dupont', 'Lopez', 'Bernard'][idx] ?? 'Durand',
      email: `contact+${idx}@${base.toLowerCase().replace(/\s+/g, '')}.fr`,
      phone: `04 72 0${idx} ${10 + idx}`,
      city,
      niche,
      score,
      gaps: {
        noSite: !audit.has_website,
        noBooking: !audit.has_booking,
        noQuote: !audit.has_quote_form,
      },
      servicesToPitch: ['Réceptionniste Vocal IA', 'Module Booking', 'Automatisation Devis'].slice(
        0,
        1 + (idx % 3),
      ),
      audit,
      angle: undefined,
    };
  });
};

const buildCsvForLemlist = (leads: RadarLead[]): string => {
  const header = [
    'Prénom',
    'Nom',
    'Email',
    'Entreprise',
    'Ville',
    'Téléphone',
    'Score',
    'Services_a_pitcher',
    'Angle_attaque',
  ];

  const rows = leads.map((lead) => [
    lead.contact_first_name ?? '',
    lead.contact_name ?? '',
    lead.email ?? '',
    lead.company_name,
    lead.city,
    lead.phone ?? '',
    String(lead.score),
    lead.servicesToPitch.join(' | '),
    lead.angle ?? '',
  ]);

  return [header, ...rows]
    .map((cols) =>
      cols
        .map((c) => {
          const v = c.replace(/"/g, '""');
          return `"${v}"`;
        })
        .join(','),
    )
    .join('\n');
};

const downloadCsv = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function RadarPage() {
  const [niche, setNiche] = useState<Niche>('automobile');
  const [city, setCity] = useState('');
  const [radius, setRadius] = useState(25);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [leads, setLeads] = useState<RadarLead[]>([]);
  const [sort, setSort] = useState<SortOption>('score_desc');
  const [gapFilter, setGapFilter] = useState<GapFilter>('all');
  const [nicheFilter, setNicheFilter] = useState<Niche | 'all'>('all');
  const [scriptModal, setScriptModal] = useState<{ open: boolean; content: string }>({
    open: false,
    content: '',
  });

  const handleScan = async () => {
    if (!city.trim()) return;
    setIsScanning(true);
    setProgress(0);

    const start = performance.now();
    const duration = 2500;

    const step = () => {
      const elapsed = performance.now() - start;
      const ratio = Math.min(1, elapsed / duration);
      setProgress(Math.round(ratio * 100));
      if (ratio < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);

    setTimeout(() => {
      const data = generateMockLeads(niche, city.trim(), radius);
      setLeads(data);
      setIsScanning(false);
    }, duration + 150);
  };

  const filteredLeads = useMemo(() => {
    let current = [...leads];

    if (nicheFilter !== 'all') {
      current = current.filter((l) => l.niche === nicheFilter);
    }

    if (gapFilter !== 'all') {
      current = current.filter((l) => l.gaps[gapFilter]);
    }

    current.sort((a, b) =>
      sort === 'score_desc' ? b.score - a.score : a.score - b.score,
    );

    return current;
  }, [leads, nicheFilter, gapFilter, sort]);

  const openScriptModal = (content: string) => {
    setScriptModal({ open: true, content });
  };

  const handleGenerateAngle = async (lead: RadarLead) => {
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: lead.contact_first_name ?? 'Directeur',
          companyName: lead.company_name,
          city: lead.city,
          niche: lead.niche,
          auditResult: lead.audit,
        }),
      });

      if (!res.ok) throw new Error('API audit error');

      const json = await res.json();
      const script = json.script ?? json.data ?? 'Angle non disponible.';

      openScriptModal(script);
    } catch {
      openScriptModal(
        `Angle d'attaque suggéré pour ${lead.company_name} :\n\nMettre en avant la perte de demandes due à l'absence d'automatisation (RDV, devis, accueil téléphonique) et proposer un plan en 2 modules maximum pour un ROI visible dès le premier mois.`,
      );
    }
  };

  const handleAddToCrm = async (lead: RadarLead) => {
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: lead.company_name,
          contact_name: lead.contact_name,
          contact_first_name: lead.contact_first_name,
          email: lead.email,
          phone: lead.phone,
          city: lead.city,
          niche: lead.niche,
          audit_score: lead.score,
        }),
      });
      // Silent success; UI feedback could be added later
    } catch {
      // ignore
    }
  };

  const handleCallScript = (lead: RadarLead) => {
    const mainGap =
      lead.audit.detected_gaps[0] || 'manque de visibilité digitale et de processus automatisés';
    const mainService = lead.servicesToPitch[0] || 'automatisation de la prise de rendez-vous';
    const leadTemp =
      lead.score >= 70 ? '🔥 LEAD CHAUD' : lead.score >= 40 ? '⚡ LEAD TIÈDE' : '❄️ LEAD FROID';

    const script = `📞 SCRIPT D'APPEL — ${lead.company_name.toUpperCase()}
Score d'opportunité : ${lead.score}/100 · ${leadTemp}
══════════════════════════════════════

INTRO (10 sec) :
"Bonjour ${lead.contact_first_name ?? 'Monsieur/Madame'}, c'est [Ton Prénom] de Digital Pulse Agency.
Je vous appelle parce que j'ai analysé la présence en ligne de ${lead.company_name} à ${lead.city},
et j'ai identifié quelque chose d'important."

ACCROCHE (15 sec) :
"J'ai détecté que ${mainGap.toLowerCase()}.
Dans le secteur ${lead.niche}, ça représente en moyenne 15 à 30 clients perdus par mois
qui vont chez vos concurrents qui ont déjà automatisé ça."

PROPOSITION (20 sec) :
"On a mis en place ${mainService} pour d'autres acteurs à proximité.
Le retour sur investissement est visible dès le premier mois.
Vous avez 15 minutes cette semaine pour voir ce qu'on peut faire concrètement ?"
`;

    openScriptModal(script);
  };

  const handleExportCsv = () => {
    if (!filteredLeads.length) return;
    const csv = buildCsvForLemlist(filteredLeads);
    downloadCsv(csv, 'trackvision_radar_lemlist.csv');
  };

  return (
    <div className="min-h-screen bg-[#06060B] px-8 pb-10 pt-6 text-[#EEF0FF]">
      <header className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1
            className={`${rajdhani.className} text-xs font-semibold tracking-[0.4em] text-[#D8DFF0]`}
          >
            RADAR PROSPECTS
          </h1>
          <p className="mt-1 text-sm text-[#9499BE]">
            Scanner une zone, prioriser les leads à fort potentiel et générer les scripts d&apos;approche.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 rounded-md border border-[#252540] bg-[#12121F] px-3 py-1.5 text-sm text-[#B8BFD0] transition-colors hover:border-[#7C3AED] hover:text-[#EEF0FF]"
        >
          <span>📤</span>
          <span>Exporter pour Lemlist</span>
        </button>
      </header>

      {/* Formulaire de scan */}
      <section className="mb-5 rounded-xl border border-[#252540] bg-[#12121F] px-4 py-4">
        <div className="grid gap-3 md:grid-cols-[1.1fr_1.2fr_0.7fr_auto]">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#9499BE]">Niche</label>
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value as Niche)}
              className="h-10 rounded-md border border-[#252540] bg-[#0D0D18] px-2 text-sm text-[#EEF0FF] outline-none focus:border-[#7C3AED]"
            >
              {niches.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#9499BE]">Ville</label>
            <input
              type="text"
              placeholder="Ex: Lyon, Bordeaux..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-10 rounded-md border border-[#252540] bg-[#0D0D18] px-3 text-sm text-[#EEF0FF] outline-none placeholder:text-[#4B5563] focus:border-[#7C3AED]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#9499BE]">Rayon (km)</label>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="h-10 rounded-md border border-[#252540] bg-[#0D0D18] px-2 text-sm text-[#EEF0FF] outline-none focus:border-[#7C3AED]"
            >
              {[10, 25, 50].map((r) => (
                <option key={r} value={r}>
                  {r} km
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              disabled={!city.trim() || isScanning}
              onClick={handleScan}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[#6B21D4] to-[#7C3AED] px-4 py-2 text-sm font-medium text-white shadow-[0_0_18px_rgba(124,58,237,0.65)] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>🔍</span>
              <span>{isScanning ? 'Scan en cours...' : 'Scanner la zone'}</span>
            </button>
          </div>
        </div>

        {isScanning && (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs text-[#9499BE]">
              <span>Analyse des résultats...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#252540]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] via-[#9B5CF6] to-[#22D3A5]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Filtres */}
      <section className="mb-4 flex flex-wrap items-center gap-3 text-xs text-[#B8BFD0]">
        <div className="flex items-center gap-2">
          <span className="text-[#9499BE]">Trier par</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="h-8 rounded-md border border-[#252540] bg-[#0D0D18] px-2 text-xs outline-none focus:border-[#7C3AED]"
          >
            <option value="score_desc">Score (décroissant)</option>
            <option value="score_asc">Score (croissant)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[#9499BE]">Niche</span>
          <select
            value={nicheFilter}
            onChange={(e) => setNicheFilter(e.target.value as any)}
            className="h-8 rounded-md border border-[#252540] bg-[#0D0D18] px-2 text-xs outline-none focus:border-[#7C3AED]"
          >
            <option value="all">Toutes</option>
            {niches.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[#9499BE]">Gap principal</span>
          <select
            value={gapFilter}
            onChange={(e) => setGapFilter(e.target.value as GapFilter)}
            className="h-8 rounded-md border border-[#252540] bg-[#0D0D18] px-2 text-xs outline-none focus:border-[#7C3AED]"
          >
            <option value="all">Tous</option>
            <option value="noSite">❌ No Site</option>
            <option value="noBooking">❌ No Booking</option>
            <option value="noQuote">❌ No Devis</option>
          </select>
        </div>

        <span className="ml-auto text-[11px] text-[#4B5563]">
          {filteredLeads.length} résultats affichés
        </span>
      </section>

      {/* Résultats */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredLeads.map((lead) => (
          <article
            key={lead.id}
            className="flex flex-col rounded-xl border border-[#252540] bg-[#171728] p-3 text-xs"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <div>
                <h2 className="truncate text-sm font-semibold text-[#EEF0FF]">
                  {lead.company_name}
                </h2>
                <p className="text-[11px] text-[#9499BE]">
                  {lead.city} · {lead.niche}
                </p>
              </div>
              <div className="text-right">
                <span
                  className="text-sm font-semibold"
                  style={{ color: getScoreColor(lead.score) }}
                >
                  {lead.score}/100
                </span>
                <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-[#252540]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(lead.score, 100)}%`,
                      backgroundColor: getScoreColor(lead.score),
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Gaps */}
            <div className="mt-2 flex flex-wrap gap-1">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  lead.gaps.noSite
                    ? 'bg-[#3F0F1A] text-[#FECACA]'
                    : 'bg-[#052E1A] text-[#BBF7D0]'
                }`}
              >
                {lead.gaps.noSite ? '❌ No Site' : '✅ Site OK'}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  lead.gaps.noBooking
                    ? 'bg-[#3F0F1A] text-[#FECACA]'
                    : 'bg-[#052E1A] text-[#BBF7D0]'
                }`}
              >
                {lead.gaps.noBooking ? '❌ No Booking' : '✅ Booking'}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  lead.gaps.noQuote
                    ? 'bg-[#3F0F1A] text-[#FECACA]'
                    : 'bg-[#052E1A] text-[#BBF7D0]'
                }`}
              >
                {lead.gaps.noQuote ? '❌ No Devis' : '✅ Devis'}
              </span>
            </div>

            {/* Services recommandés */}
            <div className="mt-2 flex flex-wrap gap-1">
              {lead.servicesToPitch.map((service) => (
                <span
                  key={service}
                  className="rounded-full bg-[#1E1038] px-2 py-0.5 text-[10px] text-[#D8B4FE]"
                >
                  {service}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleGenerateAngle(lead)}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-[#111827] px-2 py-1.5 text-[11px] font-medium text-[#E5E7EB] transition-colors hover:bg-[#1F2937]"
              >
                ⚡ Angle d&apos;Attaque
              </button>
              <button
                type="button"
                onClick={() => handleAddToCrm(lead)}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-[#252540] bg-[#0D0D18] px-2 py-1.5 text-[11px] font-medium text-[#B8BFD0] transition-colors hover:border-[#22D3A5] hover:text-[#ECFDF5]"
              >
                ➕ Ajouter au CRM
              </button>
              <button
                type="button"
                onClick={() => handleCallScript(lead)}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-gradient-to-r from-[#6B21D4] to-[#7C3AED] px-2 py-1.5 text-[11px] font-medium text-white shadow-[0_0_16px_rgba(124,58,237,0.55)]"
              >
                📞 Script Appel
              </button>
            </div>
          </article>
        ))}

        {!filteredLeads.length && !isScanning && (
          <div className="col-span-full rounded-xl border border-dashed border-[#252540] bg-[#06060B] px-6 py-10 text-center text-sm text-[#4B5563]">
            Lance un scan de zone pour voir apparaître les leads à fort potentiel ici.
          </div>
        )}
      </section>

      {/* Modal Script */}
      {scriptModal.open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="max-h-[80vh] w-full max-w-xl rounded-xl border border-[#252540] bg-[#0D0D18] p-4 text-sm text-[#EEF0FF]">
            <div className="mb-3 flex items-center justify-between">
              <h2
                className={`${rajdhani.className} text-xs font-semibold uppercase tracking-[0.2em] text-[#D8DFF0]`}
              >
                Script & Angle d&apos;Attaque
              </h2>
              <button
                type="button"
                onClick={() => setScriptModal({ open: false, content: '' })}
                className="rounded-md border border-[#252540] bg-[#111827] px-2 py-0.5 text-xs text-[#B8BFD0] hover:border-[#F04060] hover:text-[#FECACA]"
              >
                Fermer
              </button>
            </div>
            <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-md bg-[#030712] px-3 py-2 text-xs text-[#E5E7EB]">
              {scriptModal.content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

