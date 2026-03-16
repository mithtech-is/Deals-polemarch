"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { medusaClient } from "@/lib/medusa";

interface UserContextType {
    user: any | null;
    isLoading: boolean;
    login: (data: any) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => void;
    checkSession: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const checkSession = useCallback(async () => {
        setIsLoading(true);
        try {
            console.log("Checking session...");
            const currentCustomer = await medusaClient.customers.retrieve();
            if (currentCustomer && currentCustomer.customer) {
                console.log("User found:", currentCustomer.customer.email);
                setUser(currentCustomer.customer);
            } else {
                console.log("No user session found");
                setUser(null);
            }
        } catch (error) {
            console.error("Session check error:", error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        checkSession();
    }, [checkSession]);

    const login = async (data: any) => {
        await medusaClient.auth.login(data);
        await checkSession();
    };

    const register = async (data: any) => {
        await medusaClient.auth.register(data);
    };

    const logout = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("medusa_auth_token");
        }
        setUser(null);
    };

    return (
        <UserContext.Provider value={{ user, isLoading, login, register, logout, checkSession }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) throw new Error("useUser must be used within a UserProvider");
    return context;
};
