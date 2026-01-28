import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const {
      profile_id,
      website_url,
      industry_hint,
      pasted_text,
      ai_mode = 'safe'
    } = await req.json()

    // Create Supabase client with SERVICE ROLE
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 🔹 STEP 1: Mark import as started
    await supabase
      .from('business_public_profiles_lite')
      .update({
        import_status: 'importing',
        import_error: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile_id)

    // 🔹 STEP 2: (later) call OpenAI, fetch website, generate content
    // (stubbed here for clarity)
    const business_name = 'KFC Australia'
    const short_summary = 'Fast food restaurant chain specialising in fried chicken.'

    // 🔹 STEP 3: Save generated content
    await supabase
      .from('business_public_profiles_lite')
      .update({
        business_name,
        short_summary,
        ai_generated: true,
        import_status: 'complete',
        updated_at: new Date().toISOString()
      })
      .eq('id', profile_id)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error(err)

    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    )
  }
})
