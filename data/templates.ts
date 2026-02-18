
export interface CreativeTemplate {
  id: string;
  name: string;
  format: '1:1' | '9:16' | '16:9';
  category: 'product' | 'lifestyle' | 'typographic' | 'abstract' | 'testimonial';
  compositionPrompt: string; // injetado no prompt do agente social/mockup
  copyStructure: string;     // estrutura do copy para o agente copy
}

export const TEMPLATES: CreativeTemplate[] = [
  {
    id: 'hero-product',
    name: 'Hero de Produto',
    format: '1:1',
    category: 'product',
    compositionPrompt: 'Product centered, floating on minimal background, dramatic rim lighting from behind, extreme close-up texture detail visible, negative space on left third for copy overlay, no text no logo',
    copyStructure: 'Headline impactante (máx 5 palavras) + Benefício principal + CTA direto'
  },
  {
    id: 'lifestyle-context',
    name: 'Lifestyle Contextual',
    format: '9:16',
    category: 'lifestyle',
    compositionPrompt: 'Candid lifestyle scene, subject in natural environment interacting with product organically, golden hour natural light, rule of thirds composition, editorial photography style, shallow depth of field, no text no logo',
    copyStructure: 'Abertura com dor/desejo + Solução implícita + Prova social + CTA'
  },
  {
    id: 'typographic-bold',
    name: 'Tipográfico Bold',
    format: '9:16',
    category: 'typographic',
    compositionPrompt: 'Abstract background with brand color palette as gradient, geometric shapes as supporting elements, large negative space in center for typography, cinematic color grade, no text no logo',
    copyStructure: 'Uma frase impactante que define a marca (máx 4 palavras) em display + subtítulo de suporte'
  },
  {
    id: 'social-proof',
    name: 'Prova Social',
    format: '1:1',
    category: 'testimonial',
    compositionPrompt: 'Clean minimal background in brand neutral color, soft professional lighting, editorial portrait style if person present, geometric frame element in brand accent color, bottom third clear for testimonial text, no text no logo',
    copyStructure: 'Citação do cliente entre aspas + Nome e cargo + Resultado quantificado'
  },
  {
    id: 'abstract-brand',
    name: 'Abstrato de Marca',
    format: '1:1',
    category: 'abstract',
    compositionPrompt: 'Abstract macro photography or 3D render expressing brand concept, brand colors as dominant palette, symmetrical or golden ratio composition, ultra high detail texture, museum quality lighting, no text no logo',
    copyStructure: 'Headline conceitual (metáfora da marca) + Tagline + CTA suave'
  },
  {
    id: 'before-after',
    name: 'Transformação',
    format: '9:16',
    category: 'lifestyle',
    compositionPrompt: 'Split composition: left side desaturated muted tones representing before state, right side vibrant brand colors representing after state, seamless diagonal split line, consistent lighting across both sides, no text no logo',
    copyStructure: 'Problema → Solução em formato de contraste visual + CTA com urgência'
  },
  {
    id: 'product-detail',
    name: 'Detalhe de Produto',
    format: '1:1',
    category: 'product',
    compositionPrompt: 'Extreme macro close-up of product texture or key feature, shallow depth of field f/1.2, studio lighting with colored gel matching brand accent color, black or dark background, water droplets or material texture visible, no text no logo',
    copyStructure: 'Feature específica como headline + Diferencial técnico + CTA de prova'
  },
  {
    id: 'banner-wide',
    name: 'Banner Wide',
    format: '16:9',
    category: 'product',
    compositionPrompt: 'Product or hero element positioned left third, dramatic environment right two-thirds, cinematic panoramic composition, anamorphic lens flare, color graded to brand palette, large negative space center-right for copy overlay, no text no logo',
    copyStructure: 'Headline à direita + Subtítulo + CTA com seta direcional'
  }
];
