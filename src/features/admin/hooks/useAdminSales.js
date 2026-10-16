import { getAllSlides } from "../api/slidesApi";
import { useSuspenseQuery } from "@tanstack/react-query";

export function useAdminSales() {
  const { data } = useSuspenseQuery({
    queryKey: ["admin-sales"],
    queryFn: getAllSlides,
  });

  return { sales: data.data };
}
