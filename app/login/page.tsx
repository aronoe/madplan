"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit() {
    setLoading(true);
    setError("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setError(error.message);
      else router.push("/madplan");
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setError("Tjek din email for at bekræfte din konto");
    }

    setLoading(false);
  }

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
      <div
        style={{
          background: "white",
          borderRadius: 20,
          padding: 40,
          width: 360,
          boxShadow: "0 4px 24px rgba(0,100,50,.1)",
        }}
      >
        <div style={{ fontSize: 32, textAlign: "center", marginBottom: 8 }}>
          🥦
        </div>
        <h1
          style={{
            textAlign: "center",
            color: "#1a5c35",
            marginBottom: 24,
            fontSize: 22,
          }}
        >
          Madplan
        </h1>

        <div style={{ display: "grid", gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "2px solid #d4eddf",
              fontSize: 15,
              outline: "none",
            }}
          />
          <input
            type="password"
            placeholder="Adgangskode"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "2px solid #d4eddf",
              fontSize: 15,
              outline: "none",
            }}
          />

          {error && (
            <div
              style={{
                color: error.includes("Tjek") ? "#2d9b5e" : "#c0392b",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              background: "#4caf82",
              color: "white",
              border: "none",
              borderRadius: 10,
              padding: "12px 0",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "..." : mode === "login" ? "Log ind" : "Opret konto"}
          </button>

          <button
            onClick={() => setMode((m) => (m === "login" ? "signup" : "login"))}
            style={{
              background: "none",
              border: "none",
              color: "#4caf82",
              cursor: "pointer",
              fontSize: 13,
              textDecoration: "underline",
            }}
          >
            {mode === "login" ? "Opret ny konto" : "Jeg har allerede en konto"}
          </button>
        </div>
      </div>
    </div>
  );
}
