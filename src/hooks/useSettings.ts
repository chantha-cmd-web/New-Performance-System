import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface Criterion {
  id: number;
  kh: string;
  khDesc: string;
  en: string;
  desc: string;
  max: number;
}

export interface SelfEvalProfile {
  id: string;
  name: string;
  department: string;
  campus: string;
  position: string;
  category: string;
  evaluationType: string;
  evaluationPeriod: string;
  criteria: Criterion[];
}

export interface EvaluationType {
  id: string;
  label: string;
}

export interface WeightingScheme {
  id: string;
  label: string;
}

export interface EvaluationConfig {
  types: EvaluationType[];
  weightingSchemes: WeightingScheme[];
  criteriaSets: Record<string, Criterion[]>;
}

export function useSettings() {
  const [config, setConfig] = useState<EvaluationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const fetchSettings = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/settings/evaluation_config', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const saveSettings = async (newConfig: EvaluationConfig) => {
    try {
      const res = await fetch('/api/settings/evaluation_config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newConfig)
      });
      if (res.ok) {
        setConfig(newConfig);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  return { config, loading, saveSettings, refresh: fetchSettings };
}

export function useSelfEvalSettings() {
  const [profiles, setProfiles] = useState<SelfEvalProfile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const fetchProfiles = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/settings/self_eval_profiles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfiles(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [token]);

  const saveProfiles = async (newProfiles: SelfEvalProfile[]) => {
    try {
      const res = await fetch('/api/settings/self_eval_profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newProfiles)
      });
      if (res.ok) {
        setProfiles(newProfiles);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  return { profiles, loading, saveProfiles, refresh: fetchProfiles };
}
