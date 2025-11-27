// Skills library for Creerlio Platform
// Auto-generated from MASTER_DATA_SPECIFICATION.md

export const SOFT_SKILLS = [
  'Communication',
  'Teamwork / Collaboration',
  'Leadership',
  'Problem Solving',
  'Critical Thinking',
  'Time Management',
  'Adaptability / Flexibility',
  'Customer Service',
  'Conflict Resolution',
  'Attention to Detail',
  'Organizational Skills',
  'Decision Making',
  'Emotional Intelligence',
  'Negotiation',
  'Creativity',
  'Work Ethic',
  'Interpersonal Skills',
  'Stress Management',
  'Active Listening',
  'Multitasking',
] as const;

export const HARD_SKILLS = [
  'Project Management',
  'Data Analysis',
  'Report Writing',
  'Budgeting & Financial Management',
  'Microsoft Office Suite (Word, Excel, PowerPoint, Outlook)',
  'Data Entry',
  'Database Management',
  'Customer Relationship Management (CRM)',
  'Enterprise Resource Planning (ERP)',
  'Supply Chain Management',
  'Quality Assurance',
  'Lean & Six Sigma',
  'Procurement',
  'Contract Management',
  'Compliance & Regulatory Knowledge',
] as const;

export const TECHNICAL_SKILLS = {
  programming: [
    'Python', 'Java', 'JavaScript', 'C#', 'C++', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Go', 'Rust'
  ],
  webDevelopment: [
    'HTML', 'CSS', 'React', 'Angular', 'Vue.js', 'Node.js', 'Django', 'Flask', 'Laravel'
  ],
  mobileDevelopment: [
    'iOS (Swift)', 'Android (Kotlin/Java)', 'React Native', 'Flutter'
  ],
  databases: [
    'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Oracle', 'SQL Server', 'Redis'
  ],
  cloudPlatforms: [
    'AWS', 'Azure', 'Google Cloud Platform (GCP)'
  ],
  devOps: [
    'Docker', 'Kubernetes', 'Jenkins', 'GitLab CI/CD', 'Terraform', 'Ansible'
  ],
  versionControl: [
    'Git', 'GitHub', 'Bitbucket'
  ],
  testing: [
    'Unit Testing', 'Integration Testing', 'Selenium', 'Jest', 'Cypress'
  ],
  cybersecurity: [
    'Penetration Testing', 'Vulnerability Assessment', 'Network Security', 'SIEM'
  ],
  dataScience: [
    'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy'
  ],
  businessIntelligence: [
    'Power BI', 'Tableau', 'Looker', 'QlikView'
  ],
} as const;

export const TRADE_SKILLS = [
  'Welding (MIG, TIG, Stick)',
  'Electrical Wiring & Installation',
  'Plumbing & Pipe Fitting',
  'Carpentry & Joinery',
  'Cabinet Making',
  'Bricklaying & Masonry',
  'Concreting & Formwork',
  'Painting & Decorating',
  'Tiling',
  'Plastering & Rendering',
  'HVAC Installation & Maintenance',
  'Mechanical Fitting',
  'Machining (Lathe, Mill)',
  'Automotive Repair & Diagnostics',
  'Panel Beating & Spray Painting',
  'Upholstery',
  'Locksmithing',
  'Glazing',
  'Roofing (Metal, Tiling)',
] as const;

export type SoftSkill = typeof SOFT_SKILLS[number];
export type HardSkill = typeof HARD_SKILLS[number];
export type TechnicalSkill = typeof TECHNICAL_SKILLS[keyof typeof TECHNICAL_SKILLS][number];
export type TradeSkill = typeof TRADE_SKILLS[number];

export type Skill = SoftSkill | HardSkill | TechnicalSkill | TradeSkill;

// Helper functions
export const getAllTechnicalSkills = (): TechnicalSkill[] => {
  return Object.values(TECHNICAL_SKILLS).flat();
};

export const getTechnicalSkillsByCategory = (category: keyof typeof TECHNICAL_SKILLS): readonly TechnicalSkill[] => {
  return TECHNICAL_SKILLS[category];
};

export const searchSkills = (query: string, limit: number = 20): Skill[] => {
  const lowerQuery = query.toLowerCase();
  const allSkills: Skill[] = [
    ...SOFT_SKILLS,
    ...HARD_SKILLS,
    ...getAllTechnicalSkills(),
    ...TRADE_SKILLS,
  ];
  
  return allSkills
    .filter(skill => skill.toLowerCase().includes(lowerQuery))
    .slice(0, limit);
};

export const searchSoftSkills = (query: string, limit: number = 20): readonly SoftSkill[] => {
  const lowerQuery = query.toLowerCase();
  return SOFT_SKILLS
    .filter(skill => skill.toLowerCase().includes(lowerQuery))
    .slice(0, limit);
};

export const searchTechnicalSkills = (query: string, limit: number = 20): TechnicalSkill[] => {
  const lowerQuery = query.toLowerCase();
  return getAllTechnicalSkills()
    .filter(skill => skill.toLowerCase().includes(lowerQuery))
    .slice(0, limit);
};

export const searchTradeSkills = (query: string, limit: number = 20): readonly TradeSkill[] => {
  const lowerQuery = query.toLowerCase();
  return TRADE_SKILLS
    .filter(skill => skill.toLowerCase().includes(lowerQuery))
    .slice(0, limit);
};
