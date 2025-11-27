'use client';

import React, { useState } from 'react';
import { Car, Bus, Bike, Clock, DollarSign, Leaf, TrendingUp, Calendar } from 'lucide-react';

interface CommuteCost {
  transportMode: string;
  distance: number;
  timePerTrip: number;
  dailyTime: number;
  weeklyTime: number;
  monthlyTime: number;
  yearlyTime: number;
  dailyCost: number;
  weeklyCost: number;
  monthlyCost: number;
  yearlyCost: number;
  dailyCO2: number;
  weeklyCO2: number;
  monthlyCO2: number;
  yearlyCO2: number;
}

interface CommuteCostCalculatorProps {
  fromLatitude: number;
  fromLongitude: number;
  toLatitude: number;
  toLongitude: number;
  apiBaseUrl: string;
}

const TRANSPORT_MODES = [
  { value: 'driving', label: 'Driving', icon: Car, color: 'blue' },
  { value: 'public_transport', label: 'Public Transport', icon: Bus, color: 'green' },
  { value: 'cycling', label: 'Cycling', icon: Bike, color: 'orange' },
];

const TIME_PERIODS = [
  { value: 'daily', label: 'Daily', multiplier: 1 },
  { value: 'weekly', label: 'Weekly', multiplier: 5 },
  { value: 'monthly', label: 'Monthly', multiplier: 22 },
  { value: 'yearly', label: 'Yearly', multiplier: 260 },
];

export default function CommuteCostCalculator({
  fromLatitude,
  fromLongitude,
  toLatitude,
  toLongitude,
  apiBaseUrl,
}: CommuteCostCalculatorProps) {
  const [selectedMode, setSelectedMode] = useState('driving');
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [result, setResult] = useState<CommuteCost | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewPeriod, setViewPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');

  const calculateCosts = async (mode: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${apiBaseUrl}/api/map/commute-costs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromLatitude,
          fromLongitude,
          toLatitude,
          toLongitude,
          transportMode: mode,
          daysPerWeek,
        }),
      });

      if (!response.ok) throw new Error('Failed to calculate commute costs');

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (mode: string) => {
    setSelectedMode(mode);
    calculateCosts(mode);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getPeriodData = () => {
    if (!result) return { time: 0, cost: 0, co2: 0 };
    
    return {
      time: result[`${viewPeriod}Time` as keyof CommuteCost] as number,
      cost: result[`${viewPeriod}Cost` as keyof CommuteCost] as number,
      co2: result[`${viewPeriod}CO2` as keyof CommuteCost] as number,
    };
  };

  const getModeIcon = (mode: string) => {
    const transportMode = TRANSPORT_MODES.find(m => m.value === mode);
    const Icon = transportMode?.icon || Car;
    return <Icon className="w-5 h-5" />;
  };

  const data = getPeriodData();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-3">Commute Cost Calculator</h3>
        
        {/* Transport Mode Selection */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {TRANSPORT_MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.value}
                onClick={() => handleModeChange(mode.value)}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                  selectedMode === mode.value
                    ? 'bg-amber-50 border-amber-600 text-amber-900'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-sm font-medium">{mode.label}</span>
              </button>
            );
          })}
        </div>

        {/* Days Per Week */}
        <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
          <label className="text-sm font-medium text-gray-700">Days per week:</label>
          <input
            type="number"
            min="1"
            max="7"
            value={daysPerWeek}
            onChange={(e) => setDaysPerWeek(parseInt(e.target.value))}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
          />
          <button
            onClick={() => calculateCosts(selectedMode)}
            className="ml-auto px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
          >
            Recalculate
          </button>
        </div>

        {/* View Period Tabs */}
        <div className="flex gap-2 mb-4">
          {TIME_PERIODS.map((period) => (
            <button
              key={period.value}
              onClick={() => setViewPeriod(period.value as any)}
              className={`flex-1 px-3 py-2 text-sm rounded-lg transition-all ${
                viewPeriod === period.value
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
        </div>
      ) : result ? (
        <div className="space-y-4">
          {/* Summary Card */}
          <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              {getModeIcon(result.transportMode)}
              <h4 className="font-semibold text-amber-900">
                {TRANSPORT_MODES.find(m => m.value === result.transportMode)?.label} Commute
              </h4>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-amber-700 mb-1">Distance</div>
                <div className="text-2xl font-bold text-amber-900">{result.distance.toFixed(1)} km</div>
              </div>
              <div>
                <div className="text-sm text-amber-700 mb-1">One Way</div>
                <div className="text-2xl font-bold text-amber-900">{formatTime(result.timePerTrip)}</div>
              </div>
              <div>
                <div className="text-sm text-amber-700 mb-1">Round Trip</div>
                <div className="text-2xl font-bold text-amber-900">{formatTime(result.dailyTime)}</div>
              </div>
            </div>
          </div>

          {/* Financial Costs */}
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold">Financial Cost ({viewPeriod})</h4>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-gray-700">Cost</span>
                <span className="text-2xl font-bold text-green-600">{formatCurrency(data.cost)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-600">Daily</div>
                  <div className="font-semibold">{formatCurrency(result.dailyCost)}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-600">Weekly</div>
                  <div className="font-semibold">{formatCurrency(result.weeklyCost)}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-600">Monthly</div>
                  <div className="font-semibold">{formatCurrency(result.monthlyCost)}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-600">Yearly</div>
                  <div className="font-semibold">{formatCurrency(result.yearlyCost)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Time Investment */}
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold">Time Investment ({viewPeriod})</h4>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-gray-700">Total Time</span>
                <span className="text-2xl font-bold text-blue-600">{formatTime(data.time)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-600">Daily</div>
                  <div className="font-semibold">{formatTime(result.dailyTime)}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-600">Weekly</div>
                  <div className="font-semibold">{formatTime(result.weeklyTime)}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-600">Monthly</div>
                  <div className="font-semibold">{formatTime(result.monthlyTime)}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-600">Yearly</div>
                  <div className="font-semibold">{formatTime(result.yearlyTime)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Environmental Impact */}
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Leaf className="w-5 h-5 text-emerald-600" />
              <h4 className="font-semibold">Environmental Impact ({viewPeriod})</h4>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-gray-700">CO₂ Emissions</span>
                <span className="text-2xl font-bold text-emerald-600">{data.co2.toFixed(1)} kg</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-600">Daily</div>
                  <div className="font-semibold">{result.dailyCO2.toFixed(2)} kg</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-600">Weekly</div>
                  <div className="font-semibold">{result.weeklyCO2.toFixed(2)} kg</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-600">Monthly</div>
                  <div className="font-semibold">{result.monthlyCO2.toFixed(2)} kg</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-600">Yearly</div>
                  <div className="font-semibold">{result.yearlyCO2.toFixed(2)} kg</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center p-8 text-gray-500">
          <Calculator className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>Select a transport mode to calculate commute costs</p>
        </div>
      )}
    </div>
  );
}
