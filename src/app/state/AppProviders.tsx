import { type ReactNode } from "react";
import { AuthStateProvider } from "./auth/AuthStateContext";
import { CommunityProvider } from "./community/CommunityStateContext";
import { CoursesProvider } from "./courses/CoursesStateContext";
import { DashboardProvider } from "./dashboard/DashboardStateContext";
import { LessonsProvider } from "./lessons/LessonsStateContext";
import { NotificationsProvider } from "./notifications/NotificationsStateContext";
import { TutorProvider } from "./tutor/TutorStateContext";
import { UiProvider } from "./ui/UiStateContext";
import { InitialDomainDataBootstrap } from "./bootstrap/InitialDomainDataBootstrap.tsx";
import { DemoTimedEventsBootstrap } from "./bootstrap/DemoTimedEventsBootstrap.tsx";
import { StateHydrationBootstrap } from "./bootstrap/StateHydrationBootstrap.tsx";
import { StatePersistenceWriteback } from "./bootstrap/StatePersistenceWriteback.tsx";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthStateProvider>
      <NotificationsProvider>
        <CoursesProvider>
          <DashboardProvider>
            <CommunityProvider>
              <TutorProvider>
                <LessonsProvider>
                  <UiProvider>
                    <StateHydrationBootstrap />
                    <InitialDomainDataBootstrap />
                    <StatePersistenceWriteback />
                    <DemoTimedEventsBootstrap />
                    {children}
                  </UiProvider>
                </LessonsProvider>
              </TutorProvider>
            </CommunityProvider>
          </DashboardProvider>
        </CoursesProvider>
      </NotificationsProvider>
    </AuthStateProvider>
  );
}
