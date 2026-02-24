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
                        <div style="width: 64px; height: 64px; margin: 0 auto 20px auto; background: #F0F2FF; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                            <span style="font-size: 32px; color: #0029FF;">✉️</span>
                        </div>
                        <h1 class="heading-1" style="margin: 0 0 16px 0; font-size: 24px; line-height: 32px; font-weight: 700; color: #000000;">
                            [[email:verify-email.title]]
                        </h1>
                        <p class="body-text" style="margin: 0; font-size: 15px; line-height: 24px; color: #333333;">
                            [[email:verify-email.text1]]
                        </p>
                    </td>
                </tr>

                <!-- Verification Code (if applicable) -->
                {{{ if verify_code }}}
                <tr>
                    <td style="padding: 0 40px 24px 40px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #F5F5F6; border: 2px solid #0029FF; border-radius: 8px;">
                            <tr>
                                <td style="padding: 20px; text-align: center;">
                                    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 0.5px;">Verification Code</p>
                                    <p style="margin: 0; font-size: 28px; font-weight: 700; color: #0029FF; font-family: 'Courier New', monospace; letter-spacing: 4px;">{verify_code}</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                {{{ end }}}

                <!-- CTA Button -->
                <tr>
                    <td style="padding: 0 40px 32px 40px; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto;">
                            <tr>
                                <td style="background: #0029FF; border: 2px solid #0029FF; border-radius: 8px; text-align: center;" class="button-primary">
                                    <a href="{verify_link}" style="background: #0029FF; display: inline-block; padding: 14px 32px; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif; font-size: 15px; font-weight: 600; line-height: 20px; text-align: center; text-decoration: none; border-radius: 8px;" class="button-a">
                                        <span style="color: #FFFFFF;" class="button-link">[[email:verify-email.cta]] →</span>
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Help Text -->
                <tr>
                    <td style="padding: 0 40px 48px 40px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #F5F5F6; border: 1px solid #E5E5E6; border-radius: 6px;">
                            <tr>
                                <td style="padding: 16px; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif; text-align: center;">
                                    <p style="margin: 0; font-size: 13px; line-height: 20px; color: #666666;">
                                        [[email:verify-email.text2]]
                                    </p>
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
