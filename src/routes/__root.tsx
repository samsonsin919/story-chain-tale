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
import { MobileTabBar } from "@/components/MobileTabBar";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="cinema-card max-w-md text-center p-10">
        <h1 className="font-cinematic text-6xl text-gradient text-glow">404</h1>
        <h2 className="mt-3 text-xl">這條時間線並不存在</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          也許它已經分裂到另一個宇宙了。
        </p>
        <Link to="/" className="btn-neon mt-6">回到主時間線</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="cinema-card max-w-md text-center p-10">
        <h1 className="font-display text-3xl text-gradient">劇情中斷</h1>
        <p className="mt-2 text-sm text-muted-foreground break-words">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="btn-neon !py-2"
          >
            再試一次
          </button>
          <a href="/" className="btn-ghost !py-2">回首頁</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0b0a14" },
      { title: "午夜故事宇宙 — 一句話，分裂出無數結局" },
      { name: "description", content: "和陌生人即時接龍創作戲劇宇宙：懸疑、恐怖、戀愛、科幻、都市傳說。每一段，都可能改寫整個結局。" },
      { property: "og:title", content: "午夜故事宇宙" },
      { property: "og:description", content: "一群人即時共同創作的不可預測 Netflix 劇集。" },
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
    <html lang="zh-Hant" className="dark">
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
        <div className="relative z-[2] pb-20 sm:pb-0">
          <Outlet />
        </div>
        <MobileTabBar />
        <Toaster position="top-center" theme="dark" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
