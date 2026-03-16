import { Book, TrendingUp, FileText, HelpCircle } from "lucide-react";

export const KNOWLEDGE_CATEGORIES = [
    {
        id: "basics",
        slug: "basics-of-unlisted-shares",
        title: "Basics of Unlisted Shares",
        icon: "Book",
        color: "bg-blue-50 text-blue-600",
        count: 12,
        description: "Everything you need to know about the world of unlisted shares and pre-IPO investing."
    },
    {
        id: "strategy",
        slug: "investment-strategy",
        title: "Investment Strategy",
        icon: "TrendingUp",
        color: "bg-green-50 text-green-600",
        count: 8,
        description: "Learn how to build a diversified portfolio and maximize returns in unlisted equity."
    },
    {
        id: "legal",
        slug: "legal-and-documentation",
        title: "Legal & Documentation",
        icon: "FileText",
        color: "bg-orange-50 text-orange-600",
        count: 5,
        description: "Understand the legal frameworks, stamp duty, and transfer protocols for unlisted shares."
    },
    {
        id: "support",
        slug: "faqs-and-support",
        title: "FAQs & Support",
        icon: "HelpCircle",
        color: "bg-purple-50 text-purple-600",
        count: 20,
        description: "Quick answers to common questions about our platform and the investment process."
    },
];

export const ARTICLES = [
    {
        slug: "calculate-valuation-unlisted-companies",
        title: "How to calculate valuation of unlisted companies?",
        time: "5 min read",
        category: "Strategy",
        categoryId: "strategy",
        content: `Valuation of unlisted companies is more art than science. Unlike listed companies, where the market determines the price every second, unlisted companies require a more fundamental approach...`
    },
    {
        slug: "guide-to-buying-pre-ipo-shares",
        title: "Step-by-step guide to buying pre-IPO shares",
        time: "8 min read",
        category: "Basics",
        categoryId: "basics",
        content: `Buying pre-IPO shares with Polemarch is simple. Here is a step-by-step guide: 1. Browse deals, 2. Complete KYC, 3. Add to cart, 4. Pay using the provided Escrow details...`
    },
    {
        slug: "tax-implications-unlisted-share-investments",
        title: "Tax implications of unlisted share investments",
        time: "10 min read",
        category: "Legal",
        categoryId: "legal",
        content: `Capital gains on unlisted shares are treated differently than listed shares. Short-term capital gains (if held for less than 24 months) are taxed at your slab rate...`
    },
    {
        slug: "difference-between-cdsl-and-nsdl-demat-accounts",
        title: "Difference between CDSL and NSDL demat accounts",
        time: "4 min read",
        category: "Support",
        categoryId: "support",
        content: `CDSL and NSDL are the two primary depositories in India. While they perform the same function—holding your shares in electronic form—they operate under different exchanges...`
    },
];
