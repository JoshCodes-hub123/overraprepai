import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type:
    | "purchase_confirmation"
    | "application_approved"
    | "application_rejected"
    | "withdrawal_approved"
    | "withdrawal_rejected"
    | "quiz_purchased"
    | "welcome"
    | "question_reported"
    | "school_approved"
    | "school_rejected";
  to: string;
  data: Record<string, any>;
  userId?: string;
}

const getNotificationContent = (type: string, data: Record<string, any>): { title: string; message: string; notificationType: string; link?: string } => {
  switch (type) {
    case "purchase_confirmation":
      return {
        title: "Token Purchase Confirmed!",
        message: `Your purchase of ${data.tokens} tokens has been approved and credited to your wallet.`,
        notificationType: "success",
        link: "/student/dashboard",
      };
    case "application_approved":
      return {
        title: "Tutor Application Approved!",
        message: `Congratulations! Your tutor application has been approved. You now have full access to the tutor dashboard.`,
        notificationType: "success",
        link: "/tutor/dashboard",
      };
    case "application_rejected":
      return {
        title: "Tutor Application Update",
        message: `Your tutor application was not approved. ${data.adminNotes ? `Feedback: ${data.adminNotes}` : "You can reapply with updated qualifications."}`,
        notificationType: "warning",
      };
    case "withdrawal_approved":
      return {
        title: "Withdrawal Approved!",
        message: `Your withdrawal request of ₦${data.amount} has been approved and is being processed.`,
        notificationType: "success",
        link: "/tutor/dashboard",
      };
    case "withdrawal_rejected":
      return {
        title: "Withdrawal Request Update",
        message: `Your withdrawal request of ₦${data.amount} could not be processed. ${data.adminNotes || "Please contact support."}`,
        notificationType: "error",
      };
    case "quiz_purchased":
      return {
        title: "Quiz Unlocked!",
        message: `You've unlocked "${data.quizTitle}" for ${data.tokensSpent} tokens. Start practicing now!`,
        notificationType: "success",
        link: "/student/dashboard",
      };
    case "welcome":
      return {
        title: "Welcome to OverraPrep AI!",
        message: `You've received 50 free tokens to get started. Begin your exam preparation journey today!`,
        notificationType: "info",
        link: "/dashboard",
      };
    case "question_reported":
      return {
        title: "New Question Report",
        message: `A student has reported an issue with one of your questions: ${data.reason}`,
        notificationType: "warning",
        link: "/tutor/dashboard",
      };
    case "school_approved":
      return {
        title: "School Approved!",
        message: `${data.schoolName} has been approved. You can now access the full school management dashboard.`,
        notificationType: "success",
        link: "/school/dashboard",
      };
    case "school_rejected":
      return {
        title: "School Application Update",
        message: `Your application for ${data.schoolName} was not approved at this time. ${data.adminNotes || "Please contact support."}`,
        notificationType: "warning",
        link: "/school/register",
      };
    default:
      return {
        title: "Notification",
        message: "You have a new notification.",
        notificationType: "info",
      };
  }
};

