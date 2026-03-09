import { notFound } from 'next/navigation'
import { supabaseAnonServer } from '@/lib/supabaseServer'
import { PublicProfilePage } from '@/components/profile-sharing/PublicProfilePage'
import { isReservedUsername, normalizeUsername } from '@/lib/username'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: { params: { username: string } }) {
  const { username } = props.params
  const u = normalizeUsername(username)
  if (!u || isReservedUsername(u)) return {}

  const supabase = supabaseAnonServer()
  const { data } = await supabase
    .from('public_talent_profiles')
    .select('name, short_bio, profile_photo_url, headline, username')
    .eq('username', u)
    .eq('is_public', true)
    .maybeSingle()

  if (!data) return {}
  const title = `${data.name || data.username} | Talent Profile | Creerlio`
  const description = String(data.short_bio || data.headline || 'Professional talent profile on Creerlio.').slice(0, 160)

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: data.profile_photo_url ? [data.profile_photo_url] : [],
    },
  }
}

export default async function UsernameProfilePage(props: { params: { username: string } }) {
  const { username } = props.params
  const u = normalizeUsername(username)

  if (!u || isReservedUsername(u)) notFound()

  const supabase = supabaseAnonServer()
  const { data, error } = await supabase
    .from('public_talent_profiles')
    .select('*')
    .eq('username', u)
    .eq('is_public', true)
    .maybeSingle()

  if (error || !data) notFound()

  return <PublicProfilePage profile={data as any} />
}

