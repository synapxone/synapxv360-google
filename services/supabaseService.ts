
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';
import { UserProfile, Plan, CampaignState, Brand } from '../types';

const supabaseUrl = 'https://xdvesloxzummajzeszjk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkdmVzbG94enVtbWFqemVzemprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjk2NDcsImV4cCI6MjA4Njk0NTY0N30.DU8kgeRc2S4y71pYwPOXsZQN-L8FoKS6Th-TiVN_K3w';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseService = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    return error ? null : data;
  },

  async updateCredits(userId: string, amount: number) {
    return await supabase.rpc('increment_credits', { user_id: userId, amount: amount });
  },

  async getBrands(userId: string): Promise<Brand[]> {
    const { data, error } = await supabase.from('brands').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(dbBrand => ({
      id: dbBrand.id,
      name: dbBrand.name,
      website: dbBrand.website || '',
      instagram: dbBrand.instagram || '',
      visualReferences: dbBrand.visual_references || [],
      kit: dbBrand.brand_kit && Object.keys(dbBrand.brand_kit).length > 0 ? dbBrand.brand_kit : undefined,
      created_at: dbBrand.created_at
    }));
  },

  async saveBrand(userId: string, brand: Brand) {
    const payload = {
      user_id: userId,
      name: brand.name,
      website: brand.website || '',
      instagram: brand.instagram || '',
      brand_kit: brand.kit || {},
      visual_references: brand.visualReferences || []
    };

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(brand.id);

    if (!isUuid) {
      const { data, error } = await supabase.from('brands').insert(payload).select().single();
      if (error) throw error;
      return { data, error: null };
    } else {
      const { data, error } = await supabase.from('brands').update(payload).eq('id', brand.id).select().single();
      if (error) throw error;
      return { data, error: null };
    }
  },

  async deleteBrand(brandId: string) {
    return await supabase.from('brands').delete().eq('id', brandId);
  },

  async saveProjectState(userId: string, state: CampaignState, messages: any[]) {
    const cleanState = { assets: state.assets, activeBrandId: state.activeBrandId, brief: state.brief };
    return await supabase.from('projects').upsert({ 
      user_id: userId, 
      state_data: cleanState, 
      message_history: messages,
      updated_at: new Date()
    }, { onConflict: 'user_id' });
  },

  async getPlans(): Promise<Plan[]> {
    const { data } = await supabase.from('plans').select('*').eq('is_active', true).order('price', { ascending: true });
    return data || [];
  }
};
