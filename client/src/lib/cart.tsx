import { createContext, useContext, useMemo, useReducer } from "react";
import type { Product } from "@shared/schema";

export type CartItem = {
  product: Product;
  quantity: number;
};

type CartState = {
  items: Record<number, CartItem>;
};

type CartAction =
  | { type: "add"; product: Product; quantity?: number }
  | { type: "set-qty"; productId: number; quantity: number }
  | { type: "remove"; productId: number }
  | { type: "clear" };

const initialState: CartState = { items: {} };

function reducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      const existing = state.items[action.product.id];
      const nextQty = (existing?.quantity ?? 0) + (action.quantity ?? 1);
      const cap = Math.max(1, action.product.stock || 99);
      return {
        items: {
          ...state.items,
          [action.product.id]: {
            product: action.product,
            quantity: Math.min(nextQty, cap),
          },
        },
      };
    }
    case "set-qty": {
      const item = state.items[action.productId];
      if (!item) return state;
      if (action.quantity <= 0) {
        const { [action.productId]: _omit, ...rest } = state.items;
        return { items: rest };
      }
      const cap = Math.max(1, item.product.stock || 99);
      return {
        items: {
          ...state.items,
          [action.productId]: { ...item, quantity: Math.min(action.quantity, cap) },
        },
      };
    }
    case "remove": {
      const { [action.productId]: _omit, ...rest } = state.items;
      return { items: rest };
    }
    case "clear":
      return { items: {} };
    default:
      return state;
  }
}

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (product: Product, quantity?: number) => void;
  setQty: (productId: number, quantity: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value = useMemo<CartContextValue>(() => {
    const items = Object.values(state.items);
    return {
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      subtotal: items.reduce((s, i) => s + i.quantity * i.product.price, 0),
      add: (product, quantity) => dispatch({ type: "add", product, quantity }),
      setQty: (productId, quantity) =>
        dispatch({ type: "set-qty", productId, quantity }),
      remove: (productId) => dispatch({ type: "remove", productId }),
      clear: () => dispatch({ type: "clear" }),
    };
  }, [state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
