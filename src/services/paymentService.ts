export async function initiatePayment(orderId: string, phone: string, amount: number, provider: string = 'shwary') {
  try {
    const response = await fetch('/api/payment/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        phone,
        amount,
        provider,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de l\'initialisation du paiement');
    }
    return data;
  } catch (err: any) {
    console.error('Payment initiation error:', err);
    throw err;
  }
}
