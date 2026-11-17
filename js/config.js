/**
 * StallPay - College Stall Management System
 * Global Configuration & Initial Sample Data
 */

const DEFAULT_CONFIG = {
  stall: {
    name: "Entrepreneur Club Stall",
    event: "College Fest 2026",
    tagline: "Taste, Shop & Support Student Ventures!",
    upiId: "stallpay.ecell@upi",
    payeeName: "E-Cell College Stall",
    currency: "₹",
    teamPin: "1234", // Default team access PIN
    allowPublicFeedback: true,
    soundAlerts: true
  },
  
  // Default college stall items ready for fest day
  initialProducts: [
    {
      id: "prod-1",
      name: "Crispy Veg Steamed Momos",
      category: "Snacks",
      price: 60,
      description: "6 pcs authentic steamed dumplings with fiery red chutney & mayo",
      inStock: true,
      emoji: "🥟",
      badge: "Bestseller"
    },
    {
      id: "prod-2",
      name: "Loaded Cheese Nachos",
      category: "Snacks",
      price: 80,
      description: "Crunchy tortilla chips with warm cheese sauce, jalapenos & salsa",
      inStock: true,
      emoji: "🧀",
      badge: "Popular"
    },
    {
      id: "prod-3",
      name: "Classic Paneer Kathi Roll",
      category: "Snacks",
      price: 90,
      description: "Smoky spiced paneer cubes wrapped in layered paratha with mint sauce",
      inStock: true,
      emoji: "🌯",
      badge: ""
    },
    {
      id: "prod-4",
      name: "Thick Cold Coffee with Ice Cream",
      category: "Beverages",
      price: 50,
      description: "Rich blended espresso cold coffee topped with vanilla scoop & choco drizzle",
      inStock: true,
      emoji: "🧋",
      badge: "Crowd Favorite"
    },
    {
      id: "prod-5",
      name: "Virgin Blue Lagoon Mojito",
      category: "Beverages",
      price: 45,
      description: "Refreshing fizzy blue curacao mocktail with mint leaves & fresh lemon",
      inStock: true,
      emoji: "🍹",
      badge: ""
    },
    {
      id: "prod-6",
      name: "Warm Sizzling Brownie with Ice Cream",
      category: "Desserts",
      price: 70,
      description: "Gooey chocolate fudge brownie topped with rich vanilla ice cream & hot fudge",
      inStock: true,
      emoji: "🍨",
      badge: "Must Try"
    },
    {
      id: "prod-7",
      name: "E-Club Founder Vinyl Sticker Pack",
      category: "Merch",
      price: 30,
      description: "Set of 5 waterproof laptop stickers with tech & startup slogans",
      inStock: true,
      emoji: "🎨",
      badge: "Club Special"
    },
    {
      id: "prod-8",
      name: "Entrepreneur Club Custom Badge",
      category: "Merch",
      price: 25,
      description: "Matte metal pin badge 'Hustle • Build • Inspire' - Fest Edition",
      inStock: true,
      emoji: "⭐",
      badge: "Limited"
    }
  ],

  // Preloaded expenses for realistic profit calculation demonstration
  initialExpenses: [
    {
      id: "exp-1",
      title: "Raw Ingredients (Momos, Paneer, Veggies)",
      category: "Raw Materials",
      amount: 1450,
      date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      notes: "Purchased from wholesale market"
    },
    {
      id: "exp-2",
      title: "Paper Cups, Plates & Eco Straws",
      category: "Packaging",
      amount: 450,
      date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      notes: "Biodegradable materials for college green policy"
    },
    {
      id: "exp-3",
      title: "Stall Banner & QR Standee Printing",
      category: "Stall Setup",
      amount: 600,
      date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
      notes: "Fest stall branding"
    },
    {
      id: "exp-4",
      title: "Ice Blocks & Beverage Syrups",
      category: "Beverages",
      amount: 350,
      date: new Date().toISOString().split('T')[0],
      notes: "Fresh supplies for day 1"
    }
  ],

  // Initial customer feedback reviews
  initialFeedback: [
    {
      id: "fb-1",
      customerName: "Aarav Sharma",
      customerPhone: "9876543210",
      rating: 5,
      tag: "Delicious Food",
      comment: "The Cold Coffee with Ice Cream is phenomenal! Very fast verification at the counter.",
      date: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: "fb-2",
      customerName: "Priya Nair",
      customerPhone: "9123456780",
      rating: 5,
      tag: "Super Fast",
      comment: "Super convenient to scan UPI QR and show token. Great initiative by the Entrepreneur Club!",
      date: new Date(Date.now() - 14400000).toISOString()
    },
    {
      id: "fb-3",
      customerName: "Rohan Verma",
      customerPhone: "9988776655",
      rating: 4,
      tag: "Friendly Crew",
      comment: "Loved the Momos and the stickers. The team was super energetic and welcoming.",
      date: new Date(Date.now() - 28800000).toISOString()
    }
  ]
};

// Export for ES modules and window object for direct browser script access
if (typeof window !== 'undefined') {
  window.DEFAULT_CONFIG = DEFAULT_CONFIG;
}
