# Environment Setup

## Edit Code Configuration

To enable the code-based authentication for editing engineer profiles, create a `.env.local` file in the root directory with the following content:

```env
# Edit Code for Engineer Profile Access
NEXT_PUBLIC_EDIT_CODE=282828
```

## How it works

- The edit code is now properly configured using the `NEXT_PUBLIC_EDIT_CODE` environment variable
- Users must enter this code to access the edit functionality
- The code entry modal appears when:
  - An engineer profile exists but has no name (incomplete profile)
  - A user clicks "Edit Profile" button on a complete profile
  - Someone tries to access the edit route directly

## Security Note

For production, consider:
- Using a more secure authentication method
- Implementing more robust authentication
- Adding rate limiting to prevent brute force attempts
