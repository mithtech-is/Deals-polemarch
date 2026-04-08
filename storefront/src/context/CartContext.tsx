"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { medusaClient } from "@/lib/medusa";
import { useToast } from "./ToastContext";

interface CartItem {
    id: string;
    variant_id: string;
    name: string;
    price: number;
    quantity: number;
    logo: string;
    minInvestment: number;
    processingFee: number;
    lowQtyFee: number;
}

interface MedusaCartLineItem {
    id: string;
    variant_id: string;
    title: string;
    unit_price: number;
    quantity: number;
    thumbnail?: string | null;
    metadata?: {
        min_investment?: number;
        processing_fee?: number;
        low_qty_fee?: number;
    } | null;
}

const LOW_QTY_FEE_THRESHOLD = 10000;
const LOW_QTY_FEE_AMOUNT = 250;
const PROCESSING_FEE_RATE = 0.02;

export function computeLineFees(unitPrice: number, quantity: number) {
    const investment = unitPrice * quantity;
    const processingFee = investment * PROCESSING_FEE_RATE;
    const lowQtyFee = investment > 0 && investment < LOW_QTY_FEE_THRESHOLD ? LOW_QTY_FEE_AMOUNT : 0;
    return { investment, processingFee, lowQtyFee };
}

interface ErrorWithMessage {
    message?: string;
}

interface CartContextType {
    items: CartItem[];
    addItem: (variantId: string, quantity: number, minInvestment?: number) => Promise<void>;
    removeItem: (lineItemId: string) => Promise<void>;
    updateItem: (lineItemId: string, quantity: number) => Promise<void>;
    clearCart: () => void;
    totalItems: number;
    totalAmount: number;
    totalProcessingFee: number;
    totalLowQtyFee: number;
    totalPayable: number;
    cartId: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_ID_KEY = "medusa_cart_id";

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
    const { showToast } = useToast();
    const [cartId, setCartId] = useState<string | null>(null);
    const [items, setItems] = useState<CartItem[]>([]);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const refreshCart = useCallback(async (id: string) => {
        try {
            const { cart } = await medusaClient.carts.retrieve(id);
            const mappedItems = cart.items.map((item: MedusaCartLineItem) => {
                const storedProc = item.metadata?.processing_fee;
                const storedLow = item.metadata?.low_qty_fee;
                // Fall back to live-recompute if the line was added before fees
                // were persisted (or if the qty was edited post-add via the
                // stock cart update path).
                const fallback = computeLineFees(item.unit_price, item.quantity);
                return {
                    id: item.id,
                    variant_id: item.variant_id,
                    name: item.title,
                    price: item.unit_price,
                    quantity: item.quantity,
                    logo: item.thumbnail || "",
                    minInvestment: item.metadata?.min_investment || 1,
                    processingFee: typeof storedProc === "number" ? storedProc : fallback.processingFee,
                    lowQtyFee: typeof storedLow === "number" ? storedLow : fallback.lowQtyFee,
                };
            });
            setItems(mappedItems);
        } catch (error) {
            console.error("Error refreshing cart:", error);
            if (typeof window !== "undefined") {
                localStorage.removeItem(CART_ID_KEY);
                setCartId(null);
            }
        }
    }, []);

    useEffect(() => {
        const initCart = async () => {
            if (typeof window === "undefined") return;

            const existingId = localStorage.getItem(CART_ID_KEY);
            if (existingId) {
                setCartId(existingId);
                await refreshCart(existingId);
            }
        };

        initCart();
    }, [refreshCart]);

    const getOrCreateCart = async () => {
        if (cartId) return cartId;

        const { regions: availableRegions } = await medusaClient.regions.list();
        const regionId = availableRegions[0]?.id;
        if (!regionId) throw new Error("No regions found on backend.");

        const { cart } = await medusaClient.carts.create(regionId);
        if (typeof window !== "undefined") {
            localStorage.setItem(CART_ID_KEY, cart.id);
        }
        setCartId(cart.id);
        return cart.id;
    };

    const addItem = async (variantId: string, quantity: number, minInvestment: number = 1) => {
        try {
            const currentCartId = await getOrCreateCart();
            // The unit price isn't known here (the deal page has it but we
            // don't want a bigger addItem signature). Medusa will echo the
            // unit_price back on refresh, so fees are always derived from the
            // authoritative server price. Pass a marker so refreshCart knows
            // to compute — or simply always recompute in refresh (see
            // computeLineFees fallback above).
            await medusaClient.carts.addItems(currentCartId, variantId, quantity, {
                min_investment: minInvestment,
            });
            await refreshCart(currentCartId);
            setShowSuccessModal(true);
        } catch (error: unknown) {
            console.error("Error adding item:", error);
            showToast((error as ErrorWithMessage)?.message || "Failed to add shares to cart.", "error");
        }
    };

    const removeItem = async (lineItemId: string) => {
        if (!cartId) return;
        try {
            await medusaClient.carts.deleteItem(cartId, lineItemId);
            await refreshCart(cartId);
        } catch (error) {
            console.error("Error removing item:", error);
        }
    };

    const updateItem = async (lineItemId: string, quantity: number) => {
        if (!cartId) return;
        try {
            await medusaClient.carts.updateItem(cartId, lineItemId, quantity);
            await refreshCart(cartId);
        } catch (error) {
            console.error("Error updating item:", error);
        }
    };

    const clearCart = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem(CART_ID_KEY);
        }
        setCartId(null);
        setItems([]);
    };

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalProcessingFee = items.reduce((sum, item) => sum + item.processingFee, 0);
    const totalLowQtyFee = items.reduce((sum, item) => sum + item.lowQtyFee, 0);
    const totalPayable = totalAmount + totalProcessingFee + totalLowQtyFee;

    return (
        <CartContext.Provider
            value={{
                items,
                addItem,
                removeItem,
                updateItem,
                clearCart,
                totalItems,
                totalAmount,
                totalProcessingFee,
                totalLowQtyFee,
                totalPayable,
                cartId,
            }}
        >
            {children}

            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-6 w-[90%] max-w-md shadow-xl text-center transform animate-in zoom-in-95 duration-200">
                        <div className="text-green-600 text-3xl mb-2">OK</div>

                        <h2 className="text-lg font-bold mb-2">
                            Shares added to cart
                        </h2>

                        <p className="text-sm text-slate-500 mb-4">
                            Your selected shares have been successfully added.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="flex-1 font-bold text-slate-700 border border-slate-300 rounded-xl py-2 hover:bg-slate-50 transition-colors"
                            >
                                Continue Browsing
                            </button>

                            <Link
                                href="/cart"
                                onClick={() => setShowSuccessModal(false)}
                                className="flex-1 bg-[#083021] flex justify-center items-center text-white rounded-xl py-2 font-bold hover:bg-[#052015] transition-colors"
                            >
                                Go to Cart
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error("useCart must be used within a CartProvider");
    return context;
};
