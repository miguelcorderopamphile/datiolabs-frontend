import { api, ConfigInfo, RUBRO_ABASTO, RUBRO_LICORERIA, RUBRO_PANADERIA, RUBRO_RETAIL } from './api';

export class NegocioModel {
    private config: ConfigInfo | null = null;
    private rol: 'caja' | 'panel' = 'caja';
    private tasa: number = 0;
    private oyentes: (() => void)[] = [];

    suscribir(fn: () => void): () => void {
        this.oyentes.push(fn);
        return () => this.desuscribir(fn);
    }

    desuscribir(fn: () => void): void {
        this.oyentes = this.oyentes.filter((f) => f !== fn);
    }

    private notificar(): void {
        this.oyentes.forEach((f) => f());
    }

    async cargarConfig(): Promise<ConfigInfo | null> {
        this.config = await api.config();
        return this.config;
    }

    getConfig(): ConfigInfo | null {
        return this.config;
    }

    async inicializar(nombre: string, rubros: number, pin: string, licenciaClave?: string, privacidadInventario?: boolean): Promise<void> {
        await api.inicializar(nombre, rubros, pin, licenciaClave, privacidadInventario);
        await this.cargarConfig();
        this.notificar();
    }

    get rubroAbasto(): boolean {
        return true;
    }

    tieneRubro(_bit: number): boolean {
        return true;
    }

    tieneCapacidad(bit: number): boolean {
        if (!this.config?.capacidades) return true;
        return (this.config.capacidades & bit) !== 0;
    }

    setRol(rol: 'caja' | 'panel'): void {
        this.rol = rol;
        this.notificar();
    }

    get rolActual(): 'caja' | 'panel' {
        return this.rol;
    }

    setTasa(valor: number): void {
        this.tasa = valor;
        this.notificar();
    }

    get tasaActual(): number {
        return this.tasa;
    }

    bs(usd: string | number): string {
        const v = Number(usd) * this.tasa;
        return v.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    hasPinSet(): boolean {
        return Boolean(this.config?.tienePin);
    }

    async verificarPin(pin: string): Promise<boolean> {
        return api.validarPin(pin);
    }
}

export { RUBRO_ABASTO, RUBRO_PANADERIA, RUBRO_LICORERIA, RUBRO_RETAIL };
