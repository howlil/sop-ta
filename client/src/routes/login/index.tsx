import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { LoginPage } from '@/pages/login/LoginPage'
import { RouteErrorPage } from '@/shared/ui/route-error'
import { useAuthStore, ensureAuthHydrated, syncAuthFromCookie } from '@/app/stores/authStore'
import { redirectArgsFromAppPath, resolvePostLoginPath } from '@/shared/lib/role-routing'

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/login/')({
  validateSearch: loginSearchSchema,
  beforeLoad: async ({ search }) => {
    if (typeof window === 'undefined') {
      return;
    }
    await ensureAuthHydrated();
    await syncAuthFromCookie();
    const user = useAuthStore.getState().user;
    if (!user) {
      return;
    }
    const path = resolvePostLoginPath(search.redirect, user.peran);
    throw redirect(redirectArgsFromAppPath(path));
  },
  component: LoginPage,
  errorComponent: ({ error, reset }) => <RouteErrorPage error={error} reset={reset} />,
})