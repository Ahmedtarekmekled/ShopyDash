import React, {
  createContext,
  useContext,
  useReducer,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { authService } from "@/services/auth.service";
import { cartService } from "@/services/order.service";
import { deliverySettingsService } from "@/services/delivery-settings.service";
import type {
  Profile,
  CartWithItems,
  CartItemWithProduct,
} from "@/types/database";
import { notify } from "@/lib/notify";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

// State types
interface AppState {
  // Auth
  user: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Cart
  cart: CartWithItems | null;
  cartItemCount: number;
  cartTotal: number;

  // Region (MVP - single region)
  currentRegionId: string | null;
}

// Action types
type AppAction =
  | { type: "SET_USER"; payload: Profile | null }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_CART"; payload: CartWithItems | null }
  | { type: "SET_REGION"; payload: string }
  | { type: "LOGOUT" };

// Initial state
const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  cart: null,
  cartItemCount: 0,
  cartTotal: 0,
  currentRegionId: null,
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_USER":
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false,
      };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_CART": {
      const cart = action.payload;
      if (!cart || !cart.items) {
        return { ...state, cart: null, cartItemCount: 0, cartTotal: 0 };
      }
      const { subtotal, itemCount } = cartService.calculateTotal(
        cart.items as CartItemWithProduct[]
      );
      return {
        ...state,
        cart,
        cartItemCount: itemCount,
        cartTotal: subtotal,
      };
    }
    case "SET_REGION":
      return { ...state, currentRegionId: action.payload };
    case "LOGOUT":
      return {
        ...initialState,
        isLoading: false,
        currentRegionId: state.currentRegionId,
      };
    default:
      return state;
  }
}

