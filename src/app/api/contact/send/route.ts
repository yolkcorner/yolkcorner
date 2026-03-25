import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

interface ContactPayload {
  name?: string;
  email?: string;
  message?: string;
  targetEmail?: string;
}

const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const toSafeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ContactPayload;

    const name = toSafeText(body.name);
    const email = toSafeText(body.email);
    const message = toSafeText(body.message);
    const targetEmail = toSafeText(body.targetEmail);

    if (!name || !email || !message || !targetEmail) {
      return NextResponse.json(
        { error: "กรอกข้อมูลไม่ครบถ้วน" },
        { status: 400 },
      );
    }

    if (!isValidEmail(email) || !isValidEmail(targetEmail)) {
      return NextResponse.json(
        { error: "รูปแบบอีเมลไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    const host = process.env.SMTP_HOST?.trim();
    const portRaw = process.env.SMTP_PORT?.trim();
    const secureRaw = process.env.SMTP_SECURE?.trim().toLowerCase();
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM?.trim() || user;

    const port = Number(portRaw || "0");
    const secure = secureRaw === "true" || port === 465;

    if (!host || !port || !user || !pass || !from) {
      return NextResponse.json(
        {
          error:
            "ระบบอีเมลยังไม่ถูกตั้งค่า กรุณาตั้งค่า SMTP ใน .env.local ก่อนใช้งาน",
        },
        { status: 503 },
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from,
      to: targetEmail,
      replyTo: email,
      subject: `[Website Contact] ${name}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        "",
        "Message:",
        message,
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
          <h2 style="margin: 0 0 12px;">New Contact Message</h2>
          <p style="margin: 0 0 6px;"><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p style="margin: 0 0 12px;"><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p style="margin: 0 0 6px;"><strong>Message:</strong></p>
          <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(message)}</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Contact send error:", error);
    return NextResponse.json(
      { error: "ส่งข้อความไม่สำเร็จ กรุณาลองอีกครั้ง" },
      { status: 500 },
    );
  }
}
