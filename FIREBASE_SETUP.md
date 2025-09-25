# Firebase Setup

This project is now connected to Firebase Firestore for data storage.

## Configuration

The Firebase configuration is stored in `.env.local` with the following environment variables:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

## Firestore Collection

Data is saved to the `journeyData` collection in Firestore with the following structure:

```typescript
{
  cityOfBirth: string;
  company: string;
  coverImageUrl: string;
  createdAt: Timestamp; // Server timestamp
  fullName: string;
  home: {
    latitude: number;
    longitude: number;
  };
  milestones: Array<{
    description: string;
    imageUrl: string;
    slug: string;
    theme: string;
  }>;
}
```

## Usage

1. Start the development server: `npm run dev`
2. Navigate to `/adding-test`
3. Fill out the form and submit
4. Data will be saved to Firestore and you'll see a success message with the document ID

## Security Rules

Make sure to set up proper Firestore security rules in the Firebase Console to protect your data.
