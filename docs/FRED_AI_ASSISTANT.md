# Fred — AI Assistant for Text Input & Voice

## Overview
Fred is Creerlio's embedded AI assistant that helps users complete forms using voice input or natural language. Available in every major text field across both Talent and Business platforms, Fred converts spoken or messy input into clean, formatted, professional text.

## Core Capabilities

### 1. 🎤 Speech-to-Text in Every Field
- Microphone icon in all text inputs
- Real-time voice transcription
- Works in all major browsers
- Multi-language support (priority: English, with expansion capability)

**Example:**
```
User says: "Yeah so I've been a plumber for 8 years mainly commercial stuff around Parramatta."

Fred outputs: "Plumber with 8 years' experience specialising in commercial projects in Parramatta."
```

### 2. ✨ AI Text Rewriting & Polishing
- "Improve with Fred" button on all text fields
- Automatic grammar correction
- Tone adjustment (professional, friendly, concise)
- Preserves original meaning
- Enhances clarity and readability

**Example:**
```
User types: "I done a law degree sydney uni and now I work mostly in family law stuff."

Fred outputs: "Completed a Law degree at the University of Sydney. Currently specialising in Family Law."
```

### 3. 🧭 Context-Aware Field Intelligence
Fred understands which field he's assisting with and provides appropriate formatting:

#### Education Fields
```
User: "Sydney Uni law degree"
Fred extracts:
- Institution: University of Sydney
- Degree: Bachelor of Laws (LLB)
- Asks for year if not provided
```

#### Certificate Fields
```
User: "I've got a Working With Children Check and a First Aid cert"
Fred extracts:
- WWCC (Working with Children Check)
- First Aid Certificate (HLTAID011)
- Prompts for expiry dates
```

#### Location Fields
```
User: "I live in Parramatta but can work anywhere between Penrith and the city"
Fred produces:
- Primary location: Parramatta
- Work radius: 30-40 km
- Suggested locations: Penrith, Sydney CBD
```

### 4. 🗂️ Automatic Data Structuring
Converts unstructured speech into structured data:

```
User: "Worked at Bunnings 2018 to 2022 as a team leader in hardware"

Fred parses:
- Employer: Bunnings Warehouse
- Role: Team Leader (Hardware Department)
- Dates: 2018 → 2022
- Skills: Leadership, Customer Service, Inventory
```

### 5. 💡 Smart Suggestions
- Suggested job titles based on description
- Recommended skills for roles
- Missing field prompts
- Industry-standard terminology

### 6. 🧑‍🤝‍🧑 Accessibility & Inclusion
Designed for users who may struggle with:
- ✅ Spelling and grammar
- ✅ Typing and keyboard navigation
- ✅ Formal writing
- ✅ Computer literacy
- ✅ English as second language

**Target audiences:**
- Migrant communities
- Trades workers
- People with learning difficulties
- Older users
- Mobile-first users
- Busy professionals

## Implementation Locations

### Talent Platform Fields
- [ ] Personal Summary
- [ ] Work Experience entries
- [ ] Education entries
- [ ] Certificates and credentials
- [ ] Skills description
- [ ] Locations and availability
- [ ] Work preferences
- [ ] Cover letters
- [ ] Additional notes
- [ ] Portfolio descriptions

### Business Platform Fields
- [ ] Business description
- [ ] Company culture
- [ ] Job descriptions
- [ ] Role requirements
- [ ] Benefits description
- [ ] Internal notes
- [ ] Opportunity descriptions
- [ ] Notes to talent
- [ ] Interview feedback

## Technical Architecture

### Frontend Components
```typescript
// FredMicrophone.tsx - Voice input button
// FredImproveButton.tsx - AI text improvement
// FredSuggestions.tsx - Contextual suggestions
// FredInput.tsx - Wrapper for text fields with Fred
```

### Backend Services
```
/api/fred/transcribe     → Speech-to-text
/api/fred/improve        → Text improvement
/api/fred/extract        → Data extraction
/api/fred/suggest        → Smart suggestions
/api/fred/validate       → Field validation
```

### AI Services Required
1. **Speech-to-Text**: Azure Speech Services or OpenAI Whisper
2. **Text Processing**: OpenAI GPT-4 or Azure OpenAI
3. **Entity Extraction**: Named Entity Recognition (NER)
4. **Context Detection**: Field type + user profile analysis

### Data Flow
```
User Voice Input
  ↓
Speech-to-Text API
  ↓
Raw Transcript
  ↓
Context Analysis (field type, user profile)
  ↓
LLM Processing (GPT-4)
  ↓
Structured Data Extraction
  ↓
Formatted Output
  ↓
User Review & Confirm
  ↓
Save to Database
```

## Privacy & Security

