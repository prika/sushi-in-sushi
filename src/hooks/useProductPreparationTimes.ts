import { useState, useEffect } from 'react';

interface PreparationTimes {
  [productId: string]: number | null;
}

export function useProductPreparationTimes(productIds: string[]) {
  const [times, setTimes] = useState<PreparationTimes>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (productIds.length === 0) return;

    const fetchTimes = async () => {
      setIsLoading(true);
      try {
        // Fetch in parallel for all products
        const promises = productIds.map(async (id) => {
          try {
            const res = await fetch(`/api/products/${id}/average-time`);
            if (res.ok) {
              const data = await res.json();
              return { id, time: data.averagePreparationTimeMinutes };
            }
          } catch (error) {
            console.error(`Error fetching time for product ${id}:`, error);
          }
          return { id, time: null };
        });

        const results = await Promise.all(promises);
        const timesMap: PreparationTimes = {};
        results.forEach(({ id, time }) => {
          timesMap[id] = time;
        });
        setTimes(timesMap);
      } catch (error) {
        console.error('Error fetching preparation times:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimes();
  }, [productIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return { times, isLoading };
}
