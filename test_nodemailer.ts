import nodemailer from "nodemailer";

async function main() {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const pdfUrl = "https://ffaqsyprvehybfprfmyf.supabase.co/storage/v1/object/public/transferencias_pdfs/T050-test.pdf";

  try {
    const info = await transporter.sendMail({
      from: `"Sistema de Repuestos" <${process.env.EMAIL_USER}>`,
      to: "sergio.araujo@quetalcompra.com",
      subject: "Test email from script",
      html: "<p>Test email</p>",
      attachments: [
        {
          filename: "T050-test.pdf",
          path: pdfUrl,
        }
      ]
    });
    console.log("Email sent successfully:", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

main();
