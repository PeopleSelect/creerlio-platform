// Work rights, visa types, and credentials for Creerlio Platform
// Auto-generated from MASTER_DATA_SPECIFICATION.md

export const WORK_RIGHTS = [
  'Australian Citizen',
  'Permanent Resident',
  'New Zealand Citizen (Special Category Visa - SCV 444)',
  'Full unrestricted work rights',
  'Student Visa - Limited hours (typically 48 hours/fortnight)',
  'Working Holiday Maker Visa (Subclass 417)',
  'Work and Holiday Visa (Subclass 462)',
  'Temporary Skill Shortage Visa (Subclass 482)',
  'Temporary Graduate Visa (Subclass 485)',
  'Skilled Independent Visa (Subclass 189)',
  'Skilled Nominated Visa (Subclass 190)',
  'Skilled Work Regional Visa (Subclass 491)',
  'Employer Nomination Scheme (Subclass 186)',
  'Regional Sponsored Migration Scheme (Subclass 187)',
  'Business Innovation and Investment Visa (Subclass 188)',
  'Distinguished Talent Visa (Subclass 858)',
  'Partner Visa (with work rights)',
  'Bridging Visa A (with work rights)',
  'Bridging Visa B (with work rights)',
  'Bridging Visa C (with work rights)',
  'No work rights - Visa required',
  'Tourist Visa - No work rights',
  'Visitor Visa - No work rights',
] as const;

export type WorkRight = typeof WORK_RIGHTS[number];

export const VISA_TYPES = {
  skilled: [
    { code: '189', name: 'Skilled Independent Visa' },
    { code: '190', name: 'Skilled Nominated Visa' },
    { code: '491', name: 'Skilled Work Regional (Provisional)' },
    { code: '494', name: 'Skilled Employer Sponsored Regional (Provisional)' },
    { code: '482', name: 'Temporary Skill Shortage (TSS)' },
    { code: '186', name: 'Employer Nomination Scheme (ENS)' },
    { code: '187', name: 'Regional Sponsored Migration Scheme (RSMS - closed)' },
    { code: '407', name: 'Training Visa' },
    { code: '408', name: 'Temporary Activity Visa' },
  ],
  student: [
    { code: '500', name: 'Student Visa' },
    { code: '485', name: 'Temporary Graduate Visa (Graduate Work Stream)' },
    { code: '485-psw', name: 'Temporary Graduate Visa (Post-Study Work Stream)' },
    { code: '590', name: 'Student Guardian Visa' },
  ],
  workingHoliday: [
    { code: '417', name: 'Working Holiday Visa' },
    { code: '462', name: 'Work and Holiday Visa' },
  ],
  business: [
    { code: '188', name: 'Business Innovation and Investment (Provisional)' },
    { code: '888', name: 'Business Innovation and Investment (Permanent)' },
  ],
  temporary: [
    { code: '400', name: 'Temporary Work (Short Stay Specialist)' },
    { code: '403', name: 'Temporary Work (International Relations)' },
    { code: '476', name: 'Skilled - Recognized Graduate Visa' },
  ],
  partner: [
    { code: '820/801', name: 'Partner Visa (with work rights)' },
    { code: '309/100', name: 'Partner Visa (with work rights)' },
    { code: '461', name: 'New Zealand Citizen Family Relationship' },
  ],
  distinguishedTalent: [
    { code: '858', name: 'Distinguished Talent Visa' },
    { code: 'gtv', name: 'Global Talent Visa Program' },
  ],
} as const;

export type VisaType = typeof VISA_TYPES[keyof typeof VISA_TYPES][number];

