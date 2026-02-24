<!-- IMPORT emails/partials/header.tpl -->

<!-- Email Body : BEGIN -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 600px;">
    <tr>
        <td style="padding: 0 0 24px 0;">
            <!-- Main Content Card -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #FFFFFF; border: 1px solid #E5E5E6; border-radius: 8px;">
                <!-- Greeting -->
                <tr>
                    <td style="padding: 40px 40px 8px 40px; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;">
                        <h2 class="heading-2" style="margin: 0; font-size: 20px; line-height: 28px; font-weight: 600; color: #000000;">
                            [[email:greeting-with-name, {username}]]
                        </h2>
                    </td>
                </tr>

                <!-- Intro Text -->
                <tr>
                    <td style="padding: 0 40px 24px 40px; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;">
                        <p class="text-muted" style="margin: 0; font-size: 15px; line-height: 22px; color: #666666;">
                            {intro}
                        </p>
                    </td>
                </tr>

                <!-- Notification Content -->
                <tr>
                    <td style="padding: 0 40px; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;">
                        <!-- Notification Card -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #F5F5F6; border: 1px solid #E5E5E6; border-radius: 6px;">
                            <tr class="notification-body">
                                <td style="padding: 20px; font-size: 14px; line-height: 22px; color: #333333;">
                                    {body}
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                    <td style="padding: 32px 40px 48px 40px; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto;">
                            <tr>
                                <td style="background: #0029FF; border: 2px solid #0029FF; border-radius: 8px; text-align: center;" class="button-primary">
                                    <a href="{notification_url}" style="background: #0029FF; display: inline-block; padding: 14px 32px; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif; font-size: 15px; font-weight: 600; line-height: 20px; text-align: center; text-decoration: none; border-radius: 8px;" class="button-a">
                                        <span style="color: #FFFFFF;" class="button-link">[[email:notif.cta{{{ if notification.cta-type }}}-{notification.cta-type}{{{ end }}}]] →</span>
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
<!-- Email Body : END -->

<!-- IMPORT emails/partials/footer.tpl -->
