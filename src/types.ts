export interface Track {
  id: string;
  title: string;
  iconName: string;
  description: string;
  challenges: string[];
  color: 'green' | 'white' | 'black';
}

export interface Highlight {
  id: string;
  title: string;
  description: string;
  iconName: string;
  color: 'white' | 'green' | 'black';
}

export interface ScheduleItem {
  time: string;
  title: string;
  description: string;
  category: 'ceremony' | 'sprint' | 'mentoring' | 'event';
}

export interface DaySchedule {
  day: string;
  date: string;
  items: ScheduleItem[];
}

export interface Prize {
  place: string;
  amount: string;
  rewards: string[];
  color: 'white' | 'black' | 'green';
  iconName: string;
}

export interface Mentor {
  name: string;
  role: string;
  description: string;
  linkedin: string;
  colorClass: string;
  techStack: string[];
}

export interface Testimonial {
  text: string;
  author: string;
  role: string;
  team: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface TeamMember {
  name: string;
  email?: string;
}

export interface Registration {
  registrationId?: string;
  teamName: string;
  teamNameKey?: string;
  leaderName: string;
  leaderEmail: string;
  phoneNumber: string;
  location: string;
  collegeName: string;
  fieldOfStudy: string;
  teamSize: number;
  members: TeamMember[];
  track: string;
  experienceLevel: string;
  githubUrl?: string;
  agreeToCodeOfConduct: boolean;
  accessStatus?: 'enabled' | 'disabled';
  accessUpdatedAt?: unknown;
  accessResetRequestedAt?: unknown;
  reviewStatus?: 'pending' | 'under-review' | 'approved' | 'rejected' | 'needs-revision';
  currentRound?: string;
}

export interface StoredRegistration extends Registration {
  id: string;
  userId: string;
  accountEmail?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AccountRegistration {
  userId: string;
  accountEmail?: string;
  teamName: string;
  registrationId?: string;
  registrationSummary?: Registration;
  createdAt?: unknown;
}

export interface IdeaSubmission {
  id?: string;
  userId?: string;
  registrationId?: string;
  teamName: string;
  teamNameKey?: string;
  leaderEmail?: string;
  track?: string;
  title: string;
  problemStatement: string;
  existingGaps: string;
  proposedSolution: string;
  innovation: string;
  useCases: string;
  architectureWorkflow: string;
  technologyStack: string;
  validation: string;
  marketPotential: string;
  businessModel: string;
  demo: string;
  demoUrl: string;
  pitchUrl: string;
  pptUrl: string;
  futureScope: string;
  impact: string;
  conclusion: string;
  status?: 'draft' | 'submitted';
  submittedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}
