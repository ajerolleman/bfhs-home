import React, { useEffect } from 'react';

const CustomCursor: React.FC = () => {
  useEffect(() => {
    // Helper for magnetic effect
    const onMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const magneticBtns = document.querySelectorAll('.magnetic-btn');

      magneticBtns.forEach((btn) => {
        const rect = (btn as HTMLElement).getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const distanceX = clientX - centerX;
        const distanceY = clientY - centerY;
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

        // Magnetic pull range: Trigger only when VERY close (0.3x the max dimension)
        const triggerDistance = Math.max(rect.width, rect.height) * 0.3; 

        if (distance < triggerDistance) {
            // Check for specific "slight" variation
            const isSlight = btn.classList.contains('magnetic-slight');
            
            // Very slight strength
            const strength = isSlight ? 0.05 : 0.1; 

            const moveX = distanceX * strength;
            const moveY = distanceY * strength;
            (btn as HTMLElement).style.transform = `translate(${moveX}px, ${moveY}px)`;
        } else {
            (btn as HTMLElement).style.transform = `translate(0px, 0px)`;
        }
      });
    };

    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      
      // Reset magnetic buttons on unmount
      const magneticBtns = document.querySelectorAll('.magnetic-btn');
      magneticBtns.forEach(btn => {
         (btn as HTMLElement).style.transform = 'translate(0px, 0px)';
      });
    };
  }, []);

  return null;
};

export default CustomCursor;