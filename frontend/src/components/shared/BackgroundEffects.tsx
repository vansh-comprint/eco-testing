import { Waves } from './Waves';
import { useThemeStore } from '@/stores';

export function BackgroundEffects() {
  const { theme, showMeshBackground } = useThemeStore();

  if (!showMeshBackground) return null;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      {/* Grid Mesh - LAYER 1 (Behind Glow) */}
      <Waves
        backgroundColor="transparent"
        // Light Mode: Pure Black stroke with 0.4 opacity for crisp technical drawing look
        // Dark Mode: White stroke (0.15 opacity) for subtle tech feel on black
        strokeColor={theme === 'dark' ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.4)"}
        pointerSize={2}
      />

      {/* Ethereal Glow Overlay - LAYER 2 (Behind Text) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/*
          Light Mode: 'mix-blend-multiply' allows the green to soak into the white background.
          Dark Mode: 'mix-blend-normal' with low opacity to avoid washout.
        */}
        <div className={`w-full h-full ${theme === 'dark' ? 'mix-blend-normal opacity-30' : 'mix-blend-multiply opacity-20'}`}>
          {/* Layer 1: Primary Glow */}
          <div className="absolute -top-[20%] -left-[10%] w-[80vw] h-[80vw] bg-ecotribe-primary rounded-full blur-[140px] opacity-40 animate-breathe" />

          {/* Layer 2: Secondary Glow */}
          <div
            className="absolute top-[20%] -right-[10%] w-[60vw] h-[60vw] bg-ecotribe-light-primary rounded-full blur-[140px] opacity-40 animate-breathe"
            style={{ animationDelay: '2s' }}
          />

          {/* Layer 3: Ethereal Fog (Slow Mover) */}
          <div
            className="absolute top-[40%] left-[20%] w-[50vw] h-[50vw] bg-ecotribe-tertiary dark:bg-ecotribe-secondary rounded-full blur-[160px] opacity-30 animate-breathe"
            style={{ animationDelay: '5s' }}
          />
        </div>
      </div>
    </div>
  );
}
