
export type Role = 'user' | 'admin' | 'superadmin';
export type Language = 'pt' | 'en' | 'es';

export interface Plan {
  id: string;
  name: string;
  price: number;
  credits: number;
  features: string[];
  is_active: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: Role;
  plan_id: string;
  credits_remaining: number;
  created_at: string;
}

export interface CreativeBrief {
  objetivo: string;
  publico_target: string;
  tom_de_voz: string;
  cores_hex: string[];
  conceito_criativo: string;
  referencias_esteticas: string;
  formatos: string[];
  headline: string;
  descricao_cena: string;
}

export interface BrandKit {
  name: string;
  concept: string;
  tone: string[];
  services?: string[];
  logoDescription?: string;
  logoUrl?: string;
  symbolUrl?: string; 
  iconUrl?: string;   
  logoVariations?: string[]; 
  hasExistingLogo?: boolean;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    neutralLight: string;
    neutralDark: string;
  };
  typography: {
    display: string;
    body: string;
    mono: string;
  };
  guidelines?: {
    do: string[];
    dont: string[];
  };
}

export interface Brand {
  id: string;
  name: string;
  website?: string;
  instagram?: string;
  visualReferences?: string[]; 
  videoReferences?: string[];
  kit?: BrandKit;
  created_at?: string;
}

export interface DesignAsset {
  id: string;
  brand_id: string;
  group_id: string;
  group_title: string;
  name: string;
  type: string;
  dimensions: string;
  imageUrl?: string;
  referenceImageUrl?: string;
  prompt: string;
  description: string;
  copy?: string;
  status?: 'pending' | 'approved' | 'rejected';
  isMockup?: boolean;
  parentAssetId?: string;
  created_at?: string;
}

export interface MockupTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  prompt: string;
}

export interface CampaignState {
  brands: Brand[];
  activeBrandId: string | null;
  assets: DesignAsset[];
  brief: {
    objective: string;
    audience: string;
    positioning: string;
    visualTone: string;
  } | null;
}

export interface GroundingSource {
  title?: string;
  uri?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  referenceImage?: string;
  groundingSources?: GroundingSource[];
  metadata?: any;
}
