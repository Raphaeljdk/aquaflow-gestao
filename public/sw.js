// Não armazena páginas, credenciais ou dados financeiros. Instalação e modo
// aplicativo apenas; a conexão continua obrigatória para as operações.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
