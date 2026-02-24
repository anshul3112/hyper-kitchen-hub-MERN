export async function callMockPayment() {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ paymentStatus: "done" }), 3000);
  });
} 
