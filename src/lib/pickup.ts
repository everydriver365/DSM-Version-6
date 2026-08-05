export function buildPickup(
  pickupLocation: string | null | undefined,
  address: string | null | undefined,
  postcode: string | null | undefined,
): string {
  return getPickupParts(pickupLocation, address, postcode).full;
}

export function getPickupParts(
  pickupLocation: string | null | undefined,
  address: string | null | undefined,
  postcode: string | null | undefined,
): {
  address: string;
  postcode: string | null;
  full: string;
  hasBoth: boolean;
} {
  if (pickupLocation) {
    return { address: pickupLocation, postcode: null, full: pickupLocation, hasBoth: false };
  }

  const rawAddress = (address ?? "").trim().replace(/\s+/g, " ").replace(/,+$/, "").trim();
  const rawPostcode = (postcode ?? "").trim().replace(/\s+/g, " ");

  const normalisedAddress = rawAddress.toLowerCase().replace(/\s/g, "");
  const normalisedPostcode = rawPostcode.toLowerCase().replace(/\s/g, "");

  const addressHasPostcode = normalisedPostcode && normalisedAddress.includes(normalisedPostcode);

  if (!rawAddress && !rawPostcode) {
    return { address: "No pickup", postcode: null, full: "No pickup", hasBoth: false };
  }
  if (!rawPostcode) {
    return { address: rawAddress, postcode: null, full: rawAddress, hasBoth: false };
  }
  if (!rawAddress) {
    return { address: rawPostcode, postcode: null, full: rawPostcode, hasBoth: false };
  }
  if (addressHasPostcode) {
    return { address: rawAddress, postcode: null, full: rawAddress, hasBoth: false };
  }
  return {
    address: rawAddress,
    postcode: rawPostcode,
    full: `${rawAddress}, ${rawPostcode}`,
    hasBoth: true,
  };
}

