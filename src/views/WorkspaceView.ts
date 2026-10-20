import { WorkspaceViewModel } from '../viewmodels/WorkspaceViewModel';

// Declaración global para Chart.js
declare const Chart: any;

export class WorkspaceView {
    private container: HTMLElement;
    private viewModel: WorkspaceViewModel;
    private chartInstance: any = null;

    constructor(container: HTMLElement, viewModel: WorkspaceViewModel) {
        this.container = container;
        this.viewModel = viewModel;
        this.viewModel.subscribe(() => this.render());
    }

    public render(): void {
        this.container.innerHTML = `
            <div class="mb-10">
                <h2 class="text-4xl md:text-5xl font-black font-heading mb-3">Tus Datos, Simplificados.</h2>
                <p class="text-lg text-brand-text font-body max-w-2xl">Sube tus archivos, conecta tus bases de datos y extrae valor inmediato sin configuraciones complejas. DatioLabs hace el trabajo pesado por ti.</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                
                <!-- Área de Ingesta (Drag & Drop) -->
                <div class="lg:col-span-2 brutal-card p-8 flex flex-col justify-center items-center text-center relative overflow-hidden group ${this.viewModel.isDragging ? 'bg-brand-pink/20 border-dashed' : 'bg-brand-purple/10'}" id="drop-zone">
                    <div class="absolute -top-10 -right-10 w-40 h-40 bg-brand-yellow rounded-full border-2 border-brand-black opacity-50 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                    
                    <div class="z-10 bg-white p-4 rounded-full border-2 border-brand-black shadow-brutal-sm mb-6">
                        <svg class="w-8 h-8 text-brand-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                    </div>
                    <h3 class="text-2xl font-black font-heading z-10 mb-2">Arrastra tus archivos aquí</h3>
                    <p class="text-brand-text font-body mb-6 z-10">Soportamos CSV, JSON, Excel y Parquet.</p>
                    <button class="brutal-button bg-brand-cyan z-10" id="btn-upload">Explorar Archivos</button>
                    <input type="file" id="file-input" class="hidden" accept=".csv,.json,.xlsx">
                </div>

                <!-- Resumen de Salud (Stats) -->
                <div class="brutal-card p-8 flex flex-col justify-between bg-white">
                    <div>
                        <h3 class="font-heading font-black text-xl mb-4">Salud del Entorno</h3>
                        <div class="flex items-end gap-2 mb-6">
                            <span class="text-5xl font-black font-heading">${this.viewModel.averageHealth}%</span>
                            <span class="text-sm font-bold text-green-600 mb-1">Óptimo</span>
                        </div>
                        <div class="space-y-4 border-t-2 border-brand-black pt-4">
                            <div class="flex justify-between items-center">
                                <span class="font-body text-sm font-semibold">Total de Filas:</span>
                                <span class="font-body text-sm bg-brand-gray px-2 py-1 rounded border border-brand-black font-bold">${this.viewModel.totalRows.toLocaleString()}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="font-body text-sm font-semibold">Archivos Activos:</span>
                                <span class="font-body text-sm bg-brand-gray px-2 py-1 rounded border border-brand-black font-bold">${this.viewModel.datasets.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Listado de Datasets -->
            <div class="mb-10">
                <div class="flex justify-between items-end mb-6">
                    <h3 class="text-2xl font-black font-heading">Fuentes de Datos</h3>
                    <button class="text-sm font-bold underline hover:text-brand-pink transition-colors">Ver todas</button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    ${this.viewModel.datasets.map(ds => `
                        <div class="brutal-card p-5 flex items-start gap-4">
                            <div class="w-12 h-12 bg-brand-yellow rounded border-2 border-brand-black flex items-center justify-center shrink-0">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            </div>
                            <div class="flex-1">
                                <div class="flex justify-between items-start mb-1">
                                    <h4 class="font-bold font-heading text-lg truncate">${ds.name}</h4>
                                    <span class="tag ${ds.status === 'Listo' ? 'bg-brand-cyan' : 'bg-brand-pink'}">${ds.status}</span>
                                </div>
                                <p class="text-sm text-brand-text font-body">${ds.rowCount.toLocaleString()} filas procesadas</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Gráfico Demo Neo-brutalist -->
            <div class="brutal-card p-6 lg:p-8 bg-white">
                <h3 class="text-2xl font-black font-heading mb-6">Proyección Analítica Básica</h3>
                <div class="h-[300px] w-full">
                    <canvas id="mainChart"></canvas>
                </div>
            </div>
        `;

        this.attachEvents();
        this.renderChart();
    }

    private attachEvents(): void {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        const btnUpload = document.getElementById('btn-upload');

        if (btnUpload && fileInput) {
            btnUpload.addEventListener('click', () => fileInput.click());
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e: Event) => {
                const target = e.target as HTMLInputElement;
                if (target.files && target.files.length > 0) {
                    this.viewModel.handleFileUpload(target.files[0].name);
                }
            });
        }

        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (!this.viewModel.isDragging) this.viewModel.setDragState(true);
            });

            dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                if (this.viewModel.isDragging) this.viewModel.setDragState(false);
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                this.viewModel.setDragState(false);
                if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                    this.viewModel.handleFileUpload(e.dataTransfer.files[0].name);
                }
            });
        }
    }

    private renderChart(): void {
        const canvas = document.getElementById('mainChart') as HTMLCanvasElement;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.color = '#0A0A0A';

        this.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
                datasets: [{
                    label: 'Volumen Ingresado',
                    data: [1200, 1900, 3000, 2500, 4200, 3100],
                    backgroundColor: '#B985FF',
                    borderColor: '#0A0A0A',
                    borderWidth: 2,
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { width: 2, color: '#0A0A0A' },
                        ticks: { font: { weight: 'bold' } }
                    },
                    y: {
                        grid: { color: '#F3F4F6', lineWidth: 2 },
                        border: { display: false },
                        ticks: { font: { weight: 'bold' } }
                    }
                }
            }
        });
    }
}
