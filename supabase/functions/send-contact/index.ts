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

    const emailData = {
      from: "Sun Is Up <onboarding@resend.dev>",
      to: "info@sunisup.be",
      reply_to: email,
      subject: "Nouvelle demande de contact - Sun Is Up",
      html: emailHtml,
      attachments,
    };

    // Send email with retry logic
    const response = await sendEmailWithRetry(emailData);

    return new Response(
      JSON.stringify({ success: true, id: response.id }),
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