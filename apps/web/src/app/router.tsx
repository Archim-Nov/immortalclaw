import React, { type ReactElement, lazy, Suspense } from "react";
import {
  createBrowserRouter,
  createMemoryRouter,
  RouterProvider,
  type RouteObject,
} from "react-router-dom";
import { AppShell } from "./app-shell";
import { HomePage } from "../pages/home-page";

const PlayerStatPage = lazy(() =>
  import("../pages/player-stat-page").then((m) => ({ default: m.PlayerStatPage })),
);

export const appRoutes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      {
        path: "/",
        element: <HomePage />,
      },
      {
        path: "/dashboard",
        element: <HomePage />,
      },
      {
        path: "/stat/:agentId",
        element: (
          <Suspense fallback={null}>
            <PlayerStatPage />
          </Suspense>
        ),
      },
    ],
  },
];

let browserRouter: ReturnType<typeof createBrowserRouter> | null = null;

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}

export function AppRouter() {
  browserRouter ??= createAppRouter();
  return <RouterProvider router={browserRouter} />;
}

export function createAppForTest(initialEntries: string[] = ["/"]): ReactElement {
  return <RouterProvider router={createMemoryRouter(appRoutes, { initialEntries })} />;
}
