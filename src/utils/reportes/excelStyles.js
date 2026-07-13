// ==========================================================
// SISTEMA DE GESTIÓN ACADÉMICA
// UNIVERSIDAD NACIONAL DEL SANTA
// Estilos institucionales para Reportes Excel
// ==========================================================

export const COLORES = {
  // Institucionales
  azulInstitucional: "1F4E78",
  azulOscuro: "163A5F",
  azulClaro: "D9EAF7",

  grisClaro: "F3F4F6",
  grisMedio: "D9D9D9",
  grisOscuro: "595959",

  blanco: "FFFFFF",
  negro: "000000",

  verde: "C6EFCE",
  amarillo: "FFEB9C",
  rojo: "FFC7CE",
  celeste: "DDEBF7"
}

//==================================================
// FUENTES
//==================================================

export const FONT = {

  tituloPrincipal: {
    name: "Calibri",
    sz: 16,
    bold: true,
    color: {
      rgb: COLORES.azulInstitucional
    }
  },

  tituloSecundario: {
    name: "Calibri",
    sz: 11,
    bold: true,
    color: {
      rgb: COLORES.azulOscuro
    }
  },

  encabezado: {
    name: "Calibri",
    sz: 9,
    bold: true,
    color: {
        rgb: COLORES.blanco
    }
  },

  normal: {
    name: "Calibri",
    sz: 9,
    color: {
        rgb: COLORES.negro
    }
  },

  negrita: {
    name: "Calibri",
    sz: 9,
    bold: true,
    color: {
        rgb: COLORES.negro
    }
  },

}

//==================================================
// ALINEACIONES
//==================================================

export const ALIGN = {

  centro: {
    horizontal: "center",
    vertical: "center",
    wrapText: true
  },

  izquierda: {
    horizontal: "left",
    vertical: "center",
    wrapText: true
  },

  derecha: {
    horizontal: "right",
    vertical: "center"
  }

}

//==================================================
// BORDES
//==================================================

export const BORDER = {

  fino: {

    top: {
      style: "thin",
      color: {
        rgb: "D9D9D9"
      }
    },

    bottom: {
      style: "thin",
      color: {
        rgb: "D9D9D9"
      }
    },

    left: {
      style: "thin",
      color: {
        rgb: "D9D9D9"
      }
    },

    right: {
      style: "thin",
      color: {
        rgb: "D9D9D9"
      }
    }

  }

}

//==================================================
// RELLENOS
//==================================================

export const FILL = {

  titulo: {

    patternType: "solid",

    fgColor: {
      rgb: COLORES.azulInstitucional
    }

  },

  subtitulo: {

    patternType: "solid",

    fgColor: {
      rgb: COLORES.azulClaro
    }

  },

  encabezado: {

    patternType: "solid",

    fgColor: {
      rgb: COLORES.azulInstitucional
    }

  },

  gris: {

    patternType: "solid",

    fgColor: {
      rgb: COLORES.grisClaro
    }

  },

  presente: {

    patternType: "solid",

    fgColor: {
      rgb: COLORES.verde
    }

  },

  tardanza: {

    patternType: "solid",

    fgColor: {
      rgb: COLORES.amarillo
    }

  },

  falta: {

    patternType: "solid",

    fgColor: {
      rgb: COLORES.rojo
    }

  },

  justificado: {

    patternType: "solid",

    fgColor: {
      rgb: COLORES.celeste
    }

  }

}

//==================================================
// FORMATO DE CELDAS
//==================================================

export const FORMATO = {

  porcentaje: "0.0%",

  entero: "0",

  decimal: "0.00"

}

//==================================================
// ANCHOS DE COLUMNAS
//==================================================

export const COLUMNAS = {

  codigo: 12,

  estudiante: 38,

  grupo: 10,

  asignatura: 28,

  sesion: 12,

  resumen: 12

}