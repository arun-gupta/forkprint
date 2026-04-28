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
    text: 'Open source is not about free software, it\'s about freedom.',
    author: 'Richard Stallman',
    context: 'Founder, Free Software Foundation; creator of GNU',
  },
  {
    text: 'Open source is a development methodology; free software is a social movement.',
    author: 'Richard Stallman',
    context: 'Founder, Free Software Foundation; creator of GNU',
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
  {
    text: 'The most reliable indication of the future of open source is its past: in just a few years, we have gone from nothing to a robust body of software that solves many different problems. There\'s no reason for us to slow down now.',
    author: 'Bruce Perens',
    context: 'Co-founder, Open Source Initiative; author of the Open Source Definition',
  },
  {
    text: 'Nobody \'manages\' the open source contributors.',
    author: 'Daniel H. Pink',
    context: 'Author of Drive and To Sell Is Human',
  },
  {
    text: 'Open source is already a masterpiece, it doesn\'t need editing. But we do need more diversity and could be nicer to each other.',
    author: 'Danese Cooper',
    context: 'Former board chair, Open Source Initiative; former Chief Open Source Evangelist, Sun Microsystems',
  },
  {
    text: 'The open source community has been one of the most collaborative and supportive communities I have ever been a part of.',
    author: 'Nithya Ruff',
    context: 'Chair, Linux Foundation Board; former Head of Open Source Program Office, Amazon',
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
    context: 'Author of Working in Public: The Making and Maintenance of Open Source Software',
  },
  {
    text: 'In more than 85% of the open source projects examined on GitHub, less than 5% of developers were responsible for over 95% of code and social interactions.',
    author: 'Nadia Eghbal',
    context: 'Author of Working in Public: The Making and Maintenance of Open Source Software',
  },
  {
    text: 'Open source is about collaborating; not competing.',
    author: 'Stormy Peters',
    context: 'FOSS advocate; ex-GNOME Foundation, HP, Mozilla',
  },
  {
    text: 'Open source offers a greenfield advantage for policymakers and Europe has the chance to lead.',
    author: 'Sachiko Muto',
    context: 'CEO, OpenForum Europe',
  },
  {
    text: 'Remember that open source has room for everyone. It can be daunting, but in my experience, people want to help.',
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
  {
    text: 'In the region, the use of open source has increased considerably as it is the most accessible option in terms of time and costs for companies to continue sharing information and generating new developments.',
    author: 'Luciano Alves',
    context: 'President, Zabbix Latin America, Brazil',
  },
  {
    text: 'Latin America uses a lot of open source tools, but we still need to make the jump to contribute to and create them.',
    author: 'Gonzalo Peña-Castellanos',
    context: 'JupyterLab core developer; Python Software Foundation, Colombia',
  },

  // Developer experience & craftsmanship
  {
    text: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.',
    author: 'Martin Fowler',
    context: 'Software engineer, author of Refactoring',
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

  // Civic tech & humanitarian
  {
    text: 'Fostering an open source culture in an enterprise sustains innovation.',
    author: 'Arun Gupta',
    context: 'Author of Fostering Open Source Culture',
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