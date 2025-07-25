"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import WineSearchBar from "./WineSearchBar";
import AdvancedSearchFilters from "./AdvancedSearchFilters";
import WineList from "./WineList";
import { usePostHog } from "posthog-js/react";

type Wine = {
  wine_id: number;
  name: string;
  classification: string;
  grape: string;
  year: number;
  price: number;
  rating: number;
  region?: string;
  country?: string;
  appelation?: string;
  reviews: string[];
  foodPairings?: string[];
  vineyard?: any;
  vineyard_id?: number;
};

interface HomeProps {
  setCellar: (val: boolean) => void;
  setProfile: (val: boolean) => void;
  username: string;
}

const classificationColors: { [key: string]: string } = {
  Orange: "#ffb347",
  "White - Sparkling": "#e6e6e6",
  Red: "#b22222",
  "White - Off-dry": "#f7e7b0",
  Rosé: "#ff69b4",
  "White - Sweet/Dessert": "#ffe4b5",
  White: "#fffacd",
  "Red - Sweet/Dessert": "#c71585",
  Spirits: "#8b5c2a",
  "Rosé - Sparkling": "#ffb6c1",
};

function Home({ setCellar, setProfile, username }: HomeProps) {
  const [supabase] = useState(() => createClient());
  const [query, setQuery] = useState("");
  const [wines, setWines] = useState<Wine[]>([]);
  const [expandedWineId, setExpandedWineId] = useState<number | null>(null);
  const [filter, setFilter] = useState<
    "name" | "year" | "food" | "vineyard" | "country" | "appelation" | "region"
  >("name");
  // Advanced Search Toggle
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [newReviews, setNewReviews] = useState<{ [wineId: number]: string }>(
    {}
  );
  const [newRatings, setNewRatings] = useState<{ [wineId: number]: number }>(
    {}
  );
  const [toast, setToast] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [foodPairingWines, setFoodPairingWines] = useState<Wine[]>([]);

  const posthog = usePostHog();

  useEffect(() => {
    // Check if user is logged in
    localStorage.getItem("username")
      ? setIsLoggedIn(true)
      : setIsLoggedIn(false);
    const getWines = async () => {
      try {
        const { data: wineList, error } = await supabase
          .from("wine")
          .select("*")
          .not("rating", "is", null)
          .gt("year", 2020)
          .order("rating", { ascending: false })
          .limit(5);

        if (error) {
          console.error("Error fetching wines:", error);
          throw error;
        }

        if (wineList) {
          const wineListWithReviews = wineList.map((wine: any) => ({
            ...wine,
            reviews: [],
          }));

          // Initialize default ratings for all wines
          const initialRatings: { [key: number]: number } = {};
          wineListWithReviews.forEach((wine: any) => {
            initialRatings[wine.wine_id] = 5; // Default rating of 5
          });
          setNewRatings(initialRatings);

          // Fetch foodPairings and vineyard for each wine
          const winesWithDetails = await Promise.all(
            wineListWithReviews.map(async (wine: any) => {
              // Fetch food pairings
              const { data: foodPairingsData, error: foodError } =
                await supabase
                  .from("food-pairing")
                  .select("name")
                  .eq("wine_id", wine.wine_id);

              if (foodError)
                console.error("Error fetching food pairings:", foodError);

              const foodPairings = foodPairingsData
                ? foodPairingsData.map((p: any) => p.name)
                : [];

              // Fetch vineyard info
              let vineyard = null;
              if (wine.vineyard_id) {
                const { data: vineyardData, error: vineyardError } =
                  await supabase
                    .from("vineyard")
                    .select("*")
                    .eq("vineyard_id", wine.vineyard_id)
                    .single();

                if (vineyardError)
                  console.error("Error fetching vineyard:", vineyardError);

                vineyard = vineyardData;
              }

              return {
                ...wine,
                foodPairings,
                vineyard,
                appelation: vineyard?.appelation,
                region: vineyard?.region,
                country: vineyard?.country,
              };
            })
          );

          setWines(winesWithDetails);
        }
      } catch (error) {
        console.error("Error communicating with Supabase", error);
      }
    };

    getWines();
  }, [supabase]);

  // New useEffect for real-time search when in advanced search mode
  useEffect(() => {
    const searchWines = async () => {
      if (!showAdvancedSearch || !query.trim()) {
        return; // Don't search if not in advanced mode or query is empty
      }

      if (typeof window !== "undefined" && (window as any).posthog) {
        (window as any).posthog.capture("advanced_search_query", {
          query,
          filter,
        });
      }

      try {
        console.log(`Searching for wines by ${filter}: ${query}`);

        let supabaseQuery = supabase
          .from("wine")
          .select(
            `
            *,
            vineyard:vineyard_id(*)
          `
          )
          .not("rating", "is", null);
        // Apply filter based on the selected filter type
        switch (filter) {
          case "name":
            supabaseQuery = supabaseQuery
              .not("rating", "is", null)
              .ilike("name", `%${query}%`);
            break;
          case "year":
            supabaseQuery = supabaseQuery
              .not("rating", "is", null)
              .eq("year", parseInt(query) || 0);
            break;
          case "food":
            // For food pairings, we need to join with food-pairing table
            supabaseQuery = supabase
              .from("wine")
              .select(
                `
                *,
                vineyard:vineyard_id(*),
                food_pairings:food-pairing(name)
              `
              )
              .not("rating", "is", null)
              .ilike("food-pairing.name", `%${query}%`);
            break;
          case "vineyard":
            supabaseQuery = supabase
              .from("wine")
              .select(
                `
                *,
                vineyard:vineyard_id(*)
              `
              )
              .not("rating", "is", null)
              .ilike("vineyard.name", `%${query}%`);
            break;
          case "appelation":
            supabaseQuery = supabase
              .from("wine")
              .select(
                `
                *,
                vineyard:vineyard_id(*)
              `
              )
              .not("rating", "is", null)
              .ilike("vineyard.appelation", `%${query}%`);
            break;
          case "region":
            supabaseQuery = supabase
              .from("wine")
              .select(
                `
                *,
                vineyard:vineyard_id(*)
              `
              )
              .not("rating", "is", null)
              .ilike("vineyard.region", `%${query}%`);
            break;
          case "country":
            supabaseQuery = supabase
              .from("wine")
              .select(
                `
                *,
                vineyard:vineyard_id(*)
              `
              )
              .not("rating", "is", null)
              .ilike("vineyard.country", `%${query}%`);
            break;
          default:
            supabaseQuery = supabaseQuery
              .not("rating", "is", null)
              .ilike("name", `%${query}%`);
        }

        const { data: wineList, error } = await supabaseQuery.limit(20);

        if (error) {
          console.error("Error searching wines:", error);
          return;
        }

        if (wineList) {
          const wineListWithReviews = wineList.map((wine: any) => ({
            ...wine,
            reviews: [],
          }));

          // Initialize default ratings for all wines
          const initialRatings: { [key: number]: number } = {};
          wineListWithReviews.forEach((wine: any) => {
            initialRatings[wine.wine_id] = 5; // Default rating of 5
          });
          setNewRatings(initialRatings);

          // Fetch foodPairings for each wine (if not already fetched)
          const winesWithDetails = await Promise.all(
            wineListWithReviews.map(async (wine: any) => {
              let foodPairings = [];

              // If we didn't fetch food pairings in the main query, fetch them separately
              if (filter !== "food") {
                const { data: foodPairingsData, error: foodError } =
                  await supabase
                    .from("food-pairing")
                    .select("name")
                    .eq("wine_id", wine.wine_id);

                if (foodError)
                  console.error("Error fetching food pairings:", foodError);
                foodPairings = foodPairingsData
                  ? foodPairingsData.map((p: any) => p.name)
                  : [];
              } else {
                // Food pairings were already fetched in the main query
                foodPairings = wine.food_pairings
                  ? wine.food_pairings.map((p: any) => p.name)
                  : [];
              }

              return {
                ...wine,
                foodPairings,
                vineyard: wine.vineyard,
                appelation: wine.vineyard?.appelation,
                region: wine.vineyard?.region,
                country: wine.vineyard?.country,
              };
            })
          );

          setWines(winesWithDetails);
        }
      } catch (error) {
        console.error("Error searching wines:", error);
      }
    };

    // Add debouncing to avoid too many requests
    const timeoutId = setTimeout(searchWines, 300);
    return () => clearTimeout(timeoutId);
  }, [query, filter, showAdvancedSearch, supabase]);

  // Add a helper to determine if the user is searching
  const isSearching = showAdvancedSearch || query.trim() !== "";

  const filteredWines = isSearching
    ? wines.filter((w) => {
        const q = query.toLowerCase();
        switch (filter) {
          case "year":
            return w.year?.toString().includes(q);
          case "food":
            return w.foodPairings?.some((food: string) =>
              food.toLowerCase().includes(q)
            );
          case "vineyard":
            return w.vineyard?.name?.toLowerCase().includes(q) ?? false;
          case "country":
            return w.vineyard?.country?.toLowerCase().includes(q) ?? false;
          case "appelation":
            return w.appelation?.toLowerCase().includes(q) ?? false;
          case "region":
            return w.region?.toLowerCase().includes(q) ?? false;
          default:
            return w.name.toLowerCase().includes(q);
        }
      })
    : wines;

  const handleAddToCellar = async (wineId: number) => {
    try {
      const username = localStorage.getItem("username");
      if (!username) {
        setToast("Please log in to add wines to your cellar.");
        setTimeout(() => setToast(null), 2000);
        return;
      }
      // Check if the wine is already in the cellar
      const { data: existingCellar, error: cellarError } = await supabase
        .from("cellar")
        .select("*")
        .eq("username", username)
        .eq("wine_id", wineId)
        .maybeSingle();

      if (cellarError) {
        console.error("Error checking cellar:", cellarError);
        setToast("Failed to check cellar.");
        setTimeout(() => setToast(null), 2000);
        return;
      }

      if (existingCellar) {
        setToast("Wine is already in your cellar.");
        setTimeout(() => setToast(null), 2000);
        return;
      }
      // Add the wine to the cellar
      console.log("Adding wine to cellar:", { username, wineId });
      const { error: addError } = await supabase
        .from("cellar")
        .insert({ username, wine_id: wineId });
      if (addError) {
        console.error("Error adding wine to cellar:", addError);
        setToast("Failed to add wine to cellar.");
        setTimeout(() => setToast(null), 2000);
        return;
      }
      setToast("Wine added to your cellar!");
      setTimeout(() => setToast(null), 2000);
    } catch (error) {
      console.error("Error adding wine to cellar:", error);
      setToast("Failed to add wine to cellar.");
      setTimeout(() => setToast(null), 2000);
    }
  };

  // AI search handler
  const handleAISearch = async (prompt: string) => {
    if (!prompt.trim()) return;

    // PostHog event for AI search
    if (typeof window !== "undefined" && (window as any).posthog) {
      (window as any).posthog.capture("ai_search_query", { query: prompt });
    }

    setAiResponse("");
    setIsAiLoading(true);
    setWines([]);
    try {
      const res = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      let text = "";
      let winesFromAI = [];
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        buffer += chunk;
        // Assume the API streams JSON lines: { text: "...", wines: [...] }
        let lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.text !== undefined) {
              text += data.text;
              setAiResponse((prev) => prev + data.text);
            }
            if (data.wines !== undefined) {
              winesFromAI = data.wines;
              setWines(winesFromAI);
            }
            if (data.foodPairingWines !== undefined) {
              setFoodPairingWines(data.foodPairingWines);
            }
          } catch (e) {
            // Ignore JSON parse errors for incomplete lines
          }
        }
      }
    } catch (err) {
      setAiResponse("Sorry, something went wrong.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#181818] text-[#f1f1f1]">
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <section className="py-20 bg-gradient-to-b from-[#1b1b1b] to-[#141414] text-center rounded-lg shadow-inner">
              <h1 className="text-6xl font-serif text-[#ffccbb] drop-shadow-md mb-3">
                🍷 WineDB
              </h1>
              <p className="text-lg text-[#ffe6dc] italic mb-6">
                Quit whining, starting tasting
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                {isLoggedIn ? (
                  <>
                    <button
                      className="rounded-full px-6 py-3 bg-[#a03e4e] text-white font-semibold shadow-md hover:bg-[#c45768] transition"
                      onClick={() => {
                        router.push("/cellar");
                      }}
                    >
                      My Cellar
                    </button>
                    {/* <button className="rounded-full px-6 py-3 bg-[#a03e4e] text-white font-semibold shadow-md hover:bg-[#c45768] transition">
                      Profile
                    </button> */}
                  </>
                ) : (
                  <button
                    onClick={() => {
                      router.push("/account");
                    }}
                    className="rounded-full px-6 py-3 bg-[#a03e4e] text-white font-semibold shadow-md hover:bg-[#c45768] transition"
                  >
                    Login / Sign Up
                  </button>
                )}
              </div>
            </section>
          </div>
          {!showAdvancedSearch && (
            <div className="text-center mb-4">
              <p className="text-xl text-[#ccc]">
                Let our virtual sommelier help you find the perfect wine:
              </p>
              <br></br>
            </div>
          )}

          <WineSearchBar
            query={query}
            setQuery={setQuery}
            showAdvancedSearch={showAdvancedSearch}
            setShowAdvancedSearch={setShowAdvancedSearch}
            filter={filter}
            setFilter={(value) => {
              // PostHog event for filter change
              if (typeof window !== "undefined" && (window as any).posthog) {
                (window as any).posthog.capture(
                  "advanced_search_filter_change",
                  { filter: value }
                );
              }
              setFilter(value as typeof filter);
            }}
            onSearch={!showAdvancedSearch ? handleAISearch : undefined}
            isLoading={isAiLoading}
          />

          {showAdvancedSearch && (
            <AdvancedSearchFilters
              filter={filter}
              setFilter={(value) => {
                // PostHog event for filter change
                if (typeof window !== "undefined" && (window as any).posthog) {
                  (window as any).posthog.capture(
                    "advanced_search_filter_change",
                    { filter: value }
                  );
                }
                setFilter(value as typeof filter);
              }}
            />
          )}

          {/* AI response streaming text */}
          {!showAdvancedSearch && aiResponse && (
            <div className="mb-6 text-center text-[#ffccbb] text-lg whitespace-pre-line min-h-[2em]">
              {aiResponse}
            </div>
          )}

          {showAdvancedSearch &&
            query.trim() !== "" &&
            filteredWines.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🍷</div>
                <h2 className="text-2xl font-semibold text-[#ccc] mb-2">
                  No wines found
                </h2>
                <p className="text-[#aaa]">
                  Try adjusting your search criteria
                </p>
              </div>
            )}

          <br></br>

          {!showAdvancedSearch && !isSearching && (
            <h2 className="text-2xl font-semibold text-[#ccc] mb-6 text-center">
              Check out some of our favorite wines:
            </h2>
          )}

          <WineList
            wines={filteredWines}
            expandedWineId={expandedWineId}
            setExpandedWineId={setExpandedWineId}
            newRatings={newRatings}
            setNewRatings={setNewRatings}
            newReviews={newReviews}
            setNewReviews={setNewReviews}
            handleAddToCellar={handleAddToCellar}
            classificationColors={classificationColors}
          />

          {!showAdvancedSearch && foodPairingWines.length > 0 && (
            <>
              <h2 className="text-xl font-semibold text-[#ccc] mb-2 text-center">
                Wines that pair with your food:
              </h2>
              <WineList
                wines={foodPairingWines}
                expandedWineId={expandedWineId}
                setExpandedWineId={setExpandedWineId}
                newRatings={newRatings}
                setNewRatings={setNewRatings}
                newReviews={newReviews}
                setNewReviews={setNewReviews}
                handleAddToCellar={handleAddToCellar}
                classificationColors={classificationColors}
              />
            </>
          )}
        </div>

        {toast && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#a03e4e] text-white px-9 py-5 rounded-lg shadow-2xl z-50 text-xl text-center opacity-97 animate-pulse">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
