import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="paper-card max-w-md text-center p-10">
        <h1 className="font-display text-7xl text-primary">404</h1>
        <h2 className="mt-2 text-xl">這一頁從書裡走丟了</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          也許它跑去別的故事裡客串了。
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-5 py-2.5 hover:bg-primary/90"
        >
          回到書架
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="paper-card max-w-md text-center p-10">
        <h1 className="font-display text-3xl">這一頁的墨水暈開了</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-full bg-primary text-primary-foreground px-5 py-2 hover:bg-primary/90"
          >
            再試一次
          </button>
          <a href="/" className="rounded-full border border-border px-5 py-2 hover:bg-secondary">回首頁</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "故事接龍 — 一句話，接成一個世界" },
      { name: "description", content: "和大家輪流寫下一句話，一起把一個小開頭，接成完整的故事。" },
      { property: "og:title", content: "故事接龍 — 一句話，接成一個世界" },
      { property: "og:description", content: "和大家輪流寫下一句話，一起把一個小開頭，接成完整的故事。" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
