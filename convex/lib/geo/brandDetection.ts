export function detectBrand(responseText: string, brandName: string): boolean {
  if (!responseText || !brandName) return false;
  return responseText.toLowerCase().includes(brandName.toLowerCase());
}
