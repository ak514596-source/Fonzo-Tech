import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CONDITIONS,
  insertProductSchema,
  type Product,
  type InsertProduct,
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  PackageX,
  PackageCheck,
  PackageSearch,
  Star,
  Layers,
  AlertTriangle,
  Minus,
  PoundSterling,
} from "lucide-react";
import { ProductVisual } from "@/components/brand/product-visual";
import { formatPrice } from "@/lib/format";

const VISUAL_KEYS = ["phone", "laptop", "tablet", "vr", "speaker", "accessory"] as const;

const defaultValues: InsertProduct = {
  title: "",
  category: "iPhone",
  brand: "",
  model: "",
  condition: "Brand New",
  storage: "",
  color: "",
  price: 0,
  originalPrice: undefined,
  stock: 0,
  rating: 4.8,
  reviewCount: 0,
  shortDescription: "",
  description: "",
  featured: false,
  imageUrl: "",
  visualKey: "phone",
};

export default function ManagerPage() {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStock, setFilterStock] = useState<string>("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const filtered = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.model.toLowerCase().includes(q),
      );
    }
    if (filterCategory !== "all") list = list.filter((p) => p.category === filterCategory);
    if (filterStock === "in") list = list.filter((p) => p.stock > 3);
    if (filterStock === "low") list = list.filter((p) => p.stock > 0 && p.stock <= 3);
    if (filterStock === "out") list = list.filter((p) => p.stock === 0);
    if (filterStock === "featured-low") list = list.filter((p) => p.featured && p.stock <= 3);
    return list;
  }, [products, search, filterCategory, filterStock]);

  const stats = useMemo(() => {
    const totalUnits = products.reduce((s, p) => s + p.stock, 0);
    const inventoryValue = products.reduce((s, p) => s + p.stock * p.price, 0);
    const featured = products.filter((p) => p.featured).length;
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 3).length;
    const outOfStock = products.filter((p) => p.stock === 0).length;
    return { total: products.length, totalUnits, inventoryValue, featured, lowStock, outOfStock };
  }, [products]);

  const lowStockProducts = useMemo(
    () =>
      products
        .filter((p) => p.stock <= 3)
        .sort((a, b) => a.stock - b.stock || a.title.localeCompare(b.title))
        .slice(0, 6),
    [products],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12" data-testid="page-manager">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-brand-accent mb-1">Internal · Fonzo Tech</p>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight" data-testid="text-manager-title">
            Listings & stock manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Add products, manage stock quantities and spot low-inventory devices before they sell
            out on fonzotech.co.uk. Changes are saved instantly to the SQLite store.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-open-create">
              <Plus className="h-4 w-4 mr-1.5" /> Add product
            </Button>
          </DialogTrigger>
          <ProductFormDialog
            mode="create"
            initial={defaultValues}
            onClose={() => setCreateOpen(false)}
          />
        </Dialog>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard icon={Layers} label="Total listings" value={stats.total.toString()} testid="stat-total" />
        <StatCard icon={PackageCheck} label="Total units" value={stats.totalUnits.toString()} testid="stat-units" />
        <StatCard icon={PoundSterling} label="Stock value" value={formatPrice(stats.inventoryValue)} testid="stat-stock-value" tone="brand" />
        <StatCard icon={Star} label="Featured" value={stats.featured.toString()} testid="stat-featured" tone="brand" />
        <StatCard
          icon={stats.outOfStock ? PackageX : AlertTriangle}
          label={stats.outOfStock ? "Out of stock" : "Low stock"}
          value={(stats.outOfStock || stats.lowStock).toString()}
          testid="stat-stock-alerts"
          tone={stats.outOfStock || stats.lowStock ? "destructive" : undefined}
        />
      </div>

      <div className="grid lg:grid-cols-[1.25fr_0.75fr] gap-4 mb-6">
        <div className="rounded-xl border border-card-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-brand-accent">Stock listing</p>
              <h2 className="font-display text-lg font-semibold mt-1" data-testid="text-stock-listing-title">
                Inventory control for live products
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Use the stock filter, quantity box, and +/- buttons below to update what customers
                can buy. Products at 0 show as sold out on the store.
              </p>
            </div>
            <PackageSearch className="h-5 w-5 text-brand-accent shrink-0" />
          </div>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Needs attention</p>
              <p className="text-sm font-semibold">Low / out-of-stock items</p>
            </div>
            <Badge variant={lowStockProducts.length ? "destructive" : "secondary"} data-testid="badge-low-stock-count">
              {lowStockProducts.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="state-stock-healthy">
                All stock levels are healthy.
              </p>
            ) : (
              lowStockProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 text-sm" data-testid={`alert-stock-${p.id}`}>
                  <span className="truncate">{p.title}</span>
                  <Badge variant={p.stock === 0 ? "destructive" : "outline"} className={p.stock > 0 ? "text-amber-600 dark:text-amber-400" : undefined}>
                    {p.stock === 0 ? "Out" : `${p.stock} left`}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, brand or model"
            className="pl-9"
            data-testid="input-manager-search"
            type="search"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {PRODUCT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStock} onValueChange={setFilterStock}>
          <SelectTrigger className="w-full sm:w-52" data-testid="select-filter-stock">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stock</SelectItem>
            <SelectItem value="in">In stock</SelectItem>
            <SelectItem value="low">Low stock</SelectItem>
            <SelectItem value="out">Out of stock</SelectItem>
            <SelectItem value="featured-low">Featured low/out</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-card-border bg-card overflow-x-auto">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock listing</TableHead>
              <TableHead className="text-center">Featured</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8" data-testid="state-no-products">
                  No products match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <ManagerRow key={p.id} product={p} onEdit={() => setEditing(p)} />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit dialog */}
      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <ProductFormDialog
            mode="edit"
            initial={editing}
            onClose={() => setEditing(null)}
          />
        </Dialog>
      )}
    </div>
  );
}

