import type { ChatMessage } from "@/types/api";

export function exportToMarkdown(
  messages: ChatMessage[],
  title?: string,
): string {
  const lines: string[] = [];

  if (title) {
    lines.push(`# ${title}`);
    lines.push("");
  }

  lines.push(`*Exported on ${new Date().toLocaleString()}*`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const message of messages) {
    const role = message.role === "user" ? "**You**" : "**Assistant**";
    lines.push(role);
    lines.push("");
    lines.push(message.content);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadMarkdown(
  messages: ChatMessage[],
  filename: string = "chat-export.md",
  title?: string,
): void {
  const markdown = exportToMarkdown(messages, title);
  downloadFile(markdown, filename, "text/markdown");
}

export function exportToPdf(messages: ChatMessage[], title?: string): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups for PDF export");
    return;
  }

  const html = generatePrintableHtml(messages, title);
  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to load then print
  printWindow.onload = () => {
    printWindow.print();
    // Close after print dialog (user can cancel)
    printWindow.onafterprint = () => printWindow.close();
  };
}

function generatePrintableHtml(
  messages: ChatMessage[],
  title?: string,
): string {
  const messagesHtml = messages
    .map((message) => {
      const role = message.role === "user" ? "You" : "Assistant";
      const roleClass = message.role === "user" ? "user" : "assistant";
      // Basic markdown to HTML conversion for common elements
      const content = convertMarkdownToHtml(message.content);
      return `
        <div class="message ${roleClass}">
          <div class="role">${role}</div>
          <div class="content">${content}</div>
        </div>
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title || "Chat Export"}</title>
      <style>
        * {
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
          line-height: 1.6;
          color: #1a1a1a;
        }
        h1 {
          font-size: 24px;
          margin-bottom: 8px;
        }
        .date {
          color: #666;
          font-size: 14px;
          margin-bottom: 32px;
        }
        .message {
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid #e5e5e5;
        }
        .message:last-child {
          border-bottom: none;
        }
        .role {
          font-weight: 600;
          margin-bottom: 8px;
          color: #333;
        }
        .message.user .role {
          color: #2563eb;
        }
        .message.assistant .role {
          color: #059669;
        }
        .content {
          white-space: pre-wrap;
        }
        .content p {
          margin: 0 0 12px 0;
        }
        .content p:last-child {
          margin-bottom: 0;
        }
        .content code {
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: ui-monospace, monospace;
          font-size: 14px;
        }
        .content pre {
          background: #1e293b;
          color: #e2e8f0;
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          font-family: ui-monospace, monospace;
          font-size: 13px;
        }
        .content pre code {
          background: none;
          padding: 0;
          color: inherit;
        }
        .content ul, .content ol {
          margin: 12px 0;
          padding-left: 24px;
        }
        .content li {
          margin-bottom: 4px;
        }
        @media print {
          body {
            padding: 0;
          }
          .message {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      ${title ? `<h1>${escapeHtml(title)}</h1>` : ""}
      <div class="date">Exported on ${new Date().toLocaleString()}</div>
      ${messagesHtml}
    </body>
    </html>
  `;
}

function convertMarkdownToHtml(markdown: string): string {
  let html = escapeHtml(markdown);

  // Code blocks (```...```)
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre><code class="language-$1">$2</code></pre>',
  );

  // Inline code (`...`)
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold (**...** or __...__)
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // Italic (*...* or _..._)
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/_([^_]+)_/g, "<em>$1</em>");

  // Line breaks
  html = html.replace(/\n\n/g, "</p><p>");
  html = `<p>${html}</p>`;

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, "");

  return html;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export async function copyToClipboard(
  messages: ChatMessage[],
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(exportToMarkdown(messages));
    return true;
  } catch {
    return false;
  }
}
