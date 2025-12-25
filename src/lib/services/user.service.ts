import type { User } from "@supabase/supabase-js";
import type { SupabaseServerClient } from "@/db/supabase.client";
import type { UserProfileVM } from "@/types";

interface SessionWithProfileResult {
  session: Awaited<ReturnType<SupabaseServerClient["auth"]["getSession"]>>["data"]["session"] | null;
  userProfile: UserProfileVM | null;
}

const buildDefaultName = (user: User) => {
  if (user.user_metadata?.name) return String(user.user_metadata.name);

  const email = user.email ?? "";
  if (email.includes("@")) {
    return email.split("@")[0];
  }

  return user.id;
};

const mapUserToProfile = (user: User): UserProfileVM => ({
  id: user.id,
  name: buildDefaultName(user),
  email: user.email ?? user.id,
  avatarUrl:
    typeof user.user_metadata?.avatarUrl === "string"
      ? user.user_metadata.avatarUrl
      : typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : undefined,
});

export async function getServerSessionWithProfile(supabase: SupabaseServerClient): Promise<SessionWithProfileResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { session: null, userProfile: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { session, userProfile: null };
  }

  return {
    session,
    userProfile: mapUserToProfile(user),
  };
}
