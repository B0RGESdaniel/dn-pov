"use client";

import { useEffect } from "react";

// Sem isso, sair do admin e apertar "voltar" no navegador pode restaurar a
// página anterior direto do bfcache — sem passar pela rede, então o
// proxy.ts nunca roda de novo pra checar a sessão (que já foi derrubada no
// logout). Forçar um reload na restauração faz a navegação virar uma
// requisição de verdade, que o proxy intercepta normalmente.
export function BfcacheGuard() {
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        window.location.reload();
      }
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return null;
}
