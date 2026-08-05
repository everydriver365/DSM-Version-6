export function buildPickup(
  pickupLocation: string | null | undefined,
  address: string | null | undefined,
  postcode: string | null | undefined,
): string {
  if (pickupLocation) return pickupLocation;

  const rawAddress = (address ?? "").trim().replace(/\s+/g, " ").replace(/,+$/, "").trim();
  const rawPostcode = (postcode ?? "").trim().replace(/\s+/g, " ");

  const normalisedAddress = rawAddress.toLowerCase().replace(/\s/g, "");
  const normalisedPostcode = rawPostcode.toLowerCase().replace(/\s/g, "");

  const addressHasPostcode = normalisedPostcode && normalisedAddress.includes(normalisedPostcode);

  if (!rawAddress && !rawPostcode) return "No pickup";
  if (!rawPostcode) return rawAddress;
  if (!rawAddress) return rawPostcode;
  if (addressHasPostcode) return rawAddress;
  return `${rawAddress}, ${rawPostcode}`;

}
