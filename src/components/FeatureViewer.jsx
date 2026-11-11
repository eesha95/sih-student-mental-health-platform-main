// components/FeatureViewer.jsx - page frame for every feature, inside the MindCare shell
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AppShell from './AppShell';
import { useAuth } from '../context/AuthContext';

const FeatureViewer = ({ title, subtitle, children, showBackButton = true, bare = false }) => {
  const navigate = useNavigate();
  const { admin } = useAuth();

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl mc-fade-up">
        {(title || showBackButton) && (
          <div className="mb-5">
            {showBackButton && !admin && (
              <button
                onClick={() => navigate('/dashboard')}
                className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition-colors hover:text-brand-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </button>
            )}
            {title && <h1 className="text-2xl font-semibold text-brand-950 sm:text-[28px]">{title}</h1>}
            {subtitle && <p className="mt-1 text-sm text-brand-500">{subtitle}</p>}
          </div>
        )}
        {bare ? children : <div className="mc-card p-5 sm:p-6">{children}</div>}
      </div>
    </AppShell>
  );
};

export default FeatureViewer;