### Data Handling
- ❌ **DO NOT** store raw audio unless explicitly consented
- ✅ **DO** store only processed text
- ✅ **DO** anonymize data for training (with consent)
- ✅ **DO** comply with GDPR/Australian Privacy Principles

### User Consent
- Clear disclosure when Fred is activated
- Option to disable voice features
- Data retention policy displayed
- Export/delete personal data on request

## UI/UX Patterns

### Microphone Button
```
┌─────────────────────────────────────┐
│ Tell us about your experience...   │ 🎤
│                                     │
│ [Or type here]                      │
└─────────────────────────────────────┘
  ↓ (user clicks mic)
┌─────────────────────────────────────┐
│ 🔴 Listening... (tap to stop)       │
│                                     │
│ "I've been a plumber for 8 years..." │
└─────────────────────────────────────┘
```

### Improve Button
```
┌─────────────────────────────────────┐
│ I done a law degree sydney uni and  │
│ now I work mostly in family law...  │
│                                     │
│ [✨ Improve with Fred]               │
└─────────────────────────────────────┘
  ↓ (user clicks improve)
┌─────────────────────────────────────┐
│ ✨ Fred's suggestion:                │
│                                     │
│ "Completed a Law degree at the      │
│  University of Sydney. Currently    │
│  specialising in Family Law."       │
│                                     │
│ [Accept] [Edit] [Cancel]            │
└─────────────────────────────────────┘
```

## Phase 1 MVP (Minimum Viable Product)

### Priority Features
1. ✅ Speech-to-text in key fields (summary, experience, job description)
2. ✅ Basic text improvement (grammar, clarity)
3. ✅ Simple entity extraction (dates, locations, institutions)
4. ✅ Mobile-optimized interface

### Deferred to Phase 2
- Advanced context awareness
- Multi-language support beyond English
- Voice commands ("Fred, add my certificate")
- Proactive suggestions
- Learning from user corrections

## Success Metrics

### User Adoption
- % of users who activate Fred at least once
- % of fields completed using Fred vs manual
- Time saved per form completion
- User satisfaction score

### Quality Metrics
- Accuracy of transcription
- User acceptance rate of AI suggestions
- Error rate / correction frequency
- Field completion rates

### Accessibility Impact
- Usage by non-English speakers
- Usage by low-literacy users
- Mobile vs desktop usage
- Support ticket reduction

## Integration with Existing Codebase

### Frontend (Next.js)
```typescript
// Add to existing form components
import { FredInput } from '@/components/fred/FredInput';

<FredInput
  name="experience"
  placeholder="Tell us about your experience..."
  contextType="work-experience"
  onImprove={(text) => handleFredSuggestion(text)}
/>
```

### Backend (.NET)
```csharp
// New controller
[ApiController]
[Route("api/fred")]
public class FredAIController : ControllerBase
{
    [HttpPost("transcribe")]
    public async Task<IActionResult> Transcribe([FromBody] AudioRequest request)
    
    [HttpPost("improve")]
    public async Task<IActionResult> ImproveText([FromBody] TextRequest request)
    
    [HttpPost("extract")]
    public async Task<IActionResult> ExtractData([FromBody] ExtractionRequest request)
}
```

## API Examples

### Transcribe Speech
```http
POST /api/fred/transcribe
Content-Type: application/json

{
  "audioBase64": "...",
  "contextType": "work-experience",
  "userId": "user-123"
}

Response:
{
  "transcript": "I've been a plumber for 8 years...",
  "confidence": 0.95
}
```

### Improve Text
```http
POST /api/fred/improve
Content-Type: application/json

{
  "text": "I done a law degree sydney uni",
  "contextType": "education",
  "tone": "professional"
}

Response:
{
  "improved": "Completed a Law degree at the University of Sydney",
  "changes": ["grammar", "formality", "institution-name"],
  "confidence": 0.92
}
```

### Extract Structured Data
```http
POST /api/fred/extract
Content-Type: application/json

{
  "text": "Worked at Bunnings 2018 to 2022 as team leader",
  "contextType": "work-experience"
}

Response:
{
  "employer": "Bunnings Warehouse",
  "role": "Team Leader",
  "startDate": "2018-01-01",
  "endDate": "2022-12-31",
  "skills": ["Leadership", "Customer Service"],
  "confidence": 0.88
}
```

## Next Steps

1. **Choose AI Provider**: Azure OpenAI vs OpenAI API vs self-hosted
2. **Design UI Components**: Microphone button, improve button, suggestion cards
3. **Create Fred Service**: Backend API for all Fred operations
4. **Implement Frontend**: React/Next.js components with Fred integration
5. **Testing**: Accessibility testing, accuracy testing, user acceptance
6. **Launch**: Phased rollout starting with Talent onboarding

## Related Features
- See: `BUSINESS_INTELLIGENCE_RADAR.md` for related AI features
- See: `TALENT_PORTFOLIO_REQUIREMENTS.md` for integration points
