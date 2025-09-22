'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import LoadingSpinner from '../../components/LoadingSpinner';


interface Engineer {
  id: string;
  company: string;
  coverImageUrl: string;
  fullName: string;
  home: {
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  slug: string;
  theme: string;
  milestones: {
    description: string;
    imageUrl: string;
  }[];
  createdAt: any;
}

// Simple cache for engineer data
const engineerCache = new Map<string, { data: Engineer; timestamp: number }>();
const CACHE_DURATION = 300000; // 5 minutes

// Check cache
const getCachedEngineer = (slug: string): Engineer | null => {
  const cached = engineerCache.get(slug);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

// Set cache
const setCachedEngineer = (slug: string, engineer: Engineer): void => {
  engineerCache.set(slug, { data: engineer, timestamp: Date.now() });
};

export default function EngineerPage() {
  const params = useParams();
  const router = useRouter();
  const [engineer, setEngineer] = useState<Engineer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const fetchEngineer = async () => {
      if (!params.slug) return;

      const slug = params.slug as string;

      // Check cache first
      const cached = getCachedEngineer(slug);
      if (cached) {
        setEngineer(cached);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Query Firestore for engineer with matching slug
        const engineersRef = collection(db, 'engineers');
        const q = query(engineersRef, where('slug', '==', slug));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          // No engineer found with this slug, redirect to home
          router.push('/');
          return;
        }

        // Get the first (and should be only) matching document
        const doc = querySnapshot.docs[0];
        const engineerData = {
          id: doc.id,
          ...doc.data()
        } as Engineer;

        // Check if engineer has a name, if not redirect to edit page
        if (!engineerData.fullName || engineerData.fullName.trim() === '') {
          console.log('Engineer has no name, redirecting to edit page');
          setRedirecting(true);
          router.push(`/${slug}/edit`);
          return;
        }

        // Cache the result
        setCachedEngineer(slug, engineerData);
        setEngineer(engineerData);
      } catch (err) {
        console.error('Error fetching engineer:', err);
        setError('Failed to load engineer data');
        // On error, also redirect to home
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    fetchEngineer();
  }, [params.slug, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Rate Limit Exceeded</h1>
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (loading || !engineer) {
    return <LoadingSpinner message="Loading journey..." />;
  }

  return (
    <div className="min-h-screen bg-green-50">
      {/* Header with engineer info */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Cover Image */}
            {engineer?.coverImageUrl && (
              <div className="w-full md:w-48 h-48 flex-shrink-0">
                <img
                  src={engineer.coverImageUrl}
                  alt={`${engineer?.fullName} cover`}
                  className="w-full h-full object-cover rounded-lg shadow-md"
                />
              </div>
            )}

            {/* Engineer Details */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {engineer?.fullName}
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-600">
                <div>
                  <span className="font-semibold">Company:</span> {engineer?.company}
                </div>
                <div>
                  <span className="font-semibold">Theme:</span> {engineer?.theme}
                </div>
                <div>
                  <span className="font-semibold">Home:</span> {engineer?.home?.city && engineer?.home?.country 
                    ? `${engineer.home.city}, ${engineer.home.country}` 
                    : `${engineer?.home?.latitude}°N, ${engineer?.home?.longitude}°E`}
                </div>
              </div>
            </div>

            {/* Status Badge and Edit Button */}
            <div className="flex-shrink-0 flex flex-col items-end space-y-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                ✓ Valid Profile
              </span>
              <button
                onClick={() => router.push(`/${params.slug}/edit`)}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Milestones Section */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Career Milestones</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {engineer?.milestones?.map((milestone, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
              {milestone?.imageUrl && (
                <div className="aspect-w-16 aspect-h-9">
                  <img
                    src={milestone.imageUrl}
                    alt={`Milestone ${index + 1}`}
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Milestone {index + 1}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {milestone?.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Back to Home Button */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          ← Back to Home
        </button>
      </div>

    </div>
  );
}
