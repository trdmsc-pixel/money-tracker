import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kiynfcgdtmfcfmkgsyxo.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeW5mY2dkdG1mY2Zta2dzeXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MzgwMTIsImV4cCI6MjA5NDExNDAxMn0.syy12NSWcLNGEJ5iOmi88zO3Jxshu-WNi4QUOk89GWM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Sign up new user with email and password
 */
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/**
 * Sign in existing user
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/**
 * Sign out current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get current session user
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Load cloud ledger data for a user
 */
export async function loadUserData(userId) {
  try {
    const { data, error } = await supabase
      .from('ledger_user_data')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error loading cloud user data:', err);
    return null;
  }
}

/**
 * Save cloud ledger data for a user
 */
export async function saveUserData(userId, payload) {
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
