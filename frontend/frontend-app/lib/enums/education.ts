// Education data for Creerlio Platform
// Auto-generated from MASTER_DATA_SPECIFICATION.md

export const AUSTRALIAN_UNIVERSITIES = [
  'Australian National University (ANU)',
  'University of Sydney',
  'University of Melbourne',
  'University of Queensland (UQ)',
  'University of Western Australia (UWA)',
  'University of Adelaide',
  'Monash University',
  'University of New South Wales (UNSW)',
  'Macquarie University',
  'Queensland University of Technology (QUT)',
  'University of Technology Sydney (UTS)',
  'Curtin University',
  'RMIT University',
  'Deakin University',
  'Griffith University',
  'University of Newcastle',
  'University of Wollongong',
  'La Trobe University',
  'Swinburne University of Technology',
  'University of South Australia (UniSA)',
  'Victoria University',
  'Western Sydney University',
  'James Cook University (JCU)',
  'Flinders University',
  'Murdoch University',
  'University of Tasmania (UTAS)',
  'Charles Darwin University (CDU)',
  'University of Canberra (UC)',
  'Edith Cowan University (ECU)',
  'Southern Cross University',
  'Charles Sturt University (CSU)',
  'Central Queensland University (CQU)',
  'University of Southern Queensland (USQ)',
  'Federation University Australia',
  'University of New England (UNE)',
  'University of the Sunshine Coast (USC)',
  'Australian Catholic University (ACU)',
  'Bond University',
  'Torrens University Australia',
  'University of Notre Dame Australia',
  'Think Education Group',
  'SAE Institute',
  'AFTRS (Australian Film Television and Radio School)',
  'National Art School',
  'Australian Institute of Music (AIM)',
  'JMC Academy',
] as const;

export type University = typeof AUSTRALIAN_UNIVERSITIES[number];

export const TAFE_INSTITUTES = [
  'TAFE NSW',
  'TAFE Queensland',
  'TAFE South Australia (TAFE SA)',
  'TAFE Western Australia',
  'TasTAFE',
  'Canberra Institute of Technology (CIT)',
  'Holmesglen Institute',
  'Box Hill Institute',
  'Chisholm Institute',
  'GippsTAFE / Federation TAFE',
  'Kangan Institute',
  'Bendigo TAFE / Bendigo Regional Institute of TAFE',
  'Melbourne Polytechnic',
  'South Metropolitan TAFE',
  'North Metropolitan TAFE',
  'Central Regional TAFE (Western Australia)',
  'South West TAFE',
  'Wodonga TAFE / Wodonga Institute of TAFE',
  'Sunraysia Institute of TAFE',
  'TAFE Gippsland',
  'TAFE Illawarra / Wollongong TAFE',
  'TAFE Northern Sydney Institute',
  'TAFE Western Sydney',
  'Hunter TAFE',
  'New England Institute',
  'Riverina Institute',
  'Western Institute',
  'North Coast Institute',
  'Sydney Institute',
  'South Western Sydney Institute',
  'Northern Sydney Institute',
  'William Angliss Institute',
  'Gordon Institute of TAFE',
  'South West Institute of TAFE',
  'North East TAFE (Victoria)',
  'Goulburn Ovens Institute of TAFE',
  'Upper Murray TAFE',
] as const;

export type TAFEInstitute = typeof TAFE_INSTITUTES[number];

export const EDUCATION_LEVELS = [
  { value: 'no-formal', label: 'No formal qualifications' },
  { value: 'year-10', label: 'Year 10 Certificate' },
  { value: 'year-12', label: 'Year 12 Certificate / Senior Secondary Certificate' },
  { value: 'cert-i', label: 'Certificate I' },
  { value: 'cert-ii', label: 'Certificate II' },
  { value: 'cert-iii', label: 'Certificate III' },
  { value: 'cert-iv', label: 'Certificate IV' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'adv-diploma', label: 'Advanced Diploma' },
  { value: 'assoc-degree', label: 'Associate Degree' },
  { value: 'bachelor', label: 'Bachelor Degree (Pass)' },
  { value: 'bachelor-honours', label: 'Bachelor Degree (Honours)' },
  { value: 'grad-cert', label: 'Graduate Certificate' },
  { value: 'grad-diploma', label: 'Graduate Diploma' },
  { value: 'masters-coursework', label: "Master's Degree (Coursework)" },
  { value: 'masters-research', label: "Master's Degree (Research)" },
  { value: 'phd', label: 'Doctoral Degree (PhD)' },
  { value: 'trade', label: 'Trade Qualification / Apprenticeship' },
  { value: 'traineeship', label: 'Traineeship' },
  { value: 'professional-cert', label: 'Professional Certification' },
  { value: 'short-course', label: 'Short Course / Micro-credential' },
  { value: 'statement', label: 'Statement of Attainment' },
] as const;

export type EducationLevel = typeof EDUCATION_LEVELS[number];

// Helper functions
export const searchUniversities = (query: string, limit: number = 20): readonly University[] => {
  const lowerQuery = query.toLowerCase();
  return AUSTRALIAN_UNIVERSITIES
    .filter(uni => uni.toLowerCase().includes(lowerQuery))
    .slice(0, limit);
};

export const searchTAFE = (query: string, limit: number = 20): readonly TAFEInstitute[] => {
  const lowerQuery = query.toLowerCase();
  return TAFE_INSTITUTES
    .filter(tafe => tafe.toLowerCase().includes(lowerQuery))
    .slice(0, limit);
};
