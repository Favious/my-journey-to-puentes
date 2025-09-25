'use client';

import { useState, useEffect, useCallback } from 'react';

interface AssetPreloaderProps {
  onComplete: () => void;
  onProgress: (progress: number, currentAsset: string) => void;
}

interface AssetItem {
  url: string;
  type: 'image' | 'audio' | 'model' | 'font';
  priority: 'high' | 'medium' | 'low';
  name: string;
}

export default function AssetPreloader({ onComplete, onProgress }: AssetPreloaderProps) {
  const [loadedAssets, setLoadedAssets] = useState<Set<string>>(new Set());
  const [failedAssets, setFailedAssets] = useState<Set<string>>(new Set());
  const [currentAsset, setCurrentAsset] = useState<string>('');

  // Define all critical assets that need to be preloaded
  const assets: AssetItem[] = [
    // High priority - essential for initial render
    { url: '/earthMap.jpeg', type: 'image', priority: 'high', name: 'Earth textures' },
    { url: '/fonts/ss-bridge.regular.ttf', type: 'font', priority: 'high', name: 'Custom fonts' },
    { url: '/golden_gate_bridge/scene.gltf', type: 'model', priority: 'high', name: '3D bridge model' },
    { url: '/golden_gate_bridge/scene.bin', type: 'model', priority: 'high', name: 'Bridge geometry' },
    
    // Medium priority - important for user experience
    { url: '/clickSound.mp3', type: 'audio', priority: 'medium', name: 'Sound effects' },
    { url: '/deleteKeySound.mp3', type: 'audio', priority: 'medium', name: 'Audio feedback' },
    { url: '/goldenGateWatermark.png', type: 'image', priority: 'medium', name: 'Watermark graphics' },
    { url: '/goldenGateWatermarkOG.png', type: 'image', priority: 'medium', name: 'Brand assets' },
    { url: '/antigravityLogo.avif', type: 'image', priority: 'medium', name: 'Logo graphics' },
    
    // Low priority - nice to have
    { url: '/globe.svg', type: 'image', priority: 'low', name: 'UI icons' },
    { url: '/file.svg', type: 'image', priority: 'low', name: 'Interface elements' },
    { url: '/window.svg', type: 'image', priority: 'low', name: 'Visual components' },
  ];

  const loadAsset = useCallback(async (asset: AssetItem): Promise<boolean> => {
    return new Promise((resolve) => {
      setCurrentAsset(asset.name);
      
      // Add timeout for asset loading to prevent hanging
      const timeout = setTimeout(() => {
        console.warn(`Timeout loading asset: ${asset.url}`);
        setFailedAssets(prev => new Set([...prev, asset.url]));
        resolve(false);
      }, 10000); // 10 second timeout
      
      const cleanup = () => {
        clearTimeout(timeout);
      };
      
      if (asset.type === 'image') {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Enable CORS for better caching
        img.onload = () => {
          cleanup();
          setLoadedAssets(prev => new Set([...prev, asset.url]));
          resolve(true);
        };
        img.onerror = () => {
          cleanup();
          console.warn(`Failed to load image: ${asset.url}`);
          setFailedAssets(prev => new Set([...prev, asset.url]));
          resolve(false);
        };
        img.src = asset.url;
      } else if (asset.type === 'audio') {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.crossOrigin = 'anonymous';
        audio.oncanplaythrough = () => {
          cleanup();
          setLoadedAssets(prev => new Set([...prev, asset.url]));
          resolve(true);
        };
        audio.onerror = () => {
          cleanup();
          console.warn(`Failed to load audio: ${asset.url}`);
          setFailedAssets(prev => new Set([...prev, asset.url]));
          resolve(false);
        };
        audio.src = asset.url;
        audio.load();
      } else if (asset.type === 'font') {
        // For fonts, we'll use the FontFace API if available, otherwise assume loaded
        if ('fonts' in document) {
          const font = new FontFace('Bridge Font', `url(${asset.url})`);
          font.load().then(() => {
            cleanup();
            document.fonts.add(font);
            setLoadedAssets(prev => new Set([...prev, asset.url]));
            resolve(true);
          }).catch(() => {
            cleanup();
            console.warn(`Failed to load font: ${asset.url}`);
            setFailedAssets(prev => new Set([...prev, asset.url]));
            resolve(false);
          });
        } else {
          // Fallback for browsers without FontFace API
          cleanup();
          setLoadedAssets(prev => new Set([...prev, asset.url]));
          resolve(true);
        }
      } else if (asset.type === 'model') {
        // For 3D models, we'll preload them using fetch with proper headers
        fetch(asset.url, { 
          method: 'HEAD',
          cache: 'force-cache' // Use cached version if available
        })
          .then((response) => {
            cleanup();
            if (response.ok) {
              setLoadedAssets(prev => new Set([...prev, asset.url]));
              resolve(true);
            } else {
              throw new Error(`HTTP ${response.status}`);
            }
          })
          .catch(() => {
            cleanup();
            console.warn(`Failed to preload model: ${asset.url}`);
            setFailedAssets(prev => new Set([...prev, asset.url]));
            resolve(false);
          });
      } else {
        cleanup();
        resolve(false);
      }
    });
  }, []);

  useEffect(() => {
    const loadAssets = async () => {
      // Sort assets by priority
      const sortedAssets = [...assets].sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      // Group assets by priority for parallel loading
      const highPriorityAssets = sortedAssets.filter(a => a.priority === 'high');
      const mediumPriorityAssets = sortedAssets.filter(a => a.priority === 'medium');
      const lowPriorityAssets = sortedAssets.filter(a => a.priority === 'low');

      let loadedCount = 0;
      const totalAssets = sortedAssets.length;

      // Load high priority assets first (sequential for critical resources)
      for (const asset of highPriorityAssets) {
        const success = await loadAsset(asset);
        loadedCount++;
        const progress = (loadedCount / totalAssets) * 50; // High priority gets 0-50%
        onProgress(progress, asset.name);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Load medium priority assets in parallel batches
      const mediumBatchSize = 3;
      for (let i = 0; i < mediumPriorityAssets.length; i += mediumBatchSize) {
        const batch = mediumPriorityAssets.slice(i, i + mediumBatchSize);
        const promises = batch.map(asset => loadAsset(asset));
        
        await Promise.allSettled(promises);
        loadedCount += batch.length;
        const progress = 50 + ((loadedCount - highPriorityAssets.length) / mediumPriorityAssets.length) * 30; // Medium gets 50-80%
        onProgress(progress, batch[batch.length - 1]?.name || 'Loading...');
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Load low priority assets in parallel
      const lowPromises = lowPriorityAssets.map(asset => loadAsset(asset));
      await Promise.allSettled(lowPromises);
      loadedCount += lowPriorityAssets.length;
      
      // Ensure we reach 100% even if some assets failed
      onProgress(100, 'Complete');
      
      // Wait a bit before calling onComplete to show the final state
      setTimeout(() => {
        onComplete();
      }, 300);
    };

    loadAssets();
  }, [loadAsset, onComplete, onProgress]);

  return null; // This component doesn't render anything
}

export { AssetPreloader };
