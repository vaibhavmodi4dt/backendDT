<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #F5F5F6; border: 1px solid #E5E5E6; border-radius: 6px; margin-bottom: 20px;">
    <!-- Category -->
    <tr>
        <td style="padding: 16px 20px 8px 20px; border-bottom: 1px solid #E5E5E6;">
            <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 0.5px;">
                [[post-queue:category]]
            </p>
            <p style="margin: 0;">
                <a href="{category.url}" style="color: #0029FF; text-decoration: none; font-size: 14px; font-weight: 500;">
                    {category.name}
                </a>
            </p>
        </td>
    </tr>

    <!-- Topic/Title -->
    <tr>
        <td style="padding: 16px 20px 8px 20px; border-bottom: 1px solid #E5E5E6;">
            <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 0.5px;">
                {{{ if topic.tid }}}[[post-queue:topic]]{{{ else }}}[[post-queue:title]]{{{ end }}}
            </p>
            <p style="margin: 0;">
                {{{ if topic.url }}}
                <a href="{topic.url}" style="color: #000000; text-decoration: none; font-size: 15px; font-weight: 600;">
                    {topic.title}
                </a>
                {{{ else }}}
                <span style="color: #000000; font-size: 15px; font-weight: 600;">
                    {topic.title}
                </span>
                {{{ end }}}
            </p>
        </td>
    </tr>

    <!-- User -->
    <tr>
        <td style="padding: 16px 20px 8px 20px; border-bottom: 1px solid #E5E5E6;">
            <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 0.5px;">
                [[post-queue:user]]
            </p>
            <p style="margin: 0;">
                {{{ if user.url }}}
                <a href="{user.url}" style="color: #0029FF; text-decoration: none; font-size: 14px; font-weight: 500;">
                    {user.username}
                </a>
                {{{ else }}}
                <span style="color: #333333; font-size: 14px; font-weight: 500;">
                    {user.username}
                </span>
                {{{ end }}}
            </p>
        </td>
    </tr>

    <!-- Content -->
    <tr>
        <td style="padding: 16px 20px;">
            <div style="font-size: 14px; line-height: 22px; color: #333333;">
                {content}
            </div>
        </td>
    </tr>
</table>
