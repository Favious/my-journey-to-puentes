export interface Milestone {
  description: string;
  imageUrl: string;
}

export interface JourneyData {
  company: string;
  coverImageUrl: string;
  createdAt: any; // Firestore Timestamp
  fullName: string;
  home: {
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  slug: string;
  theme: string;
  milestones: Milestone[];
}

export interface JourneyDataInput {
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
  milestones: Milestone[];
}
