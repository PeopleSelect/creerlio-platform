"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export type BusinessAccess = {
  id: string;
  name: string;
  role: string;
};

export type LocationAccess = {
  id: string;
  business_id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  role: string;
};

type BusinessContextValue = {
  businesses: BusinessAccess[];
  locations: LocationAccess[];
  activeBusinessId: string | null;
  activeLocationId: string | null;
  setBusinesses: (items: BusinessAccess[]) => void;
  setLocations: (items: LocationAccess[]) => void;
  setActiveBusinessId: (id: string | null) => void;
  setActiveLocationId: (id: string | null) => void;
};

const BusinessContext = createContext<BusinessContextValue | null>(null);

const ACTIVE_BUSINESS_KEY = "creerlio_active_business_id";
const ACTIVE_LOCATION_KEY = "creerlio_active_location_id";

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [businesses, setBusinesses] = useState<BusinessAccess[]>([]);
  const [locations, setLocations] = useState<LocationAccess[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(null);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedBusiness = window.localStorage.getItem(ACTIVE_BUSINESS_KEY);
      const storedLocation = window.localStorage.getItem(ACTIVE_LOCATION_KEY);
      if (storedBusiness) setActiveBusinessId(storedBusiness);
      if (storedLocation) setActiveLocationId(storedLocation);
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadPreferences = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) {
        if (!cancelled) setPrefsLoaded(true);
        return;
      }
      const { data } = await supabase
        .from("user_preferences")
        .select("active_business_id, active_location_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data?.active_business_id) setActiveBusinessId(String(data.active_business_id));
      if (data?.active_location_id) setActiveLocationId(String(data.active_location_id));
      setPrefsLoaded(true);
    };
    loadPreferences();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      if (activeBusinessId) {
        window.localStorage.setItem(ACTIVE_BUSINESS_KEY, activeBusinessId);
      } else {
        window.localStorage.removeItem(ACTIVE_BUSINESS_KEY);
      }
      if (activeLocationId) {
        window.localStorage.setItem(ACTIVE_LOCATION_KEY, activeLocationId);
      } else {
        window.localStorage.removeItem(ACTIVE_LOCATION_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, [activeBusinessId, activeLocationId]);

  useEffect(() => {
    if (!prefsLoaded) return;
    const savePreferences = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) return;
      await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          active_business_id: activeBusinessId,
          active_location_id: activeLocationId,
          updated_at: new Date().toISOString(),
        });
    };
    savePreferences().catch(() => {});
  }, [activeBusinessId, activeLocationId, prefsLoaded]);

  const value = useMemo(
    () => ({
      businesses,
      locations,
      activeBusinessId,
      activeLocationId,
      setBusinesses,
      setLocations,
      setActiveBusinessId,
      setActiveLocationId,
    }),
    [businesses, locations, activeBusinessId, activeLocationId]
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusinessContext() {
  const ctx = useContext(BusinessContext);
  if (!ctx) {
    throw new Error("useBusinessContext must be used within BusinessProvider");
  }
  return ctx;
}
