// Mental health resource library. External links open in a new tab; `route` links stay in the app.

// Indian helplines (verified national services). Keep in sync with /api/support-resources in backend/main.py.
export const crisisHelplines = [
  { id: 'telemanas', title: 'Tele-MANAS (Govt. of India)', description: 'Free national tele-mental-health counselling in 20+ languages.', phone: '14416', altPhone: '1800-891-4416', availability: '24/7, free' },
  { id: 'kiran', title: 'KIRAN Mental Health Helpline', description: 'Ministry of Social Justice helpline for anxiety, stress, depression and suicidal thoughts.', phone: '1800-599-0019', availability: '24/7, free' },
  { id: 'aasra', title: 'AASRA', description: 'Suicide prevention and emotional support.', phone: '+91-9820466726', availability: '24/7' },
  { id: 'vandrevala', title: 'Vandrevala Foundation', description: 'Free psychological counselling by phone or WhatsApp.', phone: '+91-9999666555', availability: '24/7' },
  { id: 'emergency', title: 'National Emergency Number', description: 'Police, ambulance and fire — for immediate danger.', phone: '112', availability: '24/7' }
];

export const resourceCategories = {
  articles: [
    { id: 'a1', title: 'Understanding Anxiety', description: 'What anxiety disorders are, common symptoms and effective treatments (WHO).', url: 'https://www.who.int/news-room/fact-sheets/detail/anxiety-disorders', meta: 'WHO fact sheet', category: 'Anxiety' },
    { id: 'a2', title: 'Depression: Signs and Support', description: 'How depression shows up, and what helps — from self-care to professional treatment (WHO).', url: 'https://www.who.int/news-room/fact-sheets/detail/depression', meta: 'WHO fact sheet', category: 'Depression' },
    { id: 'a3', title: 'Every Mind Matters', description: 'Practical, evidence-based tips for stress, sleep, low mood and anxiety (NHS).', url: 'https://www.nhs.uk/every-mind-matters/', meta: 'NHS guide', category: 'Self-care' },
    { id: 'a4', title: 'NIMHANS Resources', description: "Information from India's National Institute of Mental Health and Neurosciences.", url: 'https://nimhans.ac.in/', meta: 'NIMHANS', category: 'India' }
  ],
  videos: [
    { id: 'v1', title: 'Breathing Exercises for Anxiety', description: 'Guided box breathing and 4-7-8 breathing to calm your nervous system.', url: 'https://www.youtube.com/results?search_query=guided+4-7-8+breathing+exercise', meta: '5–10 minutes', category: 'Anxiety' },
    { id: 'v2', title: 'Beginner Guided Meditation', description: 'Start a short daily meditation practice.', url: 'https://www.youtube.com/results?search_query=10+minute+guided+meditation+for+beginners', meta: '10–15 minutes', category: 'Meditation' },
    { id: 'v3', title: 'Sleep Wind-down', description: 'Body scan and relaxation exercises for better sleep.', url: 'https://www.youtube.com/results?search_query=body+scan+sleep+meditation', meta: '15–20 minutes', category: 'Sleep' }
  ],
  tools: [
    { id: 't1', title: 'Mood Tracker', description: 'Log your mood, stress and sleep and see your trends over time.', route: '/mood-dashboard', meta: 'In-app tool' },
    { id: 't2', title: 'Wellness Check-in', description: 'A one-minute check-in with personalised recommendations.', route: '/wellness-check', meta: 'In-app tool' },
    { id: 't3', title: 'AI Support Chat', description: 'Talk through what is on your mind, any time.', route: '/ai-chat', meta: 'In-app tool' },
    { id: 't4', title: 'Find a Professional', description: 'Get guidance on which kind of professional to see and where.', route: '/find-doctor', meta: 'In-app tool' }
  ],
  crisis: crisisHelplines
};
