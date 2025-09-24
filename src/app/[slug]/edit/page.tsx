'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { JourneyData, JourneyDataInput, Milestone } from '../../../types/firestore';
import ImageUploader from '../../../components/ImageUploader';
import MilestoneImageUploader from '../../../components/MilestoneImageUploader';
import LoadingSpinner from '../../../components/LoadingSpinner';
import HomeCitySearch from '../../../components/HomeCitySearch';
import HomeCitySelector from '../../../components/HomeCitySelector';
import ProfilePictureUploader from '../../../components/ProfilePictureUploader';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useBridgeModel, BridgeModelProvider } from '../../../components/BridgeModelLoader';

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

const THEME_OPTIONS = [
  { value: 'international-orange', label: 'International Orange (OG)', color: '#c0362c' },
  { value: 'gold', label: 'Actual Gold lol', color: '#FFD700' },
  { value: 'white', label: 'Boring White', color: '#ffffff' },
  { value: 'antigravity-orange', label: 'Antigravity Orange', color: '#f25a26' },
  { value: 'random', label: 'Vibecode Random Color', color: '#ff6b6b' }
];

// Bridge preview component using the actual bridge model
function BridgePreview({ color }: { color: string }) {
  const { bridgeModel, isLoading } = useBridgeModel();
  
  // Don't render anything if the model isn't loaded yet
  if (isLoading || !bridgeModel) {
    return (
      <group>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2, 0.1, 0.5]} />
          <meshStandardMaterial color="#666666" />
        </mesh>
      </group>
    );
  }

  // Create a colored version of the bridge model (same logic as BridgePath)
  const coloredBridgeModel = useMemo(() => {
    const clonedModel = bridgeModel.clone();
    clonedModel.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh && child.material) {
        // Check if this is the gold theme for special metallic treatment
        const isGold = color === '#FFD700';
        const isAntigravityOrange = color === '#f25a26';
        
        // Create a new material with the specified color
        const newMaterial = new THREE.MeshStandardMaterial({
          color: color,
          metalness: isGold ? 0.9 : (isAntigravityOrange ? 0.0 : ((child.material as THREE.MeshStandardMaterial).metalness || 0.1)),
          roughness: isGold ? 0.1 : (isAntigravityOrange ? 1.0 : ((child.material as THREE.MeshStandardMaterial).roughness || 0.3)),
        });
        child.material = newMaterial;
        
        // Enable shadow casting and receiving
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clonedModel;
  }, [bridgeModel, color]);

  return (
    <group>
      <primitive
        object={coloredBridgeModel}
        position={[0, -0.2, 0]}
        rotation={[0, Math.PI/30, 0]} // 90 degrees on X-axis and Y-axis
        scale={[0.5, 0.5, 0.5]} // Scale down for preview
        castShadow
        receiveShadow
      />
    </group>
  );
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
  const [isGeneratingColor, setIsGeneratingColor] = useState(false);
  const [colorGenerationStep, setColorGenerationStep] = useState(0);

  // Form state
  const [formData, setFormData] = useState<JourneyDataInput>({
    fullName: '',
    company: '',
    theme: 'international-orange', // Default to first theme option
    coverImageUrl: '',
    home: {
      city: '',
      country: '',
      latitude: 0,
      longitude: 0
    },
    slug: '',
    milestones: [
      { description: '', imageUrl: '' },
      { description: '', imageUrl: '' },
      { description: '', imageUrl: '' },
      { description: '', imageUrl: '' },
      { description: '', imageUrl: '' },
      { description: '', imageUrl: '' }
    ]
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
        const existingMilestones = engineerData.milestones || [];
        // Ensure exactly 6 milestones
        const milestones = Array.from({ length: 6 }, (_, index) => 
          existingMilestones[index] || { description: '', imageUrl: '' }
        );
        
        setFormData({
          fullName: engineerData.fullName || '',
          company: engineerData.company || '',
          theme: engineerData.theme || '',
          coverImageUrl: engineerData.coverImageUrl || '',
          home: {
            city: engineerData.home?.city || '',
            country: engineerData.home?.country || '',
            latitude: engineerData.home?.latitude || 0,
            longitude: engineerData.home?.longitude || 0
          },
          slug: engineerData.slug || '',
          milestones: milestones
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
    if (field === 'theme' && value === 'random') {
      // Start the silly loading sequence
      setIsGeneratingColor(true);
      setColorGenerationStep(0);
      
      // Step 1: "Asking ChatGPT to generate random color..."
      setTimeout(() => {
        setColorGenerationStep(1);
        
        // Step 2: "Thinking..."
        setTimeout(() => {
          setColorGenerationStep(2);
          
          // Step 3: Generate and apply the color
          setTimeout(() => {
            const randomColor = generateRandomColor();
            setFormData(prev => ({
              ...prev,
              [field]: randomColor
            }));
            setIsGeneratingColor(false);
            setColorGenerationStep(0);
          }, 1000);
        }, 1500);
      }, 1000);
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const generateRandomColor = () => {
    const colors = [
      '#4ecdc4', // Teal
      '#45b7d1', // Sky blue
      '#96ceb4', // Mint green
      '#ff9ff3', // Pink
      '#54a0ff', // Blue
      '#5f27cd', // Purple
      '#00d2d3', // Cyan
      '#ff6348', // Coral
      '#2ed573', // Green
      '#ffa502', // Orange
      '#a55eea', // Lavender
      '#26de81', // Emerald
      '#fd79a8', // Rose
      '#6c5ce7', // Violet
      '#00b894', // Turquoise
      '#e17055', // Peach
      '#74b9ff', // Light blue
      '#fdcb6e', // Amber
      '#e84393', // Magenta
      '#00cec9'  // Aqua
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const getCurrentThemeColor = () => {
    // If theme is a hex color (starts with #), use it directly
    if (formData.theme.startsWith('#')) {
      return formData.theme;
    }
    
    // If theme is 'random', generate a new random color
    if (formData.theme === 'random') {
      return generateRandomColor();
    }
    
    // Otherwise, find the theme option and return its color
    const theme = THEME_OPTIONS.find(option => option.value === formData.theme);
    return theme?.color || '#c0362c';
  };

  const handleMilestoneChange = (index: number, field: keyof Milestone, value: string) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map((milestone, i) => 
        i === index ? { ...milestone, [field]: value } : milestone
      )
    }));
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!engineer) return;

    try {
      setSaving(true);
      setError(null);

      // Convert form data to the format expected by Firestore
      // Don't include createdAt when updating - Firebase handles this automatically
      const engineerData = {
        fullName: formData.fullName,
        company: formData.company,
        theme: formData.theme,
        coverImageUrl: formData.coverImageUrl,
        home: {
          city: formData.home.city,
          country: formData.home.country,
          latitude: formData.home.latitude,
          longitude: formData.home.longitude
        },
        slug: formData.slug,
        milestones: formData.milestones
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
          <div className="flex items-start justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Edit Journey Data
            </h1>
            
            {/* Profile Picture - Top Right */}
            <div className="flex flex-col items-end space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Photo 
              </label>
              <ProfilePictureUploader
                value={formData.coverImageUrl}
                onChange={(url) => handleInputChange('coverImageUrl', url)}
              />
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
              
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
                
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Home City *
                </label>
                <HomeCitySelector
                  value={formData.home}
                  onChange={(cityData) => handleInputChange('home', cityData)}
                />
              </div>

              {/* Theme */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme *
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={formData.theme.startsWith('#') ? 'random' : (formData.theme || 'international-orange')}
                      onChange={(e) => handleInputChange('theme', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                      required
                    >
                      {THEME_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div 
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: getCurrentThemeColor() }}
                    ></div>
                  </div>
                  {isGeneratingColor && (
                    <div className="mt-2 text-center">
                      <div className="text-sm text-gray-600 animate-pulse">
                        {colorGenerationStep === 0 && "✨ Asking ChatGPT to generate random color..."}
                        {colorGenerationStep === 1 && "Thinking..."}
                        {colorGenerationStep === 2 && "Retrieving color from ChatGPT..."}
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bridge Preview
                  </label>
                  <div className="w-full h-32 bg-gray-600 rounded-md border border-gray-300">
                    <Canvas camera={{ position: [0, 0, 0.75] }}>
                      <BridgeModelProvider>
                        <ambientLight intensity={0.4} />
                        <directionalLight position={[2, 2, 2]} intensity={1.5} castShadow />
                        <directionalLight position={[-2, 1, 1]} intensity={0.8} />
                        <pointLight position={[0, 1, 0]} intensity={1.2} color="#ffffff" />
                        <pointLight position={[1, 0.5, 1]} intensity={0.6} color="#FFD700" />
                        <BridgePreview color={getCurrentThemeColor()} />
                        <OrbitControls enableZoom={false} enablePan={false} />
                      </BridgeModelProvider>
                    </Canvas>
                  </div>
                </div>
              </div>

            </div>

            {/* Milestones */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Career Milestones</h2>
                <span className="text-sm text-gray-500">6 milestones required</span>
              </div>

              {formData.milestones.map((milestone, index) => (
                <div key={index} className="flex gap-6 items-start">
                  {/* Square Photo */}
                  <div className="flex-shrink-0">
                    <MilestoneImageUploader
                      value={milestone.imageUrl}
                      onChange={(url) => handleMilestoneChange(index, 'imageUrl', url)}
                    />
                  </div>

                  {/* Text Input */}
                  <div className="flex-1">
                    <div className="mb-2">
                      <h3 className="text-lg font-medium text-gray-900">Milestone {index + 1}</h3>
                    </div>
                    <textarea
                      value={milestone.description}
                      onChange={(e) => handleMilestoneChange(index, 'description', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black resize-none"
                      rows={4}
                      placeholder={`Describe milestone ${index + 1}...`}
                    />
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
