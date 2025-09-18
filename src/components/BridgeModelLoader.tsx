'use client';

import { useGLTF, Preload } from '@react-three/drei';
import { createContext, useContext, ReactNode } from 'react';

interface BridgeModelContextType {
  bridgeModel: any;
  isLoading: boolean;
}

const BridgeModelContext = createContext<BridgeModelContextType | null>(null);

export function BridgeModelProvider({ children }: { children: ReactNode }) {
  const { scene: bridgeModel } = useGLTF('/golden_gate_bridge/scene.gltf', true);
  
  return (
    <BridgeModelContext.Provider value={{ bridgeModel, isLoading: !bridgeModel }}>
      <Preload />
      {children}
    </BridgeModelContext.Provider>
  );
}

export function useBridgeModel() {
  const context = useContext(BridgeModelContext);
  if (!context) {
    throw new Error('useBridgeModel must be used within a BridgeModelProvider');
  }
  return context;
}
