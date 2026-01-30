"""Email notification service"""

import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending email notifications"""

    @staticmethod
    def _is_configured() -> bool:
        """Check if SMTP is configured"""
        return bool(settings.smtp_host and settings.smtp_username and settings.smtp_password)

    @staticmethod
    def send_email(
        to_email: str,
        subject: str,
        html_body: str,
        plain_body: Optional[str] = None,
    ) -> bool:
        """
        Send an email notification.

        Returns True if sent successfully, False otherwise.
        Logs the email in development mode if SMTP is not configured.
        """
        if not EmailService._is_configured():
            logger.info(
                f"[EMAIL NOT SENT - SMTP not configured] "
                f"To: {to_email} | Subject: {subject}"
            )
            if settings.debug:
                logger.info(f"[EMAIL BODY]: {plain_body or html_body[:500]}")
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
            msg["To"] = to_email

            if plain_body:
                msg.attach(MIMEText(plain_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                if settings.smtp_use_tls:
                    server.starttls()
                server.login(settings.smtp_username, settings.smtp_password)
                server.send_message(msg)

            logger.info(f"Email sent successfully to {to_email}: {subject}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    @staticmethod
    def send_approval_notification(
        to_email: str,
        company_name: str,
        org_admin_name: str,
    ) -> bool:
        """Send enterprise application approval notification"""
        subject = f"Your Enterprise Registration is Approved - {company_name}"
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #84cc16; padding: 20px; text-align: center;">
                <h1 style="color: #000; margin: 0; font-size: 24px;">ECO/TRIBE</h1>
            </div>
            <div style="padding: 30px; background-color: #ffffff;">
                <h2 style="color: #1a1a1a;">Registration Approved!</h2>
                <p style="color: #333;">Dear {org_admin_name},</p>
                <p style="color: #333;">
                    We are pleased to inform you that your enterprise registration for
                    <strong>{company_name}</strong> has been approved.
                </p>
                <p style="color: #333;">
                    You can now log in to the EcoTribe platform using the email and password
                    you provided during registration.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="#" style="background-color: #84cc16; color: #000; padding: 12px 30px;
                       text-decoration: none; font-weight: bold; text-transform: uppercase;
                       font-size: 14px; letter-spacing: 1px;">
                        Log In Now
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                    As an Org Admin, you can now:
                </p>
                <ul style="color: #666; font-size: 14px;">
                    <li>Set up branches for your organization</li>
                    <li>Invite IT Admins to manage assets</li>
                    <li>Track device submissions and batches</li>
                    <li>View financial reports and payouts</li>
                </ul>
            </div>
            <div style="padding: 20px; background-color: #f5f5f5; text-align: center;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                    &copy; EcoTribe. All rights reserved.
                </p>
            </div>
        </div>
        """
        plain_body = (
            f"Dear {org_admin_name},\n\n"
            f"Your enterprise registration for {company_name} has been approved.\n\n"
            f"You can now log in to the EcoTribe platform using the email and password "
            f"you provided during registration.\n\n"
            f"As an Org Admin, you can set up branches, invite IT Admins, "
            f"track device submissions, and view financial reports.\n\n"
            f"- EcoTribe Team"
        )
        return EmailService.send_email(to_email, subject, html_body, plain_body)

    @staticmethod
    def send_rejection_notification(
        to_email: str,
        company_name: str,
        org_admin_name: str,
        reason: str,
    ) -> bool:
        """Send enterprise application rejection notification"""
        subject = f"Enterprise Registration Update - {company_name}"
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #84cc16; padding: 20px; text-align: center;">
                <h1 style="color: #000; margin: 0; font-size: 24px;">ECO/TRIBE</h1>
            </div>
            <div style="padding: 30px; background-color: #ffffff;">
                <h2 style="color: #1a1a1a;">Registration Update</h2>
                <p style="color: #333;">Dear {org_admin_name},</p>
                <p style="color: #333;">
                    We regret to inform you that your enterprise registration for
                    <strong>{company_name}</strong> could not be approved at this time.
                </p>
                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444;
                            padding: 15px; margin: 20px 0;">
                    <p style="color: #991b1b; margin: 0;">
                        <strong>Reason:</strong> {reason}
                    </p>
                </div>
                <p style="color: #333;">
                    If you believe this is an error or would like to reapply with updated
                    information, please contact our support team.
                </p>
            </div>
            <div style="padding: 20px; background-color: #f5f5f5; text-align: center;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                    &copy; EcoTribe. All rights reserved.
                </p>
            </div>
        </div>
        """
        plain_body = (
            f"Dear {org_admin_name},\n\n"
            f"Your enterprise registration for {company_name} could not be approved.\n\n"
            f"Reason: {reason}\n\n"
            f"If you believe this is an error, please contact support.\n\n"
            f"- EcoTribe Team"
        )
        return EmailService.send_email(to_email, subject, html_body, plain_body)
