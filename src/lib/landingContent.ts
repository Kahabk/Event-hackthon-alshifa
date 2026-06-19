export type LandingSectionLayout = 'feature' | 'split' | 'banner';

export interface LandingEditorSection {
  id: string;
  title: string;
  eyebrow: string;
  body: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
  layout: LandingSectionLayout;
  visible: boolean;
  order: number;
}

export interface LandingEditorContent {
  sections: LandingEditorSection[];
  updatedAt?: unknown;
  updatedBy?: string;
  updatedByEmail?: string;
  updatedSection?: string;
}

export const landingContentCollection = 'siteContent';
export const landingContentDocId = 'landingPage';

export const defaultLandingSections: LandingEditorSection[] = [
  {
    id: 'editor-clinics',
    title: 'Expert Clinics Turn Ideas Into Stronger Pitches',
    eyebrow: 'Mentor Support',
    body: 'Teams can use the admin-managed landing blocks to announce clinics, mentor windows, finalist updates, gallery highlights, or any event-specific content without touching code.',
    imageUrl: '',
    ctaLabel: 'View Stages',
    ctaHref: '#schedule',
    layout: 'split',
    visible: false,
    order: 1,
  },
];

export const defaultLandingContent: LandingEditorContent = {
  sections: defaultLandingSections,
};

export const createLandingSection = (order: number): LandingEditorSection => ({
  id: `section-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  title: 'New landing section',
  eyebrow: 'Event Update',
  body: 'Write a useful event update for participants, mentors, judges, or visitors.',
  imageUrl: '',
  ctaLabel: 'Learn More',
  ctaHref: '#schedule',
  layout: 'feature',
  visible: true,
  order,
});

export const normalizeLandingContent = (content?: Partial<LandingEditorContent> | null): LandingEditorContent => {
  const sections = Array.isArray(content?.sections) ? content.sections : [];
  return {
    ...defaultLandingContent,
    ...content,
    sections: sections.map((section, index) => ({
      ...createLandingSection(index + 1),
      ...section,
      id: section.id || `section-${index + 1}`,
      order: Number.isFinite(Number(section.order)) ? Number(section.order) : index + 1,
      visible: section.visible !== false,
      layout: ['feature', 'split', 'banner'].includes(String(section.layout)) ? section.layout : 'feature',
    })).sort((a, b) => a.order - b.order),
  };
};
