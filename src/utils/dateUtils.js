// src/utils/dateUtils.js
// Utilidades para manejo correcto de fechas en zona horaria Uruguay

/**
 * Obtiene la fecha actual en zona horaria Uruguay (UTC-3)
 */
export const obtenerFechaUruguay = () => {
  const now = new Date();
  // Uruguay UTC-3 (UTC-2 en horario de verano, pero usaremos UTC-3 como estándar)
  const uruguayOffset = -3 * 60; // -3 horas en minutos
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const uruguayTime = new Date(utc + (uruguayOffset * 60000));
  return uruguayTime;
};

/**
 * Convierte una fecha UTC a zona horaria Uruguay
 */
export const convertirAUruguay = (fechaUTC) => {
  if (!fechaUTC) return null;
  
  const fecha = new Date(fechaUTC);
  const uruguayOffset = -3 * 60; // -3 horas en minutos
  const utc = fecha.getTime() + (fecha.getTimezoneOffset() * 60000);
  const uruguayTime = new Date(utc + (uruguayOffset * 60000));
  return uruguayTime;
};

/**
 * Formatea fecha para mostrar en la interfaz (formato Uruguay)
 */
export const formatearFechaUruguay = (fecha, opciones = {}) => {
  // Si no hay fecha, usar fecha actual de Uruguay
  if (!fecha) {
    fecha = obtenerFechaUruguay();
  }
  
  // Si es string, convertir a Date
  const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
  
  const defaultOpciones = {
    year: 'numeric',
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Montevideo'
  };

  return fechaObj.toLocaleDateString('es-UY', { ...defaultOpciones, ...opciones });
};

/**
 * Formatea solo la fecha (sin hora)
 */
export const formatearSoloFecha = (fecha) => {
  return formatearFechaUruguay(fecha, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Formatea solo la hora
 */
export const formatearSoloHora = (fecha) => {
  return formatearFechaUruguay(fecha, {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formatea fecha relativa (hace X tiempo)
 */
export const formatearFechaRelativa = (fecha) => {
  const fechaUY = fecha instanceof Date ? fecha : convertirAUruguay(fecha);
  if (!fechaUY) return '';

  const ahora = obtenerFechaUruguay();
  const diferencia = ahora.getTime() - fechaUY.getTime();
  const minutos = Math.floor(diferencia / 60000);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);

  if (minutos < 1) return 'Ahora mismo';
  if (minutos < 60) return `Hace ${minutos} min`;
  if (horas < 24) return `Hace ${horas}h`;
  if (dias < 7) return `Hace ${dias} días`;
  
  return formatearSoloFecha(fechaUY);
};

/**
 * Obtiene timestamp para guardar en base de datos
 */
export const obtenerTimestampUruguay = () => {
  return obtenerFechaUruguay().toISOString();
};

/**
 * Formatea fecha para chat (día + hora)
 */
export const formatearFechaChat = (fecha) => {
  if (!fecha) return '';
  
  // Usar directamente la fecha con timeZone para evitar doble conversión
  const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
  
  const ahora = new Date();
  
  // Comparar fechas usando toDateString con timeZone
  const fechaUYString = fechaObj.toLocaleDateString('es-UY', { timeZone: 'America/Montevideo' });
  const ahoraUYString = ahora.toLocaleDateString('es-UY', { timeZone: 'America/Montevideo' });
  
  if (fechaUYString === ahoraUYString) {
    // Es hoy, mostrar solo hora
    return fechaObj.toLocaleTimeString('es-UY', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/Montevideo'
    });
  } else {
    // Es otro día, mostrar fecha y hora
    return fechaObj.toLocaleDateString('es-UY', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Montevideo'
    });
  }
};

/**
 * Formatea fecha para documentos oficiales
 */
export const formatearFechaDocumento = (fecha) => {
  return formatearFechaUruguay(fecha, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};