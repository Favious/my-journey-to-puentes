'use client';

import { useState } from 'react';
import axios from 'axios';

interface City {
  name: string;
  lat: number;
  lng: number;
  country: string;
}

interface HomeCitySelectorProps {
  value: {
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  onChange: (city: { city: string; country: string; latitude: number; longitude: number }) => void;
  className?: string;
}

export default function HomeCitySelector({ value, onChange, className = "" }: HomeCitySelectorProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const searchCity = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      // Using OpenStreetMap Nominatim API (free, no API key required)
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`
      );

      if (response.data.length > 0) {
        const result = response.data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        const cityData = {
          city: result.display_name.split(',')[0], // First part is usually the city name
          country: result.address?.country || 'Unknown',
          latitude: lat,
          longitude: lng
        };
        
        onChange(cityData);
        setQuery('');
      } else {
        setError('City not found. Try a different search term.');
      }
    } catch (err) {
      setError('Error searching for city. Please try again.');
      console.error('Geocoding error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchCity();
    }
  };

  const handleRemoveCity = () => {
    onChange({
      city: '',
      country: '',
      latitude: 0,
      longitude: 0
    });
    setQuery('');
    setError('');
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {value.city ? (
        // Show selected city with delete button
        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-300 rounded-md">
          <span className="text-gray-800">
            {value.city}, {value.country} ({value.latitude.toFixed(4)}, {value.longitude.toFixed(4)})
          </span>
          <button
            type="button"
            onClick={handleRemoveCity}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            title="Remove city"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        // Show search input
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter city name (e.g., Tokyo, London, Paris)..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={searchCity}
              disabled={isLoading || !query.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? '...' : 'Search'}
            </button>
          </div>
          {error && (
            <p className="text-gray-600 text-sm">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
