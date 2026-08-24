import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Gates the /leads dashboard and its API routes to the single owner account.
// Returns the owner's email on success, or null if the request isn't from them.
export async function requireOwner() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
        set() {},
        remove() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || user.email !== process.env.OWNER_EMAIL) return null;

  return user.email;
}
