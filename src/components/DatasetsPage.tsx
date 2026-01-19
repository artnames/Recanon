import { useState, useEffect } from "react";
import { Plus, Database, Copy, Check, Lock, Trash2, ChevronRight, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { ScrollArea } from "./ui/scroll-area";
import type { Dataset, DatasetType, DatasetFormData } from "@/types/dataset";
import { normalizeHash } from "@/types/dataset";
import { 
  getAllDatasets, 
  registerDataset, 
  deleteDataset,
  getArtifactsUsingDataset 
} from "@/storage/datasets";

const DATASET_TYPE_LABELS: Record<DatasetType, string> = {
  'csv': 'CSV',
  'json': 'JSON',
  'api-snapshot': 'API Snapshot',
  'onchain-snapshot': 'On-chain Snapshot',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
      {copied ? <Check className="w-3 h-3 text-verified" /> : <Copy className="w-3 h-3" />}
    </Button>
  );
}

function TruncatedHash({ hash }: { hash: string }) {
  const displayHash = hash.length > 24 ? `${hash.slice(0, 20)}...${hash.slice(-4)}` : hash;
  return (
    <div className="flex items-center gap-1">
      <code className="font-mono text-xs text-hash">{displayHash}</code>
      <CopyButton text={hash} />
    </div>
  );
}

interface RegisterDatasetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegister: (data: DatasetFormData) => void;
}

