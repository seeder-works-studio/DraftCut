/*! coi-serviceworker v0.1.7 - Guido Zuidhof, licensed under MIT */
let coepCredentialless = false;
if (typeof window === "undefined") {
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

  self.addEventListener("message", (ev) => {
    if (ev.data && ev.data.type === "deregister") {
      self.registration
        .unregister()
        .then(() => self.clients.matchAll())
        .then((clients) => clients.forEach((client) => client.navigate(client.url)));
    }
  });

  self.addEventListener("fetch", function (event) {
    const r = event.request;
    if (r.cache === "only-if-cached" && r.mode !== "same-origin") return;

    const request =
      coepCredentialless && r.mode === "no-cors"
        ? new Request(r, { credentials: "omit" })
        : r;

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 0) return response;

          const newHeaders = new Headers(response.headers);
          newHeaders.set("Cross-Origin-Embedder-Policy",
            coepCredentialless ? "credentialless" : "require-corp"
          );
          newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        })
        .catch((e) => console.error(e))
    );
  });
} else {
  (() => {
    const reloadedByCOI = window.sessionStorage.getItem("coiReloadedByCOI");
    window.sessionStorage.removeItem("coiReloadedByCOI");

    const coepDegrading = reloadedByCOI === "coepdegrade";

    if (window.crossOriginIsolated !== false || reloadedByCOI) return;

    if (
      window.isSecureContext &&
      navigator.serviceWorker &&
      window.caches
    ) {
      navigator.serviceWorker
        .register(window.document.currentScript.src)
        .then(
          (registration) => {
            if (
              registration.active &&
              !navigator.serviceWorker.controller
            ) {
              window.sessionStorage.setItem("coiReloadedByCOI", coepDegrading ? "coepdegrade" : "true");
              window.location.reload();
            }
          },
          (err) => console.error("COOP/COEP Service Worker failed to register:", err)
        );
    }
  })();
}
