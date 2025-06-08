
const wittyNames: string[] = [
  "Professor GiggleSnort",
  "The Unfiltered Critic", // Was "The Cafeteria Critic"
  "The Midnight Philosopher", // Was "Dorm Room Philosopher"
  "The Stealthy Poster", // Was "Library Ninja"
  "Chancellor of Puns",
  "The Banter Captain", // Was "Quad Squad Captain"
  "Early Morning Zombie",
  "The Thread Survivor", // Was "Study Group Survivor"
  "The Scroll Sage", // Was "The Syllabus Sage"
  "Ramen Noodle Connoisseur",
  "Midnight Oil Burner",
  "The Feed Lurker", // Was "Lecture Hall Lurker"
  "Dean of Doodles",
  "Espresso Enthusiast",
  "The Digital Cipher", // Was "Campus Cryptographer"
  "The Procrastination Pro",
  "Freudian Slipper",
  "Quantum Quirker",
  "Syntax Samurai",
  "The Algorithm Alchemist",
  "Binary Bard",
  "CtrlAltDefeat",
  "Kernel Panic Professional",
  "Git Gud Guru",
  "Stack Overflow Oracle",
  "Server Whisperer",
  "Code Commentator",
  "Boolean Baron",
  "Variable Virtuoso",
  "Recursive Rambler",
  "Pixel Picasso",
  "Debug Diva",
  "Loop Lord",
  "Chief Troublemaker",
  "Master of Minutiae",
  "The Wandering Wit",
  "Sergeant Sarcasm",
  "Baron Von Banter",
  "Agent Anonymo",
  "Anonymous Avenger",
  "The Secret Scribbler",
  "Gossip Ghostwriter",
  "The Enigmatic Emu",
  "Whisper Weaver",
  "Incognito Iguana",
  "Undercover Unicorn",
  "Mysterious Mongoose",
  "Phantom Phoenix",
  "Shadowy Squirrel",
  "Cloaked Capybara",
];

export const getRandomWittyName = (): string => {
  const randomIndex = Math.floor(Math.random() * wittyNames.length);
  return wittyNames[randomIndex];
};

const untitledWittyPhrases: string[] = [
  "Spark of Genius",
  "Musings from the Ether",
  "Chronicle of the Unnamed",
  "The Secret Unveiled (Not Really)",
  "Echoes in the Void",
  "A Fleeting Thought",
  "Whispers of Banter",
  "The Great Unknown (Banter Edition)",
  "A Moment's Madness",
  "Random Ruminations",
  "Coded Communique",
  "The Unspoken Truth (Perhaps)",
  "Fragment of Imagination",
  "Brainwave Broadcast",
  "A Puzzling Post", // Was "Campus Conundrum"
];

export const generateUntitledWittyTitle = (): string => {
  const randomIndex = Math.floor(Math.random() * untitledWittyPhrases.length);
  return `Untitled: ${untitledWittyPhrases[randomIndex]}`;
};