import React, { type ReactElement } from "react";
import {
  createBrowserRouter,
  createMemoryRouter,
  RouterProvider,
  type RouteObject,
} from "react-router-dom";
import { AppShell } from "./app-shell";
import { HomePage } from "../pages/home-page";

const routes: RouteObject[] = [
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
    ],
  },
];

let browserRouter: ReturnType<typeof createBrowserRouter> | null = null;

export function createAppRouter() {
  return createBrowserRouter(routes);
}

export function AppRouter() {
  browserRouter ??= createAppRouter();
  return <RouterProvider router={browserRouter} />;
}

export function createAppForTest(initialEntries: string[] = ["/"]): ReactElement {
  return <RouterProvider router={createMemoryRouter(routes, { initialEntries })} />;
}
