import { sanitizeUrl } from '@/lib/security/sanitize';
import { AuditResult } from '@/types';

export const performAudit = async (url: string): Promise<AuditResult> => {
  
  // CAS 1 : Pas de site web
  if (!url || url.trim() === '') {
    return {
      has_website: false, has_booking: false, has_quote_form: false,
      has_socials: false, has_chatbot: false, has_vocal_opportunity: true,
      has_pdf_flyer: false, has_google_rating: false,
      score: 95,
      score_breakdown: { no_website: 40, no_booking: 25, no_quote: 15, no_socials: 10, no_chatbot: 5, low_rating: 0 },
      recommandation: '🔴 PRIORITÉ ABSOLUE : Aucune présence web. Proposer : Site + Vocal IA + Google My Business.',
      services_to_pitch: ['Site Vitrine Pro', 'Réceptionniste Vocal IA', 'Gestion Avis Google'],
      detected_gaps: ['Aucun site web', 'Aucun RDV en ligne', 'Aucune présence réseaux']
    };
  }

  const cleanUrl = sanitizeUrl(url);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(cleanUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TrackVisionBot/1.0)' }
    });
    clearTimeout(timeout);
    
    const html = await response.text();
    const lowerHtml = html.toLowerCase();

    // DÉTECTION DES SIGNAUX
    const has_booking = /calendly|planity|doctolib|reserver|rendez-vous|booking|prise-de-rdv|appointment/i.test(lowerHtml);
    const has_quote_form = /devis|estimation|chiffrage|demande-de-prix|simulateur/i.test(lowerHtml);
    const has_socials = /facebook\.com|instagram\.com|linkedin\.com|tiktok\.com/i.test(lowerHtml);
    const has_chatbot = /intercom|crisp|tawk|zendesk|hubspot|livechat/i.test(lowerHtml);
    const has_pdf_flyer = /\.pdf|catalogue|brochure|plaquette/i.test(lowerHtml);
    const has_google_rating = /google.*avis|note.*google|\d\.\d.*étoile/i.test(lowerHtml);

    // CALCUL DU SCORE
    let score = 0;
    const breakdown = { no_website: 0, no_booking: 0, no_quote: 0, no_socials: 0, no_chatbot: 0, low_rating: 0 };
    if (!has_booking)     { score += 25; breakdown.no_booking = 25; }
    if (!has_quote_form)  { score += 20; breakdown.no_quote = 20; }
    if (!has_socials)     { score += 15; breakdown.no_socials = 15; }
    if (!has_chatbot)     { score += 25; breakdown.no_chatbot = 25; }
    if (!has_google_rating) { score += 15; breakdown.low_rating = 15; }

    // GAPS & SERVICES
    const gaps: string[] = [];
    const services: string[] = [];
    if (!has_booking)    { gaps.push('Aucun système RDV en ligne'); services.push('Module Booking'); }
    if (!has_quote_form) { gaps.push('Pas de formulaire devis'); services.push('Automatisation Devis'); }
    if (!has_socials)    { gaps.push('Faible présence sociale'); services.push('Gestion Réseaux'); }
    if (!has_chatbot)    { gaps.push('Aucun assistant virtuel'); services.push('Réceptionniste Vocal IA'); }
    if (has_pdf_flyer)   { gaps.push('Plaquettes PDF non optimisées'); services.push('Refonte Design Print'); }

    const score_final = Math.min(score, 100);
    let reco = '';
    if (score_final >= 70) reco = '🔴 PRIORITÉ HAUTE : Ce prospect perd des clients chaque jour. Automatisation complète recommandée.';
    else if (score_final >= 40) reco = '🟠 OPPORTUNITÉ MOYENNE : 2-3 modules peuvent tripler la conversion.';
    else reco = '🟢 VEILLE : Site déjà performant. Proposer optimisations avancées.';

    return {
      has_website: true, has_booking, has_quote_form, has_socials,
      has_chatbot, has_vocal_opportunity: !has_chatbot,
      has_pdf_flyer, has_google_rating,
      score: score_final,
      score_breakdown: breakdown,
      recommandation: reco,
      services_to_pitch: services,
      detected_gaps: gaps
    };

  } catch {
    return {
      has_website: false, has_booking: false, has_quote_form: false,
      has_socials: false, has_chatbot: false, has_vocal_opportunity: true,
      has_pdf_flyer: false, has_google_rating: false,
      score: 80,
      score_breakdown: { no_website: 40, no_booking: 25, no_quote: 15, no_socials: 0, no_chatbot: 0, low_rating: 0 },
      recommandation: '⚠️ Site inaccessible. Opportunité : refonte complète.',
      services_to_pitch: ['Site Vitrine Pro', 'Hébergement Sécurisé'],
      detected_gaps: ['Site inaccessible ou HS']
    };
  }
};

