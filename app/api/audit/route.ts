import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateCallHook } from '@/services/hookGenerator';
import type { AuditResult } from '@/types';

const bodySchema = z.object({
  firstName: z.string().min(1),
  companyName: z.string().min(1),
  city: z.string().min(1),
  niche: z.string().min(1),
  auditResult: z.custom<AuditResult>(),
});

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  if (!json) {
    return NextResponse.json({ error: 'Payload invalide' }, { status: 400 });
  }

  try {
    const parsed = bodySchema.parse(json);

    const script = generateCallHook({
      firstName: parsed.firstName,
      companyName: parsed.companyName,
      city: parsed.city,
      niche: parsed.niche,
      audit: parsed.auditResult,
    });

    return NextResponse.json({ script }, { status: 200 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation invalide', details: err.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Erreur lors de la génération du script' }, { status: 500 });
  }
}

