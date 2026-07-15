import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { Home } from "./pages/Home";
import { SearchPage } from "./pages/Search";
import { PhotoDetail } from "./pages/PhotoDetail";
import { Collections } from "./pages/Collections";
import { Requests } from "./pages/Requests";
import { Pricing } from "./pages/Pricing";
import { Dashboard } from "./pages/Dashboard";
import { Enterprise } from "./pages/Enterprise";
import { Contribute } from "./pages/Contribute";
import { PhotographerProfile } from "./pages/PhotographerProfile";
import { Account } from "./pages/Account";
import { Admin } from "./pages/Admin";
import { NotFound } from "./pages/NotFound";
import { SignIn } from "./pages/auth/SignIn";
import { SignUp } from "./pages/auth/SignUp";
import { ForgotPassword } from "./pages/auth/ForgotPassword";
import { GuestRoute, AuthRoute, AdminRoute, PhotographerRoute, EnterpriseRoute } from "./components/RouteGuards";
import { ErrorBoundary } from "./components/ErrorBoundary";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, Component: Home },
      { path: "search", Component: SearchPage },
      { path: "photo/:id", Component: PhotoDetail },
      { path: "photographer/:id", Component: PhotographerProfile },
      { path: "collections", Component: Collections },
      { path: "requests", Component: Requests },
      { path: "pricing", Component: Pricing },
      { path: "contribute", Component: Contribute },
      {
        path: "signin",
        Component: GuestRoute,
        children: [{ index: true, Component: SignIn }],
      },
      {
        path: "signup",
        Component: GuestRoute,
        children: [{ index: true, Component: SignUp }],
      },
      {
        path: "forgot-password",
        Component: GuestRoute,
        children: [{ index: true, Component: ForgotPassword }],
      },
      {
        path: "account",
        Component: AuthRoute,
        children: [{ index: true, Component: Account }],
      },
      {
        path: "dashboard",
        Component: PhotographerRoute,
        children: [{ index: true, Component: Dashboard }],
      },
      {
        path: "enterprise",
        Component: EnterpriseRoute,
        children: [{ index: true, Component: Enterprise }],
      },
      {
        path: "admin",
        Component: AdminRoute,
        children: [{ index: true, Component: Admin }],
      },
      { path: "*", Component: NotFound },
    ],
  },
]);