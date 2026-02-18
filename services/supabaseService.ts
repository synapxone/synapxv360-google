
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';
import { UserProfile, Plan, CampaignState, Brand, DesignAsset } from '../types';

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

  async getAssets(userId: string): Promise<DesignAsset[]> {
    const { data, error } = await supabase.from('assets').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(a => ({
      id: a.id,
      brand_id: a.brand_id,
      group_id: a.group_id,
      group_title: a.group_title,
      name: a.name,
      type: a.type,
      dimensions: a.dimensions,
      imageUrl: a.image_url,
      videoUrl: a.video_url,
      audioUrl: a.audio_url,
      prompt: a.prompt,
      copy: a.copy,
      status: a.status,
      isMockup: a.is_mockup,
      metadata: a.metadata,
      created_at: a.created_at
    }));
  },

  async saveAsset(userId: string, asset: DesignAsset) {
    const payload = {
      user_id: userId,
      brand_id: asset.brand_id,
      group_id: asset.group_id,
      group_title: asset.group_title,
      name: asset.name,
      type: asset.type,
      dimensions: asset.dimensions,
      image_url: asset.imageUrl,
      video_url: asset.videoUrl,
      audio_url: asset.audioUrl,
      prompt: asset.prompt,
      copy: asset.copy,
      status: asset.status,
      is_mockup: asset.isMockup,
      metadata: asset.metadata
    };

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(asset.id);
    
    if (isUuid) {
      return await supabase.from('assets').update(payload).eq('id', asset.id).select().single();
    } else {
      return await supabase.from('assets').insert(payload).select().single();
    }
  },

  async deleteAsset(assetId: string) {
    return await supabase.from('assets').delete().eq('id', assetId);
  },

  async updateGroupTitle(groupId: string, newTitle: string) {
    return await supabase.from('assets').update({ group_title: newTitle }).eq('group_id', groupId);
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
    const cleanState = { activeBrandId: state.activeBrandId, brief: state.brief };
    return await supabase.from('projects').upsert({ 
      user_id: userId, 
      state_data: cleanState, 
      message_history: messages,
      updated_at: new Date()
    }, { onConflict: 'user_id' });
  },

  async uploadBrandLogo(userId: string, brandId: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop();
    const path = `brands/${userId}/${brandId}/logo.${ext}`;
    const { error } = await supabase.storage.from('brand-assets').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('brand-assets').getPublicUrl(path);
    return data.publicUrl;
  }
};
