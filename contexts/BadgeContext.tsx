import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authenticatedGet } from "@/utils/api";

const LAST_SEEN_KEY = "kindly_last_seen_compliments_count";

interface BadgeContextType {
  homeBadgeCount: number;
  refreshBadge: () => Promise<void>;
  markHomeSeen: () => Promise<void>;
}

const BadgeContext = createContext<BadgeContextType | undefined>(undefined);

export function BadgeProvider({ children }: { children: ReactNode }) {
  const [homeBadgeCount, setHomeBadgeCount] = useState(0);

  const refreshBadge = useCallback(async () => {
    console.log("[Badge] Refreshing home badge count");
    try {
      const data = await authenticatedGet<any>("/api/compliments");
      const arr = Array.isArray(data) ? data : (data?.compliments || []);
      const currentCount: number = arr.length;

      const lastSeenStr = await AsyncStorage.getItem(LAST_SEEN_KEY);
      const lastSeen = lastSeenStr ? parseInt(lastSeenStr, 10) : 0;

      const diff = currentCount > lastSeen ? currentCount - lastSeen : 0;
      console.log("[Badge] currentCount:", currentCount, "lastSeen:", lastSeen, "badge:", diff);
      setHomeBadgeCount(diff);
    } catch (err) {
      console.log("[Badge] Error refreshing badge:", err);
    }
  }, []);

  const markHomeSeen = useCallback(async () => {
    console.log("[Badge] Marking home tab as seen");
    try {
      const data = await authenticatedGet<any>("/api/compliments");
      const arr = Array.isArray(data) ? data : (data?.compliments || []);
      const currentCount: number = arr.length;
      await AsyncStorage.setItem(LAST_SEEN_KEY, String(currentCount));
      setHomeBadgeCount(0);
      console.log("[Badge] Saved last seen count:", currentCount);
    } catch (err) {
      console.log("[Badge] Error marking home seen:", err);
      // Still clear the badge visually
      setHomeBadgeCount(0);
    }
  }, []);

  return (
    <BadgeContext.Provider value={{ homeBadgeCount, refreshBadge, markHomeSeen }}>
      {children}
    </BadgeContext.Provider>
  );
}

export function useBadge() {
  const context = useContext(BadgeContext);
  if (!context) throw new Error("useBadge must be used within BadgeProvider");
  return context;
}
