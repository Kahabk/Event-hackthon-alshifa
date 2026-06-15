import { Track, Highlight, DaySchedule, Prize, Mentor, Testimonial, FAQItem } from './types';

export const SPONSORS = [
  { name: 'Kerala Startup Mission', logoText: 'KSUM' },
  { name: 'Knowledge Partner', logoText: 'KNOW' },
  { name: 'Innovation Partner', logoText: 'INNO' },
  { name: 'Startup Partner', logoText: 'START' },
  { name: 'Media Partner', logoText: 'MEDIA' },
  { name: 'Shifa Group of Institutions', logoText: 'SHIFA' }
];

export const HIGHLIGHTS: Highlight[] = [
  {
    id: 'highlight-1',
    title: 'State-Level Platform',
    description: 'Showcase your innovative idea at a Kerala-wide student innovation platform with colleges from across the state.',
    iconName: 'Timer',
    color: 'white'
  },
  {
    id: 'highlight-2',
    title: 'SDG-Focused Ideas',
    description: 'Build solutions aligned with the United Nations Sustainable Development Goals and real-world community needs.',
    iconName: 'Cpu',
    color: 'green'
  },
  {
    id: 'highlight-3',
    title: 'Expert Mentoring',
    description: 'Get structured feedback from mentors, industry professionals, startup founders, and ecosystem leaders.',
    iconName: 'MessagesSquare',
    color: 'black'
  },
  {
    id: 'highlight-4',
    title: 'Investor Connect',
    description: 'Meet investors, startup enablers, industry partners, alumni entrepreneurs, and innovation ecosystem partners.',
    iconName: 'Network',
    color: 'green'
  },
  {
    id: 'highlight-5',
    title: 'Innovation Showcase',
    description: 'Present refined ideas through an expo, final pitch competition, media coverage, and social promotion.',
    iconName: 'Tv',
    color: 'black'
  },
  {
    id: 'highlight-6',
    title: 'Cash Prizes',
    description: 'Compete for main awards, finalist support, and special recognition for social and sustainable innovation.',
    iconName: 'Coins',
    color: 'white'
  }
];

export const TRACKS: Track[] = [
  {
    id: 'track-healthcare',
    title: 'Healthcare Innovation',
    iconName: 'BrainCircuit',
    description: 'Solutions that improve access, prevention, care delivery, diagnostics, and public health outcomes.',
    challenges: [
      'Define a clear healthcare problem and target users or beneficiaries',
      'Show SDG alignment, feasibility, and expected impact',
      'Plan a practical prototype or implementation pathway'
    ],
    color: 'green'
  },
  {
    id: 'track-education',
    title: 'Education Technology',
    iconName: 'Terminal',
    description: 'Ideas that strengthen learning, inclusion, skill development, and student support systems.',
    challenges: [
      'Identify a learning challenge faced by students, teachers, or institutions',
      'Explain how the solution can scale across colleges or communities',
      'Prepare a pitch deck with impact potential and sustainability'
    ],
    color: 'white'
  },
  {
    id: 'track-agriculture',
    title: 'Agriculture and Food Systems',
    iconName: 'Bot',
    description: 'Student ideas for agriculture, food systems, rural livelihoods, and resilient local supply chains.',
    challenges: [
      'Address farmer, food, supply, or resource challenges with a clear solution',
      'Validate practical feasibility and local relevance',
      'Connect the idea to sustainability and measurable community benefit'
    ],
    color: 'white'
  },
  {
    id: 'track-sustainability',
    title: 'Climate and Sustainability',
    iconName: 'Leaf',
    description: 'Solutions for clean energy, waste management, climate action, and sustainable communities.',
    challenges: [
      'Show how the idea reduces waste, emissions, risk, or resource use',
      'Explain long-term sustainability and scalability',
      'Prepare evidence for SDG impact and implementation readiness'
    ],
    color: 'white'
  },
  {
    id: 'track-digital',
    title: 'AI and Digital Technology',
    iconName: 'TrendingUp',
    description: 'Digital, AI, data, and inclusive technology ideas that solve meaningful real-world problems.',
    challenges: [
      'Use technology responsibly to address a validated problem',
      'Describe the innovation factor and technical feasibility',
      'Plan prototype development, testing, and future deployment'
    ],
    color: 'white'
  },
  {
    id: 'track-social',
    title: 'Social Innovation',
    iconName: 'Lightbulb',
    description: 'Community development and inclusive solutions designed for social impact and accessibility.',
    challenges: [
      'Focus on a real social problem with defined beneficiaries',
      'Show measurable impact potential and inclusion',
      'Build a sustainable model for adoption and long-term value'
    ],
    color: 'white'
  }
];

