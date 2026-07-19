// ==========================================================
// SISTEMA DE GESTIÓN ACADÉMICA
// UNIVERSIDAD NACIONAL DEL SANTA
// Generador principal del Reporte Excel
// ==========================================================

import * as XLSX from "xlsx-js-style";

import { crearEncabezado } from "./excelHeader";

import {
  configurarImpresion,
  alturaFilas
} from "./excelHelpers";

// Las siguientes funciones se implementarán
// en los siguientes pasos.

import { crearBody } from "./excelBody";
import { crearResumen } from "./excelSummary";
import { crearSesiones } from "./excelSessions";
import { crearIncidencias } from "./excelIncidencias";

//====================================================

export function exportarReporteExcel(datos) {

  const {

  perfil = {},

  filtros = {},

  asistencias = [],
  
  estudiantesFiltrados = [],

  sesionesFiltradas = [],

  sesionesOrdenadas = [],

  reporteMatriz = [],

  obtenerUnidad,

  obtenerTipoSesion,

  construirEncabezadoSesion

} = datos;

  //--------------------------------------------------

  const libro = XLSX.utils.book_new();

  //--------------------------------------------------
  // HOJA RESUMEN
  //--------------------------------------------------

  const wsResumen = XLSX.utils.aoa_to_sheet([]);

  const ultimaColumnaResumen = "J";

  crearEncabezado(wsResumen, {

  universidad: "UNIVERSIDAD NACIONAL DEL SANTA",

  escuela: "ESCUELA PROFESIONAL DE MEDICINA HUMANA",

  sistema: "SISTEMA DE GESTIÓN ACADÉMICA",

  titulo: "REPORTE GENERAL DE ASISTENCIA",

  asignatura: filtros?.asignaturaNombre || "Todas",

  docente: perfil?.nombre || "",

  grupo: filtros?.grupo || "Todos",

  unidad: filtros?.unidad || "Todas",

  semestre: filtros?.semestre || "",

  fecha: new Date().toLocaleString(),

  estudiantes: estudiantesFiltrados.length,

  sesiones: sesionesOrdenadas.length

}, ultimaColumnaResumen);

  crearResumen(
    wsResumen,
    reporteMatriz
  );

  
  configurarImpresion(wsResumen);
  alturaFilas(wsResumen,120);

    XLSX.utils.book_append_sheet(
    libro,
    wsResumen,
    "Resumen"
  );

  //--------------------------------------------------
  // HOJA MATRIZ
  //--------------------------------------------------

  const wsBody = XLSX.utils.aoa_to_sheet([]);

  const ultimaColumnaBody =
  construirEncabezadoSesion
    ? String.fromCharCode(
        65 +
        (4 + sesionesOrdenadas.length + 5)
      )
    : "J";

  crearBody(wsBody, {

  reporteMatriz,

  sesionesOrdenadas,

  construirEncabezadoSesion

});

  configurarImpresion(wsBody);
  alturaFilas(wsBody,300);

  XLSX.utils.book_append_sheet(
    libro,
    wsBody,
    "Asistencia"
  );

  //--------------------------------------------------
  // HOJA SESIONES
  //--------------------------------------------------

  const wsSesiones = XLSX.utils.aoa_to_sheet([]);

  const ultimaColumnaSesiones = "J";

  crearSesiones(wsSesiones, {

  sesionesOrdenadas,

  obtenerUnidad,

  obtenerTipoSesion,

  perfil,

  filtros,

  estudiantesFiltrados

});

  configurarImpresion(wsSesiones);
  alturaFilas(wsSesiones,250);

  XLSX.utils.book_append_sheet(
    libro,
    wsSesiones,
    "Sesiones"
  );

  //--------------------------------------------------
// HOJA INCIDENCIAS DOCENTES
//--------------------------------------------------

const wsIncidencias = XLSX.utils.aoa_to_sheet([]);

crearEncabezado(
  wsIncidencias,
  {
    universidad: "UNIVERSIDAD NACIONAL DEL SANTA",
    escuela: "ESCUELA PROFESIONAL DE MEDICINA HUMANA",
    sistema: "SISTEMA DE GESTIÓN ACADÉMICA",
    titulo: "REPORTE DE INCIDENCIAS DOCENTES",
    asignatura: filtros?.asignaturaNombre || "Todas",
    docente: perfil?.nombre || "",
    grupo: filtros?.grupo || "Todos",
    unidad: filtros?.unidad || "Todas",
    semestre: filtros?.semestre || "",
    fecha: new Date().toLocaleString(),
    estudiantes: estudiantesFiltrados.length,
    sesiones: sesionesOrdenadas.length
  },
  "H"
);


console.log("TOTAL ASISTENCIAS:", asistencias.length);

console.log(
  "TOTAL OBSERVACIONES:",
  asistencias.filter(a =>
    a.observacion &&
    a.observacion.trim() !== ""
  ).length
);

crearIncidencias(wsIncidencias, {

  asistencias,

  sesionesOrdenadas,

  obtenerUnidad,

  obtenerTipoSesion

});

configurarImpresion(wsIncidencias);

alturaFilas(wsIncidencias,150);

XLSX.utils.book_append_sheet(
  libro,
  wsIncidencias,
  "Incidencias"
);
  
  //--------------------------------------------------

  const ahora = new Date();

  const fecha = ahora.toISOString().slice(0,10);

  const hora = ahora.toTimeString().slice(0,8);

  XLSX.writeFile(

    libro,

    `Reporte_Asistencia_UNS_${fecha}_${hora.replace(/:/g,"-")}.xlsx`

  );

}