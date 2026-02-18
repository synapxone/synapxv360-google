
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';
import { UserProfile, Plan, CampaignState, Brand, DesignAsset } from '../types';

const supabaseUrl = 'https://xdvesloxzummajzeszjk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkdmVzbG94enVtbWFqemVzemprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjk2NDcsImV4cCI6MjA4Njk0NTY0N30.DU8kgeRc2S4y71pYwPOXsZQN-L8FoKS6Th-TiVN_K3w';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Mappers: DB (snake_case) → App (camelCase) ───────────────────────────────

function mapBrandFromDb(db: any): Brand {
  return {
    id: db.id,
    name: db.name,
    website: db.website || '',
    instagram: db.instagram || '',
    competitorWebsites: db.competitor_websites || [],
    visualReferences: db.visual_references || [],
    kit: db.brand_kit && Object.keys(db.brand_kit).length > 0 ? db.brand_kit : undefined,
    created_at: db.created_at,
  };
}

function mapAssetFromDb(db: any): DesignAsset {
  return {
    id: db.id,
    brand_id: db.brand_id || '',
    group_id: db.group_id || '',
    group_title: db.group_title || '',
    name: db.name || '',
    type: db.type || 'image',
    dimensions: db.dimensions || '1080x1080',
    imageUrl: db.image_url || undefined,
    videoUrl: db.video_url || undefined,
    audioUrl: db.audio_url || undefined,
    referenceImageUrl: db.reference_image_url || undefined,
    prompt: db.prompt || '',
    copy: db.copy || undefined,
    description: db.description || '',
    status: db.status || 'pending',
    isMockup: db.is_mockup || false,
    metadata: db.metadata || undefined,
    performance: db.performance || undefined,
    created_at: db.created_at,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const supabaseService = {

  // ── Perfil ──────────────────────────────────────────────────────────────────

  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) { console.error('getProfile error:', error); return null; }
    return data;
  },

  async updateCredits(userId: string, amount: number) {
    return await supabase.rpc('increment_credits', { user_id: userId, amount });
  },

  // ── Marcas ──────────────────────────────────────────────────────────────────

  async getBrands(userId: string): Promise<Brand[]> {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false, nullsFirst: false }); // Updated sorting
    if (error) { console.error('getBrands error:', error); return []; }
    return (data || []).map(mapBrandFromDb);
  },

  async saveBrand(userId: string, brand: Brand): Promise<{ data: Brand | null; error: any }> {
    const payload = {
      user_id: userId,
      name: brand.name,
      website: brand.website || '',
      instagram: brand.instagram || '',
      brand_kit: brand.kit || {},
      visual_references: brand.visualReferences || [],
      competitor_websites: brand.competitorWebsites || [],
      updated_at: new Date().toISOString(),
    };

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(brand.id);

    if (!isUuid) {
      const { data, error } = await supabase
        .from('brands')
        .insert(payload)
        .select()
        .single();
      if (error) { console.error('saveBrand insert error:', error); return { data: null, error }; }
      return { data: mapBrandFromDb(data), error: null };
    } else {
      const { data, error } = await supabase
        .from('brands')
        .update(payload)
        .eq('id', brand.id)
        .select()
        .single();
      if (error) { console.error('saveBrand update error:', error); return { data: null, error }; }
      return { data: mapBrandFromDb(data), error: null };
    }
  },

  async deleteBrand(brandId: string) {
    return await supabase.from('brands').delete().eq('id', brandId);
  },

  // ── Assets ───────────────────────────────────────────────────────────────────

  async getAssets(userId: string): Promise<DesignAsset[]> {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) { console.error('getAssets error:', error); return []; }
    return (data || []).map(mapAssetFromDb);
  },

  // Fix: return error object to satisfy usage in AssetEditor.tsx
  async saveAsset(userId: string, asset: DesignAsset): Promise<{ data: DesignAsset | null; error: any }> {
    const payload = {
      user_id: userId,
      brand_id: asset.brand_id || null,
      group_id: asset.group_id,
      group_title: asset.group_title || '',
      name: asset.name || '',
      type: asset.type || 'image',
      dimensions: asset.dimensions || '1080x1080',
      image_url: asset.imageUrl || null,
      video_url: asset.videoUrl || null,
      audio_url: asset.audioUrl || null,
      reference_image_url: asset.referenceImageUrl || null,
      prompt: asset.prompt || '',
      copy: asset.copy || null,
      description: asset.description || '',
      status: asset.status || 'pending',
      is_mockup: asset.isMockup || false,
      metadata: asset.metadata || null,
      performance: asset.performance || null,
    };

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(asset.id);

    if (isUuid) {
      const { data, error } = await supabase
        .from('assets')
        .update(payload)
        .eq('id', asset.id)
        .select()
        .single();
      if (error) { console.error('saveAsset update error:', error); return { data: null, error }; }
      return { data: mapAssetFromDb(data), error: null };
    } else {
      const { data, error } = await supabase
        .from('assets')
        .insert(payload)
        .select()
        .single();
      if (error) { console.error('saveAsset insert error:', error); return { data: null, error }; }
      return { data: mapAssetFromDb(data), error: null };
    }
  },

  async deleteAsset(assetId: string): Promise<void> {
    const { error } = await supabase.from('assets').delete().eq('id', assetId);
    if (error) console.error('deleteAsset error:', error);
  },

  async updateGroupTitle(groupId: string, newTitle: string): Promise<void> {
    const { error } = await supabase
      .from('assets')
      .update({ group_title: newTitle })
      .eq('group_id', groupId);
    if (error) console.error('updateGroupTitle error:', error);
  },

  async deleteAssetsByGroup(groupId: string): Promise<void> {
    const { error } = await supabase.from('assets').delete().eq('group_id', groupId);
    if (error) console.error('deleteAssetsByGroup error:', error);
  },

  async updateAssetPerformance(assetId: string, performance: any): Promise<void> {
    const { error } = await supabase
      .from('assets')
      .update({ performance })
      .eq('id', assetId);
    if (error) console.error('updateAssetPerformance error:', error);
  },

  // ── Projeto (legado — mantido para fallback) ─────────────────────────────────

  async saveProjectState(userId: string, state: CampaignState, messages: any[]) {
    const cleanState = {
      brands: state.brands,
      activeBrandId: state.activeBrandId,
      assets: state.assets,
      brief: state.brief,
    };
    return await supabase
      .from('projects')
      .upsert(
        { user_id: userId, state_data: cleanState, message_history: messages, updated_at: new Date() },
        { onConflict: 'user_id' }
      );
  },

  // ── Planos ───────────────────────────────────────────────────────────────────

  async getPlans(): Promise<Plan[]> {
    const { data } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    return data || [];
  },
};