export const SCHEDULE: DaySchedule[] = [
  {
    day: 'Stage 1',
    date: 'Ideation',
    items: [
      {
        time: 'Registration to submission',
        title: 'Ideation',
        description: 'Teams submit an initial pitch deck covering problem statement, SDG alignment, proposed solution, and impact potential.',
        category: 'event'
      }
    ]
  },
  {
    day: 'Stage 2',
    date: 'IGNITE',
    items: [
      {
        time: 'To be announced',
        title: 'IGNITE Innovation Bootcamp',
        description: 'All participating teams attend sessions on design thinking, business model canvas, pitch deck preparation, and startup ecosystem awareness.',
        category: 'ceremony'
      },
      {
        time: 'Bootcamp sessions',
        title: 'Skill Building',
        description: 'The bootcamp equips students with tools to improve ideas and prepare for expert review.',
        category: 'mentoring'
      }
    ]
  },
  {
    day: 'Stage 3',
    date: 'INSPIRE',
    items: [
      {
        time: 'Expert clinics',
        title: 'INSPIRE Expert Clinics',
        description: 'Teams are grouped by domains and connected with relevant mentors for personalized feedback, technical suggestions, and improvement recommendations.',
        category: 'mentoring'
      }
    ]
  },
  {
    day: 'Stage 4',
    date: 'ELEVATE',
    items: [
      {
        time: 'Two weeks',
        title: 'ELEVATE Innovation Sprint',
        description: 'Selected teams refine ideas through mentor consultations, market validation, solution refinement, pitch deck improvement, and prototype planning.',
        category: 'sprint'
      }
    ]
  },
  {
    day: 'Stage 5',
    date: 'Impact Check',
    items: [
      {
        time: 'Review phase',
        title: 'Impact Check',
        description: 'Revised pitch decks are evaluated on problem relevance, innovation, feasibility, SDG impact, scalability, and sustainability.',
        category: 'event'
      },
      {
        time: 'Top 10',
        title: 'Finalist Selection',
        description: 'The Top 10 finalist teams are selected for the Grand Finale.',
        category: 'ceremony'
      }
    ]
  },
  {
    day: 'Stage 6',
    date: 'Spotlight',
    items: [
      {
        time: 'To be announced',
        title: 'Spotlight',
        description: 'Finalist teams are officially announced through media campaigns, social media promotion, press coverage, and partner invitations.',
        category: 'event'
      }
    ]
  },
  {
    day: 'Stage 7',
    date: 'Grand Finale',
    items: [
      {
        time: '15 July 2026',
        title: 'Grand Finale',
        description: 'Finalists, mentors, investors, industry leaders, startup founders, and academic representatives gather for the innovation expo and final pitch competition.',
        category: 'ceremony'
      },
      {
        time: '3:00 PM - 10:00 PM',
        title: 'Finale Programme',
        description: 'Innovation Expo, Investor Networking, Fireside Chat, Final Pitch Competition, Jury Deliberation, Awards Ceremony, and Networking Dinner.',
        category: 'event'
      }
    ]
  }
];

