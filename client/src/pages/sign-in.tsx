import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, Eye } from "lucide-react";

// Pre-defined demo profiles for easy sign-in
const DEMO_PROFILES = [
  { name: "Sidd", email: "sidd@example.com", avatar: "S" },
  { name: "Alex", email: "alex@example.com", avatar: "A" },
  { name: "Jordan", email: "jordan@example.com", avatar: "J" },
];

export default function SignIn() {
  const { signIn, isLoading } = useAuth();
  const [customName, setCustomName] = useState("");
  const [customEmail, setCustomEmail] = useState("");

  const handleDemoSignIn = async (profile: typeof DEMO_PROFILES[0]) => {
    await signIn({
      googleId: `google-${profile.email}`,
      email: profile.email,
      displayName: profile.name,
      avatarUrl: undefined,
    });
  };

  const handleCustomSignIn = async () => {
    if (!customName.trim() || !customEmail.trim()) return;
    await signIn({
      googleId: `google-${customEmail.trim()}`,
      email: customEmail.trim(),
      displayName: customName.trim(),
      avatarUrl: undefined,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <svg
              width="44"
              height="44"
              viewBox="0 0 28 28"
              fill="none"
              aria-label="VitalVault logo"
            >
              <rect
                x="2"
                y="2"
                width="24"
                height="24"
                rx="6"
                stroke="currentColor"
                strokeWidth="2"
                className="text-primary"
              />
              <path
                d="M8 14L12 18L20 10"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">VitalVault</h1>
          <p className="text-sm text-muted-foreground">
            Your private health dashboard
          </p>
        </div>

        {/* Sign In Card */}
        <Card>
          <CardContent className="pt-6 space-y-5">
            {/* Google Sign-In button (simulated) */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium text-center">
                Quick sign in as a demo user
              </p>
              <div className="grid gap-2">
                {DEMO_PROFILES.map((profile) => (
                  <Button
                    key={profile.email}
                    variant="outline"
                    className="w-full justify-start gap-3"
                    onClick={() => handleDemoSignIn(profile)}
                    disabled={isLoading}
                    data-testid={`button-signin-${profile.name.toLowerCase()}`}
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                      {profile.avatar}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">{profile.name}</p>
                      <p className="text-xs text-muted-foreground">{profile.email}</p>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or sign in with your name</span>
              </div>
            </div>

            {/* Custom sign-in */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="name" className="text-xs">Display Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  data-testid="input-signin-name"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-xs">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  data-testid="input-signin-email"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCustomSignIn}
                disabled={isLoading || !customName.trim() || !customEmail.trim()}
                data-testid="button-signin-custom"
              >
                {isLoading ? "Signing in..." : "Sign In with Google"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Privacy info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span>End-to-end privacy</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              No tracking
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              No analytics
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