// Context
interface AppContextType extends AppState {
  login: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null; user: Profile | null }>;
  register: (data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role?: "CUSTOMER" | "SHOP_OWNER";
  }) => Promise<{ error: Error | null; needsVerification?: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshCart: () => Promise<void>;
  addToCart: (
    shopId: string,
    productId: string,
    quantity: number,
    productPayload?: any
  ) => Promise<void>;
  updateCartItem: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  setRegion: (regionId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [limitErrorModal, setLimitErrorModal] = useState<{isOpen: boolean, message: string}>({isOpen: false, message: ''});

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { user } = await getCurrentUser();
        if (user) {
          const profile = await authService.getProfile(user.id);
          dispatch({ type: "SET_USER", payload: profile });

          // Load cart if authenticated
          if (profile) {
            const cart = await cartService.getCart(user.id);
            dispatch({ type: "SET_CART", payload: cart });
          }
        } else {
          dispatch({ type: "SET_USER", payload: null });
        }
      } catch {
        dispatch({ type: "SET_USER", payload: null });
      }
    };

    initAuth();

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        // Don't await - let it run in background
        authService
          .getProfile(session.user.id)
          .then((profile) => {
            dispatch({ type: "SET_USER", payload: profile });
            if (profile) {
              cartService
                .getCart(session.user.id)
                .then((cart) => {
                  dispatch({ type: "SET_CART", payload: cart });
                })
                .catch(() => {});
            }
          })
          .catch(() => {});
      } else if (event === "SIGNED_OUT") {
        dispatch({ type: "LOGOUT" });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Actions
  const login = async (email: string, password: string) => {
    const { user, error } = await authService.login(email, password);
    if (error) return { error, user: null };
    dispatch({ type: "SET_USER", payload: user });
    return { error: null, user };
  };

  const register = async (data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role?: "CUSTOMER" | "SHOP_OWNER";
  }) => {
    const { user, error, needsVerification } = await authService.register(data);
    if (error) return { error };
    if (needsVerification) return { error: null, needsVerification: true };
    dispatch({ type: "SET_USER", payload: user });
    return { error: null };
  };

  const logout = async () => {
    await authService.logout();
    dispatch({ type: "LOGOUT" });
  };

  const refreshUser = async () => {
    const profile = await authService.getCurrentProfile();
    dispatch({ type: "SET_USER", payload: profile });
  };

  const refreshCart = async () => {
    if (!state.user) return;
    const { user } = await getCurrentUser();
    if (user) {
      const cart = await cartService.getCart(user.id);
      dispatch({ type: "SET_CART", payload: cart });
    }
  };

  const addToCart = async (
    shopId: string,
    productId: string,
    quantity: number,
    productPayload?: any
  ) => {
    const user = state.user;
    if (!user) throw new Error("يجب تسجيل الدخول أولاً");

    // --- Dynamic Shop Limit Check ---
    if (state.cart && state.cart.items && state.cart.items.length > 0) {
      const uniqueShopIds = new Set(
        state.cart.items.map((item: any) => 
          item.product?.shop_id || item.product?.shop?.id || item.shop_id || item.product?.shop_id
        ).filter(Boolean)
      );
      
      const isNewShop = !uniqueShopIds.has(shopId);

      if (isNewShop) {
        try {
          // Bypass cache to get the strict live limit directly from Supabase
          const { data: settings } = await supabase
            .from('delivery_settings')
            .select('max_shops_per_order')
            .single();
            
          const maxShops = settings?.max_shops_per_order || 0;
          
          if (maxShops > 0 && uniqueShopIds.size >= maxShops) {
            let limitText = "أكثر من متجر واحد";
            if (maxShops === 1) limitText = "أكثر من متجر واحد";
            else if (maxShops === 2) limitText = "أكثر من متجرين";
            else if (maxShops >= 3 && maxShops <= 10) limitText = `أكثر من ${maxShops} متاجر`;
            else limitText = `أكثر من ${maxShops} متجراً`;

            const errorMsg = `عذراً، تم تحديد الطلب من ${limitText} في السلة لأسباب تنظيمية. يرجى إتمام الطلب الحالي أو إفراغ السلة قبل الطلب من هذا المتجر.`;
            setLimitErrorModal({ isOpen: true, message: errorMsg });
            // By throwing this silently we avoid the double toast in downstream handlers.
            throw new Error('SILENT_MODAL_LIMIT_EXCEEDED');
          }
        } catch (err: any) {
          // If our specific limit error is thrown, re-throw it to abort the rest
          if (err.message === 'SILENT_MODAL_LIMIT_EXCEEDED') throw err;
          console.warn('Could not fetch strict shop limit settings:', err);
        }
      }
    }
    // --- End Shop Limit Check ---

    const previousCart = state.cart;
    let isNewItem = true;

    if (state.cart && state.cart.items) {
      const existingItem = state.cart.items.find(
        (item: any) => item.product_id === productId
      );
      if (existingItem) {
        // Enforce Stock Frontend Validations
        const availableStock = existingItem.product?.stock_quantity || 0;
        if (existingItem.quantity + quantity > availableStock) {
          throw new Error(`عذراً، الكمية المطلوبة غير متوفرة. المتاح: ${availableStock}`);
        }

        isNewItem = false;
        const updatedItems = state.cart.items.map((item: any) =>
          item.product_id === productId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
        dispatch({
          type: "SET_CART",
          payload: { ...state.cart, items: updatedItems as any },
        });
      }
    }

    if (isNewItem) {
       if (productPayload && productPayload.stock_quantity !== undefined) {
         if (quantity > productPayload.stock_quantity) {
           throw new Error(`عذراً، الكمية المطلوبة غير متوفرة. المتاح: ${productPayload.stock_quantity}`);
         }
       }

       if (productPayload) {
          // Construct optimistic new item
          const tempItem = {
            id: `temp-${Date.now()}`,
            cart_id: state.cart?.id || `temp-cart-${Date.now()}`,
            product_id: productId,
            quantity: quantity,
            product: productPayload
          };
          
          const newItems = state.cart?.items ? [tempItem, ...state.cart.items] : [tempItem];
          
          dispatch({
            type: "SET_CART",
            payload: {
              ...(state.cart || { 
                id: tempItem.cart_id, 
                user_id: user.id, 
                shop_id: shopId, 
                created_at: new Date().toISOString(), 
                updated_at: new Date().toISOString() 
              }),
              items: newItems
            } as any
          });
       }
    }

    try {
      const addedItem = await cartService.addItem(user.id, shopId, productId, quantity);
      
      // Immediately update state with the real item from DB (containing real UUID)
      if (isNewItem && addedItem) {
        dispatch({
          type: "SET_CART",
          payload: {
            ...state.cart!,
            items: state.cart!.items.map(item => 
              item.product_id === productId && item.id.startsWith('temp-')
                ? { ...item, id: addedItem.id }
                : item
            )
          } as any
        });
      }

      if (isNewItem && !productPayload) {
        await refreshCart();
      } else {
        refreshCart(); 
      }
    } catch (error) {
      dispatch({ type: "SET_CART", payload: previousCart });
      throw error;
    }
  };

  const updateCartItem = async (itemId: string, quantity: number) => {
    const previousCart = state.cart;
    
    // Optimistic Update Let's enforce stock boundaries too
    if (state.cart && state.cart.items) {
      const targetItem = state.cart.items.find((item) => item.id === itemId);
      if (targetItem) {
        const availableStock = targetItem.product?.stock_quantity || 0;
        if (quantity > availableStock) {
           throw new Error(`عذراً، الكمية المطلوبة غير متوفرة. المتاح: ${availableStock}`);
        }
      }

      const updatedItems = state.cart.items.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      );
      dispatch({
        type: "SET_CART",
        payload: { ...state.cart, items: updatedItems as any },
      });
    }

    try {
      await cartService.updateItemQuantity(itemId, quantity);
    } catch (error: any) {
      if (error.message === "ITEM_SYNCING") {
        // Just refresh cart to get real IDs, the optimistic change is already in state
        refreshCart();
        return;
      }
      console.warn("Optimistic update failed, rolling back", error);
      dispatch({ type: "SET_CART", payload: previousCart });
      throw error;
    }
  };

  const removeFromCart = async (itemId: string) => {
    const previousCart = state.cart;
    
    // Optimistic Update
    if (state.cart && state.cart.items) {
      const updatedItems = state.cart.items.filter(
        (item) => item.id !== itemId
      );
      dispatch({
        type: "SET_CART",
        payload: { ...state.cart, items: updatedItems as any },
      });
    }

    try {
      await cartService.removeItem(itemId);
    } catch (error) {
      console.warn("Optimistic update failed, rolling back", error);
      dispatch({ type: "SET_CART", payload: previousCart });
    }
  };

  const clearCart = async () => {
    const { user } = await getCurrentUser();
    if (user) {
      await cartService.clearCart(user.id);
      dispatch({ type: "SET_CART", payload: null });
    }
  };

  const setRegion = (regionId: string) => {
    dispatch({ type: "SET_REGION", payload: regionId });
    localStorage.setItem("selectedRegion", regionId);
  };

  // Load saved region
  useEffect(() => {
    const savedRegion = localStorage.getItem("selectedRegion");
    if (savedRegion) {
      dispatch({ type: "SET_REGION", payload: savedRegion });
    }
  }, []);

  const value: AppContextType = {
    ...state,
    login,
    register,
    logout,
    refreshUser,
    refreshCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    setRegion,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      <AlertDialog open={limitErrorModal.isOpen} onOpenChange={(open) => !open && setLimitErrorModal({ isOpen: false, message: '' })}>
        <AlertDialogContent className="w-[90vw] max-w-md md:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600 justify-center text-xl pb-2">
               <AlertTriangle className="w-6 h-6" />
               تنبيه: الحد الأقصى للمتاجر
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center pt-2 text-base text-foreground leading-relaxed">
              {limitErrorModal.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-start gap-2 pt-4">
            <AlertDialogAction className="w-full bg-primary" onClick={() => setLimitErrorModal({ isOpen: false, message: '' })}>
              حسناً، فهمت
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppContext.Provider>
  );
}

// Hook
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

// Convenience hooks
export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  } = useApp();
  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };
}

export function useCart() {
  const {
    cart,
    cartItemCount,
    cartTotal,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    refreshCart,
  } = useApp();
  return {
    cart,
    cartItemCount,
    cartTotal,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    refreshCart,
  };
}

export function useRegion() {
  const { currentRegionId, setRegion } = useApp();
  return { currentRegionId, setRegion };
}
