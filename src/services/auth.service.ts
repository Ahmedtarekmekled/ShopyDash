import {
  supabase,
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  globalSignOut,
  resendVerificationEmail,
  forgotPassword as forgotPasswordHelper,
  resetPassword as resetPasswordHelper,
} from "@/lib/supabase";
import type { Profile, UserRole } from "@/types/database";

// ─── Email verification cutoff ─────────────────────────────────────────────
// Users created BEFORE this date are legacy and do not need email verification.
// Users created AFTER this date MUST verify their email before logging in.
export const EMAIL_VERIFICATION_REQUIRED_AFTER = "2026-03-05T00:00:00Z";

/** Check if a user needs email verification based on their creation date */
function requiresVerification(createdAt: string): boolean {
  return new Date(createdAt) > new Date(EMAIL_VERIFICATION_REQUIRED_AFTER);
}

export const authService = {
  async register(data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role?: UserRole;
  }): Promise<{
    user: Profile | null;
    error: Error | null;
    needsVerification?: boolean;
  }> {
    try {
      const normalizedEmail = data.email.trim().toLowerCase();

      const { data: authData, error: authError } = await signUp(
        normalizedEmail,
        data.password,
        data.fullName
      );

      if (authError) throw authError;
      if (!authData.user) throw new Error("فشل إنشاء الحساب");

      // If Supabase sent a confirmation email (email confirmation enabled),
      // the user's identities array will be empty until they confirm.
      // In that case, do NOT auto-login — return needsVerification.
      const identities = authData.user.identities;
      if (!identities || identities.length === 0) {
        // User already registered (duplicate signup attempt)
        throw new Error("البريد الإلكتروني مسجل بالفعل");
      }

      // If email confirmation is enabled, user won't have a session yet.
      // We should NOT auto-login — they need to verify first.
      if (!authData.session) {
        // Profile will be created by DB trigger when they eventually sign in.
        // But we can try to create/update the profile now for phone & role.
        await new Promise((resolve) => setTimeout(resolve, 500));

        const updates: { phone?: string; role?: UserRole } = {};
        if (data.phone) updates.phone = data.phone;
        if (data.role) updates.role = data.role;

        if (Object.keys(updates).length > 0) {
          await supabase
            .from("profiles")
            .update(updates)
            .eq("id", authData.user.id);
        }

        return { user: null, error: null, needsVerification: true };
      }

      // Session exists (email confirmation disabled or auto-confirmed)
      await new Promise((resolve) => setTimeout(resolve, 500));

      const updates: { phone?: string; role?: UserRole } = {};
      if (data.phone) updates.phone = data.phone;
      if (data.role) updates.role = data.role;

      if (Object.keys(updates).length > 0) {
        await supabase
          .from("profiles")
          .update(updates)
          .eq("id", authData.user.id);
      }

      const profile = await this.getProfile(authData.user.id);
      return { user: profile, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  },

  async login(
    email: string,
    password: string
  ): Promise<{ user: Profile | null; error: Error | null }> {
    try {
      const normalizedEmail = email.trim().toLowerCase();

      const { data: authData, error: authError } = await signIn(
        normalizedEmail,
        password
      );

      if (authError) throw authError;
      if (!authData.user) throw new Error("فشل تسجيل الدخول");

      // Check email verification for users created after the cutoff date
      const userCreatedAt = authData.user.created_at;
      const emailVerified = authData.user.email_confirmed_at;

      if (requiresVerification(userCreatedAt) && !emailVerified) {
        // Sign out immediately — unverified new user
        await signOut();
        return {
          user: null,
          error: new Error("EMAIL_NOT_VERIFIED"),
        };
      }

      // Simple profile fetch
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profile) {
        // Create profile if not exists
        const { data: newProfile } = await supabase
          .from("profiles")
          .insert({
            id: authData.user.id,
            email: authData.user.email || "",
            full_name:
              authData.user.user_metadata?.full_name ||
              authData.user.email?.split("@")[0] ||
              "User",
            role: "CUSTOMER",
          })
          .select()
          .single();

        return { user: newProfile || null, error: null };
      }

      return { user: profile, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  },

  async logout(): Promise<{ error: Error | null }> {
    const { error } = await signOut();
    return { error };
  },

  async logoutGlobal(): Promise<{ error: Error | null }> {
    const { error } = await globalSignOut();
    return { error };
  },

  async resendVerification(
    email: string
  ): Promise<{ error: Error | null }> {
    try {
      const { error } = await resendVerificationEmail(
        email.trim().toLowerCase()
      );
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },

  async forgotPassword(
    email: string
  ): Promise<{ error: Error | null }> {
    try {
      const { error } = await forgotPasswordHelper(
        email.trim().toLowerCase()
      );
      // Even if there's an error (user not found), return success
      // to prevent email enumeration attacks
      if (error) {
        console.error("Password reset error:", error.message);
      }
      return { error: null };
    } catch {
      // Always return success for anti-enumeration
      return { error: null };
    }
  },

  async resetPassword(
    newPassword: string
  ): Promise<{ error: Error | null }> {
    try {
      const { error } = await resetPasswordHelper(newPassword);
      if (error) throw error;

      // Force global sign out to invalidate all sessions
      await globalSignOut();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) return null;
    return data;
  },

  async updateProfile(
    userId: string,
    updates: Partial<Profile>
  ): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getCurrentProfile(): Promise<Profile | null> {
    const { user } = await getCurrentUser();
    if (!user) return null;
    return this.getProfile(user.id);
  },

  async checkRole(userId: string, allowedRoles: UserRole[]): Promise<boolean> {
    const profile = await this.getProfile(userId);
    if (!profile) return false;
    return allowedRoles.includes(profile.role);
  },
};

// Profile helpers
export const profileService = {
  async getAll(options?: {
    role?: UserRole;
    regionId?: string;
    search?: string;
  }): Promise<Profile[]> {
    let query = supabase.from("profiles").select("*");

    if (options?.role) {
      query = query.eq("role", options.role);
    }

    if (options?.regionId) {
      query = query.eq("region_id", options.regionId);
    }

    if (options?.search) {
      query = query.ilike("full_name", `%${options.search}%`);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;
    return data || [];
  },
};
