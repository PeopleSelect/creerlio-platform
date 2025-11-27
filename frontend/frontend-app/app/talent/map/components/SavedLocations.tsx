'use client';

import React, { useState, useEffect } from 'react';
import { Star, MapPin, Edit2, Trash2, Plus, Home, Briefcase, Heart } from 'lucide-react';

interface SavedLocation {
  id: string;
  userId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  locationType: 'home' | 'work' | 'favorite' | 'custom';
  notes?: string;
  isFavorite: boolean;
  createdAt: string;
}

interface SavedLocationsProps {
  userId: string;
  onLocationSelect?: (location: SavedLocation) => void;
  apiBaseUrl: string;
}

export default function SavedLocations({ userId, onLocationSelect, apiBaseUrl }: SavedLocationsProps) {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: 0,
    longitude: 0,
    locationType: 'custom' as SavedLocation['locationType'],
    notes: '',
  });

  useEffect(() => {
    loadLocations();
  }, [userId]);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/api/saved-locations/user/${userId}`);
      if (!response.ok) throw new Error('Failed to load saved locations');
      const data = await response.json();
      setLocations(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const locationData = {
        ...formData,
        userId,
        isFavorite: false,
      };

      if (editingId) {
        // Update existing
        const response = await fetch(`${apiBaseUrl}/api/saved-locations/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...locationData, id: editingId }),
        });
        if (!response.ok) throw new Error('Failed to update location');
      } else {
        // Create new
        const response = await fetch(`${apiBaseUrl}/api/saved-locations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(locationData),
        });
        if (!response.ok) throw new Error('Failed to save location');
      }

      await loadLocations();
      resetForm();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this location?')) return;
    
    try {
      const response = await fetch(`${apiBaseUrl}/api/saved-locations/${userId}/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete location');
      await loadLocations();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleFavorite = async (location: SavedLocation) => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/saved-locations/${userId}/${location.id}/toggle-favorite`,
        { method: 'POST' }
      );
      if (!response.ok) throw new Error('Failed to toggle favorite');
      await loadLocations();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (location: SavedLocation) => {
    setFormData({
      name: location.name,
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
      locationType: location.locationType,
      notes: location.notes || '',
    });
    setEditingId(location.id);
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      latitude: 0,
      longitude: 0,
      locationType: 'custom',
      notes: '',
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const getLocationIcon = (type: SavedLocation['locationType']) => {
    switch (type) {
      case 'home': return <Home className="w-4 h-4" />;
      case 'work': return <Briefcase className="w-4 h-4" />;
      case 'favorite': return <Heart className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Saved Locations</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
        >
          <Plus className="w-4 h-4" />
          Add Location
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {showAddForm && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-3">
          <h4 className="font-medium">{editingId ? 'Edit Location' : 'Add New Location'}</h4>
          
          <input
            type="text"
            placeholder="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />

          <input
            type="text"
            placeholder="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              step="0.000001"
              placeholder="Latitude"
              value={formData.latitude}
              onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
            <input
              type="number"
              step="0.000001"
              placeholder="Longitude"
              value={formData.longitude}
              onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <select
            value={formData.locationType}
            onChange={(e) => setFormData({ ...formData, locationType: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="home">Home</option>
            <option value="work">Work</option>
            <option value="favorite">Favorite</option>
            <option value="custom">Custom</option>
          </select>

          <textarea
            placeholder="Notes (optional)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            rows={2}
          />

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              {editingId ? 'Update' : 'Save'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {locations.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No saved locations yet.</p>
            <p className="text-sm">Click "Add Location" to save your first location.</p>
          </div>
        ) : (
          locations.map((location) => (
            <div
              key={location.id}
              className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onLocationSelect?.(location)}
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-3 flex-1">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {getLocationIcon(location.locationType)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{location.name}</h4>
                      {location.isFavorite && (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{location.address}</p>
                    {location.notes && (
                      <p className="text-xs text-gray-500 mt-1">{location.notes}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(location);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        location.isFavorite
                          ? 'text-yellow-500 fill-yellow-500'
                          : 'text-gray-400'
                      }`}
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(location);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(location.id);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
