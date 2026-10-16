"use client";

import { useEffect } from "react";
import { markEventsSeen } from "../actions";

/** Mounted on the events list: once it is open, the badge only counts newer alerts. */
export function MarkEventsSeen() {
  useEffect(() => {
    void markEventsSeen().catch(() => undefined);
  }, []);
  return null;
}
