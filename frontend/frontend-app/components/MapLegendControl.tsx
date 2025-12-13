'use client';

import { useState } from 'react';
import { 
  Building2, 
  GraduationCap, 
  Home, 
  Bus, 
  MapPin, 
  Store,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff
} from 'lucide-react';

export interface MapLayer {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  visible: boolean;
  count?: number;
}

interface MapLegendControlProps {
  onLayerToggle: (layerId: string, visible: boolean) => void;
  layers: MapLayer[];
}

export default function MapLegendControl({ onLayerToggle, layers }: MapLegendControlProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleToggle = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      onLayerToggle(layerId, !layer.visible);
    }
  };

  const toggleAll = (visible: boolean) => {
    layers.forEach(layer => {
      if (layer.visible !== visible) {
        onLayerToggle(layer.id, visible);
      }
    });
  };

  return (
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg overflow-hidden z-10 max-w-xs">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5" />
          <h3 className="font-semibold">Map Layers</h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-white hover:bg-white/20 rounded p-1 transition-colors"
          aria-label={isExpanded ? "Collapse legend" : "Expand legend"}
        >
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-3">
          {/* Quick Actions */}
          <div className="flex space-x-2 mb-3 pb-3 border-b border-gray-200">
            <button
              onClick={() => toggleAll(true)}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors flex items-center justify-center space-x-1"
            >
              <Eye className="w-3 h-3" />
              <span>Show All</span>
            </button>
            <button
              onClick={() => toggleAll(false)}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded transition-colors flex items-center justify-center space-x-1"
            >
              <EyeOff className="w-3 h-3" />
              <span>Hide All</span>
            </button>
          </div>

          {/* Layer List */}
          <div className="space-y-2">
            {layers.map((layer) => (
              <button
                key={layer.id}
                onClick={() => handleToggle(layer.id)}
                className={`w-full flex items-center justify-between p-2 rounded-lg transition-all ${
                  layer.visible 
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'bg-gray-50 border border-gray-200 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {/* Color indicator */}
                  <div 
                    className="w-3 h-3 rounded-full shadow-sm"
                    style={{ backgroundColor: layer.color }}
                  />
                  
                  {/* Icon */}
                  <div style={{ color: layer.color }}>
                    {layer.icon}
                  </div>
                  
                  {/* Label */}
                  <span className={`text-sm font-medium ${layer.visible ? 'text-gray-900' : 'text-gray-600'}`}>
                    {layer.label}
                  </span>
                </div>

                {/* Count badge */}
                <div className="flex items-center space-x-2">
                  {layer.count !== undefined && layer.count > 0 && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                      {layer.count}
                    </span>
                  )}
                  
                  {/* Visibility toggle */}
                  <div className={`w-10 h-5 rounded-full transition-colors ${
                    layer.visible ? 'bg-blue-600' : 'bg-gray-300'
                  }`}>
                    <div className={`w-4 h-4 mt-0.5 rounded-full bg-white shadow-sm transition-transform ${
                      layer.visible ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Info Footer */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Toggle layers to customize your map view
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
