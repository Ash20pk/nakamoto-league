import { useAuth } from '@/providers/AuthProvider';

export interface Permissions {
  // Creation permissions
  canCreateTournament: boolean;
  canCreateDojo: boolean;
  
  // Join permissions
  canJoinTournament: boolean;
  canJoinDojo: boolean;
  
  // Account type
  isWarrior: boolean;
  isDojo: boolean;
  
  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function usePermissions(): Permissions {
  const { authState } = useAuth();
  
  // Default permissions when not authenticated or loading
  if (!authState.isAuthenticated || authState.loading) {
    return {
      canCreateTournament: false,
      canCreateDojo: false,
      canJoinTournament: false,
      canJoinDojo: false,
      isWarrior: false,
      isDojo: false,
      isAuthenticated: authState.isAuthenticated,
      isLoading: authState.loading
    };
  }
  
  // Determine permissions based on account type
  const isWarrior = authState.accountType === 'warrior';
  const isDojo = authState.accountType === 'dojo';
  
  return {
    // Only dojos can create tournaments and dojos
    canCreateTournament: isDojo,
    canCreateDojo: isDojo,
    // Warriors can join tournaments and dojos
    // Dojos can also join tournaments (for their warriors)
    canJoinTournament: isWarrior || isDojo,
    canJoinDojo: isWarrior,
    isWarrior,
    isDojo,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.loading
  };
}
