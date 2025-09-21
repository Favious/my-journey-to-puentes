export interface Milestone {
  description: string;
  imageUrl: string;
}

export interface JourneyData {
  cityOfBirth: string;
  company: string;
  coverImageUrl: string;
  createdAt: any; // Firestore Timestamp
  fullName: string;
  home: {
    latitude: number;
    longitude: number;
  };
  slug: string;
  theme: string;
  milestones: Milestone[];
}

export interface JourneyDataInput {
  cityOfBirth: string;
  company: string;
  coverImageUrl: string;
  fullName: string;
  home: [number, number]; // [lat, lng] for form input
  slug: string;
  theme: string;
  milestones: Milestone[];
}
