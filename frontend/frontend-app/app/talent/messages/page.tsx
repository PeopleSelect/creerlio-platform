'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  online: boolean;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isOwn: boolean;
}

export default function Messages() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userType, setUserType] = useState<string>('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const type = localStorage.getItem('userType');

    if (!token) {
      router.push('/auth/login');
      return;
    }

    setUserType(type || '');
    setUser({ email: type === 'Talent' ? 'talent@demo.com' : 'business@demo.com', type });

    // Mock conversations data
    const mockConversations: Conversation[] = type === 'Talent' 
      ? [
          {
            id: '1',
            name: 'TechCorp Recruiting',
            avatar: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100',
            lastMessage: 'We would love to schedule an interview with you!',
            timestamp: '2 min ago',
            unread: 2,
            online: true,
          },
          {
            id: '2',
            name: 'StartupXYZ',
            avatar: 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=100',
            lastMessage: 'Thanks for your application. We\'ll be in touch soon.',
            timestamp: '1 hour ago',
            unread: 0,
            online: false,
          },
          {
            id: '3',
            name: 'Innovation Labs',
            avatar: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=100',
            lastMessage: 'Great portfolio! Let\'s chat about opportunities.',
            timestamp: '3 hours ago',
            unread: 1,
            online: true,
          },
        ]
      : [
          {
            id: '1',
            name: 'Sarah Johnson',
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
            lastMessage: 'I\'m very interested in the Senior Developer position.',
            timestamp: '5 min ago',
            unread: 1,
            online: true,
          },
          {
            id: '2',
            name: 'Michael Chen',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
            lastMessage: 'Thank you for considering my application.',
            timestamp: '2 hours ago',
            unread: 0,
            online: false,
          },
          {
            id: '3',
            name: 'Emily Rodriguez',
            avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
            lastMessage: 'When would be a good time for an interview?',
            timestamp: '1 day ago',
            unread: 0,
            online: true,
          },
        ];

    setConversations(mockConversations);
    setSelectedConversation(mockConversations[0]);

    // Mock messages for first conversation
    const mockMessages: Message[] = type === 'Talent'
      ? [
          {
            id: '1',
            senderId: '1',
            text: 'Hi! We reviewed your application and we\'re really impressed with your background.',
            timestamp: '10:30 AM',
            isOwn: false,
          },
          {
            id: '2',
            senderId: 'me',
            text: 'Thank you so much! I\'m very excited about this opportunity.',
            timestamp: '10:35 AM',
            isOwn: true,
          },
          {
            id: '3',
            senderId: '1',
            text: 'We would love to schedule an interview with you! Are you available next week?',
            timestamp: '10:37 AM',
            isOwn: false,
          },
          {
            id: '4',
            senderId: 'me',
            text: 'Yes, I\'m available anytime next week. What day works best for your team?',
            timestamp: '10:40 AM',
            isOwn: true,
          },
        ]
      : [
          {
            id: '1',
            senderId: 'me',
            text: 'Hi Sarah, thank you for your application. Your experience looks great!',
            timestamp: '9:15 AM',
            isOwn: true,
          },
          {
            id: '2',
            senderId: '1',
            text: 'Thank you! I\'m very interested in the Senior Developer position.',
            timestamp: '9:20 AM',
            isOwn: false,
          },
          {
            id: '3',
            senderId: 'me',
            text: 'Would you be available for a quick call tomorrow to discuss the role further?',
            timestamp: '9:25 AM',
            isOwn: true,
          },
        ];

    setMessages(mockMessages);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    router.push('/');
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      senderId: 'me',
      text: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
    };

    setMessages([...messages, message]);
    setNewMessage('');

    // Update last message in conversation
    if (selectedConversation) {
      const updatedConversations = conversations.map((conv) =>
        conv.id === selectedConversation.id
          ? { ...conv, lastMessage: newMessage, timestamp: 'Just now' }
          : conv
      );
      setConversations(updatedConversations);
    }
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    
    // Mark as read
    const updatedConversations = conversations.map((c) =>
      c.id === conv.id ? { ...c, unread: 0 } : c
    );
    setConversations(updatedConversations);

    // Load mock messages for this conversation
    // In a real app, this would fetch from API
  };

  if (!user) return null;

  const dashboardPath = userType === 'Talent' ? '/talent/dashboard' : '/business/dashboard';
  const portfolioPath = userType === 'Talent' ? '/talent/portfolio' : '/business/portfolio';

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <button onClick={() => router.push('/')} className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">C</span>
                </div>
                <span className="text-xl font-serif text-gray-900">Creerlio</span>
              </button>

              <div className="hidden md:flex space-x-1">
                <button onClick={() => router.push(dashboardPath)} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
                  Dashboard
                </button>
                <button onClick={() => router.push(portfolioPath)} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
                  {userType === 'Talent' ? 'Portfolio' : 'Company Profile'}
                </button>
                <button onClick={() => router.push(`/${userType?.toLowerCase()}/messages`)} className="px-4 py-2 text-amber-700 bg-amber-50 rounded-lg text-sm font-medium">
                  Messages
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button className="text-gray-600 hover:text-amber-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              <button onClick={handleLogout} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Messages Interface */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
          <div className="grid grid-cols-12 h-full">
            {/* Conversations List */}
            <div className="col-span-4 border-r border-gray-100 flex flex-col">
              {/* Search */}
              <div className="p-4 border-b border-gray-100">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Conversations */}
              <div className="flex-1 overflow-y-auto">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                      selectedConversation?.id === conv.id ? 'bg-amber-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="relative flex-shrink-0">
                        <img src={conv.avatar} alt={conv.name} className="w-12 h-12 rounded-full object-cover" />
                        {conv.online && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-gray-900 text-sm truncate">{conv.name}</h4>
                          <span className="text-xs text-gray-500">{conv.timestamp}</span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                      </div>
                      {conv.unread > 0 && (
                        <span className="flex-shrink-0 w-5 h-5 bg-amber-600 text-white text-xs rounded-full flex items-center justify-center">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Messages Area */}
            <div className="col-span-8 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img src={selectedConversation.avatar} alt={selectedConversation.name} className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <h3 className="font-semibold text-gray-900">{selectedConversation.name}</h3>
                        <p className="text-sm text-gray-500">{selectedConversation.online ? 'Online' : 'Offline'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </button>
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                      <div key={message.id} className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md ${message.isOwn ? 'order-2' : 'order-1'}`}>
                          <div
                            className={`px-4 py-3 rounded-2xl ${
                              message.isOwn
                                ? 'bg-amber-600 text-white rounded-br-sm'
                                : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                            }`}
                          >
                            <p className="text-sm">{message.text}</p>
                          </div>
                          <p className={`text-xs text-gray-500 mt-1 ${message.isOwn ? 'text-right' : 'text-left'}`}>
                            {message.timestamp}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                      </button>
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={handleSendMessage}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p>Select a conversation to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
