import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Consulta de cartão | Início" },
    { name: "description", content: "Inicie sua consulta e acompanhe as etapas da solicitação de cartão." },
    { property: "og:title", content: "Consulta de cartão | Início" },
    { property: "og:description", content: "Inicie sua consulta e acompanhe as etapas da solicitação de cartão." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Index,
});

function Index() {
  if (typeof window !== "undefined") {
    window.location.replace("/funil/1/index.html" + window.location.search);
  }
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", color: "#002279" }}>
      Carregando…
    </div>
  );
}
