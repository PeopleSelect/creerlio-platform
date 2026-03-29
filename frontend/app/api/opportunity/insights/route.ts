export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer } from '@/lib/supabaseServer'

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '') || null
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = req.nextUrl
    const user_id = searchParams.get('user_id')
    const mode = searchParams.get('mode') || 'talent'  // 'talent' | 'business'

    const svc = supabaseServiceServer()

    // Geo heatmap data
    const { data: geoInsights } = await svc
      .from('geo_insights')
      .select('*')
      .order('job_density', { ascending: false })
      .limit(20)

    // Top scored opportunities for this user
    let topOpportunities: any[] = []
    if (user_id) {
      const { data } = await svc
        .from('opportunity_scores')
        .select('*')
        .eq('user_id', user_id)
        .order('total_score', { ascending: false })
        .limit(5)
      topOpportunities = data || []
    }

    // Generate contextual recommendations
    const recommendations: string[] = []
    if (mode === 'talent') {
      const avgScore = topOpportunities.length
        ? topOpportunities.reduce((s, r) => s + r.total_score, 0) / topOpportunities.length
        : null
      if (avgScore !== null && avgScore < 50)
        recommendations.push('Your top matches score below 50. Consider expanding location or remote options.')
      if (geoInsights && geoInsights[0])
        recommendations.push(`${geoInsights[0].location} has the highest job density right now.`)
      recommendations.push('Roles with hybrid work modes score 20+ points higher on average.')
    } else {
      if (geoInsights) {
        const highDensity = geoInsights.filter((g: any) => g.talent_density > 70)
        if (highDensity.length)
          recommendations.push(`High talent pools in: ${highDensity.map((g: any) => g.location).slice(0, 3).join(', ')}.`)
      }
      recommendations.push('Offering hybrid or remote increases qualified applicant pool by ~45%.')
      recommendations.push('Roles with salary transparency attract 3× more applications.')
    }

    return NextResponse.json({
      success: true,
      geo_insights: geoInsights || [],
      top_opportunities: topOpportunities,
      recommendations,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
