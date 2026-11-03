"use client";

import { useState } from "react";
import { CalendarX2 } from "lucide-react";
import { Dialog } from "@/components/ui/client";
import { Button } from "@/components/ui/primitives";
import { cancelBooking } from "@/lib/actions/amenities";

export function CancelBookingButton({ bookingId, refundable }: { bookingId: string; refundable: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="text-[9.5px] font-semibold text-muted hover:text-[#c43d4d]">Cancel</button>
      <Dialog open={open} onOpenChange={setOpen} title="Cancel this booking?" description={refundable ? "You're more than 24 hours away, so the amount will be refunded to the original payment method." : "This booking is within 24 hours, so the amount is not refundable."} className="max-w-md">
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Keep booking</Button>
          <form action={cancelBooking} className="flex-1"><input type="hidden" name="bookingId" value={bookingId} /><Button type="submit" variant="danger" className="w-full"><CalendarX2 className="size-4" /> Cancel booking</Button></form>
        </div>
      </Dialog>
    </>
  );
}
