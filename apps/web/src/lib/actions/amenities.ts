"use server";

import { cancelResidentBooking } from "@/lib/amenity-cancellation";
import { requireResident } from "@/lib/queries";

export async function cancelBooking(formData: FormData) {
  cancelResidentBooking(await requireResident(), String(formData.get("bookingId") ?? ""));
}
