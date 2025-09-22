'use client';

import { useState } from 'react';
import axios from 'axios';

interface City {
  name: string;
  lat: number;
  lng: number;
  country: string;
}

interface HomeCitySearchProps {
  value: {
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  onChange: (city: { city: string; country: string; latitude: number; longitude: number }) => void;
}

export default function HomeCitySearch({ value, onChange }: HomeCitySearchProps) {
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

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Home City *
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter your home city (e.g., Tokyo, London, Paris)..."
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
          <p className="text-red-600 text-sm mt-2">{error}</p>
        )}
      </div>
      
      {value.city && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800 text-sm">
            <strong>Selected:</strong> {value.city}, {value.country} ({value.latitude.toFixed(4)}, {value.longitude.toFixed(4)})
          </p>
        </div>
      )}
    </div>
  );
}
