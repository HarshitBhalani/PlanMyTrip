"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronLeft,
  Landmark,
  Mountain,
  Waves,
  Compass,
  Building2,
  Trees,
  type LucideIcon,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function HomePage() {
  const router = useRouter();
  const quickScrollRef = useRef<HTMLDivElement>(null);
  const magicalScrollRef = useRef<HTMLDivElement>(null);

  // State for showing/hiding arrows
  const [quickArrows, setQuickArrows] = useState({ left: false, right: true });
  const [magicalArrows, setMagicalArrows] = useState({ left: false, right: true });
  const [categoryArrows, setCategoryArrows] = useState<{ [key: number]: { left: boolean, right: boolean } }>({});

  // Quick Destinations (First row with "Anywhere" card)
  const quickDestinations = [
    {
      name: "Mumbai",
      image: "https://images.pexels.com/photos/13371115/pexels-photo-13371115.jpeg?&cs=tinysrgb&w=600&h=400&fit=crop",
    },
    {
      name: "London",
      image: "https://images.pexels.com/photos/16375862/pexels-photo-16375862.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
    },
    {
      name: "Paris",
      tag: "Long haul",
      image: "https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
    },
    {
      name: "Dubai",
      image: "https://images.pexels.com/photos/33669696/pexels-photo-33669696.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
    },
    {
      name: "Singapore",
      image: "https://images.pexels.com/photos/11777890/pexels-photo-11777890.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
    },
    {
      name: "New York",
      image: "https://images.pexels.com/photos/771881/pexels-photo-771881.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
    },
    {
      name: "Tokyo",
      image: "https://images.pexels.com/photos/34918921/pexels-photo-34918921.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
    },
    {
      name: "Barcelona",
      image: "https://images.pexels.com/photos/5568317/pexels-photo-5568317.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
    },
  ];

  const categories = [
    {
      title: "Religious Places",
      icon: Landmark as LucideIcon,
      destinations: [
        {
          name: "Dwarka",
          image: "https://i.pinimg.com/1200x/a6/36/b5/a636b544f971f6a23e3c8a301e796bba.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Varanasi",
          image: "https://i.pinimg.com/1200x/d0/1f/db/d01fdb5c36094023bf965e3e3b57ee4a.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Tirupati",
          image: "https://i.pinimg.com/736x/80/32/8e/80328e5c19a28e5d11c0d047979ed670.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Mathura",
          image: "https://i.pinimg.com/1200x/14/69/b8/1469b861e0f8a75086885318aff9f99c.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Haridwar",
          image: "https://i.pinimg.com/1200x/d7/57/74/d7577476e779f169678d0d33eabf2e25.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Ujjain",
          image: "https://i.pinimg.com/736x/5d/dd/62/5ddd62ea0b3d5ed5e50884f938db2027.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
      ],
    },
    {
      title: "Hill Stations",
      icon: Mountain as LucideIcon,
      destinations: [
        {
          name: "Manali",
          image: "https://i.pinimg.com/736x/54/43/22/5443227fc01ba03cd2ea494b2463e506.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Shimla",
          image: "https://i.pinimg.com/1200x/a6/24/a3/a624a319b3027a55144932bcaf5a3239.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Darjeeling",
          image: "https://i.pinimg.com/736x/eb/7f/a4/eb7fa45e410108d4bf30a94c2d139030.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Ooty",
          image: "https://i.pinimg.com/1200x/4f/11/fb/4f11fb991d01ce3b0cb942703df03d89.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Mussoorie",
          image: "https://i.pinimg.com/736x/76/6d/e3/766de33e31011f35056c1eb2aa2e7769.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Nainital",
          image: "https://i.pinimg.com/736x/4f/d8/77/4fd877f1e935d250aa6bd7133ebb0d97.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
      ],
    },
    {
      title: "Beaches & Coastal",
      icon: Waves as LucideIcon,
      destinations: [
        {
          name: "Goa",
          image: "https://i.pinimg.com/1200x/bd/3e/36/bd3e36eb07b7d0b0a53d77c3df7f9913.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Andaman",
          image: "https://i.pinimg.com/1200x/d7/33/86/d733867e8ffe4de64077518b0501875f.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Pondicherry",
          image: "https://i.pinimg.com/736x/a1/f1/48/a1f148cc5b9fc51a44680d946ada481a.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Lakshadweep",
          image: "https://i.pinimg.com/1200x/22/05/c8/2205c88a3999d31229fc741bb16b4bb2.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Kerala",
          image: "https://i.pinimg.com/736x/a1/01/ad/a101adeac9f2062d0a25a5806a902b34.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Gokarna",
          image: "https://i.pinimg.com/1200x/93/89/04/93890407b584b0cb9cbf66de284efd41.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
      ],
    },
    {
      title: "Adventure & Trekking",
      icon: Compass as LucideIcon,
      destinations: [
        {
          name: "Leh Ladakh",
          image: "https://i.pinimg.com/736x/f5/95/2f/f5952fd3ac101bfbc21320b4110c3a6a.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Spiti Valley",
          image: "https://i.pinimg.com/736x/c4/ec/2e/c4ec2e19b2bc48d21f904a8b568e4916.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Rishikesh",
          image: "https://i.pinimg.com/1200x/24/e3/27/24e327dc5877eaeecd4c7383f0696056.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Kasol",
          image: "https://i.pinimg.com/736x/d8/17/c5/d817c59905606bc2e4c8a751133b7ad2.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Auli",
          image: "https://i.pinimg.com/736x/d6/61/86/d66186ab1948e8be46cdb7d75b57505a.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Valley of Flowers",
          image: "https://i.pinimg.com/1200x/33/b1/3f/33b13f314368d12108c44b49b4df7ab7.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
      ],
    },
    {
      title: "Heritage & Cultural",
      icon: Building2 as LucideIcon,
      destinations: [
        {
          name: "Jaipur",
          image: "https://i.pinimg.com/736x/60/13/e4/6013e43e69955c724d78cad528ced1fd.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Udaipur",
          image: "https://i.pinimg.com/736x/9c/4f/2c/9c4f2c33ff9079e7abafca99a53668ae.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Jodhpur",
          image: "https://i.pinimg.com/1200x/4c/9c/b7/4c9cb707293c51a88298b8edf7f1c694.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Jaisalmer",
          image: "https://i.pinimg.com/736x/78/4e/37/784e371814c1a8c733ee3eb5e7afde4c.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Mysore",
          image: "https://i.pinimg.com/1200x/58/4b/1b/584b1b70f0390295041196841f2f5ac5.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
      ],
    },
    {
      title: "Wildlife & Nature",
      icon: Trees as LucideIcon,
      destinations: [
        {
          name: "Jim Corbett",
          image: "https://i.pinimg.com/1200x/c0/0a/91/c00a91d3d65eedd1520a72294769dd32.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Ranthambore",
          image: "https://i.pinimg.com/736x/06/fc/3b/06fc3b748f0d4a58b96d7e99add5e86c.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Kaziranga",
          image: "https://i.pinimg.com/736x/01/74/af/0174afdee8d32d4fc2ce7979021b139a.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Sundarbans",
          image: "https://i.pinimg.com/736x/80/18/c9/8018c9b7675b9a6cc414780a6f010aa9.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Gir National Park",
          image: "https://i.pinimg.com/1200x/22/76/f4/2276f4bf980623a3c317270b5947837a.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
        {
          name: "Periyar",
          image: "https://i.pinimg.com/736x/e8/81/c0/e881c07b3e6c6d0c6e0732218ca18bd5.jpg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
        },
      ],
    },
  ];

  // Initialize category arrows
  useEffect(() => {
    const initialArrows: { [key: number]: { left: boolean, right: boolean } } = {};
    categories.forEach((_, index) => {
      initialArrows[index] = { left: false, right: true };
    });
    setCategoryArrows(initialArrows);
  }, []);

  const handleDestinationClick = (destination: string) => {
    localStorage.setItem("preSelectedDestination", destination);
    router.push("/create-trip");
  };

  const updateArrowVisibility = (ref: React.RefObject<HTMLDivElement | null>, setState: React.Dispatch<React.SetStateAction<{ left: boolean; right: boolean }>>) => {
    if (ref.current) {
      const { scrollLeft, scrollWidth, clientWidth } = ref.current;
      setState({
        left: scrollLeft > 0,
        right: scrollLeft < scrollWidth - clientWidth - 10
      });
    }
  };

  const scrollContainer = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right', setState: React.Dispatch<React.SetStateAction<{ left: boolean; right: boolean }>>) => {
    if (ref.current) {
      const scrollAmount = direction === 'right' ? 400 : -400;
      ref.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      setTimeout(() => updateArrowVisibility(ref, setState), 300);
    }
  };

  const updateCategoryArrowVisibility = (index: number) => {
    const container = document.getElementById(`scroll-container-${index}`);
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setCategoryArrows(prev => ({
        ...prev,
        [index]: {
          left: scrollLeft > 0,
          right: scrollLeft < scrollWidth - clientWidth - 10
        }
      }));
    }
  };

  const scrollCategoryContainer = (index: number, direction: 'left' | 'right') => {
    const container = document.getElementById(`scroll-container-${index}`);
    if (container) {
      const scrollAmount = direction === 'right' ? 400 : -400;
      container.scrollBy({ left: scrollAmount, behavior: "smooth" });
      setTimeout(() => updateCategoryArrowVisibility(index), 300);
    }
  };

  useEffect(() => {
    updateArrowVisibility(quickScrollRef, setQuickArrows);
    updateArrowVisibility(magicalScrollRef, setMagicalArrows);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center min-h-[70vh] px-4 bg-gradient-to-b from-gray-50 to-white">
        <h1 className="text-4xl md:text-5xl font-bold leading-tight max-w-3xl">
          Discover Your Next Adventure with AI
        </h1>
        <p className="mt-6 text-lg text-gray-600 max-w-2xl">
          Your personal trip planner and travel curator, creating custom
          itineraries tailored to your interests, travel style, and budget
          instantly.
        </p>
        <div className="mt-10 flex gap-4">
          <Link
            href="/create-trip"
            className="px-6 py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition"
          >
            Plan a Trip
          </Link>
          <Link
            href="/auth/login"
            className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            Login
          </Link>
        </div>

        {/* Features Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
          <div className="p-6 rounded-xl bg-white shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-lg">AI-Generated Itineraries</h3>
            <p className="text-gray-600 mt-2 text-sm">
              Get detailed day-wise travel plans created by AI in seconds.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-white shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-lg">Personalized Preferences</h3>
            <p className="text-gray-600 mt-2 text-sm">
              Budget, pace, food, hotels - everything tailored to you.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-white shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-lg">Save & Revisit Trips</h3>
            <p className="text-gray-600 mt-2 text-sm">
              Access all your planned trips anytime from your dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* Get Inspired Section */}
      <section className="py-16 px-4 md:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Get inspired for your next trip</h2>

          {/* Quick Destinations Row with Carousel */}
          <div className="mb-16 relative">
            {/* Left Arrow */}
            {quickArrows.left && (
              <button
                onClick={() => scrollContainer(quickScrollRef, 'left', setQuickArrows)}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gray-800 text-white shadow-xl rounded-full p-3 hover:bg-gray-900 transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <div 
              ref={quickScrollRef} 
              className="overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
              onScroll={() => updateArrowVisibility(quickScrollRef, setQuickArrows)}
            >
              <div className="flex gap-4" style={{ width: 'max-content' }}>
                {/* Anywhere Card */}
                {/* <div
                  onClick={() => router.push("/create-trip")}
                  className="relative cursor-pointer flex-shrink-0 rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300"
                  style={{   width: '320px', height: '240px' }}
                >
                  <div className="w-full h-full bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl mb-2">🌍</div>
                      <h3 className="text-white text-2xl font-bold">Anywhere</h3>
                    </div>
                  </div>
                </div> */}

                {/* Quick Destinations */}
                {quickDestinations.map((dest, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleDestinationClick(dest.name)}
                    className="relative cursor-pointer flex-shrink-0 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group/card"
                    style={{ width: '320px', height: '240px' }}
                  >
                    <img
                      src={dest.image}
                      alt={dest.name}
                      className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    
                    {/* Tag */}
                    {/* <div className="absolute top-4 left-4">
                      <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                        {dest.tag}
                      </span>
                    </div> */}

                    {/* Name */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="pr-24 text-white text-2xl font-bold drop-shadow-lg leading-tight">
                        {dest.name}
                      </h3>
                      <span className="absolute bottom-0 right-0 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-gray-900 opacity-0 translate-y-2 group-hover/card:opacity-100 group-hover/card:translate-y-0 transition-all duration-300">
                        Plan Trip
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Arrow */}
            {quickArrows.right && (
              <button
                onClick={() => scrollContainer(quickScrollRef, 'right', setQuickArrows)}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gray-800 text-white shadow-xl rounded-full p-3 hover:bg-gray-900 transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          

          {/* Categories with Carousel */}
          <div className="space-y-12">
            {categories.map((category, index) => (
              <div key={index} className="relative">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700">
                    <category.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-2xl font-semibold">{category.title}</h3>
                </div>

                {/* Left Arrow */}
                {categoryArrows[index]?.left && (
                  <button
                    onClick={() => scrollCategoryContainer(index, 'left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gray-800 text-white shadow-xl rounded-full p-3 hover:bg-gray-900 transition-all"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}

                {/* Scrollable Container */}
                <div
                  id={`scroll-container-${index}`}
                  className="overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
                  onScroll={() => updateCategoryArrowVisibility(index)}
                >
                  <div className="flex gap-4" style={{ width: 'max-content' }}>
                    {category.destinations.map((dest, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleDestinationClick(dest.name)}
                        className="relative group/card cursor-pointer flex-shrink-0"
                        style={{ width: '320px', height: '240px' }}
                      >
                        <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                          <img
                            src={dest.image}
                            alt={dest.name}
                            className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                          <div className="absolute bottom-4 left-4 right-4">
                            <h4 className="pr-24 text-white text-2xl font-bold drop-shadow-lg leading-tight">
                              {dest.name}
                            </h4>
                            <span className="absolute bottom-0 right-0 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-gray-900 opacity-0 translate-y-2 group-hover/card:opacity-100 group-hover/card:translate-y-0 transition-all duration-300">
                              Plan Trip
                              <ChevronRight className="h-4 w-4" />
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Arrow */}
                {categoryArrows[index]?.right && (
                  <button
                    onClick={() => scrollCategoryContainer(index, 'right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gray-800 text-white shadow-xl rounded-full p-3 hover:bg-gray-900 transition-all"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-black text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="font-bold text-lg mb-2">Choose Destination</h3>
              <p className="text-gray-600 text-sm">
                Pick your dream location from our top destinations
              </p>
            </div>
            <div className="text-center">
              <div className="bg-black text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="font-bold text-lg mb-2">Set Preferences</h3>
              <p className="text-gray-600 text-sm">
                Select days, budget type, and travel companions
              </p>
            </div>
            <div className="text-center">
              <div className="bg-black text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="font-bold text-lg mb-2">Get AI Itinerary</h3>
              <p className="text-gray-600 text-sm">
                AI generates a perfect plan with hotels and activities
              </p>
            </div>
            <div className="text-center">
              <div className="bg-black text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="font-bold text-lg mb-2">Save & Travel</h3>
              <p className="text-gray-600 text-sm">
                Edit, save your trip and start your adventure!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-black to-gray-800 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Plan Your Perfect Trip?
          </h2>
          <p className="text-xl mb-8 text-gray-300">
            Start creating unforgettable memories today with AI-powered planning
          </p>
          <Link
            href="/create-trip"
            className="inline-block px-8 py-4 bg-white text-black rounded-lg font-semibold hover:bg-gray-100 transition-all shadow-lg text-lg"
          >
            Get Started Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-400">
            © 2025 AI Trip Planner. All rights reserved.
          </p>
          <p className="text-gray-500 mt-2 text-sm">
            Made with ❤️ for travelers everywhere
          </p>
        </div>
      </footer>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
