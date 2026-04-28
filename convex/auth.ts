import Resend from '@auth/core/providers/resend';
import { convexAuth } from '@convex-dev/auth/server';

const resend = Resend({
  apiKey: process.env.AUTH_RESEND_API_KEY,
  from: process.env.AUTH_EMAIL_FROM ?? 'AIRio <noreply@ai.rio.br>',
});

const useMock =
  process.env.AUTH_EMAIL_MOCK === '1' ||
  process.env.CONVEX_DEPLOYMENT?.startsWith('anonymous:') === true;

const emailProvider = {
  ...resend,
  async sendVerificationRequest(
    ...args: Parameters<typeof resend.sendVerificationRequest>
  ): Promise<void> {
    const [{ identifier, url, expires }] = args;
    if (useMock) {
      console.log(
        [
          '[auth mock] Magic link',
          `email: ${identifier}`,
          `url: ${url}`,
          `expires: ${expires.toISOString()}`,
        ].join('\n')
      );
      return;
    }
    await resend.sendVerificationRequest(...args);
  },
};

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [emailProvider],
  callbacks: {
    async createOrUpdateUser(ctx, { existingUserId, profile }) {
      if (existingUserId) return existingUserId;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = ctx.db as any;
      return await db.insert('users', {
        email: profile.email ?? '',
        name: profile.name ?? undefined,
        freeUsedThisMonth: 0,
        lastFreeReset: Date.now(),
      });
    },
    async redirect({ redirectTo }) {
      const base = process.env.AUTH_REDIRECT_BASE_URL ?? 'http://localhost:3000';
      if (redirectTo.startsWith('/') || redirectTo.startsWith('?')) return `${base}${redirectTo}`;
      if (redirectTo.startsWith(base)) return redirectTo;
      throw new Error(`Invalid redirectTo: ${redirectTo}`);
    },
  },
});