export const CONSTRUCTION_CREDENTIALS = [
  'White Card (General Induction)',
  'Asbestos Awareness',
  'Confined Space Entry',
  'Working at Heights',
  'Elevated Work Platform (EWP) <11m',
  'Elevated Work Platform (EWP) >11m',
  'Scaffolding - Basic',
  'Scaffolding - Intermediate',
  'Scaffolding - Advanced',
  'Rigging - Basic (RB)',
  'Rigging - Intermediate (RI)',
  'Rigging - Advanced (RA)',
  'Dogging (DG)',
  'Forklift Licence (LF)',
  'Order Picking Forklift (LO)',
  'Boom-Type EWP (WP)',
  'Crane - Non-Slewing Mobile (CN)',
  'Crane - Slewing Mobile (C2)',
  'Crane - Slewing Mobile (C6)',
  'Crane - Bridge & Gantry (CB)',
  'Hoist (HO)',
  'Tower Crane (TF)',
  'Load Shifting Equipment Operator',
  'Building Supervisor Licence',
  "Builder's Licence - Class 1, 2",
  'Contractor Licence',
  'Demolition Licence',
  'Electrical Licence - A, B, C',
  'Plumbing Licence - General, Restricted',
  'Gas Fitter Licence',
  'Occupational Health & Safety (WHS) Induction',
  'CPR & First Aid',
  'Fire Safety Adviser',
  'Traffic Control (Prepare Work Zone)',
  'Traffic Management',
  'Asbestos Removal Supervisor - Class A',
  'Asbestos Removal - Class B',
  'Lead Hazard Awareness',
  'Manual Handling',
  'Operating Excavators',
  'Operating Graders',
  'Operating Loaders',
  'Operating Bulldozers',
  'Operating Backhoes',
  'Operating Skid Steer Loaders',
  'Operating Articulated Dump Trucks',
  'Operate Rollers',
] as const;

export const TRANSPORT_CREDENTIALS = [
  'Car Licence (C Class)',
  'Light Rigid (LR)',
  'Medium Rigid (MR)',
  'Heavy Rigid (HR)',
  'Heavy Combination (HC)',
  'Multi Combination (MC)',
  'Dangerous Goods Licence',
  'Load Restraint Certificate',
  'Fatigue Management',
  'Chain of Responsibility',
  'Forklift High Risk Work Licence',
  'National Police Certificate',
  'Working with Children Check',
  'Medical Certificate (for heavy vehicles)',
  'Defensive Driving Course',
  '4WD Off-Road Training',
] as const;

export const HEALTHCARE_CREDENTIALS = [
  'AHPRA Registration - Medical Practitioner',
  'AHPRA Registration - Nursing & Midwifery',
  'AHPRA Registration - Allied Health',
  'AHPRA Registration - Pharmacy',
  'AHPRA Registration - Dentistry',
  'AHPRA Registration - Psychology',
  'CPR (Cardiopulmonary Resuscitation)',
  'First Aid Certificate (Provide First Aid)',
  'Advanced Resuscitation',
  'Manual Handling',
  'Medication Administration',
  'Infection Control',
  'Mental Health First Aid',
  'Diabetes Awareness',
  'Dementia Care Training',
  'Palliative Care Certificate',
  'Wound Care Management',
  'Disability Support Worker Training',
  'NDIS Worker Screening Check',
  'Aged Care Induction',
  'Vaccination Certificates (Hepatitis B, MMR, etc.)',
  'Child Protection Training',
  'Clinical Governance',
  'Food Safety (for healthcare kitchens)',
] as const;

export const HOSPITALITY_CREDENTIALS = [
  'Responsible Service of Alcohol (RSA)',
  'Responsible Conduct of Gambling (RCG)',
  'Food Safety Supervisor Certificate',
  'Food Handler Certificate',
  'Barista Skills Certificate',
  'Coffee Art / Latte Art',
  'Mixology / Cocktail Making',
  'HACCP Certification',
  'Allergen Awareness',
  'Kitchen Operations',
  'Commercial Cookery Certificate III',
  'Hospitality (Patisserie) Certificate III',
] as const;

