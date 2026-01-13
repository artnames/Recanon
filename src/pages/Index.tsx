import { useState, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { StrategiesPanel } from "@/components/StrategiesPanel";
import { BacktestExecutor } from "@/components/BacktestExecutor";
import { ArtifactsList } from "@/components/ArtifactsList";
import { CertifiedArtifact } from "@/components/CertifiedArtifact";
import { VerifyPanel } from "@/components/VerifyPanel";
import { mockStrategies, mockArtifacts, mockArtifact } from "@/data/mockData";
import type { BacktestConfig, ExecutionStep, CertifiedArtifact as ArtifactType } from "@/types/backtest";

export default function Index() {
  const [activeView, setActiveView] = useState("strategies");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactType | null>(null);

  const handleExecute = useCallback(async (config: BacktestConfig) => {
    setIsExecuting(true);
    
    const steps: ExecutionStep[] = [
      { id: '1', label: 'Loading Strategy', status: 'active' },
      { id: '2', label: 'Loading Dataset', status: 'pending' },
      { id: '3', label: 'Initializing Execution Environment', status: 'pending' },
      { id: '4', label: 'Executing Strategy', status: 'pending' },
      { id: '5', label: 'Computing Metrics', status: 'pending' },
      { id: '6', label: 'Generating Verification Hash', status: 'pending' },
      { id: '7', label: 'Sealing Artifact', status: 'pending' },
    ];
    
    setExecutionSteps(steps);

    // Simulate execution steps
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setExecutionSteps(prev => prev.map((step, idx) => {
        if (idx === i) {
          return { 
            ...step, 
            status: 'completed', 
            timestamp: new Date().toLocaleTimeString(),
            hash: idx >= 3 ? `sha256:${Math.random().toString(36).substring(2, 18)}...` : undefined
          };
        }
        if (idx === i + 1) {
          return { ...step, status: 'active' };
        }
        return step;
      }));
    }

    setIsExecuting(false);
    setActiveView('artifacts');
    setSelectedArtifact(mockArtifact);
  }, []);

  const renderContent = () => {
    switch (activeView) {
      case 'strategies':
        return <StrategiesPanel strategies={mockStrategies} />;
      
      case 'execute':
        return (
          <BacktestExecutor
            strategies={mockStrategies}
            onExecute={handleExecute}
            isExecuting={isExecuting}
            executionSteps={executionSteps}
          />
        );
      
      case 'artifacts':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Certified Artifacts</h2>
              <ArtifactsList
                artifacts={mockArtifacts}
                onSelect={setSelectedArtifact}
                selectedId={selectedArtifact?.id}
              />
            </div>
            <div className="lg:col-span-2">
              {selectedArtifact ? (
                <CertifiedArtifact artifact={selectedArtifact} />
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <p className="text-sm">Select an artifact to view details</p>
                </div>
              )}
            </div>
          </div>
        );
      
      case 'verify':
        return <VerifyPanel />;
      
      case 'datasets':
        return (
          <div className="text-muted-foreground">
            <h2 className="text-xl font-semibold text-foreground mb-4">Datasets</h2>
            <p className="text-sm">Dataset management coming soon.</p>
          </div>
        );
      
      case 'settings':
        return (
          <div className="text-muted-foreground">
            <h2 className="text-xl font-semibold text-foreground mb-4">Settings</h2>
            <p className="text-sm">Configuration options coming soon.</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
