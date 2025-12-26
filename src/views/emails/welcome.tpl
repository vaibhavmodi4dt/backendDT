<!-- IMPORT emails/partials/header.tpl -->

<!-- Email Body : BEGIN -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 600px;">
    <tr>
        <td style="padding: 0 0 24px 0;">
            <!-- Main Content Card -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #FFFFFF; border: 1px solid #E5E5E6; border-radius: 8px;">
                <!-- Welcome Content -->
                <tr>
                    <td style="padding: 48px 40px 32px 40px; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;">
                        <h1 class="heading-1" style="margin: 0 0 16px 0; font-size: 24px; line-height: 32px; font-weight: 700; color: #000000;">
                            [[email:welcome.text1, {site_title}]]
                        </h1>
                        <p class="body-text" style="margin: 0; font-size: 15px; line-height: 24px; color: #333333;">
                            [[email:welcome.text2]]
                        </p>
                    </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                    <td style="padding: 0 40px 48px 40px; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto;">
                            <tr>
                                <td style="background: #0029FF; border: 2px solid #0029FF; border-radius: 8px; text-align: center;" class="button-primary">
                                    <a href="{confirm_link}" style="background: #0029FF; display: inline-block; padding: 14px 32px; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif; font-size: 15px; font-weight: 600; line-height: 20px; text-align: center; text-decoration: none; border-radius: 8px;" class="button-a">
                                        <span style="color: #FFFFFF;" class="button-link">[[email:welcome.cta]] →</span>
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