export const MINING_CREDENTIALS = [
  'Generic Induction (e.g., Coal Board, Rio Tinto Induction)',
  'Coal Board Medical (Coal Mine Workers Health Scheme)',
  'RII30920 Certificate III in Surface Extraction Operations',
  'RII30913 Certificate III in Underground Coal Operations',
  'RII40920 Certificate IV in Surface Extraction Operations',
  'RIIMPO320F - Conduct Loader Operations',
  'RIIMPO321F - Conduct Excavator Operations',
  'RIIMPO318F - Conduct Civil Construction Skid Steer Loader Operations',
  'RIIMPO319F - Conduct Backhoe/Loader Operations',
  'RIIMPO324F - Conduct Grader Operations',
  'RIIMPO325F - Conduct Dozer Operations',
  'RIIMPO327F - Conduct Roller Operations',
  'RIISTD201E - Work Safely & Follow WHS Policies & Procedures',
  'Standard 11 - Underground Coal Mine Induction',
  'Site-Specific Inductions (BHP, Fortescue, Newcrest, etc.)',
  'Shotfirer Licence',
  'Mining Supervisor / Deputy Licence',
  "Underground Mine Manager / Manager's Certificate of Competency",
  'Open Cut Examiner Certificate',
  'Underground Electrician / Fitter',
  'Heavy Diesel Mechanic',
  'Heavy Mobile Plant Operator',
  'Standard Operating Procedures (SOP) Competencies',
  'Trade Qualifications (Electrical, Mechanical, Boilermaking, Fitting & Turning)',
  'Isolation & Lock Out Tag Out (LOTO)',
] as const;

export const IT_CREDENTIALS = [
  'AWS Certified Solutions Architect (Associate / Professional)',
  'AWS Certified Developer',
  'AWS Certified SysOps Administrator',
  'AWS Certified DevOps Engineer',
  'AWS Certified Security Specialty',
  'Microsoft Certified: Azure Fundamentals',
  'Microsoft Certified: Azure Administrator',
  'Microsoft Certified: Azure Solutions Architect',
  'Microsoft 365 Certified',
  'Google Cloud Certified - Associate Cloud Engineer',
  'Google Cloud Certified - Professional Cloud Architect',
  'Cisco Certified Network Associate (CCNA)',
  'Cisco Certified Network Professional (CCNP)',
  'Cisco Certified Internetwork Expert (CCIE)',
  'CompTIA A+',
  'CompTIA Network+',
  'CompTIA Security+',
  'CompTIA Linux+',
  'Certified Information Systems Security Professional (CISSP)',
  'Certified Ethical Hacker (CEH)',
  'Certified Information Security Manager (CISM)',
  'Certified ScrumMaster (CSM)',
  'Project Management Professional (PMP)',
  'PRINCE2 Foundation / Practitioner',
  'ITIL Foundation / Intermediate / Expert',
  'Red Hat Certified Engineer (RHCE)',
  'Oracle Certified Professional (OCP)',
  'VMware Certified Professional (VCP)',
  'Kubernetes Administrator (CKA)',
  'Terraform Associate',
] as const;

export type Credential = 
  | typeof CONSTRUCTION_CREDENTIALS[number]
  | typeof TRANSPORT_CREDENTIALS[number]
  | typeof HEALTHCARE_CREDENTIALS[number]
  | typeof HOSPITALITY_CREDENTIALS[number]
  | typeof MINING_CREDENTIALS[number]
  | typeof IT_CREDENTIALS[number];

// Helper functions
export const getAllVisaTypes = (): VisaType[] => {
  return Object.values(VISA_TYPES).flat();
};

export const getVisaTypesByCategory = (category: keyof typeof VISA_TYPES): readonly VisaType[] => {
  return VISA_TYPES[category];
};

export const searchWorkRights = (query: string, limit: number = 20): readonly WorkRight[] => {
  const lowerQuery = query.toLowerCase();
  return WORK_RIGHTS
    .filter(wr => wr.toLowerCase().includes(lowerQuery))
    .slice(0, limit);
};

export const getCredentialsByIndustry = (industry: string): readonly string[] => {
  switch (industry) {
    case 'Construction':
      return CONSTRUCTION_CREDENTIALS;
    case 'Manufacturing, Transport & Logistics':
      return TRANSPORT_CREDENTIALS;
    case 'Healthcare & Medical':
      return HEALTHCARE_CREDENTIALS;
    case 'Hospitality & Tourism':
      return HOSPITALITY_CREDENTIALS;
    case 'Mining, Resources & Energy':
      return MINING_CREDENTIALS;
    case 'Information & Communication Technology (ICT)':
      return IT_CREDENTIALS;
    default:
      return [];
  }
};

export const searchCredentials = (industry: string, query: string, limit: number = 20): readonly string[] => {
  const credentials = getCredentialsByIndustry(industry);
  const lowerQuery = query.toLowerCase();
  return credentials
    .filter(cred => cred.toLowerCase().includes(lowerQuery))
    .slice(0, limit);
};
