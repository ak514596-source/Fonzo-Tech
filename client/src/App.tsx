import { Switch, Route, Router } from "wouter";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { CartProvider } from "@/lib/cart";
import { AuthProvider, useAuth } from "@/lib/auth";
import { SiteShell } from "@/components/layout/site-shell";
import { isPortalHost, portalUrl } from "@/lib/portal";

import HomePage from "@/pages/home";
import ShopPage from "@/pages/shop";
import ProductDetailPage from "@/pages/product-detail";
import CheckoutPage from "@/pages/checkout";
import AboutPage from "@/pages/about";
import ManagerPage from "@/pages/manager";
import TeamPortalPage from "@/pages/team";
import AuthPage from "@/pages/auth";
import NotFound from "@/pages/not-found";

function RequireTeam({ children }: { children: ReactNode }) {
  const { isTeam } = useAuth();
  return isTeam ? <>{children}</> : <AuthPage role="team" mode="login" />;
}

// On the customer domain, any old team/admin URL bounces to the portal subdomain.
function PortalRedirect() {
  useEffect(() => {
    window.location.href = portalUrl();
  }, []);
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-muted-foreground">
      Taking you to the Fonzo Tech team portal…
    </div>
  );
}

// Routes for portal.fonzotech.co.uk — the private team portal.
function PortalRouter() {
  return (
    <Switch>
      <Route path="/team/login">{() => <AuthPage role="team" mode="login" />}</Route>
      <Route path="/team/listings">{() => <RequireTeam><ManagerPage /></RequireTeam>}</Route>
      <Route path="/team/stock">{() => <RequireTeam><ManagerPage /></RequireTeam>}</Route>
      <Route path="/team">{() => <RequireTeam><TeamPortalPage /></RequireTeam>}</Route>
      <Route path="/manager">{() => <RequireTeam><ManagerPage /></RequireTeam>}</Route>
      <Route path="/admin">{() => <RequireTeam><ManagerPage /></RequireTeam>}</Route>
      <Route path="/stock">{() => <RequireTeam><ManagerPage /></RequireTeam>}</Route>
      <Route path="/inventory">{() => <RequireTeam><ManagerPage /></RequireTeam>}</Route>
      {/* Portal home, and a catch-all so customer URLs never render here. */}
      <Route>{() => <RequireTeam><TeamPortalPage /></RequireTeam>}</Route>
    </Switch>
  );
}

// Routes for fonzotech.co.uk — the public customer storefront.
function CustomerRouter() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/shop" component={ShopPage} />
      <Route path="/shop/:category" component={ShopPage} />
      <Route path="/product/:id" component={ProductDetailPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/login">{() => <AuthPage role="customer" mode="login" />}</Route>
      <Route path="/signup">{() => <AuthPage role="customer" mode="signup" />}</Route>
      {/* The team portal now lives on its own subdomain. */}
      <Route path="/team/login" component={PortalRedirect} />
      <Route path="/team/listings" component={PortalRedirect} />
      <Route path="/team/stock" component={PortalRedirect} />
      <Route path="/team" component={PortalRedirect} />
      <Route path="/manager" component={PortalRedirect} />
      <Route path="/admin" component={PortalRedirect} />
      <Route path="/stock" component={PortalRedirect} />
      <Route path="/inventory" component={PortalRedirect} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppRouter() {
  return isPortalHost() ? <PortalRouter /> : <CustomerRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <TooltipProvider>
              <Toaster />
              <Router hook={useHashLocation}>
                <SiteShell>
                  <AppRouter />
                </SiteShell>
              </Router>
            </TooltipProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
