import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sanitizeInput } from '@/lib/security/sanitize';
import { logAction } from '@/lib/security/auditLog';

const leadSchema = z.object({
  company_name: z.string().min(2).max(200),
  contact_name: z.string().optional(),
  contact_first_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')).transform((v) => (v === '' ? undefined : v)),
  phone: z.string().optional(),
  city: z.string().optional(),
  niche: z.string().min(2),
  audit_score: z.number().int().min(0).max(100).optional(),
});

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Erreur lors de la récupération des leads' }, { status: 500 });
  }

  return NextResponse.json(data ?? [], { status: 200 });
}

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
    const parsed = leadSchema.parse({
      ...json,
      company_name: sanitizeInput(json.company_name ?? ''),
      contact_name: json.contact_name ? sanitizeInput(json.contact_name) : undefined,
      contact_first_name: json.contact_first_name ? sanitizeInput(json.contact_first_name) : undefined,
      email: json.email,
      phone: json.phone ? sanitizeInput(json.phone) : undefined,
      city: json.city ? sanitizeInput(json.city) : undefined,
      niche: json.niche,
      audit_score: typeof json.audit_score === 'number' ? json.audit_score : undefined,
    });

    const { data, error } = await supabase
      .from('leads')
      .insert({
        ...parsed,
        created_by: session.user.id,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Erreur lors de la création du lead' }, { status: 500 });
    }

    await logAction({
      userId: session.user.id,
      action: 'lead_created',
      tableName: 'leads',
      recordId: data.id,
      newValues: data,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation invalide', details: err.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Erreur lors de la création du lead' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();

  const role = (profileRow as { role?: string } | null)?.role;
  if (role !== 'super_admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
  }

  const { data: existing } = await supabase.from('leads').select('*').eq('id', id).maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 });
  }

  const { error } = await supabase
    .from('leads')
    .update({ pipeline_status: 'lost' })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }

  await logAction({
    userId: session.user.id,
    action: 'lead_soft_delete',
    tableName: 'leads',
    recordId: id,
    oldValues: existing,
    newValues: { pipeline_status: 'lost' },
  });

  return NextResponse.json({ success: true }, { status: 200 });
}

