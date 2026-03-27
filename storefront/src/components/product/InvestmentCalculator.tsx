"use client";

import { useState } from "react";
import { Calculator, ArrowRight, Loader2 } from "lucide-react";
import { useCart } from "@/context/CartContext";

interface InvestmentCalculatorProps {
    product: {
        variants?: Array<{
            id?: string;
        }>;
    };
    price: number;
    minLot?: number;
}

const InvestmentCalculator = ({ product, price, minLot = 1 }: InvestmentCalculatorProps) => {
    const [quantity, setQuantity] = useState(1);
    const [isAdding, setIsAdding] = useState(false);
    const { addItem } = useCart();

    const totalValue = quantity * price;
    const stampDuty = totalValue * 0.00015;
    const totalPayable = totalValue + stampDuty;

    const handleAddItem = async () => {
        const variantId = product.variants?.[0]?.id;
        if (!variantId) {
            alert("No available variant found for this deal.");
            return;
        }

        setIsAdding(true);
        try {
            await addItem(variantId, quantity, minLot);
            // Optionally redirect or stay. User complained about header not updating.
            // addItem calls refreshCart which updates totalItems.
            // router.push("/cart"); 
        } catch (error) {
            console.error("Add to cart error:", error);
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="bg-slate-900 text-white rounded-[40px] p-8 lg:p-10 shadow-2xl sticky top-24">
            <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                    <Calculator className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold">Investment Calculator</h3>
            </div>

            <div className="space-y-6 mb-10">
                <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Quantity to Buy</label>
                    <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-2">
                        <button
                            onClick={() => setQuantity(Math.max(minLot, quantity - minLot))}
                            disabled={isAdding}
                            className="h-12 w-12 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-2xl font-bold transition-colors disabled:opacity-50"
                        >
                            -
                        </button>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(minLot, parseInt(e.target.value) || minLot))}
                            disabled={isAdding}
                            className="flex-grow bg-transparent text-center text-xl font-bold focus:outline-none border-none disabled:opacity-50"
                        />
                        <button
                            onClick={() => setQuantity(quantity + minLot)}
                            disabled={isAdding}
                            className="h-12 w-12 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-2xl font-bold transition-colors disabled:opacity-50"
                        >
                            +
                        </button>
                    </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-white/5">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-medium">Deal Price (per share)</span>
                        <span className="font-bold">₹{price.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-medium">Investment Value</span>
                        <span className="font-bold">₹{totalValue.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-medium">Trans. Charges / Duty</span>
                        <span className="font-bold">₹{Math.ceil(stampDuty).toLocaleString('en-IN')}</span>
                    </div>
                </div>

                <div className="pt-6 border-t border-white/20">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Total Amount</span>
                        <span className="text-3xl font-bold text-primary">₹{Math.ceil(totalPayable).toLocaleString('en-IN')}*</span>
                    </div>
                    <p className="text-[10px] text-slate-500 text-right">*Excluding platform commission</p>
                </div>
            </div>

            <button
                onClick={handleAddItem}
                disabled={isAdding || price <= 0}
                className="w-full py-5 rounded-full bg-primary text-white font-bold text-lg hover:bg-primary/90 hover:scale-105 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:scale-100 disabled:grayscale disabled:cursor-not-allowed"
            >
                {isAdding ? (
                    <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing...
                    </>
                ) : (
                    <>
                        {price > 0 ? "Buy Deal Now" : "Price Unavailable"}
                        {price > 0 && <ArrowRight className="h-5 w-5" />}
                    </>
                )}
            </button>

            <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                T+2 Delivery to Demat Account
            </div>
        </div>
    );
};

export default InvestmentCalculator;
