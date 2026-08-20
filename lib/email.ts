import { Resend } from "resend";

// Emails are sent with Resend (free tier available). To use your own SMTP
// server instead, replace the body of sendEmail with Nodemailer.
async function sendEmail(to: string, subject: string, html: string) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  await resend.emails.send({
    from: process.env.EMAIL_FROM || "KIDA Welfare <onboarding@resend.dev>",
    to,
    subject,
    html,
  });
}

// Shared visual language, mirroring the "Classical" design system
// (serif headings, parchment ground, gold accent).
const C = {
  bg: "#f3f2f2",
  text: "#201f1d",
  accent: "#b68235",
  accent700: "#7d5411",
  muted: "#7d7979",
  divider: "#d7d3d3",
};

function shell(inner: string) {
  return `
  <div style="background:${C.bg};padding:32px 16px;font-family:Georgia,'Times New Roman',serif;color:${C.text}">
    <div style="max-width:560px;margin:auto;background:${C.bg};border:1px solid ${C.divider};border-radius:4px;padding:44px 48px">
      <div style="text-align:center;font-size:22px;letter-spacing:.04em">KIDA WELFARE ASSOCIATION</div>
      <hr style="height:1px;border:0;background:${C.divider};margin:20px 0 32px">
      ${inner}
      <hr style="height:1px;border:0;background:${C.divider};margin:28px 0 16px">
      <p style="font-size:12px;color:${C.muted};text-align:justify;margin:0">
        Questions about records or your number: Michael Kibigo, Communication
        and Record Keeping Officer. Questions about contributions: Eugene
        Simiyu, Treasurer.
      </p>
    </div>
  </div>`;
}

export async function sendWelcomeEmail(opts: {
  to: string;
  fullName: string;
  memberNumber: string;
}) {
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal`;
  const firstName = opts.fullName.split(" ")[0];
  const issued = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  await sendEmail(
    opts.to,
    `Welcome to KIDA Welfare — your member number is ${opts.memberNumber}`,
    shell(`
      <p style="font-size:15px">Dear ${firstName},</p>
      <p style="font-size:15px;text-align:justify">Your registration is complete
        and your $100 registration contribution has been received. You have been
        entered in the register as a full member.</p>
      <div style="border:1px solid ${C.accent};border-radius:4px;padding:20px;text-align:center;margin:26px 0">
        <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${C.accent700}">Member number</div>
        <div style="font-size:38px;margin-top:6px">${opts.memberNumber}</div>
        <div style="font-size:12px;color:${C.muted}">Registered ${issued}</div>
      </div>
      <p style="font-size:15px;text-align:justify">Sign in to the member portal
        to view your statement, make contributions and download receipts. Your
        username is the email address this message was sent to.</p>
      <div style="text-align:center;margin:28px 0">
        <a href="${portalUrl}" style="display:inline-block;border:1px solid ${C.accent};color:${C.accent};text-decoration:none;padding:10px 20px;border-radius:4px;font-size:14px">Open the member portal</a>
      </div>`)
  );
}

export async function sendContributionReceipt(opts: {
  to: string;
  fullName: string;
  memberNumber: string;
  amountCents: number;
}) {
  const amount = (opts.amountCents / 100).toFixed(2);
  const firstName = opts.fullName.split(" ")[0];
  await sendEmail(
    opts.to,
    `KIDA Welfare — contribution of $${amount} received`,
    shell(`
      <p style="font-size:15px">Dear ${firstName},</p>
      <p style="font-size:15px;text-align:justify">Thank you — we have received
        your contribution of <strong>$${amount}</strong>. It has been recorded
        against member number ${opts.memberNumber} and appears on your statement
        in the member portal.</p>`)
  );
}
