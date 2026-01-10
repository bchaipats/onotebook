import { useQuery } from "@tanstack/react-query";
import { getLLMProviders } from "@/lib/api";

export function useLLMProviders() {
  return useQuery({
    queryKey: ["llm-providers"],
    queryFn: getLLMProviders,
    staleTime: 30000, // Cache for 30 seconds
  });
}
