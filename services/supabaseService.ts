
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';
import { UserProfile, Brand, DesignAsset } from '../types';

const supabaseUrl = 'https://xdvesloxzummajzeszjk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkdmVzbG94enVtbWFqemVzemprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjk2NDcsImV4cCI6MjA4Njk0NTY0N30.DU8kgeRc2S4y71pYwPOXsZQN-L8FoKS6Th-TiVN_K3w';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Mapeadores auxiliares
const mapBrandFromDb = (dbBrand: any): Brand => ({
  id: dbBrand.id,
  name: dbBrand.name,
  website: dbBrand.website || '',
  instagram: dbBrand.instagram || '',
  competitorWebsites: dbBrand.competitor_websites || [],
  visualReferences: dbBrand.visual_references || [],
  kit: dbBrand.brand_kit && Object.keys(dbBrand.brand_kit).length > 0 ? dbBrand.brand_kit : undefined,
  created_at: dbBrand.created_at
});

// Corrigido: Adicionado a propriedade 'description' para satisfazer o tipo DesignAsset (Linha 22)
const mapAssetFromDb = (a: any): DesignAsset => ({
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
  description: a.description || '',
  status: a.status,
  isMockup: a.is_mockup,
  metadata: a.metadata,
  created_at: a.created_at,
  performance: a.performance
});

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
    return (data || []).map(mapBrandFromDb);
  },

  async saveBrand(userId: string, brand: Brand) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(brand.id);
    const payload: any = {
      user_id: userId,
      name: brand.name,
      website: brand.website,
      instagram: brand.instagram,
      competitor_websites: brand.competitorWebsites,
      visual_references: brand.visualReferences,
      brand_kit: brand.kit
    };

    let result;
    if (isUuid) {
      result = await supabase.from('brands').update(payload).eq('id', brand.id).select().single();
    } else {
      result = await supabase.from('brands').insert(payload).select().single();
    }

    if (result.error) return { data: null, error: result.error };
    return { data: mapBrandFromDb(result.data), error: null };
  },

  async deleteBrand(brandId: string) {
    return await supabase.from('brands').delete().eq('id', brandId);
  },

  async getAssets(userId: string): Promise<DesignAsset[]> {
    const { data, error } = await supabase.from('assets').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(mapAssetFromDb);
  },

  async saveAsset(userId: string, asset: DesignAsset) {
    // Corrigido: Incluído o campo 'description' no payload para persistência correta
    const payload: any = {
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
      description: asset.description,
      status: asset.status,
      is_mockup: asset.isMockup,
      metadata: asset.metadata,
      performance: asset.performance
    };

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(asset.id);
    
    let result;
    if (isUuid) {
      result = await supabase.from('assets').update(payload).eq('id', asset.id).select().single();
    } else {
      result = await supabase.from('assets').insert(payload).select().single();
    }

    if (result.error) return { data: null, error: result.error };
    return { data: mapAssetFromDb(result.data), error: null };
  },

  async deleteAsset(assetId: string) {
    return await supabase.from('assets').delete().eq('id', assetId);
  },

  async deleteAssetsByGroup(groupId: string) {
    return await supabase.from('assets').delete().eq('group_id', groupId);
  },

  async updateGroupTitle(groupId: string, newTitle: string) {
    return await supabase.from('assets').update({ group_title: newTitle }).eq('group_id', groupId);
  },

  async updateAssetPerformance(assetId: string, performance: any) {
    return await supabase.from('assets').update({ performance }).eq('id', assetId);
  },

  async uploadBrandLogo(userId: string, brandId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${userId}/${brandId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
    return data.publicUrl;
  }
};
