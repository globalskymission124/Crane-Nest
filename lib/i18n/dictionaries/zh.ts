import type { Dictionary } from "../types";

// 简体中文 (Simplified Chinese)
const zh: Dictionary = {
  stepLabel: (current, total) => `第 ${current} / ${total} 步`,

  passport: {
    title: "请拍摄您的护照",
    description: "请确保护照照片页完整可见，系统将自动读取您的信息。",
    uploadCta: "点击拍照 / 选择图片",
    uploadAlt: "已上传的护照照片",
    processing: "正在读取信息...",
    recognized: "读取完成",
    reviewHint: "如有错误，请在下方修改。",
    fullNameLabel: "姓名（护照上的罗马字拼写）",
    passportNumberLabel: "护照号码",
    phoneNumberLabel: "电话号码／联系方式",
    phoneNumberPlaceholder: "例：090-1234-5678",
    retake: "重新拍摄",
    next: "下一步",
  },

  transfer: {
    title: "请输入接送详情",
    description: "请输入接送预约所需的信息。",
    transferDateLabel: "接送日期",
    transferDateNote: "请选择您希望的接送日期。",
    roomLabel: "选择房间",
    roomLoading: "正在加载房间...",
    destinationLabel: "目的地",
    destinationLoading: "正在加载目的地...",
    flightTimeLabel: "航班起飞时间",
    flightTimeOptionalBadge: "选填",
    flightTimeOptionalNote: "如果航班时间尚未确定，您也可以不填写直接继续。",
    suggestion: (time) =>
      `为确保从容抵达关西国际机场，建议您在 ${time} 出发（即航班起飞前2.5小时）。`,
    preferredDepartureTimeLabel: "希望的出发时间",
    preferredDepartureTimeRequiredBadge: "必填",
    preferredDepartureTimeNote: "接送服务截至早上10:00。请务必选择希望的出发时间。",
    preferredDepartureTimePlaceholder: "请选择时间",
    checkoutNote: "退房时间为早上10点之前。",
    luggageSectionLabel: "人数与行李",
    passengerLabel: "乘车人数",
    luggageLargeLabel: "大型行李箱",
    luggageSmallLabel: "小型随身行李",
    luggageSpecialLabel: "特殊行李（自行车、高尔夫球包等）",
    back: "返回",
    confirm: "确认预约内容",
  },

  complete: {
    title: "预约已完成！",
    description: "这就是你的专属接送通行证，出发当天向工作人员轻松一亮即可。",
    boardingPass: "Digital Boarding Pass",
    transferTo: (destination) => `前往 ${destination} 的接送`,
    guestNameLabel: "客人姓名",
    guestFallbackName: "尊贵的客人",
    roomLabel: "房间",
    preferredDepartureLabel: "希望的出发时间",
    suggestedDepartureLabel: "建议出发时间",
    specifiedDepartureLabel: "您指定的出发时间",
    flightTimeLabel: "航班时间",
    bookingRefLabel: "预约编号",
    passengerCount: (n) => `乘车 ${n} 人`,
    luggageTotal: (n) => `行李 共 ${n} 件`,
    destinationPhotoLabel: "目的地",
    roomPhotoLabel: "房间",
    luggageBreakdownLabel: "行李明细",
    qrHint: "扫码即走，畅享智能出行。",
    note1: "如需变更预约内容，请联系前台。",
    note2: "如接送时间有变动，我们将通过应用内通知告知您。",
  },

  counter: {
    increase: (label) => `增加${label}`,
    decrease: (label) => `减少${label}`,
  },

  languageSwitcher: {
    label: "语言",
  },
};

export default zh;
