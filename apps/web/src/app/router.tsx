import React, { type ReactElement } from "react";
import {
  createBrowserRouter,
  createMemoryRouter,
  RouterProvider,
  type RouteObject,
} from "react-router-dom";
import { AppShell } from "./app-shell";
import { HomePage } from "../pages/home-page";
import { PlayerStatPage } from "../pages/player-stat-page";

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
        element: <PlayerStatPage />,
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
