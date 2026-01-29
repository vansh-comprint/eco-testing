import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '@/stores';

const CustomCursor: React.FC = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const { theme } = useThemeStore();

  useEffect(() => {
    const mouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isClickable =
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'INPUT' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.classList.contains('interactive');

      setIsHovering(!!isClickable);
    };

    window.addEventListener('mousemove', mouseMove);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', mouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  // Theme-aware styles
  // Dark Mode: mix-blend-difference (Green on Black = Green, Green on White Text = Magenta/Black)
  // Light Mode: mix-blend-normal (Green on White = Green). We disable difference to avoid Purple cursor on white bg.
  const blendModeClass = theme === 'dark' ? 'mix-blend-difference' : 'mix-blend-normal';
  const opacityClass = theme === 'dark' ? 'opacity-80' : 'opacity-60'; // Slightly clearer in light mode

  return (
    <>
      <motion.div
        className={`fixed top-0 left-0 pointer-events-none z-[10000] ${blendModeClass}`}
        animate={{
          x: mousePosition.x - 16,
          y: mousePosition.y - 16,
          scale: isHovering ? 2.5 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 150,
          damping: 15,
          mass: 0.1
        }}
      >
        <div className={`
          relative w-8 h-8 bg-ecotribe-primary rounded-full blur-[2px] ${opacityClass}
          transition-colors duration-300
          ${isHovering ? 'bg-white' : 'bg-ecotribe-primary'}
        `}>
           {/* Inner core */}
           <div className="absolute inset-0 m-auto w-2 h-2 bg-white rounded-full blur-[1px]"></div>
        </div>
      </motion.div>
    </>
  );
};

export default CustomCursor;
