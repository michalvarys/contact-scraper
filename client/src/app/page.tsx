// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { BusinessTable } from '@/components/BusinessTable';
import { Business } from '@/types/business';

export default function Home() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBusinesses() {
      try {
        const response = await fetch('/output/firmy_cz.json');
        if (!response.ok) {
          throw new Error('Failed to fetch businesses');
        }
        const data = await response.json();
        // Pokud je data objekt, převedeme na pole
        const businessArray = Array.isArray(data)
          ? data
          : Object.values(data);

        setBusinesses(businessArray);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load businesses', err);
        setError('Nepodařilo se načíst data firem');
        setIsLoading(false);
      }
    }

    loadBusinesses();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 text-center">
        Načítání dat...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Firmy Karlovy Vary</h1>
      <BusinessTable businesses={businesses} />
    </main>
  );
}