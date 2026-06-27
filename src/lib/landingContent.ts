import { FAQS, MENTORS, PRIZES, SCHEDULE, TRACKS } from '../data';
import { getStaticLandingAssetById, staticLandingAssets } from './landingAssets';
import type { LandingAssetType } from './landingAssets';

export type LandingSectionType = 'about' | 'domains' | 'stages' | 'prizes' | 'mentors' | 'faq' | 'glimpses' | 'gallery' | 'highlights' | 'testimonials' | 'sponsors' | 'cta' | 'form-cta' | 'custom';
export type LandingButtonActionType = 'form' | 'external' | 'section' | 'none';
export type LandingButtonStyle = 'primary' | 'secondary' | 'dark' | 'outline';

export interface LandingButtonConfig {
  text: string;
  visible: boolean;
  style: LandingButtonStyle;
  actionType: LandingButtonActionType;
  formId: string;
  externalUrl: string;
  sectionId: string;
}
export type LandingFontFamily = 'Plus Jakarta Sans' | 'Manrope' | 'Inter' | 'Poppins' | 'DM Sans' | 'Outfit' | 'Nunito' | 'Roboto' | 'Space Grotesk' | 'JetBrains Mono';
export type LandingBorderRadius = 'sharp' | 'soft' | 'round';
export type LandingGradientAngle = '0deg' | '45deg' | '90deg' | '135deg' | '180deg';
export type LandingAlignment = 'left' | 'center';
export type LandingPreviewMode = 'desktop' | 'mobile';

export interface LandingLink {
  id: string;
  label: string;
  url: string;
}

export interface LandingHeaderConfig {
  logoText: string;
  navLinks: LandingLink[];
  buttonText: string;
  buttonUrl: string;
  showAdminButton: boolean;
  showRegisterButton: boolean;
  buttonConfig?: LandingButtonConfig;
}

export interface LandingHeroConfig {
  id: 'hero';
  type: 'hero';
  badge: string;
  heading: string;
  subheading: string;
  description: string;
  primaryButtonText: string;
  primaryButtonUrl: string;
  secondaryButtonText: string;
  secondaryButtonUrl: string;
  imageUrl: string;
  media?: LandingMedia;
  backgroundColor: string;
  textColor: string;
  alignment: LandingAlignment;
  visible: boolean;
  primaryButtonConfig?: LandingButtonConfig;
  secondaryButtonConfig?: LandingButtonConfig;
}

export interface LandingItem {
  id: string;
  title?: string;
  description?: string;
  icon?: string;
  color?: string;
  imageUrl?: string;
  media?: LandingMedia;
  amount?: string;
  role?: string;
  date?: string;
  url?: string;
  question?: string;
  answer?: string;
  socialLink?: string;
  visible?: boolean;
}

export interface LandingMedia {
  type: LandingAssetType;
  assetId?: string;
  url: string;
  thumbnailUrl?: string;
  alt?: string;
  title?: string;
  posterUrl?: string;
  fit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  position?: string;
  focalX?: number;
  focalY?: number;
  zoom?: number;
  rotate?: number;
}

