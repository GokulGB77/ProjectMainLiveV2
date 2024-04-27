// register.js
const form = document.querySelector('form');
const messageElement = document.getElementById('message');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const response = await fetch('/register', {
    method: 'POST',
    body: formData
  });

  const data = await response.json();

  if (response.ok) {
    messageElement.innerText = data.message;
    // Optionally, redirect to another page after successful registration
    // window.location.href = '/success-page';
  } else {
    messageElement.innerText = data.error;
  }
});
