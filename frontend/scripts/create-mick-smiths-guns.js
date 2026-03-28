/**
 * Seeds Mick Smith's Guns — a demo gun shop profile in Penrith, Sydney NSW.
 *
 * Uses the existing auth user / business_profile already created:
 *   user_id:    71ba83d4-305b-4392-b30a-5ccc85dcc5bb
 *   profile_id: af2d30f7-1c8c-4b34-b0a2-7bd256fe98d5
 *   email:      micksmithsguns@gmail.com
 *
 * Creates:
 *  - Populated business_profiles record (name, location, industry, social, etc.)
 *  - business_profile_pages (slug: mick-smiths-guns, published)
 *  - DALL-E logo + 7 images + 1 licence document
 *  - Social link bank items (YouTube, Facebook, Instagram, Website)
 *  - Full profile metadata bank item
 *  - 2 published jobs
 *
 * Run from /frontend:  node scripts/create-mick-smiths-guns.js
 */

require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')
const OpenAI = require('openai')
const fs   = require('fs')
const path = require('path')
const os   = require('os')
const { randomUUID } = require('crypto')

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_API_KEY   = process.env.OPENAI_API_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error('Missing env vars — ensure .env.local has NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const openai   = new OpenAI({ apiKey: OPENAI_API_KEY })

const USER_ID  = '71ba83d4-305b-4392-b30a-5ccc85dcc5bb'
const BIZ_ID   = 'af2d30f7-1c8c-4b34-b0a2-7bd256fe98d5'
const SLUG     = 'mick-smiths-guns'
const BUCKET   = 'business-bank'

// ── DALL-E images ─────────────────────────────────────────────────────────────

const IMAGES = [
  {
    key: 'logo',
    filename: 'msg-logo.jpg',
    bankType: 'logo',
    title: "Mick Smith's Guns — Official Logo",
    prompt: "Professional Australian gun shop retail brand logo on clean white background. Bold sans-serif wordmark 'MICK SMITH\'S GUNS' with a minimal crosshair or rifle scope reticle icon above. Deep olive green and matte charcoal color palette. Clean, modern, trustworthy. No people. Vector-style on white.",
    size: '1024x1024',
  },
  {
    key: 'hero',
    filename: 'msg-hero.jpg',
    bankType: 'image',
    title: "Mick Smith's Guns — Store Front Penrith",
    prompt: "Exterior of a well-established Australian firearms retail shop in Penrith NSW on a clear sunny day. Clean signage reads 'Mick Smith\'s Guns'. Large display windows showing rifle and shotgun silhouettes. Neat shopfront with Australian flag visible. Professional retail photography, suburban strip mall setting, blue sky.",
    size: '1792x1024',
  },
  {
    key: 'showroom',
    filename: 'msg-showroom.jpg',
    bankType: 'image',
    title: "Mick Smith's Guns — Showroom Floor",
    prompt: "Interior of a professional Australian gun shop showroom. Long glass display cases showing handguns and accessories. Wall-mounted rifle and shotgun racks fully stocked. Clean retail lighting, timber floors, branded signage, ammunition display wall visible at back. No people. Modern retail firearms store.",
    size: '1792x1024',
  },
  {
    key: 'ammunition',
    filename: 'msg-ammunition.jpg',
    bankType: 'image',
    title: "Mick Smith's Guns — Ammunition Wall",
    prompt: "Full-wall ammunition display in a professional Australian firearms retail store. Hundreds of neatly stacked ammunition boxes in organised rows by calibre — .22LR, .308, 12 gauge, .223, 9mm, etc. Clean labelled shelves, bright retail lighting. No people. Impressive retail display.",
    size: '1792x1024',
  },
  {
    key: 'range',
    filename: 'msg-range.jpg',
    bankType: 'image',
    title: "Mick Smith's Guns — Range Day at Penrith Pistol Club",
    prompt: "Australian outdoor shooting range on a sunny day in Western Sydney. Several shooters in ear protection and safety glasses at bench rests with rifles and shotguns. Safety-conscious, organised, club atmosphere. Green hills in background. Professional sporting photography. Diverse group of adult shooters.",
    size: '1792x1024',
  },
  {
    key: 'safes',
    filename: 'msg-safes.jpg',
    bankType: 'image',
    title: "Mick Smith's Guns — Gun Safe & Storage Display",
    prompt: "Display area in an Australian gun shop showing a range of quality gun safes and secure storage cabinets for home firearms storage. Safes open to show padded interiors, rifle racks, and lockable pistol drawers. Professional retail photography. Various sizes from under-bed pistol vaults to full-height rifle safes. Clean showroom setting.",
    size: '1792x1024',
  },
  {
    key: 'team',
    filename: 'msg-team.jpg',
    bankType: 'image',
    title: "Mick Smith's Guns — Mick and the Team",
    prompt: "Group photo of five friendly Australian gun shop staff members behind a retail counter in a clean firearms store. Staff wearing branded polo shirts with 'Mick Smith\'s Guns' embroidery. Smiling, professional, knowledgeable. Display cases visible behind them stocked with firearms and accessories. Natural retail lighting.",
    size: '1792x1024',
  },
  {
    key: 'cleaning',
    filename: 'msg-cleaning.jpg',
    bankType: 'image',
    title: "Mick Smith's Guns — Gunsmithing & Cleaning Station",
    prompt: "Professional gunsmith workbench in an Australian gun shop. Organised tools, cleaning rods, brushes, solvent bottles, bore lights. A partially disassembled rifle on a padded gunsmithing vise. Clean, professional workspace. No people. Warm workshop lighting, pegboard tool wall in background.",
    size: '1792x1024',
  },
  {
    key: 'licence',
    filename: 'msg-licence.jpg',
    bankType: 'document',
    title: 'NSW Firearms Registry — Dealer Licence Certificate',
    prompt: "Official New South Wales Firearms Registry Firearms Dealer Licence certificate. White official document with NSW Government letterhead and crest. States 'Firearms Dealer Licence — Category A, B, C, D — Licence Holder: Michael Smith — Trading As: Mick Smith\'s Guns — Penrith NSW 2750 — Licence No: FDL-NSW-2024-00847 — Valid to: 30 June 2026'. Signed and official seal. Flat lay on timber desk.",
    size: '1792x1024',
  },
]

// ── Social & external links ───────────────────────────────────────────────────

const LINKS = [
  {
    title: "YouTube — Mick Smith's Guns",
    description: "Subscribe for gun reviews, range days, new stock arrivals, and maintenance tips from the team at Mick Smith's Guns, Penrith NSW.",
    url: 'https://www.youtube.com/@MickSmithsGuns',
    link_type: 'social',
  },
  {
    title: "Facebook — Mick Smith's Guns Sydney",
    description: "Follow us on Facebook for new stock alerts, promotions, range day announcements, and community updates from Sydney's favourite gun shop.",
    url: 'https://www.facebook.com/MickSmithsGunsSydney',
    link_type: 'social',
  },
  {
    title: "Instagram — @micksmithsguns",
    description: "Follow @micksmithsguns on Instagram for new arrivals, behind-the-counter shots, range days, and gear reviews.",
    url: 'https://www.instagram.com/micksmithsguns',
    link_type: 'social',
  },
  {
    title: "Website — micksmithsguns.com.au",
    description: "Browse our full catalogue online, book a layby, check stock availability, and learn about our gunsmithing services.",
    url: 'https://www.micksmithsguns.com.au',
    link_type: 'website',
  },
  {
    title: 'Penrith & District Pistol Club — Partner Range',
    description: "Mick Smith's Guns is the official retail partner of the Penrith & District Pistol Club. Members receive 5% discount on all ammunition and accessories.",
    url: 'https://www.penrithpistolclub.com.au',
    link_type: 'industry_body',
  },
]

// ── Jobs ──────────────────────────────────────────────────────────────────────

const JOBS = [
  {
    title: 'Retail Sales Assistant — Firearms & Accessories',
    description: `About the Role

Mick Smith's Guns is looking for a passionate and knowledgeable Retail Sales Assistant to join our team at our Penrith store. This is a customer-facing role where you'll be helping shooters, hunters, and collectors find the right firearm, ammunition, and accessories for their needs.

Responsibilities:
• Assist customers with firearm selection, ammunition, optics, and accessories
• Process layby, consignment, and transfer paperwork under NSW Firearms Act requirements
• Maintain and rotate showroom stock and display cases
• Assist with safe storage advice and compliance guidance
• Build long-term relationships with our loyal customer base
• Support gunsmithing staff with minor cleaning and maintenance bookings

Requirements:
• NSW Firearms Licence (Cat A/B minimum — Cat H preferred)
• Genuine passion for firearms, hunting, or sport shooting
• Strong customer service skills
• Ability to handle sensitive compliance obligations professionally
• Previous retail or firearms industry experience preferred

What We Offer:
• Competitive base wage + performance bonus
• Staff discount on all store merchandise
• Ongoing product training and manufacturer demonstrations
• Working with a team that genuinely loves what they do`,
    employment_type: 'full_time',
    location: 'Penrith NSW 2750',
    status: 'published',
  },
  {
    title: 'Gunsmith & Service Technician',
    description: `About the Role

We're looking for an experienced Gunsmith or Service Technician to join the Mick Smith's Guns team. You'll be responsible for firearm servicing, cleaning, minor repairs, scope mounting, and custom work for our retail and trade customers.

Responsibilities:
• Clean, service, and inspect customer firearms to manufacturer standards
• Mount and bore-sight optics, iron sights, and accessories
• Perform basic repairs — trigger adjustments, stock fitting, part replacements
• Manage the workshop job queue and communicate turnaround times to customers
• Assist retail staff with technical questions
• Comply with all NSW Firearms Act record-keeping requirements

Requirements:
• Formal gunsmithing qualification or 3+ years hands-on experience
• NSW Firearms Licence (Category appropriate to work performed)
• Proficiency across bolt-action, semi-auto, and pump-action platforms
• Strong attention to detail and clean working habits
• Knowledge of Australian proof and compliance markings

What We Offer:
• Fully equipped modern gunsmithing workshop
• Access to manufacturer service training
• Competitive trade wage
• Flexible hours available for the right candidate`,
    employment_type: 'full_time',
    location: 'Penrith NSW 2750',
    status: 'published',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function publicUrl(storagePath) {
  const enc = storagePath.split('/').map(encodeURIComponent).join('/')
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${enc}`
}

async function generateAndUpload(imgDef, tmpDir) {
  console.log(`  🎨  Generating: ${imgDef.title}`)
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: imgDef.prompt,
    n: 1,
    size: imgDef.size || '1792x1024',
    quality: 'hd',
    style: 'natural',
  })
  const imageUrl = response.data[0].url
  const imgRes   = await fetch(imageUrl)
  const buf      = Buffer.from(await imgRes.arrayBuffer())
  const localPath = path.join(tmpDir, imgDef.filename)
  fs.writeFileSync(localPath, buf)

  const storagePath = `${USER_ID}/bank/${imgDef.filename}`
  await supabase.storage.from(BUCKET).remove([storagePath])
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buf, { contentType: 'image/jpeg', upsert: true })
  if (error) throw new Error(`Upload failed ${imgDef.filename}: ${error.message}`)

  return { storagePath, url: publicUrl(storagePath), buf }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔫  Seeding Mick Smith's Guns — Penrith NSW\n")

  const tmpDir = path.join(os.tmpdir(), `mick-guns-${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })

  // ── 1. Update business_profiles ───────────────────────────────────────────
  console.log('📋  Updating business_profiles...')
  const { error: bpErr } = await supabase.from('business_profiles').upsert({
    id: BIZ_ID,
    user_id: USER_ID,
    business_id: BIZ_ID,
    name: "Mick Smith's Guns",
    business_name: "Mick Smith's Guns",
    industry: 'Retail — Firearms & Outdoor',
    description: "Mick Smith's Guns has been Penrith and Western Sydney's most trusted firearms retailer since 1992. Founded by Mick Smith — a licensed shooter, hunter, and former NSWPF firearms instructor — the store carries over 400 firearms across Category A, B, and H, plus one of the largest ammunition and accessories ranges in NSW. Whether you're a first-time licence holder, a seasoned hunter, or a competitive sport shooter, our team has the knowledge, gear, and genuine passion to help.",
    city: 'Penrith',
    state: 'NSW',
    country: 'Australia',
    location: 'Penrith NSW 2750, Australia',
    latitude: -33.7490,
    longitude: 150.6942,
    website: 'https://www.micksmithsguns.com.au',
    email: 'micksmithsguns@gmail.com',
    is_active: true,
    public_profile_enabled: true,
    talent_community_enabled: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
  if (bpErr) console.warn(`  ⚠️  business_profiles: ${bpErr.message}`)
  else console.log('  ✅  business_profiles updated')

  // ── 2. Generate images ────────────────────────────────────────────────────
  console.log('\n🎨  Generating DALL-E images...')
  const bankItems = []
  let logoUrl = null
  let heroUrl = null
  const imageMap = {}

  for (const imgDef of IMAGES) {
    try {
      const { storagePath, url, buf } = await generateAndUpload(imgDef, tmpDir)
      imageMap[imgDef.key] = { storagePath, url }
      if (imgDef.key === 'logo') logoUrl = url
      if (imgDef.key === 'hero') heroUrl = url

      bankItems.push({
        user_id: USER_ID,
        item_type: imgDef.bankType,
        title: imgDef.title,
        description: imgDef.description || null,
        file_path: storagePath,
        file_type: 'image/jpeg',
        file_size: buf.length,
        file_url: url,
        metadata: { source: 'seed', key: imgDef.key },
      })
      console.log(`  ✅  ${imgDef.title}`)
    } catch (err) {
      console.warn(`  ⚠️  ${imgDef.key}: ${err.message}`)
    }
  }

  // ── 3. Add social/link items ──────────────────────────────────────────────
  for (const link of LINKS) {
    bankItems.push({
      user_id: USER_ID,
      item_type: 'link',
      title: link.title,
      description: link.description,
      file_path: null,
      file_url: link.url,
      metadata: { url: link.url, link_type: link.link_type },
    })
  }
  console.log(`\n🔗  Added ${LINKS.length} link items (YouTube, Facebook, Instagram, Website, Club)`)

  // ── 4. Insert all bank items ──────────────────────────────────────────────
  console.log(`\n💾  Inserting ${bankItems.length} bank items...`)
  await supabase.from('business_bank_items').delete().eq('user_id', USER_ID).neq('item_type', 'profile')
  const insertedItems = []
  for (const item of bankItems) {
    const { data, error } = await supabase.from('business_bank_items').insert(item).select().single()
    if (error) console.warn(`  ⚠️  ${item.title}: ${error.message}`)
    else { insertedItems.push(data); console.log(`  ✅  [${data.id}] ${item.item_type}: ${item.title}`) }
  }

  // ── 5. Build attachments list ─────────────────────────────────────────────
  const attachments = insertedItems
    .filter(i => i.item_type !== 'link')
    .map(i => ({
      id: i.id,
      url: i.file_url,
      title: i.title,
      file_path: null,
      file_type: i.file_type,
      item_type: i.item_type,
    }))

  // ── 6. Profile metadata bank item ────────────────────────────────────────
  console.log('\n📝  Building profile metadata...')

  const profileMeta = {
    name: "Mick Smith's Guns",
    title: 'Firearms & Outdoor Retail',
    bio: "Mick Smith's Guns has been Penrith and Western Sydney's most trusted firearms retailer since 1992. Founded by Mick Smith — a licensed shooter, hunter, and former NSWPF firearms instructor — we carry over 400 firearms across Category A, B, and H, plus one of the largest ammunition and accessories ranges in NSW.\n\nWe service everyone from first-time licence holders picking up their first .22 to competitive IPSC shooters looking for custom trigger work, and farmers who need reliable centrefire rifles for property management. Our gunsmithing workshop handles cleaning, servicing, scope mounting, and basic custom work.\n\nAs a family business, we value long-term relationships over one-off transactions. Most of our customers have been coming to us for over a decade — and many brought their kids in, who now bring theirs. That's the kind of trust we're proud to have earned across Western Sydney.",
    skills: [
      'Category A & B Firearms',
      'Handguns (Cat H — SSAA members)',
      'Ammunition — All Calibres',
      'Optics & Scope Mounting',
      'Gun Safes & Secure Storage',
      'Gunsmithing & Servicing',
      'Firearms Transfers & Consignment',
      'Layby Available',
      'Hunting Gear & Accessories',
      'Firearms Licence Guidance',
    ],
    experience: [],
    education: [],
    projects: [],
    referees: [],
    socialLinks: [
      { platform: 'youtube',   url: 'https://www.youtube.com/@MickSmithsGuns',              label: 'YouTube' },
      { platform: 'facebook',  url: 'https://www.facebook.com/MickSmithsGunsSydney',        label: 'Facebook' },
      { platform: 'instagram', url: 'https://www.instagram.com/micksmithsguns',              label: 'Instagram' },
      { platform: 'website',   url: 'https://www.micksmithsguns.com.au',                    label: 'Website' },
    ],
    introVideoId: null,
    attachments,
    avatar_path: null,
    banner_path: null,
    cultureSuccess: "Success to us is a customer who comes back — and brings someone with them. We measure it in long-term relationships, not transactions. When a licence holder tells us our advice helped them choose the right firearm for their needs, or a competition shooter wins their first club match with a rifle we helped them set up, that's what success looks like.",
    cultureConflict: "We handle disagreements directly and professionally — whether it's a stock dispute with a supplier or a customer concern about a service. Mick's rule is simple: talk first, document everything, and never let something fester. We comply with all NSW Firearms Registry requirements without exception, and any compliance question goes straight to Mick.",
    cultureFeedback: "We're a small team and feedback is real-time. If something's not working — whether it's a product we're stocking, a process in the workshop, or how we're handling a type of enquiry — we talk about it at the weekly team huddle. Everyone's voice counts.",
    cultureDecisions: "Major decisions — new product lines, pricing, staffing — are made by Mick. Day-to-day decisions are owned by whoever's handling the situation. We trust our team to use good judgement and escalate when in doubt.",
    profileSelections: [],
    sectionOrder: ['intro', 'social', 'skills', 'experience', 'projects', 'attachments'],
    sectionVisibility: {
      basic: true, skills: true, social: true,
      projects: true, referees: true, education: true,
      experience: true, attachments: true,
    },
    itemVisibility: { social: {}, projects: {}, referees: {}, education: {}, experience: {} },
  }

  await supabase.from('business_bank_items').delete().eq('user_id', USER_ID).eq('item_type', 'profile')
  const { error: profErr } = await supabase.from('business_bank_items').insert({
    user_id: USER_ID,
    item_type: 'profile',
    title: "Mick Smith's Guns — Business Profile",
    description: "Full business profile metadata for Mick Smith's Guns, Penrith NSW.",
    metadata: profileMeta,
  })
  if (profErr) console.warn(`  ⚠️  Profile metadata: ${profErr.message}`)
  else console.log('  ✅  Profile metadata bank item')

  // ── 7. business_profile_pages ─────────────────────────────────────────────
  console.log('\n🌐  Setting up business_profile_pages...')
  const { error: ppErr } = await supabase.from('business_profile_pages').upsert({
    business_id: BIZ_ID,
    slug: SLUG,
    is_published: true,
    name: "Mick Smith's Guns",
    logo_url: logoUrl,
    hero_image_url: heroUrl || logoUrl,
    tagline: "Western Sydney's Premier Firearms & Ammunition Retailer — Since 1992",
    mission: "To provide responsible, knowledgeable, and trustworthy firearms retail to the Western Sydney community — helping shooters, hunters, farmers, and collectors access the gear they need safely and legally.",
    value_prop_headline: "Penrith's Most Trusted Gun Shop Since 1992",
    value_prop_body: "Mick Smith's Guns carries over 400 firearms across Category A, B, and H, one of NSW's largest ammunition walls, and a full gunsmithing workshop. We're a family business built on trust, compliance, and a genuine love for the shooting sports.",
    impact_stats: [
      { label: 'Years Serving Western Sydney', value: '32+', footnote_optional: 'Since 1992' },
      { label: 'Firearms in Stock', value: '400+', footnote_optional: 'Cat A, B & H' },
      { label: 'Ammunition Lines', value: '200+', footnote_optional: 'All popular calibres' },
      { label: 'Licensed Staff', value: '5', footnote_optional: 'All NSW Firearms licenced' },
      { label: 'Layby Available', value: 'Yes', footnote_optional: 'No interest — 10 week terms' },
      { label: 'Gunsmithing Turnaround', value: '3–5 days', footnote_optional: 'Standard service' },
    ],
    culture_values: [
      'Safety First — Always',
      'Compliance Without Compromise',
      'Genuine Product Knowledge',
      'Long-Term Customer Relationships',
      'Support for the Shooting Community',
      'Responsible Retail',
    ],
    business_areas: [
      { area: 'Firearms Sales', description: 'Category A, B, and H firearms from leading Australian and international manufacturers including Tikka, Browning, Beretta, Remington, CZ, and Glock. New, used, and consignment.' },
      { area: 'Ammunition & Accessories', description: "One of NSW's largest in-store ammunition selections across all calibres. Optics, cleaning kits, holsters, safes, slings, and range gear from top brands." },
      { area: 'Gunsmithing & Servicing', description: 'Full gunsmithing workshop for cleaning, servicing, scope mounting, trigger adjustments, and basic custom work. Turnaround typically 3–5 business days.' },
    ],
    benefits: [
      { title: 'Staff Discount on All Stock', description: '20% discount on all store merchandise for full-time staff. Range of firearms and gear available for purchase on extended payment plans.' },
      { title: 'Product Training', description: 'Ongoing manufacturer training, demo days, and attendance at trade shows. We invest in keeping our team the most knowledgeable in Western Sydney.' },
      { title: 'Club Partnerships', description: "Staff get complimentary membership to the Penrith & District Pistol Club and discounted rates at the Hawkesbury Pistol Club — so you can actually shoot what you're selling." },
    ],
    updated_at: new Date().toISOString(),
  }, { onConflict: 'business_id' })
  if (ppErr) console.warn(`  ⚠️  business_profile_pages: ${ppErr.message}`)
  else console.log('  ✅  business_profile_pages published at /businesses/mick-smiths-guns')

  // ── 8. Update business_profiles logo/hero ─────────────────────────────────
  if (logoUrl || heroUrl) {
    await supabase.from('business_profiles').update({
      logo_url: logoUrl,
      hero_image_url: heroUrl,
    }).eq('id', BIZ_ID)
    console.log('  ✅  Logo and hero written to business_profiles')
  }

  // ── 9. Seed jobs ──────────────────────────────────────────────────────────
  console.log('\n💼  Seeding jobs...')
  await supabase.from('jobs').delete().eq('business_id', BIZ_ID)
  for (const job of JOBS) {
    const { error: jobErr } = await supabase.from('jobs').insert({
      ...job,
      business_id: BIZ_ID,
      business_profile_id: BIZ_ID,
      created_at: new Date().toISOString(),
    })
    if (jobErr) console.warn(`  ⚠️  Job "${job.title}": ${jobErr.message}`)
    else console.log(`  ✅  Job: ${job.title}`)
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log(`
✅  Mick Smith's Guns seeded successfully!

  Public profile:  /businesses/mick-smiths-guns
  Dashboard:       /dashboard/business (log in as micksmithsguns@gmail.com)
  Images:          ${IMAGES.length} generated & uploaded
  Links:           YouTube · Facebook · Instagram · Website · Club
  Jobs:            ${JOBS.length} published
  Tmp images:      ${tmpDir}
`)
}

main().catch(err => {
  console.error('\n❌  Script failed:', err.message)
  process.exit(1)
})