function RegisterDatasetDialog({ open, onOpenChange, onRegister }: RegisterDatasetDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<DatasetType>('csv');
  const [hash, setHash] = useState('');
  const [source, setSource] = useState('');
  const [normalizationNotes, setNormalizationNotes] = useState('');
  const [tags, setTags] = useState('');
  const [hashError, setHashError] = useState<string | null>(null);

  const handleSubmit = () => {
    const normalized = normalizeHash(hash);
    if (!normalized) {
      setHashError('Invalid hash format. Use sha256:xxx or 64-char hex.');
      return;
    }
    setHashError(null);

    onRegister({
      name,
      type,
      hash: normalized,
      source: source || undefined,
      normalizationNotes,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    });

    // Reset form
    setName('');
    setType('csv');
    setHash('');
    setSource('');
    setNormalizationNotes('');
    setTags('');
    onOpenChange(false);
  };

  const isValid = name.trim() && hash.trim() && normalizationNotes.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Register Dataset</DialogTitle>
          <DialogDescription>
            Register an immutable dataset reference. This does not upload or store the actual data.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name *</label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g., S&P 500 (2020-2024)"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Type *</label>
            <Select value={type} onValueChange={(v) => setType(v as DatasetType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="api-snapshot">API Snapshot</SelectItem>
                <SelectItem value="onchain-snapshot">On-chain Snapshot</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">SHA-256 Hash *</label>
            <Input 
              value={hash} 
              onChange={(e) => {
                setHash(e.target.value);
                setHashError(null);
              }}
              placeholder="sha256:a7c9e3f2... or 64-char hex"
              className="font-mono text-sm"
            />
            {hashError && <p className="text-xs text-destructive">{hashError}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Source URL / Description</label>
            <Input 
              value={source} 
              onChange={(e) => setSource(e.target.value)} 
              placeholder="e.g., Yahoo Finance API export"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Normalization Rules *</label>
            <Textarea 
              value={normalizationNotes} 
              onChange={(e) => setNormalizationNotes(e.target.value)} 
              placeholder="Explain exactly what is hashed and how (e.g., CSV sorted by date, LF line endings, UTF-8, hash of raw bytes)"
              className="font-mono text-xs min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tags (comma-separated)</label>
            <Input 
              value={tags} 
              onChange={(e) => setTags(e.target.value)} 
              placeholder="e.g., equity, index, US"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!isValid}>Register Dataset</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DatasetDetailPanelProps {
  dataset: Dataset;
  onClose: () => void;
  onDelete: (id: string) => void;
}

function DatasetDetailPanel({ dataset, onClose, onDelete }: DatasetDetailPanelProps) {
  const artifactIds = getArtifactsUsingDataset(dataset.id);

  return (
    <div className="p-6 space-y-6 border-l border-border h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{dataset.name}</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {DATASET_TYPE_LABELS[dataset.type]}
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Immutable
          </Badge>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Full Hash</label>
          <div className="p-3 rounded-md bg-muted font-mono text-xs break-all flex items-start justify-between gap-2">
            <span className="text-hash">{dataset.hash}</span>
            <CopyButton text={dataset.hash} />
          </div>
        </div>

        {dataset.source && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Source</label>
            <p className="text-sm">{dataset.source}</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Normalization Rules</label>
          <div className="p-3 rounded-md bg-muted font-mono text-xs whitespace-pre-wrap">
            {dataset.normalizationNotes}
          </div>
        </div>

        {dataset.tags && dataset.tags.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Tags</label>
            <div className="flex flex-wrap gap-1">
              {dataset.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Registered</label>
          <p className="text-sm font-mono">{new Date(dataset.registeredAt).toLocaleString()}</p>
        </div>

        <div className="space-y-2 pt-4 border-t border-border">
          <label className="text-xs text-muted-foreground">Used By</label>
          {artifactIds.length > 0 ? (
            <div className="space-y-1">
              {artifactIds.map((id) => (
                <div key={id} className="text-sm font-mono text-hash">{id}</div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No artifacts yet.</p>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <Button 
          variant="outline" 
          size="sm" 
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(dataset.id)}
        >
          <Trash2 className="w-3 h-3 mr-2" />
          Delete Dataset
        </Button>
      </div>
    </div>
  );
}

export function DatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);

  useEffect(() => {
    setDatasets(getAllDatasets());
  }, []);

  const handleRegister = (data: DatasetFormData) => {
    const newDataset = registerDataset(data);
    if (newDataset) {
      setDatasets(getAllDatasets());
    }
  };

  const handleDelete = (id: string) => {
    if (deleteDataset(id)) {
      setDatasets(getAllDatasets());
      if (selectedDataset?.id === id) {
        setSelectedDataset(null);
      }
    }
  };

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Database className="w-5 h-5" />
            Dataset Registry
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Immutable dataset references for certified execution.
          </p>
        </div>
        <Button onClick={() => setRegisterOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Register Dataset
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={selectedDataset ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="rounded-md border border-border bg-card">
            <ScrollArea className="h-[calc(100vh-240px)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Name</TableHead>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead className="w-[200px]">Hash</TableHead>
                    <TableHead className="w-[150px]">Source</TableHead>
                    <TableHead className="w-[120px]">Registered</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {datasets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        No datasets registered. Click "Register Dataset" to add one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    datasets.map((dataset) => (
                      <TableRow 
                        key={dataset.id}
                        className={`cursor-pointer ${selectedDataset?.id === dataset.id ? 'bg-muted' : ''}`}
                        onClick={() => setSelectedDataset(dataset)}
                      >
                        <TableCell className="font-medium">{dataset.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {DATASET_TYPE_LABELS[dataset.type]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <TruncatedHash hash={dataset.hash} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">
                          {dataset.source || '-'}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {new Date(dataset.registeredAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                            <Lock className="w-3 h-3" />
                            Immutable
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>

        {selectedDataset && (
          <div className="lg:col-span-1">
            <div className="rounded-md border border-border bg-card h-[calc(100vh-240px)] overflow-auto">
              <DatasetDetailPanel 
                dataset={selectedDataset} 
                onClose={() => setSelectedDataset(null)}
                onDelete={handleDelete}
              />
            </div>
          </div>
        )}
      </div>

      <RegisterDatasetDialog 
        open={registerOpen} 
        onOpenChange={setRegisterOpen}
        onRegister={handleRegister}
      />
    </div>
  );
}
