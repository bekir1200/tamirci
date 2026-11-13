// İşletme bilgileri ortam değişkenlerinden okunur. Tanımlı olmayan alanlar arayüzde gösterilmez.
export const operator = {
  name: process.env.NEXT_PUBLIC_OPERATOR_NAME ?? "",
  address: process.env.NEXT_PUBLIC_OPERATOR_ADDRESS ?? "",
  email: process.env.NEXT_PUBLIC_OPERATOR_EMAIL ?? "",
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "",
};
