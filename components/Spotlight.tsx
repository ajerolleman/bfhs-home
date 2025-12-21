import React, { useEffect, useRef } from 'react';

const Spotlight: React.FC = () => {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (divRef.current) {
        divRef.current.style.background = `radial-gradient(400px circle at ${e.clientX}px ${e.clientY}px, rgba(255,255,255,0.08), transparent 40%)`;
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  return (
    <div
      ref={divRef}
      className="pointer-events-none fixed inset-0 z-[60] opacity-0 dark:opacity-100 transition-opacity duration-500 mix-blend-soft-light"
      aria-hidden="true"
    />
  );
};

export default Spotlight;