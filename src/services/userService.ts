import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { QuestionnaireAnswers } from '@/lib/questionnaire';

export interface UserSearchRecord {
  id: string;
  query: string;
  category: string | null;
  answers: QuestionnaireAnswers;
  product_id: string | null;
  created_at: string;
}

export interface TrackedProductRecord {
  id: string;
  product_id: string;
  target_price: number | null;
  notify_email: boolean;
  created_at: string;
}

/**
 * Saves a user search query to Supabase `user_searches` table if authenticated.
 * Degrades gracefully on network/DB failure.
 */
export async function saveUserSearch(
  userId: string,
  query: string,
  category?: string,
  answers?: QuestionnaireAnswers,
  productId?: string
): Promise<{ success: boolean; searchId?: string; error?: string }> {
  if (!isSupabaseConfigured() || !userId) {
    return { success: false, error: 'Supabase auth disabled or not logged in' };
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('user_searches' as any)
      .insert({
        user_id: userId,
        query,
        category: category || null,
        answers: (answers as any) || {},
        product_id: productId || null,
      } as any)
      .select('id')
      .single();

    if (error) {
      console.warn('Failed to save search history:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, searchId: (data as any)?.id };
  } catch (err) {
    console.warn('Network error saving user search:', err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Fetches recent search history for an authenticated user.
 */
export async function getUserSearches(userId: string): Promise<UserSearchRecord[]> {
  if (!isSupabaseConfigured() || !userId) return [];

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('user_searches' as any)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.warn('Failed to fetch user searches:', error.message);
      return [];
    }

    return ((data as any[]) || []).map((row) => ({
      id: row.id,
      query: row.query,
      category: row.category,
      answers: (row.answers as QuestionnaireAnswers) || {},
      product_id: row.product_id,
      created_at: row.created_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Deletes a search history record by ID for the logged-in user.
 */
export async function deleteUserSearch(userId: string, searchId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !userId) return false;

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('user_searches' as any)
      .delete()
      .eq('id', searchId)
      .eq('user_id', userId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Tracks a product for price updates for the logged-in user.
 */
export async function trackProduct(
  userId: string,
  productId: string,
  targetPrice?: number
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !userId) {
    return { success: false, error: 'Please sign in to track product prices.' };
  }

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('user_tracked_products' as any).upsert({
      user_id: userId,
      product_id: productId,
      target_price: targetPrice || null,
      notify_email: true,
    } as any);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Untracks a product for the logged-in user.
 */
export async function untrackProduct(userId: string, productId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !userId) return false;

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('user_tracked_products' as any)
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Checks if a given product ID is tracked by the logged-in user.
 */
export async function isProductTracked(userId: string, productId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !userId || !productId) return false;

  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('user_tracked_products' as any)
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle();

    return Boolean(data);
  } catch {
    return false;
  }
}

/**
 * Fetches all tracked products for an authenticated user.
 */
export async function getTrackedProducts(userId: string): Promise<TrackedProductRecord[]> {
  if (!isSupabaseConfigured() || !userId) return [];

  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('user_tracked_products' as any)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return ((data as any[]) || []) as TrackedProductRecord[];
  } catch {
    return [];
  }
}
