export function sendFbPurchase(
  request: Request,
  o: { eventId: string; valueCents: number; contentName?: string; name?: string; document?: string },
): Promise<void>
