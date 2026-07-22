import type { Dictionary } from "../types";

const ko: Dictionary = {
  stepLabel: (current, total) => `${current} / ${total} 단계`,

  passport: {
    title: "여권을 촬영해 주세요",
    description: "사진이 있는 면 전체가 보이도록 촬영해 주세요. 정보를 자동으로 인식합니다.",
    uploadCta: "탭하여 촬영 / 이미지 선택",
    uploadAlt: "업로드된 여권 사진",
    processing: "정보를 읽고 있습니다...",
    recognized: "인식 완료",
    reviewHint: "내용에 오류가 있으면 아래에서 수정해 주세요.",
    fullNameLabel: "성명 (여권에 기재된 로마자)",
    passportNumberLabel: "여권 번호",
    phoneNumberLabel: "전화번호 / 연락처",
    phoneNumberPlaceholder: "예) 010-1234-5678",
    retake: "다시 촬영",
    next: "다음으로",
  },

  transfer: {
    title: "픽업 정보를 입력해 주세요",
    description: "픽업 예약에 필요한 정보를 입력합니다.",
    transferDateLabel: "픽업 희망 날짜",
    transferDateNote: "픽업을 원하시는 날짜를 선택해 주세요.",
    roomLabel: "객실을 선택해 주세요",
    roomLoading: "객실 정보를 불러오는 중...",
    destinationLabel: "목적지",
    destinationLoading: "목적지를 불러오는 중...",
    flightTimeLabel: "출발 항공편 시간",
    flightTimeOptionalBadge: "선택 사항",
    flightTimeOptionalNote: "항공편 시간이 아직 정해지지 않았다면 입력하지 않고 계속 진행하실 수 있습니다.",
    suggestion: (time) =>
      `간사이 국제공항까지 여유롭게 도착하시려면 ${time} 출발을 권장드립니다 (항공편 시간 2.5시간 전).`,
    preferredDepartureTimeLabel: "희망 출발 시간",
    preferredDepartureTimeRequiredBadge: "필수",
    preferredDepartureTimeNote: "픽업 서비스는 오전 10:00까지 가능합니다. 희망 출발 시간을 반드시 선택해 주세요.",
    preferredDepartureTimePlaceholder: "시간을 선택하세요",
    checkoutNote: "체크아웃은 오전 10시까지입니다.",
    luggageSectionLabel: "인원 및 수하물",
    passengerLabel: "탑승 인원",
    luggageLargeLabel: "대형 캐리어",
    luggageSmallLabel: "소형 수하물",
    luggageSpecialLabel: "특수 수하물 (자전거, 골프백 등)",
    back: "뒤로",
    confirm: "예약 내용 확인",
  },

  complete: {
    title: "예약이 완료되었습니다!",
    description: "이것이 당신의 픽업 티켓입니다. 출발 당일 직원에게 스마트하게 보여주세요.",
    boardingPass: "Digital Boarding Pass",
    transferTo: (destination) => `${destination} 행 픽업`,
    guestNameLabel: "고객명",
    guestFallbackName: "고객님",
    roomLabel: "객실",
    preferredDepartureLabel: "희망 출발 시간",
    suggestedDepartureLabel: "권장 출발 시간",
    specifiedDepartureLabel: "지정하신 출발 시간",
    flightTimeLabel: "항공편 시간",
    bookingRefLabel: "예약 번호",
    passengerCount: (n) => `탑승 ${n}명`,
    luggageTotal: (n) => `수하물 총 ${n}개`,
    destinationPhotoLabel: "목적지",
    roomPhotoLabel: "객실",
    luggageBreakdownLabel: "수하물 내역",
    qrHint: "QR 코드 한 번에 스마트한 체크인을 경험하세요.",
    note1: "예약 내용 변경은 프런트로 문의해 주세요.",
    note2: "픽업 시간이 변경될 경우 앱 내 알림으로 안내해 드립니다.",
  },

  counter: {
    increase: (label) => `${label} 늘리기`,
    decrease: (label) => `${label} 줄이기`,
  },

  languageSwitcher: {
    label: "언어",
  },
};

export default ko;
