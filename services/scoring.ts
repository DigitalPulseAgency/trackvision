export type ScoreBreakdown = {
  no_website: number;
  no_booking: number;
  no_quote: number;
  no_socials: number;
  no_chatbot: number;
  low_rating: number;
};

export type ScoringSignals = {
  has_website: boolean;
  has_booking: boolean;
  has_quote_form: boolean;
  has_socials: boolean;
  has_chatbot: boolean;
  has_google_rating: boolean;
};

export const computeScore = (signals: ScoringSignals): { score: number; breakdown: ScoreBreakdown } => {
  const breakdown: ScoreBreakdown = {
    no_website: 0,
    no_booking: 0,
    no_quote: 0,
    no_socials: 0,
    no_chatbot: 0,
    low_rating: 0,
  };

  let score = 0;

  if (!signals.has_website) {
    breakdown.no_website = 40;
    score += 40;
  }
  if (!signals.has_booking) {
    breakdown.no_booking = 25;
    score += 25;
  }
  if (!signals.has_quote_form) {
    breakdown.no_quote = 20;
    score += 20;
  }
  if (!signals.has_socials) {
    breakdown.no_socials = 15;
    score += 15;
  }
  if (!signals.has_chatbot) {
    breakdown.no_chatbot = 25;
    score += 25;
  }
  if (!signals.has_google_rating) {
    breakdown.low_rating = 15;
    score += 15;
  }

  return { score: Math.min(score, 100), breakdown };
};

