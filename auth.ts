import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

type MicrosoftProfile = {
  email?: string | null;
  preferred_username?: string | null;
  upn?: string | null;
};

function getProfileEmail(profile: unknown) {
  const microsoftProfile = profile as MicrosoftProfile | null | undefined;

  return microsoftProfile?.email ?? microsoftProfile?.preferred_username ?? microsoftProfile?.upn;
}

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID ?? "",
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_SECRET ?? "",
      tenantId: process.env.AUTH_MICROSOFT_ENTRA_TENANT_ID ?? "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET,
  callbacks: {
    jwt({ token, profile, user }) {
      token.email = user?.email ?? getProfileEmail(profile) ?? token.email;

      return token;
    },
  },
};
