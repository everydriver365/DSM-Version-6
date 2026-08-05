export function buildPickup(
  pickupLocation: string | null | undefined,
  address: string | null | undefined,
  postcode: string | null | undefined,
): string {
  if (pickupLocation) return pickupLocation;

  const rawAddress = (address ?? "").trim().replace(/\s+/g, " ");
  const rawPostcode = (postcode ?? "").trim().replace(/\s+/g, " ");

  const normalisedAddress = rawAddress.toLowerCase().replace(/\s/g, "");
  const normalisedPostcode = rawPostcode.toLowerCase().replace(/\s/g, "");

  const addressHasPostcode = normalisedPostcode && normalisedAddress.includes(normalisedPostcode);

  const parts = [rawAddress, !addressHasPostcode ? rawPostcode : null].filter(Boolean);
  return parts.join(", ") || "No pickup";
}
