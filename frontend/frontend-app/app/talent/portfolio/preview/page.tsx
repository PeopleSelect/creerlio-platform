'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Eye, Send, Download, Share2, CheckSquare, Square } from 'lucide-react';

interface PortfolioItem {
  id: string;
  type: 'project' | 'experience' | 'skill' | 'certification' | 'education';
  title: string;
  description: string;
  selected: boolean;
}

interface BusinessConnection {
  id: string;
  businessName: string;
  industry: string;
  logo: string;
  sharedItems: string[];
  sharedDate?: Date;
}

export default function PortfolioPreview() {
  const router = useRouter();
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([
    {
      id: '1',
      type: 'project',
      title: 'E-Commerce Platform',
      description: 'Full-stack e-commerce solution with React, Node.js, and MongoDB',
      selected: true
    },
    {
      id: '2',
      type: 'project',
      title: 'Task Management App',
      description: 'Real-time collaborative task management application',
      selected: true
    },
    {
      id: '3',
      type: 'experience',
      title: 'Senior Developer at TechCorp',
      description: '5+ years leading development teams',
      selected: true
    },
    {
      id: '4',
      type: 'skill',
      title: 'JavaScript & TypeScript',
      description: 'Expert level proficiency',
      selected: true
    },
    {
      id: '5',
      type: 'certification',
      title: 'AWS Certified Solutions Architect',
      description: 'Amazon Web Services • 2024',
      selected: false
    }
  ]);

  const [businesses, setBusinesses] = useState<BusinessConnection[]>([
    {
      id: '1',
      businessName: 'Tech Innovations Inc',
      industry: 'Technology',
      logo: '🚀',
      sharedItems: []
    },
    {
      id: '2',
      businessName: 'Creative Solutions Ltd',
      industry: 'Design',
      logo: '🎨',
      sharedItems: []
    }
  ]);

  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMessage, setShareMessage] = useState('');

  const toggleItemSelection = (itemId: string) => {
    setPortfolioItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const selectAllItems = () => {
    setPortfolioItems(items => items.map(item => ({ ...item, selected: true })));
  };

  const deselectAllItems = () => {
    setPortfolioItems(items => items.map(item => ({ ...item, selected: false })));
  };

  const handleShareWithBusiness = (businessId: string) => {
    setSelectedBusiness(businessId);
    setShowShareModal(true);
    
    // Load previously shared items if any
    const business = businesses.find(b => b.id === businessId);
    if (business && business.sharedItems.length > 0) {
      setPortfolioItems(items =>
        items.map(item => ({
          ...item,
          selected: business.sharedItems.includes(item.id)
        }))
      );
    }
  };

  const confirmShare = () => {
    if (!selectedBusiness) return;

    const selectedItemIds = portfolioItems.filter(i => i.selected).map(i => i.id);
    
    setBusinesses(businesses.map(b =>
      b.id === selectedBusiness
        ? { ...b, sharedItems: selectedItemIds, sharedDate: new Date() }
        : b
    ));

    alert(`✅ Portfolio shared with ${businesses.find(b => b.id === selectedBusiness)?.businessName}!\n\nShared ${selectedItemIds.length} items.`);
    setShowShareModal(false);
    setShareMessage('');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project': return '🚀';
      case 'experience': return '💼';
      case 'skill': return '⚡';
      case 'certification': return '🏆';
      case 'education': return '🎓';
      default: return '📄';
    }
  };

  const selectedCount = portfolioItems.filter(i => i.selected).length;

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
            </div>
            <div className="flex items-center space-x-4">
              <button onClick={() => router.push('/talent/portfolio')} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg">
                ← Back to Portfolio
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif text-gray-900 mb-2">Portfolio Preview & Sharing</h1>
          <p className="text-gray-600">Choose what to share with each business connection</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Portfolio Items Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Selection Controls */}
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-serif text-gray-900">Your Portfolio Items</h2>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllItems}
                    className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAllItems}
                    className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>{selectedCount}</strong> of <strong>{portfolioItems.length}</strong> items selected
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  💡 You can customize what you share with each business
                </p>
              </div>

              {/* Portfolio Items List */}
              <div className="space-y-3">
                {portfolioItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleItemSelection(item.id)}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      item.selected
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {item.selected ? (
                          <CheckSquare className="w-5 h-5 text-amber-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{getTypeIcon(item.type)}</span>
                          <h3 className="font-semibold text-gray-900">{item.title}</h3>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {item.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview Section */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
              <h3 className="text-xl font-semibold mb-3">🔍 Live Preview</h3>
              <p className="text-purple-100 mb-4">
                See how your portfolio looks when shared with businesses
              </p>
              <button
                onClick={() => window.open('/talent/portfolio/public', '_blank')}
                className="px-6 py-3 bg-white text-purple-700 rounded-lg font-medium hover:bg-purple-50 flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                View Public Portfolio
              </button>
            </div>
          </div>

          {/* Business Connections */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h2 className="text-xl font-serif text-gray-900 mb-4">Share With Businesses</h2>
              <p className="text-sm text-gray-600 mb-6">
                Select items on the left, then share with specific businesses
              </p>

              <div className="space-y-3">
                {businesses.map((business) => (
                  <div
                    key={business.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-amber-500 transition-all"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg flex items-center justify-center text-2xl">
                        {business.logo}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{business.businessName}</h3>
                        <p className="text-sm text-gray-600">{business.industry}</p>
                      </div>
                    </div>

                    {business.sharedItems.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                        <p className="text-sm text-green-800">
                          ✅ Shared {business.sharedItems.length} items
                        </p>
                        {business.sharedDate && (
                          <p className="text-xs text-green-600 mt-1">
                            Last updated: {business.sharedDate.toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => handleShareWithBusiness(business.id)}
                      className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      {business.sharedItems.length > 0 ? 'Update Shared Items' : 'Share Portfolio'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Download as PDF
                </button>
                <button className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Get Shareable Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && selectedBusiness && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6">
            <h2 className="text-2xl font-serif text-gray-900 mb-4">
              Share with {businesses.find(b => b.id === selectedBusiness)?.businessName}
            </h2>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800">
                ✨ You're about to share <strong>{selectedCount} items</strong> with this business
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add a personal message (optional)
              </label>
              <textarea
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                placeholder="Hi! I'm excited to connect with you. Here's my portfolio showcasing my experience..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                rows={4}
              />
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Selected Items Preview:</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {portfolioItems.filter(i => i.selected).map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded">
                    <span>{getTypeIcon(item.type)}</span>
                    <span className="text-gray-900">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowShareModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmShare}
                disabled={selectedCount === 0}
                className="flex-1 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm & Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
