import { Facebook, Instagram, Twitter, MessageCircle } from "lucide-react";

export const VIJAYAJALAKAM_CONTACT = {
  EMAIL: "vijayajalakamsupport@gmail.com",
  PHONE: "918281088823",
  PHONE_DISPLAY: "+(91) 82810 88823",
  ADDRESS: "Hilite Mall, Kozhikode, Kerala, India",
  WHATSAPP: {
    NUMBER: "918281088823",
    MESSAGE: "Hello! I am interested in a private demo of the Vijayajalakam booking ecosystem.",
    get link() {
      return `https://wa.me/${this.NUMBER}?text=${encodeURIComponent(this.MESSAGE)}`;
    },
    get rawLink() {
      return `https://wa.me/${this.NUMBER}`;
    }
  },
  SOCIAL_LINKS: [
    { icon: Facebook, label: "Facebook", url: "#" },
    { icon: Instagram, label: "Instagram", url: "https://www.instagram.com/fabriowninfo" },
    { icon: Twitter, label: "Twitter", url: "#" },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      url: `https://wa.me/918281088823?text=${encodeURIComponent("Hello! I am interested in a private demo of the Vijayajalakam booking ecosystem.")}`,
    },
  ],
};
