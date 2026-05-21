import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FonzoLogo } from "@/components/brand/logo";
import { LockKeyhole, MailCheck, ShieldCheck } from "lucide-react";

export default function AuthPage({ role = "customer", mode = "login" }: { role?: "customer" | "team"; mode?: "login" | "signup" }) {
  const [, navigate] = useLocation();
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState(role === "team" ? "ak514596@gmail.com" : "");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [previewOtp, setPreviewOtp] = useState("");
  const isTeam = role === "team";

  const requestOtp = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/request-otp", { email, name, role, mode });
      return (await res.json()) as { previewOtp: string; expiresAt: string };
    },
    onSuccess: (data) => {
      setPreviewOtp(data.previewOtp);
      setOtp(data.previewOtp);
      toast({ title: "OTP generated", description: "Preview mode shows the OTP on screen." });
    },
    onError: (e: any) => toast({ title: "Could not send OTP", description: e.message, variant: "destructive" }),
  });

  const verifyOtp = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/verify-otp", { email, otp, role, name });
      return (await res.json()) as { user: any; token: string };
    },
    onSuccess: (data) => {
      signIn(data.user, data.token);
      navigate(isTeam ? "/team" : "/");
    },
    onError: (e: any) => toast({ title: "OTP failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="mx-auto max-w-md px-4 py-12" data-testid={`page-auth-${role}`}>
      <div className="rounded-2xl border border-card-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-6">
          <FonzoLogo size={28} />
          <Badge variant={isTeam ? "default" : "outline"}>{isTeam ? "Team access" : mode === "signup" ? "Customer signup" : "Customer login"}</Badge>
        </div>

        <div className="mb-6">
          <div className="h-11 w-11 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center mb-3">
            {isTeam ? <ShieldCheck className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}
          </div>
          <h1 className="font-display text-2xl font-bold" data-testid="text-auth-title">
            {isTeam ? "Team portal login" : mode === "signup" ? "Create your Fonzo account" : "Login to Fonzo Tech"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Enter your email, generate an OTP, then verify it to continue. In this preview the OTP
            appears here; in production it would be sent to email or phone.
          </p>
        </div>

        <div className="space-y-4">
          {mode === "signup" && !isTeam && (
            <div>
              <Label htmlFor="auth-name">Name</Label>
              <Input id="auth-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" data-testid="input-auth-name" className="mt-1" />
            </div>
          )}
          <div>
            <Label htmlFor="auth-email">Email</Label>
            <Input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" data-testid="input-auth-email" className="mt-1" />
            {isTeam && <p className="text-xs text-muted-foreground mt-1">Preview team access is allowed for ak514596@gmail.com.</p>}
          </div>

          <Button type="button" className="w-full" variant="outline" disabled={!email || requestOtp.isPending} onClick={() => requestOtp.mutate()} data-testid="button-request-otp">
            <MailCheck className="h-4 w-4 mr-1.5" />
            {requestOtp.isPending ? "Generating OTP…" : "Send OTP"}
          </Button>

          {previewOtp && (
            <div className="rounded-lg border border-brand-accent/30 bg-brand-accent/10 p-3 text-sm" data-testid="box-preview-otp">
              <p className="font-semibold">Preview OTP: <span className="font-mono">{previewOtp}</span></p>
              <p className="text-xs text-muted-foreground mt-1">This is shown only because email/SMS is not connected yet.</p>
            </div>
          )}

          <div>
            <Label htmlFor="auth-otp">OTP code</Label>
            <Input id="auth-otp" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit OTP" data-testid="input-auth-otp" className="mt-1 font-mono" />
          </div>

          <Button type="button" className="w-full" disabled={!email || !otp || verifyOtp.isPending} onClick={() => verifyOtp.mutate()} data-testid="button-verify-otp">
            {verifyOtp.isPending ? "Verifying…" : isTeam ? "Access team portal" : "Continue"}
          </Button>
        </div>

        {!isTeam && (
          <div className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signup" ? (
              <>Already registered? <Link href="/login"><span className="text-foreground underline cursor-pointer">Login</span></Link></>
            ) : (
              <>New customer? <Link href="/signup"><span className="text-foreground underline cursor-pointer">Sign up</span></Link></>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
