const sync = async () => {
  try {
    const res = await fetch("http://127.0.0.1:8000/api/chatbot/sync", {
      method: "POST"
    });
    const data = await res.json();
    console.log(data);
  } catch(e) {
    console.error(e);
  }
};
sync();
