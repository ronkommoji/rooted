import React, { useEffect, useRef } from 'react';
import { useFiesta, FiestaAnimations } from 'react-native-fiesta';

interface FireworksProps {
  visible: boolean;
  onComplete?: () => void;
}

export const Fireworks: React.FC<FireworksProps> = ({ visible, onComplete }) => {
  // Hook must be called unconditionally
  let fiestaHook;
  try {
    fiestaHook = useFiesta();
  } catch (error) {
    console.warn('Fireworks: useFiesta hook error:', error);
    fiestaHook = null;
  }

  const runFiestaAnimation = fiestaHook?.runFiestaAnimation;
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (visible && !hasTriggered.current && runFiestaAnimation) {
      try {
        hasTriggered.current = true;
        
        // Trigger fireworks animation
        runFiestaAnimation({
          animation: FiestaAnimations.Fireworks,
          colors: ['#3D5A50', '#E6C68B', '#B9D6D2', '#F5F4EF'],
        });

        // Call onComplete after animation duration (approximately 3 seconds)
        const timer = setTimeout(() => {
          onComplete?.();
          hasTriggered.current = false;
        }, 3000);

        return () => clearTimeout(timer);
      } catch (error) {
        console.error('Fireworks: Error triggering animation:', error);
        hasTriggered.current = false;
        // Still call onComplete even if animation fails
        onComplete?.();
      }
    } else if (!visible) {
      hasTriggered.current = false;
    }
  }, [visible, onComplete, runFiestaAnimation]);

  // This component doesn't render anything - it just triggers the animation
  return null;
};
