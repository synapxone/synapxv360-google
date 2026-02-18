
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

export interface BrandKit {
  name: string;
  concept: string;
  tone: string[];
  services?: string[];
  logoDescription?: string;
  logoUrl?: string;
  symbolUrl?: string; // Símbolo isolado
  iconUrl?: string;   // Ícone de app/favicon
  logoVariations?: string[]; // Versões alternativas (p&b, negativa, etc)
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
  name: string;
  type: string;
  dimensions: string;
  imageUrl?: string;
  referenceImageUrl?: string;
  prompt: string;
  description: string;
  isMockup?: boolean;
  parentAssetId?: string;
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
