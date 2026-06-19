import type { IdeaSubmission } from '../types';
import { TRACKS } from '../data';

export const formSettingsCollection = 'siteContent';
export const formSettingsDocId = 'formSettings';

export type IdeaFieldKey = keyof Pick<
  IdeaSubmission,
  | 'title'
  | 'problemStatement'
  | 'existingGaps'
  | 'proposedSolution'
  | 'innovation'
  | 'useCases'
  | 'architectureWorkflow'
  | 'technologyStack'
  | 'validation'
  | 'marketPotential'
  | 'businessModel'
  | 'demo'
  | 'futureScope'
  | 'impact'
  | 'conclusion'
>;

export type LinkFieldKey = keyof Pick<IdeaSubmission, 'demoUrl' | 'pitchUrl' | 'pptUrl'>;

export interface RegistrationFormSettings {
  eyebrow: string;
  title: string;
  teamSizes: number[];
  ideaStages: string[];
  declaration: string;
  submitLabel: string;
}

export interface DashboardDomainSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

export interface IdeaSectionSetting {
  key: IdeaFieldKey;
  title: string;
  placeholder: string;
  limit: number;
  rows: number;
  required: boolean;
  enabled: boolean;
}

export interface LinkFieldSetting {
  key: LinkFieldKey;
  title: string;
  placeholder: string;
  limit: number;
  required: boolean;
  enabled: boolean;
}

export interface EventFormSettings {
  registration: RegistrationFormSettings;
  dashboard: {
    title: string;
    subtitle: string;
    requireDomain: boolean;
    domains: DashboardDomainSetting[];
    sections: IdeaSectionSetting[];
    links: LinkFieldSetting[];
  };
  updatedAt?: unknown;
  updatedBy?: string;
  updatedByEmail?: string;
}

export const defaultFormSettings: EventFormSettings = {
  registration: {
    eyebrow: 'Team Registration',
    title: 'Register Your Team',
    teamSizes: [3, 4, 5],
    ideaStages: ['Idea', 'Validated Idea', 'Prototype'],
    declaration: 'I confirm the team details are correct and understand that teams must submit a pitch deck covering problem statement, SDG alignment, solution, impact, feasibility, scalability, and sustainability.',
    submitLabel: 'Register Now',
  },
  dashboard: {
    title: 'Idea Submission',
    subtitle: 'Build your submission section by section, keep each answer focused, and submit the final version only after adding the PPT link.',
    requireDomain: true,
    domains: TRACKS.map(track => ({
      id: track.id,
      title: track.title,
      description: track.description,
      enabled: true,
    })),
    sections: [
      ['title', 'Title', 120, 2, 'A clear, memorable title for your innovation.'],
      ['problemStatement', 'Problem Statement', 900, 5, 'Describe the real problem, who experiences it, where it happens, and why it matters.'],
      ['existingGaps', 'Existing Gaps', 900, 5, 'Explain what current solutions miss, where access fails, or what remains inefficient.'],
      ['proposedSolution', 'Proposed Solution', 1000, 6, 'Describe your solution in practical terms, including the user journey and core features.'],
      ['innovation', 'Innovation', 800, 4, 'Show what is new, different, simpler, more affordable, more inclusive, or more scalable.'],
      ['useCases', 'Use Cases', 900, 5, 'List the main users, situations, and scenarios where your solution creates value.'],
      ['architectureWorkflow', 'Architecture/Workflow', 1000, 6, 'Explain the workflow, system architecture, process flow, or implementation stages.'],
      ['technologyStack', 'Technology Stack', 700, 4, 'Mention tools, platforms, hardware, software, APIs, datasets, or materials you will use.'],
      ['validation', 'Validation', 900, 5, 'Share survey results, interviews, tests, assumptions checked, mentors consulted, or evidence collected.'],
      ['marketPotential', 'Market Potential', 900, 5, 'Describe target users, adoption potential, reach, demand, and why the timing is right.'],
      ['businessModel', 'Business Model', 900, 5, 'Explain revenue, cost, partnerships, operations, distribution, or sustainability model.'],
      ['demo', 'Demo', 600, 4, 'Describe the demo, prototype, mockup, pilot, or what you can show today.'],
      ['futureScope', 'Future Scope', 700, 4, 'Explain how the idea can improve after the challenge and what the next milestones are.'],
      ['impact', 'Impact', 800, 4, 'Connect your idea to SDG impact, people served, environmental/social benefit, and measurable outcomes.'],
      ['conclusion', 'Conclusion', 800, 5, 'End with a strong summary of why this problem matters and why your team can build the solution.'],
    ].map(([key, title, limit, rows, placeholder]) => ({
      key: key as IdeaFieldKey,
      title: title as string,
      limit: limit as number,
      rows: rows as number,
      placeholder: placeholder as string,
      required: true,
      enabled: true,
    })),
    links: [
      ['demoUrl', 'Demo or Prototype Link', 250, 'https://...', false],
      ['pitchUrl', 'Pitch Video / Supporting Link', 250, 'Drive, YouTube, Loom, GitHub, or portfolio link', false],
      ['pptUrl', 'PPT / Pitch Deck Link', 250, 'Drive or PDF link with view access', true],
    ].map(([key, title, limit, placeholder, required]) => ({
      key: key as LinkFieldKey,
      title: title as string,
      limit: limit as number,
      placeholder: placeholder as string,
      required: Boolean(required),
      enabled: true,
    })),
  },
};

export const normalizeFormSettings = (raw?: Partial<EventFormSettings> | null): EventFormSettings => {
  const registration: Partial<RegistrationFormSettings> = raw?.registration || {};
  const dashboard: Partial<EventFormSettings['dashboard']> = raw?.dashboard || {};

  return {
    ...defaultFormSettings,
    ...raw,
    registration: {
      ...defaultFormSettings.registration,
      ...registration,
      teamSizes: Array.isArray(registration.teamSizes) && registration.teamSizes.length
        ? registration.teamSizes.map(Number).filter(size => size >= 1 && size <= 8)
        : defaultFormSettings.registration.teamSizes,
      ideaStages: Array.isArray(registration.ideaStages) && registration.ideaStages.length
        ? registration.ideaStages.map(String).filter(Boolean)
        : defaultFormSettings.registration.ideaStages,
    },
    dashboard: {
      ...defaultFormSettings.dashboard,
      ...dashboard,
      domains: mergeByKey(defaultFormSettings.dashboard.domains, dashboard.domains || [], 'id'),
      sections: mergeByKey(defaultFormSettings.dashboard.sections, dashboard.sections || [], 'key'),
      links: mergeByKey(defaultFormSettings.dashboard.links, dashboard.links || [], 'key'),
    },
  };
};

function mergeByKey<T extends object>(defaults: T[], incoming: Partial<T>[], key: keyof T): T[] {
  const incomingByKey = new Map(incoming.map(item => [item[key], item]));
  return defaults.map(item => ({ ...item, ...(incomingByKey.get(item[key]) || {}) }));
}
