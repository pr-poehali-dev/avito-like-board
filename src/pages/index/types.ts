export const AUTH_URL = "https://functions.poehali.dev/8b2cd80b-f20b-45b5-8696-018d10b4eb52";
export const ADS_URL = "https://functions.poehali.dev/26941b84-1198-4969-8e13-07523f9f04d0";
export const FAV_URL = "https://functions.poehali.dev/47db8eb7-30bf-4234-9cbb-10b2e57a491c";
export const CHAT_URL = "https://functions.poehali.dev/4961a627-e58a-4b80-bafb-720c53fa39f8";
export const PROFILE_URL = "https://functions.poehali.dev/200ceb3d-1623-4a46-8010-118bd4ebb987";

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  cover_url?: string | null;
  city?: string | null;
  about?: string | null;
}

export interface Ad {
  id: number;
  title: string;
  price: number;
  category: string;
  city: string;
  condition: string;
  date: string;
  author?: string;
  status?: string;
  views?: number;
  photos?: string[];
  image?: string;
}

export type Section = "home" | "categories" | "my-ads" | "profile" | "messages" | "favorites" | "contacts";

export interface FavFolder {
  id: number;
  name: string;
  date: string;
  count: number;
}

export interface DbCategory {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  parent_id: number | null;
  ads_count: number;
}

export const FALLBACK_CATEGORIES = [
  { id: "realty", label: "Недвижимость", icon: "Home", count: 0 },
  { id: "auto", label: "Авто", icon: "Car", count: 0 },
  { id: "electronics", label: "Электроника", icon: "Smartphone", count: 0 },
  { id: "clothes", label: "Одежда", icon: "Shirt", count: 0 },
  { id: "furniture", label: "Мебель", icon: "Armchair", count: 0 },
  { id: "services", label: "Услуги", icon: "Wrench", count: 0 },
  { id: "animals", label: "Животные", icon: "PawPrint", count: 0 },
  { id: "hobbies", label: "Хобби", icon: "Music", count: 0 },
];

export const CITIES = ["Все города", "Москва", "СПб", "Казань", "Екатеринбург", "Новосибирск", "Самара"];

export const MY_ADS = [
  { id: 1, title: "iPhone 13 128GB", price: 55000, status: "active", views: 234, date: "10 апр" },
  { id: 2, title: "Ноутбук Lenovo", price: 38000, status: "archived", views: 89, date: "5 апр" },
  { id: 3, title: "Велосипед детский", price: 6500, status: "active", views: 45, date: "2 апр" },
];

export const MESSAGES = [
  { id: 1, name: "Алексей К.", text: "Здравствуйте! Ещё продаёте?", time: "12:34", unread: 2, avatar: "А" },
  { id: 2, name: "Мария П.", text: "Спасибо, уже купила", time: "Вчера", unread: 0, avatar: "М" },
  { id: 3, name: "Дмитрий Р.", text: "Можно снизить цену?", time: "Пн", unread: 1, avatar: "Д" },
];

export function formatPrice(price: number) {
  return price.toLocaleString("ru-RU") + " ₽";
}