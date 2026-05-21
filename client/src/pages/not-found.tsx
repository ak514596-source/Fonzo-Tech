import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center" data-testid="page-not-found">
      <div className="h-14 w-14 rounded-full bg-muted mx-auto flex items-center justify-center">
        <Compass className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground mt-4">404</p>
      <h1 className="font-display text-3xl font-bold mt-2">We couldn't find that page</h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
        The link may be old or the device may have sold out. Try the shop or head back to fonzotech.co.uk.
      </p>
      <div className="flex gap-2 justify-center mt-6">
        <Link href="/">
          <Button variant="outline" data-testid="button-404-home">Back home</Button>
        </Link>
        <Link href="/shop">
          <Button data-testid="button-404-shop">Browse devices</Button>
        </Link>
      </div>
    </div>
  );
}
