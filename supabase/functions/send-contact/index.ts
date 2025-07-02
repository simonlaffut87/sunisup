import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { Resend } from "npm:resend@2.1.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") || "");

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

async function sendEmailWithRetry(emailData: any, retryCount = 0): Promise<any> {
  try {
    if (!Deno.env.get("RESEND_API_KEY")) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    return await resend.emails.send(emailData);
  } catch (error) {
    console.error(`Email send attempt ${retryCount + 1} failed:`, {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    if (retryCount < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`Retrying email send attempt ${retryCount + 1} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return sendEmailWithRetry(emailData, retryCount + 1);
    }
    throw error;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }), 
        { 
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const contentType = req.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return new Response(
        JSON.stringify({ error: "Content-Type must be application/json" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const {
      email,
      message,
      billFile,
      meterFile,
      additionalFile,
    }: {
      email: string;
      message?: string;
      billFile?: string;
      meterFile?: string;
      additionalFile?: string;
    } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }), 
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }), 
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Email HTML pour l'équipe Sun Is Up
    const emailHtml = `
      <h2>Nouvelle demande de contact</h2>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong> ${message || "Aucun message fourni"}</p>
      <h3>Fichiers joints:</h3>
      <ul>
        <li>Facture: ${billFile ? "Oui" : "Non"}</li>
        <li>Photo compteur: ${meterFile ? "Oui" : "Non"}</li>
        <li>Document supplémentaire: ${additionalFile ? "Oui" : "Non"}</li>
      </ul>
    `;

    // Email de confirmation pour l'expéditeur
    const confirmationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #F59E0B; margin: 0;">Sun Is Up</h1>
          <p style="color: #6B7280; margin: 5px 0;">Communauté d'énergie bruxelloise</p>
        </div>
        
        <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 20px; margin-bottom: 30px;">
          <h2 style="color: #92400E; margin-top: 0;">Merci pour votre demande de contact !</h2>
          <p style="color: #78350F; margin-bottom: 0;">
            Nous avons bien reçu votre message et nous vous contacterons dans les plus brefs délais.
          </p>
        </div>
        
        <div style="background-color: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h3 style="color: #374151; margin-top: 0;">Récapitulatif de votre demande :</h3>
          <p><strong>Email :</strong> ${email}</p>
          <p><strong>Message :</strong> ${message || "Aucun message fourni"}</p>
          <p><strong>Documents joints :</strong></p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Facture d'électricité : ${billFile ? "✅ Fournie" : "❌ Non fournie"}</li>
            <li>Photo du compteur : ${meterFile ? "✅ Fournie" : "❌ Non fournie"}</li>
            <li>Document supplémentaire : ${additionalFile ? "✅ Fourni" : "❌ Non fourni"}</li>
          </ul>
        </div>
        
        <div style="background-color: #ECFDF5; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h3 style="color: #065F46; margin-top: 0;">Prochaines étapes :</h3>
          <ol style="color: #047857; margin: 0; padding-left: 20px;">
            <li>Notre équipe va analyser votre demande</li>
            <li>Nous vous contacterons sous 48h pour discuter de votre projet</li>
            <li>Si votre profil correspond, nous vous proposerons un rendez-vous</li>
            <li>Nous vous accompagnerons dans votre adhésion à la communauté</li>
          </ol>
        </div>
        
        <div style="text-align: center; padding: 20px; border-top: 1px solid #E5E7EB;">
          <p style="color: #6B7280; margin: 0;">
            <strong>Sun Is Up ASBL</strong><br>
            Communauté d'énergie bruxelloise<br>
            📧 info@sunisup.be | 📞 +32 471 31 71 48
          </p>
          <p style="color: #9CA3AF; font-size: 12px; margin-top: 15px;">
            Cet email de confirmation a été envoyé automatiquement. 
            Si vous n'avez pas fait cette demande, vous pouvez ignorer ce message.
          </p>
        </div>
      </div>
    `;

    const attachments: { filename: string; content: string }[] = [];

    // Validate and process attachments
    const processAttachment = (file: string | undefined, filename: string) => {
      if (!file) return;
      try {
        const parts = file.split("base64,");
        if (parts.length !== 2) {
          throw new Error("Invalid base64 format");
        }
        attachments.push({
          filename,
          content: parts[1],
        });
      } catch (error) {
        console.error(`Error processing ${filename}:`, error);
        throw new Error(`Failed to process ${filename}: ${error.message}`);
      }
    };

    try {
      processAttachment(billFile, "facture.pdf");
      processAttachment(meterFile, "compteur.jpg");
      processAttachment(additionalFile, "document-supplementaire.pdf");
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "File processing error", message: error.message }), 
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Email pour l'équipe Sun Is Up
    const teamEmailData = {
      from: "Sun Is Up <onboarding@resend.dev>",
      to: "info@sunisup.be",
      reply_to: email,
      subject: "Nouvelle demande de contact - Sun Is Up",
      html: emailHtml,
      attachments,
    };

    // Email de confirmation pour l'expéditeur
    const confirmationEmailData = {
      from: "Sun Is Up <onboarding@resend.dev>",
      to: email,
      subject: "Confirmation de votre demande - Sun Is Up",
      html: confirmationHtml,
    };

    // Send both emails with retry logic
    const [teamResponse, confirmationResponse] = await Promise.all([
      sendEmailWithRetry(teamEmailData),
      sendEmailWithRetry(confirmationEmailData)
    ]);

    return new Response(
      JSON.stringify({ 
        success: true, 
        teamEmailId: teamResponse.id,
        confirmationEmailId: confirmationResponse.id,
        message: "Emails envoyés avec succès"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error in send-contact function:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Determine appropriate error message and status code
    let errorMessage = "Failed to send email";
    let statusCode = 500;

    if (!Deno.env.get("RESEND_API_KEY")) {
      errorMessage = "Email service not configured";
      statusCode = 503;
    } else if (error.name === "ResendError") {
      errorMessage = "Email service error";
      statusCode = 503;
    } else if (error.name === "TypeError" && error.message.includes("fetch")) {
      errorMessage = "Network connectivity issue";
      statusCode = 503;
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        message: error.message,
        code: error.code || "UNKNOWN_ERROR"
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});