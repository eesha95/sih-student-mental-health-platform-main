// components/Signup.jsx
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthLayout, AuthField, AuthError, AuthButton } from './ui/AuthLayout';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated()) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from);
    }
  }, [isAuthenticated, navigate, location]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user starts typing
    if (error) setError('');
  };

  const validateForm = () => {
    // Check if all fields are filled
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return false;
    }

    // Validate name
    if (formData.name.trim().length < 2) {
      setError('Name must be at least 2 characters long');
      return false;
    }

    // Validate email format (basic check)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    // Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    // Password strength check (optional)
    if (formData.password.length < 8) {
      // Just a warning, not blocking
      console.warn('Password is short. Consider using a longer password for better security.');
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await signup(formData.email, formData.password, formData.name.trim());
      
      if (result.success) {
        // Redirect to dashboard after successful signup
        navigate('/dashboard');
      } else {
        setError(result.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError('An unexpected error occurred. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <AuthLayout heading="Create Your Account" subheading="Start your journey towards better mental health">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthError>{error}</AuthError>
        <AuthField icon={UserRound} name="name" placeholder="Full Name" autoComplete="name"
          value={formData.name} onChange={handleChange} required disabled={loading} />
        <AuthField icon={Mail} type="email" name="email" placeholder="Email Address" autoComplete="email"
          value={formData.email} onChange={handleChange} required disabled={loading} />
        <AuthField icon={Lock} type="password" name="password" placeholder="Password (at least 6 characters)" autoComplete="new-password"
          value={formData.password} onChange={handleChange} required disabled={loading} />
        <AuthField icon={Lock} type="password" name="confirmPassword" placeholder="Confirm Password" autoComplete="new-password"
          value={formData.confirmPassword} onChange={handleChange} required disabled={loading} />
        <AuthButton loading={loading} loadingText="Creating account...">Sign Up</AuthButton>
      </form>
      <p className="mt-6 text-center text-sm text-brand-500">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-900">Login</Link>
      </p>
    </AuthLayout>
  );
};

export default Signup;
