"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { createFamily, joinFamily, getUserFamily } from "@/lib/queries";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const family = await getUserFamily(user.id);
      if (family?.family_id) router.push("/madplan");
    }
    check();
  }, []);

  async function handleCreate() {
    setLoading(true);
    setError("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Ikke logget ind");
      await createFamily(user.id, familyName.trim());
      router.push("/madplan");
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handleJoin() {
    setLoading(true);
    setError("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Ikke logget ind");
      await joinFamily(user.id, inviteCode.trim(), displayName.trim());
      router.push("/madplan");
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  const cardStyle = {
    background: "white",
    borderRadius: 20,
    padding: 40,
    width: 400,
    boxShadow: "0 4px 24px rgba(0,100,50,.1)",
  };

  const inputStyle = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "2px solid #d4eddf",
    fontSize: 15,
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  };

  const btnPrimary = {
    background: "#4caf82",
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "12px 0",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
    opacity: loading ? 0.7 : 1,
  };

  const btnSecondary = {
    background: "#f0fdf6",
    color: "#2d9b5e",
    border: "none",
    borderRadius: 10,
    padding: "12px 0",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f0faf4",
        fontFamily: "sans-serif",
      }}
    >
      <div style={cardStyle}>
        <div style={{ fontSize: 32, textAlign: "center", marginBottom: 8 }}>
          🥦
        </div>
        <h1
          style={{
            textAlign: "center",
            color: "#1a5c35",
            marginBottom: 6,
            fontSize: 22,
          }}
        >
          Velkommen til Madplan
        </h1>

        {mode === "choose" && (
          <>
            <p
              style={{
                textAlign: "center",
                color: "#7aad8a",
                marginBottom: 28,
                fontSize: 14,
              }}
            >
              Kom i gang ved at oprette en familie eller tilmeld dig en
              eksisterende
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              <button style={btnPrimary} onClick={() => setMode("create")}>
                🏠 Opret en familie
              </button>
              <button style={btnSecondary} onClick={() => setMode("join")}>
                🔗 Tilmeld med invite-kode
              </button>
            </div>
          </>
        )}

        {mode === "create" && (
          <>
            <p
              style={{
                textAlign: "center",
                color: "#7aad8a",
                marginBottom: 24,
                fontSize: 14,
              }}
            >
              Giv jeres familie et navn
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              <input
                style={inputStyle}
                placeholder="Fx Familien Hansen"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
              {error && (
                <div style={{ color: "#c0392b", fontSize: 13 }}>{error}</div>
              )}
              <button
                style={btnPrimary}
                onClick={handleCreate}
                disabled={loading || !familyName.trim()}
              >
                {loading ? "..." : "Opret familie"}
              </button>
              <button style={btnSecondary} onClick={() => setMode("choose")}>
                ← Tilbage
              </button>
            </div>
          </>
        )}

        {mode === "join" && (
          <>
            <p
              style={{
                textAlign: "center",
                color: "#7aad8a",
                marginBottom: 24,
                fontSize: 14,
              }}
            >
              Indtast invite-koden du har fået af din familie
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              <input
                style={inputStyle}
                placeholder="Dit navn"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoFocus
              />
              <input
                style={inputStyle}
                placeholder="Invite-kode (fx a1b2c3d4)"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
              {error && (
                <div style={{ color: "#c0392b", fontSize: 13 }}>{error}</div>
              )}
              <button
                style={btnPrimary}
                onClick={handleJoin}
                disabled={loading || !inviteCode.trim() || !displayName.trim()}
              >
                {loading ? "..." : "Tilmeld familie"}
              </button>
              <button style={btnSecondary} onClick={() => setMode("choose")}>
                ← Tilbage
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
