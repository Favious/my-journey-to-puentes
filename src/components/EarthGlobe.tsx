'use client';

import { useTexture } from '@react-three/drei';
import { memo } from 'react';

function EarthGlobe() {
  const texture = useTexture('/earthMap.jpeg');

  return (
    <mesh scale={[1, -1, 1]} receiveShadow>
      <sphereGeometry args={[3, 64, 64]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}

export default memo(EarthGlobe);
