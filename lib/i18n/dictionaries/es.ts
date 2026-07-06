import type { Dictionary } from "../types";

const es: Dictionary = {
  stepLabel: (current, total) => `Paso ${current} / ${total}`,

  passport: {
    title: "Toma una foto de tu pasaporte",
    description:
      "Asegúrate de que la página con tu foto sea completamente visible. Leeremos tus datos automáticamente.",
    uploadCta: "Toca para fotografiar / elegir una imagen",
    uploadAlt: "Foto del pasaporte subida",
    processing: "Leyendo tu información...",
    recognized: "Lectura completada",
    reviewHint: "Revisa y corrige los datos a continuación si es necesario.",
    fullNameLabel: "Nombre completo (como aparece en el pasaporte)",
    passportNumberLabel: "Número de pasaporte",
    phoneNumberLabel: "Teléfono / contacto",
    phoneNumberPlaceholder: "p. ej. +34 612 345 678",
    retake: "Tomar otra foto",
    next: "Continuar",
  },

  transfer: {
    title: "Cuéntanos sobre tu traslado",
    description: "Introduce los datos necesarios para tu traslado.",
    transferDateLabel: "Fecha del traslado",
    transferDateNote: "Selecciona la fecha en que deseas el traslado.",
    roomLabel: "Selecciona tu habitación",
    roomLoading: "Cargando habitaciones...",
    destinationLabel: "Destino",
    destinationLoading: "Cargando destinos...",
    flightTimeLabel: "Hora de salida del vuelo",
    flightTimeOptionalBadge: "Opcional",
    flightTimeOptionalNote: "Si aún no conoces la hora de tu vuelo, puedes continuar sin indicarla.",
    suggestion: (time) =>
      `Para llegar con tranquilidad al Aeropuerto Internacional de Kansai, te recomendamos salir alrededor de las ${time} (2.5 horas antes de tu vuelo).`,
    preferredDepartureTimeLabel: "Hora de salida preferida",
    preferredDepartureTimeNote: "Si tienes una hora de recogida preferida, selecciónala (opcional).",
    preferredDepartureTimePlaceholder: "Selecciona una hora",
    checkoutNote: "El check-out es antes de las 10:00 a. m.",
    luggageSectionLabel: "Pasajeros y equipaje",
    passengerLabel: "Pasajeros",
    luggageLargeLabel: "Maletas grandes",
    luggageSmallLabel: "Bolsas pequeñas",
    luggageSpecialLabel: "Artículos especiales (bicicletas, bolsas de golf, etc.)",
    back: "Atrás",
    confirm: "Revisar mi reserva",
  },

  complete: {
    title: "¡Tu reserva está confirmada!",
    description: "Este es tu pase de traslado: el día de salida, muéstraselo a nuestro personal con estilo.",
    boardingPass: "Digital Boarding Pass",
    transferTo: (destination) => `Traslado a ${destination}`,
    guestNameLabel: "Nombre del huésped",
    guestFallbackName: "Estimado/a huésped",
    roomLabel: "Habitación",
    preferredDepartureLabel: "Hora de salida preferida",
    suggestedDepartureLabel: "Salida recomendada",
    specifiedDepartureLabel: "Hora de salida indicada",
    flightTimeLabel: "Hora del vuelo",
    bookingRefLabel: "N.º de reserva",
    passengerCount: (n) => `${n} pasajero${n === 1 ? "" : "s"}`,
    luggageTotal: (n) => `${n} pieza${n === 1 ? "" : "s"} de equipaje`,
    destinationPhotoLabel: "Destino",
    roomPhotoLabel: "Habitación",
    luggageBreakdownLabel: "Detalle del equipaje",
    qrHint: "Un escaneo y listo: check-in inteligente.",
    note1: "Contacta con la recepción si necesitas cambiar tu reserva.",
    note2: "Te avisaremos en la aplicación si cambia la hora de recogida.",
  },

  counter: {
    increase: (label) => `Aumentar ${label}`,
    decrease: (label) => `Disminuir ${label}`,
  },

  languageSwitcher: {
    label: "Idioma",
  },
};

export default es;
