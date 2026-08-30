import { useEffect, useLayoutEffect, useRef } from "react";
import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, useAuth, useClerk } from "@clerk/react";
import { shadcn } from "@clerk/themes";

import { Show } from "@clerk/react";
import {
  getGetAviAccountQueryKey,
  getListOpenaiConversationsQueryKey,
  setAuthTokenGetter,
  useLinkAnonymousAviSession,
  useSyncAviAchievements,
  type AviAchievementState,
} from "@workspace/api-client-react";
import { loadAchievements } from "@/lib/achievements";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";
import ChatPage from "@/pages/chat";
import CustomerSupportPage from "@/pages/customer-support";

import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import PlusPage from "@/pages/plus";

const queryClient = new QueryClient();

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(276 51% 46%)",
    colorForeground: "hsl(276 50% 10%)",
    colorMutedForeground: "hsl(276 20% 40%)",
    colorDanger: "hsl(0 84% 60%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(276 20% 96%)",
    colorInputForeground: "hsl(276 50% 10%)",
    colorNeutral: "hsl(276 20% 90%)",
    fontFamily: "var(--app-font-sans)",
    borderRadius: "1rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl border border-[hsl(276,20%,90%)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[hsl(276,50%,10%)] font-bold",
    headerSubtitle: "text-[hsl(276,20%,40%)]",
    socialButtonsBlockButtonText: "text-[hsl(276,50%,10%)] font-medium",
    formFieldLabel: "text-[hsl(276,50%,10%)] font-bold",
    footerActionLink: "text-[hsl(276,51%,46%)] font-bold hover:opacity-80 transition-opacity",
    footerActionText: "text-[hsl(276,20%,40%)]",
    dividerText: "text-[hsl(276,20%,40%)]",
    identityPreviewEditButton: "text-[hsl(276,51%,46%)] font-bold",
    formFieldSuccessText: "text-[hsl(276,51%,46%)]",
    alertText: "text-[hsl(0,84%,60%)]",
    logoBox: "mb-4",
    logoImage: "w-24 h-24 mx-auto rounded-3xl shadow-sm border border-[hsl(276,20%,90%)]",
    socialButtonsBlockButton: "border border-[hsl(276,20%,90%)] bg-[hsl(0,0%,100%)] hover:bg-[hsl(276,20%,96%)] transition-colors rounded-xl",
    formButtonPrimary: "bg-[hsl(276,51%,46%)] hover:opacity-90 transition-opacity text-white rounded-xl shadow-sm",
    formFieldInput: "bg-[hsl(276,20%,96%)] border-[hsl(276,20%,90%)] text-[hsl(276,50%,10%)] rounded-xl focus:ring-2 focus:ring-[hsl(276,51%,46%)]",
    footerAction: "bg-transparent",
    dividerLine: "bg-[hsl(276,20%,90%)]",
    alert: "bg-red-50 border-red-200",
    otpCodeFieldInput: "border-[hsl(276,20%,90%)] bg-[hsl(276,20%,96%)] rounded-xl",
    formFieldRow: "gap-2",
    main: "flex flex-col gap-4",
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function ClerkApiAuthBridge() {
  const { getToken, isLoaded } = useAuth();

  useLayoutEffect(() => {
    if (!isLoaded) return;
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken, isLoaded]);

  return null;
}

function SyncAccount() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const linkAnonymous = useLinkAnonymousAviSession({
    mutation: {
      retry: 2,
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListOpenaiConversationsQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetAviAccountQueryKey(),
        });
      },
      onError: () => {
        toast({
          title: "Guest chats are not synced yet",
          description:
            "AVI retried automatically. Refresh your Plus page to try again.",
          variant: "destructive",
        });
      },
    },
  });
  const syncAchievements = useSyncAviAchievements({
    mutation: {
      retry: 2,
      onSuccess: ({ achievementState }) => {
        localStorage.setItem(
          "avi_achievements_v1",
          JSON.stringify(achievementState),
        );
        window.dispatchEvent(
          new CustomEvent<AviAchievementState>(
            "avi-achievements-hydrated",
            { detail: achievementState },
          ),
        );
        queryClient.invalidateQueries({
          queryKey: getGetAviAccountQueryKey(),
        });
      },
      onError: () => {
        toast({
          title: "Badge progress is not synced yet",
          description:
            "AVI retried automatically. Refresh your Plus page to try again.",
          variant: "destructive",
        });
      },
    },
  });

  useEffect(() => {
    linkAnonymous.mutate(undefined);

    const state = loadAchievements();
    syncAchievements.mutate({ data: { achievementState: state } });

    const syncChangedState = (event: Event) => {
      const achievementState = (event as CustomEvent<AviAchievementState>).detail;
      if (achievementState) {
        syncAchievements.mutate({ data: { achievementState } });
      }
    };
    window.addEventListener("avi-achievements-changed", syncChangedState);
    return () =>
      window.removeEventListener("avi-achievements-changed", syncChangedState);
  }, []);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to access your AVI Plus account",
          },
        },
        signUp: {
          start: {
            title: "Get AVI Plus",
            subtitle: "Create a free account to track your progress",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkApiAuthBridge />
        <ClerkQueryClientCacheInvalidator />
        <Show when="signed-in">
          <SyncAccount />
        </Show>
        <TooltipProvider>
          <Switch>
            <Route path="/" component={ChatPage} />
            <Route path="/customersupport" component={CustomerSupportPage} />

            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/plus" component={PlusPage} />

            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
