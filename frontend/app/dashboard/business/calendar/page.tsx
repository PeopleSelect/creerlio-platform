'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface CalendarEvent {
  id: string
  title: string
  date: Date
  type: 'meeting' | 'interview' | 'interaction'
  talentName?: string
  status?: string
  connectionRequestId?: string
  talentId?: string
}

export default function BusinessCalendarPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [eventDetails, setEventDetails] = useState<any>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [acceptingSession, setAcceptingSession] = useState<string | null>(null)
  const [decliningSession, setDecliningSession] = useState<string | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleTalentId, setScheduleTalentId] = useState<string | null>(null)
  const [scheduleConnectionId, setScheduleConnectionId] = useState<string | null>(null)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [scheduling, setScheduling] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const uid = sessionData?.session?.user?.id
        if (!uid) {
          router.push('/login')
          return
        }
        setUserId(uid)

        // Get business profile
        const { data: businessData } = await supabase
          .from('business_profiles')
          .select('id')
          .eq('user_id', uid)
          .maybeSingle()

        if (!businessData?.id) {
          router.push('/dashboard/business')
          return
        }
        setBusinessId(String(businessData.id))

        // Fetch video chat sessions (meetings/interviews) where business is involved
        const { data: sessions } = await supabase
          .from('video_chat_sessions')
          .select('id, talent_id, started_at, status, connection_request_id')
          .eq('business_id', businessData.id)
          .in('status', ['pending', 'active'])
          .not('started_at', 'is', null)

        // Fetch accepted connection requests (interactions) - get talent IDs first
        const { data: connections } = await supabase
          .from('talent_connection_requests')
          .select('id, talent_id, created_at, responded_at')
          .eq('business_id', businessData.id)
          .eq('status', 'accepted')

        // Fetch talent names for both sessions and connections
        const sessionTalentIds = [...new Set((sessions || []).map(s => s.talent_id).filter(Boolean))]
        const connectionTalentIds = [...new Set((connections || []).map(c => c.talent_id).filter(Boolean))]
        const allTalentIds = [...new Set([...sessionTalentIds, ...connectionTalentIds])]
        
        let talentNames: Record<string, string> = {}
        if (allTalentIds.length > 0) {
          const { data: talents } = await supabase
            .from('talent_profiles')
            .select('id, title, full_name')
            .in('id', allTalentIds)
          
          if (talents) {
            talents.forEach(t => {
              talentNames[String(t.id)] = t.title || t.full_name || 'Talent'
            })
          }
        }

        // Combine into calendar events
        const calendarEvents: CalendarEvent[] = []

        // Add video chat sessions
        if (sessions) {
          sessions.forEach(session => {
            if (session.started_at) {
              calendarEvents.push({
                id: session.id,
                title: `Meeting with ${talentNames[String(session.talent_id)] || 'Talent'}`,
                date: new Date(session.started_at),
                type: session.status === 'pending' ? 'interview' : 'meeting',
                talentName: talentNames[String(session.talent_id)],
                status: session.status,
                connectionRequestId: session.connection_request_id,
                talentId: session.talent_id
              })
            }
          })
        }

        // Add accepted connections as interactions
        if (connections) {
          connections.forEach(conn => {
            const eventDate = conn.responded_at ? new Date(conn.responded_at) : new Date(conn.created_at)
            // Get talent name for this connection
            const talentName = conn.talent_id ? talentNames[String(conn.talent_id)] : undefined
            calendarEvents.push({
              id: `conn-${conn.id}`,
              title: `Talent interaction`,
              date: eventDate,
              type: 'interaction',
              connectionRequestId: conn.id,
              talentId: conn.talent_id,
              talentName: talentName
            })
          })
        }

        setEvents(calendarEvents)
      } catch (error) {
        console.error('Error loading calendar:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Check if we should show schedule meeting modal
    const scheduleMeeting = searchParams?.get('schedule_meeting')
    const talentId = searchParams?.get('talent_id')
    const connectionId = searchParams?.get('connection_id')
    if (scheduleMeeting === 'true' && talentId && connectionId) {
      setScheduleTalentId(talentId)
      setScheduleConnectionId(connectionId)
      setShowScheduleModal(true)
    }
  }, [router, searchParams])

  const handleScheduleMeeting = async () => {
    if (!scheduleDate || !scheduleTime || !scheduleTalentId || !scheduleConnectionId || !businessId) {
      alert('Please select both date and time')
      return
    }

    setScheduling(true)
    try {
      const dateTime = new Date(`${scheduleDate}T${scheduleTime}`)
      if (dateTime < new Date()) {
        alert('Please select a future date and time')
        setScheduling(false)
        return
      }

      const { data: sessionRes } = await supabase.auth.getSession()
      if (!sessionRes?.session?.user?.id) {
        throw new Error('Please sign in to schedule a meeting')
      }

      // Create video chat session with scheduled time
      const { data: session, error } = await supabase
        .from('video_chat_sessions')
        .insert({
          talent_id: scheduleTalentId,
          business_id: businessId,
          connection_request_id: scheduleConnectionId,
          status: 'pending',
          initiated_by: 'business',
          initiated_by_user_id: sessionRes.session.user.id,
          started_at: dateTime.toISOString()
        })
        .select()
        .single()

      if (error) throw error

      alert('Meeting scheduled successfully! The talent will be notified and can accept or decline.')
      setShowScheduleModal(false)
      setScheduleDate('')
      setScheduleTime('')
      setScheduleTalentId(null)
      setScheduleConnectionId(null)
      
      // Clear URL parameters and reload calendar data
      router.push('/dashboard/business/calendar')
      setTimeout(() => {
        window.location.reload()
      }, 100)
    } catch (error: any) {
      console.error('Error scheduling meeting:', error)
      alert(error.message || 'Failed to schedule meeting. Please try again.')
    } finally {
      setScheduling(false)
    }
  }

  const handleAcceptSession = async (sessionId: string) => {
    setAcceptingSession(sessionId)
    try {
      const { error } = await supabase
        .from('video_chat_sessions')
        .update({ status: 'active' })
        .eq('id', sessionId)

      if (error) throw error

      // Reload calendar data
      const { data: sessionData } = await supabase.auth.getSession()
      const uid = sessionData?.session?.user?.id
      if (!uid) return

      const { data: businessData } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', uid)
        .maybeSingle()

      if (!businessData?.id) return

      const { data: sessions } = await supabase
        .from('video_chat_sessions')
        .select('id, talent_id, started_at, status, connection_request_id')
        .eq('business_id', businessData.id)
        .in('status', ['pending', 'active'])
        .not('started_at', 'is', null)

      // Update events
      const sessionTalentIds = [...new Set((sessions || []).map(s => s.talent_id).filter(Boolean))]
      let talentNames: Record<string, string> = {}
      if (sessionTalentIds.length > 0) {
        const { data: talents } = await supabase
          .from('talent_profiles')
          .select('id, title, full_name')
          .in('id', sessionTalentIds)
        
        if (talents) {
          talents.forEach(t => {
            talentNames[String(t.id)] = t.title || t.full_name || 'Talent'
          })
        }
      }

      const updatedEvents = events.map(event => {
        if (event.id === sessionId) {
          return {
            ...event,
            type: 'meeting' as const,
            status: 'active'
          }
        }
        return event
      })

      setEvents(updatedEvents)
      setSelectedEvent(null)
      
      // Reload calendar data to ensure sync
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (error) {
      console.error('Error accepting session:', error)
      alert('Failed to accept meeting. Please try again.')
    } finally {
      setAcceptingSession(null)
    }
  }

  const handleDeclineSession = async (sessionId: string) => {
    setDecliningSession(sessionId)
    try {
      const { error } = await supabase
        .from('video_chat_sessions')
        .update({ status: 'cancelled' })
        .eq('id', sessionId)

      if (error) throw error

      // Remove from events
      setEvents(events.filter(e => e.id !== sessionId))
      setSelectedEvent(null)
      
      // Reload calendar data to ensure sync
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (error) {
      console.error('Error declining session:', error)
      alert('Failed to decline meeting. Please try again.')
    } finally {
      setDecliningSession(null)
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek, year, month }
  }

  const getEventsForDate = (date: number) => {
    const { year, month } = getDaysInMonth(currentMonth)
    const eventDate = new Date(year, month, date)
    return events.filter(event => {
      const eventDateOnly = new Date(event.date.getFullYear(), event.date.getMonth(), event.date.getDate())
      const compareDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
      return eventDateOnly.getTime() === compareDateOnly.getTime()
    })
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth)
  const today = new Date()
  const isToday = (day: number) => {
    return day === today.getDate() && 
           month === today.getMonth() && 
           year === today.getFullYear()
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  const handleEventClick = async (event: CalendarEvent) => {
    setSelectedEvent(event)
    setLoadingDetails(true)
    setEventDetails(null)

    try {
      let details: any = {
        event: event,
        talentInfo: null,
        connectionInfo: null,
        sessionInfo: null
      }

      // Fetch talent information if talentId exists
      if (event.talentId) {
        const { data: talentData } = await supabase
          .from('talent_profiles')
          .select('id, title, full_name, city, state, country, search_summary')
          .eq('id', event.talentId)
          .maybeSingle()
        
        if (talentData) {
          details.talentInfo = talentData
        }
      }

      // Fetch connection request details if connectionRequestId exists
      if (event.connectionRequestId) {
        const { data: connData } = await supabase
          .from('talent_connection_requests')
          .select('id, status, created_at, responded_at, initiated_by')
          .eq('id', event.connectionRequestId)
          .maybeSingle()
        
        if (connData) {
          details.connectionInfo = connData
        }
      }

      // Fetch video chat session details if it's a meeting/interview
      if (event.type === 'meeting' || event.type === 'interview') {
        const { data: sessionData } = await supabase
          .from('video_chat_sessions')
          .select('id, started_at, status, ended_at, connection_request_id')
          .eq('id', event.id)
          .maybeSingle()
        
        if (sessionData) {
          details.sessionInfo = sessionData
        }
      }

      setEventDetails(details)
    } catch (error) {
      console.error('Error loading event details:', error)
    } finally {
      setLoadingDetails(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-600">Loading calendar...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link
            href="/dashboard/business"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="dashboard-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={previousMonth}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ← Previous
              </button>
              <h2 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
                {monthNames[month]} {year}
              </h2>
              <button
                onClick={nextMonth}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {dayNames.map(day => (
              <div key={day} className="text-center font-semibold text-gray-700 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: startingDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="aspect-square"></div>
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1
              const dayEvents = getEventsForDate(day)
              const todayClass = isToday(day) ? 'bg-blue-600 text-white font-semibold' : 'bg-white text-gray-900'
              
              return (
                <div
                  key={day}
                  className={`aspect-square border border-gray-200 rounded-lg p-2 ${todayClass} ${
                    dayEvents.length > 0 ? 'border-blue-400 border-2' : ''
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday(day) ? 'text-white' : 'text-gray-900'}`}>{day}</div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map(event => (
                      <div
                        key={event.id}
                        onClick={() => handleEventClick(event)}
                        className={`text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity ${
                          event.type === 'meeting' 
                            ? 'bg-green-100 text-green-700' 
                            : event.type === 'interview'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className={`text-xs ${isToday(day) ? 'text-white' : 'text-gray-700'}`}>
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span className="text-gray-700">Meeting</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
              <span className="text-gray-700">Interview</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
              <span className="text-gray-700">Interaction</span>
            </div>
          </div>

          {/* Upcoming Events List */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Events</h3>
            {events.filter(e => e.date >= new Date()).length === 0 ? (
              <p className="text-gray-600">No upcoming events scheduled.</p>
            ) : (
              <div className="space-y-3">
                {events
                  .filter(e => e.date >= new Date())
                  .sort((a, b) => a.date.getTime() - b.date.getTime())
                  .slice(0, 10)
                  .map(event => (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">{event.title}</div>
                          {event.talentName && (
                            <div className="text-sm text-gray-600 mt-1">with {event.talentName}</div>
                          )}
                          <div className="text-sm text-gray-500 mt-1">
                            {event.date.toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          event.type === 'meeting' 
                            ? 'bg-green-100 text-green-700' 
                            : event.type === 'interview'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {event.type}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Event Details</h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {loadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : eventDetails ? (
                <div className="space-y-6">
                  {/* Event Type Badge */}
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      selectedEvent.type === 'meeting' 
                        ? 'bg-green-100 text-green-700' 
                        : selectedEvent.type === 'interview'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {selectedEvent.type.charAt(0).toUpperCase() + selectedEvent.type.slice(1)}
                    </span>
                  </div>

                  {/* Event Title */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{selectedEvent.title}</h3>
                    <p className="text-gray-600 mt-1">
                      {selectedEvent.date.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  {/* Talent Information */}
                  {eventDetails.talentInfo && (
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Talent Information</h4>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Name:</span>
                          <p className="text-gray-900">{eventDetails.talentInfo.title || eventDetails.talentInfo.full_name || 'N/A'}</p>
                        </div>
                        {(eventDetails.talentInfo.city || eventDetails.talentInfo.state || eventDetails.talentInfo.country) && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Location:</span>
                            <p className="text-gray-900">
                              {[eventDetails.talentInfo.city, eventDetails.talentInfo.state, eventDetails.talentInfo.country]
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                          </div>
                        )}
                        {eventDetails.talentInfo.search_summary && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Summary:</span>
                            <p className="text-gray-900 mt-1">{eventDetails.talentInfo.search_summary}</p>
                          </div>
                        )}
                        {eventDetails.talentInfo.id && (
                          <div className="pt-2">
                            <Link
                              href={`/portfolio/view?id=${eventDetails.talentInfo.id}`}
                              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              View Talent Portfolio →
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Connection Information */}
                  {eventDetails.connectionInfo && (
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Connection Details</h4>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Status:</span>
                          <p className="text-gray-900 capitalize">{eventDetails.connectionInfo.status || 'N/A'}</p>
                        </div>
                        {eventDetails.connectionInfo.initiated_by && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Initiated By:</span>
                            <p className="text-gray-900 capitalize">{eventDetails.connectionInfo.initiated_by}</p>
                          </div>
                        )}
                        {eventDetails.connectionInfo.created_at && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Connection Requested:</span>
                            <p className="text-gray-900">
                              {new Date(eventDetails.connectionInfo.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        )}
                        {eventDetails.connectionInfo.responded_at && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Connection Accepted:</span>
                            <p className="text-gray-900">
                              {new Date(eventDetails.connectionInfo.responded_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Session Information (for meetings/interviews) */}
                  {eventDetails.sessionInfo && (
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Session Details</h4>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Status:</span>
                          <p className="text-gray-900 capitalize">{eventDetails.sessionInfo.status || 'N/A'}</p>
                        </div>
                        {eventDetails.sessionInfo.started_at && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Scheduled Time:</span>
                            <p className="text-gray-900">
                              {new Date(eventDetails.sessionInfo.started_at).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        )}
                        {eventDetails.sessionInfo.ended_at && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Ended:</span>
                            <p className="text-gray-900">
                              {new Date(eventDetails.sessionInfo.ended_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Accept/Decline buttons for pending interviews */}
                  {selectedEvent.type === 'interview' && selectedEvent.status === 'pending' && (
                    <div className="border-t border-gray-200 pt-4 flex gap-4">
                      <button
                        onClick={() => handleAcceptSession(selectedEvent.id)}
                        disabled={acceptingSession === selectedEvent.id}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {acceptingSession === selectedEvent.id ? 'Accepting...' : 'Accept Meeting'}
                      </button>
                      <button
                        onClick={() => handleDeclineSession(selectedEvent.id)}
                        disabled={decliningSession === selectedEvent.id}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {decliningSession === selectedEvent.id ? 'Declining...' : 'Decline Meeting'}
                      </button>
                    </div>
                  )}

                  {/* Fallback if no additional details */}
                  {!eventDetails.talentInfo && !eventDetails.connectionInfo && !eventDetails.sessionInfo && (
                    <div className="text-gray-600">
                      <p>No additional details available for this event.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-600">
                  <p>Unable to load event details.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowScheduleModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Schedule Meeting</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleScheduleMeeting}
                  disabled={scheduling || !scheduleDate || !scheduleTime}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {scheduling ? 'Scheduling...' : 'Schedule Meeting'}
                </button>
                <button
                  onClick={() => {
                    setShowScheduleModal(false)
                    setScheduleDate('')
                    setScheduleTime('')
                    setScheduleTalentId(null)
                    setScheduleConnectionId(null)
                    router.push('/dashboard/business/calendar')
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
