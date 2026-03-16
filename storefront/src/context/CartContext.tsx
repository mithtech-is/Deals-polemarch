"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { medusaClient } from "@/lib/medusa";
import { useToast } from "./ToastContext";

interface CartItem {
    id: string; // Line item ID from Medusa
    variant_id: string;
    name: string;
    price: number;
    quantity: number;
    logo: string;
    minInvestment: number;
}

interface CartContextType {
    items: CartItem[];
    addItem: (variantId: string, quantity: number, minInvestment?: number) => Promise<void>;
    removeItem: (lineItemId: string) => Promise<void>;
    updateItem: (lineItemId: string, quantity: number) => Promise<void>;
    clearCart: () => void;
    totalItems: number;
    totalAmount: number;
    cartId: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_ID_KEY = "medusa_cart_id";

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
    const { showToast } = useToast();
    const [cartId, setCartId] = useState<string | null>(null);
    const [items, setItems] = useState<CartItem[]>([]);
    const [regions, setRegions] = useState<any[]>([]);

    const refreshCart = useCallback(async (id: string) => {
        try {
            console.log("Refreshing cart:", id);
            const { cart } = await medusaClient.carts.retrieve(id);
            console.log("Cart fetched from backend:", cart);
            console.log("Cart items count:", cart.items?.length || 0);
            const mappedItems = cart.items.map((item: any) => ({
                id: item.id,
                variant_id: item.variant_id,
                name: item.title,
                price: item.unit_price,
                quantity: item.quantity,
                logo: item.thumbnail || "",
                minInvestment: item.metadata?.min_investment || 1,
            }));
            console.log("Mapped items for state:", mappedItems);
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

            // 1. Get regions to ensure we can create a cart
            const { regions: availableRegions } = await medusaClient.regions.list();
            setRegions(availableRegions);

            // 2. Check for existing cart ID
            let existingId = localStorage.getItem(CART_ID_KEY);
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
            await medusaClient.carts.addItems(currentCartId, variantId, quantity, { min_investment: minInvestment });
            await refreshCart(currentCartId);
            showToast("Shares added to cart successfully!", "success");
        } catch (error: any) {
            console.error("Error adding item:", error);
            showToast(error.message || "Failed to add shares to cart.", "error");
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

    return (
        <CartContext.Provider value={{ items, addItem, removeItem, updateItem, clearCart, totalItems, totalAmount, cartId }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error("useCart must be used within a CartProvider");
    return context;
};
