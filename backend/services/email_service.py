import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import sqlite3
from datetime import datetime

class EmailService:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.from_email = os.getenv("FROM_EMAIL", "sarah@salesninja.ai")
        
        # Validate required configuration
        if not self.smtp_username or not self.smtp_password:
            print("Warning: SMTP credentials not configured. Email functionality will be disabled.")
            print("Please set SMTP_USERNAME and SMTP_PASSWORD environment variables.")
            self.is_configured = False
        else:
            self.is_configured = True

    def send_follow_up(self, lead_id: int, email_type: str = "follow_up") -> bool:
        """Send a follow-up email to a lead based on their interest level."""
        if not self.is_configured:
            print("Email service not configured. Skipping email send.")
            return False
            
        try:
            # Get lead details from database
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT l.email, l.contact, l.company, c.interest_level, c.objection
                    FROM leads l
                    LEFT JOIN calls c ON l.id = c.lead_id
                    WHERE l.id = ?
                """, (lead_id,))
                result = cursor.fetchone()
                
                if not result or not result[0]:  # No email or lead not found
                    print(f"No email found for lead {lead_id}")
                    return False
                
                email, contact, company, interest_level, objection = result
                
                # Prepare email content based on type and interest level
                subject, body = self._prepare_email_content(
                    email_type, contact, company, interest_level, objection
                )
                
                # Send email
                success = self._send_email(email, subject, body)
                
                # Log the email attempt
                cursor.execute("""
                    INSERT INTO email_logs (lead_id, email_type, status, sent_at)
                    VALUES (?, ?, ?, ?)
                """, (lead_id, email_type, "sent" if success else "failed", datetime.now().isoformat()))
                
                return success
                
        except Exception as e:
            print(f"Error sending follow-up email: {str(e)}")
            return False

    def _prepare_email_content(
        self, 
        email_type: str, 
        contact: str, 
        company: str, 
        interest_level: Optional[str],
        objection: Optional[str]
    ) -> tuple[str, str]:
        """Prepare email subject and body based on type and lead status."""
        if email_type == "follow_up":
            subject = f"Following up on our conversation about Sales Ninja"
            body = f"""
            Hi {contact},
            
            Thanks for your interest in Sales Ninja during our call. I wanted to follow up with some additional information that might be helpful.
            
            Here's what we discussed:
            - Interest Level: {interest_level or 'Not specified'}
            - Main Concern: {objection or 'None mentioned'}
            
            Would you be interested in scheduling a quick demo to see how Sales Ninja can help {company}?
            
            Best regards,
            Sarah
            Sales Ninja
            """
        elif email_type == "demo_invite":
            subject = f"Your Sales Ninja Demo Invitation"
            body = f"""
            Hi {contact},
            
            As discussed, I'm excited to show you how Sales Ninja can help {company} improve your sales outreach.
            
            You can schedule a demo at your convenience here: [DEMO_LINK]
            
            Best regards,
            Sarah
            Sales Ninja
            """
        else:  # pitch_deck
            subject = f"Sales Ninja - How We Can Help {company}"
            body = f"""
            Hi {contact},
            
            As promised, here's our pitch deck showing how Sales Ninja has helped companies like {company} improve their sales process.
            
            [PITCH_DECK_LINK]
            
            Let me know if you have any questions!
            
            Best regards,
            Sarah
            Sales Ninja
            """
            
        return subject, body

    def _send_email(self, to_email: str, subject: str, body: str) -> bool:
        """Send an email using SMTP."""
        if not self.is_configured:
            return False
            
        try:
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = to_email
            msg['Subject'] = subject
            
            msg.attach(MIMEText(body, 'plain'))
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
                
            print(f"Successfully sent email to {to_email}")
            return True
            
        except Exception as e:
            print(f"Error sending email to {to_email}: {str(e)}")
            return False 