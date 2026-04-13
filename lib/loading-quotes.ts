export interface LoadingQuote {
  text: string
  author: string
  context?: string
}

export const LOADING_QUOTES: LoadingQuote[] = [
  // Tech leaders
  { text: 'Talk is cheap. Show me the code.', author: 'Linus Torvalds', context: 'Creator of Linux and Git' },
  { text: 'The hottest new programming language is English.', author: 'Andrej Karpathy', context: 'AI researcher, former Tesla / OpenAI' },
  { text: 'Given enough eyeballs, all bugs are shallow.', author: "Linus's Law", context: 'From The Cathedral and the Bazaar' },
{ text: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.', author: 'Martin Fowler', context: 'Software engineer, author of Refactoring' },
  { text: 'In open source, we feel strongly that to really do something well, you have to get a lot of people involved.', author: 'Linus Torvalds', context: 'Creator of Linux and Git' },
  { text: 'The best thing about open source is that it lets you stand on the shoulders of giants.', author: 'Sam Altman', context: 'CEO, OpenAI' },
  { text: 'Open source is not a zero-sum game. When one company contributes, the entire ecosystem benefits.', author: 'Satya Nadella', context: 'CEO, Microsoft' },
  { text: 'Open source has been at the heart of innovation for decades. It\'s how we build the future together.', author: 'Sundar Pichai', context: 'CEO, Google' },
  { text: 'I think open source AI is going to be incredibly important for the world.', author: 'Dario Amodei', context: 'CEO, Anthropic' },
  { text: 'Open source is not about free software, it\'s about freedom.', author: 'Richard Stallman', context: 'Founder, Free Software Foundation' },

  // Global leaders & institutions
  {
    text: 'We must undertake a concerted global effort to encourage and invest in the creation of digital public goods: open source software, open data, open AI models.',
    author: 'António Guterres',
    context: 'UN Secretary-General',
  },
  {
    text: 'You open it up with interfaces so anyone can build applications on top of it.',
    author: 'Nandan Nilekani',
    context: 'Co-founder Infosys, Architect of India Stack',
  },
  {
    text: 'When you post the imperfect, when you share your mistakes, people will start editing and co-creating.',
    author: 'Audrey Tang',
    context: 'Former Digital Minister, Taiwan',
  },
  {
    text: 'Open source is inextricable from the idea of an open internet, where individuals can shape their own experience and are empowered, safe, and independent.',
    author: 'Mitchell Baker',
    context: 'Mozilla',
  },
  {
    text: 'Source code — the only representation of software that contains human readable knowledge — is a precious digital object.',
    author: 'Roberto Di Cosmo',
    context: 'Software Heritage, France',
  },
  {
    text: 'Just as I did 40 years ago, today I continue to muse upon how computers can help people.',
    author: 'Jun Murai',
    context: 'Father of the Internet in Japan',
  },
  {
    text: 'Open source is the foundation of modern innovation. It\'s not just about code — it\'s about collaboration at a global scale.',
    author: 'Jim Zemlin',
    context: 'Linux Foundation',
  },
]

export function getRandomQuoteIndex(currentIndex: number | null): number {
  if (LOADING_QUOTES.length <= 1) return 0
  let next: number
  do {
    next = Math.floor(Math.random() * LOADING_QUOTES.length)
  } while (next === currentIndex)
  return next
}
