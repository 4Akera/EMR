"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/types/database";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardBody,
} from "@/components/ui";
import { User, Mail, Save, ArrowLeft, Shield } from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      setEmail(user.email || "");

      // Get profile from profiles table
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData as Profile);
        setDisplayName(profileData.displayName || "");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          displayName: displayName.trim(),
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { displayName: displayName.trim() }
      });

      if (authError) throw authError;

      setMessage({ type: "success", text: "Profile updated successfully!" });
      fetchProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "Failed to update profile" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="inline-block w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/patients")}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-surface-900">
            Profile Settings
          </h1>
          <p className="text-surface-600 text-sm mt-1">
            Manage your account information
          </p>
        </div>
      </div>

      {/* Success/Error Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Profile Information Card */}
      <Card>
        <CardHeader>
          <h2 className="section-title">
            <User className="w-5 h-5 text-primary-600" />
            Personal Information
          </h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Display Name */}
            <div>
              <Input
                label="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                required
                icon={<User className="w-4 h-4 text-surface-400" />}
              />
              <p className="text-xs text-surface-500 mt-1">
                This name will appear when you create or update records
              </p>
            </div>

            {/* Email (Read-only) */}
            <div>
              <Input
                label="Email"
                value={email}
                disabled
                icon={<Mail className="w-4 h-4 text-surface-400" />}
              />
              <p className="text-xs text-surface-500 mt-1">
                Email cannot be changed
              </p>
            </div>

            {/* Role (Read-only) */}
            {profile?.role && (
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Role
                </label>
                <div className="flex items-center gap-2 px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg">
                  <Shield className="w-4 h-4 text-surface-400" />
                  <span className="text-surface-700 capitalize">
                    {profile.role.toLowerCase()}
                  </span>
                </div>
                <p className="text-xs text-surface-500 mt-1">
                  Contact administrator to change your role
                </p>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                loading={isSaving}
                disabled={!displayName.trim()}
              >
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <h2 className="section-title">
            <Shield className="w-5 h-5 text-surface-600" />
            Account Information
          </h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-surface-100">
              <span className="text-surface-600">Account Created</span>
              <span className="font-medium text-surface-900">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString()
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-surface-100">
              <span className="text-surface-600">Last Updated</span>
              <span className="font-medium text-surface-900">
                {profile?.updatedAt
                  ? new Date(profile.updatedAt).toLocaleDateString()
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-surface-600">User ID</span>
              <span className="font-mono text-xs text-surface-500">
                {profile?.id.slice(0, 8)}...
              </span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