const getEmailContent = (type: string, data: Record<string, any>) => {
  switch (type) {
    case "purchase_confirmation":
      return {
        subject: "Token Purchase Confirmed - OverraPrep AI",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #8B5CF6; margin: 0;">OverraPrep AI</h1>
              <p style="color: #666; margin: 5px 0;">FUTA Exam Preparation Platform</p>
            </div>
            
            <h2 style="color: #333;">Purchase Confirmed! 🎉</h2>
            
            <p>Hi there,</p>
            
            <p>Great news! Your token purchase has been approved and credited to your wallet.</p>
            
            <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Tokens Purchased:</strong> ${data.tokens} tokens</p>
              <p style="margin: 0 0 10px 0;"><strong>Amount Paid:</strong> ₦${data.amount}</p>
              <p style="margin: 0;"><strong>Payment Reference:</strong> ${data.reference}</p>
            </div>
            
            <p>You can now use these tokens to access premium quizzes and boost your exam preparation!</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.dashboardUrl}" style="background: #8B5CF6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Dashboard</a>
            </div>
            
            <p style="color: #666; font-size: 14px;">If you have any questions, feel free to reach out to our support team.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} OverraPrep AI - FUTA. All rights reserved.
            </p>
          </div>
        `,
      };

    case "application_approved":
      return {
        subject: "Congratulations! Your Tutor Application is Approved - OverraPrep AI",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #8B5CF6; margin: 0;">OverraPrep AI</h1>
              <p style="color: #666; margin: 5px 0;">FUTA Exam Preparation Platform</p>
            </div>
            
            <h2 style="color: #22c55e;">🎉 Application Approved!</h2>
            
            <p>Hi ${data.name},</p>
            
            <p>Congratulations! We're thrilled to welcome you to the OverraPrep AI tutor community.</p>
            
            <p>Your application has been reviewed and approved. You now have full access to the tutor dashboard where you can:</p>
            
            <ul style="color: #333; line-height: 1.8;">
              <li>Create courses and topics</li>
              <li>Upload quiz questions</li>
              <li>Set prices for premium content</li>
              <li>Track your earnings and analytics</li>
            </ul>
            
            ${data.tutorCode ? `
            <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #666;">Your Unique Tutor Code</p>
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #22c55e;">${data.tutorCode}</p>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.dashboardUrl}" style="background: #8B5CF6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Access Tutor Dashboard</a>
            </div>
            
            <p>We're excited to see the valuable content you'll create for our students!</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} OverraPrep AI - FUTA. All rights reserved.
            </p>
          </div>
        `,
      };

    case "application_rejected":
      return {
        subject: "Update on Your Tutor Application - OverraPrep AI",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #8B5CF6; margin: 0;">OverraPrep AI</h1>
              <p style="color: #666; margin: 5px 0;">FUTA Exam Preparation Platform</p>
            </div>
            
            <h2 style="color: #333;">Application Update</h2>
            
            <p>Hi ${data.name},</p>
            
            <p>Thank you for your interest in becoming a tutor on OverraPrep AI. After careful review, we're unable to approve your application at this time.</p>
            
            ${data.adminNotes ? `
            <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; font-weight: bold;">Feedback:</p>
              <p style="margin: 0; color: #666;">${data.adminNotes}</p>
            </div>
            ` : ''}
            
            <p>This doesn't mean the door is closed! You're welcome to reapply in the future with updated qualifications or additional experience.</p>
            
            <p>In the meantime, you can continue using OverraPrep AI as a student to prepare for your exams.</p>
            
            <p style="color: #666;">Best regards,<br>The OverraPrep AI Team</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} OverraPrep AI - FUTA. All rights reserved.
            </p>
          </div>
        `,
      };

    case "withdrawal_approved":
      return {
        subject: "Withdrawal Request Approved - OverraPrep AI",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #8B5CF6; margin: 0;">OverraPrep AI</h1>
              <p style="color: #666; margin: 5px 0;">FUTA Exam Preparation Platform</p>
            </div>
            
            <h2 style="color: #22c55e;">Withdrawal Approved! 💰</h2>
            
            <p>Hi ${data.name},</p>
            
            <p>Your withdrawal request has been approved and is being processed.</p>
            
            <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Amount:</strong> ₦${data.amount}</p>
              <p style="margin: 0 0 10px 0;"><strong>Bank:</strong> ${data.bankName}</p>
              <p style="margin: 0;"><strong>Account:</strong> ${data.accountNumber}</p>
            </div>
            
            <p>The funds should reflect in your account within 1-3 business days.</p>
            
            <p>Thank you for being a valued tutor on OverraPrep AI!</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} OverraPrep AI - FUTA. All rights reserved.
            </p>
          </div>
        `,
      };

    case "withdrawal_rejected":
      return {
        subject: "Withdrawal Request Update - OverraPrep AI",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #8B5CF6; margin: 0;">OverraPrep AI</h1>
              <p style="color: #666; margin: 5px 0;">FUTA Exam Preparation Platform</p>
            </div>
            
            <h2 style="color: #333;">Withdrawal Request Update</h2>
            
            <p>Hi ${data.name},</p>
            
            <p>Unfortunately, your withdrawal request could not be processed at this time.</p>
            
            <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Amount Requested:</strong> ₦${data.amount}</p>
              ${data.adminNotes ? `<p style="margin: 0;"><strong>Reason:</strong> ${data.adminNotes}</p>` : ''}
            </div>
            
            <p>Please review the feedback and submit a new request if applicable. If you have questions, please contact support.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} OverraPrep AI - FUTA. All rights reserved.
            </p>
          </div>
        `,
      };

    case "quiz_purchased":
      return {
        subject: `Quiz Purchased: ${data.quizTitle} - OverraPrep AI`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #0f9b8e; margin: 0;">OverraPrep AI</h1>
              <p style="color: #666; margin: 5px 0;">FUTA Exam Preparation Platform</p>
            </div>
            
            <h2 style="color: #22c55e;">Quiz Unlocked! 🎯</h2>
            
            <p>Hi ${data.studentName},</p>
            
            <p>You've successfully unlocked a new quiz! Here are the details:</p>
            
            <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Quiz:</strong> ${data.quizTitle}</p>
              <p style="margin: 0 0 10px 0;"><strong>Course:</strong> ${data.courseName}</p>
              <p style="margin: 0 0 10px 0;"><strong>Questions:</strong> ${data.questionCount}</p>
              <p style="margin: 0 0 10px 0;"><strong>Duration:</strong> ${data.duration} minutes</p>
              <p style="margin: 0;"><strong>Tokens Spent:</strong> ${data.tokensSpent} tokens</p>
            </div>
            
            <p>Start practicing now to boost your exam confidence!</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.dashboardUrl}" style="background: #0f9b8e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Start Quiz</a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} OverraPrep AI - FUTA. All rights reserved.
            </p>
          </div>
        `,
      };

    case "welcome":
      return {
        subject: "Welcome to OverraPrep AI! 🎓",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #0f9b8e; margin: 0;">OverraPrep AI</h1>
              <p style="color: #666; margin: 5px 0;">FUTA Exam Preparation Platform</p>
            </div>
            
            <h2 style="color: #0f9b8e;">Welcome to OverraPrep AI! 🎉</h2>
            
            <p>Hi ${data.name},</p>
            
            <p>Welcome to OverraPrep AI - your AI-powered CBT exam preparation companion!</p>
            
            <p>Here's what you can do:</p>
            
            <ul style="color: #333; line-height: 1.8;">
              <li>📚 Practice with thousands of past questions</li>
              <li>🧠 Get AI-powered explanations for every answer</li>
              <li>⏱️ Take CBT simulation tests under real exam conditions</li>
              <li>📊 Track your progress and identify weak areas</li>
            </ul>
            
            <div style="background: #f0f9ff; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #666;">You've received</p>
              <p style="margin: 0; font-size: 32px; font-weight: bold; color: #0f9b8e;">50 Free Tokens</p>
              <p style="margin: 10px 0 0 0; color: #666;">to get you started!</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.dashboardUrl}" style="background: #0f9b8e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Start Learning</a>
            </div>
            
            <p style="color: #666;">Best of luck with your exams!<br>The OverraPrep AI Team</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} OverraPrep AI - FUTA. All rights reserved.
            </p>
          </div>
        `,
      };

    case "question_reported":
      return {
        subject: "New Question Report - OverraPrep AI",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #8B5CF6; margin: 0;">OverraPrep AI</h1>
              <p style="color: #666; margin: 5px 0;">FUTA Exam Preparation Platform</p>
            </div>
            
            <h2 style="color: #f59e0b;">⚠️ New Question Report</h2>
            
            <p>Hi ${data.tutorName},</p>
            
            <p>A student has reported an issue with one of your questions. Please review it at your earliest convenience.</p>
            
            <div style="background: #fef3cd; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Question:</strong></p>
              <p style="margin: 0 0 15px 0; color: #333; font-style: italic;">"${data.questionText.substring(0, 150)}${data.questionText.length > 150 ? '...' : ''}"</p>
              <p style="margin: 0 0 10px 0;"><strong>Reason:</strong> ${data.reason}</p>
              ${data.description ? `<p style="margin: 0;"><strong>Details:</strong> ${data.description}</p>` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.dashboardUrl}" style="background: #8B5CF6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Review Report</a>
            </div>
            
            <p style="color: #666; font-size: 14px;">Addressing student feedback helps maintain the quality of your content and improves the learning experience.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} OverraPrep AI - FUTA. All rights reserved.
            </p>
          </div>
        `,
      };

    case "school_approved":
      return {
        subject: `Your school is approved — ${data.schoolName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1e3a8a; margin: 0;">OverraPrep AI</h1>
              <p style="color: #666; margin: 5px 0;">School Management Suite</p>
            </div>
            <h2 style="color: #16a34a;">School Approved</h2>
            <p>Hi ${data.ownerName || "there"},</p>
            <p>Great news — <strong>${data.schoolName}</strong> has been approved on OverraPrep AI. You now have full access to the school management dashboard, including classes, students, attendance, results, and branded report cards.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.dashboardUrl}" style="background: #1e3a8a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Open School Dashboard</a>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} OverraPrep AI. All rights reserved.</p>
          </div>
        `,
      };

    case "school_rejected":
      return {
        subject: `Update on your school application — ${data.schoolName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1e3a8a; margin: 0;">OverraPrep AI</h1>
              <p style="color: #666; margin: 5px 0;">School Management Suite</p>
            </div>
            <h2 style="color: #333;">Application Update</h2>
            <p>Hi ${data.ownerName || "there"},</p>
            <p>Thank you for applying with <strong>${data.schoolName}</strong>. After review, we are unable to approve the application at this time.</p>
            ${data.adminNotes ? `<div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0;"><strong>Reviewer notes:</strong><p style="margin:8px 0 0;color:#555;">${data.adminNotes}</p></div>` : ""}
            <p>You can update your details and resubmit at any time.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} OverraPrep AI. All rights reserved.</p>
          </div>
        `,
      };

    default:
      throw new Error(`Unknown email type: ${type}`);
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- AUTH GUARD ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ") || !SUPABASE_URL || !Deno.env.get("SUPABASE_ANON_KEY")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const authedClient = createClient(
      SUPABASE_URL!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await authedClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const callerId = claimsData.claims.sub as string;

    const { type, to, data, userId }: EmailRequest = await req.json();
    console.log(`Sending ${type} notification to ${to}`, userId ? `(user: ${userId})` : "");

    // Self-targeted "welcome" allowed; everything else requires admin role
    const isSelfWelcome = type === "welcome" && userId && userId === callerId;
    if (!isSelfWelcome) {
      const adminClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      const { data: roles } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", callerId);
      const isAdmin = roles?.some((r: any) => r.role === "admin");
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }
    // --- END AUTH GUARD ---

    // Create in-app notification if userId is provided
    if (userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const notificationContent = getNotificationContent(type, data);
      
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          title: notificationContent.title,
          message: notificationContent.message,
          type: notificationContent.notificationType,
          link: notificationContent.link,
        });

      if (notificationError) {
        console.error("Error creating in-app notification:", notificationError);
      } else {
        console.log("In-app notification created successfully");
      }
    }

    // Try to send email, but don't fail if it doesn't work (in-app notification is primary)
    let emailSent = false;
    let emailError = null;

    if (RESEND_API_KEY) {
      try {
        const { subject, html } = getEmailContent(type, data);

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "OverraPrep AI <onboarding@resend.dev>",
            to: [to],
            subject,
            html,
          }),
        });

        const emailResponse = await res.json();

        if (!res.ok) {
          console.warn("Resend API error (non-fatal):", emailResponse);
          emailError = emailResponse.message || "Failed to send email";
        } else {
          console.log("Email sent successfully:", emailResponse);
          emailSent = true;
        }
      } catch (err: any) {
        console.warn("Email sending failed (non-fatal):", err.message);
        emailError = err.message;
      }
    } else {
      console.warn("RESEND_API_KEY not configured, skipping email");
      emailError = "Email not configured";
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailSent,
        emailError,
        message: emailSent ? "Notification sent with email" : "In-app notification sent (email skipped)"
      }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
