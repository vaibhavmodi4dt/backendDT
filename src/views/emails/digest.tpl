<!-- IMPORT emails/partials/header.tpl -->

<!-- Email Body : BEGIN -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 600px;">
    <tr>
        <td style="padding: 0 0 24px 0;">
            <!-- Main Content Card -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #FFFFFF; border: 1px solid #E5E5E6; border-radius: 8px;">
                <!-- Greeting Header -->
                <tr>
                    <td style="padding: 40px 40px 8px 40px; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;">
                        <h1 style="margin: 0; font-size: 24px; line-height: 32px; font-weight: 700; color: #000000;">
                            [[email:greeting-with-name, {displayname}]]
                        </h1>
                    </td>
                </tr>
                
                <!-- Digest Title -->
                <tr>
                    <td style="padding: 0 40px 24px 40px; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;">
                        <p style="margin: 0; font-size: 15px; line-height: 22px; color: #666666;">
                            [[email:digest.title.{interval}]]
                        </p>
                    </td>
                </tr>

                <!-- Notifications Section -->
                {{{ if notifications.length }}}
                <tr>
                    <td style="padding: 0 40px 32px 40px;">
                        <ul style="margin: 0; padding: 0; list-style: none;">
                            {{{ each notifications }}}
                            <li style="margin-bottom: 12px;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #F5F5F6; border: 1px solid #E5E5E6; border-radius: 6px;">
                                    <tr>
                                        <td style="padding: 16px; vertical-align: top; width: 48px;">
                                            {{{ if notifications.image }}}
                                            <img src="{notifications.image}" alt="" style="width: 32px; height: 32px; border-radius: 50%; display: block;">
                                            {{{ else }}}
                                            <div style="width: 32px; height: 32px; line-height: 32px; font-size: 14px; font-weight: 600; background-color: {notifications.user.icon:bgColor}; color: white; text-align: center; border-radius: 50%; display: inline-block;">
                                                {notifications.user.icon:text}
                                            </div>
                                            {{{ end }}}
                                        </td>
                                        <td style="padding: 16px 16px 16px 8px; vertical-align: middle;">
                                            <a href="{notifications.notification_url}" style="text-decoration: none; color: #333333; font-size: 14px; line-height: 20px; display: block;">
                                                {notifications.bodyShort}
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </li>
                            {{{ end }}}
                        </ul>
                    </td>
                </tr>
                {{{ end }}}

                <!-- Unread Rooms Section -->
                {{{ if publicRooms.length }}}
                <tr>
                    <td style="padding: 0 40px 32px 40px;">
                        <h2 style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; font-weight: 600; color: #000000;">
                            [[email:digest.unread-rooms]]
                        </h2>
                        <ul style="margin: 0; padding: 0; list-style: none;">
                            {{{ each publicRooms }}}
                            <li style="margin-bottom: 8px;">
                                <a href="{url}/chats/{./roomId}" style="display: block; padding: 12px 16px; background: #F5F5F6; border: 1px solid #E5E5E6; border-radius: 6px; text-decoration: none; color: #333333; font-size: 14px; font-weight: 500; transition: all 200ms ease;">
                                    # [[email:digest.room-name-unreadcount, {./roomName}, {./unreadCountText}]]
                                </a>
                            </li>
                            {{{ end }}}
                        </ul>
                    </td>
                </tr>
                {{{ end }}}

                <!-- Top Topics Section -->
                {{{ if topTopics.length }}}
                <tr>
                    <td style="padding: 0 40px 32px 40px;">
                        <h2 style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; font-weight: 600; color: #000000;">
                            [[email:digest.top-topics, {site_title}]]
                        </h2>
                        <ul style="margin: 0; padding: 0; list-style: none;">
                            {{{ each topTopics }}}
                            <li style="margin-bottom: 20px;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #F5F5F6; border: 1px solid #E5E5E6; border-radius: 6px;">
                                    <tr>
                                        <td style="padding: 16px; vertical-align: top; width: 48px;">
                                            {function.renderDigestAvatar}
                                        </td>
                                        <td style="padding: 16px 16px 8px 8px; vertical-align: top;">
                                            <p style="margin: 0 0 4px 0;">
                                                <a href="{url}/topic/{topTopics.slug}" style="text-decoration: none; color: #000000; font-size: 15px; font-weight: 600; line-height: 22px;">
                                                    {topTopics.title}
                                                </a>
                                            </p>
                                            <p style="margin: 0;">
                                                <a href="{url}/uid/{topTopics.teaser.user.uid}" style="text-decoration: none; color: #666666; font-size: 13px; font-weight: 500;">
                                                    {topTopics.teaser.user.displayname}
                                                </a>
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colspan="2" style="padding: 0 16px 16px 16px;">
                                            <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 22px; color: #333333;">
                                                {topTopics.teaser.content}
                                            </p>
                                            <a href="{url}/topic/{topTopics.slug}" style="display: inline-block; padding: 8px 16px; background: transparent; border: 1px solid #0029FF; border-radius: 6px; color: #0029FF; font-size: 13px; font-weight: 600; text-decoration: none;">
                                                [[global:read-more]] →
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </li>
                            {{{ end }}}
                        </ul>
                    </td>
                </tr>
                {{{ end }}}

                <!-- Popular Topics Section -->
                {{{ if popularTopics.length }}}
                <tr>
                    <td style="padding: 0 40px 32px 40px;">
                        <h2 style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; font-weight: 600; color: #000000;">
                            [[email:digest.popular-topics, {site_title}]]
                        </h2>
                        <ul style="margin: 0; padding: 0; list-style: none;">
                            {{{ each popularTopics }}}
                            <li style="margin-bottom: 20px;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #F5F5F6; border: 1px solid #E5E5E6; border-radius: 6px;">
                                    <tr>
                                        <td style="padding: 16px; vertical-align: top; width: 48px;">
                                            {function.renderDigestAvatar}
                                        </td>
                                        <td style="padding: 16px 16px 8px 8px; vertical-align: top;">
                                            <p style="margin: 0 0 4px 0;">
                                                <a href="{url}/topic/{popularTopics.slug}" style="text-decoration: none; color: #000000; font-size: 15px; font-weight: 600; line-height: 22px;">
                                                    {popularTopics.title}
                                                </a>
                                            </p>
                                            <p style="margin: 0;">
                                                <a href="{url}/uid/{popularTopics.teaser.user.uid}" style="text-decoration: none; color: #666666; font-size: 13px; font-weight: 500;">
                                                    {popularTopics.teaser.user.displayname}
                                                </a>
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colspan="2" style="padding: 0 16px 16px 16px;">
                                            <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 22px; color: #333333;">
                                                {popularTopics.teaser.content}
                                            </p>
                                            <a href="{url}/topic/{popularTopics.slug}" style="display: inline-block; padding: 8px 16px; background: transparent; border: 1px solid #0029FF; border-radius: 6px; color: #0029FF; font-size: 13px; font-weight: 600; text-decoration: none;">
                                                [[global:read-more]] →
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </li>
                            {{{ end }}}
                        </ul>
                    </td>
                </tr>
                {{{ end }}}

                <!-- Recent Topics Section -->
                {{{ if recent.length }}}
                <tr>
                    <td style="padding: 0 40px 32px 40px;">
                        <h2 style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; font-weight: 600; color: #000000;">
                            [[email:digest.latest-topics, {site_title}]]
                        </h2>
                        <ul style="margin: 0; padding: 0; list-style: none;">
                            {{{ each recent }}}
                            <li style="margin-bottom: 20px;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #F5F5F6; border: 1px solid #E5E5E6; border-radius: 6px;">
                                    <tr>
                                        <td style="padding: 16px; vertical-align: top; width: 48px;">
                                            {function.renderDigestAvatar}
                                        </td>
                                        <td style="padding: 16px 16px 8px 8px; vertical-align: top;">
                                            <p style="margin: 0 0 4px 0;">
                                                <a href="{url}/topic/{recent.slug}" style="text-decoration: none; color: #000000; font-size: 15px; font-weight: 600; line-height: 22px;">
                                                    {recent.title}
                                                </a>
                                            </p>
                                            <p style="margin: 0;">
                                                <a href="{url}/uid/{recent.teaser.user.uid}" style="text-decoration: none; color: #666666; font-size: 13px; font-weight: 500;">
                                                    {recent.teaser.user.displayname}
                                                </a>
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colspan="2" style="padding: 0 16px 16px 16px;">
                                            <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 22px; color: #333333;">
                                                {recent.teaser.content}
                                            </p>
                                            <a href="{url}/topic/{recent.slug}" style="display: inline-block; padding: 8px 16px; background: transparent; border: 1px solid #0029FF; border-radius: 6px; color: #0029FF; font-size: 13px; font-weight: 600; text-decoration: none;">
                                                [[global:read-more]] →
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </li>
                            {{{ end }}}
                        </ul>
                    </td>
                </tr>
                {{{ end }}}

                <!-- CTA Button -->
                <tr>
                    <td style="padding: 0 40px 48px 40px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto;">
                            <tr>
                                <td style="background: #0029FF; border: 2px solid #0029FF; border-radius: 8px; text-align: center;">
                                    <a href="{url}" style="background: #0029FF; display: inline-block; padding: 14px 32px; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif; font-size: 15px; font-weight: 600; line-height: 20px; text-align: center; text-decoration: none; border-radius: 8px;" class="button-a">
                                        <span style="color: #FFFFFF;">[[email:digest.cta, {site_title}]] →</span>
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
