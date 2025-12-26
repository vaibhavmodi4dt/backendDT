<!-- IMPORT emails/partials/header.tpl -->

<!-- Email Body : BEGIN -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 600px;">
    <tr>
        <td style="padding: 0 0 24px 0;">
            <!-- Main Content Card -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #FFFFFF; border: 1px solid #E5E5E6; border-radius: 8px;">
                <!-- Icon and Title -->
                <tr>
                    <td style="padding: 48px 40px 24px 40px; text-align: center; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;">
                        <div style="width: 64px; height: 64px; margin: 0 auto 20px auto; background: #DCFCE7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                            <span style="font-size: 32px; color: #16A34A;">✓</span>
                        </div>
                        <h1 class="heading-1" style="margin: 0 0 16px 0; font-size: 24px; line-height: 32px; font-weight: 700; color: #000000;">
                            [[email:password-changed]]
                        </h1>
                        <p class="body-text" style="margin: 0; font-size: 15px; line-height: 24px; color: #333333;">
                            [[email:reset-notify.text1]]
                        </p>
                    </td>
                </tr>

                <!-- Info Card -->
                <tr>
                    <td style="padding: 0 40px 32px 40px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #F5F5F6; border: 1px solid #E5E5E6; border-radius: 6px;">
                            <tr>
                                <td style="padding: 20px; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;">
                                    <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 0.5px;">Change Details</p>
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                        <tr>
                                            <td style="padding: 6px 0; font-size: 14px; color: #666666; width: 30%;">Time:</td>
                                            <td style="padding: 6px 0; font-size: 14px; color: #000000; font-weight: 500;">{time}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 6px 0; font-size: 14px; color: #666666; width: 30%;">Account:</td>
                                            <td style="padding: 6px 0; font-size: 14px; color: #000000; font-weight: 500;">{username}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Security Notice -->
                <tr>
                    <td style="padding: 0 40px 48px 40px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px;">
                            <tr>
                                <td style="padding: 16px; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;">
                                    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #DC2626;">🔒 Didn't make this change?</p>
                                    <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 20px; color: #991B1B;">
                                        [[email:reset-notify.text2]]
                                    </p>
                                    <a href="{url}/reset" style="display: inline-block; padding: 10px 20px; background: #DC2626; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600;">Secure My Account</a>
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
