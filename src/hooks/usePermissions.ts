import { useAuth } from '@/providers/AuthProvider';

export interface Permissions {
  // Creation permissions
  canCreateTournament: boolean;
  canCreateDojo: boolean;
  canCreateBattle: boolean;
  
  // Join permissions
  canJoinTournament: boolean;
  canJoinDojo: boolean;
  canJoinBattle: boolean;
  
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
      canCreateBattle: false,
      canJoinTournament: false,
      canJoinDojo: false,
      canJoinBattle: false,
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
    // Only dojos can create tournaments, dojos, and battles
    canCreateTournament: isDojo,
    canCreateDojo: isDojo,
    canCreateBattle: isDojo,
    
    // Warriors can join tournaments, dojos, and battles
    // Dojos can also join tournaments (for their warriors)
    canJoinTournament: isWarrior || isDojo,
    canJoinDojo: isWarrior,
    canJoinBattle: isWarrior,
    
    isWarrior,
    isDojo,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.loading
  };
}
