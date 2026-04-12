export const ADS_URL = "https://functions.poehali.dev/26941b84-1198-4969-8e13-07523f9f04d0";
export const FAV_URL = "https://functions.poehali.dev/47db8eb7-30bf-4234-9cbb-10b2e57a491c";

export const CATEGORIES = [
  { id: "realty", label: "Недвижимость" },
  { id: "auto", label: "Авто" },
  { id: "electronics", label: "Электроника" },
  { id: "clothes", label: "Одежда" },
  { id: "furniture", label: "Мебель" },
  { id: "services", label: "Услуги" },
  { id: "animals", label: "Животные" },
  { id: "hobbies", label: "Хобби" },
];

export const CITIES = ["Москва", "СПб", "Казань", "Екатеринбург", "Новосибирск", "Самара"];

export const CONDITIONS = ["Новый", "Отличное", "Хорошее", "Удовлетворительное"];

export interface PhotoItem {
  preview: string;
  mime: string;
  data: string;
}

export interface FavFolder {
  id: number;
  name: string;
  count: number;
}
