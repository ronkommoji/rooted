// 52 weekly challenges - one for each week of the year
// Each challenge has scripture and a simple, gentle invitation

export interface WeeklyChallenge {
  scripture: string;
  reference: string;
  challenge: string;
}

export const weeklyChallenge: WeeklyChallenge[] = [
  // Week 1-13 (Q1)
  {
    scripture: "Commit your work to the Lord, and your plans will be established.",
    reference: "Proverbs 16:3",
    challenge: "Read your devotional each morning"
  },
  {
    scripture: "Be still, and know that I am God.",
    reference: "Psalm 46:10",
    challenge: "Spend 5 quiet minutes with God daily"
  },
  {
    scripture: "Give thanks in all circumstances; for this is the will of God.",
    reference: "1 Thessalonians 5:18",
    challenge: "Write down 3 things you're grateful for each day"
  },
  {
    scripture: "Bear one another's burdens, and so fulfill the law of Christ.",
    reference: "Galatians 6:2",
    challenge: "Pray for a different group member each day"
  },
  {
    scripture: "Your word is a lamp to my feet and a light to my path.",
    reference: "Psalm 119:105",
    challenge: "Memorize one verse this week"
  },
  {
    scripture: "Let us not grow weary of doing good.",
    reference: "Galatians 6:9",
    challenge: "Perform one act of kindness each day"
  },
  {
    scripture: "Rejoice always, pray without ceasing.",
    reference: "1 Thessalonians 5:16-17",
    challenge: "Set 3 prayer reminders throughout your day"
  },
  {
    scripture: "Love your neighbor as yourself.",
    reference: "Mark 12:31",
    challenge: "Reach out to someone who needs encouragement"
  },
  {
    scripture: "Cast all your anxieties on him, because he cares for you.",
    reference: "1 Peter 5:7",
    challenge: "Journal your worries, then pray over them"
  },
  {
    scripture: "Faith comes from hearing, and hearing through the word of Christ.",
    reference: "Romans 10:17",
    challenge: "Listen to a Christian podcast or sermon"
  },
  {
    scripture: "Let the peace of Christ rule in your hearts.",
    reference: "Colossians 3:15",
    challenge: "Practice pausing before reacting this week"
  },
  {
    scripture: "I can do all things through him who strengthens me.",
    reference: "Philippians 4:13",
    challenge: "Face one thing you've been avoiding"
  },
  {
    scripture: "The Lord is my shepherd; I shall not want.",
    reference: "Psalm 23:1",
    challenge: "Read Psalm 23 every morning"
  },

  // Week 14-26 (Q2)
  {
    scripture: "Draw near to God, and he will draw near to you.",
    reference: "James 4:8",
    challenge: "Start each day with prayer before checking your phone"
  },
  {
    scripture: "Trust in the Lord with all your heart.",
    reference: "Proverbs 3:5",
    challenge: "Surrender one worry to God each day"
  },
  {
    scripture: "Let your light shine before others.",
    reference: "Matthew 5:16",
    challenge: "Share your faith story with someone"
  },
  {
    scripture: "Be kind to one another, tenderhearted, forgiving.",
    reference: "Ephesians 4:32",
    challenge: "Forgive someone who has hurt you"
  },
  {
    scripture: "Seek first the kingdom of God and his righteousness.",
    reference: "Matthew 6:33",
    challenge: "Put God first in one decision each day"
  },
  {
    scripture: "The joy of the Lord is your strength.",
    reference: "Nehemiah 8:10",
    challenge: "Choose joy in one difficult moment each day"
  },
  {
    scripture: "Wait for the Lord; be strong and courageous.",
    reference: "Psalm 27:14",
    challenge: "Practice patience in waiting this week"
  },
  {
    scripture: "In everything give thanks.",
    reference: "1 Thessalonians 5:18",
    challenge: "Thank God for something you usually overlook"
  },
  {
    scripture: "Encourage one another and build each other up.",
    reference: "1 Thessalonians 5:11",
    challenge: "Send an encouraging message to 3 people"
  },
  {
    scripture: "Be doers of the word, and not hearers only.",
    reference: "James 1:22",
    challenge: "Act on one thing you learn from Scripture"
  },
  {
    scripture: "Walk by faith, not by sight.",
    reference: "2 Corinthians 5:7",
    challenge: "Trust God with an uncertain situation"
  },
  {
    scripture: "Love is patient, love is kind.",
    reference: "1 Corinthians 13:4",
    challenge: "Practice extra patience with loved ones"
  },
  {
    scripture: "Come to me, all who are weary, and I will give you rest.",
    reference: "Matthew 11:28",
    challenge: "Rest intentionally one day this week"
  },

  // Week 27-39 (Q3)
  {
    scripture: "Delight yourself in the Lord.",
    reference: "Psalm 37:4",
    challenge: "Spend time in worship each day"
  },
  {
    scripture: "A gentle answer turns away wrath.",
    reference: "Proverbs 15:1",
    challenge: "Respond gently in tense moments"
  },
  {
    scripture: "Do not be anxious about anything.",
    reference: "Philippians 4:6",
    challenge: "Replace one anxious thought with prayer"
  },
  {
    scripture: "He who began a good work in you will complete it.",
    reference: "Philippians 1:6",
    challenge: "Reflect on how God has changed you"
  },
  {
    scripture: "Set your minds on things above.",
    reference: "Colossians 3:2",
    challenge: "Start each morning with a heavenly focus"
  },
  {
    scripture: "Blessed are the peacemakers.",
    reference: "Matthew 5:9",
    challenge: "Bring peace to a conflict this week"
  },
  {
    scripture: "The Lord is near to the brokenhearted.",
    reference: "Psalm 34:18",
    challenge: "Comfort someone who is hurting"
  },
  {
    scripture: "Whatever you do, work heartily, as for the Lord.",
    reference: "Colossians 3:23",
    challenge: "Dedicate your work to God each morning"
  },
  {
    scripture: "His mercies are new every morning.",
    reference: "Lamentations 3:23",
    challenge: "Thank God for fresh mercy each morning"
  },
  {
    scripture: "Be transformed by the renewing of your mind.",
    reference: "Romans 12:2",
    challenge: "Replace negative thoughts with Scripture"
  },
  {
    scripture: "For where your treasure is, there your heart will be.",
    reference: "Matthew 6:21",
    challenge: "Give generously to someone in need"
  },
  {
    scripture: "The Lord is my light and my salvation.",
    reference: "Psalm 27:1",
    challenge: "Face a fear with God's strength"
  },
  {
    scripture: "In quietness and trust is your strength.",
    reference: "Isaiah 30:15",
    challenge: "Practice silence before God for 10 minutes"
  },

  // Week 40-52 (Q4)
  {
    scripture: "Give, and it will be given to you.",
    reference: "Luke 6:38",
    challenge: "Practice generosity in a new way"
  },
  {
    scripture: "Humble yourselves before the Lord.",
    reference: "James 4:10",
    challenge: "Admit a weakness to a trusted friend"
  },
  {
    scripture: "Let love be genuine.",
    reference: "Romans 12:9",
    challenge: "Show authentic love to someone difficult"
  },
  {
    scripture: "The Lord will fight for you; you need only to be still.",
    reference: "Exodus 14:14",
    challenge: "Let go of control in one situation"
  },
  {
    scripture: "Pray for one another, that you may be healed.",
    reference: "James 5:16",
    challenge: "Confess and pray with a trusted friend"
  },
  {
    scripture: "Consider it pure joy when you face trials.",
    reference: "James 1:2",
    challenge: "Find God's purpose in a challenge"
  },
  {
    scripture: "I praise you, for I am fearfully and wonderfully made.",
    reference: "Psalm 139:14",
    challenge: "Thank God for how He made you"
  },
  {
    scripture: "Therefore, if anyone is in Christ, he is a new creation.",
    reference: "2 Corinthians 5:17",
    challenge: "Leave behind an old habit"
  },
  {
    scripture: "The Lord bless you and keep you.",
    reference: "Numbers 6:24",
    challenge: "Bless others with your words this week"
  },
  {
    scripture: "Great is thy faithfulness.",
    reference: "Lamentations 3:23",
    challenge: "Recall God's faithfulness in your life"
  },
  {
    scripture: "For God so loved the world.",
    reference: "John 3:16",
    challenge: "Share the gospel with someone"
  },
  {
    scripture: "I am with you always, to the end of the age.",
    reference: "Matthew 28:20",
    challenge: "Remember God's presence throughout the day"
  },
  {
    scripture: "Behold, I am making all things new.",
    reference: "Revelation 21:5",
    challenge: "Set a faith goal for the new year"
  },
];

/**
 * Get the current week's challenge based on week of year
 * Same challenge for everyone, loops through 52 weeks
 */
export function getCurrentWeekChallenge(): WeeklyChallenge {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  const weekOfYear = Math.floor(diff / oneWeek);
  const weekIndex = weekOfYear % 52;
  
  return weeklyChallenge[weekIndex];
}

