'use client';

import { supabaseBrowser } from '@/lib/supabase/browserClient';

async function getAccessToken(): Promise<string | null> {
  const sb = supabaseBrowser();
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function adminGet<T>(url: string): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? 'Request failed');
  return json as T;
}

export async function adminPost<T>(url: string, body: unknown): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? 'Request failed');
  return json as T;
}

export async function adminDelete<T>(url: string): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? 'Request failed');
  return json as T;
}