async function test() {
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@gmail.com',
        password: 'admin'
      })
    });
    const data = await res.json();
    console.log('LOGIN RESPONSE STATUS:', res.status);
    console.log('LOGIN RESPONSE DATA:', data);
  } catch (err) {
    console.error('FETCH ERROR:', err.message);
  }
}
test();
