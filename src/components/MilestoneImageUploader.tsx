'use client';

import { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import LoadingSpinner from './LoadingSpinner';

interface MilestoneImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  className?: string;
}

export default function MilestoneImageUploader({ value, onChange, className = "" }: MilestoneImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event?.target?.files?.[0];
    if (!file) return;

    if (!file?.type?.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    if ((file?.size || 0) > 5 * 1024 * 1024) {
      setUploadError('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file?.name || 'unknown'}`;
      const storageRef = ref(storage, `milestone_images/${fileName}`);

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      onChange(downloadURL);
    } catch (error) {
      setUploadError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    onChange('');
    if (fileInputRef?.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-300 shadow-sm group ${className}`}>
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <LoadingSpinner />
        </div>
      )}

      {value ? (
        // Display uploaded image
        <>
          <img
            src={value}
            alt="Milestone"
            className="w-full h-full object-cover"
          />
          {/* X button overlay */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              type="button"
              onClick={handleRemoveImage}
              className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              title="Remove image"
              disabled={isUploading}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </>
      ) : (
        // Display upload area
        <button
          type="button"
          onClick={() => fileInputRef?.current?.click()}
          disabled={isUploading}
          className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs text-center px-2">Add Image</span>
        </button>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      {/* Error message */}
      {uploadError && (
        <p className="absolute -bottom-6 left-0 right-0 text-red-500 text-xs text-center">{uploadError}</p>
      )}
    </div>
  );
}