export interface LandingSectionConfig {
  id: string;
  type: LandingSectionType;
  title: string;
  eyebrow?: string;
  description?: string;
  imageUrl?: string;
  media?: LandingMedia;
  visible: boolean;
  order: number;
  items: LandingItem[];
  // CTA-specific
  primaryButtonText?: string;
  primaryButtonUrl?: string;
  buttonConfig?: LandingButtonConfig;
  layoutStyle?: 'centered' | 'split' | 'card';
  // Appearance
  backgroundColor?: string;
  textColor?: string;
  gradient?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
  gradientAngle?: LandingGradientAngle;
  // Typography
  fontFamily?: LandingFontFamily;
  // Spacing
  paddingTop?: number;
  paddingBottom?: number;
  // Layout
  sectionAlignment?: LandingAlignment;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export interface LandingFooterConfig {
  logoText: string;
  description: string;
  links: LandingLink[];
  socialLinks: LandingLink[];
  copyrightText: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface LandingGlobalTheme {
  primaryFont: LandingFontFamily;
  headingFont: LandingFontFamily;
  primaryColor: string;
  accentColor: string;
  siteBackground: string;
  siteTextColor: string;
  borderRadius: LandingBorderRadius;
  cardBackground: string;
  navBackground: string;
}

export interface LandingEditorContent {
  header: LandingHeaderConfig;
  hero: LandingHeroConfig;
  sections: LandingSectionConfig[];
  footer: LandingFooterConfig;
  globalTheme?: LandingGlobalTheme;
  updatedAt?: unknown;
  updatedBy?: string;
  updatedByEmail?: string;
  updatedSection?: string;
}

export const defaultGlobalTheme: LandingGlobalTheme = {
  primaryFont: 'Plus Jakarta Sans',
  headingFont: 'Manrope',
  primaryColor: '#050816',
  accentColor: '#B9FF66',
  siteBackground: '#F8F5EF',
  siteTextColor: '#050816',
  borderRadius: 'round',
  cardBackground: '#FFFFFF',
  navBackground: '#FFFFFF',
};

export const landingContentCollection = 'siteContent';
export const landingContentDocId = 'landingPage';
export const landingDraftDocId = 'landingPageDraft';

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const link = (id: string, label: string, url: string): LandingLink => ({ id, label, url });
export const createLandingButtonConfig = (text = 'Learn more', url = ''): LandingButtonConfig => ({
  text,
  visible: true,
  style: 'primary',
  actionType: url.startsWith('#') ? 'section' : url ? 'external' : 'none',
  formId: '',
  externalUrl: url.startsWith('#') ? '' : url,
  sectionId: url.startsWith('#') ? url.slice(1) : '',
});
const mediaFromAsset = (assetId: string): LandingMedia => {
  const asset = getStaticLandingAssetById(assetId) || staticLandingAssets[0];
  return {
    type: asset.type,
    assetId: asset.id,
    url: asset.url,
    thumbnailUrl: asset.thumbnailUrl,
    alt: asset.alt,
    title: asset.title,
    fit: 'cover',
    focalX: 50,
    focalY: 50,
    zoom: 1,
  };
};

export const defaultLandingContent: LandingEditorContent = {
  header: {
    logoText: 'Shifa SDG',
    navLinks: [
      link('domains', 'Domains', '#tracks'),
      link('stages', 'Stages', '#schedule'),
      link('prizes', 'Prizes', '#prizes'),
      link('mentors', 'Mentors', '#mentors'),
      link('faq', 'FAQ', '#faq'),
    ],
    buttonText: 'Register',
    buttonUrl: '/register',
    showAdminButton: true,
    showRegisterButton: true,
    buttonConfig: { ...createLandingButtonConfig('Register', '/register'), actionType: 'external' },
  },
  hero: {
    id: 'hero',
    type: 'hero',
    badge: 'Grand Finale - 15 July 2026',
    heading: 'Shifa SDG Innovation Challenge Kerala 2026',
    subheading: 'Innovating for a Sustainable Future.',
    description: 'A Kerala-wide student innovation platform for SDG-focused ideas, expert clinics, pitch refinement, and finale-ready project showcases.',
    primaryButtonText: 'Register Now',
    primaryButtonUrl: '/register',
    secondaryButtonText: 'View Programme Stages',
    secondaryButtonUrl: '#schedule',
    imageUrl: mediaFromAsset('hero-main').url,
    media: mediaFromAsset('hero-main'),
    backgroundColor: '#F8F5EF',
    textColor: '#050816',
    alignment: 'left',
    visible: true,
    primaryButtonConfig: { ...createLandingButtonConfig('Register Now', '/register'), actionType: 'external' },
    secondaryButtonConfig: createLandingButtonConfig('View Programme Stages', '#schedule'),
  },
  sections: [
    {
      id: 'about',
      type: 'about',
      title: 'About the Challenge',
      description: 'Shifa SDG Innovation Challenge Kerala 2026 brings students, mentors, jury members, and ecosystem partners together to turn meaningful SDG ideas into pitch-ready solutions.',
      imageUrl: mediaFromAsset('hero-main').url,
      media: mediaFromAsset('hero-main'),
      visible: true,
      order: 1,
      items: [
        { id: 'about-1', title: 'Mentor Clinics', description: 'Structured expert feedback for sharper problem validation and practical implementation planning.', icon: 'Sparkles', color: '#B9FF66' },
        { id: 'about-2', title: 'Pitch Readiness', description: 'Guided preparation for solution workflow, prototype story, deck quality, and finalist presentation.', icon: 'Presentation', color: '#CDB0E7' },
        { id: 'about-3', title: 'SDG Impact', description: 'Ideas are reviewed for relevance, feasibility, sustainability, social value, and scale potential.', icon: 'Leaf', color: '#FFDA8A' },
      ],
    },
    {
      id: 'domains',
      type: 'domains',
      title: 'Domains',
      description: 'Explore the idea domains where student teams can submit SDG-focused solutions for real-world impact.',
      visible: true,
      order: 2,
      items: TRACKS.map(track => ({
        id: track.id,
        title: track.title,
        description: track.description,
        icon: track.iconName,
        color: track.color === 'green' ? '#B9FF66' : track.color === 'black' ? '#191A23' : '#FFFFFF',
      })),
    },
    {
      id: 'stages',
      type: 'stages',
      title: 'Programme Stages',
      description: 'Follow the journey from ideation to mentor clinics, finalist selection, and the Grand Finale.',
      visible: true,
      order: 3,
      items: SCHEDULE.map((stage, index) => ({
        id: `stage-${index + 1}`,
        title: `${stage.day}: ${stage.date}`,
        description: stage.items.map(item => item.description).join(' '),
        date: stage.items[0]?.time || String(index + 1),
      })),
    },
    {
      id: 'prizes',
      type: 'prizes',
      title: 'Prizes & Rewards',
      description: 'Compete for main awards, finalist support, and special recognition for SDG, social, and sustainable innovation.',
      visible: true,
      order: 4,
      items: PRIZES.map((prize, index) => ({
        id: `prize-${index + 1}`,
        title: prize.place,
        amount: prize.amount,
        description: prize.rewards.join(', '),
        icon: prize.iconName,
        color: prize.color === 'green' ? '#B9FF66' : prize.color === 'black' ? '#191A23' : '#FFFFFF',
      })),
    },
    {
      id: 'glimpses',
      type: 'glimpses',
      title: 'Event Glimpses',
      description: 'Student teams sharpening ideas through design thinking, mentoring, pitch practice, and impact storytelling.',
      visible: true,
      order: 5,
      items: [
        {
          id: 'glimpse-video-ignite',
          title: 'Innovation Bootcamp',
          description: 'Student teams sharpening ideas through design thinking, mentoring, and structured innovation sessions.',
          icon: 'Video',
          media: mediaFromAsset('glimpse-video-ignite'),
          visible: true,
        },
        {
          id: 'glimpse-video-pitch',
          title: 'Final Pitch Stage',
          description: 'Finalists presenting SDG-focused solutions to mentors, investors, industry leaders, and the jury panel.',
          icon: 'Video',
          media: mediaFromAsset('glimpse-video-pitch'),
          visible: true,
        },
        {
          id: 'glimpse-video-impact',
          title: 'Student Innovation',
          description: 'Young innovators transforming real-world problems into practical, sustainable, and scalable solutions.',
          icon: 'Video',
          media: mediaFromAsset('glimpse-video-impact'),
          visible: true,
        },
      ],
    },
    {
      id: 'gallery',
      type: 'gallery',
      title: 'Moments That Inspire Impact',
      description: 'A black-and-white visual wall for the spirit of Shifa SDG Innovation Challenge Kerala 2026.',
      visible: true,
      order: 6,
      items: [
        {
          id: 'gallery-1',
          title: 'Think With Purpose',
          description: 'The strongest ideas begin with a real problem and a student brave enough to ask why.',
          media: mediaFromAsset('glimpse-image-1'),
          visible: true,
        },
        {
          id: 'gallery-2',
          title: 'Build For People',
          description: 'Innovation becomes meaningful when it listens first, builds carefully, and improves lives.',
          media: mediaFromAsset('glimpse-image-2'),
          visible: true,
        },
        {
          id: 'gallery-3',
          title: 'Shape The Future',
          description: 'A sustainable future is built by teams that keep showing up.',
          media: mediaFromAsset('glimpse-image-3'),
          visible: true,
        },
        {
          id: 'gallery-4',
          title: 'Learn By Doing',
          description: 'Every refined pitch, tested idea, and honest feedback session moves impact closer.',
          media: mediaFromAsset('glimpse-image-4'),
          visible: true,
        },
        {
          id: 'gallery-5',
          title: 'Lead With Impact',
          description: 'When young innovators work together, small ideas can become solutions that serve many.',
          media: mediaFromAsset('glimpse-image-5'),
          visible: true,
        },
        {
          id: 'gallery-6',
          title: 'Create With Courage',
          description: 'The future belongs to students who turn concern into action.',
          media: mediaFromAsset('glimpse-image-6'),
          visible: true,
        },
      ],
    },
    {
      id: 'mentors',
      type: 'mentors',
      title: 'Mentors',
      description: 'Expert advisers help teams strengthen validation, product direction, technology choices, and pitch clarity.',
      visible: true,
      order: 7,
      items: MENTORS.map((mentor, index) => ({
        id: `mentor-${index + 1}`,
        title: mentor.name,
        role: mentor.role,
        description: mentor.description,
        imageUrl: staticLandingAssets.find(asset => asset.id === `profile-avatar-${index + 1}`)?.url || '',
        media: mediaFromAsset(`profile-avatar-${index + 1}`),
        socialLink: mentor.linkedin,
        visible: true,
      })),
    },
    {
      id: 'faq',
      type: 'faq',
      title: 'Frequently Asked Questions',
      description: 'Key details about eligibility, team size, fees, pitch deck submission, evaluation, and the Grand Finale.',
      visible: true,
      order: 8,
      items: FAQS.map((faq, index) => ({
        id: `faq-${index + 1}`,
        question: faq.question,
        answer: faq.answer,
      })),
    },
    {
      id: 'highlights',
      type: 'highlights',
      title: 'Why Join Shifa SDG?',
      eyebrow: 'Why Participate',
      description: 'Present, refine, and showcase ideas aligned with the Sustainable Development Goals through mentoring, feedback, and innovation exposure.',
      visible: true,
      order: 9,
      items: [
        { id: 'hl-1', title: '36-Hour Live Sprint', description: 'A focused innovation sprint to build, test, and present an SDG-focused idea under expert guidance.', icon: 'Timer', color: 'green' },
        { id: 'hl-2', title: 'AI-Powered Tools', description: 'Teams get access to AI tools, design resources, and structured mentoring for rapid prototype development.', icon: 'BrainCircuit', color: 'white' },
        { id: 'hl-3', title: 'Expert Clinics', description: 'One-on-one advisory sessions with mentors across healthcare, technology, social innovation, and sustainability.', icon: 'MessagesSquare', color: 'black' },
        { id: 'hl-4', title: 'SDG Network', description: 'Connect with students, mentors, and partners from across Kerala working on real-world SDG challenges.', icon: 'Network', color: 'white' },
        { id: 'hl-5', title: 'Live Showcase', description: 'Finalist teams present to judges, faculty, industry leaders, and a campus-wide audience at the Grand Finale.', icon: 'Tv', color: 'white' },
        { id: 'hl-6', title: 'Prizes & Funding', description: 'Top teams earn cash prizes, incubation support, certificates, and ecosystem visibility for their innovations.', icon: 'Coins', color: 'green' },
      ],
    },
    {
      id: 'testimonials',
      type: 'testimonials',
      title: 'What the Challenge Creates',
      eyebrow: 'Expected Outcomes',
      description: "The challenge is designed to build student capacity, generate ideas, engage colleges, and strengthen Shifa's long-term innovation ecosystem.",
      visible: true,
      order: 10,
      items: [
        { id: 'tm-1', title: 'Dr. Aisha Rahman', description: 'The Shifa SDG challenge gave our team the structured mentoring we needed to turn a vague healthcare idea into a pitch-ready solution.', role: 'Team Lead, Healthcare Track', answer: 'MedConnect Team' },
        { id: 'tm-2', title: 'Arjun Nair', description: 'In 36 hours, we designed a complete SDG-aligned solution, presented to expert judges, and walked away with both a prize and an incubation opportunity.', role: 'Co-founder, EdTech Track', answer: 'EduPath Team' },
        { id: 'tm-3', title: 'Priya Menon', description: 'The expert feedback on problem validation was invaluable. We completely rebuilt our pitch after the mentor clinic — and it was 10x stronger.', role: 'Product Designer', answer: 'GreenSolve Team' },
        { id: 'tm-4', title: 'Siddharth KV', description: 'The connections we made with mentors and other innovators at Shifa SDG have opened up real opportunities for our startup beyond the challenge itself.', role: 'Full Stack Developer', answer: 'DigitalGood Team' },
      ],
    },
    {
      id: 'sponsors',
      type: 'sponsors',
      title: 'Partners & Sponsors',
      eyebrow: 'PARTNERSHIP OPPORTUNITIES FOR INNOVATION, STARTUPS, MEDIA, AND ECOSYSTEM LEADERS',
      description: '',
      visible: true,
      order: 11,
      items: [
        { id: 'sp-1', title: 'Innovation Hub', description: 'IH', color: '#B9FF66' },
        { id: 'sp-2', title: 'TechBridge Kerala', description: 'TB', color: '#B9FF66' },
        { id: 'sp-3', title: 'StartupKerala', description: 'SK', color: '#B9FF66' },
        { id: 'sp-4', title: 'MedFirst India', description: 'MF', color: '#B9FF66' },
        { id: 'sp-5', title: 'EduFuture', description: 'EF', color: '#B9FF66' },
        { id: 'sp-6', title: 'GreenInnovate', description: 'GI', color: '#B9FF66' },
      ],
    },
    {
      id: 'cta',
      type: 'cta',
      title: 'Have an idea that can create impact?',
      eyebrow: 'REGISTRATION CTA',
      description: 'Form your team, submit your pitch deck, and take the first step toward creating sustainable impact through Shifa SDG Innovation Challenge Kerala 2026.',
      primaryButtonText: 'Register Now',
      primaryButtonUrl: '/register',
      visible: true,
      order: 12,
      items: [],
    },
  ],
  footer: {
    logoText: 'Shifa SDG Innovation Challenge Kerala 2026',
    description: 'A state-level student innovation platform by Shifa Group of Institutions focused on sustainability, entrepreneurship, and social impact.',
    links: [
      link('about', 'About', '#about'),
      link('domains', 'Programme Domains', '#tracks'),
      link('stages', 'Programme Stages', '#schedule'),
      link('prizes', 'Prizes', '#prizes'),
    ],
    socialLinks: [
      link('website', 'Website', '#'),
      link('x', 'X', 'https://twitter.com'),
      link('linkedin', 'LinkedIn', 'https://linkedin.com'),
    ],
    copyrightText: `© ${new Date().getFullYear()} Shifa SDG Innovation Challenge Kerala 2026. All rights reserved.`,
  },
};

export const createLandingItem = (type: LandingSectionType): LandingItem => {
  if (type === 'faq') return { id: uid('faq'), question: 'New question', answer: 'Add the answer here.' };
  if (type === 'mentors') return { id: uid('mentor'), title: 'Mentor name', role: 'Role', description: 'Short mentor bio.', imageUrl: '', socialLink: '' };
  if (type === 'glimpses') return { id: uid('glimpse'), title: 'Glimpse title', description: 'Video description', media: mediaFromAsset('glimpse-video-ignite'), visible: true };
  if (type === 'gallery') return { id: uid('gallery'), title: 'Gallery title', description: 'Image caption', media: mediaFromAsset('glimpse-image-1'), visible: true };
  if (type === 'prizes') return { id: uid('prize'), title: 'Prize title', amount: '₹0', description: 'Prize description', icon: 'Trophy', color: '#FFFFFF' };
  if (type === 'stages') return { id: uid('stage'), title: 'Stage title', description: 'Stage description', date: 'Order or date' };
  if (type === 'domains') return { id: uid('domain'), title: 'Domain title', description: 'Domain description', icon: 'Lightbulb', color: '#B9FF66' };
  if (type === 'highlights') return { id: uid('hl'), title: 'Highlight title', description: 'Why join benefit', icon: 'Sparkles', color: 'green' };
  if (type === 'testimonials') return { id: uid('tm'), title: 'Participant Name', description: 'Their quote here.', role: 'Role', answer: 'Team name' };
  if (type === 'sponsors') return { id: uid('sp'), title: 'Partner Name', description: 'PN', color: '#B9FF66' };
  return { id: uid('item'), title: 'Feature title', description: 'Feature description', icon: 'Sparkles', color: '#B9FF66' };
};

export const createLandingSection = (type: LandingSectionType, order: number): LandingSectionConfig => ({
  id: uid(type),
  type,
  title: type === 'form-cta' ? 'Ready to Join the Challenge?' : type === 'custom' ? 'Custom Section' : `${type[0].toUpperCase()}${type.slice(1)} Section`,
  description: type === 'form-cta' ? 'Choose a registration form and invite visitors to take the next step.' : '',
  imageUrl: '',
  visible: true,
  order,
  items: type === 'form-cta' ? [] : [createLandingItem(type)],
  buttonConfig: type === 'form-cta' ? { ...createLandingButtonConfig('Register now'), actionType: 'form' } : createLandingButtonConfig(),
  layoutStyle: 'centered',
});

const normalizeButtonConfig = (value: unknown, text: string, url = ''): LandingButtonConfig => {
  const raw = value as Partial<LandingButtonConfig> | undefined;
  const fallback = createLandingButtonConfig(text, url);
  return {
    ...fallback,
    ...raw,
    text: String(raw?.text || text),
    visible: raw?.visible !== false,
    style: ['primary', 'secondary', 'dark', 'outline'].includes(String(raw?.style)) ? raw!.style as LandingButtonStyle : fallback.style,
    actionType: ['form', 'external', 'section', 'none'].includes(String(raw?.actionType)) ? raw!.actionType as LandingButtonActionType : fallback.actionType,
    formId: String(raw?.formId || ''),
    externalUrl: String(raw?.externalUrl || fallback.externalUrl),
    sectionId: String(raw?.sectionId || fallback.sectionId),
  };
};

const normalizeLinks = (links: unknown, fallback: LandingLink[]) => {
  if (!Array.isArray(links)) return fallback;
  return links.map((item, index) => {
    const value = item as Partial<LandingLink>;
    return {
      id: String(value.id || `link-${index + 1}`),
      label: String(value.label || 'Link'),
      url: String(value.url || '#'),
    };
  });
};

const normalizeMedia = (media: unknown, fallbackUrl?: string): LandingMedia | undefined => {
  const value = media as Partial<LandingMedia> | undefined;
  const asset = getStaticLandingAssetById(value?.assetId);
  const url = asset?.url || value?.url || fallbackUrl || '';
  if (!url) return undefined;
  const inferredType: LandingAssetType = value?.type || asset?.type || (/\.(mp4|webm|mov)(\?|#|$)/i.test(url) ? 'video' : 'image');
  return {
    type: inferredType,
    assetId: value?.assetId || asset?.id,
    url,
    thumbnailUrl: value?.thumbnailUrl || asset?.thumbnailUrl,
    alt: value?.alt || asset?.alt || value?.title || asset?.title || '',
    title: value?.title || asset?.title,
    posterUrl: value?.posterUrl,
    fit: ['cover', 'contain', 'fill', 'none', 'scale-down'].includes(String(value?.fit)) ? value?.fit : 'cover',
    position: value?.position || `${Number.isFinite(Number(value?.focalX)) ? Number(value?.focalX) : 50}% ${Number.isFinite(Number(value?.focalY)) ? Number(value?.focalY) : 50}%`,
    focalX: Number.isFinite(Number(value?.focalX)) ? Number(value?.focalX) : 50,
    focalY: Number.isFinite(Number(value?.focalY)) ? Number(value?.focalY) : 50,
    zoom: Number.isFinite(Number(value?.zoom)) ? Math.min(Math.max(Number(value?.zoom), 1), 3) : 1,
    rotate: Number.isFinite(Number(value?.rotate)) ? Number(value?.rotate) : 0,
  };
};

const normalizeItems = (items: unknown, type: LandingSectionType) => {
  if (!Array.isArray(items)) return [] as LandingItem[];
  return items.map((item, index) => {
    const value = item as Partial<LandingItem>;
    const media = normalizeMedia(value.media, value.imageUrl);
    return {
      ...value,
      id: String(value.id || `${type}-item-${index + 1}`),
      color: value.color || (type === 'domains' ? '#B9FF66' : value.color),
      media,
      imageUrl: value.imageUrl || media?.url || '',
      visible: value.visible !== false,
    };
  });
};

export const normalizeLandingContent = (content?: Partial<LandingEditorContent> | null): LandingEditorContent => {
  const rawSections = Array.isArray(content?.sections) ? content.sections : [];
  const sections = rawSections.length
    ? rawSections.map((rawSection, index) => {
      const legacy = rawSection as LandingSectionConfig & {
        eyebrow?: string;
        body?: string;
        ctaLabel?: string;
        ctaHref?: string;
        layout?: string;
      };
      const type = ['about', 'domains', 'stages', 'prizes', 'mentors', 'faq', 'glimpses', 'gallery', 'highlights', 'testimonials', 'sponsors', 'cta', 'form-cta', 'custom'].includes(String(legacy.type))
        ? legacy.type as LandingSectionType
        : 'custom';
      return {
        id: String(legacy.id || `${type}-${index + 1}`),
        type,
        title: String(legacy.title || legacy.eyebrow || 'Landing section'),
        eyebrow: legacy.eyebrow ? String(legacy.eyebrow) : undefined,
        description: String(legacy.description || legacy.body || ''),
        imageUrl: String(legacy.imageUrl || legacy.media?.url || ''),
        media: normalizeMedia(legacy.media, legacy.imageUrl),
        visible: legacy.visible !== false,
        order: Number.isFinite(Number(legacy.order)) ? Number(legacy.order) : index + 1,
        items: normalizeItems(legacy.items, type),
        primaryButtonText: legacy.primaryButtonText,
        primaryButtonUrl: legacy.primaryButtonUrl,
        buttonConfig: legacy.buttonConfig
          ? normalizeButtonConfig(legacy.buttonConfig, legacy.primaryButtonText || 'Learn more', legacy.primaryButtonUrl || '')
          : {
              ...normalizeButtonConfig(undefined, legacy.primaryButtonText || 'Learn more', legacy.primaryButtonUrl || ''),
              visible: type === 'cta',
            },
        layoutStyle: legacy.layoutStyle === 'split' || legacy.layoutStyle === 'card' ? legacy.layoutStyle : 'centered',
        backgroundColor: legacy.backgroundColor,
        textColor: legacy.textColor,
        gradient: legacy.gradient,
        gradientFrom: legacy.gradientFrom,
        gradientTo: legacy.gradientTo,
        gradientAngle: legacy.gradientAngle,
        fontFamily: legacy.fontFamily,
        paddingTop: legacy.paddingTop,
        paddingBottom: legacy.paddingBottom,
        sectionAlignment: legacy.sectionAlignment,
        maxWidth: legacy.maxWidth,
      };
    })
    : defaultLandingContent.sections;

  const header = content?.header || defaultLandingContent.header;
  const hero = content?.hero || defaultLandingContent.hero;
  const footer = content?.footer || defaultLandingContent.footer;

  return {
    ...defaultLandingContent,
    ...content,
    header: {
      ...defaultLandingContent.header,
      ...header,
      navLinks: normalizeLinks(header.navLinks, defaultLandingContent.header.navLinks),
      buttonConfig: normalizeButtonConfig(header.buttonConfig, header.buttonText || 'Register', header.buttonUrl || '/register'),
    },
    hero: {
      ...defaultLandingContent.hero,
      ...hero,
      id: 'hero',
      type: 'hero',
      alignment: hero.alignment === 'center' ? 'center' : 'left',
      media: normalizeMedia(hero.media, hero.imageUrl),
      imageUrl: hero.imageUrl || normalizeMedia(hero.media)?.url || defaultLandingContent.hero.imageUrl,
      visible: hero.visible !== false,
      primaryButtonConfig: normalizeButtonConfig(hero.primaryButtonConfig, hero.primaryButtonText || 'Register Now', hero.primaryButtonUrl || '/register'),
      secondaryButtonConfig: normalizeButtonConfig(hero.secondaryButtonConfig, hero.secondaryButtonText || 'View Programme Stages', hero.secondaryButtonUrl || '#schedule'),
    },
    sections: sections
      .map((section, index) => ({ ...section, order: Number.isFinite(Number(section.order)) ? Number(section.order) : index + 1 }))
      .sort((a, b) => a.order - b.order),
    footer: {
      ...defaultLandingContent.footer,
      ...footer,
      links: normalizeLinks(footer.links, defaultLandingContent.footer.links),
      socialLinks: normalizeLinks(footer.socialLinks, defaultLandingContent.footer.socialLinks),
    },
  };
};
