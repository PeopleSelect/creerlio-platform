# Fred - AI Assistant Feature Specification

## Overview
Fred is an always-available, context-aware AI assistant embedded into every major text field across the Talent Platform and Business Platform. It enables users to complete forms using voice input or natural language, even if they have limited literacy or computer skills.

Fred converts spoken or messy input into clean, formatted, human-quality text that matches the intent of each field.

## Core Capabilities

### 🎤 1. Speech-to-Text in Every Text Field
Users can tap a microphone icon and speak instead of typing.

**Examples:**

User says:
```
"Yeah so I've been a plumber for 8 years mainly commercial stuff around Parramatta."
```

Fred converts it into cleaned text:
```
"Plumber with 8 years' experience specialising in commercial projects in Parramatta."
```

**Applies to all relevant fields:**
- Experience summary
- Education
- Certificates
- Locations
- Skills
- Role descriptions
- Business descriptions
- Bio sections
- Notes / cover letters / job descriptions

### ✨ 2. AI Text Rewriting & Polishing
After speaking or typing freely, users can click "Improve with Fred".

Fred will:
- Rewrite to be clearer
- Enhance grammar
- Keep original meaning
- Adjust tone (professional, friendly, concise, etc.)

**Examples:**

User types/says:
```
"I done a law degree sydney uni and now I work mostly in family law stuff."
```

Fred outputs:
```
"Completed a Law degree at the University of Sydney. Currently specialising in Family Law."
```

### 🧭 3. Context-Aware Field Intelligence
Fred understands which field he's assisting with.

#### Example: Education Field
User says:
```
"Sydney Uni law degree."
```

Fred automatically formats:
- Institution → University of Sydney
- Degree → Bachelor of Laws (LLB) (or asks to confirm)
- Year (if provided verbally)

#### Example: Certificate Upload Field
User says:
```
"I've got a Working With Children Check and a First Aid cert."
```

Fred extracts:
- WWCC
- First Aid (HLTAID011 or asks user to confirm version)

#### Example: Location Field
User says:
```
"I live in Parramatta but can work anywhere between Penrith and the city."
```

Fred produces:
- Primary location: Parramatta
- Work radius: 30–40 km (or asks user to confirm)
- Suggested locations: Penrith, Sydney CBD

### 🗂️ 4. Automatic Data Structuring
Fred takes unstructured speech and converts it into structured data.

**Example:**
```
"Worked at Bunnings 2018 to 2022 as a team leader in hardware."
```

Fred parses:
- Employer: Bunnings Warehouse
- Role: Team Leader (Hardware Department)
- Dates: 2018 → 2022
- Skills: Leadership, Customer Service, Inventory, etc.

### 💡 5. Smart Suggestions Based on Context
Depending on what the user says, Fred can offer:
- Suggested job titles
- Recommended skills
- Suggested responsibilities
- Missing fields ("Would you like to add your certifications?")

### 🧑‍🤝‍🧑 6. Accessibility & Low-Literacy Support
The system is designed for users who may struggle with:
- Spelling
- Typing
- Computer navigation
- Formal writing

Users can simply talk normally and the platform handles the rest.

**This is a huge differentiator for:**
- Migrant communities
- Trades workers
- People with learning difficulties
- Older users
- Busy professionals on mobile

## Integration Points

### Talent Platform
- Personal Summary box
- Experience entries
- Education entries
- Certificates
- Skills
- Locations
- Availability notes
- Work preferences
- Additional notes
- Cover letters

### Business Platform
- Business description
- Role descriptions
- Requirements
- Notes to talent
- Opportunity descriptions
- Internal notes
- Any text input field

## Technical Requirements

### Frontend Components
- Microphone icon attached to all text inputs
- "Improve with Fred" button or auto-trigger
- Loading spinner / response display
- Voice activity indicator
- Error handling for speech recognition
- Fallback to text input

### Backend Services Required
- **Speech-to-text API** (Azure Speech Services, Google Speech-to-Text, or OpenAI Whisper)
- **Large Language Model (LLM)** for text rewriting (OpenAI GPT-4, Azure OpenAI)
- **Context detection service** to understand field types
- **Named Entity Recognition (NER)** for data extraction
- **Validation rules** based on field type

### API Endpoints Needed
```
POST /api/fred/speech-to-text
POST /api/fred/improve-text
POST /api/fred/extract-structured-data
POST /api/fred/suggest
```

### Security & Privacy
- No raw audio stored unless required by regulations
- PII handling compliance (GDPR, Australian Privacy Act)
- User consent for speech processing
- Encrypted transmission of voice data
- Audit logging for AI interactions

## User Experience Flow

### Voice Input Flow
1. User clicks microphone icon in any text field
2. Browser requests microphone permission (if not granted)
3. User speaks naturally
4. Real-time transcription appears in field
5. User can continue speaking or stop
6. Text is automatically cleaned and formatted
7. User can click "Improve with Fred" for further polishing

### Text Improvement Flow
1. User types or speaks text into field
2. User clicks "Improve with Fred" button
3. Loading indicator appears
4. Fred analyzes context and rewrites text
5. Improved text appears with option to accept/reject
6. User can regenerate or manually edit

## Implementation Phases

### Phase 1: Core Text Improvement
- Basic "Improve with Fred" button on key fields
- Text polishing and grammar correction
- Professional tone adjustment

### Phase 2: Speech-to-Text
- Microphone button on all text fields
- Real-time transcription
- Basic cleaning and formatting

### Phase 3: Context-Aware Intelligence
- Field-specific suggestions
- Structured data extraction
- Auto-complete for common fields

### Phase 4: Advanced Features
- Multi-language support
- Accent adaptation
- Industry-specific vocabulary
- Learning from user corrections

## Success Metrics
- % of users who use Fred
- % of fields completed using voice vs typing
- Time to complete profile/forms (before/after)
- User satisfaction scores
- Reduction in incomplete profiles
- Accessibility compliance improvements

## Future Enhancements
- Multi-language support (especially for migrant communities)
- Industry-specific templates and vocabulary
- Integration with document scanning (extract text from certificates)
- Voice-only profile creation
- Conversational onboarding ("Tell me about yourself...")
