export type PriceChange = {
  name: string;
  store_name: string;
  product_url: string;
  old_price: number;
  new_price: number;
  currency: string;
};

export function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

export function buildPriceEmail(changes: PriceChange[]): { subject: string; html: string } {
  const drops = changes.filter((c) => c.new_price < c.old_price).length;
  const subject = drops === changes.length
    ? `${drops} price drop${drops > 1 ? 's' : ''} in your CompareCart collection`
    : `${changes.length} price change${changes.length > 1 ? 's' : ''} in your CompareCart collection`;

  const rows = changes.map((c) => {
    const drop = c.new_price < c.old_price;
    const arrow = drop ? '↓' : '↑';
    const color = drop ? '#16a34a' : '#dc2626';
    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0ebe4;">
          <a href="${c.product_url}" style="font-size:14px;color:#1a1a1a;text-decoration:none;display:block;margin-bottom:4px;" target="_blank">${c.name}</a>
          <a href="${c.product_url}" style="font-size:11px;color:#C4603C;text-decoration:none;" target="_blank">View on ${c.store_name} &rarr;</a>
        </td>
        <td style="padding:12px 0 12px 16px;border-bottom:1px solid #f0ebe4;text-align:right;white-space:nowrap;vertical-align:top;">
          <div style="color:${color};font-weight:600;">${arrow} ${formatPrice(c.new_price, c.currency)}</div>
          <div style="color:#aaa;font-size:12px;text-decoration:line-through;">${formatPrice(c.old_price, c.currency)}</div>
        </td>
      </tr>`;
  }).join('');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://comparecart.app';

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f7f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:32px auto;background:#fff;border:1px solid #e8e0d8;">
    <div style="padding:24px 32px;border-bottom:1px solid #f0ebe4;">
      <div style="font-size:18px;font-weight:700;color:#1a1a1a;letter-spacing:-0.3px;">CompareCart</div>
      <div style="font-size:14px;color:#666;margin-top:4px;">${subject}</div>
    </div>
    <div style="padding:8px 32px 24px;">
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #f0ebe4;text-align:center;">
      <a href="${appUrl}/dashboard"
         style="display:inline-block;background:#C4603C;color:#fff;text-decoration:none;padding:10px 24px;font-size:13px;font-weight:600;letter-spacing:0.05em;">
        VIEW COLLECTION
      </a>
      <div style="margin-top:12px;font-size:11px;color:#aaa;">
        <a href="${appUrl}/dashboard" style="color:#aaa;">Manage price alert settings</a>
      </div>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}
