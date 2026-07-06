import type { Dictionary } from "../types";

const fr: Dictionary = {
  stepLabel: (current, total) => `Étape ${current} / ${total}`,

  passport: {
    title: "Prenez une photo de votre passeport",
    description:
      "Assurez-vous que la page avec votre photo soit entièrement visible. Nous lirons vos informations automatiquement.",
    uploadCta: "Touchez pour photographier / choisir une image",
    uploadAlt: "Photo de passeport téléchargée",
    processing: "Lecture de vos informations...",
    recognized: "Lecture terminée",
    reviewHint: "Vérifiez et corrigez les informations ci-dessous si nécessaire.",
    fullNameLabel: "Nom complet (tel qu'indiqué sur le passeport)",
    passportNumberLabel: "Numéro de passeport",
    phoneNumberLabel: "Téléphone / contact",
    phoneNumberPlaceholder: "ex. +33 6 12 34 56 78",
    retake: "Reprendre la photo",
    next: "Continuer",
  },

  transfer: {
    title: "Détails de votre transfert",
    description: "Veuillez saisir les informations nécessaires pour votre transfert.",
    transferDateLabel: "Date du transfert",
    transferDateNote: "Sélectionnez la date souhaitée pour votre transfert.",
    roomLabel: "Choisissez votre chambre",
    roomLoading: "Chargement des chambres...",
    destinationLabel: "Destination",
    destinationLoading: "Chargement des destinations...",
    flightTimeLabel: "Heure de départ du vol",
    flightTimeOptionalBadge: "Facultatif",
    flightTimeOptionalNote: "Si l'heure de votre vol n'est pas encore connue, vous pouvez continuer sans la renseigner.",
    suggestion: (time) =>
      `Pour rejoindre l'aéroport international du Kansai sereinement, nous vous recommandons de partir vers ${time} (2,5 heures avant votre vol).`,
    preferredDepartureTimeLabel: "Heure de départ souhaitée",
    preferredDepartureTimeNote: "Si vous avez une heure de prise en charge préférée, sélectionnez-la (facultatif).",
    preferredDepartureTimePlaceholder: "Sélectionnez une heure",
    checkoutNote: "Le départ se fait avant 10h00.",
    luggageSectionLabel: "Passagers et bagages",
    passengerLabel: "Passagers",
    luggageLargeLabel: "Grandes valises",
    luggageSmallLabel: "Petits bagages",
    luggageSpecialLabel: "Articles spéciaux (vélos, sacs de golf, etc.)",
    back: "Retour",
    confirm: "Vérifier ma réservation",
  },

  complete: {
    title: "Votre réservation est confirmée !",
    description: "Voici votre laissez-passer pour le transfert : le jour J, présentez-le à notre équipe avec style.",
    boardingPass: "Digital Boarding Pass",
    transferTo: (destination) => `Transfert vers ${destination}`,
    guestNameLabel: "Nom du client",
    guestFallbackName: "Cher client",
    roomLabel: "Chambre",
    preferredDepartureLabel: "Heure de départ souhaitée",
    suggestedDepartureLabel: "Départ recommandé",
    specifiedDepartureLabel: "Heure de départ indiquée",
    flightTimeLabel: "Heure du vol",
    bookingRefLabel: "N° de réservation",
    passengerCount: (n) => `${n} passager${n === 1 ? "" : "s"}`,
    luggageTotal: (n) => `${n} bagage${n === 1 ? "" : "s"} au total`,
    destinationPhotoLabel: "Destination",
    roomPhotoLabel: "Chambre",
    luggageBreakdownLabel: "Détail des bagages",
    qrHint: "Un scan, et le tour est joué : embarquement intelligent.",
    note1: "Contactez la réception si vous devez modifier votre réservation.",
    note2: "Nous vous informerons dans l'application en cas de changement d'horaire de prise en charge.",
  },

  counter: {
    increase: (label) => `Augmenter ${label}`,
    decrease: (label) => `Diminuer ${label}`,
  },

  languageSwitcher: {
    label: "Langue",
  },
};

export default fr;
