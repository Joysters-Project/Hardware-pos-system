(async () => {
  const res = await fetch('http://localhost:5000/api/bills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [],
      subtotal: 0,
      discount: 0,
      total_amount: 0,
      amount_paid: 0,
      balance_due: 0,
    }),
  });

  console.log('status', res.status);
  console.log(await res.text());
})();
