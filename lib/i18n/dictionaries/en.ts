import type { Dictionary } from "../types";

const en: Dictionary = {
  stepLabel: (current, total) => `Step ${current} / ${total}`,

  passport: {
    title: "Take a photo of your passport",
    description:
      "Please make sure the photo page is fully visible. We'll automatically read your details.",
    uploadCta: "Tap to take a photo / choose an image",
    uploadAlt: "Uploaded passport photo",
    processing: "Reading your information...",
    recognized: "Recognition complete",
    reviewHint: "Please review and correct the details below if needed.",
    fullNameLabel: "Full name (as printed on passport)",
    passportNumberLabel: "Passport number",
    phoneNumberLabel: "Phone number / contact",
    phoneNumberPlaceholder: "e.g. +1 555-123-4567",
    retake: "Retake photo",
    next: "Continue",
  },

  transfer: {
    title: "Tell us about your transfer",
    description: "Please enter the details we need for your transfer.",
    transferDateLabel: "Transfer date",
    transferDateNote: "Select the date you would like your transfer.",
    roomLabel: "Select your room",
    roomLoading: "Loading rooms...",
    destinationLabel: "Destination",
    destinationLoading: "Loading destinations...",
    flightTimeLabel: "Departure flight time",
    flightTimeOptionalBadge: "Optional",
    flightTimeOptionalNote: "If your flight time isn't decided yet, you can continue without entering it.",
    suggestion: (time) =>
      `To comfortably reach Kansai International Airport, we recommend departing around ${time} (2.5 hours before your flight).`,
    preferredDepartureTimeLabel: "Preferred departure time",
    preferredDepartureTimeRequiredBadge: "Required",
    preferredDepartureTimeNote: "Transfers are available until 10:00 AM. Please select your preferred departure time.",
    preferredDepartureTimePlaceholder: "Select a time",
    checkoutNote: "Check-out is by 10:00 AM.",
    luggageSectionLabel: "Passengers & luggage",
    passengerLabel: "Passengers",
    luggageLargeLabel: "Large suitcases",
    luggageSmallLabel: "Small bags",
    luggageSpecialLabel: "Special items (bicycles, golf bags, etc.)",
    back: "Back",
    confirm: "Review my booking",
  },

  complete: {
    title: "Your booking is confirmed!",
    description: "This is your ride, all set — just show it to our staff when you head out.",
    boardingPass: "Digital Boarding Pass",
    transferTo: (destination) => `Transfer to ${destination}`,
    guestNameLabel: "Guest name",
    guestFallbackName: "Guest",
    roomLabel: "Room",
    preferredDepartureLabel: "Preferred departure time",
    suggestedDepartureLabel: "Recommended departure",
    specifiedDepartureLabel: "Requested departure time",
    flightTimeLabel: "Flight time",
    bookingRefLabel: "Booking ref.",
    passengerCount: (n) => `${n} passenger${n === 1 ? "" : "s"}`,
    luggageTotal: (n) => `${n} item${n === 1 ? "" : "s"} of luggage`,
    destinationPhotoLabel: "Destination",
    roomPhotoLabel: "Room",
    luggageBreakdownLabel: "Luggage breakdown",
    qrHint: "One scan and you're through — smart, swift check-in.",
    note1: "Please contact the front desk if you need to change your booking.",
    note2: "We'll notify you in the app if the pickup time changes.",
  },

  counter: {
    increase: (label) => `Increase ${label}`,
    decrease: (label) => `Decrease ${label}`,
  },

  languageSwitcher: {
    label: "Language",
  },
};

export default en;
