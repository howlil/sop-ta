import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

const src = (path = '') => fileURLToPath(new URL(`./src/${path}`, import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      { find: '@/api/auth', replacement: src('features/auth/api.ts') },
      { find: '@/api/evaluasi', replacement: src('features/evaluation/index.ts') },
      { find: '@/api/evaluator-anggota', replacement: src('features/organization/api/evaluator-anggota.ts') },
      { find: '@/api/kepala-opd', replacement: src('features/organization/api/kepala-opd.ts') },
      { find: '@/api/notifications', replacement: src('features/notifications/api.ts') },
      { find: '@/api/opd', replacement: src('features/organization/api/opd.ts') },
      { find: '@/api/penyusun', replacement: src('features/organization/api/penyusun.ts') },
      { find: '@/api/peraturan', replacement: src('features/regulations/api.ts') },
      { find: '@/api/sop-client', replacement: src('features/sop/api/client.ts') },
      { find: '@/api/sop-mutations', replacement: src('features/sop/api/mutations.ts') },
      { find: '@/api/sop-public', replacement: src('features/sop/api/public.ts') },
      { find: '@/api/sop-queries', replacement: src('features/sop/api/queries.ts') },
      { find: '@/api/sop', replacement: src('features/sop/index.ts') },
      { find: '@/api/tte', replacement: src('features/tte/api.ts') },

      { find: '@/components/sop/sop-diagram', replacement: src('features/sop/diagram') },
      { find: '@/components/data', replacement: src('shared/data') },
      { find: '@/components/evaluasi', replacement: src('features/evaluation/ui') },
      { find: '@/components/forms', replacement: src('shared/forms/ui') },
      { find: '@/components/layout', replacement: src('app/layout') },
      { find: '@/components/organisasi', replacement: src('features/organization/ui') },
      { find: '@/components/pengajuan', replacement: src('features/submission/ui') },
      { find: '@/components/person', replacement: src('shared/person') },
      { find: '@/components/security', replacement: src('features/auth/ui') },
      { find: '@/components/sop', replacement: src('features/sop/ui') },
      { find: '@/components/status', replacement: src('shared/status/ui') },
      { find: '@/components/tte', replacement: src('features/tte/ui') },
      { find: '@/components/ui', replacement: src('shared/ui') },

      { find: '@/hooks/use-app-role', replacement: src('features/auth/hooks/use-app-role.ts') },
      { find: '@/hooks/use-debounced-value', replacement: src('shared/hooks/use-debounced-value.ts') },
      { find: '@/hooks/use-document-title', replacement: src('shared/hooks/use-document-title.ts') },
      { find: '@/hooks/use-in-app-notifications', replacement: src('features/notifications/hooks/use-in-app-notifications.ts') },
      { find: '@/hooks/use-mutation-with-toast', replacement: src('shared/hooks/use-mutation-with-toast.ts') },
      { find: '@/hooks/use-require-tte-setup', replacement: src('features/tte/hooks/use-require-tte-setup.ts') },
      { find: '@/hooks/use-sop-preview-diagram-state', replacement: src('features/sop/hooks/use-sop-preview-diagram-state.ts') },
      { find: '@/hooks/use-toast', replacement: src('shared/hooks/use-toast.ts') },
      { find: '@/hooks/useAppRole', replacement: src('features/auth/hooks/use-app-role.ts') },
      { find: '@/hooks/useMutationWithToast', replacement: src('shared/hooks/use-mutation-with-toast.ts') },
      { find: '@/hooks/useToast', replacement: src('shared/hooks/use-toast.ts') },

      { find: '@/lib/api', replacement: src('shared/api') },
      { find: '@/lib/evaluasi/hooks', replacement: src('features/evaluation/hooks') },
      { find: '@/lib/evaluasi', replacement: src('features/evaluation/model') },
      { find: '@/lib/forms', replacement: src('shared/forms/model') },
      { find: '@/lib/hydration', replacement: src('shared/hydration') },
      { find: '@/lib/notifications', replacement: src('features/notifications/model') },
      { find: '@/lib/pengajuan', replacement: src('features/submission/model') },
      { find: '@/lib/print', replacement: src('shared/print') },
      { find: '@/lib/sop', replacement: src('features/sop/model') },
      { find: '@/lib/status', replacement: src('shared/status/model') },
      { find: '@/lib/tte', replacement: src('features/tte/model') },

      { find: '@/utils', replacement: src('shared/lib') },
      { find: '@/config', replacement: src('app/config') },
      { find: '@/stores', replacement: src('app/stores') },
      { find: '@', replacement: src() },
    ],
  },
  plugins: [
    devtools(),
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})
