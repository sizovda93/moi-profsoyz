"use client";

import { useState, useEffect } from "react";
import { User } from "@/types";
import { useRouter } from "next/navigation";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          const u = data.user;
          setUser({
            id: u.id,
            role: u.role,
            fullName: u.fullName,
            email: u.email,
            phone: u.phone || "",
            avatar: u.avatarUrl || undefined,
            status: u.status,
            createdAt: "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  };

  return { user, loading, logout };
}
