export interface Empleado {
  activo: unknown;
  empleadoId: string;
  empleado: string; //este es el nombre completo
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string;
  fechaIngreso: string;
  fotografiaMiniatura: string | null;
  puesto: Puesto | null;
  jefe: Jefe | null;
  empresa: Empresa;
  lugarDeTrabajo: LugarDeTrabajo;
  correoPersonal: string | null;
}

interface Puesto {
  id: string;
  nombre: string;
}

interface Jefe {
  id: string;
  nombreCompleto: string;
}

interface Empresa {
  id: string;
  razonSocial: string;
}

interface LugarDeTrabajo {
  id: string;
  nombre: string;
}