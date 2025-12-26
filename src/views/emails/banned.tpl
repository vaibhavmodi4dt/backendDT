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
                        <div style="width: 64px; height: 64px; margin: 0 auto 20px auto; background: #FEF2F2; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                            <span style="font-size: 32px; color: #DC2626;">⚠️</span>
                        </div>
                        <h1 class="heading-1" style="margin: 0 0 16px 0; font-size: 24px; line-height: 32px; font-weight: 700; color: #000000;">
                            [[email:banned.title]]
                        </h1>
                        <p class="body-text" style="margin: 0; font-size: 15px; line-height: 24px; color: #333333;">
                            [[email:banned.text1]]
                        </p>
                    </td>
                </tr>

                <!-- Ban Details -->
                <tr>
                    <td style="padding: 0 40px 32px 40px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #FEF2F2; border: 2px solid #DC2626; border-radius: 6px;">
                            <tr>
                                <td style="padding: 24px; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;">
                                    <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #991B1B; text-transform: uppercase; letter-spacing: 0.5px;">Suspension Details</p>
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                        {{{ if until }}}
                                        <tr>
                                            <td style="padding: 6px 0; font-size: 14px; color: #991B1B; width: 35%;">Duration:</td>
                                            <td style="padding: 6px 0; font-size: 14px; color: #7F1D1D; font-weight: 500;">Until {until}</td>
                                        </tr>
                                        {{{ end }}}
                                        {{{ if reason }}}
                                        <tr>
                                            <td style="padding: 6px 0; font-size: 14px; color: #991B1B; width: 35%; vertical-align: top;">Reason:</td>
                                            <td style="padding: 6px 0; font-size: 14px; color: #7F1D1D; font-weight: 500;">{reason}</td>
                                        </tr>
                                        {{{ end }}}
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Additional Information -->
                <tr>
                    <td style="padding: 0 40px 48px 40px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #F5F5F6; border: 1px solid #E5E5E6; border-radius: 6px;">
                            <tr>
                                <td style="padding: 20px; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;">
                                    <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 22px; color: #333333;">
                                        [[email:banned.text2]]
                                    </p>
                                    <p style="margin: 0; font-size: 13px; line-height: 20px; color: #666666;">
                                        If you believe this is an error, please contact our support team.
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
