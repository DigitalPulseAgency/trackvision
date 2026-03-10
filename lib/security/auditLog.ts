import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const serviceClient =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
        },
      })
    : null;

type LogParams = {
  userId?: string;
  action: string;
  tableName?: string;
  recordId?: string;
  oldValues?: object;
  newValues?: object;
  ipAddress?: string;
};

export const logAction = async (params: LogParams): Promise<void> => {
  if (!serviceClient) {
    return;
  }

  try {
    const { userId, action, tableName, recordId, oldValues, newValues, ipAddress } = params;

    await serviceClient.from('audit_logs').insert({
      user_id: userId ?? null,
      action,
      table_name: tableName ?? null,
      record_id: recordId ?? null,
      old_values: oldValues ?? null,
      new_values: newValues ?? null,
      ip_address: ipAddress ?? null,
      user_agent: null,
    });
  } catch {
    // Silent on purpose: logging must never block the app
  }
};

