export interface EstadisticasDetalladas {
    resumen: {
        totalTickets: number;
        ticketsCompletados: number;
        ticketsPendientes: number;
        ticketsVencidos: number;
        tasaResolucion: number; 
    };
    
    tiemposPromedio: {
        tiempoResolucion: number; 
        tiempoAsignacion: number; 
        tiempoProceso: number; 
        tiempoCierre: number; 
    };
    
    distribucionEstatus: Array<{
        estatus: string;
        cantidad: number;
        porcentaje: number;
        color: string;
    }>;
    
    distribucionPrioridad: Array<{
        prioridad: string;
        cantidad: number;
        porcentaje: number;
        color: string;
    }>;
    
    distribucionTipo: Array<{
        tipo: string;
        cantidad: number;
        porcentaje: number;
        color: string;
    }>;
    
    tendenciaMensual: Array<{
        mes: string;
        creados: number;
        resueltos: number;
        tasaResolucion: number;
    }>;
    
    ticketsRapidos: Array<{
        id: string;
        titulo: string;
        tiempoResolucion: number; 
        prioridad: string;
    }>;
    
    ticketsLentos: Array<{
        id: string;
        titulo: string;
        diasPendiente: number;
        prioridad: string;
        vencido: boolean;
    }>;
    
    vencimiento: {
        ticketsVencidos: number;
        ticketsCerraronAntes: number;
        ticketsCerraronDespues: number;
        promedioDiasVencimiento: number;
    };
    
    eficiencia: {
        ticketsPorDia: number;
        tiempoPromedioPorTicket: number; 
        productividad: number; 
        mejoras: string[]; 
    };
    
    histogramaTiempos: Array<{
        rango: string;
        cantidad: number;
        porcentaje: number;
    }>;
}