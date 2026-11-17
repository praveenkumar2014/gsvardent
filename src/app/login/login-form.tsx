"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

const emailSchema = z.string().trim().email("Enter a valid email address.");

const errorMessages: Record<string, string> = {
  missing_code: "The sign-in link is incomplete. Request a new one.",
  callback_failed: "The sign-in link could not be verified. Request a new one."
};

type LoginFormProps = {
  setupRequired: boolean;
  initialError: string;
};

export function LoginForm({ setupRequired, initialError }: LoginFormProps) {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(errorMessages[initialError] ?? "");
  const [sent, setSent] = useState(false);

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setError("");

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your email address.");
      return;
    }

    if (!configured) {
      setError("Authentication is not connected yet. Add the Supabase project URL and publishable key to the deployment environment.");
      return;
    }

    setBusy("email");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: parsed.data,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (authError) throw authError;
      setSent(true);
      setNotice("Check your inbox. Use the secure sign-in link sent by Supabase.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to send the sign-in link.");
    } finally {
      setBusy(null);
    }
  }

  async function signInWithGoogle() {
    setNotice("");
    setError("");
    if (!configured) {
      setError("Authentication is not connected yet. Configure Supabase first.");
      return;
    }

    setBusy("google");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      });
      if (authError) throw authError;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Google sign-in is unavailable.");
      setBusy(null);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story">
        <a className="brand brand-large" href="/" aria-label="Verdent home">
          <span className="brand-mark">V</span>
          <span>verdent</span>
        </a>
        <div className="story-copy">
          <div className="eyebrow"><span className="status-dot" /> YOUR AI ENGINEERING WORKSPACE</div>
          <h1>From idea<br />to <span>real work.</span></h1>
          <p className="story-lead">Plan with clarity. Build with control. Review every step.</p>
          <div className="story-points">
            <div><span className="point-icon">01</span><span>Turn a prompt into an actionable plan</span></div>
            <div><span className="point-icon">02</span><span>Coordinate agents in a controlled workspace</span></div>
            <div><span className="point-icon">03</span><span>Review changes before anything ships</span></div>
          </div>
        </div>
        <div className="story-footer"><span>VERDENT PLATFORM</span><span>BUILT FOR HUMAN DIRECTION</span></div>
      </section>

      <section className="auth-side">
        <div className="auth-card">
          <div className="mobile-brand brand">
            <span className="brand-mark">V</span><span>verdent</span>
          </div>
          <div className="auth-heading">
            <span className="auth-kicker">WELCOME BACK</span>
            <h2>Sign in to Verdent</h2>
            <p>Use your work email to access your workspace.</p>
          </div>

          {setupRequired && (
            <div className="notice notice-warning" role="status">
              <strong>Authentication setup is pending.</strong>
              <span>The app is connected to GitHub, but no Supabase project credentials have been configured for sign-in.</span>
            </div>
          )}
          {!configured && !setupRequired && (
            <div className="notice notice-warning" role="status">
              Supabase authentication has not been configured yet.
            </div>
          )}
          {error && <div className="notice notice-error" role="alert">{error}</div>}
          {notice && <div className="notice notice-success" role="status">{notice}</div>}

          <form onSubmit={sendMagicLink} className="auth-form">
            <label htmlFor="email">Work email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <button className="primary-button" type="submit" disabled={!configured || busy !== null}>
              {busy === "email" ? "Sending secure link…" : sent ? "Send another sign-in link" : "Continue with email"}
              <span aria-hidden="true">↗</span>
            </button>
          </form>

          <div className="auth-divider"><span>OR</span></div>
          <button className="secondary-button" type="button" onClick={signInWithGoogle} disabled={!configured || busy !== null}>
            <span className="google-g" aria-hidden="true">G</span>
            {busy === "google" ? "Connecting…" : "Continue with Google"}
          </button>

          <p className="auth-terms">By continuing, you agree to use Verdent in accordance with your workspace policies.</p>
          <div className="auth-bottom"><span>Secure workspace access</span><span className="lock-mark">◆</span></div>
        </div>
      </section>
    </main>
  );
}
