"use client";

import React, { useState } from "react";
import Link from "next/link";
import { trpc } from "@/trpc/trpc";
import { Button } from "@/components/atoms/Button";
import { Loader2, Plus, Trash2, Sparkles } from "lucide-react";
import CreateIcpForm from "./components/CreateIcpForm";

export default function IcpListPage() {
  const { data: profiles, isLoading, refetch } = trpc.icp.list.useQuery();
  const [showCreate, setShowCreate] = useState(false);
  const deleteMutation = trpc.icp.delete.useMutation({
    onSuccess: () => refetch(),
  });

  if (isLoading) {
    return (
      <div className="container py-10 flex items-center justify-center min-h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">ICP Profily</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4 mr-2" />
          Nový ICP profil
        </Button>
      </div>

      {showCreate && (
        <div className="mb-6 p-4 border rounded-lg bg-white shadow-sm">
          <CreateIcpForm
            onSuccess={() => {
              setShowCreate(false);
              refetch();
            }}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {!profiles || profiles.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">Zatím nemáte žádné ICP profily</p>
          <p className="text-sm mt-2">
            Vytvořte si profil ideálního zákazníka a začněte cíleně scrapovat
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {profiles.map((icp) => (
            <Link
              key={icp.id}
              href={`/icp/${icp.id}`}
              className="block p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{icp.name}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {icp.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>Práh: {icp.scoreThreshold}%</span>
                    <span>{icp._count.companyScores} ohodnocených firem</span>
                    <span>{icp._count.scraperTasks} úloh</span>
                    {icp.category && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {icp.category.name}
                      </span>
                    )}
                    {icp.enrichedData && (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        AI Enriched
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm("Opravdu smazat tento ICP profil?")) {
                      deleteMutation.mutate({ id: icp.id });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
