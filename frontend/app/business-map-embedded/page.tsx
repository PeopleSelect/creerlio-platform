import { BusinessMapPageInner } from '@/app/business-map/page'

export const dynamic = 'force-dynamic'

export default function BusinessMapEmbeddedPage() {
  return <BusinessMapPageInner forceEmbedded />
}
