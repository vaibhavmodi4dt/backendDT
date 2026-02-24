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
                            <span style="font-size: 32px; color: #0029FF;">🧪</span>
                        </div>
                        <h1 class="heading-1" style="margin: 0 0 16px 0; font-size: 24px; line-height: 32px; font-weight: 700; color: #000000;">
                            [[email:test.title]]
                        </h1>
                        <p class="body-text" style="margin: 0; font-size: 15px; line-height: 24px; color: #333333;">
                            [[email:test.text1]]
                        </p>
                    </td>
                </tr>

                <!-- Test Details -->
                <tr>
                    <td style="padding: 0 40px 32px 40px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #F5F5F6; border: 1px solid #E5E5E6; border-radius: 6px;">
                            <tr>
                                <td style="padding: 24px; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;">
                                    <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 0.5px;">Email Configuration Test</p>
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                        <tr>
                                            <td style="padding: 6px 0; font-size: 14px; color: #666666; width: 30%;">Status:</td>
                                            <td style="padding: 6px 0; font-size: 14px; color: #16A34A; font-weight: 600;">✓ Delivered</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 6px 0; font-size: 14px; color: #666666; width: 30%;">Site:</td>
                                            <td style="padding: 6px 0; font-size: 14px; color: #000000; font-weight: 500;">{site_title}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 6px 0; font-size: 14px; color: #666666; width: 30%;">Recipient:</td>
                                            <td style="padding: 6px 0; font-size: 14px; color: #000000; font-weight: 500;">{to}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Success Message -->
                <tr>
                    <td style="padding: 0 40px 48px 40px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #DCFCE7; border: 1px solid #86EFAC; border-radius: 6px;">
                            <tr>
                                <td style="padding: 16px; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif; text-align: center;">
                                    <p style="margin: 0; font-size: 14px; font-weight: 600; color: #16A34A;">
                                        ✓ Your email system is configured correctly!
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
