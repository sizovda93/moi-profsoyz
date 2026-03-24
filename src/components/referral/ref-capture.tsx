"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const REF_COOKIE = "ref_code";
const REF_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export function RefCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref || ref.length > 16) return;

    const code = ref.toUpperCase();

    // Save to cookie (30 days)
    document.cookie = `${REF_COOKIE}=${code};path=/;max-age=${REF_MAX_AGE};SameSite=Lax`;

    // Track click
    fetch("/api/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refCode: code }),
    }).catch(() => {});
  }, [searchParams]);

  return null;
}
