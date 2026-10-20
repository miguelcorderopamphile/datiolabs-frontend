export interface DatasetInfo {
    id: string;
    name: string;
    rowCount: number;
    status: 'Ingiriendo' | 'Listo' | 'Error';
    healthScore: number;
}

export class DataModel {
    private datasets: DatasetInfo[] = [];

    constructor() {
        // Estado inicial simulado
        this.datasets = [
            { id: 'ds-1', name: 'Ventas_Q3_2026.csv', rowCount: 14200, status: 'Listo', healthScore: 92 },
            { id: 'ds-2', name: 'Usuarios_Activos.json', rowCount: 530, status: 'Listo', healthScore: 100 }
        ];
    }

    getDatasets(): DatasetInfo[] {
        return this.datasets;
    }

    addDataset(name: string, rowCount: number): void {
        this.datasets.push({
            id: `ds-${Date.now()}`,
            name,
            rowCount,
            status: 'Ingiriendo',
            healthScore: Math.floor(Math.random() * 20) + 80
        });
    }

    updateDatasetStatus(id: string, status: DatasetInfo['status']): void {
        const ds = this.datasets.find(d => d.id === id);
        if (ds) ds.status = status;
    }
}
