            <!-- Email Footer : BEGIN -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 600px; background: #F5F5F6;">
                <tr>
                    <td style="padding: 32px 24px; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif; font-size: 13px; line-height: 20px; text-align: center; color: #666666;">
                        {{{ if showUnsubscribe }}}
                        <p style="margin: 0 0 12px 0;">
                            [[email:notif.post.unsub.info]] <a href="{url}/uid/{uid}/settings" style="color: #0029FF; text-decoration: none; font-weight: 500;">[[email:unsub.cta]]</a>
                        </p>
                        <p style="margin: 0;">
                            [[email:notif.post.unsub.one-click]] <a href="{unsubUrl}" style="color: #0029FF; text-decoration: none; font-weight: 500;">[[email:unsubscribe]]</a>
                        </p>
                        {{{ end }}}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 0 24px 32px 24px; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif; font-size: 12px; line-height: 18px; text-align: center; color: #999999;">
                        <p style="margin: 0;">
                            {site_title}
                        </p>
                    </td>
                </tr>
            </table>
            <!-- Email Footer : END -->

            <!--[if mso]>
            </td>
            </tr>
            </table>
            <![endif]-->
        </div>

    </center>
</body>

</html>
