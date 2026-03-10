import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sanitizeUrl } from '@/lib/security/sanitize';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { logAction } from '@/lib/security/auditLog';
import { performAudit } from '@/services/scraper';

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.ip ??
      'unknown';

    const allowed = checkRateLimit(ip, '/api/scraper');
    if (!allowed) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    const urlRaw = body?.url;

    if (!urlRaw || typeof urlRaw !== 'string') {
      return NextResponse.json({ error: 'URL manquante' }, { status: 400 });
    }

    let cleanUrl: string;
    try {
      cleanUrl = sanitizeUrl(urlRaw);
    } catch (err: any) {
      return NextResponse.json(
        { error: err?.message ?? 'URL invalide' },
        { status: 400 },
      );
    }

    const result = await performAudit(cleanUrl);

    await logAction({
      userId: session.user.id,
      action: 'scraper_audit',
      tableName: 'leads',
      newValues: { url: cleanUrl, audit: result },
      ipAddress: ip,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur interne du scraper' },
      { status: 500 },
    );
  }
}

