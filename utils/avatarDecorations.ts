
import { AvatarFrameDefinition, AvatarFlairDefinition } from '../types';

export const AVATAR_FRAMES: AvatarFrameDefinition[] = [
  {
    id: 'none',
    name: 'None',
    borderClasses: '',
    unlockAtPoints: 0,
    description: 'No frame selected. Plain and simple!',
  },
  {
    id: 'simple_primary',
    name: 'Primary Outline',
    borderClasses: 'border-2 border-primary',
    unlockAtPoints: 50,
    description: 'A simple, elegant outline in your primary theme color. Unlocks at 50 Banter Points.',
  },
  {
    id: 'accent_dashed',
    name: 'Accent Dashes',
    borderClasses: 'border-3 border-dashed border-accent',
    unlockAtPoints: 250,
    description: 'A stylish dashed border in your accent theme color. Unlocks at 250 Banter Points.',
  },
  {
    id: 'secondary_double',
    name: 'Secondary Double',
    borderClasses: 'border-4 border-double border-secondary',
    unlockAtPoints: 1000,
    description: 'A bold double border in your secondary theme color. Unlocks at 1000 Banter Points.',
  },
  {
    id: 'neutral_glow',
    name: 'Neutral Glow',
    borderClasses: 'border-2 border-neutral shadow-lg shadow-neutral-focus/50',
    unlockAtPoints: 5000,
    description: 'A solid neutral border with a subtle glow effect. Unlocks at 5000 Banter Points.',
  },
  {
    id: 'animated_gradient_border',
    name: 'Chromatic Flow',
    // This will require a more complex setup in ProfilePhoto.tsx, potentially using pseudo-elements or multiple divs if a simple class isn't enough.
    // For now, a placeholder class. The actual animation might need to be handled in CSS or via styled components in the ProfilePhoto.
    borderClasses: 'p-0.5 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 animate-gradient-x', // Example gradient
    unlockAtPoints: 7500,
    description: 'A vibrant, animated gradient border that flows with energy. Unlocks at 7500 Banter Points.',
  },
  {
    id: 'neon_pulse_secondary',
    name: 'Neon Pulse',
    borderClasses: 'border-2 border-secondary animate-pulse shadow-[0_0_10px_theme(colors.secondary)]', // Example pulse with shadow
    unlockAtPoints: 15000,
    description: 'A secondary color border with a cool, neon pulsing effect. Unlocks at 15000 Banter Points.',
  },
];

export const AVATAR_FLAIRS: AvatarFlairDefinition[] = [
  {
    id: 'none',
    name: 'None',
    elements: [],
    unlockAtPoints: 0,
    description: 'No flair selected. Keeping it clean.',
  },
  {
    id: 'star_stud',
    name: 'Star Stud',
    elements: [
      { type: 'icon', iconClass: 'fas fa-star', iconColorClass: 'text-yellow-400', positionClasses: 'absolute -top-1 -right-1 text-xs' }
    ],
    unlockAtPoints: 100,
    description: 'A small, shining star. Unlocks at 100 Banter Points.',
  },
  {
    id: 'flame_burst',
    name: 'Flame Burst',
    elements: [
      { type: 'icon', iconClass: 'fas fa-fire', iconColorClass: 'text-orange-500', positionClasses: 'absolute -bottom-1 -left-1 text-xs' }
    ],
    unlockAtPoints: 750,
    description: 'A tiny burst of flame. Unlocks at 750 Banter Points.',
  },
  {
    id: 'electric_aura',
    name: 'Electric Aura',
    elements: [
      { type: 'shape', shapeClasses: 'w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse', positionClasses: 'absolute top-0 left-0 transform -translate-x-1/2 -translate-y-1/2' },
      { type: 'shape', shapeClasses: 'w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse delay-75', positionClasses: 'absolute bottom-0 right-0 transform translate-x-1/2 translate-y-1/2' }
    ],
    unlockAtPoints: 2000,
    description: 'Crackling electric orbs. Unlocks at 2000 Banter Points.'
  },
  {
    id: 'orbiting_sparkle',
    name: 'Orbiting Sparkle',
    elements: [
      // This will require CSS animation defined for 'orbit' or handled by framer-motion in ProfilePhoto.tsx
      { type: 'icon', iconClass: 'fas fa-sparkles', iconColorClass: 'text-pink-400', positionClasses: 'absolute w-2 h-2 animate-orbit' } // Placeholder animation class
    ],
    unlockAtPoints: 3000,
    description: 'A magical sparkle that orbits your avatar. Unlocks at 3000 Banter Points.',
  },
  {
    id: 'tech_hologram',
    name: 'Tech Hologram',
    elements: [
      { type: 'shape', shapeClasses: 'absolute w-full h-1/3 top-1/3 left-0 bg-cyan-500/20 backdrop-blur-xs animate-pulse-bg opacity-50', positionClasses: '' }, // Example simple hologram line
      { type: 'icon', iconClass: 'fas fa-microchip', iconColorClass: 'text-cyan-300/70', positionClasses: 'absolute top-1 right-1 text-[0.5rem]' }
    ],
    unlockAtPoints: 10000,
    description: 'A subtle, tech-inspired holographic overlay. Unlocks at 10000 Banter Points.',
  }
];

export const getFrameById = (id: string | null | undefined): AvatarFrameDefinition | undefined => {
  if (!id) return AVATAR_FRAMES.find(frame => frame.id === 'none');
  return AVATAR_FRAMES.find(frame => frame.id === id) || AVATAR_FRAMES.find(frame => frame.id === 'none');
};

export const getFlairById = (id: string | null | undefined): AvatarFlairDefinition | undefined => {
  if (!id) return AVATAR_FLAIRS.find(flair => flair.id === 'none');
  return AVATAR_FLAIRS.find(flair => flair.id === id) || AVATAR_FLAIRS.find(flair => flair.id === 'none');
};
