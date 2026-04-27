import { enviarCorreoTransferencia } from "./src/lib/email";

async function main() {
  console.log("Iniciando prueba de envio...");
  try {
    await enviarCorreoTransferencia({
      sucursalDestino: "Ica",
      identifier: "T050-TEST",
      bultos: "2",
      empresa: "Shalom",
      ordenVenta: "123",
      factura: "F001",
      pdfFileName: "T050-TEST" // If this doesn't exist, it might fail? Let's use an empty string to avoid URL fetch error first.
    });
    console.log("Prueba finalizada");
  } catch (e) {
    console.error("Fallo:", e);
  }
}

main();
