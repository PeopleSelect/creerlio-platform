import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceServer, getUserFromBearer } from '@/lib/supabaseServer'

// GET — returns all snapshot access requests sent by the current (business) user
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    const user = await getUserFromBearer(token)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const supabase = supabaseServiceServer()

    const { data: requests, error } = await supabase
      .from('snapshot_access_requests')
      .select('id, snapshot_id, requester_name, requester_company, reason, status, decided_at, created_at')
      .eq('requester_user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // For approved requests, get the talent_id from talent_snapshots so we can link to their profile
    const approvedSnapshotIds = (requests || [])
      .filter((r: any) => r.status === 'approved')
      .map((r: any) => r.snapshot_id)

    let talentIdBySnapshotId: Record<string, string> = {}
    if (approvedSnapshotIds.length > 0) {
      const { data: snaps } = await supabase
        .from('talent_snapshots')
        .select('id, talent_id, headline, location, experience_years')
        .in('id', approvedSnapshotIds)

      for (const snap of (snaps || [])) {
        talentIdBySnapshotId[snap.id] = snap.talent_id
      }
    }

    // Also get snapshot headline for all requests (for display context)
    const allSnapshotIds = (requests || []).map((r: any) => r.snapshot_id)
    let snapshotMeta: Record<string, { headline: string; location: string | null; experience_years: number | null }> = {}
    if (allSnapshotIds.length > 0) {
      const { data: snaps } = await supabase
        .from('talent_snapshots')
        .select('id, headline, location, experience_years')
        .in('id', allSnapshotIds)

      for (const snap of (snaps || [])) {
        snapshotMeta[snap.id] = {
          headline: snap.headline,
          location: snap.location,
          experience_years: snap.experience_years,
        }
      }
    }

    const enriched = (requests || []).map((r: any) => ({
      ...r,
      talent_id: r.status === 'approved' ? (talentIdBySnapshotId[r.snapshot_id] || null) : null,
      snapshot_headline: snapshotMeta[r.snapshot_id]?.headline || null,
      snapshot_location: snapshotMeta[r.snapshot_id]?.location || null,
      snapshot_experience_years: snapshotMeta[r.snapshot_id]?.experience_years || null,
    }))

    return NextResponse.json({ requests: enriched })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}
