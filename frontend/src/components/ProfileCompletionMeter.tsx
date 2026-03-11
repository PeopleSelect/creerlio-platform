'use client'

interface CompletionItem {
  label: string
  description: string
  completed: boolean
  href?: string
  points: number
}

interface ProfileCompletionMeterProps {
  profile: {
    name?: string | null
    bio?: string | null
    title?: string | null
    avatar_url?: string | null
    banner_url?: string | null
    skills?: string[] | null
  }
  hasProjects?: boolean
  hasAchievements?: boolean
  hasReferences?: boolean
  className?: string
}

export default function ProfileCompletionMeter({
  profile,
  hasProjects = false,
  hasAchievements = false,
  hasReferences = false,
  className = '',
}: ProfileCompletionMeterProps) {
  const items: CompletionItem[] = [
    {
      label: 'Add your name',
      description: 'Your full name on your profile',
      completed: !!profile.name?.trim(),
      href: '/dashboard/talent/edit',
      points: 10,
    },
    {
      label: 'Add a headline',
      description: 'A short professional title',
      completed: !!profile.title?.trim(),
      href: '/dashboard/talent/edit',
      points: 10,
    },
    {
      label: 'Write a bio',
      description: 'Tell employers who you are',
      completed: !!profile.bio?.trim(),
      href: '/dashboard/talent/edit',
      points: 15,
    },
    {
      label: 'Upload a profile photo',
      description: 'Profiles with photos get 3x more views',
      completed: !!profile.avatar_url?.trim(),
      href: '/dashboard/talent/edit',
      points: 15,
    },
    {
      label: 'Add your skills',
      description: 'At least 3 skills',
      completed: (profile.skills?.length ?? 0) >= 3,
      href: '/dashboard/talent/edit',
      points: 15,
    },
    {
      label: 'Add portfolio projects',
      description: 'Showcase your best work',
      completed: hasProjects,
      href: '/dashboard/talent/bank',
      points: 15,
    },
    {
      label: 'Add achievements',
      description: 'Awards, certifications, milestones',
      completed: hasAchievements,
      href: '/dashboard/talent/edit',
      points: 10,
    },
    {
      label: 'Add a reference',
      description: 'Let others vouch for your work',
      completed: hasReferences,
      href: '/dashboard/talent/edit',
      points: 10,
    },
  ]

  const totalPoints = items.reduce((sum, item) => sum + item.points, 0)
  const earnedPoints = items
    .filter((item) => item.completed)
    .reduce((sum, item) => sum + item.points, 0)
  const percentage = Math.round((earnedPoints / totalPoints) * 100)
  const completedCount = items.filter((i) => i.completed).length

  const getColor = () => {
    if (percentage >= 80) return 'emerald'
    if (percentage >= 50) return 'yellow'
    return 'red'
  }
  const color = getColor()

  const colorMap = {
    emerald: {
      bar: 'bg-emerald-500',
      text: 'text-emerald-400',
      badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    },
    yellow: {
      bar: 'bg-yellow-500',
      text: 'text-yellow-400',
      badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
    },
    red: {
      bar: 'bg-red-500',
      text: 'text-red-400',
      badge: 'bg-red-500/15 text-red-300 border-red-500/30',
    },
  }
  const c = colorMap[color]

  return (
    <div className={`rounded-2xl bg-slate-900 border border-slate-800 p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold text-white text-sm">Profile Completion</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {completedCount} of {items.length} steps complete
          </p>
        </div>
        <span className={`text-2xl font-bold ${c.text}`}>{percentage}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${c.bar}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Checklist */}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.label}>
            {item.completed ? (
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/50">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-slate-500 line-through">{item.label}</span>
                <span className="ml-auto text-xs text-emerald-500/60">+{item.points}</span>
              </div>
            ) : (
              <a
                href={item.href || '#'}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors group"
              >
                <div className="w-5 h-5 rounded-full border-2 border-slate-600 group-hover:border-slate-400 shrink-0 transition-colors" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors block">{item.label}</span>
                  <span className="text-xs text-slate-500 truncate block">{item.description}</span>
                </div>
                <span className="text-xs text-slate-600 group-hover:text-slate-500 shrink-0">+{item.points}pts</span>
              </a>
            )}
          </li>
        ))}
      </ul>

      {percentage === 100 && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-center">
          <p className="text-sm font-semibold text-emerald-300">Profile complete! You're in the top 10% of talent on Creerlio.</p>
        </div>
      )}
    </div>
  )
}
