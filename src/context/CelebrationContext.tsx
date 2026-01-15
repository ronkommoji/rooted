import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getPendingCelebrations, markCelebrationAsShown, Celebration } from '../services/celebrationService';
import { Fireworks } from '../components/Fireworks';
import { SafeFiestaProvider } from '../components/SafeFiestaProvider';

interface CelebrationContextType {
  showFireworks: () => void;
  checkPendingCelebrations: () => Promise<void>;
}

const CelebrationContext = createContext<CelebrationContextType | undefined>(undefined);

export const CelebrationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showFireworksAnimation, setShowFireworksAnimation] = useState(false);
  const [pendingCelebrations, setPendingCelebrations] = useState<Celebration[]>([]);
  const [currentCelebrationIndex, setCurrentCelebrationIndex] = useState(0);
  const { session } = useAppStore();

  const showFireworks = useCallback(() => {
    setShowFireworksAnimation(true);
  }, []);

  const handleFireworksComplete = useCallback(async () => {
    setShowFireworksAnimation(false);

    // Mark current celebration as shown
    if (pendingCelebrations[currentCelebrationIndex]) {
      await markCelebrationAsShown(pendingCelebrations[currentCelebrationIndex].id);
    }

    // Show next celebration if available
    const nextIndex = currentCelebrationIndex + 1;
    if (nextIndex < pendingCelebrations.length) {
      setCurrentCelebrationIndex(nextIndex);
      // Small delay before showing next fireworks
      setTimeout(() => {
        setShowFireworksAnimation(true);
      }, 500);
    } else {
      // All celebrations shown, reset
      setPendingCelebrations([]);
      setCurrentCelebrationIndex(0);
    }
  }, [pendingCelebrations, currentCelebrationIndex]);

  const checkPendingCelebrations = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const celebrations = await getPendingCelebrations(session.user.id);
      
      if (celebrations.length > 0) {
        setPendingCelebrations(celebrations);
        setCurrentCelebrationIndex(0);
        // Show first celebration after a short delay
        setTimeout(() => {
          setShowFireworksAnimation(true);
        }, 1000);
      }
    } catch (error) {
      console.error('Error checking pending celebrations:', error);
      // Don't crash the app if celebration check fails
    }
  }, [session?.user?.id]);

  // Check for pending celebrations when user logs in
  useEffect(() => {
    if (session?.user?.id) {
      // Delay to ensure app is fully loaded and FiestaProvider is ready
      const timer = setTimeout(() => {
        try {
          checkPendingCelebrations();
        } catch (error) {
          console.error('Error in celebration check effect:', error);
          // Don't crash the app
        }
      }, 3000); // Increased delay to ensure everything is initialized

      return () => clearTimeout(timer);
    }
  }, [session?.user?.id, checkPendingCelebrations]);

  return (
    <SafeFiestaProvider>
      <CelebrationContext.Provider value={{ showFireworks, checkPendingCelebrations }}>
        {children}
        <Fireworks visible={showFireworksAnimation} onComplete={handleFireworksComplete} />
      </CelebrationContext.Provider>
    </SafeFiestaProvider>
  );
};

export const useCelebration = () => {
  const context = useContext(CelebrationContext);
  if (!context) {
    throw new Error('useCelebration must be used within CelebrationProvider');
  }
  return context;
};
