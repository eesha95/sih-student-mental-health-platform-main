// components/feature-files/crisis-help-feature.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FeatureViewer from '../FeatureViewer';

const CrisisHelpFeature = () => {
  const navigate = useNavigate();
  const [selectedCrisisType, setSelectedCrisisType] = useState('');
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [activeSection, setActiveSection] = useState('immediate');

  // Crisis hotlines and resources
  const crisisResources = {
    suicide: {
      title: 'Suicide Prevention',
      icon: '🆘',
      color: 'red',
      hotlines: [
        {
          name: 'Tele-MANAS (Govt. of India)',
          number: '14416',
          description: '24/7 free and confidential tele-counselling, 20+ languages',
          available: '24/7'
        },
        {
          name: 'KIRAN Mental Health Helpline',
          number: '1800-599-0019',
          description: 'Free national helpline for distress and suicidal thoughts',
          available: '24/7'
        },
        {
          name: 'AASRA',
          number: '+91-9820466726',
          description: 'Suicide prevention and emotional support',
          available: '24/7'
        }
      ],
      immediateSteps: [
        'Call Tele-MANAS (14416) or KIRAN (1800-599-0019) now',
        'Remove any means of self-harm',
        'Stay with someone you trust',
        'Go to the nearest emergency room'
      ]
    },
    anxiety: {
      title: 'Anxiety/Panic Attacks',
      icon: '😰',
      color: 'yellow',
      hotlines: [
        {
          name: 'Tele-MANAS (Govt. of India)',
          number: '14416',
          description: 'Talk to a trained counsellor right now',
          available: '24/7'
        },
        {
          name: 'Vandrevala Foundation',
          number: '+91-9999666555',
          description: 'Free counselling by phone or WhatsApp',
          available: '24/7'
        }
      ],
      immediateSteps: [
        'Practice deep breathing (4-7-8 technique)',
        'Ground yourself with 5-4-3-2-1 technique',
        'Call a trusted friend or family member',
        'Use a calming app or guided meditation'
      ]
    },
    abuse: {
      title: 'Domestic Violence/Abuse',
      icon: '🛡️',
      color: 'purple',
      hotlines: [
        {
          name: 'Women Helpline',
          number: '181',
          description: 'Support for women facing violence or abuse',
          available: '24/7'
        },
        {
          name: 'Childline (under 18)',
          number: '1098',
          description: 'Help for children and young people in distress',
          available: '24/7'
        }
      ],
      immediateSteps: [
        'Get to a safe location immediately',
        'Call 112 if in immediate danger',
        'Contact the Women Helpline (181)',
        'Reach out to trusted friends or family'
      ]
    },
    substance: {
      title: 'Substance Abuse Crisis',
      icon: '⚠️',
      color: 'orange',
      hotlines: [
        {
          name: 'National Drug De-addiction Helpline',
          number: '14446',
          description: 'Govt. of India helpline for substance use support',
          available: '24/7'
        }
      ],
      immediateSteps: [
        'Call the de-addiction helpline (14446) for support',
        'Remove substances from your environment',
        'Contact your healthcare provider',
        'Ask someone to stay with you'
      ]
    },
    eating: {
      title: 'Eating Disorder Crisis',
      icon: '🍽️',
      color: 'pink',
      hotlines: [
        {
          name: 'Tele-MANAS (Govt. of India)',
          number: '14416',
          description: 'Counselling and referral for eating concerns',
          available: '24/7'
        }
      ],
      immediateSteps: [
        'Call Tele-MANAS (14416) for support and referral',
        'Reach out to your treatment team',
        'Use distraction techniques',
        'Contact a trusted support person'
      ]
    }
  };

  // Immediate coping techniques
  const copingTechniques = [
    {
      title: '4-7-8 Breathing',
      description: 'Inhale for 4, hold for 7, exhale for 8',
      icon: '🫁',
      steps: [
        'Sit comfortably and place tongue against roof of mouth',
        'Inhale quietly through nose for 4 counts',
        'Hold your breath for 7 counts',
        'Exhale through mouth for 8 counts',
        'Repeat 3-4 times'
      ]
    },
    {
      title: '5-4-3-2-1 Grounding',
      description: 'Use your senses to ground yourself',
      icon: '🌟',
      steps: [
        'Name 5 things you can see',
        'Name 4 things you can touch',
        'Name 3 things you can hear',
        'Name 2 things you can smell',
        'Name 1 thing you can taste'
      ]
    },
    {
      title: 'Progressive Muscle Relaxation',
      description: 'Tense and release muscle groups',
      icon: '💪',
      steps: [
        'Start with your toes, tense for 5 seconds',
        'Release and notice the relaxation',
        'Move up to calves, thighs, etc.',
        'Work your way up to your head',
        'End by relaxing your entire body'
      ]
    }
  ];

  const emergencyServices = [
    {
      service: 'Emergency Services',
      number: '112',
      when: 'Immediate danger or medical emergency',
      icon: '🚨'
    },
    {
      service: 'Tele-MANAS (Govt. of India)',
      number: '14416',
      when: 'Mental health crisis or suicidal thoughts',
      icon: '📞'
    },
    {
      service: 'KIRAN Mental Health Helpline',
      number: '1800-599-0019',
      when: 'Distress, anxiety or depression',
      icon: '💬'
    }
  ];

  const handleNavigateToDashboard = () => {
    navigate('/dashboard');
  };

  const handleNavigateToResources = () => {
    navigate('/resources');
  };

  const handleEmergencyCall = (number) => {
    if (number === '112') {
      setShowEmergencyModal(true);
    } else {
      window.open(`tel:${number}`);
    }
  };

  const CrisisResourceCard = ({ type, resource }) => (
    <div className={`border-2 border-${resource.color}-200 rounded-lg p-4 mb-4`}>
      <div className="flex items-center mb-3">
        <span className="text-2xl mr-3">{resource.icon}</span>
        <h4 className="font-semibold text-gray-800">{resource.title}</h4>
      </div>

      <div className="mb-4">
        <h5 className="font-medium text-gray-700 mb-2">Immediate Steps:</h5>
        <ul className="text-sm text-gray-600 space-y-1">
          {resource.immediateSteps.map((step, index) => (
            <li key={index} className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              {step}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h5 className="font-medium text-gray-700 mb-2">Crisis Hotlines:</h5>
        {resource.hotlines.map((hotline, index) => (
          <div key={index} className={`bg-${resource.color}-50 p-3 rounded-lg mb-2`}>
            <div className="flex justify-between items-start mb-1">
              <div className="font-medium text-gray-800">{hotline.name}</div>
              <button
                onClick={() => handleEmergencyCall(hotline.number.replace(/[^+\d]/g, ''))}
                className={`bg-${resource.color}-600 hover:bg-${resource.color}-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors`}
              >
                Call Now
              </button>
            </div>
            <div className={`text-${resource.color}-800 font-mono text-sm`}>{hotline.number}</div>
            <div className="text-sm text-gray-600">{hotline.description}</div>
            <div className="text-xs text-gray-500">Available: {hotline.available}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const CopingTechniqueCard = ({ technique }) => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center mb-3">
        <span className="text-2xl mr-3">{technique.icon}</span>
        <div>
          <h4 className="font-semibold text-blue-900">{technique.title}</h4>
          <p className="text-sm text-blue-700">{technique.description}</p>
        </div>
      </div>
      <ol className="text-sm text-blue-800 space-y-1">
        {technique.steps.map((step, index) => (
          <li key={index} className="flex items-start">
            <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );

  return (
    <FeatureViewer title="Crisis Support & Emergency Help">
      {/* Emergency Alert Banner */}
      <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <span className="text-2xl mr-3">🚨</span>
          <div className="flex-1">
            <h3 className="font-bold text-red-900">In Immediate Danger?</h3>
            <p className="text-red-800 text-sm">If you or someone else is in immediate danger, call emergency services right away.</p>
          </div>
          <button
            onClick={() => handleEmergencyCall('112')}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold text-lg transition-colors"
          >
            Call 112
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2">
          <button
            onClick={handleNavigateToDashboard}
            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
          >
            <span>🏠</span>
            <span>Home</span>
          </button>
          <button
            onClick={handleNavigateToResources}
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
          >
            <span>📚</span>
            <span>Resources</span>
          </button>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'immediate', label: 'Immediate Help', icon: '🆘' },
          { id: 'coping', label: 'Coping Techniques', icon: '🧘' },
          { id: 'resources', label: 'Crisis Resources', icon: '📞' }
        ].map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors flex items-center justify-center space-x-2 ${
              activeSection === section.id
                ? 'bg-white text-red-600 shadow'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <span>{section.icon}</span>
            <span>{section.label}</span>
          </button>
        ))}
      </div>

      {/* Immediate Help Section */}
      {activeSection === 'immediate' && (
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Immediate Emergency Contacts</h3>
          
          <div className="grid gap-4 mb-6">
            {emergencyServices.map((service, index) => (
              <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{service.icon}</span>
                    <div>
                      <h4 className="font-semibold text-gray-800">{service.service}</h4>
                      <p className="text-sm text-gray-600">{service.when}</p>
                      <p className="font-mono text-red-700 font-medium">{service.number}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEmergencyCall(service.number.replace(/[^+\d]/g, ''))}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Call Now
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Crisis Type Selection */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-3">Select Your Crisis Type for Specific Help:</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(crisisResources).map(([key, resource]) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedCrisisType(key);
                    setActiveSection('resources');
                  }}
                  className={`p-3 rounded-lg border-2 transition-all flex items-center space-x-2 ${
                    selectedCrisisType === key
                      ? `border-${resource.color}-500 bg-${resource.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span>{resource.icon}</span>
                  <span className="text-sm font-medium">{resource.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Coping Techniques Section */}
      {activeSection === 'coping' && (
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Immediate Coping Techniques</h3>
          <p className="text-gray-600 mb-6">
            These techniques can help you manage acute distress while you seek additional support.
          </p>
          
          <div className="grid gap-4 md:grid-cols-2">
            {copingTechniques.map((technique, index) => (
              <CopingTechniqueCard key={index} technique={technique} />
            ))}
          </div>

          {/* Additional Quick Tips */}
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-3">Quick Distress Management Tips</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Splash cold water on your face or hold ice cubes</li>
              <li>• Listen to calming music or nature sounds</li>
              <li>• Call or text a trusted friend or family member</li>
              <li>• Write down your feelings in a journal</li>
              <li>• Practice gentle movement like stretching or walking</li>
              <li>• Use a mental health app for guided support</li>
            </ul>
          </div>
        </div>
      )}

      {/* Crisis Resources Section */}
      {activeSection === 'resources' && (
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Crisis-Specific Resources</h3>
          
          {selectedCrisisType ? (
            <div>
              <button
                onClick={() => setSelectedCrisisType('')}
                className="text-blue-600 hover:text-blue-700 mb-4"
              >
                ← Back to all resources
              </button>
              <CrisisResourceCard 
                type={selectedCrisisType} 
                resource={crisisResources[selectedCrisisType]} 
              />
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-6">
                Select a crisis type below to get specific resources and immediate action steps.
              </p>
              
              <div className="grid gap-4">
                {Object.entries(crisisResources).map(([key, resource]) => (
                  <div key={key} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{resource.icon}</span>
                        <div>
                          <h4 className="font-semibold text-gray-800">{resource.title}</h4>
                          <p className="text-sm text-gray-600">
                            {resource.hotlines.length} hotline{resource.hotlines.length !== 1 ? 's' : ''} available
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedCrisisType(key)}
                        className={`bg-${resource.color}-600 hover:bg-${resource.color}-700 text-white px-4 py-2 rounded-lg font-medium transition-colors`}
                      >
                        Get Help
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Emergency Call Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-4xl mb-4">🚨</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Call Emergency Services?
              </h3>
              <p className="text-gray-600 text-sm mb-6">
                This will open your phone's dialer to call 112. Only call if you or someone else is in immediate danger.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    window.open('tel:112');
                    setShowEmergencyModal(false);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium transition-colors"
                >
                  Yes, Call 112
                </button>
                <button
                  onClick={() => setShowEmergencyModal(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Important Notice */}
      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2">Important Notice</h4>
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            <strong>This is not a substitute for professional emergency services.</strong> If you are having thoughts of suicide, 
            experiencing severe mental health crisis, or are in immediate danger, please call 112 or go to your nearest emergency room.
          </p>
          <p>
            All crisis hotlines are staffed by trained professionals and are free and confidential. 
            Don't hesitate to reach out for help - you deserve support.
          </p>
          <p>
            <strong>Remember:</strong> Crisis situations are temporary. Help is available, and you are not alone.
          </p>
        </div>
      </div>
    </FeatureViewer>
  );
};

export default CrisisHelpFeature;