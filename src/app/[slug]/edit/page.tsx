'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { JourneyData, JourneyDataInput, Milestone } from '../../../types/firestore';
import ImageUploader from '../../../components/ImageUploader';
import LoadingSpinner from '../../../components/LoadingSpinner';

interface Engineer {
  id: string;
  cityOfBirth: string;
  company: string;
  coverImageUrl: string;
  fullName: string;
  home: {
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

export default function EditEngineerPage() {
  const params = useParams();
  const router = useRouter();
  const [engineer, setEngineer] = useState<Engineer | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeVerified, setCodeVerified] = useState(false);
  const [isEditing, setIsEditing] = useState(true);

  console.log('EditEngineerPage render - codeVerified:', codeVerified, 'loading:', loading, 'EDIT_CODE:', process.env.NEXT_PUBLIC_EDIT_CODE);
  console.log('Render conditions - loading:', loading, '!codeVerified:', !codeVerified);
  
  // Form state
  const [formData, setFormData] = useState<JourneyDataInput>({
    fullName: '',
    company: '',
    cityOfBirth: '',
    theme: '',
    coverImageUrl: '',
    home: [0, 0],
    slug: '',
    milestones: []
  });

  useEffect(() => {
    const fetchEngineer = async () => {
      if (!params.slug) return;

      const slug = params.slug as string;

      try {
        setLoading(true);
        setError(null);
        setCodeVerified(false); // Reset code verification when slug changes

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

        setEngineer(engineerData);
        
        // Populate form with existing data
        setFormData({
          fullName: engineerData.fullName || '',
          company: engineerData.company || '',
          cityOfBirth: engineerData.cityOfBirth || '',
          theme: engineerData.theme || '',
          coverImageUrl: engineerData.coverImageUrl || '',
          home: [engineerData.home?.latitude || 0, engineerData.home?.longitude || 0],
          slug: engineerData.slug || '',
          milestones: engineerData.milestones || []
        });
      } catch (err) {
        console.error('Error fetching engineer:', err);
        setError('Failed to load engineer data');
      } finally {
        setLoading(false);
      }
    };

    fetchEngineer();
  }, [params.slug, router]);

  const handleCodeVerified = () => {
    setCodeVerified(true);
    setIsEditing(true);
  };

  const handleInputChange = (field: keyof JourneyDataInput, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMilestoneChange = (index: number, field: keyof Milestone, value: string) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map((milestone, i) => 
        i === index ? { ...milestone, [field]: value } : milestone
      )
    }));
  };

  const addMilestone = () => {
    setFormData(prev => ({
      ...prev,
      milestones: [...prev.milestones, { description: '', imageUrl: '' }]
    }));
  };

  const removeMilestone = (index: number) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index)
    }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!engineer) return;

    try {
      setSaving(true);
      setError(null);

      // Convert form data to the format expected by Firestore
      const engineerData: JourneyData = {
        fullName: formData.fullName,
        company: formData.company,
        cityOfBirth: formData.cityOfBirth,
        theme: formData.theme,
        coverImageUrl: formData.coverImageUrl,
        home: {
          latitude: formData.home[0],
          longitude: formData.home[1]
        },
        slug: formData.slug,
        milestones: formData.milestones,
        createdAt: engineer.createdAt
      };

      // Update the document in Firestore
      const engineerRef = doc(db, 'engineers', engineer.id);
      await updateDoc(engineerRef, engineerData as any);

      // Redirect to the view page
      router.push(`/${formData.slug}`);
    } catch (err) {
      console.error('Error saving engineer:', err);
      setError('Failed to save engineer data');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !engineer) {
    return <LoadingSpinner message="Loading journey..." />;
  }

  // Show code verification screen if not verified
  if (!codeVerified) {
    return (
      <div className="min-h-screen bg-black bg-opacity-90 flex items-center justify-center">
        <div className="rounded-lg shadow-2xl p-8 w-full max-w-md mx-4">
          <div className="">
            <h2 className="text-2xl font-bold text-white mb-2">
              Enter Edit Code
            </h2>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const code = formData.get('code') as string;
              const EDIT_CODE = process.env.NEXT_PUBLIC_EDIT_CODE || '282828';
              
              if (code === EDIT_CODE) {
                handleCodeVerified();
              } else {
                alert('Invalid code. Please try again.');
              }
            }} className="space-y-4">
              <div>
                <input
                  type="text"
                  name="code"
                  placeholder="¯\_(ツ)_/¯"
                  className="w-full px-4 py-3 border border-gray-300 text-lg font-mono focus:outline-none focus:ring-2 focus:border-transparent"
                  autoComplete="off"
                  autoFocus
                />
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="flex-1 px-3 py-2 text-sm border rounded-lg border-gray-300 text-whiterounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 py-2 text-sm bg-white text-black rounded-lg transition-colors"
                >
                  Enter
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Edit Engineer Profile
            </h1>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company *
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City of Birth *
                  </label>
                  <input
                    type="text"
                    value={formData.cityOfBirth}
                    onChange={(e) => handleInputChange('cityOfBirth', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme *
                  </label>
                  <input
                    type="text"
                    value={formData.theme}
                    onChange={(e) => handleInputChange('theme', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required
                  />
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Home Latitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.home[0]}
                    onChange={(e) => handleInputChange('home', [parseFloat(e.target.value) || 0, formData.home[1]])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Home Longitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.home[1]}
                    onChange={(e) => handleInputChange('home', [formData.home[0], parseFloat(e.target.value) || 0])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required
                  />
                </div>
              </div>

              {/* Cover Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Image
                </label>
                <ImageUploader
                  value={formData.coverImageUrl}
                  onChange={(url) => handleInputChange('coverImageUrl', url)}
                  placeholder="Upload cover image"
                  className="w-full h-48"
                />
              </div>
            </div>

            {/* Milestones */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Career Milestones</h2>
                <button
                  type="button"
                  onClick={addMilestone}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Add Milestone
                </button>
              </div>

              {formData.milestones.map((milestone, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Milestone {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeMilestone(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={milestone.description}
                        onChange={(e) => handleMilestoneChange(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Image
                      </label>
                      <ImageUploader
                        value={milestone.imageUrl}
                        onChange={(url) => handleMilestoneChange(index, 'imageUrl', url)}
                        placeholder="Upload milestone image"
                        className="w-full h-32"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push(`/${params.slug}`)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
