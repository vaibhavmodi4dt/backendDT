<!DOCTYPE html>
<html lang="{language}" data-dir="{userLang}">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>{title}</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			background: #f8f9fa;
			color: #212529;
			line-height: 1.6;
			display: flex;
			align-items: center;
			justify-content: center;
			min-height: 100vh;
			padding: 1rem;
		}
		.container {
			background: #ffffff;
			border: 1px solid #dee2e6;
			max-width: 600px;
			width: 100%;
		}
		.header {
			padding: 2rem;
			border-bottom: 1px solid #dee2e6;
		}
		.header h1 {
			font-size: 1.5rem;
			font-weight: 600;
			color: #212529;
			margin-bottom: 0.5rem;
		}
		.header p {
			color: #6c757d;
			font-size: 0.95rem;
		}
		.content {
			padding: 2rem;
		}
		.status-badge {
			display: inline-block;
			padding: 0.35rem 0.75rem;
			background: #e9ecef;
			color: #495057;
			font-size: 0.875rem;
			font-weight: 500;
			border-radius: 3px;
			margin-bottom: 1.5rem;
		}
		.endpoints {
			margin-top: 1.5rem;
		}
		.endpoints h2 {
			font-size: 1rem;
			font-weight: 600;
			color: #212529;
			margin-bottom: 1rem;
		}
		.endpoint-list {
			list-style: none;
		}
		.endpoint-item {
			padding: 0.75rem 0;
			border-bottom: 1px solid #f1f3f5;
			display: flex;
			align-items: center;
			justify-content: space-between;
		}
		.endpoint-item:last-child {
			border-bottom: none;
		}
		.endpoint-label {
			color: #495057;
			font-size: 0.9rem;
		}
		.endpoint-path {
			font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
			font-size: 0.85rem;
			color: #212529;
			background: #f8f9fa;
			padding: 0.25rem 0.5rem;
			border-radius: 3px;
			border: 1px solid #e9ecef;
		}
		.footer {
			padding: 1.5rem 2rem;
			background: #f8f9fa;
			border-top: 1px solid #dee2e6;
			font-size: 0.85rem;
			color: #6c757d;
		}
		@media (max-width: 640px) {
			.endpoint-item {
				flex-direction: column;
				align-items: flex-start;
				gap: 0.5rem;
			}
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>{heading}</h1>
			<p>{description}</p>
		</div>
		<div class="content">
			<div class="status-badge">{statusBadge}</div>
			<p style="color: #495057; margin-bottom: 0.5rem;">
				{message}
			</p>
			<div class="endpoints">
				<h2>{endpointsHeading}</h2>
				<ul class="endpoint-list">
					<!-- BEGIN endpoints -->
					<li class="endpoint-item">
						<span class="endpoint-label">{endpoints.label}</span>
						<code class="endpoint-path">{endpoints.path}</code>
					</li>
					<!-- END endpoints -->
				</ul>
			</div>
		</div>
		<div class="footer">
			{footerMessage}
		</div>
	</div>
</body>
</html>
