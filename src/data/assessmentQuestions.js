// Wellness check-in questions. The ids must match WELLNESS_QUESTIONS in backend/main.py,
// which scores them (stress and anxiety are reverse-scored there).
export const wellnessQuestions = [
  {
    id: 'mood',
    question: 'How would you describe your overall mood today?',
    scale: [
      { value: 1, label: 'Very Low', emoji: '😢' },
      { value: 2, label: 'Low', emoji: '😞' },
      { value: 3, label: 'Neutral', emoji: '😐' },
      { value: 4, label: 'Good', emoji: '🙂' },
      { value: 5, label: 'Very Good', emoji: '😊' }
    ]
  },
  {
    id: 'energy',
    question: 'How are your energy levels?',
    scale: [
      { value: 1, label: 'Very Low', emoji: '🪫' },
      { value: 2, label: 'Low', emoji: '🔋' },
      { value: 3, label: 'Moderate', emoji: '🔋🔋' },
      { value: 4, label: 'High', emoji: '🔋🔋🔋' },
      { value: 5, label: 'Very High', emoji: '⚡' }
    ]
  },
  {
    id: 'sleep',
    question: 'How well did you sleep last night?',
    scale: [
      { value: 1, label: 'Very Poor', emoji: '😫' },
      { value: 2, label: 'Poor', emoji: '😴' },
      { value: 3, label: 'Average', emoji: '💤' },
      { value: 4, label: 'Good', emoji: '😌' },
      { value: 5, label: 'Excellent', emoji: '✨' }
    ]
  },
  {
    id: 'stress',
    question: 'What is your stress level right now?',
    scale: [
      { value: 1, label: 'No Stress', emoji: '😌' },
      { value: 2, label: 'Low Stress', emoji: '🙂' },
      { value: 3, label: 'Moderate', emoji: '😐' },
      { value: 4, label: 'High Stress', emoji: '😰' },
      { value: 5, label: 'Very High', emoji: '🤯' }
    ]
  },
  {
    id: 'anxiety',
    question: 'How anxious do you feel today?',
    scale: [
      { value: 1, label: 'Not at all', emoji: '😌' },
      { value: 2, label: 'A little', emoji: '🙂' },
      { value: 3, label: 'Somewhat', emoji: '😐' },
      { value: 4, label: 'Quite a bit', emoji: '😟' },
      { value: 5, label: 'Extremely', emoji: '😨' }
    ]
  },
  {
    id: 'social',
    question: 'How connected do you feel to others?',
    scale: [
      { value: 1, label: 'Very Isolated', emoji: '😔' },
      { value: 2, label: 'Somewhat Lonely', emoji: '😞' },
      { value: 3, label: 'Neutral', emoji: '😐' },
      { value: 4, label: 'Connected', emoji: '🙂' },
      { value: 5, label: 'Very Connected', emoji: '😊' }
    ]
  },
  {
    id: 'coping',
    question: 'How well are you managing daily challenges?',
    scale: [
      { value: 1, label: 'Very Poorly', emoji: '😣' },
      { value: 2, label: 'Poorly', emoji: '😞' },
      { value: 3, label: 'Managing', emoji: '😐' },
      { value: 4, label: 'Well', emoji: '🙂' },
      { value: 5, label: 'Very Well', emoji: '💪' }
    ]
  },
  {
    id: 'motivation',
    question: 'How motivated do you feel for daily activities?',
    scale: [
      { value: 1, label: 'No Motivation', emoji: '😴' },
      { value: 2, label: 'Low', emoji: '😞' },
      { value: 3, label: 'Some', emoji: '😐' },
      { value: 4, label: 'Motivated', emoji: '🙂' },
      { value: 5, label: 'Very Motivated', emoji: '🚀' }
    ]
  }
];

export const scoreEmoji = (score) =>
  score >= 4 ? '😊' : score >= 3 ? '🙂' : score >= 2 ? '😐' : '😔';
