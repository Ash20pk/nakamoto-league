'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';

// Loading component to display while suspense is resolving
function ResetPasswordLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-md border border-gray-700">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-cyan-400">Reset Password</h1>
          <p className="mt-2 text-gray-400">Loading...</p>
        </div>
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
          <p className="text-gray-300">Preparing reset form...</p>
        </div>
      </div>
    </div>
  );
}

// Main reset password component
function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient<Database>();

  // Verify the reset token on page load
  useEffect(() => {
    const verifyToken = async () => {
      try {
        setIsVerifying(true);
        console.log("Starting token verification...");
        
        const code = searchParams?.get('code');
        const type = searchParams?.get('type');
        
        console.log("Code present:", !!code);
        console.log("Type:", type);
        
        if (!code) {
          console.log("No code found in URL");
          setError('Invalid or missing reset code');
          setIsVerifying(false);
          return;
        }

        // Directly set valid token for password recovery type
        if (type === 'recovery') {
          console.log("Recovery type detected, setting valid token");
          setIsValidToken(true);
          setIsVerifying(false);
          return;
        }
        
        // For other types, try to exchange the code
        console.log("Attempting to exchange code for session...");
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        console.log("Exchange complete", { success: !error, error });
        
        if (error) {
          console.error('Token verification error:', error);
          setError('Invalid or expired reset link. Please request a new one.');
          setIsVerifying(false);
          return;
        }
        
        console.log("Token verified successfully");
        setIsValidToken(true);
        setIsVerifying(false);
      } catch (err) {
        console.error('Error in token verification:', err);
        setError('Failed to verify reset link. Please try again.');
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [searchParams, supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');
    setDebugInfo(null);

    try {
      console.log("Starting password update process...");
      
      // First try to update password directly with Supabase
      console.log("Updating password with Supabase Auth...");
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: password
      });
      
      console.log("Supabase update result:", { success: !updateError, error: updateError, user: updateData?.user });
      
      if (updateError) {
        console.error("Supabase update error:", updateError);
        throw new Error(updateError.message);
      }
      
      // Also update the admin_users table password hash
      try {
        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.warn("Could not get current user, but password was updated in auth system");
        } else {
          console.log("Updating admin_users table password hash...");
          // Call the update_admin_password function
          const { error: adminError } = await supabase.rpc('update_admin_password', {
            p_user_id: user.id,
            p_password: password
          });
          
          if (adminError) {
            console.warn("Error updating admin_users table, but password was updated in auth system:", adminError);
          } else {
            console.log("Admin password hash updated successfully");
          }
        }
      } catch (adminErr) {
        console.warn("Error in admin password update, but auth password was updated:", adminErr);
      }
      
      // Password updated successfully in auth system
      console.log("Password updated successfully!");
      setMessage('Password updated successfully! Redirecting to login...');
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        router.push('/admin/login');
      }, 2000);
      
    } catch (err) {
      console.error("Password update error:", err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setDebugInfo(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-md border border-gray-700">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-cyan-400">Reset Password</h1>
          <p className="mt-2 text-gray-400">Create a new secure password</p>
        </div>

        {message && (
          <div className="p-4 bg-green-900/50 border border-green-700 rounded-md text-green-400">
            {message}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-900/50 border border-red-700 rounded-md text-red-400">
            {error}
            {debugInfo && (
              <pre className="mt-2 text-xs overflow-auto max-h-32">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            )}
          </div>
        )}

        {isVerifying ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
            <p className="text-gray-300">Verifying your reset link...</p>
          </div>
        ) : isValidToken ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 py-2 w-full bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-500 hover:text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-500 hover:text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-400 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10 py-2 w-full bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="Confirm your new password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 ${
                  isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>

            <div className="text-center text-sm">
              <Link href="/admin/login" className="text-cyan-400 hover:text-cyan-300">
                Return to login
              </Link>
            </div>
          </form>
        ) : (
          <div className="text-center py-8">
            <div className="text-red-400 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-red-400 mb-4">Invalid Reset Link</h2>
            <p className="text-gray-400 mb-6">
              This password reset link is invalid or has expired.
            </p>
            <Link
              href="/admin/forgot-password"
              className="inline-block px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md text-white"
            >
              Request New Link
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// Export the page component with Suspense boundary
export default function ResetPassword() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
