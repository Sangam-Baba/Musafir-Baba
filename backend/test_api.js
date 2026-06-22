fetch('http://127.0.0.1:8000/api/counter/68e6549442582b78aea7c191')
  .then(res => console.log('Status:', res.status))
  .catch(err => console.error('Fetch error:', err.message));
