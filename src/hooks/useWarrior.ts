// src/hooks/useWarrior.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import type { WarriorSpecialty } from '@/lib/database.types';

interface Warrior {
  id: string;
  name: string;
  avatar_url: string | null;
  power_level: number;
  rank: number;
  specialty: WarriorSpecialty;
  dojo_id: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  dojos?: {
    id: string;
    name: string;
  } | null;
  owner?: {
    username: string;
    avatar_url: string | null;
  };
  metadata?: {
    bio?: string;
    socialLinks?: {
      github?: string;
      twitter?: string;
      website?: string;
    }
  };
}

interface WarriorFilters {
  search?: string;
  specialty?: WarriorSpecialty;
  sortBy?: 'rank' | 'powerLevel' | 'winRate';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

interface WarriorList {
  warriors: Warrior[];
  count: number;
}

interface WarriorFormData {
  name: string;
  specialty: WarriorSpecialty;
  bio?: string;
  socialLinks?: {
    github?: string;
    twitter?: string;
    website?: string;
  };
}

export function useWarrior() {
  const { authState } = useAuth();
  const [loadingWarriors, setLoadingWarriors] = useState(false);
  const [loadingSingleWarrior, setLoadingSingleWarrior] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warriors, setWarriors] = useState<Warrior[]>([]);
  const [warriorCount, setWarriorCount] = useState(0);
  const [currentWarrior, setCurrentWarrior] = useState<Warrior | null>(null);

  // Fetch a list of warriors
  const fetchWarriors = useCallback(async (filters: WarriorFilters = {}) => {
    setLoadingWarriors(true);
    setError(null);

    try {
      // Build query string from filters
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.specialty) params.append('specialty', filters.specialty);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const response = await fetch(`/api/warriors?${params.toString()}`);
      
      if (!response.ok) {
        // Handle non-200 responses
        const errorData = await response.json();
        throw new Error(errorData.error || `Error fetching warriors: ${response.status}`);
      }
      
      const data = await response.json();
      setWarriors(data.warriors);
      setWarriorCount(data.count);
      return data as WarriorList;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      return { warriors: [], count: 0 };
    } finally {
      setLoadingWarriors(false);
    }
  }, []);

  // Fetch a single warrior by ID
  const fetchWarrior = useCallback(async (id: string) => {
    setLoadingSingleWarrior(true);
    setError(null);

    try {
      const response = await fetch(`/api/warriors/${id}`);
      
      if (!response.ok) {
        // Handle non-200 responses
        const errorData = await response.json();
        throw new Error(errorData.error || `Error fetching warrior: ${response.status}`);
      }
      
      const data = await response.json();
      setCurrentWarrior(data);
      return data as Warrior;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      return null;
    } finally {
      setLoadingSingleWarrior(false);
    }
  }, []);

  // Create a new warrior
  const createWarrior = async (formData: WarriorFormData) => {
    setCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/warriors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        // Handle non-200 responses
        const errorData = await response.json();
        throw new Error(errorData.error || `Error creating warrior: ${response.status}`);
      }
      
      const data = await response.json();
      return data as Warrior;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      return null;
    } finally {
      setCreating(false);
    }
  };

  // Update a warrior
  const updateWarrior = async (id: string, formData: Partial<WarriorFormData>) => {
    setUpdating(true);
    setError(null);

    try {
      const response = await fetch(`/api/warriors/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        // Handle non-200 responses
        const errorData = await response.json();
        throw new Error(errorData.error || `Error updating warrior: ${response.status}`);
      }
      
      const data = await response.json();
      setCurrentWarrior(data);
      return data as Warrior;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      return null;
    } finally {
      setUpdating(false);
    }
  };

  // Upload a warrior avatar
  const uploadAvatar = async (id: string, file: File) => {
    setUploadingAvatar(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`/api/warriors/${id}/avatar`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        // Handle non-200 responses
        const errorData = await response.json();
        throw new Error(errorData.error || `Error uploading avatar: ${response.status}`);
      }
      
      const data = await response.json();

      // Update the current warrior with the new avatar URL
      if (currentWarrior) {
        setCurrentWarrior({
          ...currentWarrior,
          avatar_url: data.avatar_url
        });
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Join or leave a dojo
  const joinDojo = async (warriorId: string, dojoId: string) => {
    setUpdating(true);
    setError(null);

    try {
      const response = await fetch(`/api/warriors/${warriorId}/dojo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ dojoId })
      });

      if (!response.ok) {
        // Handle non-200 responses
        const errorData = await response.json();
        throw new Error(errorData.error || `Error joining dojo: ${response.status}`);
      }
      
      const data = await response.json();

      // Update the current warrior with the new dojo
      if (currentWarrior) {
        setCurrentWarrior({
          ...currentWarrior,
          dojo_id: dojoId
        });
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      return null;
    } finally {
      setUpdating(false);
    }
  };

  const leaveDojo = async (warriorId: string) => {
    setUpdating(true);
    setError(null);

    try {
      const response = await fetch(`/api/warriors/${warriorId}/dojo`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        // Handle non-200 responses
        const errorData = await response.json();
        throw new Error(errorData.error || `Error leaving dojo: ${response.status}`);
      }
      
      const data = await response.json();

      // Update the current warrior with no dojo
      if (currentWarrior) {
        setCurrentWarrior({
          ...currentWarrior,
          dojo_id: null
        });
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      return null;
    } finally {
      setUpdating(false);
    }
  };

  // Check if the authenticated user has a warrior
  useEffect(() => {
    const checkWarrior = async () => {
      if (authState.user && !authState.warrior && !authState.loading) {
        try {
          const response = await fetch(`/api/user/warrior`);
          
          // If the response is 404, it just means the user doesn't have a warrior yet
          // No need to log an error
          if (response.status === 404) {
            console.log('User does not have a warrior yet');
            return;
          }
          
          if (!response.ok) {
            console.error(`Error checking warrior: ${response.status}`);
            return;
          }
          
          const data = await response.json();
          // This would typically update the auth state
          // but that's handled by your AuthProvider
          console.log('Found user warrior:', data);
        } catch (err) {
          console.error('Error checking for warrior:', err);
        }
      }
    };

    checkWarrior();
  }, [authState.user, authState.warrior, authState.loading]);

  return {
    warriors,
    warriorCount,
    currentWarrior,
    loadingWarriors,
    loadingSingleWarrior,
    creating,
    updating,
    uploadingAvatar,
    error,
    fetchWarriors,
    fetchWarrior,
    createWarrior,
    updateWarrior,
    uploadAvatar,
    joinDojo,
    leaveDojo
  };
}