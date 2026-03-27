"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { medusaClient } from "@/lib/medusa";

interface AppUserMetadata {
    kyc_status?: string | null;
    kyc_rejection_reason?: string | null;
    manual_investments?: unknown[];
    [key: string]: unknown;
}

interface AppUser {
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    metadata?: AppUserMetadata | null;
}

interface LoginPayload {
    email: string;
    password: string;
}

interface RegisterPayload extends LoginPayload {
    first_name?: string;
    last_name?: string;
}

interface UserContextType {
    user: AppUser | null;
    isLoading: boolean;
    login: (data: LoginPayload) => Promise<void>;
    register: (data: RegisterPayload) => Promise<void>;
    logout: () => void;
    checkSession: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<AppUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const checkSession = useCallback(async () => {
        setIsLoading(true);
        try {
            const currentCustomer = await medusaClient.customers.retrieve();
            if (currentCustomer && currentCustomer.customer) {
                setUser(currentCustomer.customer);
            } else {
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

    const login = async (data: LoginPayload) => {
        await medusaClient.auth.login(data);
        await checkSession();
    };

    const register = async (data: RegisterPayload) => {
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
