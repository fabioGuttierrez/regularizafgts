import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LeadPayload {
  nome: string;
  email: string;
  telefone?: string;
  cnpj?: string;
  mensagem?: string;
  origem: string;
  score?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildTeamNotification(lead: LeadPayload): string {
  const origemLabel =
    lead.origem === "simulador"
      ? "Simulador de Risco"
      : "Formulário de Diagnóstico";
  const nome = escapeHtml(lead.nome);
  const email = escapeHtml(lead.email);

  let rows = `
    <tr><td style="padding:12px 16px;border-bottom:1px solid #eee;color:#888;font-size:13px;width:130px;">Nome</td><td style="padding:12px 16px;border-bottom:1px solid #eee;font-weight:600;color:#1a1a1a;">${nome}</td></tr>
    <tr><td style="padding:12px 16px;border-bottom:1px solid #eee;color:#888;font-size:13px;">E-mail</td><td style="padding:12px 16px;border-bottom:1px solid #eee;"><a href="mailto:${email}" style="color:#1E5AFA;text-decoration:none;">${email}</a></td></tr>`;

  if (lead.telefone) {
    const tel = escapeHtml(lead.telefone);
    rows += `<tr><td style="padding:12px 16px;border-bottom:1px solid #eee;color:#888;font-size:13px;">Telefone</td><td style="padding:12px 16px;border-bottom:1px solid #eee;"><a href="tel:${tel}" style="color:#1E5AFA;text-decoration:none;">${tel}</a></td></tr>`;
  }
  if (lead.cnpj) {
    rows += `<tr><td style="padding:12px 16px;border-bottom:1px solid #eee;color:#888;font-size:13px;">CNPJ</td><td style="padding:12px 16px;border-bottom:1px solid #eee;color:#1a1a1a;">${escapeHtml(lead.cnpj)}</td></tr>`;
  }
  if (lead.score) {
    const scoreColors: Record<string, string> = {
      baixo: "#22c55e",
      medio: "#eab308",
      alto: "#f97316",
      critico: "#ef4444",
    };
    const color = scoreColors[lead.score] || "#888";
    rows += `<tr><td style="padding:12px 16px;border-bottom:1px solid #eee;color:#888;font-size:13px;">Nível de Risco</td><td style="padding:12px 16px;border-bottom:1px solid #eee;"><span style="display:inline-block;background:${color};color:#fff;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:700;text-transform:uppercase;">${escapeHtml(lead.score)}</span></td></tr>`;
  }
  if (lead.mensagem) {
    rows += `<tr><td style="padding:12px 16px;border-bottom:1px solid #eee;color:#888;font-size:13px;vertical-align:top;">Mensagem</td><td style="padding:12px 16px;border-bottom:1px solid #eee;color:#1a1a1a;">${escapeHtml(lead.mensagem)}</td></tr>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <div style="background:#0B1D3A;padding:28px 24px;text-align:center;">
    <h1 style="color:#fff;margin:0 0 8px;font-size:20px;font-weight:700;">Novo Lead Recebido</h1>
    <span style="display:inline-block;background:rgba(255,255,255,0.15);color:#8899B0;padding:4px 14px;border-radius:20px;font-size:12px;">${origemLabel}</span>
  </div>
  <div style="padding:4px 8px;">
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
  </div>
  <div style="padding:16px 24px 24px;text-align:center;">
    <a href="mailto:${email}" style="display:inline-block;background:#1E5AFA;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Responder Lead</a>
  </div>
  <div style="background:#f8f9fa;padding:14px;text-align:center;font-size:11px;color:#999;">RegularizaFGTS — Sistema de Notificações</div>
</div></body></html>`;
}

function buildLeadConfirmation(lead: LeadPayload): string {
  const nome = escapeHtml(lead.nome.split(" ")[0]);
  const whatsappNumber = Deno.env.get("WHATSAPP_NUMBER") || "5500000000000";

  let scoreSection = "";
  if (lead.score) {
    const scoreLabels: Record<string, string> = {
      baixo: "Baixo",
      medio: "Médio",
      alto: "Alto",
      critico: "Crítico",
    };
    const scoreColors: Record<string, string> = {
      baixo: "#22c55e",
      medio: "#eab308",
      alto: "#f97316",
      critico: "#ef4444",
    };
    const label = scoreLabels[lead.score] || lead.score;
    const color = scoreColors[lead.score] || "#888";
    scoreSection = `<div style="background:#f8f9fa;border-left:4px solid ${color};padding:16px;margin:20px 0;border-radius:0 8px 8px 0;">
      <p style="margin:0;font-size:14px;color:#666;">Resultado do seu Simulador de Risco:</p>
      <p style="margin:8px 0 0;font-size:18px;font-weight:700;color:${color};">Nível ${label}</p>
    </div>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <div style="background:#0B1D3A;padding:28px 24px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">Regulariza<span style="color:#FF6B2C;">FGTS</span></h1>
  </div>
  <div style="padding:28px 24px;">
    <h2 style="color:#0B1D3A;font-size:18px;margin:0 0 16px;">Olá, ${nome}!</h2>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px;">Recebemos seu contato com sucesso. Nossa equipe de especialistas em regularização de FGTS já está analisando o seu caso.</p>
    ${scoreSection}
    <h3 style="color:#0B1D3A;font-size:15px;margin:24px 0 12px;">Próximos passos:</h3>
    <table style="width:100%;">
      <tr><td style="padding:8px 12px 8px 0;vertical-align:top;width:28px;"><span style="display:inline-block;background:#1E5AFA;color:#fff;width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;">1</span></td><td style="padding:8px 0;color:#555;font-size:14px;">Nosso especialista vai analisar sua situação</td></tr>
      <tr><td style="padding:8px 12px 8px 0;vertical-align:top;"><span style="display:inline-block;background:#1E5AFA;color:#fff;width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;">2</span></td><td style="padding:8px 0;color:#555;font-size:14px;">Entraremos em contato em até 24 horas úteis</td></tr>
      <tr><td style="padding:8px 12px 8px 0;vertical-align:top;"><span style="display:inline-block;background:#1E5AFA;color:#fff;width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;">3</span></td><td style="padding:8px 0;color:#555;font-size:14px;">Você receberá um diagnóstico completo e gratuito</td></tr>
    </table>
    <div style="text-align:center;margin:28px 0 8px;">
      <a href="https://wa.me/${whatsappNumber}?text=Ol%C3%A1%2C%20acabei%20de%20solicitar%20um%20diagn%C3%B3stico%20pelo%20site" style="display:inline-block;background:#25D366;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Falar pelo WhatsApp</a>
    </div>
    <p style="text-align:center;color:#999;font-size:12px;margin:8px 0 0;">Prefere atendimento imediato? Clique acima.</p>
  </div>
  <div style="background:#f8f9fa;padding:16px 24px;text-align:center;font-size:11px;color:#999;line-height:1.5;">
    RegularizaFGTS — Consultoria especializada em regularização de FGTS<br>
    Este é um e-mail automático, por favor não responda.
  </div>
</div></body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { lead, type } = await req.json();

    if (!lead?.nome || !lead?.email || !isValidEmail(lead.email)) {
      return new Response(
        JSON.stringify({ error: "Dados inválidos" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const validType = ["formulario", "simulador"].includes(type)
      ? type
      : "formulario";

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    const FROM_EMAIL =
      Deno.env.get("FROM_EMAIL") || "naoresponda@regularizafgts.com.br";
    const TEAM_EMAIL = Deno.env.get("TEAM_EMAIL");

    if (!BREVO_API_KEY || !TEAM_EMAIL) {
      throw new Error("Missing email configuration");
    }

    const leadData: LeadPayload = {
      nome: lead.nome,
      email: lead.email,
      telefone: lead.telefone || undefined,
      cnpj: lead.cnpj || undefined,
      mensagem: lead.mensagem || undefined,
      origem: validType,
      score: lead.score || undefined,
    };

    // Send team notification
    const teamResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "RegularizaFGTS", email: FROM_EMAIL },
        to: [{ email: TEAM_EMAIL }],
        subject: `Novo Lead: ${leadData.nome.slice(0, 50)} — ${
          validType === "simulador" ? "Simulador" : "Diagnóstico"
        }`,
        htmlContent: buildTeamNotification(leadData),
      }),
    });

    if (!teamResponse.ok) {
      throw new Error(`Brevo API error: ${teamResponse.status}`);
    }

    // Send confirmation to lead (best-effort — don't fail if this errors)
    let confirmationSent = false;
    try {
      const leadResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": BREVO_API_KEY,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: "RegularizaFGTS", email: FROM_EMAIL },
          to: [{ email: leadData.email, name: leadData.nome }],
          subject: "Recebemos seu contato — RegularizaFGTS",
          htmlContent: buildLeadConfirmation(leadData),
        }),
      });
      confirmationSent = leadResponse.ok;
    } catch {
      // Confirmation email is best-effort
    }

    return new Response(
      JSON.stringify({ success: true, confirmationSent }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Falha no envio de e-mail" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
