
import { PostFlairDefinition } from '../types';

export const POST_FLAIRS: PostFlairDefinition[] = [
  {
    id: 'hot_take',
    name: "Hot Take",
    icon: 'fas fa-fire',
    iconColorClass: 'text-orange-500',
    borderColorClass: 'border-orange-500/50', // Applied to PostCard
    description: "This one's spicy! A controversial opinion or a bold statement.",
    unlockAtPoints: 500,
  },
  {
    id: 'joke_master',
    name: "Joke Master",
    icon: 'fas fa-face-grin-beam-sweat', // More jovial icon
    iconColorClass: 'text-yellow-400',
    backgroundColorClass: 'bg-yellow-400/10', // Applied to PostCard
    description: "Warning: May contain puns, dad jokes, or genuine hilarity.",
    unlockAtPoints: 200,
  },
  {
    id: 'deep_thoughts',
    name: "Deep Thoughts",
    icon: 'fas fa-brain',
    iconColorClass: 'text-blue-500',
    borderColorClass: 'border-blue-500/30', // Applied to PostCard
    description: "Pondering the mysteries of the universe (or just what's for lunch).",
    unlockAtPoints: 1200,
  },
  {
    id: 'story_time',
    name: "Story Time",
    icon: 'fas fa-book-open',
    iconColorClass: 'text-green-600',
    backgroundColorClass: 'bg-green-600/5', // Subtle background
    description: "Gather 'round, for a tale is about to be told!",
    unlockAtPoints: 800,
  },
  // Example of a flair that might not be unlocked by points, but by other means (future feature)
  // {
  //   id: 'event_special',
  //   name: "Event Special",
  //   icon: 'fas fa-calendar-star',
  //   iconColorClass: 'text-purple-500',
  //   description: "A special flair for participating in an event!",
  //   unlockAtPoints: -1, // Or another way to denote special unlock
  // }
];

export const getPostFlairById = (id: string | null | undefined): PostFlairDefinition | undefined => {
  if (!id) return undefined;
  return POST_FLAIRS.find(flair => flair.id === id);
};
