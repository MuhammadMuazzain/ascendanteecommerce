export const toSlug = (text: string) => {
  return text
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .replace(/-+/g, "-");
};
