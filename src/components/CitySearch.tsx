'use client';

import { useState } from 'react';
import axios from 'axios';
import { calculateDistance, SAN_FRANCISCO_COORDS } from '../utils/distanceCalculation';

interface City {
  name: string;
  lat: number;
  lng: number;
  country: string;
  distance: number; // Distance to San Francisco in kilometers
}

interface CitySearchProps {
  onCityAdd: (city: City) => void;
}

export default function CitySearch({ onCityAdd }: CitySearchProps) {
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
        const distance = calculateDistance(
          lat, 
          lng, 
          SAN_FRANCISCO_COORDS.lat, 
          SAN_FRANCISCO_COORDS.lng
        );
        
        const city: City = {
          name: result.display_name.split(',')[0], // First part is usually the city name
          lat,
          lng,
          country: result.address?.country || 'Unknown',
          distance
        };
        onCityAdd(city);
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
    <div className="bg-black/20 backdrop-blur-sm rounded-xl p-8 shadow-2xl min-w-96 max-w-lg border border-white/20">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2 text-white">Add Your City</h2>
        <p className="text-gray-300">Search for a city to build bridges to San Francisco</p>
        <p className="text-gray-400 text-sm mt-2">Distance will be calculated automatically</p>
      </div>
      <div className="space-y-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter city name (e.g., Tokyo, London, Paris)..."
            className="flex-1 px-4 py-3 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg text-white placeholder-gray-400 bg-black/20 backdrop-blur-sm"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={searchCity}
            disabled={isLoading || !query.trim()}
            className="px-6 py-3 bg-white/90 text-black rounded-lg hover:bg-white disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg transition-colors"
          >
            {isLoading ? '...' : 'Add City'}
          </button>
        </div>
        {error && (
          <p className="text-red-300 text-sm text-center bg-red-500/20 p-2 rounded-lg">{error}</p>
        )}
      </div>
    </div>
  );
}
