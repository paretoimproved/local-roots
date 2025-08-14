import Link from "next/link";
import { ArrowRight, Search, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FarmImage } from "./placeholder-fix";

const farmCategories = [
  { name: "Vegetables", icon: "🥬", href: "/dashboard/consumer?category=vegetables" },
  { name: "Fruits", icon: "🍎", href: "/dashboard/consumer?category=fruits" },
  { name: "Meats", icon: "🥩", href: "/dashboard/consumer?category=meats" },
  { name: "Dairy", icon: "🧀", href: "/dashboard/consumer?category=dairy" },
  { name: "CSA Boxes", icon: "📦", href: "/dashboard/consumer?category=csa" },
  { name: "Organic", icon: "🌱", href: "/dashboard/consumer?category=organic" },
  { name: "Seasonal", icon: "🍂", href: "/dashboard/consumer?category=seasonal" },
  { name: "Local Pickup", icon: "🚚", href: "/dashboard/consumer?category=pickup" },
];

const featuredFarms = [
  {
    id: 1,
    name: "Green Valley Farm",
    description: "Seasonal vegetable share",
    price: "$25/week",
    image: "",
    rating: 4.9,
    isFavorite: true,
  },
  {
    id: 2,
    name: "Sunshine Orchard",
    description: "Organic fruit delivery",
    price: "$32/week",
    image: "",
    rating: 4.7,
    isFavorite: true,
  },
  {
    id: 3,
    name: "Heritage Ranch",
    description: "Pasture-raised meat share",
    price: "$45/week",
    image: "",
    rating: 4.8,
    isFavorite: false,
  },
  {
    id: 4,
    name: "Meadow Dairy",
    description: "Fresh milk and cheese",
    price: "$28/week",
    image: "",
    rating: 4.6,
    isFavorite: true,
  },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero section */}
      <section className="pt-4 pb-3 container mx-auto px-4">
        <div className="max-w-3xl mx-auto mb-3 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-center mb-2 text-farm-green-dark tracking-tight">
            From farm to table
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto font-light">
            Subscribe to local CSA shares and enjoy seasonal produce year-round
          </p>
        </div>
      </section>
      
      {/* Category section - properly centered */}
      <section className="container mx-auto px-4 mb-6 overflow-hidden">
        <div className="flex justify-center overflow-x-auto pb-4 pt-2 scrollbar-hide space-x-8">
          {farmCategories.map((category) => (
            <Link 
              href={category.href}
              key={category.name}
              className="flex flex-col items-center space-y-2 min-w-[64px] flex-shrink-0"
            >
              <div className="h-14 w-14 bg-white rounded-full flex items-center justify-center shadow-sm border hover:border-farm-green transition-colors">
                <span className="text-xl">{category.icon}</span>
              </div>
              <span className="text-xs font-medium text-gray-700 whitespace-nowrap text-center">{category.name}</span>
            </Link>
          ))}
        </div>
      </section>
      
      {/* Featured farms section (Airbnb-like cards) */}
      <section className="pb-10 container mx-auto px-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl md:text-3xl font-bold text-farm-green-dark">Featured farms</h2>
          <Link 
            href="/dashboard/consumer/farms" 
            className="text-farm-green font-medium flex items-center hover:text-farm-green-dark"
          >
            See all <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {featuredFarms.map((farm) => (
            <div className="farm-item group" key={farm.id}>
              <Link 
                href={`/dashboard/consumer/farms/${farm.id}`} 
                className="block"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden mb-2 bg-gray-100 shadow-sm">
                  {farm.isFavorite && (
                    <div className="absolute top-3 left-3 z-10 bg-white py-1 px-2 rounded-full text-xs font-semibold shadow-md flex items-center">
                      <span className="text-farm-green mr-1">🌟</span>
                      Customer Favorite
                    </div>
                  )}
                  <div className="absolute top-3 right-3 z-10">
                    <button className="bg-white p-2 rounded-full shadow-md hover:scale-105 transition-transform">
                      <Heart size={16} className={farm.isFavorite ? "fill-farm-green text-farm-green" : "text-gray-600"} />
                    </button>
                  </div>
                  <FarmImage
                    src={farm.image}
                    alt={farm.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                </div>
                <div>
                  <div className="flex justify-between">
                    <h3 className="font-medium text-gray-900">{farm.name}</h3>
                    <div className="flex items-center">
                      <span className="text-farm-green text-xs">★</span>
                      <span className="text-sm ml-1">{farm.rating}</span>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm">{farm.description}</p>
                  <p className="font-semibold mt-1 text-farm-green">{farm.price}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* How it works section (with numbers) */}
      <section className="py-10 bg-farm-earth-light border-t">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 text-farm-green-dark">How Local Roots Works</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                step: 1,
                title: "Find Local Farms",
                description: "Browse CSA offerings and farm-fresh products from trusted local farmers in your area.",
                icon: "🚜"
              },
              {
                step: 2,
                title: "Subscribe to Shares",
                description: "Choose seasonal or year-round subscriptions that match your family's needs and preferences.",
                icon: "📆"
              },
              {
                step: 3,
                title: "Enjoy Farm-Fresh Food",
                description: "Pick up your share or get home delivery of fresh, sustainably-grown local produce and products.",
                icon: "🥗"
              }
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center">
                <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <span className="text-2xl">{item.icon}</span>
                </div>
                <div className="bg-farm-green text-white h-8 w-8 rounded-full flex items-center justify-center font-bold text-lg -mt-10 mb-4 shadow-md border-2 border-white">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-farm-green-dark">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="bg-farm-green py-16 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Ready to get started?</h2>
          <p className="max-w-2xl mx-auto mb-8 opacity-90 font-light text-lg">
            Join Local Roots today and connect with local food producers in your area.
          </p>
          <Button 
            asChild 
            className="rounded-full bg-white text-farm-green hover:bg-gray-100 border-none shadow-lg hover:shadow-xl transition-all px-8 h-12 text-lg font-medium"
          >
            <Link href="/sign-up">
              Create an Account
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
} 