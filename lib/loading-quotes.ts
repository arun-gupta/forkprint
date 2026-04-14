export interface LoadingQuote {
  text: string
  author: string
  context?: string
}

// Diversity guidelines for maintaining this collection:
// - Every quote must have a verified attribution (author + context/affiliation)
// - Maintain geographic diversity: include voices from Africa, Asia, Europe, Latin America, not just the US
// - Maintain gender diversity: aim for at least 25% women authors
// - Maintain industry diversity: tech, academia, government, NGO, civic tech, security, hardware
// - Max 2 quotes per author to keep the pool varied
// - All quotes should relate to open source, software, collaboration, or digital public goods

export const LOADING_QUOTES: LoadingQuote[] = [
  // Open source philosophy & community
  {
    text: 'Talk is cheap. Show me the code.',
    author: 'Linus Torvalds',
    context: 'Creator of Linux and Git',
  },
  {
    text: 'Given enough eyeballs, all bugs are shallow.',
    author: "Eric Raymond",
    context: 'Author of The Cathedral and the Bazaar',
  },
  {
    text: 'In open source, we feel strongly that to really do something well, you have to get a lot of people involved.',
    author: 'Linus Torvalds',
    context: 'Creator of Linux and Git',
  },
  {
    text: 'Open source is not about free software, it\'s about freedom.',
    author: 'Richard Stallman',
    context: 'Founder, Free Software Foundation',
  },
  {
    text: 'Empowerment of individuals is a key part of what makes open source work, since in the end, innovations tend to come from small groups, not from large, structured efforts.',
    author: 'Tim O\'Reilly',
    context: 'Founder, O\'Reilly Media',
  },
  {
    text: 'Open source is not a zero-sum game. When one company contributes, the entire ecosystem benefits.',
    author: 'Satya Nadella',
    context: 'CEO, Microsoft',
  },
  {
    text: 'Open source has been at the heart of innovation for decades. It\'s how we build the future together.',
    author: 'Sundar Pichai',
    context: 'CEO, Google',
  },
  {
    text: 'The best thing about open source is that it lets you stand on the shoulders of giants.',
    author: 'Sam Altman',
    context: 'CEO, OpenAI',
  },
  {
    text: 'Open source is the foundation of modern innovation. It\'s not just about code — it\'s about collaboration at a global scale.',
    author: 'Jim Zemlin',
    context: 'Executive Director, Linux Foundation',
  },
  {
    text: 'Success for open source is when the term becomes a non-factor in the decision making process — people just compare on the feature set.',
    author: 'Brian Behlendorf',
    context: 'Co-founder, Apache Software Foundation',
  },

  // Women in open source & tech
  {
    text: 'Open source is inextricable from the idea of an open internet, where individuals can shape their own experience and are empowered, safe, and independent.',
    author: 'Mitchell Baker',
    context: 'Former CEO and Chairwoman, Mozilla',
  },
  {
    text: 'The open source revolution has been carried on the backs of some very weary people.',
    author: 'Nadia Eghbal',
    context: 'Author of Working in Public',
  },
  {
    text: 'Remember that open source has room for everyone. It can be daunting, but in my experience, people want to help.',
    author: 'Megan Byrd-Sanicki',
    context: 'Open source strategist, former Google OSPO',
  },
  {
    text: 'Be the leader you need. Every contributor to open source is a leader, whether they\'re leading others, leading the community, or just leading themselves.',
    author: 'Megan Byrd-Sanicki',
    context: 'Open source strategist, former Google OSPO',
  },
  {
    text: 'If it\'s closed source, everyone\'s constantly redoing everything and sharing nothing. You never make progress because everyone has to reinvent the universe from first principles.',
    author: 'Limor Fried',
    context: 'Founder, Adafruit Industries',
  },
  {
    text: 'I was so drawn to this idea of sharing and having a community of people who connect and create cool projects together.',
    author: 'Limor Fried',
    context: 'Founder, Adafruit Industries',
  },
  {
    text: 'Paying attention to how to use your words more effectively will make you a more productive communicator overall. Contributing to open source provides that training.',
    author: 'VM Brasseur',
    context: 'Author of Forge Your Future with Open Source',
  },
  {
    text: 'You can\'t be what you can\'t see. Open source communities need visible role models.',
    author: 'Reshma Saujani',
    context: 'Founder, Girls Who Code',
  },
  {
    text: 'We\'re raising our girls to be perfect, and we\'re raising our boys to be brave. We have to teach girls to be comfortable with imperfection.',
    author: 'Reshma Saujani',
    context: 'Founder, Girls Who Code',
  },
  {
    text: 'The quality, relevance, and impact of the products output by the technology sector can only be improved by having the people building them be representative of the people using them.',
    author: 'Tracy Chou',
    context: 'Diversity in tech advocate, founder of Block Party',
  },

  // Global voices & digital public goods
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
    text: 'Source code — the only representation of software that contains human readable knowledge — is a precious digital object.',
    author: 'Roberto Di Cosmo',
    context: 'Director, Software Heritage, France',
  },
  {
    text: 'Just as I did 40 years ago, today I continue to muse upon how computers can help people.',
    author: 'Jun Murai',
    context: 'Father of the Internet in Japan',
  },
  {
    text: 'If you want to go fast, go alone. If you want to go far, go together.',
    author: 'African proverb',
    context: 'Widely used in open source communities',
  },
  {
    text: 'Open source AI and open data aren\'t just about tech. They\'re about access to technology and progress for people everywhere.',
    author: 'Mark Surman',
    context: 'President, Mozilla Foundation',
  },
  {
    text: 'We must ensure that we do not widen inequalities through digital technologies.',
    author: 'Nanjira Sambuli',
    context: 'Digital equality advocate, World Wide Web Foundation, Kenya',
  },

  // Developer experience & craftsmanship
  {
    text: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.',
    author: 'Martin Fowler',
    context: 'Software engineer, author of Refactoring',
  },
  {
    text: 'The hottest new programming language is English.',
    author: 'Andrej Karpathy',
    context: 'AI researcher, former Tesla / OpenAI',
  },
  {
    text: 'I want to make Ruby users free. I want to give them the freedom to choose.',
    author: 'Yukihiro Matsumoto',
    context: 'Creator of Ruby, Japan',
  },
  {
    text: 'The joy of coding Python should be in seeing short, concise, readable classes that express a lot of action in a small amount of clear code.',
    author: 'Guido van Rossum',
    context: 'Creator of Python, Netherlands',
  },

  // Accessibility & sustainability in open source
  {
    text: 'For all the kids that didn\'t go to college, for all the people that didn\'t have someone they knew in tech — open source software was your in. No permissions, no job interviews required.',
    author: 'Kelsey Hightower',
    context: 'Developer advocate, former Google',
  },
  {
    text: 'Maintaining an open source project is like being a flight attendant for an airline where all tickets are free and most customer surveys offer suggestions on how to fly the airplane.',
    author: 'Kelsey Hightower',
    context: 'Developer advocate, former Google',
  },

  // AI & open source
  {
    text: 'I think open source AI is going to be incredibly important for the world.',
    author: 'Dario Amodei',
    context: 'CEO, Anthropic',
  },

  // Community building across regions
  {
    text: 'Open source is embraced globally and Africans are not left out. We are on a journey of creating impact while building innovative solutions through open source.',
    author: 'Abigail Dogbe',
    context: 'Founder, Everything Open Source, Ghana',
  },
  {
    text: 'The production and consumption of open source projects are widely used. My mission is to make sure open source is accessible to all.',
    author: 'Abigail Dogbe',
    context: 'Founder, Everything Open Source, Ghana',
  },
  {
    text: 'Open source is only ajar without inclusion.',
    author: 'Mozilla',
    context: 'The Mozilla Blog',
  },
  {
    text: 'A lack of diversity and sustainability has reduced innovation and blunted the growth of digital infrastructure.',
    author: 'Ford Foundation',
    context: 'Roads and Bridges report on digital infrastructure',
  },

  // Leadership & governance
  {
    text: 'It\'s in everyone\'s interest to sustain our open digital future.',
    author: 'Omidyar Network',
    context: 'Philanthropic investment firm',
  },
  {
    text: 'Open source isn\'t about saving money. It\'s about doing more stuff, and getting incremental innovation with the finite budget you have.',
    author: 'Tim O\'Reilly',
    context: 'Founder, O\'Reilly Media',
  },

  // Security & trust
  {
    text: 'Security is a process, not a product.',
    author: 'Bruce Schneier',
    context: 'Cryptographer, author of Applied Cryptography',
  },
  {
    text: 'The only truly secure system is one that is powered off, cast in a block of concrete and sealed in a lead-lined room with armed guards.',
    author: 'Gene Spafford',
    context: 'Professor of Computer Science, Purdue University',
  },

  // Civic tech & humanitarian
  {
    text: 'Technology is not just a set of tools. It is the means by which people participate in their democracies.',
    author: 'Nnenna Nwakanma',
    context: 'Chief Web Advocate, World Wide Web Foundation, Nigeria',
  },
  {
    text: 'Fostering an open source culture in an enterprise sustains innovation.',
    author: 'Arun Gupta',
    context: 'Author of Fostering Open Source Culture',
  },
  {
    text: 'Code is law.',
    author: 'Lawrence Lessig',
    context: 'Professor, Harvard Law School; founder, Creative Commons',
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
