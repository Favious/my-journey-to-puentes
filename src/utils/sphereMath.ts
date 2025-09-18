// Utility functions for sphere geometry calculations

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Convert latitude/longitude to 3D coordinates on a sphere
 */
export function latLngToVector3(lat: number, lng: number, radius: number = 3.1): Vector3D {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  
  // Adjust for the rotated earth image - shift longitude by 90 degrees
  const adjustedLng = lngRad + Math.PI / 2;
  
  return {
    x: radius * Math.cos(latRad) * Math.sin(adjustedLng),
    y: radius * Math.sin(latRad),
    z: radius * Math.cos(latRad) * Math.cos(adjustedLng)
  };
}

/**
 * Calculate the great circle distance between two points on a sphere
 */
export function greatCircleDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Calculate intermediate points along a great circle path
 */
export function getGreatCirclePoints(
  startLat: number, 
  startLng: number, 
  endLat: number, 
  endLng: number, 
  numPoints: number
): LatLng[] {
  const points: LatLng[] = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const fraction = i / numPoints;
    
    // Convert to radians
    const lat1 = startLat * Math.PI / 180;
    const lng1 = startLng * Math.PI / 180;
    const lat2 = endLat * Math.PI / 180;
    const lng2 = endLng * Math.PI / 180;
    
    // Calculate the angular distance
    const d = Math.acos(
      Math.sin(lat1) * Math.sin(lat2) + 
      Math.cos(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1)
    );
    
    if (d === 0) {
      // Points are the same
      points.push({ lat: startLat, lng: startLng });
      continue;
    }
    
    // Calculate intermediate point
    const a = Math.sin((1 - fraction) * d) / Math.sin(d);
    const b = Math.sin(fraction * d) / Math.sin(d);
    
    const x = a * Math.cos(lat1) * Math.cos(lng1) + b * Math.cos(lat2) * Math.cos(lng2);
    const y = a * Math.cos(lat1) * Math.sin(lng1) + b * Math.cos(lat2) * Math.sin(lng2);
    const z = a * Math.sin(lat1) + b * Math.sin(lat2);
    
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * 180 / Math.PI;
    const lng = Math.atan2(y, x) * 180 / Math.PI;
    
    points.push({ lat, lng });
  }
  
  return points;
}

/**
 * Calculate the bearing from one point to another
 */
export function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  
  return Math.atan2(y, x) * 180 / Math.PI;
}


