import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kiynfcgdtmfcfmkgsyxo.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeW5mY2dkdG1mY2Zta2dzeXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MzgwMTIsImV4cCI6MjA5NDExNDAxMn0.syy12NSWcLNGEJ5iOmi88zO3Jxshu-WNi4QUOk89GWM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Sign up new user with email and password
 */
export async function signUp(email, password) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Sign up error:', err);
    throw err;
  }
}

/**
 * Sign in existing user
 */
export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Sign in error:', err);
    throw err;
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (err) {
    console.error('Sign out error:', err);
    throw err;
  }
}

/**
 * Get current session user safely with timeout to prevent mobile hang
 */
export async function getCurrentUser() {
  try {
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => resolve({ data: { session: null }, error: null }), 2500)
    );
    const { data, error } = await Promise.race([sessionPromise, timeoutPromise]);
    if (error || !data?.session?.user) {
      return null;
    }
    return data.session.user;
  } catch (err) {
    console.warn('Could not read Supabase session:', err);
    return null;
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
}

/**
 * Load cloud ledger data for a user
 */
export async function loadUserData(userId) {
  if (!userId) return null;
  try {
    const queryPromise = supabase
      .from('ledger_user_data')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => resolve({ data: null, error: null }), 4000)
    );

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
    if (error) {
      console.warn('Error fetching cloud data:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('Error loading cloud user data:', err);
    return null;
  }
}

/**
 * Save cloud ledger data for a user
 */
export async function saveUserData(userId, payload) {
  if (!userId) return false;
  try {
    const { error } = await supabase
      .from('ledger_user_data')
      .upsert(
        {
          user_id: userId,
          core_data: payload.core || {},
          transactions: payload.transactions || [],
          pending_sms: payload.pendingSMS || [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error saving cloud user data:', err);
    return false;
  }
}