export const PRIZES: Prize[] = [
  {
    place: '1st Runner-Up',
    amount: '₹25,000',
    rewards: [
      'Runner-up cash award',
      'Expert feedback and recognition',
      'Innovation showcase opportunity',
      'Certificate of achievement'
    ],
    color: 'white',
    iconName: 'Medal'
  },
  {
    place: 'Winner',
    amount: '₹75,000',
    rewards: [
      'Winner cash award',
      'Grand Finale recognition',
      'Investor and ecosystem exposure',
      'Potential incubation support'
    ],
    color: 'black',
    iconName: 'Trophy'
  },
  {
    place: '2nd Runner-Up',
    amount: '₹15,000',
    rewards: [
      'Third place cash award',
      'Showcase and media visibility',
      'Mentor network access',
      'Certificate of achievement'
    ],
    color: 'green',
    iconName: 'Award'
  }
];

export const MENTORS: Mentor[] = [
  {
    name: 'Healthcare Experts',
    role: 'AI Engineer',
    description: 'Mentors supporting student teams working on healthcare, public health, diagnostics, care access, and wellbeing solutions.',
    linkedin: 'https://linkedin.com',
    colorClass: 'bg-emerald-100',
    techStack: ['Healthcare', 'Public Health', 'Validation', 'Impact']
  },
  {
    name: 'Startup Founders',
    role: 'Startup Founder',
    description: 'Entrepreneurs guiding teams on business model development, market validation, pitching, and startup readiness.',
    linkedin: 'https://linkedin.com',
    colorClass: 'bg-indigo-100',
    techStack: ['Business Model', 'Market Validation', 'Pitching']
  },
  {
    name: 'Design Thinkers',
    role: 'Product Designer',
    description: 'Experts helping students refine user needs, solution clarity, prototype direction, and presentation quality.',
    linkedin: 'https://linkedin.com',
    colorClass: 'bg-pink-100',
    techStack: ['Design Thinking', 'UX', 'Prototype Planning']
  },
  {
    name: 'Technology Mentors',
    role: 'Full Stack Developer',
    description: 'Technical mentors supporting AI, digital technology, sustainability, agriculture, education, and social innovation ideas.',
    linkedin: 'https://linkedin.com',
    colorClass: 'bg-amber-100',
    techStack: ['AI', 'Digital Tech', 'Sustainability', 'Scale']
  }
];

export const TESTIMONIALS: Testimonial[] = [
  {
    text: '1000+ students impacted through mentoring, validation, innovation exposure, and entrepreneurship learning.',
    author: 'Expected Outcome',
    role: 'Student Impact',
    team: 'Shifa SDG Innovation Challenge Kerala 2026'
  },
  {
    text: '200+ innovative ideas expected from 50+ colleges across Kerala, with strong media visibility and investor engagement.',
    author: 'Expected Outcome',
    role: 'Innovation Ecosystem',
    team: 'Shifa Group of Institutions'
  }
];

export const FAQS: FAQItem[] = [
  {
    question: 'Who can apply?',
    answer: 'Students from colleges across Kerala can participate as teams in Shifa SDG Innovation Challenge Kerala 2026.'
  },
  {
    question: 'What is the team size?',
    answer: 'Each team must consist of 3 to 5 students.'
  },
  {
    question: 'What is the registration fee?',
    answer: 'The registration fee is ₹500 per team.'
  },
  {
    question: 'What should teams submit?',
    answer: 'Teams must submit a pitch deck covering problem statement, SDG alignment, proposed solution, impact potential, feasibility, scalability, and sustainability.'
  },
  {
    question: 'How will ideas be evaluated?',
    answer: 'Ideas will be evaluated on problem relevance, innovation level, practical feasibility, SDG impact, scalability, sustainability, pitch quality, and market or social relevance.'
  },
  {
    question: 'When is the Grand Finale?',
    answer: 'The Grand Finale is scheduled for 15 July 2026.'
  }
];
