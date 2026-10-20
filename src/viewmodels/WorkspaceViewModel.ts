import { DataModel, DatasetInfo } from '../models/DataModel';

type Listener = () => void;

export class WorkspaceViewModel {
    private model: DataModel;
    private listeners: Listener[] = [];
    public isDragging: boolean = false;

    constructor(model: DataModel) {
        this.model = model;
    }

    subscribe(listener: Listener): void {
        this.listeners.push(listener);
    }

    private notify(): void {
        this.listeners.forEach(l => l());
    }

    get datasets(): DatasetInfo[] {
        return this.model.getDatasets();
    }

    get totalRows(): number {
        return this.datasets.reduce((acc, ds) => acc + ds.rowCount, 0);
    }

    get averageHealth(): number {
        if (this.datasets.length === 0) return 0;
        const total = this.datasets.reduce((acc, ds) => acc + ds.healthScore, 0);
        return Math.round(total / this.datasets.length);
    }

    setDragState(state: boolean): void {
        this.isDragging = state;
        this.notify();
    }

    handleFileUpload(fileName: string): void {
        // Simular ingesta
        this.model.addDataset(fileName, Math.floor(Math.random() * 5000) + 100);
        this.notify();

        // Simular procesamiento async
        setTimeout(() => {
            const ds = this.datasets[this.datasets.length - 1];
            this.model.updateDatasetStatus(ds.id, 'Listo');
            this.notify();
        }, 2000);
    }
}
