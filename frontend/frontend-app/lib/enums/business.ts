// Business configuration for Creerlio Platform
// Auto-generated from MASTER_DATA_SPECIFICATION.md

export const BUSINESS_TYPES = [
  'Sole Trader',
  'Partnership',
  'Company (Pty Ltd)',
  'Public Company (Ltd)',
  'Franchise',
  'Non-Profit / Charity',
  'Government Entity',
  'Social Enterprise',
  'Cooperative',
] as const;

export type BusinessType = typeof BUSINESS_TYPES[number];

export const BUSINESS_SIZES = [
  { value: '0', label: 'Self-employed / Sole Trader (0 employees)', min: 0, max: 0 },
  { value: '1-5', label: 'Micro (1-5 employees)', min: 1, max: 5 },
  { value: '6-20', label: 'Small (6-20 employees)', min: 6, max: 20 },
  { value: '21-50', label: 'Medium (21-50 employees)', min: 21, max: 50 },
  { value: '51-200', label: 'Medium-Large (51-200 employees)', min: 51, max: 200 },
  { value: '201-500', label: 'Large (201-500 employees)', min: 201, max: 500 },
  { value: '500+', label: 'Enterprise (500+ employees)', min: 500, max: null },
] as const;

export type BusinessSize = typeof BUSINESS_SIZES[number];

export const PORTFOLIO_SECTIONS = [
  { id: 'bio', label: 'Personal Bio', icon: 'user' },
  { id: 'summary', label: 'Professional Summary / Headline', icon: 'briefcase' },
  { id: 'experience', label: 'Work Experience / Employment History', icon: 'building' },
  { id: 'education', label: 'Education History', icon: 'graduation-cap' },
  { id: 'certifications', label: 'Certifications & Licences', icon: 'certificate' },
  { id: 'skills', label: 'Skills (Soft & Hard)', icon: 'star' },
  { id: 'projects', label: 'Projects / Portfolio Work', icon: 'folder' },
  { id: 'photos', label: 'Photos (Work Samples, Site Photos, Before/After)', icon: 'image' },
  { id: 'videos', label: 'Videos (Showreels, Demos, Training Videos)', icon: 'video' },
  { id: 'documents', label: 'Documents (Resume, Cover Letter, References, Transcripts)', icon: 'file-text' },
  { id: 'resume', label: 'Resume / CV', icon: 'file' },
  { id: 'references', label: 'References / Testimonials', icon: 'message-square' },
  { id: 'social', label: 'Social Media Links (LinkedIn, GitHub, Behance, etc.)', icon: 'link' },
  { id: 'achievements', label: 'Achievements / Awards', icon: 'award' },
  { id: 'publications', label: 'Publications / Research', icon: 'book' },
  { id: 'languages', label: 'Languages', icon: 'globe' },
  { id: 'volunteer', label: 'Volunteer Work', icon: 'heart' },
] as const;

export type PortfolioSection = typeof PORTFOLIO_SECTIONS[number];

export const PORTFOLIO_SHARING_OPTIONS = [
  { value: 'all', label: 'Share All (entire portfolio)' },
  { value: 'selected', label: 'Share Selected Sections Only' },
  { value: 'preview', label: 'Public Preview (talent views what business will see)' },
  { value: 'send', label: 'Send to Business (submit selected items)' },
  { value: 'expiry', label: 'Set Expiry Date for Shared Portfolio' },
  { value: 'revoke', label: 'Revoke Access (remove previously shared portfolio)' },
] as const;

export type PortfolioSharingOption = typeof PORTFOLIO_SHARING_OPTIONS[number];

export const WORK_ARRANGEMENT_TYPES = [
  'Remote',
  'Hybrid',
  'On-site',
] as const;

export type WorkArrangement = typeof WORK_ARRANGEMENT_TYPES[number];

export const EXPERIENCE_LEVELS = [
  'Entry Level',
  'Mid Level',
  'Senior Level',
  'Executive',
] as const;

export type ExperienceLevel = typeof EXPERIENCE_LEVELS[number];

export const AVAILABILITY_OPTIONS = [
  'Immediately',
  '1 week',
  '2 weeks',
  '1 month',
  'Negotiable',
] as const;

export type Availability = typeof AVAILABILITY_OPTIONS[number];

// Helper functions
export const getBusinessSizeByEmployeeCount = (count: number): BusinessSize | undefined => {
  return BUSINESS_SIZES.find(size => {
    if (size.max === null) {
      return count >= size.min;
    }
    return count >= size.min && count <= size.max;
  });
};

export const getPortfolioSectionById = (id: string): PortfolioSection | undefined => {
  return PORTFOLIO_SECTIONS.find(section => section.id === id);
};