function ManagerRow({ product, onEdit }: { product: Product; onEdit: () => void }) {
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async (patch: Partial<Product>) => {
      const res = await apiRequest("PATCH", `/api/products/${product.id}`, patch);
      return (await res.json()) as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/products/${product.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product deleted", description: product.title });
    },
    onError: (e: any) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const stockBadge =
    product.stock === 0 ? (
      <Badge variant="destructive" data-testid={`row-stock-${product.id}`}>Out</Badge>
    ) : product.stock <= 3 ? (
      <Badge variant="outline" className="text-amber-600 dark:text-amber-400" data-testid={`row-stock-${product.id}`}>Low · {product.stock}</Badge>
    ) : (
      <Badge variant="secondary" data-testid={`row-stock-${product.id}`}>{product.stock}</Badge>
    );

  return (
    <TableRow data-testid={`row-product-${product.id}`} className="hover-elevate">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-10 shrink-0">
            <ProductVisual product={product} />
          </div>
          <div className="min-w-0">
            <p className="font-medium leading-tight truncate" data-testid={`row-title-${product.id}`}>{product.title}</p>
            <p className="text-xs text-muted-foreground">{product.brand} · {product.model}</p>
          </div>
        </div>
      </TableCell>
      <TableCell><Badge variant="outline">{product.category}</Badge></TableCell>
      <TableCell className="text-sm">{product.condition}</TableCell>
      <TableCell className="text-right tabular-nums font-medium">{formatPrice(product.price)}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={updateMutation.isPending || product.stock === 0}
            onClick={() => updateMutation.mutate({ stock: Math.max(0, product.stock - 1) })}
            data-testid={`button-stock-minus-${product.id}`}
            aria-label={`Reduce stock for ${product.title}`}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <input
            type="number"
            min={0}
            defaultValue={product.stock}
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v) && v !== product.stock) updateMutation.mutate({ stock: v });
            }}
            className="w-16 h-8 rounded-md border border-input bg-background px-2 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
            data-testid={`input-stock-${product.id}`}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={updateMutation.isPending}
            onClick={() => updateMutation.mutate({ stock: product.stock + 1 })}
            data-testid={`button-stock-plus-${product.id}`}
            aria-label={`Increase stock for ${product.title}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          {stockBadge}
        </div>
      </TableCell>
      <TableCell className="text-center">
        <Switch
          checked={product.featured}
          onCheckedChange={(v) => updateMutation.mutate({ featured: v })}
          data-testid={`switch-featured-${product.id}`}
          aria-label="Featured"
        />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            data-testid={`button-edit-${product.id}`}
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid={`button-delete-${product.id}`}
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this product?</AlertDialogTitle>
                <AlertDialogDescription>
                  "{product.title}" will be permanently removed from fonzotech.co.uk and the SQLite store.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid={`button-cancel-delete-${product.id}`}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  data-testid={`button-confirm-delete-${product.id}`}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

function ProductFormDialog({
  mode,
  initial,
  onClose,
}: {
  mode: "create" | "edit";
  initial: Product | InsertProduct;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const isEdit = mode === "edit";
  const productId = isEdit ? (initial as Product).id : null;

  const form = useForm<any>({
    resolver: zodResolver(insertProductSchema as any),
    defaultValues: {
      ...defaultValues,
      ...(initial as any),
      // Normalize null -> undefined for optional fields
      originalPrice: (initial as any).originalPrice ?? undefined,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: InsertProduct) => {
      // Strip empty originalPrice
      const payload: any = { ...values };
      if (payload.originalPrice === "" || payload.originalPrice === undefined || payload.originalPrice === null) {
        delete payload.originalPrice;
      }
      const url = isEdit ? `/api/products/${productId}` : "/api/products";
      const method = isEdit ? "PATCH" : "POST";
      const res = await apiRequest(method, url, payload);
      return (await res.json()) as Product;
    },
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: isEdit ? "Product updated" : "Product added",
        description: p.title,
      });
      onClose();
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle data-testid="text-form-title">
          {isEdit ? `Edit ${(initial as Product).title}` : "Add new product"}
        </DialogTitle>
        <DialogDescription>
          Fields with * are required. Values are validated against the shared Zod schema before saving.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="grid sm:grid-cols-2 gap-4"
        >
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Title *</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-form-title" placeholder="iPhone 15 Pro Max" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-form-category"><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="condition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Condition *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-form-condition"><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PRODUCT_CONDITIONS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand *</FormLabel>
                <FormControl><Input {...field} data-testid="input-form-brand" placeholder="Apple" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model *</FormLabel>
                <FormControl><Input {...field} data-testid="input-form-model" placeholder="A2849" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="storage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Storage / Spec</FormLabel>
                <FormControl><Input {...field} data-testid="input-form-storage" placeholder="256GB" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Colour</FormLabel>
                <FormControl><Input {...field} data-testid="input-form-color" placeholder="Natural Titanium" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (£) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    data-testid="input-form-price"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="originalPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Original price (£)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      field.onChange(v === "" ? undefined : Number(v));
                    }}
                    data-testid="input-form-original-price"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stock quantity *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    data-testid="input-form-stock"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Product image</FormLabel>
                <div className="grid sm:grid-cols-[1fr_1fr] gap-3">
                  <FormControl>
                    <Input
                      value={field.value || ""}
                      onChange={field.onChange}
                      data-testid="input-form-image-url"
                      placeholder="Paste image URL, or upload a photo"
                    />
                  </FormControl>
                  <Input
                    type="file"
                    accept="image/*"
                    data-testid="input-form-image-file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        form.setValue("imageUrl", String(reader.result), {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Uploaded images are saved with the listing for this preview. They will appear on
                  the customer shop and product page.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="visualKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Visual placeholder</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "phone"}>
                  <FormControl>
                    <SelectTrigger data-testid="select-form-visual"><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {VISUAL_KEYS.map((k) => (
                      <SelectItem key={k} value={k}>{k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="shortDescription"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Short description</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-form-short-description" maxLength={280} placeholder="One-line tagline shown on cards" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea rows={4} {...field} data-testid="input-form-description" placeholder="Long-form details for the product page" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="featured"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3 sm:col-span-2 rounded-lg border border-card-border bg-card p-3">
                <FormControl>
                  <Switch
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                    data-testid="switch-form-featured"
                  />
                </FormControl>
                <div>
                  <FormLabel>Featured on storefront</FormLabel>
                  <p className="text-xs text-muted-foreground">Featured products appear at the top of the homepage and shop.</p>
                </div>
              </FormItem>
            )}
          />

          <DialogFooter className="sm:col-span-2 mt-2">
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-form-cancel">
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-form-submit">
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add product"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  testid,
}: {
  icon: any;
  label: string;
  value: string;
  tone?: "brand" | "destructive";
  testid: string;
}) {
  const colorClass =
    tone === "brand"
      ? "bg-brand-accent/10 text-brand-accent"
      : tone === "destructive"
      ? "bg-destructive/10 text-destructive"
      : "bg-muted text-muted-foreground";
  return (
    <div className="rounded-xl border border-card-border bg-card p-4 flex items-center gap-3" data-testid={testid}>
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="font-display text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}
