import { AuditResult } from '@/types';

interface HookParams {
  firstName: string;
  companyName: string;
  city: string;
  niche: string;
  audit: AuditResult;
  agentName?: string;
}

export const generateCallHook = (params: HookParams): string => {
  const { firstName, companyName, city, niche, audit, agentName = '[Ton Prénom]' } = params;
  const mainGap = audit.detected_gaps[0] || 'manque de visibilité digitale';
  const mainService = audit.services_to_pitch[0] || 'automatisation';
  const leadTemp = audit.score >= 70 ? '🔥 LEAD CHAUD' : audit.score >= 40 ? '⚡ LEAD TIÈDE' : '❄️ LEAD FROID';

  return `📞 SCRIPT D'APPEL — ${companyName.toUpperCase()}
Score d'opportunité : ${audit.score}/100 · ${leadTemp}
══════════════════════════════════════

INTRO (10 sec) :
"Bonjour ${firstName}, c'est ${agentName} de Digital Pulse Agency.
Je vous appelle parce que j'ai analysé la présence en ligne de ${companyName} à ${city},
et j'ai identifié quelque chose d'important."

ACCROCHE (15 sec) :
"J'ai détecté que ${mainGap.toLowerCase()}.
Dans le secteur ${niche}, ça représente en moyenne 15 à 30 clients perdus par mois
qui vont chez vos concurrents qui ont déjà automatisé ça."

PROPOSITION (20 sec) :
"On a mis en place ${mainService} pour d'autres ${niche}s dans votre région.
Le retour sur investissement est visible dès le premier mois.
Vous avez 15 minutes cette semaine pour voir ce qu'on peut faire concrètement ?"

OBJECTIONS :
❌ "Pas le budget" → "C'est pour ça qu'on commence petit : un module, vous voyez les résultats."
❌ "Je suis satisfait" → "Savez-vous combien de clients appellent mais ne laissent pas de message ?"
❌ "Rappelez plus tard" → "Bien sûr. Mardi ou jeudi, quelle demi-journée vous convient ?"

SERVICES À PITCHER :
${audit.services_to_pitch.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
};

export const generateEmailHook = (params: HookParams): string => {
  const { firstName, companyName, city, audit } = params;
  const mainGap = audit.detected_gaps[0] || 'optimisation de votre présence digitale';
  return `Objet : ${companyName} — Analyse de votre présence en ligne à ${city}

Bonjour ${firstName},

En auditant les entreprises de votre secteur à ${city}, j'ai analysé votre présence en ligne
et identifié une opportunité concrète : ${mainGap.toLowerCase()}.

J'ai préparé un rapport personnalisé avec les solutions adaptées à ${companyName}.
Puis-je vous l'envoyer ? C'est gratuit et sans engagement.

[Ton Prénom] — Digital Pulse Agency · TrackVision`;
};

